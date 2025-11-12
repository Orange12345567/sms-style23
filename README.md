# SMS-Style Group Chat — v1.0.5

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
