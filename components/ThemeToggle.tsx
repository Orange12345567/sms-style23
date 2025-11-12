"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("theme");
    const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark((saved ?? (systemDark ? "dark" : "light")) === "dark");
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    const theme = next ? "dark" : "light";
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("theme", theme);
  };

  return (
    <button
      onClick={toggle}
      className="dark:text-gray-100 fixed bottom-4 right-4 z-50 rounded-full border px-4 py-2 text-sm backdrop-blur bg-white/80 dark:bg-gray-900/70 border-gray-200 dark:border-gray-700 shadow"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
