# Azim Trainer · Azims Workout Manager

Coaching platform for Coach Oliul Azim's gym: a coach portal (clients, workout and diet plans, meal photo review, payments, schedule, notices, reports) and a client portal (workouts, diet, meal and progress logging, payments, notices). Data, sign-in, photos and notifications run on Supabase. The app is installable on phones (PWA) and sends push notifications.

## Run locally

**Prerequisites:** Node.js 20+ and a Supabase project set up as described in [supabase/ARCHITECTURE.md](supabase/ARCHITECTURE.md).

1. Install dependencies: `npm install --legacy-peer-deps`
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL, publishable key and VAPID public key.
3. Start the app: `npm run dev`, then open http://localhost:3000

If the project folder name contains `&`, `npm run dev` fails on Windows; rename the folder, or run `node node_modules/vite/bin/vite.js --port=3000`.

## Environment variables

Set these in `.env.local` and in your host (Vercel: **Settings > Environment Variables**). They are built into the app, so **redeploy after changing them**. All are public values.

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (or anon) key |
| `VITE_VAPID_PUBLIC_KEY` | Public half of your VAPID key pair (push notifications) |

The `NEXT_PUBLIC_` versions of these names are also accepted. Never put the service-role key or the VAPID **private** key here.

## Push notifications

The app uses standard Web Push with VAPID keys, so no Firebase project is needed. Android browsers deliver it through Google's push service (the same one behind Firebase Cloud Messaging), and Safari through Apple's.

How a notification reaches a phone:

1. Something happens in the app (a meal is reviewed, a payment is approved, a notice is published…). The database writes a row in `notifications`, so it appears in the app's bell straight away.
2. The `notifications_dispatch_push` trigger calls the `send-push` Edge Function.
3. `send-push` sends it to every device that person turned notifications on for. The service worker (`public/sw.js`) shows it, even when the app is closed.

### One-time setup

1. **VAPID keys:** generate a pair once with `npx web-push generate-vapid-keys`. The public key goes in `VITE_VAPID_PUBLIC_KEY` (app) and `VAPID_PUBLIC_KEY` (function secret). The private key goes **only** in the function secret `VAPID_PRIVATE_KEY`.
2. **Deploy the function:** `npx supabase login`, then
   `npx supabase functions deploy send-push --no-verify-jwt --project-ref YOUR-PROJECT-REF`
3. **Function secrets** (Supabase > Edge Functions > Secrets, or `npx supabase secrets set ...`):
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (e.g. `mailto:you@example.com`), `PUSH_WEBHOOK_SECRET` (a long random string) and `SITE_URL` (your live address, e.g. `https://your-app.vercel.app`).
4. **Point the database at the function** (SQL Editor):
   ```sql
   select vault.create_secret('https://YOUR-PROJECT.supabase.co/functions/v1/send-push', 'push_function_url');
   select vault.create_secret('THE-SAME-PUSH_WEBHOOK_SECRET', 'push_webhook_secret');
   ```
5. **Run the latest migration** `supabase/migrations/20261118100000_push_status_and_test.sql` in the SQL Editor. It adds the server status check and the test button.
6. Set `VITE_VAPID_PUBLIC_KEY` on your host and redeploy.

### Turning it on (each person, each device)

- **Android (Chrome, Edge, Samsung Internet):** open the app, tap **Turn on** on the "Get notified on your phone" card, or go to **Settings > Push notifications > Turn on**, and allow the prompt.
- **iPhone / iPad (iOS 16.4 or later):** in Safari tap **Share > Add to Home Screen**, open **Azim Trainer** from the Home Screen, then turn notifications on in **Settings**. Apple only allows push for apps added to the Home Screen.
- **Desktop (Chrome, Edge, Firefox, Safari):** **Settings > Push notifications > Turn on**.

Then tap **Send test notification** in Settings. Settings also shows whether server delivery is ready.

**Troubleshooting:** "Blocked" means notifications were denied for the site. Allow them in the browser's site settings (Android: long-press the app icon > App info > Notifications), then reopen Settings. If the test only appears in the app's bell, server delivery is not set up yet (steps 2–5).

## Installing the app on a phone

- **Android (Chrome):** menu **⋮ > Install app** (or **Add to Home screen**).
- **iPhone (Safari):** **Share > Add to Home Screen**.

The app opens full-screen with the Azim Trainer icon. All icons come from `assets/brand/azim-trainer-logo.jpg`. If the logo changes, replace that file and run:

```
npm install --no-save sharp
node scripts/generate-icons.mjs
```

This regenerates the favicon, PWA and Android icons (including maskable versions that keep the text clear of Android's crop), the iOS Apple Touch Icon and the notification badge in `public/icons/`. The app name and colours are in `public/manifest.webmanifest`.

## Project layout

| Path | Contents |
|---|---|
| `src/services/storage.ts` | Supabase data layer used by every screen |
| `src/services/session.ts` | Sign-in state and role routing |
| `src/services/push.ts`, `public/sw.js` | Web push notifications (subscribe, status, test; background delivery) |
| `public/manifest.webmanifest`, `public/icons/` | Installable app (PWA) name, colours and icons |
| `assets/brand/` | Original logo; source for every icon |
| `supabase/migrations/` | Database schema, rules and functions (run in order) |
| `supabase/functions/` | Edge Functions: `send-push`, `invite-member` |
| `scripts/generate-icons.mjs` | Builds every icon from the logo |
| `scripts/upload-coach-photo.mjs` | One-time upload of the main coach photo to Storage |
