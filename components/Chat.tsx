"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Message, Profile, Room } from "@/types";
import TypingDots from "./TypingDots";
import clsx from "clsx";

type PresencePayload = {
  typing: boolean;
  user_id: string;
  display_name: string;
  font_family: string;
  text_color: string;
  bubble_color: string;
  current_status: string | null;
};

export default function Chat({ initialRoomCode }: { initialRoomCode: string | null }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typingMap, setTypingMap] = useState<Record<string, PresencePayload>>({});
  const [members, setMembers] = useState<Record<string, PresencePayload>>({});

  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<any>(null);

  // Sign in anonymously
  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        await supabase.auth.signInAnonymously();
      }
      const { data: user } = await supabase.auth.getUser();
      if (user.user) setUserId(user.user.id);
    })();
  }, []);

  // Ensure profile exists
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      if (!data) {
        const baseName = "Guest " + String(Math.floor(Math.random() * 900) + 100);
        const insert = {
          id: userId,
          display_name: baseName,
          font_family: "system-ui",
          text_color: "#111827",
          bubble_color: "#e5e7eb",
          show_status_bar: true,
          statuses: ["Online", "Away", "Busy"],
          current_status: "Online"
        };
        const { data: created, error: e2 } = await supabase.from("profiles").insert(insert).select().single();
        if (e2) throw e2;
        setProfile(created);
      } else {
        setProfile(data);
      }
    })();
  }, [userId]);

  // Room resolver: global or by code
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const code = initialRoomCode || "GLOBAL";
      if (code === "GLOBAL") {
        // ensure global room exists
        const { data, error } = await supabase.from("rooms").select("*").eq("code", "GLOBAL").maybeSingle();
        if (error) throw error;
        if (!data) {
          const { data: created, error: e2 } = await supabase.from("rooms").insert({ code: "GLOBAL", name: "Global Room" }).select().single();
          if (e2) throw e2;
          setRoom(created);
        } else setRoom(data);
      } else {
        const { data, error } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
        if (error) { alert(error.message); return; }
        if (!data) { alert("Room code not found."); return; }
        setRoom(data);
      }
    })();
  }, [profile, initialRoomCode]);

  // Load messages for room
  useEffect(() => {
    if (!room) return;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", room.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages(data ?? []);
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    })();
  }, [room]);

  // Subscribe realtime messages
  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`room:${room.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${room.id}` }, (payload) => {
        setMessages((m) => [...m, payload.new as Message]);
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room]);

  // Presence: typing + members list
  useEffect(() => {
    if (!room || !profile || !userId) return;
    const channel = supabase.channel(`presence:${room.id}`, { config: { presence: { key: userId } } });
    presenceChannelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, any[]>;
      const merged: Record<string, PresencePayload> = {};
      Object.values(state).forEach((arr) => {
        arr.forEach((p: any) => { merged[p.user_id] = (p as unknown as PresencePayload); });
      });
      setMembers(merged);
    });

    channel.on("presence", { event: "join" }, ({ newPresences }) => {
      setMembers((curr) => ({
        ...curr,
        ...(Object.fromEntries(newPresences.map((p: any) => [p.user_id, (p as unknown as PresencePayload)])))
      }));
    });

    channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
      setMembers((curr) => {
        const copy: Record<string, PresencePayload> = { ...curr } as any;
        (leftPresences as any[]).forEach((p: any) => { delete copy[p.user_id]; });
        return copy;
      });
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          typing: false,
          user_id: userId,
          display_name: profile.display_name,
          font_family: profile.font_family,
          text_color: profile.text_color,
          bubble_color: profile.bubble_color,
          current_status: profile.current_status
        } as PresencePayload);
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [room, profile, userId]);

  // Update presence when profile visuals change
  useEffect(() => {
    // This is handled ad-hoc via NameAndStatus parent calling onUpdate
  }, [profile]);

  function updatePresence(partial: Partial<PresencePayload>) {
    const channel: any = presenceChannelRef.current;
    if (!channel) return;
    const me = (members[userId ?? ""] || {}) as PresencePayload;
    channel.track({ ...(me as any), ...(partial as any) });
  }

  async function upsertProfilePartial(patch: Partial<Profile>) {
    if (!userId) return;
    const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select().single();
    if (!error && data) {
      setProfile(data);
      // reflect to presence
      updatePresence({
        display_name: data.display_name,
        font_family: data.font_family,
        text_color: data.text_color,
        bubble_color: data.bubble_color,
        current_status: data.current_status,
        typing: false,
        user_id: data.id
      });
    }
  }

  function onInputChange(v: string) {
    setInput(v);
    // typing presence
    updatePresence({ typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => updatePresence({ typing: false }), 1200);
  }

  async function send() {
    if (!room || !profile || !userId) return;
    const text = input.trim();
    if (!text) return;
    setInput("");
    const payload = {
      room_id: room.id,
      user_id: userId,
      content: text,
      font_family: profile.font_family,
      text_color: profile.text_color,
      bubble_color: profile.bubble_color
    };
    const { error } = await supabase.from("messages").insert(payload);
    if (error) alert(error.message);
    updatePresence({ typing: false });
  }

  const orderedMembers = useMemo(()=> Object.values(members).sort((a,b)=> (a.display_name || "").localeCompare(b.display_name || "")), [members]);

  return (
    <div className="h-screen grid grid-cols-12">
      {/* Left: members list, names downward */}
      <aside className="col-span-3 border-r bg-white flex flex-col">
        <div className="p-3 font-semibold">People in {room?.code || "..."}</div>
        <div className="px-3 pb-2 text-xs text-gray-500">Click your name at top bar to customize</div>
        <div className="flex-1 overflow-y-auto scrollbar-thin divide-y">
          {orderedMembers.map((m) => (
            <div key={m.user_id} className="p-3 flex items-center gap-3">
              <div className="size-3 rounded-full" style={{ background: m.bubble_color }} />
              <div className="min-w-0">
                <div className="truncate" style={{ fontFamily: m.font_family, color: m.text_color }}>{m.display_name}</div>
                {m.current_status && <div className="text-xs text-gray-500">{m.current_status}</div>}
                {m.typing && <TypingDots />}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Right: chat area */}
      <main className="col-span-9 flex flex-col h-full">
        {/* Name + Status editor */}
        {profile && (
          <div className="border-b">
            {require("../components/NameAndStatus").default({ profile, onUpdate: upsertProfilePartial })}
          </div>
        )}

        {/* Room controls */}
        <div className="border-b">
          {require("../components/RoomControls").default({ currentRoomId: room?.id ?? null, onJoinByCode: (code:string)=>{
            if(!code) return;
            const url = new URL(location.href);
            url.searchParams.set("code", code.toUpperCase());
            url.searchParams.delete("room");
            location.href = url.toString();
          }})}
        </div>

        {/* Messages list */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {messages.map((msg) => {
            const mine = msg.user_id === userId;
            return (
              <div key={msg.id} className={clsx("bubble", mine ? "bubble-right" : "bubble-left")} style={{ background: mine ? msg.bubble_color : "#ffffff", color: msg.text_color, fontFamily: msg.font_family }}>
                <div className="text-xs opacity-60 mb-0.5">{orderedMembers.find(m=>m.user_id===msg.user_id)?.display_name || "Someone"}</div>
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div className="p-3 bg-white border-t flex items-center gap-2">
          <input
            value={input}
            onChange={(e)=>onInputChange(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==="Enter") send(); }}
            placeholder="Type a message…"
            className="flex-1 px-3 py-3 rounded-full border"
            style={{ fontFamily: profile?.font_family, color: profile?.text_color }}
          />
          <button onClick={send} className="px-4 py-3 rounded-full bg-black text-white">Send</button>
        </div>
      </main>
    </div>
  );
}
