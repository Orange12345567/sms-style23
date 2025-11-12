'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

function randomCode(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export default function RoomControls() {
  const [joinCode, setJoinCode] = useState("");
  const router = useRouter();

  async function createRoom() {
    const sb = getSupabase();
    if (!sb) {
      alert("Missing Supabase env vars");
      return;
    }
    const code = randomCode();
    try {
      const { data: auth } = await sb.auth.getUser();
      const owner = auth?.user?.id ?? null;
      const { error } = await sb.from("rooms").insert({ code, name: "Private Room", created_by: owner });
      if (error && !/relation .* rooms .* does not exist/i.test(error.message)) {
        console.warn("[rooms] insert failed:", error.message);
      }
    } catch (e) {
      console.warn("[rooms] insert skipped:", (e as Error).message);
    }
    router.push(`/room/${code}`);
  }

  function joinByCode() {
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    router.push(`/room/${c}`);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={createRoom}
        className="h-9 rounded-md border dark:border-neutral-700 bg-black text-white dark:bg-white dark:text-black px-3 text-xs"
      >
        Create Private Room
      </button>
      <input
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
        placeholder="Enter room code"
        className="h-9 w-44 rounded-md border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs"
      />
      <button
        onClick={joinByCode}
        disabled={!joinCode.trim()}
        className="h-9 rounded-md border dark:border-neutral-700 bg-neutral-900 text-white dark:bg-white dark:text-black px-3 text-xs disabled:opacity-50"
      >
        Join
      </button>
      <a className="text-xs underline ml-2" href="/room/global">Go to Global</a>
    </div>
  );
}
