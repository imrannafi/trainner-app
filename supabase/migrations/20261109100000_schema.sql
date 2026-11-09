-- Azims Workout Manager: tables, indexes and the computed member view.
-- Enum labels match src/types/index.ts exactly, so the app needs no value translation.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('trainer', 'member');
create type public.membership_duration as enum ('1 month', '3 months', '6 months', '12 months', 'custom');
create type public.membership_status as enum ('Active', 'Expiring Soon', 'Expired', 'Inactive');
create type public.payment_status as enum ('Paid', 'Partially Paid', 'Unpaid', 'Overdue');
create type public.payment_method as enum ('Cash', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Other');
create type public.payment_record_status as enum ('Completed', 'Pending', 'Refunded');
create type public.request_status as enum ('Pending', 'Approved', 'Rejected');
create type public.activation_status as enum ('Active', 'Invited', 'Pending Activation');
create type public.fitness_level as enum ('Beginner', 'Intermediate', 'Advanced', 'Athlete');
create type public.plan_difficulty as enum ('Beginner', 'Intermediate', 'Advanced');
create type public.workout_status as enum ('Completed', 'Missed', 'In Progress');
create type public.workout_review_status as enum ('Pending Review', 'Verified', 'Needs Correction');
create type public.meal_adherence as enum ('Followed Plan', 'Partially Followed', 'Deviated from Plan', 'Skipped Meal', 'Not Reported');
create type public.meal_review_status as enum ('Pending', 'Approved', 'Correction Requested', 'Flagged');
create type public.attendance_status as enum ('Scheduled', 'Present', 'Absent', 'Cancelled', 'Rescheduled');
create type public.notice_category as enum ('General', 'Payment', 'Workout', 'Diet', 'Schedule', 'Urgent');
create type public.notice_audience as enum ('All Members', 'Specific Member', 'Overdue Members', 'Expiring Soon');
create type public.notice_priority as enum ('Normal', 'High', 'Urgent');
create type public.notification_category as enum ('notice', 'payment', 'workout', 'diet', 'system');
create type public.alert_category as enum ('Payment', 'Workout', 'Diet', 'Membership');
create type public.alert_severity as enum ('low', 'medium', 'high');

-- The gym operates on Dhaka dates, so "today" must not follow the server's UTC clock.
create function public.today_dhaka()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Asia/Dhaka')::date $$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

-- One row per auth user. The role decides everything in RLS; only SQL or the
-- service role can change it. Name, photo and phone live on trainer_profiles/members.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);

create table public.trainer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  full_name text not null,
  gym_name text not null,
  title text not null default '',
  phone text not null default '',
  email text not null,
  avatar_url text,
  currency text not null default '৳',
  timezone text not null default 'Asia/Dhaka',
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Plans (created before members, which reference them)
-- ---------------------------------------------------------------------------
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  goal text not null default '',
  difficulty public.plan_difficulty not null default 'Beginner',
  trainer_instructions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  position int not null default 0,
  day_name text not null,
  focus_area text not null default '',
  is_rest_day boolean not null default false
);
create index workout_days_plan_idx on public.workout_days (plan_id, position);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.workout_days (id) on delete cascade,
  position int not null default 0,
  name text not null,
  muscle_group text not null default '',
  sets int not null check (sets >= 0),
  reps text not null default '',
  target_weight_kg numeric(6,2) check (target_weight_kg >= 0),
  rest_seconds int not null default 60 check (rest_seconds >= 0),
  instructions text not null default '',
  media_url text,
  alternative_exercise text
);
create index workout_exercises_day_idx on public.workout_exercises (day_id, position);

create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  daily_calorie_target int not null default 0 check (daily_calorie_target >= 0),
  protein_target_g numeric(7,2) not null default 0 check (protein_target_g >= 0),
  carbs_target_g numeric(7,2) not null default 0 check (carbs_target_g >= 0),
  fat_target_g numeric(7,2) not null default 0 check (fat_target_g >= 0),
  water_intake_liters numeric(4,2) not null default 0 check (water_intake_liters >= 0),
  dietary_preferences text not null default '',
  restrictions text not null default '',
  trainer_instructions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.diet_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.diet_plans (id) on delete cascade,
  position int not null default 0,
  name text not null,
  scheduled_time time,
  preparation_notes text,
  alternative_options text
);
create index diet_meals_plan_idx on public.diet_meals (plan_id, position);

