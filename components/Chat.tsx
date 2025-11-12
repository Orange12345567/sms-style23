
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { FONT_OPTIONS } from "@/lib/fonts";
import SidebarUsers from "./SidebarUsers";
import MessageBubble from "./MessageBubble";

type Message = {
  id: string;
  userId: string;
  name: string;
  text: string;
  color?: string;
  meBubble?: string;
  fontFamily?: string;
  ts: number;
};

type UserPresence = {
  userId: string;
  name: string;
  fontFamily?: string;
  color?: string;
  status?: string;
  typing?: boolean;
};

const LS_UID = "sms_groupchat_uid_v3";
const LS_PROFILE = "sms_groupchat_profile_v3";
const LS_THEME = "sms_groupchat_theme";
const LS_ROSTER = "sms_groupchat_roster_v1";

function uid() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export default function Chat({ roomCode = "GLOBAL" }: { roomCode?: string }) {
  // theme locked to dark/black but we keep the state so UI stays consistent
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem(LS_THEME) || "dark";
  });
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("dark");
      localStorage.setItem(LS_THEME, theme);
    }
  }, [theme]);

  // id + profile
  const [userId] = useState<string>(() => {
    if (typeof window === "undefined") return uid();
    const ex = localStorage.getItem(LS_UID);
    if (ex) return ex;
    const v = uid();
    localStorage.setItem(LS_UID, v);
    return v;
  });
  const [profile, setProfile] = useState<{ name: string; fontFamily: string; color: string; bubble: string; status?: string }>(() => {
    if (typeof window === "undefined") return { name: "Anon", fontFamily: "Inter, sans-serif", color: "#1e40af", bubble: "#22c55e" };
    try {
      const raw = localStorage.getItem(LS_PROFILE);
      return raw ? JSON.parse(raw) : { name: "Anon", fontFamily: "Inter, sans-serif", color: "#1e40af", bubble: "#22c55e" };
    } catch {
      return { name: "Anon", fontFamily: "Inter, sans-serif", color: "#1e40af", bubble: "#22c55e" };
    }
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
  }, [profile]);

  // DM / channel
  const [dmTarget, setDmTarget] = useState<UserPresence | null>(null);
  const ROOM = `room:${roomCode}`;
  const channelName = dmTarget ? ("dm:" + [userId, (dmTarget?.userId || "")].sort().join("-")) : ROOM;
  const [channel, setChannel] = useState<ReturnType<NonNullable<ReturnType<typeof getSupabase>>["channel"]> | null>(null);

  // messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgIds, setMsgIds] = useState<Set<string>>(new Set());

  // presence/roster (persist offline)
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [roster, setRoster] = useState<Record<string, any>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(`${LS_ROSTER}_${ROOM}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const people: UserPresence[] = useMemo(() => {
    const arr = users.map(u => ({ ...u }));
    if (!arr.some(u => u.userId === userId)) {
      arr.push({ userId, name: profile.name, fontFamily: profile.fontFamily, color: profile.color, status: profile.status, typing: false });
    }
    for (const id of Object.keys(roster)) {
      if (!arr.some(u => u.userId === id)) {
        const r = roster[id];
        arr.push({ userId: id, name: r.name || "User", fontFamily: r.fontFamily || "Inter, sans-serif", color: r.color || "#93c5fd", status: r.status || "", typing: false });
      }
    }
    arr.sort((a,b) => a.name.localeCompare(b.name));
    return arr;
  }, [users, roster, userId, profile.name, profile.fontFamily, profile.color, profile.status]);

  const saveRoster = useCallback((r: Record<string, any>) => {
    try { localStorage.setItem(`${LS_ROSTER}_${ROOM}`, JSON.stringify(r)); } catch {}
  }, [ROOM]);

  // open channel
  useEffect(() => {
    const sb = getSupabase?.();
    if (!sb) return;
    const ch = sb.channel(channelName, { config: { presence: { key: userId } } });

    ch.on("broadcast", { event: "message" }, ({ payload }) => {
      const m = payload as Message;
      if (msgIds.has(m.id)) return;
      setMsgIds(prev => new Set(prev).add(m.id));
      setMessages(prev => [...prev, m]);
    })
    .on("broadcast", { event: "delete" }, ({ payload }) => {
      const { id } = payload as { id: string };
      setMessages(prev => prev.filter(m => m.id !== id));
    })
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      const { userId: who, typing } = payload as any;
      setUsers(prev => prev.map(u => u.userId === who ? { ...u, typing } : u));
    })
    .on("presence", { event: "sync" }, () => {
      const st = ch.presenceState() as Record<string, any[]>;
      const flat: UserPresence[] = [];
      Object.values(st).forEach((arr:any[]) => arr.forEach((p:any) => flat.push({
        userId: p.userId, name: p.name, fontFamily: p.fontFamily, color: p.color, status: p.status, typing: false
      })));
      setUsers(flat);
      // roster
      const onlineIds = new Set(flat.map(u => u.userId));
      const next = { ...roster };
      flat.forEach(u => { next[u.userId] = { ...(next[u.userId]||{}), name: u.name, fontFamily: u.fontFamily, color: u.color, status: u.status, online: true }; });
      Object.keys(next).forEach(id => { if (!onlineIds.has(id)) { next[id].online = false; next[id].lastSeen = Date.now(); }});
      setRoster(next); saveRoster(next);
    })
    .on("presence", { event: "join" }, () => {})
    .on("presence", { event: "leave" }, () => {})
    .subscribe((st) => {
      if (st === "SUBSCRIBED") {
        ch.track({ userId, name: profile.name, fontFamily: profile.fontFamily, color: profile.color, status: profile.status });
      }
    });

    setChannel(ch);
    return () => { try { ch.unsubscribe(); } catch {} setChannel(null); };
  }, [channelName, userId, profile.name, profile.fontFamily, profile.color, profile.status, saveRoster, roster, msgIds]);

  // send/delete
  const [input, setInput] = useState("");
  function sendMessage() {
    if (!channel || !input.trim()) return;
    const m: Message = {
      id: uid(),
      userId,
      name: profile.name || "Anon",
      text: input,
      color: profile.color,
      meBubble: profile.bubble,
      fontFamily: profile.fontFamily,
      ts: Date.now()
    };
    setMessages(prev => [...prev, m]);
    setMsgIds(prev => new Set(prev).add(m.id));
    channel.send({ type: "broadcast", event: "message", payload: m });
    setInput("");
  }
  function deleteMessage(id: string) {
    if (!channel) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    channel.send({ type: "broadcast", event: "delete", payload: { id } });
  }

  // typing
  const typingRef = useRef<number>(0);
  useEffect(() => {
    if (!channel) return;
    const now = Date.now();
    if (now - typingRef.current > 400) {
      typingRef.current = now;
      channel.send({ type: "broadcast", event: "typing", payload: { userId, typing: true } });
      setTimeout(() => channel.send({ type: "broadcast", event: "typing", payload: { userId, typing: false } }), 800);
    }
  }, [input, channel, userId]);

  // room meta
  const [roomName] = useState<string>(roomCode === "GLOBAL" ? "Global" : "Private Room");

  // render
  return (
    <div className="flex h-screen w-full bg-black text-white">
      {/* Sidebar (desktop) */}
      <div className="hidden md:block">
        <SidebarUsers users={people} meId={userId} onStartDM={(u)=>setDmTarget(u)} />
      </div>

      {/* Main column */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-black border-neutral-800 px-3 py-2">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">{roomName}</h1>
            <span className="ml-2 rounded bg-neutral-900 px-2 py-0.5 text-[11px]">Code: {roomCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-white" onClick={()=>location.href="/"}>Go to Main Menu</button>
            <button className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-white" onClick={()=>location.href="/room/GLOBAL"}>Go to Global</button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4" style={{ background: "#000" }}>
          <div className="mx-auto max-w-3xl space-y-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} m={m} isSelf={m.userId===userId} onDelete={()=>deleteMessage(m.id)} />
            ))}
          </div>
        </div>

        {/* Composer + controls */}
        <div className="border-t border-neutral-800 bg-black">
          <div className="mx-auto max-w-5xl p-2 space-y-2">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none"
                placeholder="Type a message..."
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendMessage(); } }}
              />
              <button className="rounded bg-white text-black px-3 py-2 text-sm" onClick={sendMessage}>Send</button>
            </div>

            {/* Profile controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <div className="flex items-center gap-2">
                <span className="w-20">Name</span>
                <input className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
                  value={profile.name} onChange={e=>setProfile({...profile, name:e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20">Text</span>
                <input type="color" className="h-8 w-10 rounded border border-neutral-700 bg-neutral-900"
                  value={profile.color} onChange={e=>setProfile({...profile, color:e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20">Bubble</span>
                <input type="color" className="h-8 w-10 rounded border border-neutral-700 bg-neutral-900"
                  value={profile.bubble} onChange={e=>setProfile({...profile, bubble:e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20">Font</span>
                <select value={profile.fontFamily} onChange={e=>setProfile({...profile, fontFamily: e.target.value})}
                  className="flex-1 rounded border px-2 py-1 border-neutral-700 bg-neutral-900 text-white"
                  style={{ fontFamily: profile.fontFamily }}>
                  {FONT_OPTIONS.map(f => (<option key={f} value={f} style={{ fontFamily: f }}>{f.split(",")[0]}</option>))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
