import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS-Style Group Chat (Live Only)",
  description: "Realtime global room with presence, typing, and custom styles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