create table public.diet_food_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.diet_meals (id) on delete cascade,
  position int not null default 0,
  name text not null,
  quantity numeric(8,2) not null default 0 check (quantity >= 0),
  unit text not null default 'g',
  calories numeric(8,2) not null default 0 check (calories >= 0),
  protein_g numeric(7,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(7,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(7,2) not null default 0 check (fat_g >= 0)
);
create index diet_food_items_meal_idx on public.diet_food_items (meal_id, position);

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------

-- A member can exist before they have a login (coach-enrolled, invited later),
-- so user_id is nullable until the account is activated.
-- Paid amount, payment status and live membership status are computed in member_overview.
create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null default '',
  avatar_url text,
  age int check (age between 0 and 120),
  gender text not null default 'Male',
  height_cm numeric(5,2) check (height_cm > 0),
  current_weight_kg numeric(6,2) check (current_weight_kg > 0),
  target_weight_kg numeric(6,2) check (target_weight_kg > 0),
  emergency_contact_name text not null default '',
  emergency_contact_phone text not null default '',
  emergency_contact_relation text not null default '',
  fitness_goal text not null default '',
  fitness_level public.fitness_level not null default 'Beginner',
  training_preferences text not null default '',
  medical_conditions text,
  injuries_or_restrictions text,
  -- One plan per member: this is the single source of truth for the app's assignedMemberIds.
  assigned_workout_plan_id uuid references public.workout_plans (id) on delete set null,
  assigned_diet_plan_id uuid references public.diet_plans (id) on delete set null,
  membership_start_date date not null default public.today_dhaka(),
  membership_end_date date not null,
  membership_duration public.membership_duration not null default '1 month',
  training_frequency_per_week int not null default 3 check (training_frequency_per_week between 0 and 14),
  total_package_sessions int not null default 0 check (total_package_sessions >= 0),
  remaining_sessions int not null default 0 check (remaining_sessions >= 0),
  package_price numeric(12,2) not null default 0 check (package_price >= 0),
  next_payment_deadline date not null,
  -- Only 'Active' or 'Inactive' is stored; see member_overview for the live status.
  base_status public.membership_status not null default 'Active'
    check (base_status in ('Active', 'Inactive')),
  activation_status public.activation_status not null default 'Pending Activation',
  joined_at date not null default public.today_dhaka(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (membership_end_date >= membership_start_date)
);
create unique index members_email_unique on public.members (lower(email));
create index members_workout_plan_idx on public.members (assigned_workout_plan_id);
create index members_diet_plan_idx on public.members (assigned_diet_plan_id);
create index members_end_date_idx on public.members (membership_end_date);

-- Separate table because RLS works per row: a column on members would be readable by that member.
create table public.member_private_notes (
  member_id uuid primary key references public.members (id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table public.gym_check_ins (
  member_id uuid not null references public.members (id) on delete cascade,
  check_in_date date not null default public.today_dhaka(),
  created_at timestamptz not null default now(),
  primary key (member_id, check_in_date)
);

-- ---------------------------------------------------------------------------
-- Payments and registration
-- ---------------------------------------------------------------------------
create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method public.payment_method not null check (method in ('bKash', 'Cash')),
  target_bkash_number text,
  sender_bkash_number text,
  trx_id text,
  billing_month text not null,
  notes text,
  status public.request_status not null default 'Pending',
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index payment_requests_member_idx on public.payment_requests (member_id, submitted_at desc);
create index payment_requests_status_idx on public.payment_requests (status);
-- A bKash transaction can only pay once. A rejected one may be resubmitted.
create unique index payment_requests_trx_unique on public.payment_requests (trx_id)
  where trx_id is not null and status <> 'Rejected';

-- Financial history outlives the member, hence set null plus the member_name snapshot.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members (id) on delete set null,
  member_name text not null,
  payment_request_id uuid unique references public.payment_requests (id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default public.today_dhaka(),
  method public.payment_method not null,
  transaction_ref text,
  billing_period text not null,
  recorded_by text not null,
  notes text,
  status public.payment_record_status not null default 'Completed',
  created_at timestamptz not null default now()
);
create index payments_member_idx on public.payments (member_id, payment_date desc);
create index payments_date_idx on public.payments (payment_date desc);

-- The applicant signs up through Supabase Auth first, so no password is stored here.
create table public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  avatar_url text not null,
  age int check (age between 0 and 120),
  gender text not null default 'Male',
  height_cm numeric(5,2) check (height_cm > 0),
  current_weight_kg numeric(6,2) check (current_weight_kg > 0),
  target_weight_kg numeric(6,2) check (target_weight_kg > 0),
  fitness_goal text not null default '',
  fitness_level public.fitness_level not null default 'Beginner',
  medical_conditions text,
  injuries_or_restrictions text,
  body_condition_notes text not null,
  front_photo_url text,
  membership_duration public.membership_duration not null default '1 month',
  status public.request_status not null default 'Pending',
  rejection_reason text,
  created_member_id uuid references public.members (id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index registration_requests_status_idx on public.registration_requests (status, submitted_at desc);
create unique index registration_requests_one_pending on public.registration_requests (user_id)
  where status = 'Pending';

-- ---------------------------------------------------------------------------
-- Activity logs
-- ---------------------------------------------------------------------------

-- plan_name and exercise_name are snapshots: history must read correctly after a plan is edited.
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  plan_id uuid references public.workout_plans (id) on delete set null,
  plan_name text not null,
  day_name text not null,
  scheduled_date date not null,
  start_time time not null,
  end_time time,
  duration_minutes int not null default 0 check (duration_minutes >= 0),
  completion_percentage int not null default 0 check (completion_percentage between 0 and 100),
  status public.workout_status not null default 'Completed',
  member_notes text,
  trainer_review_status public.workout_review_status not null default 'Pending Review',
  trainer_feedback text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index workout_sessions_member_idx on public.workout_sessions (member_id, scheduled_date desc);
create index workout_sessions_date_idx on public.workout_sessions (scheduled_date desc);
create index workout_sessions_review_idx on public.workout_sessions (trainer_review_status);

create table public.workout_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid references public.workout_exercises (id) on delete set null,
  position int not null default 0,
  exercise_name text not null,
  completed boolean not null default false,
  prescribed_sets int not null default 0,
  prescribed_reps text not null default '',
  actual_sets int not null default 0 check (actual_sets >= 0),
  actual_reps text not null default '',
  weight_used_kg numeric(6,2) not null default 0 check (weight_used_kg >= 0),
  notes text
);
create index workout_exercise_logs_session_idx on public.workout_exercise_logs (session_id, position);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  diet_plan_id uuid references public.diet_plans (id) on delete set null,
  scheduled_meal_name text not null,
  log_date date not null default public.today_dhaka(),
  logged_at timestamptz not null default now(),
  adherence public.meal_adherence not null,
  prescribed_foods_summary text not null default '',
  total_calories numeric(8,2) not null default 0 check (total_calories >= 0),
  total_protein_g numeric(7,2) not null default 0 check (total_protein_g >= 0),
  total_carbs_g numeric(7,2) not null default 0 check (total_carbs_g >= 0),
  total_fat_g numeric(7,2) not null default 0 check (total_fat_g >= 0),
  -- Path inside the private meal-photos bucket, not a URL.
  photo_path text,
  member_notes text,
  trainer_review_status public.meal_review_status not null default 'Pending',
  trainer_feedback text,
  reviewed_at timestamptz
);
create index meal_logs_member_idx on public.meal_logs (member_id, log_date desc);
create index meal_logs_date_idx on public.meal_logs (log_date desc);
create index meal_logs_review_idx on public.meal_logs (trainer_review_status);

create table public.meal_log_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs (id) on delete cascade,
  name text not null,
  quantity text not null default '',
  calories numeric(8,2) not null default 0 check (calories >= 0),
  protein_g numeric(7,2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(7,2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(7,2) not null default 0 check (fat_g >= 0),
  was_in_plan boolean not null default false
);
create index meal_log_items_log_idx on public.meal_log_items (meal_log_id);

create table public.progress_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  record_date date not null default public.today_dhaka(),
  weight_kg numeric(6,2) not null check (weight_kg > 0),
  waist_cm numeric(5,2) check (waist_cm > 0),
  chest_cm numeric(5,2) check (chest_cm > 0),
  arm_cm numeric(5,2) check (arm_cm > 0),
  -- Path inside the private progress-photos bucket, not a URL.
  photo_path text,
  bench_press_kg numeric(6,2) check (bench_press_kg >= 0),
  squat_kg numeric(6,2) check (squat_kg >= 0),
  deadlift_kg numeric(6,2) check (deadlift_kg >= 0),
  overhead_press_kg numeric(6,2) check (overhead_press_kg >= 0),
  notes text,
  trainer_feedback text,
  created_at timestamptz not null default now()
);
create index progress_records_member_idx on public.progress_records (member_id, record_date);

create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  trainer_id uuid references public.trainer_profiles (id) on delete set null,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  title text not null,
  focus_area text not null default '',
  attendance_status public.attendance_status not null default 'Scheduled',
  trainer_notes text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index training_sessions_member_idx on public.training_sessions (member_id, session_date desc);
create index training_sessions_date_idx on public.training_sessions (session_date);

-- ---------------------------------------------------------------------------
-- Communication and oversight
-- ---------------------------------------------------------------------------
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  category public.notice_category not null default 'General',
  target_audience public.notice_audience not null default 'All Members',
  target_member_id uuid references public.members (id) on delete cascade,
  priority public.notice_priority not null default 'Normal',
  published_date date not null default public.today_dhaka(),
  expiry_date date,
  created_at timestamptz not null default now(),
  check (target_audience <> 'Specific Member' or target_member_id is not null)
);
create index notices_published_idx on public.notices (published_date desc);
create index notices_target_member_idx on public.notices (target_member_id);

-- Replaces the app's readByMemberIds array.
create table public.notice_reads (
  notice_id uuid not null references public.notices (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notice_id, member_id)
);
create index notice_reads_member_idx on public.notice_reads (member_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  category public.notification_category not null default 'system',
  is_read boolean not null default false,
  link_tab text,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.needs_attention_alerts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  category public.alert_category not null,
  severity public.alert_severity not null default 'medium',
  title text not null,
  description text not null default '',
  recommended_action text not null default '',
  alert_date date not null default public.today_dhaka(),
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index needs_attention_open_idx on public.needs_attention_alerts (alert_date desc) where not is_resolved;
create index needs_attention_member_idx on public.needs_attention_alerts (member_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor text not null,
  action text not null,
  details text not null default ''
);
create index audit_logs_occurred_idx on public.audit_logs (occurred_at desc);

-- ---------------------------------------------------------------------------
-- member_overview: the shape the app's Member type expects
-- ---------------------------------------------------------------------------

-- Ports the status rules from storage.getMembers(). security_invoker keeps RLS in force,
-- so a member querying this view still sees only their own row.
create view public.member_overview
with (security_invoker = true) as
select
  m.*,
  paid.amount_paid,
  greatest(m.package_price - paid.amount_paid, 0)::numeric(12,2) as balance_due,
  (case
    when paid.amount_paid = 0 and m.next_payment_deadline < public.today_dhaka() then 'Overdue'
    when paid.amount_paid = 0 then 'Unpaid'
    when m.package_price > paid.amount_paid and m.next_payment_deadline < public.today_dhaka() then 'Overdue'
    when m.package_price > paid.amount_paid then 'Partially Paid'
    else 'Paid'
  end)::public.payment_status as payment_status,
  (case
    when m.membership_end_date < public.today_dhaka() then 'Expired'
    when m.base_status = 'Inactive' then 'Inactive'
    when m.membership_end_date - public.today_dhaka() <= 7 then 'Expiring Soon'
    else 'Active'
  end)::public.membership_status as status
from public.members m
cross join lateral (
  select coalesce(sum(p.amount), 0)::numeric(12,2) as amount_paid
  from public.payments p
  where p.member_id = m.id and p.status = 'Completed'
) paid;
