-- DANGER: deletes all SellYourPrompt data. Run in Supabase -> SQL Editor,
-- then run schema.sql again for a clean start.

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.prompt_secrets cascade;
drop table if exists public.purchases cascade;
drop table if exists public.prompts cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.protect_prompt_stats() cascade;
drop function if exists public.bump_prompt_stats() cascade;

drop policy if exists "Anyone can view previews" on storage.objects;
drop policy if exists "Users upload to own folder" on storage.objects;
