-- Azims Workout Manager: photo storage.
-- Files live at <auth user id>/<random file name>, which is what the policies below rely on.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('meal-photos', 'meal-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id in ('avatars', 'meal-photos', 'progress-photos')
    and (
      bucket_id = 'avatars'
      or (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_trainer())
    )
  );

create policy photos_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars', 'meal-photos', 'progress-photos')
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_trainer())
    )
  );

create policy photos_replace on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'meal-photos', 'progress-photos')
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_trainer())
    )
  );

create policy photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'meal-photos', 'progress-photos')
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_trainer())
    )
  );
