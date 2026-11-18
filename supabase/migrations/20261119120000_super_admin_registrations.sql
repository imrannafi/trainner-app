-- Registration requests belong to the Super Admin only, and are saved the moment the applicant submits.
-- Additive: no data is deleted, RLS stays on, existing requests keep working.

-- ---------------------------------------------------------------------------
-- 1. Remove the email (Resend) integration if an earlier draft was ever applied
-- ---------------------------------------------------------------------------
drop trigger if exists registration_requests_email on public.registration_requests;
drop function if exists public.dispatch_registration_email();

-- ---------------------------------------------------------------------------
-- 2. The trainer the applicant chose
-- ---------------------------------------------------------------------------
alter table public.registration_requests
  add column if not exists trainer_id uuid references public.trainer_profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. Access: Super Admin reads and reviews everything; applicants see only their own.
--    Coaches lose access. There is no delete policy, so requests are never removed through the API.
-- ---------------------------------------------------------------------------
drop policy if exists trainer_all on public.registration_requests;
drop policy if exists super_admin_read on public.registration_requests;
drop policy if exists super_admin_review on public.registration_requests;

create policy super_admin_read on public.registration_requests
  for select to authenticated using ((select public.is_super_admin()));

create policy super_admin_review on public.registration_requests
  for update to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- ---------------------------------------------------------------------------
-- 4. In-app notification goes to Super Admins only
-- ---------------------------------------------------------------------------
create or replace function public.on_registration_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, title, description, category, link_tab, actor_name, actor_avatar_url, entity_type, entity_id)
  select id, 'New Member Registration Request',
    format('%s registered for %s (%s). Review and approve or reject it.',
      new.full_name, new.membership_duration,
      case when new.amount_paid > 0
        then format('paid ৳%s via %s', new.amount_paid, new.payment_method)
        else 'not paid yet' end),
    'system', 'registrations', new.full_name, new.avatar_url, 'registration_request', new.id
  from public.profiles where role = 'super_admin';

  perform public.log_audit('REGISTER_REQUEST',
    format('New client %s (%s) submitted a registration request.', new.full_name, new.phone));
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Trainers an applicant can choose (public: shown on the sign-up form)
-- ---------------------------------------------------------------------------
create or replace function public.list_registration_trainers()
returns table (id uuid, full_name text, title text, avatar_url text, is_main_coach boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.full_name, t.title, t.avatar_url, t.is_main_coach
  from public.trainer_profiles t
  order by t.is_main_coach desc, t.full_name
$$;

-- ---------------------------------------------------------------------------
-- 6. Saving a request straight after sign-up, before the email is confirmed
--    Without a session the applicant proves ownership with the brand-new, unconfirmed account id
--    (only returned to the browser that created it) and the matching email, within 30 minutes.
-- ---------------------------------------------------------------------------
create or replace function public.is_fresh_applicant(p_user_id text, p_email text default null)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  begin
    v_id := p_user_id::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from auth.users u
    where u.id = v_id
      and u.email_confirmed_at is null
      and greatest(u.created_at, coalesce(u.confirmation_sent_at, u.created_at)) > now() - interval '30 minutes'
      and (p_email is null or lower(u.email) = lower(trim(p_email)))
  );
end;
$$;

create or replace function public.submit_registration_request(p_user_id uuid, p_request jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_email text := trim(coalesce(p_request->>'email', ''));
  v_amount numeric := coalesce(nullif(p_request->>'amount_paid', '')::numeric, 0);
  v_method public.payment_method := nullif(p_request->>'payment_method', '')::public.payment_method;
  v_trainer uuid := nullif(p_request->>'trainer_id', '')::uuid;
begin
  if p_user_id is null then
    raise exception 'Missing account';
  end if;

  if v_uid is not null then
    if v_uid <> p_user_id then
      raise exception 'You can only register for your own account' using errcode = '42501';
    end if;
  elsif not public.is_fresh_applicant(p_user_id::text, v_email) then
    raise exception 'Please sign in to submit your registration' using errcode = '42501';
  end if;

  if exists (select 1 from public.registration_requests where user_id = p_user_id and status = 'Pending') then
    raise exception 'You already have a registration waiting for approval';
  end if;
  if v_trainer is not null and not exists (select 1 from public.trainer_profiles where id = v_trainer) then
    v_trainer := null;
  end if;

  insert into public.registration_requests (
    user_id, full_name, email, phone, avatar_url, age, gender, height_cm, current_weight_kg,
    target_weight_kg, fitness_goal, fitness_level, medical_conditions, injuries_or_restrictions,
    body_condition_notes, front_photo_url, membership_duration, amount_paid, payment_method, trainer_id
  ) values (
    p_user_id,
    trim(p_request->>'full_name'),
    v_email,
    trim(p_request->>'phone'),
    p_request->>'avatar_url',
    nullif(p_request->>'age', '')::int,
    coalesce(nullif(p_request->>'gender', ''), 'Male'),
    nullif(nullif(p_request->>'height_cm', '')::numeric, 0),
    nullif(nullif(p_request->>'current_weight_kg', '')::numeric, 0),
    nullif(nullif(p_request->>'target_weight_kg', '')::numeric, 0),
    coalesce(p_request->>'fitness_goal', ''),
    coalesce(nullif(p_request->>'fitness_level', ''), 'Beginner')::public.fitness_level,
    nullif(trim(p_request->>'medical_conditions'), ''),
    nullif(trim(p_request->>'injuries_or_restrictions'), ''),
    trim(p_request->>'body_condition_notes'),
    p_request->>'avatar_url',
    coalesce(nullif(p_request->>'membership_duration', ''), '1 month')::public.membership_duration,
    v_amount,
    v_method,
    v_trainer
  ) returning id into v_id;

  return v_id;
end;
$$;

-- Photo upload before confirmation: avatars/pending/<new account id>/<file>
drop policy if exists avatars_pending_upload on storage.objects;
create policy avatars_pending_upload on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'pending'
    and public.is_fresh_applicant((storage.foldername(name))[2])
  );

