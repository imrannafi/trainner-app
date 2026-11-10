// Emails a coach-enrolled client an invitation and links the new login to their client record.
// Needs the service-role key, which must never reach the browser, so it runs here.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false }
  });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // Authorisation is checked in the database with the caller's own token.
  const { data: isTrainer, error: roleError } = await caller.rpc('is_trainer');
  if (roleError || !isTrainer) return json({ error: 'Only coaches can send invitations.' }, 403);

  const { memberId } = await req.json().catch(() => ({}));
  if (!memberId) return json({ error: 'memberId is required.' }, 400);

  const { data: member, error: memberError } = await admin
    .from('members')
    .select('id, email, full_name, user_id')
    .eq('id', memberId)
    .single();
  if (memberError || !member) return json({ error: 'Client not found.' }, 404);
  if (member.user_id) return json({ error: 'This client already has an account.' }, 409);

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(member.email, {
    data: { full_name: member.full_name },
    redirectTo: Deno.env.get('SITE_URL') || undefined
  });
  if (inviteError || !invited.user) {
    const already = /already|registered|exists/i.test(inviteError?.message ?? '');
    return json(
      {
        error: already
          ? 'An account with this email already exists. Ask the client to sign in with Google using this email to link it.'
          : inviteError?.message ?? 'Invitation failed.'
      },
      already ? 409 : 500
    );
  }

  const { error: linkError } = await admin
    .from('members')
    .update({ user_id: invited.user.id, activation_status: 'Invited' })
    .eq('id', member.id)
    .is('user_id', null);
  if (linkError) return json({ error: linkError.message }, 500);

  return json({ invited: member.email });
});
