# Azims Workout Manager

Coaching platform for Coach Oliul Azim's gym: a coach portal (clients, workout and diet plans, meal photo review, payments, schedule, notices, reports) and a client portal (workouts, diet, meal and progress logging, payments, notices). Data, sign-in, photos and notifications run on Supabase.

## Run locally

**Prerequisites:** Node.js 20+ and a Supabase project set up as described in [supabase/ARCHITECTURE.md](supabase/ARCHITECTURE.md).

1. Install dependencies: `npm install --legacy-peer-deps`
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.
3. Start the app: `npm run dev`, then open http://localhost:3000

If the project folder name contains `&`, `npm run dev` fails on Windows; rename the folder, or run `node node_modules/vite/bin/vite.js --port=3000`.

## Project layout

| Path | Contents |
|---|---|
| `src/services/storage.ts` | Supabase data layer used by every screen |
| `src/services/session.ts` | Sign-in state and role routing |
| `src/services/push.ts`, `public/sw.js` | Web push notifications |
| `supabase/migrations/` | Database schema, rules and functions (run in order) |
| `supabase/functions/` | Edge Functions: `send-push`, `invite-member` |
| `scripts/upload-coach-photo.mjs` | One-time upload of the main coach photo to Storage |
