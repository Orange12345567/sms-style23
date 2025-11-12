
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import SidebarUsers, { UserPresence } from "./SidebarUsers";
import MessageBubble, { Message } from "./MessageBubble";
import ErrorPanel from "./ErrorPanel";
import { clsx } from "clsx";
import { FONT_OPTIONS } from "@/lib/fonts";

type Profile = {
  name: string;
  fontFamily: string;
  color: string; // css color for text
  bubble: string; // my bubble background
  status?: string;
  show_status_bar?: boolean;
};

const LS_PROFILE = "sms_groupchat_profile_v3";
const LS_UID = "sms_groupchat_uid_v3";
const LS_OUTBOX = "sms_groupchat_outbox_v2";
const LS_THEME = "sms_groupchat_theme";
const LS_ROSTER = "sms_groupchat_roster_v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Chat({ roomCode = "GLOBAL" }: { roomCode?: string }) {
  // theme
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(LS_THEME) || "dark";
  });
  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem(LS_THEME, theme);
  }, [theme]);

  const [showSidebar, setShowSidebar] = useState(false);

  // client
  const supabase = useMemo(() => getSupabase(), []);
  const [error, setError] = useState<string | null>(null);

  // id
  const [userId] = useState<string>(() => {
    if (typeof window === "undefined") return uid();
    let v = localStorage.getItem(LS_UID);
    if (!v) { v = uid(); localStorage.setItem(LS_UID, v); }
    return v;
  });

  // profile
  const [profile, setProfile] = useState<Profile>(() => {
    if (typeof window === "undefined") return { name: "Anon", fontFamily: "Inter, sans-serif", color: "#111827", bubble: "#DCF8C6" };
    try {
      const raw = localStorage.getItem(LS_PROFILE);
      return raw ? JSON.parse(raw) : { name: "Anon", fontFamily: "Inter, sans-serif", color: "#111827", bubble: "#DCF8C6" };
    } catch { return { name: "Anon", fontFamily: "Inter, sans-serif", color: "#111827", bubble: "#DCF8C6" }; }
  });
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem(LS_PROFILE, JSON.stringify(profile)); }, [profile]);

  // DM / channel
  const [dmTarget, setDmTarget] = useState<UserPresence | null>(null);
  const ROOM = `room:${roomCode}`;
  const channelName = dmTarget ? ("dm:" + [userId, (dmTarget?.userId || "")].sort().join("-")) : ROOM;
  const [channel, setChannel] = useState<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  // messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgIds, setMsgIds] = useState<Set<string>>(new Set());

  // presence
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [roster, setRoster] = useState<Record<string, any>>(() => {
    if (typeof window === "undefined") return {};
    try { const raw = localStorage.getItem(`${LS_ROSTER}_${roomCode}`); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  });
  const people: UserPresence[] = useMemo(() => {
    const stateUsers = users.map(u => ({ ...u }));
    const hasMe = stateUsers.some(u => u.userId === userId);
    if (!hasMe) {
      stateUsers.push({ userId, name: profile.name, fontFamily: profile.fontFamily, color: profile.color, status: profile.status, typing: false });
    }
    // merge stored roster to show offline folks
    for (const id of Object.keys(roster)) {
      if (!stateUsers.some(u => u.userId === id)) {
        const r = roster[id];
        stateUsers.push({ userId: id, name: r.name || "User", fontFamily: r.fontFamily || "Inter, sans-serif", color: r.color || "#374151", status: r.status || "", typing: false });
      }
    }
    stateUsers.sort((a,b) => a.name.localeCompare(b.name));
    return stateUsers;
  }, [users, roster, userId, profile.name, profile.fontFamily, profile.color, profile.status]);

  const saveRoster = useCallback((next: Record<string, any>) => {
    try { localStorage.setItem(`${LS_ROSTER}_${roomCode}`, JSON.stringify(next)); } catch {}
  }, [roomCode]);

  // helpers
  const stableSetUsers = useCallback((chInst: ReturnType<NonNullable<typeof supabase>["channel"]>) => {
    if (!chInst) return;
    try {
      const state = chInst.presenceState() as Record<string, any[]>;
      const flat: UserPresence[] = [];
      Object.values(state).forEach((arr:any) => (arr as any[]).forEach((p:any) => {
        flat.push({ userId: p.userId, name: p.name, fontFamily: p.fontFamily, color: p.color, status: p.status, typing: p.typing });
      }));
      setUsers(flat);
    } catch {}
  }, []);

  // connect channel
  useEffect(() => {
    if (!supabase) { setError("Missing Supabase environment variables."); return; }
    const ch = supabase.channel(channelName, { config: { broadcast: { self: false }, presence: { key: userId } } });
    setChannel(ch);

    ch
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const m = payload as Message;
        if (msgIds.has(m.id)) return;
        setMsgIds(prev => new Set(prev).add(m.id));
        setMessages(prev => [...prev, { ...m, isSelf: m.userId === userId }]);
      })
      .on("broadcast", { event: "delete" }, ({ payload }) => {
        const { id } = payload as { id: string };
        setMessages(prev => prev.filter(m => m.id !== id));
      })
      .on("presence", { event: "sync" }, () => {
        stableSetUsers(ch);
        try {
          const st = ch.presenceState() as Record<string, any[]>;
          const onlineIds = new Set<string>();
          Object.values(st).forEach((arr:any[]) => arr.forEach((p:any) => { onlineIds.add(p.userId); }));
          const next = { ...roster } as any;
          Object.values(st).forEach((arr:any[]) => arr.forEach((p:any) => {
            next[p.userId] = { ...(next[p.userId]||{}), userId: p.userId, name: p.name, status: p.status, fontFamily: p.fontFamily, color: p.color, online: true, lastSeen: Date.now() };
          }));
          Object.keys(next).forEach(id => { if (!onlineIds.has(id)) next[id].online = false; });
          setRoster(next); saveRoster(next);
        } catch {}
      })
      .on("presence", { event: "join" }, () => {
        stableSetUsers(ch);
      })
      .on("presence", { event: "leave" }, () => {
        stableSetUsers(ch);
        try {
          const st = ch.presenceState() as Record<string, any[]>;
          const onlineIds = new Set<string>();
          Object.values(st).forEach((arr:any[]) => arr.forEach((p:any) => { onlineIds.add(p.userId); }));
          const next = { ...roster } as any;
          Object.keys(next).forEach(id => { next[id].online = onlineIds.has(id); if (!next[id].online) next[id].lastSeen = Date.now(); });
          setRoster(next); saveRoster(next);
        } catch {}
      })
      .subscribe((st) => { /* ready */ });

    // track me
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      const { userId: from, typing } = payload as { userId: string, typing: boolean };
      setUsers(prev => prev.map(u => u.userId === from ? { ...u, typing } : u));
    });

    // join with current presence
    ch.track({
      userId,
      name: profile.name,
      fontFamily: profile.fontFamily,
      color: profile.color,
      status: profile.status || "",
      typing: false,
    });

    return () => {
      ch.untrack();
      ch.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, userId, profile.name, profile.fontFamily, profile.color, profile.status, supabase]);

  // input & send
  const [input, setInput] = useState("");
  function sendMessage() {
    const text = input.trim();
    if (!text || !channel) return;
    const m: Message = {
      id: uid(),
      userId,
      name: profile.name,
      content: text,
      fontFamily: profile.fontFamily,
      color: profile.color,
      ts: Date.now(),
      meBubble: profile.bubble,
      isSelf: true,
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

  // room UI helpers
  const [roomName, setRoomName] = useState<string>(roomCode === "GLOBAL" ? "Global" : "Private Room");
  const [roomBg, setRoomBg] = useState<string>("#f4f7fb");

  // render
  return (
    <div className="flex h-screen w-full bg-black">
      {/* Sidebar (desktop) */}
      <div className="hidden md:block">
        <SidebarUsers users={people} meId={userId} onStartDM={(u)=>setDmTarget(u)} />
      </div>

      {/* Mobile overlay */}
      {showSidebar && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={()=>setShowSidebar(false)}>
          <div className="absolute left-0 top-0 h-full w-72 bg-black" onClick={(e)=>e.stopPropagation()}>
            <SidebarUsers users={people} meId={userId} onStartDM={(u)=>{ setDmTarget(u); setShowSidebar(false); }} />
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-black border-neutral-800 px-3 py-2">
          <div className="flex items-center gap-2">
            <button className="md:hidden rounded-lg border px-2 py-1 text-sm border-neutral-700" onClick={()=>setShowSidebar(true)}>Users</button>
            <h1 className="text-sm font-semibold">{roomName}</h1>
            <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-[11px] bg-neutral-900">Code: {roomCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border px-2 py-1 text-xs border-neutral-700" onClick={()=>location.href="/"}>Go to Main Menu</button>
            <button className="rounded-lg border px-2 py-1 text-xs border-neutral-700" onClick={()=>location.href="/room/GLOBAL"}>Go to Global</button>
            <button className="rounded-lg border px-2 py-1 text-xs border-neutral-700" onClick={()=>setTheme(theme==="light"?"dark":"light")}>{theme==="light"?"Dark":"Light"}</button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ background: "#000" }}>
          {messages.map(m => (
            <MessageBubble key={m.id} m={m} onDelete={(id)=>deleteMessage(id)} />
          ))}
        </div>

        {/* Composer */}
        <div className="border-t bg-black border-neutral-800 p-2">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendMessage(); } }}
              placeholder={dmTarget ? `DM to ${dmTarget.name}` : "Type a message..."}
              className="flex-1 rounded-lg border px-3 py-2 text-sm border-neutral-700 bg-neutral-900"
              style={{ fontFamily: profile.fontFamily, color: profile.color }}
            />
            <button onClick={sendMessage} className="rounded-lg bg-black text-white px-3 py-2 text-sm dark:bg-white dark:text-black">Send</button>
          </div>
          {/* Quick profile controls for demo */}
          <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-20">Name</span>
              <input value={profile.name} onChange={e=>setProfile({...profile, name: e.target.value})} className="flex-1 rounded border px-2 py-1 border-neutral-700 bg-neutral-900" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20">Text</span>
              <input type="color" value={profile.color} onChange={e=>setProfile({...profile, color: e.target.value})} />
              <span className="w-20">Bubble</span>
              <input type="color" value={profile.bubble} onChange={e=>setProfile({...profile, bubble: e.target.value})} />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="w-20">Font</span>
              <div className="flex-1 max-h-40 overflow-auto rounded border border-neutral-700 p-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                {FONT_OPTIONS.map(f => (
                  <button
                    key={f}
                    onClick={()=>setProfile({...profile, fontFamily: f})}
                    className={"rounded border px-2 py-2 text-left hover:bg-neutral-900 " + (profile.fontFamily===f ? "border-white" : "border-neutral-700")}
                    style={{ fontFamily: f }}
                    title={f}
                  >
                    {f.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* font grid */}
            <div className="col-span-1 md:col-span-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {FONT_OPTIONS.slice(0, 16).map(f => (
                  <button
                    key={f}
                    onClick={()=>setProfile({...profile, fontFamily: f})}
                    className={"w-full rounded border px-2 py-2 text-left hover:bg-neutral-900 " + (profile.fontFamily===f ? "border-white" : "border-neutral-700")}
                    style={{ fontFamily: f }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20">Status</span>
              <input value={profile.status || ""} onChange={e=>setProfile({...profile, status: e.target.value})} className="flex-1 rounded border px-2 py-1 border-neutral-700 bg-neutral-900" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
