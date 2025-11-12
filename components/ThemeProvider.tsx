"use client";

import { useEffect, useState, ReactNode } from "react";

type Props = { children: ReactNode };

export default function ThemeProvider({ children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("theme") : null;
    const systemDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved ?? (systemDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    setMounted(true);
  }, []);

  if (!mounted) return <>{children}</>;

  return <>{children}</>;
}
