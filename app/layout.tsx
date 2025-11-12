import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider"
import ThemeToggle from "@/components/ThemeToggle"

export const metadata: Metadata = {
  title: "SMS-Style Group Chat (Live Only)",
  description: "Realtime global room with presence, typing, and custom styles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900 dark:bg-neutral-900 dark:text-neutral-100"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}