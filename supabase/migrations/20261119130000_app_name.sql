-- App renamed to "Fitness With Oliul Azim": the welcome notification new members receive.
-- Same function as before; only the title text changes.
create or replace function public.on_member_change()
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
    perform public.notify_user(new.user_id, 'Welcome to Fitness With Oliul Azim!',
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
