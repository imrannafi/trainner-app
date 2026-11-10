import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AccountRole } from '../types';

export interface RegistrationStatus {
  status: 'Pending' | 'Rejected';
  fullName: string;
  rejectionReason?: string;
}

export type AppAccess =
  | { kind: 'signed-out' }
  | { kind: 'staff'; user: User; role: AccountRole }
  | { kind: 'member'; user: User; memberId: string }
  // Signed in but not yet an approved client: show the registration form or its status.
  | { kind: 'applicant'; user: User; registration: RegistrationStatus | null };

export const resolveAccess = async (session: Session | null): Promise<AppAccess> => {
  if (!session?.user) return { kind: 'signed-out' };
  const user = session.user;

  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (error) throw new Error(`Could not load your account: ${error.message}`);
  // The profile row is created by a database trigger; a missing row means the migrations were not run.
  if (!profile) throw new Error('Your account profile was not found. Make sure the Supabase migrations have been applied.');

  const role = profile.role as AccountRole;
  if (role === 'trainer' || role === 'super_admin') return { kind: 'staff', user, role };

  // Links a Google sign-in to a client record the coach created with the same email.
  const { data: memberId, error: claimError } = await supabase.rpc('claim_member_profile');
  if (claimError) throw new Error(`Could not load your client profile: ${claimError.message}`);
  if (memberId) return { kind: 'member', user, memberId };

  const { data: requests } = await supabase
    .from('registration_requests')
    .select('status, full_name, rejection_reason')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(1);
  const latest = requests?.[0];
  return {
    kind: 'applicant',
    user,
    registration:
      latest && latest.status !== 'Approved'
        ? { status: latest.status, fullName: latest.full_name, rejectionReason: latest.rejection_reason ?? undefined }
        : null
  };
};

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } }
  });

export const signOut = () => supabase.auth.signOut();
