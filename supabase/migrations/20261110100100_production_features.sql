-- Azims Workout Manager: super admin, Google sign-in linking, coach/client notifications,
-- client updates, web push and live updates for every table.

-- ---------------------------------------------------------------------------
-- Profiles: display details for staff management
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column email text,
  add column full_name text,
  add column username text unique,
  add column avatar_url text;

update public.profiles p
set email = u.email,
    full_name = coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
    avatar_url = coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where u.id = p.id;

-- ---------------------------------------------------------------------------
-- Trainer profiles: main coach and payment details
-- ---------------------------------------------------------------------------
alter table public.trainer_profiles
  add column is_main_coach boolean not null default false,
  add column bkash_number text not null default '';

create unique index trainer_profiles_one_main on public.trainer_profiles (is_main_coach) where is_main_coach;

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------

-- Super admins have every coach permission, so every existing policy covers them unchanged.
create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('trainer', 'super_admin')
  )
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'super_admin'
  )
$$;

create or replace function public.notify_trainers(
  p_title text,
  p_description text,
  p_category public.notification_category,
  p_link_tab text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, description, category, link_tab)
  select id, p_title, p_description, p_category, p_link_tab
  from public.profiles
  where role in ('trainer', 'super_admin')
$$;

-- ---------------------------------------------------------------------------
-- Role grants: accounts that receive a role automatically
-- ---------------------------------------------------------------------------

-- A grant applies only once Google has verified the address. Password sign-ups can be
-- auto-confirmed without proof of ownership, so they never receive a role this way.
create table public.role_grants (
  email text primary key check (email = lower(email)),
  role public.user_role not null,
  username text,
  full_name text,
  gym_name text,
  title text,
  is_main_coach boolean not null default false
);
alter table public.role_grants enable row level security;
revoke all on public.role_grants from anon, authenticated;

insert into public.role_grants (email, role, username, full_name, gym_name, title, is_main_coach)
values (
  'oliulazim65@gmail.com', 'super_admin', 'oliulazim65', 'Coach Oliul Azim',
  'Azim''s Workout Arena & Performance Club', 'CSCS & Head Performance Coach', true
);

create function public.user_has_google_identity(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select u.raw_app_meta_data->>'provider' = 'google'
      or coalesce(u.raw_app_meta_data->'providers', '[]'::jsonb) ? 'google'
    from auth.users u where u.id = p_user_id
  ), false)
$$;

