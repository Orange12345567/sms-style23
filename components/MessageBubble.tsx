
"use client";
export default function MessageBubble({ m, isSelf, onDelete }:{ m:any, isSelf:boolean, onDelete:()=>void }){
  const bgColor = m.meBubble || "#1f2937";
  return (
    <div className={"flex " + (isSelf ? "justify-end" : "justify-start")}>
      <div className="max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow" style={{ background: bgColor, color: m.color || "#fff", fontFamily: m.fontFamily }}>
        <div className="text-[10px] opacity-80 mb-1">{m.name}</div>
        <div>{m.text}</div>
        {isSelf && <button className="mt-1 text-[10px] underline" onClick={onDelete}>delete</button>}
      </div>
    </div>
  )
}
