'use client';
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
const Chat = dynamic(() => import("@/components/Chat"), { ssr: false });
export default function RoomPage(){
  const params = useParams<{code:string}>();
  const code = params?.code ? String(params.code) : "GLOBAL";
  return <Chat roomCode={code} />;
}