create function public.ensure_trainer_profile(
  p_user_id uuid,
  p_full_name text default null,
  p_gym_name text default null,
  p_title text default null,
  p_is_main boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if exists (select 1 from public.trainer_profiles where user_id = p_user_id) then
    return;
  end if;

  insert into public.trainer_profiles (user_id, full_name, gym_name, title, email, avatar_url, is_main_coach)
  values (
    p_user_id,
    coalesce(p_full_name, v_profile.full_name, split_part(v_profile.email, '@', 1)),
    coalesce(p_gym_name, (select gym_name from public.trainer_profiles where is_main_coach), ''),
    coalesce(p_title, 'Coach'),
    coalesce(v_profile.email, ''),
    v_profile.avatar_url,
    p_is_main and not exists (select 1 from public.trainer_profiles where is_main_coach)
  );
end;
$$;

create function public.apply_role_grant(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grant public.role_grants;
begin
  if not public.user_has_google_identity(p_user_id) then
    return;
  end if;

  select g.* into v_grant
  from public.role_grants g
  join auth.users u on lower(u.email) = g.email
  where u.id = p_user_id;
  if not found then
    return;
  end if;

  update public.profiles
  set role = v_grant.role,
      username = coalesce(v_grant.username, username),
      full_name = coalesce(v_grant.full_name, full_name)
  where id = p_user_id;

  if v_grant.role in ('trainer', 'super_admin') then
    perform public.ensure_trainer_profile(p_user_id, v_grant.full_name, v_grant.gym_name, v_grant.title, v_grant.is_main_coach);
  end if;
end;
$$;

-- For an account created with email and password: run once in the SQL Editor.
create function public.grant_role_by_email(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_grant public.role_grants;
begin
  select * into v_grant from public.role_grants where email = lower(p_email);
  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_grant.email is null or v_user_id is null then
    raise exception 'No role grant or no account for %', p_email;
  end if;

  update public.profiles
  set role = v_grant.role, username = coalesce(v_grant.username, username), full_name = coalesce(v_grant.full_name, full_name)
  where id = v_user_id;

  if v_grant.role in ('trainer', 'super_admin') then
    perform public.ensure_trainer_profile(v_user_id, v_grant.full_name, v_grant.gym_name, v_grant.title, v_grant.is_main_coach);
  end if;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  perform public.apply_role_grant(new.id);
  return new;
end;
$$;

-- Supabase adds 'google' to providers when an existing account later signs in with Google.
create function public.handle_auth_user_identity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.apply_role_grant(new.id);
  return new;
end;
$$;

create trigger on_auth_user_identity_change
  after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_auth_user_identity_change();

-- Catch up accounts that signed in before this migration ran: give them a profile if they
-- have none, and apply any role grant, so the order of signing in and migrating never matters.
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

do $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select u.id from auth.users u join public.role_grants g on lower(u.email) = g.email
  loop
    perform public.apply_role_grant(v_user_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff management (super admin only)
-- ---------------------------------------------------------------------------
create function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.user_role;
  v_name text;
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can change roles' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'You cannot change your own role';
  end if;

  select role, coalesce(full_name, email) into v_old, v_name from public.profiles where id = p_user_id;
  if v_old is null then
    raise exception 'User not found';
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  if p_role in ('trainer', 'super_admin') then
    perform public.ensure_trainer_profile(p_user_id);
  end if;

  perform public.log_audit('CHANGE_ROLE', format('Changed %s from %s to %s', v_name, v_old, p_role));
end;
$$;

-- Trainer profiles: everyone reads; a coach edits their own; the super admin manages all.
drop policy trainer_all on public.trainer_profiles;

create policy edit_own on public.trainer_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy super_admin_all on public.trainer_profiles
  for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- A coach may change their own details, but not which coach is the main one.
create function public.guard_main_coach_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_main_coach is distinct from old.is_main_coach and not public.is_super_admin()
     and (select auth.uid()) is not null then
    raise exception 'Only the super admin can change the main coach' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trainer_profiles_guard_main
  before update on public.trainer_profiles
  for each row execute function public.guard_main_coach_flag();

-- ---------------------------------------------------------------------------
-- Linking a Google sign-in to the client record the coach created
-- ---------------------------------------------------------------------------
create function public.claim_member_profile()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_member_id uuid;
begin
  if v_uid is null then
    return null;
  end if;

  select id into v_member_id from public.members where user_id = v_uid;
  if v_member_id is not null then
    return v_member_id;
  end if;

  if not public.user_has_google_identity(v_uid) then
    return null;
  end if;

  update public.members m
  set user_id = v_uid, activation_status = 'Active'
  from auth.users u
  where u.id = v_uid and lower(m.email) = lower(u.email) and m.user_id is null
  returning m.id into v_member_id;

  if v_member_id is not null then
    perform public.log_audit('LINK_MEMBER_ACCOUNT', 'Client signed in with Google and was linked to their profile');
  end if;
  return v_member_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications: who did it, what it is, and the photo
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column actor_member_id uuid references public.members (id) on delete set null,
  add column actor_name text,
  add column actor_avatar_url text,
  add column entity_type text,
  add column entity_id uuid,
  add column image_bucket text,
  add column image_path text;

create function public.notify_trainers_about_member(
  p_member_id uuid,
  p_title text,
  p_description text,
  p_category public.notification_category,
  p_link_tab text,
  p_entity_type text,
  p_entity_id uuid,
  p_image_bucket text default null,
  p_image_path text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (
    user_id, title, description, category, link_tab, actor_member_id, actor_name,
    actor_avatar_url, entity_type, entity_id, image_bucket, image_path
  )
  select p.id, p_title, p_description, p_category, p_link_tab, m.id, m.full_name,
         m.avatar_url, p_entity_type, p_entity_id, p_image_bucket, p_image_path
  from public.profiles p
  cross join public.members m
  where p.role in ('trainer', 'super_admin') and m.id = p_member_id
$$;

create or replace function public.on_meal_log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member record;
begin
  select user_id, full_name into v_member from public.members where id = new.member_id;

  if tg_op = 'INSERT' then
    perform public.notify_trainers_about_member(new.member_id,
      case when new.photo_path is not null then 'New meal photo' else 'New meal log' end,
      format('%s logged %s (%s).', v_member.full_name, new.scheduled_meal_name, new.adherence),
      'diet', 'meal-hub', 'meal_log', new.id, 'meal-photos', new.photo_path);
    perform public.log_audit('SUBMIT_MEAL_LOG',
      format('%s reported %s (%s)', v_member.full_name, new.scheduled_meal_name, new.adherence));
  elsif new.trainer_review_status is distinct from old.trainer_review_status then
    perform public.notify_user(v_member.user_id, format('Meal Log %s', new.trainer_review_status),
      format('Your coach reviewed your %s log.%s', new.scheduled_meal_name,
        coalesce(format(' Feedback: "%s"', new.trainer_feedback), '')),
      'diet', 'member-meallog');
    perform public.log_audit('REVIEW_MEAL_LOG',
      format('Trainer reviewed %s''s %s log as %s', v_member.full_name, new.scheduled_meal_name, new.trainer_review_status));
  end if;
  return new;
end;
$$;

create or replace function public.on_workout_session_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member record;
begin
  select user_id, full_name into v_member from public.members where id = new.member_id;

  if tg_op = 'INSERT' then
    perform public.notify_trainers_about_member(new.member_id, 'Workout report submitted',
      format('%s completed %s (%s%%, %s min).', v_member.full_name, new.day_name, new.completion_percentage, new.duration_minutes),
      'workout', 'members', 'workout_session', new.id);
    perform public.log_audit('SUBMIT_WORKOUT_LOG',
      format('Member %s submitted workout report (%s)', v_member.full_name, new.day_name));
  elsif new.trainer_review_status is distinct from old.trainer_review_status then
    perform public.notify_user(v_member.user_id, format('Workout %s', new.trainer_review_status),
      format('Your coach marked your session as %s.%s', new.trainer_review_status,
        coalesce(format(' Note: "%s"', new.trainer_feedback), '')),
      'workout', 'member-workout');
    perform public.log_audit('VERIFY_WORKOUT_SESSION',
      format('Trainer set %s''s session to %s', v_member.full_name, new.trainer_review_status));
  end if;
  return new;
end;
$$;

create or replace function public.on_progress_recorded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  update public.members set current_weight_kg = new.weight_kg where id = new.member_id;
  select full_name into v_name from public.members where id = new.member_id;

  -- Entries the coach records do not need to notify the coach.
  if not public.is_trainer() then
    perform public.notify_trainers_about_member(new.member_id,
      case when new.photo_path is not null then 'New progress photo' else 'Progress update' end,
      format('%s logged %s kg.', v_name, new.weight_kg),
      'workout', 'members', 'progress_record', new.id, 'progress-photos', new.photo_path);
  end if;
  perform public.log_audit('ADD_PROGRESS_RECORD',
    format('Recorded weight & measurements update for %s (%s kg)', v_name, new.weight_kg));
  return new;
end;
$$;

create or replace function public.on_payment_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select full_name into v_name from public.members where id = new.member_id;
  perform public.notify_trainers_about_member(new.member_id, format('Payment Request: %s', v_name),
    format('%s submitted ৳%s via %s%s for %s. Please review & accept.',
      v_name, new.amount, new.method,
      coalesce(format(' (TrxID: %s)', new.trx_id), ''), new.billing_month),
    'payment', 'payments', 'payment_request', new.id);
  perform public.log_audit('SUBMIT_PAYMENT_REQUEST',
    format('Member %s submitted %s payment request for ৳%s (TrxID: %s)',
      v_name, new.method, new.amount, coalesce(new.trx_id, 'N/A')));
  return new;
end;
$$;

create or replace function public.on_registration_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, title, description, category, link_tab, actor_name, actor_avatar_url, entity_type, entity_id)
  select id, 'New Member Registration Request',
    format('%s submitted registration with full body condition details & photo. Please review & approve to create profile.', new.full_name),
    'system', 'members', new.full_name, new.avatar_url, 'registration_request', new.id
  from public.profiles where role in ('trainer', 'super_admin');

  perform public.log_audit('REGISTER_REQUEST',
    format('New client %s (%s) submitted registration with body condition description.', new.full_name, new.phone));
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Client updates: anything a client wants the coach to see
-- ---------------------------------------------------------------------------
create table public.member_updates (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  subject text not null check (length(trim(subject)) > 0),
  message text not null default '',
  photo_path text,
  created_at timestamptz not null default now()
);
create index member_updates_member_idx on public.member_updates (member_id, created_at desc);
alter table public.member_updates enable row level security;

revoke all on public.member_updates from anon;
grant select, insert, update, delete on public.member_updates to authenticated;
grant all on public.member_updates to service_role;

create policy trainer_all on public.member_updates
  for all to authenticated
  using ((select public.is_trainer())) with check ((select public.is_trainer()));
create policy read_own on public.member_updates
  for select to authenticated using (member_id = (select public.current_member_id()));
create policy submit_own on public.member_updates
  for insert to authenticated with check (member_id = (select public.current_member_id()));

create function public.on_member_update_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select full_name into v_name from public.members where id = new.member_id;
  perform public.notify_trainers_about_member(new.member_id,
    format('Update from %s: %s', v_name, new.subject),
    left(coalesce(nullif(new.message, ''), 'Photo attached.'), 160),
    'system', 'members', 'member_update', new.id, 'update-photos', new.photo_path);
  return new;
end;
$$;

create trigger member_updates_after_insert
  after insert on public.member_updates
  for each row execute function public.on_member_update_created();

-- ---------------------------------------------------------------------------
-- Web push
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

create policy own_subscriptions on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Calls the send-push Edge Function for each new notification. The URL and secret come from
-- Vault (see supabase/ARCHITECTURE.md). Any failure is swallowed: a push problem must never
-- stop the in-app notification from being saved.
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net is not available; push delivery is disabled';
end;
$$;

create function public.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  begin
    execute $sql$
      select
        (select decrypted_secret from vault.decrypted_secrets where name = 'push_function_url'),
        (select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret')
    $sql$ into v_url, v_secret;

    if v_url is null or v_secret is null then
      return new;
    end if;

    execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using
      v_url,
      jsonb_build_object('record', to_jsonb(new)),
      jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret);
  exception when others then
    raise warning 'push dispatch skipped: %', sqlerrm;
  end;
  return new;
end;
$$;

create trigger notifications_dispatch_push
  after insert on public.notifications
  for each row execute function public.dispatch_push_notification();

-- ---------------------------------------------------------------------------
-- Storage: client update photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('update-photos', 'update-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy photos_read on storage.objects;
drop policy photos_upload on storage.objects;
drop policy photos_replace on storage.objects;
drop policy photos_delete on storage.objects;

create policy photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id in ('avatars', 'meal-photos', 'progress-photos', 'update-photos')
    and (
      bucket_id = 'avatars'
      or (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_trainer())
    )
  );

create policy photos_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars', 'meal-photos', 'progress-photos', 'update-photos')
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_trainer())
    )
  );

create policy photos_replace on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'meal-photos', 'progress-photos', 'update-photos')
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_trainer())
    )
  );

