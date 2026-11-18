-- Push notification status and self-test.
--   push_server_status(): tells the app whether server-side push delivery is set up,
--                         so Settings can show an accurate status. Never returns secret values.
--   send_test_notification(): sends the signed-in user a notification, which goes through the
--                         normal path (notifications row -> trigger -> send-push function -> device).

create or replace function public.push_server_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_has_net boolean;
  v_has_url boolean := false;
  v_has_secret boolean := false;
begin
  select exists (select 1 from pg_extension where extname = 'pg_net') into v_has_net;
  begin
    execute $sql$
      select
        exists (select 1 from vault.decrypted_secrets where name = 'push_function_url' and coalesce(decrypted_secret, '') <> ''),
        exists (select 1 from vault.decrypted_secrets where name = 'push_webhook_secret' and coalesce(decrypted_secret, '') <> '')
    $sql$ into v_has_url, v_has_secret;
  exception when others then
    v_has_url := false;
    v_has_secret := false;
  end;

  return jsonb_build_object(
    'configured', v_has_net and v_has_url and v_has_secret,
    'pg_net', v_has_net,
    'function_url', v_has_url,
    'webhook_secret', v_has_secret
  );
end;
$$;

create or replace function public.send_test_notification()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Sign in to send a test notification.';
  end if;

  -- Light rate limit so the button cannot be used to spam a device.
  if exists (
    select 1 from public.notifications
    where user_id = v_user and title = 'Test notification' and category = 'system' and created_at > now() - interval '15 seconds'
  ) then
    raise exception 'Please wait a few seconds before sending another test.';
  end if;

  insert into public.notifications (user_id, title, description, category)
  values (
    v_user,
    'Test notification',
    'Push notifications are working on this device.',
    'system'
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id) || public.push_server_status();
end;
$$;

revoke execute on function public.push_server_status() from public, anon;
revoke execute on function public.send_test_notification() from public, anon;
grant execute on function public.push_server_status() to authenticated;
grant execute on function public.send_test_notification() to authenticated;
