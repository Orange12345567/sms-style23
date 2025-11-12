"use client";
import { useEffect, useMemo, useState } from "react";
import type { Profile } from "@/types";
import { FONT_OPTIONS } from "@/lib/fonts";

export default function NameAndStatus({ profile, onUpdate }:{ profile: Profile, onUpdate:(p:Partial<Profile>)=>void }) {
  const [name, setName] = useState<string>(profile.display_name ?? profile.name ?? "Guest");
  const [status, setStatus] = useState<string>(profile.current_status ?? profile.status ?? "");
  const [showBar, setShowBar] = useState<boolean>(profile.show_status_bar ?? true);
  const [textColor, setTextColor] = useState<string>(profile.textColor ?? profile.color ?? "#111827");
  const [bubble, setBubble] = useState<string>(profile.bubble ?? "#0b93f6");
  const [font, setFont] = useState<string>(profile.fontFamily ?? "Inter, sans-serif");
  const [custom, setCustom] = useState<string>("");

  useEffect(() => {
    onUpdate({
      name,
      status,
      color: textColor,
      bubble,
      fontFamily: font,
      // keep compat fields in sync
      display_name: name,
      current_status: status,
      show_status_bar: showBar,
      textColor
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, status, textColor, bubble, font, showBar]);

  const fontStyle = useMemo(() => ({ fontFamily: font }), [font]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-9 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm w-40"
        placeholder="Your name"
      />
      <select
        value={font}
        onChange={(e) => setFont(e.target.value)}
        className="h-9 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm w-36"
        style={fontStyle}
        title="Font"
      >
        {FONT_OPTIONS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f.split(',')[0]}</option>)}
      </select>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-600 dark:text-neutral-400">Text</span>
        <input type="color" className="h-9 w-12 rounded-md border dark:border-neutral-700"
               value={textColor} onChange={(e)=>setTextColor(e.target.value)} />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-600 dark:text-neutral-400">Bubble</span>
        <input type="color" className="h-9 w-12 rounded-md border dark:border-neutral-700"
               value={bubble} onChange={(e)=>setBubble(e.target.value)} />
      </div>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-9 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm max-w-[220px]"
      >
        <option value="">No status</option>
        <option value="Available">Available</option>
        <option value="Busy">Busy</option>
        <option value="Be right back">Be right back</option>
      </select>
      <input
        value={custom}
        onChange={(e)=>setCustom(e.target.value)}
        placeholder="Add custom…"
        className="h-9 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm w-40"
        onKeyDown={(e)=>{
          if(e.key === "Enter" && custom.trim()){
            setStatus(custom.trim());
            setCustom("");
          }
        }}
      />
      <label className="flex items-center gap-2 text-xs ml-2">
        <input type="checkbox" checked={showBar} onChange={() => setShowBar(v=>!v)} />
        Show status bar
      </label>
    </div>
  );
}
