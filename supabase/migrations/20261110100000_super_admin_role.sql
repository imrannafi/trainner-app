-- Kept in its own migration: Postgres cannot use a new enum value in the transaction that adds it.
alter type public.user_role add value if not exists 'super_admin';
