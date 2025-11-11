import { clsx } from "clsx";

export type UserPresence = {
  userId: string;
  name: string;
  fontFamily: string;
  color: string;
  status?: string;
  typing?: boolean;
};

export default function SidebarUsers({ users, meId }: { users: UserPresence[]; meId: string }) {
  return (
    <aside className="w-64 shrink-0 border-r bg-white">
      <div className="p-3 border-b">
        <h2 className="text-sm font-semibold">People</h2>
        <p className="text-xs text-gray-500">Auto-joined global room</p>
      </div>
      <ul className="divide-y">
        {users.map((u) => (
          <li key={u.userId} className={clsx("p-3", u.userId === meId && "bg-gray-50")}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ fontFamily: u.fontFamily }}>
                {u.name}
              </span>
              {u.typing && <span className="text-[11px] text-blue-600">typing…</span>}
            </div>
            <div className="mt-1 text-xs text-gray-600 truncate">{u.status ? u.status : "—"}</div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
