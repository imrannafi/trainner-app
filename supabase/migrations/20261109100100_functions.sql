-- Azims Workout Manager: business rules that used to live in src/services/storage.ts.
-- Side effects (notifications, audit, derived updates) run in triggers so no client can skip them.

-- ---------------------------------------------------------------------------
-- Identity helpers (security definer so RLS policies can use them without recursion)
-- ---------------------------------------------------------------------------
create function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'trainer'
  )
$$;

create function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.members where user_id = (select auth.uid())
$$;

-- Ports isMemberWorkoutDietUnlocked: paid in full, or a completed payment for the current month.
create function public.current_member_is_unlocked()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select
      o.payment_status = 'Paid'
      or exists (
        select 1 from public.payments p
        where p.member_id = o.id
          and p.status = 'Completed'
          and (
            date_trunc('month', p.payment_date) = date_trunc('month', public.today_dhaka())
            or p.billing_period ilike '%' || to_char(public.today_dhaka(), 'FMMonth YYYY') || '%'
          )
      )
    from public.member_overview o
    where o.user_id = (select auth.uid())
  ), false)
$$;

create function public.notice_targets_me(p_audience public.notice_audience, p_target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case p_audience
      when 'All Members' then true
      when 'Specific Member' then p_target_member_id = o.id
      when 'Overdue Members' then o.payment_status = 'Overdue'
      when 'Expiring Soon' then o.status = 'Expiring Soon'
    end
    from public.member_overview o
    where o.user_id = (select auth.uid())
  ), false)
$$;

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------
create function public.log_audit(p_action text, p_details text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, actor, action, details)
  values (
    (select auth.uid()),
    coalesce(
      (select full_name from public.trainer_profiles where user_id = (select auth.uid())),
      (select full_name from public.members where user_id = (select auth.uid())),
      'System'
    ),
    p_action,
    p_details
  )
$$;

