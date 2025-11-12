"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import SidebarUsers, { UserPresence } from "./SidebarUsers";
import MessageBubble, { Message } from "./MessageBubble";
import ErrorPanel from "./ErrorPanel";
import DebugBar from "./DebugBar";
import { clsx } from "clsx";

const ROOM = "room:global";
const LS_PROFILE = "sms_groupchat_profile_v3";
const LS_UID = "sms_groupchat_uid_v3";
const LS_OUTBOX = "sms_groupchat_outbox_v2";
const LS_THEME = "sms_groupchat_theme";

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

export default function Chat() {
  // theme toggle
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(LS_THEME) || "light";
  });
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
  });

  const [profile, setProfile] = useState<Profile>(() => {
    if (typeof window === "undefined") {
      return { name: `Guest-${Math.floor(Math.random()*999)}`, fontFamily: DEFAULT_FONTS[0], color: "#111827", status: "", customStatuses: [], bubble: "#0b93f6" };
    }
    const raw = localStorage.getItem(LS_PROFILE);
    if (raw) {
      try { return { bubble: "#0b93f6", ...(JSON.parse(raw) as Profile) }; } catch {}
    }
    return { name: `Guest-${Math.floor(Math.random()*999)}`, fontFamily: DEFAULT_FONTS[0], color: "#111827", status: "", customStatuses: [], bubble: "#0b93f6" };
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
  }, [profile]);

  const [outbox, setOutbox] = useState<OutboxItem[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(LS_OUTBOX);
    if (!raw) return [];
    try { return JSON.parse(raw) as OutboxItem[]; } catch { return []; }
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(LS_OUTBOX, JSON.stringify(outbox));
  }, [outbox]);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgIds, setMsgIds] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const [wsConnected, setWsConnected] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | undefined>(undefined);

  const supabase = useMemo(() => {
    const c = getSupabase();
    if (!c) setError("Missing Supabase environment variables.");
    return c;
  }, []);

  const [channel, setChannel] = useState<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const [retry, setRetry] = useState(0);

  const setupChannel = useCallback(() => {
    if (!supabase) return;
    // Disable self echo to avoid duplicates (we do optimistic UI)
    const ch = supabase.channel(ROOM, { config: { broadcast: { self: false }, presence: { key: userId } } });
    setChannel(ch);

    ch
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const m = payload as Message;
        if (msgIds.has(m.id)) return; // dedupe by id
        setMsgIds((prev) => new Set(prev).add(m.id));
        setMessages((prev) => [...prev, { ...m, isSelf: m.userId === userId }]);
        setLastEvent("message");
      })
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState() as Record<string, any[]>;
        const flat: UserPresence[] = Object.values(state).flat().map((p: any) => ({
          userId: p.userId,
          name: p.name,
          fontFamily: p.fontFamily,
          color: p.color,
          status: p.status,
          typing: p.typing,
        }));
        flat.sort((a, b) => a.name.localeCompare(b.name));
        setUsers(flat);
        setLastEvent("presence:sync");
      })
      .subscribe(async (st) => {
        if (st === "SUBSCRIBED") {
          setSubscribed(true);
          setWsConnected(true);
          await ch.track({
            userId,
            name: profile.name,
            fontFamily: profile.fontFamily,
            color: profile.color,
            status: profile.status,
            typing: false
          });
          // flush outbox
          setOutbox((prev) => {
            prev.forEach((o) => ch.send({ type: "broadcast", event: "message", payload: o.payload }));
            return [];
          });
          localStorage.removeItem(LS_OUTBOX);
        } else {
          setSubscribed(false);
        }
      });

    // guard timer: retry if not subscribed within 5s
    const t = setTimeout(() => {
      if (!subscribed) {
        try { ch.unsubscribe(); } catch {}
        setChannel(null);
        setRetry((r) => r + 1);
      }
    }, 5000);

    return () => {
      clearTimeout(t);
      try { ch.unsubscribe(); } catch {}
      setSubscribed(false);
    };
  }, [supabase, userId, profile.name, profile.fontFamily, profile.color, profile.status, subscribed, msgIds]);

  useEffect(() => {
    if (!supabase) return;
    setupChannel();
  }, [supabase, retry, setupChannel]);

  // optimistic send (always right aligned; shows name)
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
    // show instantly
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
      <SidebarUsers users={users} meId={userId} />

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

          {/* Text color (for others' bubble text color & your composer text) */}
          <input
            type="color"
            className="h-9 w-12 cursor-pointer rounded-md border dark:border-neutral-700"
            value={profile.color}
            onChange={(e) => setColor(e.target.value)}
            title="Text color"
          />

          {/* Bubble color (your own bubble background) */}
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

          {/* Status dropdown with custom add */}
          <div className="flex items-center gap-1">
            <select
              className="h-9 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm max-w-[220px]"
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
              <input
                name="customStatus"
                className="h-9 w-36 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm"
                placeholder="Add custom…"
              />
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

      <DebugBar
        connected={wsConnected}
        subscribed={subscribed}
        url={process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace("https://","wss://")}/realtime/v1` : undefined}
        lastEvent={lastEvent}
      />
    </div>
  );
}
