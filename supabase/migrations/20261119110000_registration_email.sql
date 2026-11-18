-- Emails the coach when a registration request arrives, through the notify-registration Edge Function.
-- Additive only. Needs two Vault secrets (see README > Member registration > Email to the coach):
--   email_function_url   = https://<project>.supabase.co/functions/v1/notify-registration
--   email_webhook_secret = the same value as the function secret EMAIL_WEBHOOK_SECRET
-- Until they exist, nothing is sent and registration works exactly as before.

create or replace function public.dispatch_registration_email()
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
        (select decrypted_secret from vault.decrypted_secrets where name = 'email_function_url'),
        (select decrypted_secret from vault.decrypted_secrets where name = 'email_webhook_secret')
    $sql$ into v_url, v_secret;

    if v_url is null or v_secret is null then
      return new;
    end if;

    execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using
      v_url,
      jsonb_build_object('record', to_jsonb(new)),
      jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret);
  exception when others then
    -- Email must never block a registration.
    raise warning 'registration email skipped: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke execute on function public.dispatch_registration_email() from public, anon, authenticated;

drop trigger if exists registration_requests_email on public.registration_requests;
create trigger registration_requests_email
  after insert on public.registration_requests
  for each row execute function public.dispatch_registration_email();
