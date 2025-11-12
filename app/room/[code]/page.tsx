"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

const Chat = dynamic(() => import("@/components/Chat"), { ssr: false });

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code ? String(params.code) : "global";
  return (
    <div className="min-h-screen">
      <Chat roomCode={code} />
    </div>
  );
}
