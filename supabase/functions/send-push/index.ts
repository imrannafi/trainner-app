// Delivers a notification row to every device its recipient enabled push on.
// Called by the notifications_dispatch_push trigger (pg_net), authenticated with a shared secret.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const PUSH_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET') ?? '';
const SITE_URL = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '');

// Configured lazily: web-push throws on missing/invalid keys, and doing that at load time
// crashed every request with an opaque WORKER_ERROR. Now a request gets a clear 503 instead.
let vapidError: string | null = null;
try {
  const missing = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'PUSH_WEBHOOK_SECRET'].filter((k) => !Deno.env.get(k));
  if (missing.length) throw new Error(`Missing function secrets: ${missing.join(', ')}`);
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );
} catch (e) {
  vapidError = (e as Error).message;
  console.error('send-push is not configured:', vapidError);
}

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});

const safeEqual = (a: string, b: string) => {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!safeEqual(req.headers.get('x-push-secret') ?? '', PUSH_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (vapidError) return Response.json({ error: vapidError }, { status: 503 });

  const { record } = await req.json();
  if (!record?.user_id) return Response.json({ sent: 0 });

  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', record.user_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const payload = JSON.stringify({
    title: record.title,
    body: record.description,
    tag: record.id,
    notificationId: record.id,
    icon: record.actor_avatar_url || undefined,
    url: SITE_URL ? `${SITE_URL}/?notification=${record.id}` : `/?notification=${record.id}`
  });

  let sent = 0;
  const expired: string[] = [];
  await Promise.all(
    (subscriptions ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24
        });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410: the browser dropped this subscription; stop sending to it.
        if (status === 404 || status === 410) expired.push(s.id);
        else console.error('Push failed', status, (e as Error).message);
      }
    })
  );

  if (expired.length) await admin.from('push_subscriptions').delete().in('id', expired);
  return Response.json({ sent, removed: expired.length });
});
