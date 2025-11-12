"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import SidebarUsers, { UserPresence } from "./SidebarUsers";
import MessageBubble, { Message } from "./MessageBubble";
import { clsx } from "clsx";

const ROOM = "room:global";

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

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function Chat() {
  const [userId] = useState<string>(() => uid());
  const [name, setName] = useState<string>(() => `Guest-${Math.floor(Math.random()*999)}`);
  const [fontFamily, setFontFamily] = useState<string>(DEFAULT_FONTS[0]);
  const [color, setColor] = useState<string>("#111827");
  const [status, setStatus] = useState<string>("");
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserPresence[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Create Supabase client only on client at runtime
  const supabase = useMemo(() => getSupabase(), []);

  const channel = useMemo(() => {
    return supabase.channel(ROOM, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    });
  }, [supabase, userId]);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Join presence + listeners
  useEffect(() => {
    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const m = payload as Message;
        setMessages((prev) => [
          ...prev,
          { ...m, isSelf: m.userId === userId },
        ]);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, any[]>;
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
        // sort by name for stable list
        flat.sort((a, b) => a.name.localeCompare(b.name));
        setUsers(flat);
      })
      .on("presence", { event: "join" }, () => {})
      .on("presence", { event: "leave" }, () => {})
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId, name, fontFamily, color, status, typing: false });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [channel, userId, name, fontFamily, color, status]);

  // Update presence when profile fields change
  useEffect(() => {
    channel.track({ userId, name, fontFamily, color, status, typing: isTyping });
  }, [name, fontFamily, color, status, isTyping, channel, userId]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const m: Message = {
      id: uid(),
      userId,
      name,
      content: text,
      fontFamily,
      color,
      ts: Date.now(),
    };
    channel.send({ type: "broadcast", event: "message", payload: m });
    setInput("");
    setIsTyping(false);
  }

  function handleTyping(val: string) {
    setInput(val);
    if (typingRef.current) clearTimeout(typingRef.current);
    setIsTyping(true);
    typingRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1200);
  }

  function addCustomStatus(label: string) {
    if (!label) return;
    setCustomStatuses((prev) => Array.from(new Set([...prev, label])));
    setStatus(label);
  }

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[var(--chat-max)] bg-white shadow-sm">
      <SidebarUsers
        users={users}
        meId={userId}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Header / Controls */}
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <input
            className="h-9 rounded-md border px-3 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
          />

          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
          >
            {DEFAULT_FONTS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f.split(",")[0]}
              </option>
            ))}
          </select>

          <input
            type="color"
            className="h-9 w-12 cursor-pointer rounded-md border"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            title="Message color"
          />

          {/* Status dropdown with custom add */}
          <div className="flex items-center gap-1">
            <select
              className="h-9 rounded-md border px-2 text-sm max-w-[220px]"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">No status</option>
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
              <option value="Be right back">Be right back</option>
              {customStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem("customStatus") as HTMLInputElement;
                addCustomStatus(input.value.trim());
                form.reset();
              }}
              className="flex items-center gap-1"
            >
              <input
                name="customStatus"
                className="h-9 w-36 rounded-md border px-2 text-sm"
                placeholder="Add custom…"
              />
              <button className="h-9 rounded-md border bg-gray-50 px-3 text-sm">Add</button>
            </form>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-2 overflow-y-auto bg-[url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'8\\' height=\\'8\\'%3E%3Crect width=\\'8\\' height=\\'8\\' fill=\\'%23ffffff\\'/%3E%3Cpath d=\\'M0 0h8v8H0z\\' fill=\\'none\\'/%3E%3C/svg%3E')] p-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 border-t p-3">
          <textarea
            className="min-h-[44px] w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none"
            placeholder="Message"
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            style={{ fontFamily, color }}
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
