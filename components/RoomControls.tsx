'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";

function randomCode(len = 6){
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for(let i=0;i<len;i++) s += alphabet[Math.floor(Math.random()*alphabet.length)];
  return s;
}

export default function RoomControls(){
  const [joinCode, setJoinCode] = useState("");
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={()=> router.push(`/room/${randomCode()}`)}
        className="h-9 rounded-md border dark:border-neutral-700 bg-black text-white dark:bg-white dark:text-black px-3 text-xs"
        title="Create a private room with a code"
      >Create Private Room</button>
      <input
        value={joinCode}
        onChange={(e)=>setJoinCode(e.target.value.toUpperCase())}
        placeholder="Enter room code"
        className="h-9 w-44 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs"
      />
      <button
        onClick={()=> joinCode.trim() && router.push(`/room/${joinCode.trim()}`)}
        disabled={!joinCode.trim()}
        className="h-9 rounded-md border dark:border-neutral-700 bg-neutral-900 text-white dark:bg-white dark:text-black px-3 text-xs disabled:opacity-50"
        title="Join by code"
      >Join</button>
      <a className="text-xs underline ml-2" href="/room/GLOBAL">Go to Global</a>
    </div>
  );
}
