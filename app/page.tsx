'use client';
import { useRouter } from "next/navigation";
import { useState } from "react";

function randomCode(len = 6){
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for(let i=0;i<len;i++) s += alphabet[Math.floor(Math.random()*alphabet.length)];
  return s;
}

export default function Page(){
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-900">
      <div className="w-full max-w-md rounded-2xl border dark:border-neutral-800 p-6 shadow-sm bg-white dark:bg-neutral-950">
        <h1 className="text-2xl font-bold mb-4">Private Rooms</h1>
        <p className="text-sm text-gray-600 dark:text-neutral-400 mb-6">Create a room to get a code. Share it to chat privately.</p>
        <div className="flex gap-2 mb-6">
          <button
            onClick={()=> router.push(`/room/${randomCode()}`)}
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >Create Room</button>
          <a href="/room/GLOBAL" className="h-10 px-4 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black text-sm font-medium flex items-center">Go to Global</a>
        </div>
        <div className="border-t dark:border-neutral-800 pt-6">
          <label className="text-sm font-medium block mb-2">Join a room by code</label>
          <div className="flex gap-2">
            <input value={code} onChange={(e)=>setCode(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g., 8FQ2KH)"
              className="flex-1 h-10 rounded-lg border dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
            />
            <button
              onClick={()=> code.trim() && router.push(`/room/${code.trim()}`)}
              className="h-10 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
              disabled={!code.trim()}
            >Join</button>
          </div>
        </div>
      </div>
    </div>
  );
}
