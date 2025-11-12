import { clsx } from "clsx";

export type UserPresence = {
  userId: string;
  name: string;
  fontFamily: string;
  color: string;
  status?: string;
  typing?: boolean;
};

export default function SidebarUsers({ users, meId, onStartDM }: { users: UserPresence[]; meId: string, onStartDM?: (u: UserPresence)=>void }) {
  return (
    <aside className="w-64 shrink-0 border-r bg-black dark:border-neutral-800">
      <div className="p-3 border-b dark:border-neutral-800">
        <h2 className="text-sm font-semibold">People</h2>
        <p className="text-xs text-gray-500 dark:text-neutral-400">Online in global room</p>
      </div>
      <ul className="divide-y dark:divide-neutral-800">
        {users.map((u) => {
          const isMe = u.userId === meId;
          return (
            <li key={u.userId} className={clsx("p-3", isMe && "bg-gray-50 dark:bg-neutral-800/50")}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ fontFamily: u.fontFamily }}>
                  {u.name}{isMe ? " (you)" : ""} <span className="ml-2 text-[11px] opacity-70">Online</span>
                </span>
                {u.typing && <span className="text-[11px] text-blue-600">typing…</span>}
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-neutral-400 truncate">
                {u.status ? u.status : "—"} {onStartDM && !isMe && (<button onClick={()=>onStartDM(u)} className="ml-2 text-[11px] underline">DM</button>)}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
