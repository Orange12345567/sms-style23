import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS-Style Group Chat (Live Only)",
  description: "Realtime global room with presence, typing, and custom styles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=DM+Sans:wght@400;700&family=Rubik:wght@400;700&family=Nunito:wght@400;700&family=Poppins:wght@400;700&family=Montserrat:wght@400;700&family=Work+Sans:wght@400;700&family=Raleway:wght@400;700&family=Manrope:wght@400;700&family=Plus+Jakarta+Sans:wght@400;700&family=Playfair+Display:wght@400;700&family=Cinzel:wght@400;700&family=Cinzel+Decorative:wght@400;700&family=UnifrakturCook:wght@400&family=MedievalSharp&family=Pirata+One&family=New+Rocker&family=Metal+Mania&family=Creepster&family=Fredericka+the+Great&family=Lobster&family=Pacifico&family=Orbitron:wght@400;700&family=Press+Start+2P&family=Rye&family=Tangerine:wght@400;700&family=Amatic+SC:wght@400;700&family=Indie+Flower&family=Poiret+One&family=Courgette&family=Special+Elite&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Caveat:wght@400;700&family=Permanent+Marker&family=Rock+Salt&family=Bangers&display=swap"
  rel="stylesheet"
/>
      </head>
      <body className="bg-gray-100 text-gray-900 dark:bg-neutral-900 dark:text-neutral-100">{children}</body>
    </html>
  );
}
