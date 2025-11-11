# SMS-Style Group Chat (Temporary / Live Only)

A **temporary / live-only** SMS-style group chat. Everyone auto-joins a single global room via **Supabase Realtime** (no DB) with **typing indicators**, **presence list (names stacked)**, **custom name with emojis**, **per-user message font & color**, and **unlimited custom statuses** via dropdown.

## Quick Start

```bash
pnpm i   # or npm i / yarn
pnpm dev # or npm run dev
```

Open http://localhost:3000

## Environment Variables

Create `.env.local` (or set on Vercel):

```
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

No tables required; uses **Realtime Channels** (broadcast + presence) only.

## Deploy to Vercel
1. Push to GitHub.
2. Import to Vercel.
3. Add the two env vars above.
4. Deploy.

## Notes
- Messages are not persisted; refreshing clears chat.
- To support multiple rooms, change `ROOM` in `components/Chat.tsx` to read from a path param.
