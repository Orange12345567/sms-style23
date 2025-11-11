import { clsx } from "clsx";

export type Message = {
  id: string;
  userId: string;
  name: string;
  content: string;
  fontFamily: string;
  color: string;
  ts: number;
  isSelf?: boolean;
};

export default function MessageBubble({ m }: { m: Message }) {
  const me = m.isSelf;
  return (
    <div className={clsx("flex w-full", me ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "relative max-w-[80%] rounded-2xl px-3 py-2 text-sm bubble",
          me ? "bg-smsBg text-white bubble me" : "bg-smsLight text-gray-900 bubble them"
        )}
      >
        <div className="mb-1 flex items-center gap-2">
          {!me && (
            <span
              className="text-xs font-semibold opacity-80"
              style={{ fontFamily: m.fontFamily }}
            >
              {m.name}
            </span>
          )}
        </div>
        <div
          className="whitespace-pre-wrap break-words"
          style={{ fontFamily: m.fontFamily, color: me ? undefined : m.color }}
        >
          {m.content}
        </div>
      </div>
    </div>
  );
}
