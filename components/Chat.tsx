
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import SidebarUsers, { UserPresence } from "./SidebarUsers";
import MessageBubble, { Message } from "./MessageBubble";
import ErrorPanel from "./ErrorPanel";
import { clsx } from "clsx";


const LS_PROFILE = "sms_groupchat_profile_v3";
const LS_UID = "sms_groupchat_uid_v3";
const LS_OUTBOX = "sms_groupchat_outbox_v2";
const LS_THEME = "sms_groupchat_theme";
const LS_ROSTER = "sms_groupchat_roster_v1";

const DEFAULT_FONTS = [
  "Inter, system-ui, sans-serif",
  "Arial, Helvetica, sans-serif",
  "Georgia, serif",
  "Courier New, monospace",
  "Comic Sans MS, cursive",
  "Trebuchet MS, sans-serif",
  "Times New Roman, serif",
  "Verdana, sans-serif",
];

function uid() { return Math.random().toString(36).slice(2); }

type Profile = {
  name: string;
  fontFamily: string;
  color: string;
  status: string;
  customStatuses: string[];
  bubble: string; // my bubble color
};

type OutboxItem = { id: string; payload: Message };

export default function Chat({ roomCode = "GLOBAL" }: { roomCode?: string }) {
  const ROOM = `room:${roomCode}`;
  // theme toggle
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(LS_THEME) as string) || "light";
  const [showSidebar, setShowSidebar] = useState(false);
