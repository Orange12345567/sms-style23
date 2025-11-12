"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function randomCode(len=6){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length: len}, ()=> chars[Math.floor(Math.random()*chars.length)]).join("");
}

export default function RoomControls({ currentRoomId, onJoinByCode }:{ currentRoomId: string | null, onJoinByCode:(code:string)=>void }){
  const [code, setCode] = useState("");

  async function createRoom(){
    const c = randomCode();
    const { data: auth } = await supabase.auth.getUser();
    const owner = auth.user?.id ?? null;
    const { data, error } = await supabase.from("rooms").insert({ code: c, name: "Private Room", created_by: owner }).select().single();
    if(error){ alert(error.message); return; }
    navigator.clipboard.writeText(`${location.origin}/?code=${data.code}`);
    alert(`Room created! Code: ${data.code}\nInvite link copied to clipboard.`);
    onJoinByCode(data.code);
  }

  return (
    <div className="p-3 bg-white border-b flex items-center gap-2">
      <button onClick={createRoom} className="px-3 py-2 text-sm rounded-lg bg-black text-white">Create Private Room</button>
      <input
        value={code}
        onChange={e=>setCode(e.target.value.toUpperCase())}
        placeholder="Enter room code"
        className="px-3 py-2 rounded-lg border w-40"
      />
      <button onClick={()=>onJoinByCode(code)} className="px-3 py-2 text-sm rounded-lg bg-gray-800 text-white">Join</button>
      <a href="/?room=global" className="ml-auto text-sm underline">Go to Global</a>
    </div>
  );
}
