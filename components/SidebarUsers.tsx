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
    <aside className="dark:text-gray-100 w-64 shrink-0 border-r bg-white dark:bg-neutral-900 dark:border-neutral-800">
      <div className="dark:text-gray-100 p-3 border-b dark:border-neutral-800">
        <h2 className="dark:text-gray-100 text-sm font-semibold">People</h2>
        <p className="dark:text-gray-100 text-xs text-gray-500 dark:text-neutral-400">Online in global room</p>
      </div>
      <ul className="dark:text-gray-100 divide-y dark:divide-neutral-800">
        {users.map((u) => (
          <li key={u.userId} className={clsx("p-3", u.userId === meId && "bg-gray-50 dark:bg-neutral-800/50")}>
            <div className="dark:text-gray-100 flex items-center justify-between">
              <span className="dark:text-gray-100 text-sm font-medium" style={{ fontFamily: u.fontFamily }}>{u.name}{u.userId===meId ? " (you)" : ""}</span>
              {u.typing && <span className="dark:text-gray-100 text-[11px] text-blue-600">typing…</span>}
            </div>
            <div className="dark:text-gray-100 mt-1 text-xs text-gray-600 dark:text-neutral-400 truncate">{u.status ? u.status : "—"}</div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
