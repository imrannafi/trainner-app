// One-time setup: uploads the main coach's photo to Supabase Storage and sets it on the
// main coach profile, so every client sees it. Run after the super admin has signed in once.
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-coach-photo.mjs [photo.jpg]
//
// The service-role key bypasses all security rules: run this on your own computer only and
// never put the key in the app or in Git.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const here = path.dirname(fileURLToPath(import.meta.url));
const photo = process.argv[2] ?? path.join(here, '..', 'supabase', 'seed', 'coach-oliul-azim.jpg');

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

const coachRes = await fetch(`${url}/rest/v1/trainer_profiles?is_main_coach=eq.true&select=id,full_name`, { headers });
const coaches = await coachRes.json();
if (!coachRes.ok) {
  console.error('Could not read coach profiles:', coaches);
  process.exit(1);
}
if (!coaches.length) {
  console.error('No main coach profile yet. Sign in once with oliulazim65@gmail.com using "Continue with Google", then run this again.');
  process.exit(1);
}

const objectPath = `coach/${coaches[0].id}/profile-${Date.now()}.jpg`;
const upload = await fetch(`${url}/storage/v1/object/avatars/${objectPath}`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'image/jpeg', 'Cache-Control': '31536000', 'x-upsert': 'true' },
  body: await readFile(photo)
});
if (!upload.ok) {
  console.error('Upload failed:', await upload.text());
  process.exit(1);
}

const publicUrl = `${url}/storage/v1/object/public/avatars/${objectPath}`;
const update = await fetch(`${url}/rest/v1/trainer_profiles?id=eq.${coaches[0].id}`, {
  method: 'PATCH',
  headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
  body: JSON.stringify({ avatar_url: publicUrl })
});
if (!update.ok) {
  console.error('Saving the photo URL failed:', await update.text());
  process.exit(1);
}

console.log(`Coach photo set for ${coaches[0].full_name}:\n${publicUrl}`);
