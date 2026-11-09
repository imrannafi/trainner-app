-- Azims Workout Manager: who can read and write what.
-- The trainer manages everything. A member sees only their own data and can only submit new
-- records; every review, payment and status change goes through the trainer.

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: RLS decides rows, grants decide operations and columns
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Roles are changed only by SQL or the service role, and audit history is append-only.
revoke insert, update, delete on public.profiles from authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;

-- Users may mark a notification read, and nothing else; triggers create them.
revoke insert, update, delete on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.today_dhaka(),
  public.is_trainer(),
  public.current_member_id(),
  public.current_member_is_unlocked(),
  public.notice_targets_me(public.notice_audience, uuid),
  public.approve_payment_request(uuid),
  public.reject_payment_request(uuid, text),
  public.approve_registration_request(uuid, numeric, int, uuid, uuid),
  public.reject_registration_request(uuid, text),
  public.save_workout_plan(jsonb),
  public.save_diet_plan(jsonb)
to authenticated;

-- ---------------------------------------------------------------------------
-- Trainer: full access to all operational tables
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'trainer_profiles', 'workout_plans', 'workout_days', 'workout_exercises',
    'diet_plans', 'diet_meals', 'diet_food_items', 'members', 'member_private_notes',
    'gym_check_ins', 'payments', 'payment_requests', 'registration_requests',
    'workout_sessions', 'workout_exercise_logs', 'meal_logs', 'meal_log_items',
    'progress_records', 'training_sessions', 'notices', 'notice_reads',
    'needs_attention_alerts'
  ] loop
    execute format(
      'create policy trainer_all on public.%I for all to authenticated
       using ((select public.is_trainer())) with check ((select public.is_trainer()))',
      t
    );
  end loop;
end;
$$;

create policy trainer_read_audit on public.audit_logs
  for select to authenticated using ((select public.is_trainer()));

-- ---------------------------------------------------------------------------
-- Everyone signed in
-- ---------------------------------------------------------------------------
create policy read_own_or_trainer on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_trainer()));

create policy read_coach_profile on public.trainer_profiles
  for select to authenticated using (true);

create policy read_own on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

create policy mark_own_read on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Applicants (signed in, no members row yet)
-- ---------------------------------------------------------------------------
create policy read_own on public.registration_requests
  for select to authenticated using (user_id = (select auth.uid()));

create policy submit_own on public.registration_requests
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'Pending'
    and rejection_reason is null
    and reviewed_at is null
    and created_member_id is null
  );

-- ---------------------------------------------------------------------------
-- Members: own records
-- ---------------------------------------------------------------------------
create policy read_own on public.members
  for select to authenticated using (user_id = (select auth.uid()));

create policy read_own on public.payments
  for select to authenticated using (member_id = (select public.current_member_id()));

create policy read_own on public.payment_requests
  for select to authenticated using (member_id = (select public.current_member_id()));

create policy submit_own on public.payment_requests
  for insert to authenticated
  with check (
    member_id = (select public.current_member_id())
    and status = 'Pending'
    and rejection_reason is null
    and reviewed_at is null
  );

create policy read_own on public.training_sessions
  for select to authenticated using (member_id = (select public.current_member_id()));

create policy read_own on public.gym_check_ins
  for select to authenticated using (member_id = (select public.current_member_id()));

create policy add_own on public.gym_check_ins
  for insert to authenticated with check (member_id = (select public.current_member_id()));

create policy remove_own on public.gym_check_ins
  for delete to authenticated using (member_id = (select public.current_member_id()));

create policy read_own on public.workout_sessions
  for select to authenticated using (member_id = (select public.current_member_id()));

create policy submit_own on public.workout_sessions
  for insert to authenticated
  with check (
    member_id = (select public.current_member_id())
    and trainer_review_status = 'Pending Review'
    and trainer_feedback is null
    and verified_at is null
  );

create policy read_own on public.workout_exercise_logs
  for select to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.member_id = (select public.current_member_id())
  ));

create policy submit_own on public.workout_exercise_logs
  for insert to authenticated
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.member_id = (select public.current_member_id())
  ));

create policy read_own on public.meal_logs
  for select to authenticated using (member_id = (select public.current_member_id()));

create policy submit_own on public.meal_logs
  for insert to authenticated
  with check (
    member_id = (select public.current_member_id())
    and trainer_review_status = 'Pending'
    and trainer_feedback is null
    and reviewed_at is null
  );

create policy read_own on public.meal_log_items
  for select to authenticated
  using (exists (
    select 1 from public.meal_logs l
    where l.id = meal_log_id and l.member_id = (select public.current_member_id())
  ));

create policy submit_own on public.meal_log_items
  for insert to authenticated
  with check (exists (
    select 1 from public.meal_logs l
    where l.id = meal_log_id and l.member_id = (select public.current_member_id())
  ));

create policy read_own on public.progress_records
  for select to authenticated using (member_id = (select public.current_member_id()));

create policy submit_own on public.progress_records
  for insert to authenticated
  with check (member_id = (select public.current_member_id()) and trainer_feedback is null);

create policy read_targeted on public.notices
  for select to authenticated
  using (public.notice_targets_me(target_audience, target_member_id));

create policy read_own on public.notice_reads
  for select to authenticated using (member_id = (select public.current_member_id()));

create policy mark_own on public.notice_reads
  for insert to authenticated with check (member_id = (select public.current_member_id()));

-- ---------------------------------------------------------------------------
-- Members: assigned plans
-- The plan header is always visible; its contents need the month's payment.
-- ---------------------------------------------------------------------------
create policy read_assigned on public.workout_plans
  for select to authenticated
  using (exists (
    select 1 from public.members m
    where m.user_id = (select auth.uid()) and m.assigned_workout_plan_id = workout_plans.id
  ));

create policy read_assigned_when_paid on public.workout_days
  for select to authenticated
  using (
    (select public.current_member_is_unlocked())
    and exists (
      select 1 from public.members m
      where m.user_id = (select auth.uid()) and m.assigned_workout_plan_id = workout_days.plan_id
    )
  );

create policy read_assigned_when_paid on public.workout_exercises
  for select to authenticated
  using (
    (select public.current_member_is_unlocked())
    and exists (
      select 1
      from public.workout_days d
      join public.members m on m.assigned_workout_plan_id = d.plan_id
      where d.id = workout_exercises.day_id and m.user_id = (select auth.uid())
    )
  );

create policy read_assigned on public.diet_plans
  for select to authenticated
  using (exists (
    select 1 from public.members m
    where m.user_id = (select auth.uid()) and m.assigned_diet_plan_id = diet_plans.id
  ));

create policy read_assigned_when_paid on public.diet_meals
  for select to authenticated
  using (
    (select public.current_member_is_unlocked())
    and exists (
      select 1 from public.members m
      where m.user_id = (select auth.uid()) and m.assigned_diet_plan_id = diet_meals.plan_id
    )
  );

create policy read_assigned_when_paid on public.diet_food_items
  for select to authenticated
  using (
    (select public.current_member_is_unlocked())
    and exists (
      select 1
      from public.diet_meals d
      join public.members m on m.assigned_diet_plan_id = d.plan_id
      where d.id = diet_food_items.meal_id and m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime: replaces storage.subscribe() for live badges. RLS applies here too.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.notifications,
  public.payment_requests,
  public.registration_requests,
  public.meal_logs,
  public.workout_sessions;