create function public.notify_user(
  p_user_id uuid,
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
  select p_user_id, p_title, p_description, p_category, p_link_tab
  where p_user_id is not null
$$;

create function public.notify_trainers(
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
  where role = 'trainer'
$$;

-- Plan editors create client-side ids like 'd-1730000000'; anything that is not a uuid becomes a new row.
create function public.uuid_or_new(p_value text)
returns uuid
language sql
volatile
set search_path = ''
as $$
  select case
    when p_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p_value::uuid
    else gen_random_uuid()
  end
$$;

-- The monthly payment window closes on the 10th.
create function public.next_payment_window_deadline(p_after_current_month boolean)
returns date
language sql
stable
set search_path = ''
as $$
  select (
    date_trunc('month', public.today_dhaka())
    + case
        when p_after_current_month or extract(day from public.today_dhaka()) > 10
          then interval '1 month'
        else interval '0'
      end
    + interval '9 days'
  )::date
$$;

-- ---------------------------------------------------------------------------
-- Triggers: generic
-- ---------------------------------------------------------------------------

-- Every new auth user starts as a member. Role is never read from signup metadata,
-- which the client controls.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trainer_profiles_updated_at before update on public.trainer_profiles
  for each row execute function public.set_updated_at();
create trigger workout_plans_updated_at before update on public.workout_plans
  for each row execute function public.set_updated_at();
create trigger diet_plans_updated_at before update on public.diet_plans
  for each row execute function public.set_updated_at();
create trigger members_updated_at before update on public.members
  for each row execute function public.set_updated_at();
create trigger member_private_notes_updated_at before update on public.member_private_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Triggers: members
-- ---------------------------------------------------------------------------
create function public.on_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_name text;
begin
  if tg_op = 'INSERT' then
    perform public.log_audit('ENROLL_MEMBER',
      format('Created profile for %s (%s)', new.full_name, new.membership_duration));
    perform public.notify_user(new.user_id, 'Welcome to Azims Workout Manager!',
      format('Your membership has been set up with %s coaching sessions.', new.total_package_sessions),
      'system');
    return new;
  end if;

  if new.assigned_workout_plan_id is distinct from old.assigned_workout_plan_id
     and new.assigned_workout_plan_id is not null then
    select name into v_plan_name from public.workout_plans where id = new.assigned_workout_plan_id;
    perform public.log_audit('ASSIGN_WORKOUT_PLAN',
      format('Assigned workout plan "%s" to %s', v_plan_name, new.full_name));
    perform public.notify_user(new.user_id, 'New Workout Routine Assigned',
      format('Your coach assigned the "%s" routine to your profile. Check your daily schedule!', v_plan_name),
      'workout', 'workout');
  end if;

  if new.assigned_diet_plan_id is distinct from old.assigned_diet_plan_id
     and new.assigned_diet_plan_id is not null then
    select name into v_plan_name from public.diet_plans where id = new.assigned_diet_plan_id;
    perform public.log_audit('ASSIGN_DIET_PLAN',
      format('Assigned nutrition plan "%s" to %s', v_plan_name, new.full_name));
    perform public.notify_user(new.user_id, 'Personalized Nutrition Plan Assigned',
      format('Your coach configured your "%s" meal targets.', v_plan_name),
      'diet', 'diet');
  end if;

  return new;
end;
$$;

create trigger members_after_change
  after insert or update on public.members
  for each row execute function public.on_member_change();

-- ---------------------------------------------------------------------------
-- Triggers: payments and registration
-- ---------------------------------------------------------------------------
create function public.on_payment_recorded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member record;
begin
  select user_id, balance_due into v_member from public.member_overview where id = new.member_id;

  perform public.log_audit('RECORD_PAYMENT',
    format('Recorded %s payment of ৳%s for %s. Balance: ৳%s',
      new.method, new.amount, new.member_name, coalesce(v_member.balance_due, 0)));
  perform public.notify_user(v_member.user_id, 'Payment Received',
    format('Your payment of ৳%s via %s was recorded. Outstanding: ৳%s.',
      new.amount, new.method, coalesce(v_member.balance_due, 0)),
    'payment', 'payments');
  return new;
end;
$$;

create trigger payments_after_insert
  after insert on public.payments
  for each row execute function public.on_payment_recorded();

create function public.on_payment_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select full_name into v_name from public.members where id = new.member_id;
  perform public.notify_trainers(format('Payment Request: %s', v_name),
    format('%s submitted ৳%s via %s%s for %s. Please review & accept.',
      v_name, new.amount, new.method,
      coalesce(format(' (TrxID: %s)', new.trx_id), ''), new.billing_month),
    'payment', 'payments');
  perform public.log_audit('SUBMIT_PAYMENT_REQUEST',
    format('Member %s submitted %s payment request for ৳%s (TrxID: %s)',
      v_name, new.method, new.amount, coalesce(new.trx_id, 'N/A')));
  return new;
end;
$$;

create trigger payment_requests_after_insert
  after insert on public.payment_requests
  for each row execute function public.on_payment_request_created();

create function public.on_registration_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_trainers('New Member Registration Request',
    format('%s submitted registration with full body condition details & photo. Please review & approve to create profile.', new.full_name),
    'system', 'members');
  perform public.log_audit('REGISTER_REQUEST',
    format('New client %s (%s) submitted registration with body condition description.', new.full_name, new.phone));
  return new;
end;
$$;

create trigger registration_requests_after_insert
  after insert on public.registration_requests
  for each row execute function public.on_registration_request_created();

-- ---------------------------------------------------------------------------
-- Triggers: activity
-- ---------------------------------------------------------------------------
create function public.on_workout_session_change()
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
    perform public.log_audit('SUBMIT_WORKOUT_LOG',
      format('Member %s submitted workout report (%s)', v_member.full_name, new.day_name));
  elsif new.trainer_review_status is distinct from old.trainer_review_status then
    perform public.notify_user(v_member.user_id, format('Workout %s', new.trainer_review_status),
      format('Your coach marked your session as %s.%s', new.trainer_review_status,
        coalesce(format(' Note: "%s"', new.trainer_feedback), '')),
      'workout', 'workout');
    perform public.log_audit('VERIFY_WORKOUT_SESSION',
      format('Trainer set %s''s session to %s', v_member.full_name, new.trainer_review_status));
  end if;
  return new;
end;
$$;

create trigger workout_sessions_after_change
  after insert or update on public.workout_sessions
  for each row execute function public.on_workout_session_change();

create function public.on_meal_log_change()
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
    perform public.log_audit('SUBMIT_MEAL_LOG',
      format('%s reported %s (%s)', v_member.full_name, new.scheduled_meal_name, new.adherence));
  elsif new.trainer_review_status is distinct from old.trainer_review_status then
    perform public.notify_user(v_member.user_id, format('Meal Log %s', new.trainer_review_status),
      format('Your coach reviewed your %s log.%s', new.scheduled_meal_name,
        coalesce(format(' Feedback: "%s"', new.trainer_feedback), '')),
      'diet', 'diet');
    perform public.log_audit('REVIEW_MEAL_LOG',
      format('Trainer reviewed %s''s %s log as %s', v_member.full_name, new.scheduled_meal_name, new.trainer_review_status));
  end if;
  return new;
end;
$$;

create trigger meal_logs_after_change
  after insert or update on public.meal_logs
  for each row execute function public.on_meal_log_change();

create function public.on_progress_recorded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.members set current_weight_kg = new.weight_kg where id = new.member_id;
  perform public.log_audit('ADD_PROGRESS_RECORD',
    format('Recorded weight & measurements update (%s kg)', new.weight_kg));
  return new;
end;
$$;

create trigger progress_records_after_insert
  after insert on public.progress_records
  for each row execute function public.on_progress_recorded();

-- Unlike the local version, moving away from Present refunds the session,
-- so toggling attendance cannot use up a package.
create function public.on_training_session_change()
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
    perform public.notify_user(v_member.user_id, 'Training Session Scheduled',
      format('Your coach scheduled your session: %s on %s at %s.', new.title, new.session_date, to_char(new.start_time, 'HH24:MI')),
      'workout', 'sessions');
    perform public.log_audit('SCHEDULE_SESSION',
      format('Scheduled coaching session with %s on %s', v_member.full_name, new.session_date));
    return new;
  end if;

  if new.attendance_status is distinct from old.attendance_status then
    if new.attendance_status = 'Present' then
      update public.members set remaining_sessions = greatest(remaining_sessions - 1, 0)
      where id = new.member_id;
    elsif old.attendance_status = 'Present' then
      update public.members set remaining_sessions = least(remaining_sessions + 1, total_package_sessions)
      where id = new.member_id;
    end if;
    perform public.log_audit('MARK_ATTENDANCE',
      format('%s session on %s marked as %s', v_member.full_name, new.session_date, new.attendance_status));
  end if;
  return new;
end;
$$;

create trigger training_sessions_after_change
  after insert or update on public.training_sessions
  for each row execute function public.on_training_session_change();

create function public.on_notice_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, title, description, category, link_tab)
  select o.user_id, format('Notice: %s', new.title), left(new.message, 90), 'notice', 'notices'
  from public.member_overview o
  where o.user_id is not null
    and case new.target_audience
      when 'All Members' then true
      when 'Specific Member' then o.id = new.target_member_id
      when 'Overdue Members' then o.payment_status = 'Overdue'
      when 'Expiring Soon' then o.status = 'Expiring Soon'
    end;

  perform public.log_audit('PUBLISH_NOTICE',
    format('Published notice "%s" (%s)', new.title, new.target_audience));
  return new;
end;
$$;

create trigger notices_after_insert
  after insert on public.notices
  for each row execute function public.on_notice_published();

-- ---------------------------------------------------------------------------
-- RPC: payment review (client calls supabase.rpc)
-- ---------------------------------------------------------------------------
create function public.approve_payment_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.payment_requests;
  v_name text;
  v_user_id uuid;
  v_coach text;
  v_payment_id uuid;
begin
  if not public.is_trainer() then
    raise exception 'Only the coach can approve payments' using errcode = '42501';
  end if;

  select * into v_req from public.payment_requests where id = p_request_id for update;
  if not found or v_req.status <> 'Pending' then
    raise exception 'Payment request is not pending';
  end if;

  select full_name, user_id into v_name, v_user_id from public.members where id = v_req.member_id;
  select full_name into v_coach from public.trainer_profiles where user_id = (select auth.uid());

  update public.payment_requests
  set status = 'Approved', reviewed_at = now()
  where id = p_request_id;

  insert into public.payments (
    member_id, member_name, payment_request_id, amount, method,
    transaction_ref, billing_period, recorded_by, notes, status
  ) values (
    v_req.member_id, v_name, v_req.id, v_req.amount, v_req.method,
    coalesce(v_req.trx_id, case when v_req.method = 'bKash' then 'bKash' else 'CASH-VERIFIED' end),
    v_req.billing_month, coalesce(v_coach, 'Coach'),
    coalesce(v_req.notes, format('Verified %s payment of ৳%s', v_req.method, v_req.amount)),
    'Completed'
  ) returning id into v_payment_id;

  update public.members
  set next_payment_deadline = public.next_payment_window_deadline(true)
  where id = v_req.member_id;

  perform public.notify_user(v_user_id, 'Payment Accepted! Plans Unlocked',
    format('Your coach verified your %s payment of ৳%s. Your workout routine and diet blueprint are now fully active!', v_req.method, v_req.amount),
    'payment', 'member-dashboard');
  perform public.log_audit('APPROVE_PAYMENT',
    format('ACCEPTED payment request for %s (৳%s via %s).', v_name, v_req.amount, v_req.method));

  return v_payment_id;
end;
$$;

create function public.reject_payment_request(p_request_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.payment_requests;
  v_name text;
  v_user_id uuid;
  v_reason text := coalesce(nullif(trim(p_reason), ''), 'Could not verify transaction with bKash/reception.');
begin
  if not public.is_trainer() then
    raise exception 'Only the coach can reject payments' using errcode = '42501';
  end if;

  select * into v_req from public.payment_requests where id = p_request_id for update;
  if not found or v_req.status <> 'Pending' then
    raise exception 'Payment request is not pending';
  end if;

  select full_name, user_id into v_name, v_user_id from public.members where id = v_req.member_id;

  update public.payment_requests
  set status = 'Rejected', rejection_reason = v_reason, reviewed_at = now()
  where id = p_request_id;

  perform public.notify_user(v_user_id, 'Payment Request Not Verified',
    format('Your coach could not verify your %s payment: %s. Please check TrxID/details and resubmit.', v_req.method, v_reason),
    'payment', 'member-payments');
  perform public.log_audit('REJECT_PAYMENT',
    format('REJECTED payment request for %s: %s', v_name, v_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: registration review
-- ---------------------------------------------------------------------------
create function public.approve_registration_request(
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
begin
  if not public.is_trainer() then
    raise exception 'Only the coach can approve registrations' using errcode = '42501';
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
    p_total_sessions, p_package_price, public.next_payment_window_deadline(false), 'Active'
  ) returning id into v_member_id;

  insert into public.member_private_notes (member_id, notes)
  values (v_member_id, format('Approved registration. Initial Body Condition: %s', v_req.body_condition_notes));

  update public.registration_requests
  set status = 'Approved', created_member_id = v_member_id, reviewed_at = now()
  where id = p_request_id;

  perform public.log_audit('APPROVE_MEMBER_REGISTRATION',
    format('APPROVED registration application for %s.', v_req.full_name));

  return v_member_id;
end;
$$;

create function public.reject_registration_request(p_request_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.registration_requests;
  v_reason text := coalesce(nullif(trim(p_reason), ''), 'Requirements or capacity criteria not met.');
begin
  if not public.is_trainer() then
    raise exception 'Only the coach can reject registrations' using errcode = '42501';
  end if;

  select * into v_req from public.registration_requests where id = p_request_id for update;
  if not found or v_req.status <> 'Pending' then
    raise exception 'Registration request is not pending';
  end if;

  update public.registration_requests
  set status = 'Rejected', rejection_reason = v_reason, reviewed_at = now()
  where id = p_request_id;

  perform public.log_audit('REJECT_MEMBER_REGISTRATION',
    format('REJECTED registration application for %s: %s', v_req.full_name, v_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: save a whole plan tree atomically
-- ---------------------------------------------------------------------------

-- The plan editors hold a nested object and save it in one go. Payload keys match the
-- WorkoutPlan/DietPlan types. Existing ids are updated in place so workout history stays linked.
create function public.save_workout_plan(p_plan jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid := public.uuid_or_new(p_plan->>'id');
  v_day jsonb;
  v_day_pos bigint;
  v_day_id uuid;
  v_ex jsonb;
  v_ex_pos bigint;
  v_ex_id uuid;
  v_day_ids uuid[] := '{}';
  v_ex_ids uuid[] := '{}';
begin
  if not public.is_trainer() then
    raise exception 'Only the coach can edit plans' using errcode = '42501';
  end if;

  insert into public.workout_plans (id, name, description, goal, difficulty, trainer_instructions)
  values (
    v_plan_id, p_plan->>'name', coalesce(p_plan->>'description', ''), coalesce(p_plan->>'goal', ''),
    coalesce(p_plan->>'difficulty', 'Beginner')::public.plan_difficulty,
    coalesce(p_plan->>'trainerInstructions', '')
  )
  on conflict (id) do update set
    name = excluded.name, description = excluded.description, goal = excluded.goal,
    difficulty = excluded.difficulty, trainer_instructions = excluded.trainer_instructions;

  for v_day, v_day_pos in
    select value, ordinality from jsonb_array_elements(coalesce(p_plan->'days', '[]')) with ordinality
  loop
    v_day_id := public.uuid_or_new(v_day->>'id');
    v_day_ids := v_day_ids || v_day_id;

    insert into public.workout_days (id, plan_id, position, day_name, focus_area, is_rest_day)
    values (
      v_day_id, v_plan_id, v_day_pos, v_day->>'dayName', coalesce(v_day->>'focusArea', ''),
      coalesce((v_day->>'isRestDay')::boolean, false)
    )
    on conflict (id) do update set
      plan_id = excluded.plan_id, position = excluded.position, day_name = excluded.day_name,
      focus_area = excluded.focus_area, is_rest_day = excluded.is_rest_day;

    for v_ex, v_ex_pos in
      select value, ordinality from jsonb_array_elements(coalesce(v_day->'exercises', '[]')) with ordinality
    loop
      v_ex_id := public.uuid_or_new(v_ex->>'id');
      v_ex_ids := v_ex_ids || v_ex_id;

      insert into public.workout_exercises (
        id, day_id, position, name, muscle_group, sets, reps, target_weight_kg,
        rest_seconds, instructions, media_url, alternative_exercise
      ) values (
        v_ex_id, v_day_id, v_ex_pos, v_ex->>'name', coalesce(v_ex->>'muscleGroup', ''),
        coalesce((v_ex->>'sets')::int, 0), coalesce(v_ex->>'reps', ''), (v_ex->>'targetWeightKg')::numeric,
        coalesce((v_ex->>'restSeconds')::int, 60), coalesce(v_ex->>'instructions', ''),
        v_ex->>'mediaUrl', v_ex->>'alternativeExercise'
      )
      on conflict (id) do update set
        day_id = excluded.day_id, position = excluded.position, name = excluded.name,
        muscle_group = excluded.muscle_group, sets = excluded.sets, reps = excluded.reps,
        target_weight_kg = excluded.target_weight_kg, rest_seconds = excluded.rest_seconds,
        instructions = excluded.instructions, media_url = excluded.media_url,
        alternative_exercise = excluded.alternative_exercise;
    end loop;
  end loop;

  delete from public.workout_exercises e
  using public.workout_days d
  where e.day_id = d.id and d.plan_id = v_plan_id and not (e.id = any (v_ex_ids));

  delete from public.workout_days
  where plan_id = v_plan_id and not (id = any (v_day_ids));

  perform public.log_audit('SAVE_WORKOUT_PLAN', format('Saved workout plan "%s"', p_plan->>'name'));
  return v_plan_id;
end;
$$;

create function public.save_diet_plan(p_plan jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid := public.uuid_or_new(p_plan->>'id');
  v_meal jsonb;
  v_meal_pos bigint;
  v_meal_id uuid;
  v_food jsonb;
  v_food_pos bigint;
  v_food_id uuid;
  v_meal_ids uuid[] := '{}';
  v_food_ids uuid[] := '{}';
begin
  if not public.is_trainer() then
    raise exception 'Only the coach can edit plans' using errcode = '42501';
  end if;

  insert into public.diet_plans (
    id, name, description, daily_calorie_target, protein_target_g, carbs_target_g, fat_target_g,
    water_intake_liters, dietary_preferences, restrictions, trainer_instructions
  ) values (
    v_plan_id, p_plan->>'name', coalesce(p_plan->>'description', ''),
    coalesce((p_plan->>'dailyCalorieTarget')::int, 0), coalesce((p_plan->>'proteinTargetG')::numeric, 0),
    coalesce((p_plan->>'carbsTargetG')::numeric, 0), coalesce((p_plan->>'fatTargetG')::numeric, 0),
    coalesce((p_plan->>'waterIntakeLiters')::numeric, 0), coalesce(p_plan->>'dietaryPreferences', ''),
    coalesce(p_plan->>'restrictions', ''), coalesce(p_plan->>'trainerInstructions', '')
  )
  on conflict (id) do update set
    name = excluded.name, description = excluded.description,
    daily_calorie_target = excluded.daily_calorie_target, protein_target_g = excluded.protein_target_g,
    carbs_target_g = excluded.carbs_target_g, fat_target_g = excluded.fat_target_g,
    water_intake_liters = excluded.water_intake_liters, dietary_preferences = excluded.dietary_preferences,
    restrictions = excluded.restrictions, trainer_instructions = excluded.trainer_instructions;

  for v_meal, v_meal_pos in
    select value, ordinality from jsonb_array_elements(coalesce(p_plan->'meals', '[]')) with ordinality
  loop
    v_meal_id := public.uuid_or_new(v_meal->>'id');
    v_meal_ids := v_meal_ids || v_meal_id;

    insert into public.diet_meals (id, plan_id, position, name, scheduled_time, preparation_notes, alternative_options)
    values (
      v_meal_id, v_plan_id, v_meal_pos, v_meal->>'name', nullif(v_meal->>'scheduledTime', '')::time,
      v_meal->>'preparationNotes', v_meal->>'alternativeOptions'
    )
    on conflict (id) do update set
      plan_id = excluded.plan_id, position = excluded.position, name = excluded.name,
      scheduled_time = excluded.scheduled_time, preparation_notes = excluded.preparation_notes,
      alternative_options = excluded.alternative_options;

    for v_food, v_food_pos in
      select value, ordinality from jsonb_array_elements(coalesce(v_meal->'foodItems', '[]')) with ordinality
    loop
      v_food_id := public.uuid_or_new(v_food->>'id');
      v_food_ids := v_food_ids || v_food_id;

      insert into public.diet_food_items (id, meal_id, position, name, quantity, unit, calories, protein_g, carbs_g, fat_g)
      values (
        v_food_id, v_meal_id, v_food_pos, v_food->>'name', coalesce((v_food->>'quantity')::numeric, 0),
        coalesce(v_food->>'unit', 'g'), coalesce((v_food->>'calories')::numeric, 0),
        coalesce((v_food->>'proteinG')::numeric, 0), coalesce((v_food->>'carbsG')::numeric, 0),
        coalesce((v_food->>'fatG')::numeric, 0)
      )
      on conflict (id) do update set
        meal_id = excluded.meal_id, position = excluded.position, name = excluded.name,
        quantity = excluded.quantity, unit = excluded.unit, calories = excluded.calories,
        protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fat_g = excluded.fat_g;
    end loop;
  end loop;

  delete from public.diet_food_items f
  using public.diet_meals m
  where f.meal_id = m.id and m.plan_id = v_plan_id and not (f.id = any (v_food_ids));

  delete from public.diet_meals
  where plan_id = v_plan_id and not (id = any (v_meal_ids));

  perform public.log_audit('SAVE_DIET_PLAN', format('Saved diet plan "%s"', p_plan->>'name'));
  return v_plan_id;
end;
$$;