-- ---------------------------------------------------------------------------
-- 7. Only the Super Admin approves or rejects
-- ---------------------------------------------------------------------------
create or replace function public.approve_registration_request(
  p_request_id uuid,
  p_package_price numeric default 3500,
  p_total_sessions int default 12,
  p_workout_plan_id uuid default null,
  p_diet_plan_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.registration_requests;
  v_member_id uuid;
  v_months int;
  v_coach text;
  v_trainer_name text;
begin
  if not public.is_super_admin() then
    raise exception 'Only the Super Admin can approve registrations' using errcode = '42501';
  end if;

  select * into v_req from public.registration_requests where id = p_request_id for update;
  if not found or v_req.status <> 'Pending' then
    raise exception 'Registration request is not pending';
  end if;

  v_months := case v_req.membership_duration
    when '3 months' then 3
    when '6 months' then 6
    when '12 months' then 12
    else 1
  end;
  select full_name into v_trainer_name from public.trainer_profiles where id = v_req.trainer_id;

  insert into public.members (
    user_id, full_name, email, phone, avatar_url, age, gender, height_cm,
    current_weight_kg, target_weight_kg, emergency_contact_name,
    emergency_contact_phone, emergency_contact_relation, fitness_goal,
    fitness_level, training_preferences, medical_conditions, injuries_or_restrictions,
    assigned_workout_plan_id, assigned_diet_plan_id, membership_end_date,
    membership_duration, training_frequency_per_week, total_package_sessions,
    remaining_sessions, package_price, next_payment_deadline, activation_status
  ) values (
    v_req.user_id, v_req.full_name, v_req.email, v_req.phone, v_req.avatar_url, v_req.age, v_req.gender, v_req.height_cm,
    v_req.current_weight_kg, v_req.target_weight_kg, 'Family Contact',
    v_req.phone, 'Primary', v_req.fitness_goal,
    v_req.fitness_level, 'Standard Progressive Overload', v_req.medical_conditions, v_req.injuries_or_restrictions,
    p_workout_plan_id, p_diet_plan_id, (public.today_dhaka() + make_interval(months => v_months))::date,
    v_req.membership_duration, 4, p_total_sessions,
    p_total_sessions, p_package_price, public.next_payment_window_deadline(v_req.amount_paid > 0), 'Active'
  ) returning id into v_member_id;

  insert into public.member_private_notes (member_id, notes)
  values (v_member_id, format('Approved registration.%s Initial Body Condition: %s',
    coalesce(format(' Chosen trainer: %s.', v_trainer_name), ''), v_req.body_condition_notes));

  if v_req.amount_paid > 0 then
    select full_name into v_coach from public.trainer_profiles where user_id = (select auth.uid());
    insert into public.payments (
      member_id, member_name, amount, method, transaction_ref, billing_period, recorded_by, notes, status
    ) values (
      v_member_id, v_req.full_name, v_req.amount_paid, v_req.payment_method,
      'REGISTRATION', format('Registration · %s', v_req.membership_duration), coalesce(v_coach, 'Super Admin'),
      format('Paid at registration via %s (৳%s)', v_req.payment_method, v_req.amount_paid),
      'Completed'
    );
  end if;

  update public.registration_requests
  set status = 'Approved', created_member_id = v_member_id, reviewed_at = now()
  where id = p_request_id;

  perform public.notify_user(v_req.user_id, 'Registration approved!',
    'Welcome aboard! Your coach approved your registration. Your member portal is now ready.',
    'system', 'member-dashboard');
  perform public.log_audit('APPROVE_MEMBER_REGISTRATION',
    format('APPROVED registration application for %s (%s, paid ৳%s%s).',
      v_req.full_name, v_req.membership_duration, v_req.amount_paid,
      coalesce(' via ' || v_req.payment_method::text, '')));

  return v_member_id;
end;
$$;

create or replace function public.reject_registration_request(p_request_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.registration_requests;
  v_reason text := coalesce(nullif(trim(p_reason), ''), 'Requirements or capacity criteria not met.');
begin
  if not public.is_super_admin() then
    raise exception 'Only the Super Admin can reject registrations' using errcode = '42501';
  end if;

  select * into v_req from public.registration_requests where id = p_request_id for update;
  if not found or v_req.status <> 'Pending' then
    raise exception 'Registration request is not pending';
  end if;

  update public.registration_requests
  set status = 'Rejected', rejection_reason = v_reason, reviewed_at = now()
  where id = p_request_id;

  perform public.notify_user(v_req.user_id, 'Registration not approved',
    format('Your registration was declined: %s You can update your details and apply again.', v_reason),
    'system', null);
  perform public.log_audit('REJECT_MEMBER_REGISTRATION',
    format('REJECTED registration application for %s: %s', v_req.full_name, v_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Function access
-- ---------------------------------------------------------------------------
revoke execute on function public.list_registration_trainers() from public;
revoke execute on function public.is_fresh_applicant(text, text) from public;
revoke execute on function public.submit_registration_request(uuid, jsonb) from public;
grant execute on function public.list_registration_trainers() to anon, authenticated;
grant execute on function public.is_fresh_applicant(text, text) to anon, authenticated;
grant execute on function public.submit_registration_request(uuid, jsonb) to anon, authenticated;

-- Realtime already streams registration_requests; RLS above means only Super Admins receive the rows.