create policy photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'meal-photos', 'progress-photos', 'update-photos')
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_trainer())
    )
  );

-- ---------------------------------------------------------------------------
-- Function access
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.today_dhaka(),
  public.is_trainer(),
  public.is_super_admin(),
  public.current_member_id(),
  public.current_member_is_unlocked(),
  public.notice_targets_me(public.notice_audience, uuid),
  public.approve_payment_request(uuid),
  public.reject_payment_request(uuid, text),
  public.approve_registration_request(uuid, numeric, int, uuid, uuid),
  public.reject_registration_request(uuid, text),
  public.save_workout_plan(jsonb),
  public.save_diet_plan(jsonb),
  public.set_user_role(uuid, public.user_role),
  public.claim_member_profile()
to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: every table the app displays, so changes appear everywhere at once
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.profiles,
  public.trainer_profiles,
  public.members,
  public.member_private_notes,
  public.gym_check_ins,
  public.payments,
  public.workout_plans,
  public.workout_days,
  public.workout_exercises,
  public.diet_plans,
  public.diet_meals,
  public.diet_food_items,
  public.workout_exercise_logs,
  public.meal_log_items,
  public.progress_records,
  public.training_sessions,
  public.notices,
  public.notice_reads,
  public.needs_attention_alerts,
  public.audit_logs,
  public.member_updates;
