-- Registration form: what the applicant has paid and how.
-- Additive only: existing rows get amount_paid = 0 and no method.

alter table public.registration_requests
  add column if not exists amount_paid numeric(12,2) not null default 0,
  add column if not exists payment_method public.payment_method;

alter table public.registration_requests
  drop constraint if exists registration_requests_amount_paid_check,
  add constraint registration_requests_amount_paid_check check (amount_paid >= 0),
  drop constraint if exists registration_requests_payment_method_check,
  add constraint registration_requests_payment_method_check
    check (payment_method is null or payment_method in ('Cash', 'bKash', 'Nagad', 'Bank Transfer')),
  drop constraint if exists registration_requests_paid_needs_method,
  add constraint registration_requests_paid_needs_method
    check (amount_paid = 0 or payment_method is not null);

-- Same signature and grants as before; now also records the registration payment
-- (as a Completed payment, since the coach is verifying it by approving).
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
    p_total_sessions, p_package_price, public.next_payment_window_deadline(v_req.amount_paid > 0), 'Active'
  ) returning id into v_member_id;

  insert into public.member_private_notes (member_id, notes)
  values (v_member_id, format('Approved registration. Initial Body Condition: %s', v_req.body_condition_notes));

  if v_req.amount_paid > 0 then
    select full_name into v_coach from public.trainer_profiles where user_id = (select auth.uid());
    insert into public.payments (
      member_id, member_name, amount, method, transaction_ref, billing_period, recorded_by, notes, status
    ) values (
      v_member_id, v_req.full_name, v_req.amount_paid, v_req.payment_method,
      'REGISTRATION', format('Registration · %s', v_req.membership_duration), coalesce(v_coach, 'Coach'),
      format('Paid at registration via %s (৳%s)', v_req.payment_method, v_req.amount_paid),
      'Completed'
    );
  end if;

  update public.registration_requests
  set status = 'Approved', created_member_id = v_member_id, reviewed_at = now()
  where id = p_request_id;

  perform public.log_audit('APPROVE_MEMBER_REGISTRATION',
    format('APPROVED registration application for %s (%s, paid ৳%s%s).',
      v_req.full_name, v_req.membership_duration, v_req.amount_paid,
      coalesce(' via ' || v_req.payment_method::text, '')));

  return v_member_id;
end;
$$;
