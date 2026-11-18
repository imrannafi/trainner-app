// Emails the coach(es) when a new member registration request is submitted.
// Called by the registration_requests_email trigger (pg_net), authenticated with a shared secret.
// Sends through Resend (https://resend.com); the API key stays in function secrets.
import { createClient } from 'npm:@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('EMAIL_WEBHOOK_SECRET') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
// Resend's shared sender works without a domain, but only delivers to the Resend account's own email.
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'Azim Trainer <onboarding@resend.dev>';
const SITE_URL = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '');
// Optional comma-separated override; otherwise every coach and super admin account is emailed.
const EMAIL_TO = (Deno.env.get('REGISTRATION_EMAIL_TO') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});

const safeEqual = (a: string, b: string) => {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const staffEmails = async (): Promise<string[]> => {
  if (EMAIL_TO.length) return EMAIL_TO;
  const { data: staff, error } = await admin.from('profiles').select('id').in('role', ['trainer', 'super_admin']);
  if (error) throw new Error(`Could not load coach accounts: ${error.message}`);
  const emails = await Promise.all(
    (staff ?? []).map(async ({ id }) => (await admin.auth.admin.getUserById(id)).data.user?.email ?? null)
  );
  return [...new Set(emails.filter((e): e is string => !!e))];
};

const row = (label: string, value: unknown) =>
  value === null || value === undefined || value === ''
    ? ''
    : `<tr><td style="padding:6px 12px 6px 0;color:#737373;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:6px 0;color:#171717;font-weight:600">${esc(value)}</td></tr>`;

const buildEmail = (r: Record<string, any>) => {
  const paid = Number(r.amount_paid ?? 0);
  const payment = paid > 0 ? `৳${paid.toLocaleString('en-US')} via ${r.payment_method ?? 'unknown'}` : 'Not paid yet';
  const reviewUrl = SITE_URL || '';
  const html = `<!doctype html><html><body style="margin:0;background:#F5F5F5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;border-radius:20px;padding:24px;border:1px solid #eee">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7155E8">New registration request</p>
      <h1 style="margin:0 0 16px;font-size:20px;color:#171717">${esc(r.full_name)} wants to join</h1>
      ${r.avatar_url ? `<img src="${esc(r.avatar_url)}" alt="" width="96" height="96" style="border-radius:16px;object-fit:cover;margin-bottom:16px">` : ''}
      <table style="border-collapse:collapse;font-size:14px;width:100%">
        ${row('Phone', r.phone)}
        ${row('Email', r.email)}
        ${row('Membership', r.membership_duration)}
        ${row('Payment', payment)}
        ${row('Age / gender', [r.age, r.gender].filter(Boolean).join(' · '))}
        ${row('Height', r.height_cm ? `${r.height_cm} cm` : '')}
        ${row('Weight → target', r.current_weight_kg ? `${r.current_weight_kg} kg → ${r.target_weight_kg ?? '–'} kg` : '')}
        ${row('Goal', r.fitness_goal)}
        ${row('Experience', r.fitness_level)}
        ${row('Medical', r.medical_conditions)}
        ${row('Injuries', r.injuries_or_restrictions)}
      </table>
      ${r.body_condition_notes ? `<p style="margin:16px 0 0;padding:12px;background:#F5F5F5;border-radius:12px;font-size:13px;color:#404040;line-height:1.5">${esc(r.body_condition_notes)}</p>` : ''}
      ${reviewUrl ? `<a href="${esc(reviewUrl)}" style="display:inline-block;margin-top:20px;padding:12px 20px;background:#7155E8;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px">Review in Azim Trainer</a>` : ''}
      <p style="margin:16px 0 0;font-size:12px;color:#a3a3a3">Approve or decline it under Requests in the coach portal.</p>
    </div>
  </div></body></html>`;
  const text = [
    `New registration request: ${r.full_name}`,
    `Phone: ${r.phone}`,
    `Email: ${r.email}`,
    `Membership: ${r.membership_duration}`,
    `Payment: ${payment}`,
    `Goal: ${r.fitness_goal ?? ''}`,
    `Body condition: ${r.body_condition_notes ?? ''}`,
    reviewUrl ? `Review: ${reviewUrl}` : 'Review it under Requests in the coach portal.'
  ].join('\n');
  return { html, text, subject: `New registration: ${r.full_name} (${r.membership_duration}, ${payment})` };
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!safeEqual(req.headers.get('x-webhook-secret') ?? '', WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!RESEND_API_KEY) return Response.json({ error: 'Missing function secret: RESEND_API_KEY' }, { status: 503 });

  const { record } = await req.json().catch(() => ({}));
  if (!record?.id) return Response.json({ error: 'record is required' }, { status: 400 });

  let to: string[];
  try {
    to = await staffEmails();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
  if (!to.length) return Response.json({ error: 'No coach email address found' }, { status: 500 });

  const { html, text, subject } = buildEmail(record);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
      reply_to: record.email || undefined
    })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Resend rejected the email', res.status, body);
    return Response.json({ error: body?.message ?? `Resend returned ${res.status}` }, { status: 502 });
  }
  return Response.json({ sent: to.length, id: body?.id });
});
