import { clsx } from "clsx";

export type Message = {
  id: string;
  userId: string;
  name: string;
  content: string;
  fontFamily: string;
  color: string; // text color for others; ignored for me
  ts: number;
  isSelf?: boolean;
  meBubble?: string; // my bubble color
};

export default function MessageBubble({ m }: { m: Message }) {
  const me = m.isSelf;
  const style: React.CSSProperties = me
    ? { ['--bubble-me' as any]: m.meBubble || "#0b93f6", fontFamily: m.fontFamily, color: m.color }
    : { ['--bubble-them' as any]: m.meBubble || "#e5e7eb", background: 'var(--bubble-them)', fontFamily: m.fontFamily, color: m.color };
  return (
    <div className={clsx("flex w-full", me ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "relative max-w-[80%] rounded-2xl px-3 py-2 text-sm bubble",
          me ? "bubble me" : "text-gray-900 bubble them"
        )}
        style={me ? { ...style, background: `var(--bubble-me)` } : style}
      >
        <div className="mb-1 text-[11px] opacity-80 font-semibold">{m.name}</div>
        <div className="whitespace-pre-wrap break-words">
          {m.content}
        </div>
      </div>
    </div>
  );
}
