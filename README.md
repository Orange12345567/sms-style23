# SMS-Style Group Chat (Temporary / Live Only) — FIXED

This build avoids server-side initialization of Supabase and uses a **client-only, lazy** Supabase client to prevent `supabaseUrl is required` during SSR.

## What changed
- `app/page.tsx` uses `dynamic(..., { ssr: false })` so Chat renders **only on the client**.
- `lib/supabaseClient.ts` exposes `getSupabase()` which lazily reads `NEXT_PUBLIC_...` envs **at runtime on the client** (no module-level createClient).
- Clear error message if envs are missing.

## Env Vars (Vercel → Project Settings → Environment Variables)
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Run
```bash
npm i
npm run dev
```

## Deploy
Push to GitHub → Import on Vercel → set env vars → Deploy.
