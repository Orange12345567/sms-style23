import { clsx } from "clsx";

export type Message = {
  id: string;
  userId: string;
  name: string;
  content: string;
  fontFamily: string;
  textColor: string; // sender's preferred text color
  bubbleColor: string; // sender's preferred bubble color
  ts: number;
  isSelf?: boolean;
};

export default function MessageBubble({ m }: { m: Message }) {
  const me = m.isSelf;
  const style: React.CSSProperties = {
    fontFamily: m.fontFamily,
    color: me ? undefined : m.textColor,
    background: me ? m.bubbleColor : undefined
  };
  return (
    <div className={clsx("flex w-full", me ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "relative max-w-[80%] rounded-2xl px-3 py-2 text-sm bubble",
          me ? "text-white bubble me" : "bg-smsLight text-gray-900 bubble them"
        )}
        style={style}
      >
        <div className="mb-1 text-[11px] opacity-80 font-semibold">{m.name}</div>
        <div className="whitespace-pre-wrap break-words">
          {m.content}
        </div>
      </div>
    </div>
  );
}