useEffect(() => {
    if (typeof document !== "undefined") {
      const el = document.documentElement;
      if (theme === "dark") el.classList.add("dark");
      else el.classList.remove("dark");
      localStorage.setItem(LS_THEME, theme);
    }
  }, [theme]);

  const [userId] = useState<string>(() => {
    if (typeof window === "undefined") return uid();
    const existing = localStorage.getItem(LS_UID);
    if (existing) return existing;
    const id = uid();
    localStorage.setItem(LS_UID, id);
    return id;
  const defaultProfile: Profile = {
    name: `Guest-${Math.floor(Math.random()*999)}`,
    fontFamily: DEFAULT_FONTS[0],
    color: "#111827",
    status: "",
    customStatuses: [],
    bubble: "#0b93f6",
  };

  const [profile, setProfile] = useState<Profile>(() => {
    if (typeof window === "undefined") return defaultProfile;
    const raw = localStorage.getItem(LS_PROFILE);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<Profile>;
        return { ...defaultProfile, ...parsed, bubble: parsed.bubble ?? defaultProfile.bubble };
      } catch {}
    }
    return defaultProfile;
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
  }, [profile]);

  const [outbox, setOutbox] = useState<OutboxItem[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(LS_OUTBOX);
    if (!raw) return [];
    try { return JSON.parse(raw) as OutboxItem[]; } catch { return []; }
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(LS_OUTBOX, JSON.stringify(outbox));
  }, [outbox]);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgIds, setMsgIds] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<UserPresence[]>([])
  const [roster, setRoster] = useState<Record<string, any>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(`${LS_ROSTER}_${roomCode}`);
  const people: any[] = Object.values(roster).sort(
    (a: any, b: any) =>
      (Number(b.online) - Number(a.online)) ||
      ((a.name || "").localeCompare(b.name || ""))
  );

  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const [subscribed, setSubscribed] = useState(false);
  const hasTrackedRef = useRef(false);

  const supabase = useMemo(() => {
    const c = getSupabase();
    if (!c) setError("Missing Supabase environment variables.");
    return c;
  }, []);

  const [dmTarget, setDmTarget] = useState<UserPresence | null>(null);
  const [channel, setChannel] = useState<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  // ---- Stable presence helpers ----
  const usersHashRef = useRef<string>("");
  const calcUsers = useCallback((chInst: ReturnType<NonNullable<typeof supabase>["channel"]>) => {
    const state = chInst.presenceState() as Record<string, any[]>;
    const flat: UserPresence[] = Object.values(state)
      .flat()
      .map((p: any) => ({
        userId: p.userId,
        name: p.name,
        fontFamily: p.fontFamily,
        color: p.color,
        status: p.status,
        typing: p.typing,
      }));
    // Always include self as a fallback
    const hasMe = flat.some(u => u.userId === userId);
    if (!hasMe) {
      flat.push({
        userId,
        name: profile.name,
        fontFamily: profile.fontFamily,
        color: profile.color,
        status: profile.status,
        typing: false,
      });
    flat.sort((a, b) => a.name.localeCompare(b.name));
    return flat;
  }, [profile.name, profile.fontFamily, profile.color, profile.status, userId]);

  const stableSetUsers = useCallback((chInst: ReturnType<NonNullable<typeof supabase>["channel"]>) => {
    if (!chInst) return;
    const next = calcUsers(chInst);
    const hash = JSON.stringify(next.map(u => [u.userId, u.name, u.status]));
    if (hash !== usersHashRef.current) {
      usersHashRef.current = hash;
      setUsers(next);
    }
  }, [calcUsers]);

  // Channel setup
  useEffect(() => {
    if (!supabase) return;
    const channelName = dmTarget ? ("dm:" + [userId, ((dmTarget as any)?.userId || "")].sort().join("-")) : ROOM;
    const ch = supabase.channel(channelName, { config: { broadcast: { self: false }, presence: { key: userId } } });
    setChannel(ch);

    ch
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const m = payload as Message;
        if (msgIds.has(m.id)) return;
        setMsgIds((prev) => new Set(prev).add(m.id));
        setMessages((prev) => [...prev, { ...m, isSelf: m.userId === userId }]);

      .on("broadcast", { event: "delete" }, ({ payload }) => {
        const { id } = payload as { id: string };
        setMessages(prev => prev.filter(m => m.id !== id));

      .on("presence", { event: "sync" }, () => { stableSetUsers(ch); 
        // Update roster from presence
        try {
          const st = ch.presenceState() as Record<string, any[]>;
          const onlineIds = new Set<string>();
          Object.values(st).forEach(arr => (arr as any[]).forEach(p => { onlineIds.add(p.userId); }));
          const next = { ...roster } as any;
          Object.values(st).forEach(arr => (arr as any[]).forEach((p: any) => {
            next[p.userId] = { ...(next[p.userId]||{}), userId: p.userId, name: p.name, status: p.status, fontFamily: p.fontFamily, color: p.color, online: true, lastSeen: Date.now() };
          }));
          // mark previously known as offline if not in onlineIds
          Object.keys(next).forEach(id => { if (!onlineIds.has(id)) next[id].online = false; });
          setRoster(next); saveRoster(next);
        } catch {}

      .on("presence", { event: "join" }, () => { stableSetUsers(ch); 
        try {
          const st = ch.presenceState() as Record<string, any[]>;
          const next = { ...roster } as any;
          Object.values(st).forEach(arr => (arr as any[]).forEach((p: any) => { next[p.userId] = { ...(next[p.userId]||{}), userId: p.userId, name: p.name, status: p.status, fontFamily: p.fontFamily, color: p.color, online: true, lastSeen: Date.now() }; }));
          setRoster(next); saveRoster(next);
        } catch {}

      .on("presence", { event: "leave" }, () => { stableSetUsers(ch); 
        try {
          const st = ch.presenceState() as Record<string, any[]>;
          const onlineIds = new Set<string>();
          Object.values(st).forEach(arr => (arr as any[]).forEach(p => { onlineIds.add(p.userId); }));
          const next = { ...roster } as any;
          Object.keys(next).forEach(id => { next[id].online = onlineIds.has(id); if (!next[id].online) next[id].lastSeen = Date.now(); });
          setRoster(next); saveRoster(next);
        } catch {}

      .subscribe(async (st) => {
        if (st === "SUBSCRIBED") {
          setSubscribed(true);
          if (!hasTrackedRef.current) {
            await ch.track({
              userId,
              name: profile.name,
              fontFamily: profile.fontFamily,
              color: profile.color,
              status: profile.status,
              typing: false
            hasTrackedRef.current = true;
          }
          stableSetUsers(ch);
          // flush outbox
          setOutbox((prev) => {
            prev.forEach((o) => ch.send({ type: "broadcast", event: "message", payload: o.payload }));
            return [];
          if (typeof window !== "undefined") localStorage.removeItem(LS_OUTBOX);
        }
    return () => {
      try { ch.unsubscribe(); } catch {}
      setSubscribed(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId]);

  // Update presence when profile fields change
  useEffect(() => {
    if (!channel || !subscribed) return;
    channel.track({
      userId,
      name: profile.name,
      fontFamily: profile.fontFamily,
      color: profile.color,
      status: profile.status,
      typing: isTyping
    stableSetUsers(channel);
  }, [profile.name, profile.fontFamily, profile.color, profile.status, isTyping, channel, userId, subscribed, stableSetUsers]);

  // Visibility retrack
  useEffect(() => {
    if (!channel || !subscribed) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        try {
          channel.track({
            userId,
            name: profile.name,
            fontFamily: profile.fontFamily,
            color: profile.color,
            status: profile.status,
            typing: false
          stableSetUsers(channel);
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [channel, subscribed, userId, profile.name, profile.fontFamily, profile.color, profile.status, stableSetUsers]);

  // optimistic send (always right aligned; shows name)
  function deleteMessage(id: string){
  setMessages(prev => prev.filter(m => m.id !== id));
  if (channel && subscribed) {
    channel.send({ type: "broadcast", event: "delete", payload: { id } });
  }
}

function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const m: Message = {
      id: uid(),
      userId,
      name: profile.name,
      content: text,
      fontFamily: profile.fontFamily,
      color: profile.color,
      meBubble: profile.bubble,
      ts: Date.now(),
      isSelf: true
    };
    setMessages((prev) => [...prev, m]);
    setMsgIds((prev) => new Set(prev).add(m.id));
    setInput("");
    setIsTyping(false);

    if (channel && subscribed) {
      channel.send({ type: "broadcast", event: "message", payload: { ...m, isSelf: undefined } });
    } else {
      setOutbox((prev) => [...prev, { id: m.id, payload: { ...m, isSelf: undefined } }]);
    }
  }

  function handleTyping(val: string) {
    setInput(val);
    if (!channel || !subscribed) return;
    if (typingRef.current) clearTimeout(typingRef.current);
    setIsTyping(true);
    typingRef.current = setTimeout(() => setIsTyping(false), 1200);
  }

  // profile setters
  const setName = (v: string) => setProfile((p) => ({ ...p, name: v }));
  const setFontFamily = (v: string) => setProfile((p) => ({ ...p, fontFamily: v }));
  const setColor = (v: string) => setProfile((p) => ({ ...p, color: v }));
  const setStatus = (v: string) => setProfile((p) => ({ ...p, status: v }));
  const setBubble = (v: string) => setProfile((p) => ({ ...p, bubble: v }));
  const addCustomStatus = (v: string) => {
    if (!v) return;
    setProfile((p) => ({ ...p, customStatuses: Array.from(new Set([...(p.customStatuses || []), v])) }));
    setStatus(v);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (error) return <ErrorPanel title="Application needs configuration" details={error} />;
  if (!supabase) return <div className="p-6 text-sm text-gray-600 dark:text-neutral-300">Initializing…</div>;

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[var(--chat-max)] bg-white dark:bg-neutral-900 shadow-sm">
      {showSidebar && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={()=>setShowSidebar(false)}>
          <div className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-neutral-900" onClick={(e)=>e.stopPropagation()}>
            <SidebarUsers users={users} meId={userId} onStartDM={(u)=>setDmTarget(u)} />
          </div>
        </div>
      )}
      <div className="hidden md:block"><SidebarUsers users={people as any} meId={userId} /></div>

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Header / Controls */}
        <div className="flex flex-wrap items-center gap-2 border-b dark:border-neutral-800 p-3">
          <input
            className="h-9 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm"
            value={profile.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
          />

          <select
            className="h-9 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm"
            value={profile.fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
          >
            {DEFAULT_FONTS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f.split(",")[0]}
              </option>
            ))}
          </select>

          {/* Text color */}
          <input
            type="color"
            className="h-9 w-12 cursor-pointer rounded-md border dark:border-neutral-700"
            value={profile.color}
            onChange={(e) => setColor(e.target.value)}
            title="Text color"
          />

          {/* Bubble color */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600 dark:text-neutral-400">Bubble</span>
            <input
              type="color"
              className="h-9 w-12 cursor-pointer rounded-md border dark:border-neutral-700"
              value={profile.bubble}
              onChange={(e) => setBubble(e.target.value)}
              title="My bubble color"
            />
          </div>

          {/* Header right actions */}
<div className="ml-auto hidden sm:flex items-center gap-2">
  <span className="text-xs opacity-70">Code: <b>{roomCode}</b></span>
  <a href="/room/GLOBAL" className="h-9 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs flex items-center">Go to Global</a>
  <a href="/" className="h-9 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs flex items-center">Go to Main Menu</a>
</div>

{/* Status dropdown with custom add */}

          <div className="flex items-center gap-1">
            <select
              className="h-9 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm max-w-[220px] mr-1"
              value={profile.status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">No status</option>
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
              <option value="Be right back">Be right back</option>
              {(profile.customStatuses || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button onClick={()=> setStatus("")} className="h-9 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs mr-1" title="Clear current status">Clear</button>
            {(profile.customStatuses || []).length > 0 && (
              <div className="flex flex-wrap gap-1 max-w-[220px]">
                {(profile.customStatuses || []).map((s) => (
                  <button key={s} onClick={() => setProfile((p)=>({ ...p, customStatuses: (p.customStatuses || []).filter(x => x !== s) }))} className="text-[11px] px-2 py-1 rounded border dark:border-neutral-700">
                    ✕ {s}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem("customStatus") as HTMLInputElement;
                const v = input.value.trim();
                if (v) { addCustomStatus(v); form.reset(); }
              }}
              className="flex items-center gap-1"
            >
              <input name="customStatus" className="h-9 w-36 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm" placeholder="Add custom…" />
              <button className="h-9 rounded-md border dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 text-sm">Add</button>
            </form>
          </div>

          {/* Dark mode switch */}
          <label className="ml-auto inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={theme === "dark"}
              onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
            />
            Dark mode
          </label>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-[url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'8\\' height=\\'8\\'%3E%3Crect width=\\'8\\' height=\\'8\\' fill=\\'%23ffffff\\'/%3E%3Cpath d=\\'M0 0h8v8H0z\\' fill=\\'none\\'/%3E%3C/svg%3E')] dark:bg-neutral-900 p-4">
          {messages.map((m) => <MessageBubble key={m.id} m={m} />)}
          <div ref={chatEndRef} />
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 border-t dark:border-neutral-800 p-3">
          <textarea
            className="min-h-[44px] w-full resize-none rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none"
            placeholder="Message"
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            style={{ fontFamily: profile.fontFamily, color: profile.color }}
          />
          <button
            onClick={sendMessage}
            className={clsx(
              "h-10 shrink-0 rounded-lg px-4 text-sm font-medium text-white",
              input.trim() ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"
            )}
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}