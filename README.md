# SMS-Style Group Chat — v1.0.6

**Fixes & features:**
- No duplicate self-messages (self echo disabled + dedupe by id)
- Your messages always **right-aligned** and show **your name** above the bubble
- Sidebar shows **currently online** users with status
- **Dark mode** switch (persisted)
- **Bubble color picker** for your own bubbles (persisted)
- Optimistic UI + outbox; local persistence for name/font/color/status/custom statuses

Env on Vercel:
```
NEXT_PUBLIC_SUPABASE_URL= https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY= your anon key
```


## v1.0.8
- Presence sidebar fix (track on subscribe or first sync).
- Removed on-screen debug panel.

## v1.0.9
- Fix TypeScript error about `channel` used before declaration by refactoring presence updater.

## v1.1.0
- Removed stray timer code causing TypeScript error (`t` not defined).

## v1.1.1
- Sidebar presence made stable (no flicker) via hashed diffing + self-fallback + visibility re-track.


## v1.2.0
- **Private rooms with codes**: Click **New room** to generate a 6‑char code. Share it. Others can **Join** with the code. Realtime channel is `room:CODE`.
- **Synced colors**: Each sender's **bubble color** and **text color** are embedded in messages, so everyone sees them the same.
- **Font library expanded**: Many more font family options in the dropdown.
