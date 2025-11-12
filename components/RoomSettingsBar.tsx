'use client';
import { useEffect, useMemo, useState } from "react";

export default function RoomSettingsBar({ roomCode, onChange }:{ roomCode:string, onChange:(v:{name?:string, bg?:string})=>void }){
  const LS_KEY = `room_settings_${roomCode}`;
  const [name, setName] = useState<string>("");
  const [bg, setBg] = useState<string>("#ffffff");

  useEffect(()=>{
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        setName(parsed.name || "");
        setBg(parsed.bg || "#ffffff");
        onChange({ name: parsed.name, bg: parsed.bg });
      }
    }catch{}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  useEffect(()=>{
    const v = { name, bg };
    localStorage.setItem(LS_KEY, JSON.stringify(v));
    onChange(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, bg]);

  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        onChange={(e)=>setName(e.target.value)}
        placeholder="Room name"
        className="h-9 w-44 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs"
      />
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-gray-600 dark:text-neutral-400">Background</span>
        <input type="color" className="h-9 w-12 rounded-md border dark:border-neutral-700" value={bg} onChange={(e)=>setBg(e.target.value)} />
      </div>
    </div>
  );
}
