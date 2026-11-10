-- Run this whole file in Supabase -> SQL Editor. Safe to run again.

-- PROFILES -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null,
  stripe_account_id text,
  stripe_onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles
  for select using (true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- PROMPTS (public listing info) ----------------------------------------
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles on delete cascade,
  title text not null,
  description text not null,
  category text not null default 'Other',
  model text not null default 'ChatGPT',
  price_cents integer not null check (price_cents >= 100),
  preview_output text,
  preview_image_url text,
  sales_count integer not null default 0,
  revenue_cents integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.prompts enable row level security;

drop policy if exists "Prompts are public" on public.prompts;
create policy "Prompts are public" on public.prompts
  for select using (true);
drop policy if exists "Sellers insert own prompts" on public.prompts;
create policy "Sellers insert own prompts" on public.prompts
  for insert with check (auth.uid() = seller_id);
drop policy if exists "Sellers update own prompts" on public.prompts;
create policy "Sellers update own prompts" on public.prompts
  for update using (auth.uid() = seller_id);
drop policy if exists "Sellers delete own prompts" on public.prompts;
create policy "Sellers delete own prompts" on public.prompts
  for delete using (auth.uid() = seller_id);

-- Stop sellers from faking their own sales numbers.
create or replace function public.protect_prompt_stats()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.sales_count := old.sales_count;
    new.revenue_cents := old.revenue_cents;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_prompt_stats on public.prompts;
create trigger protect_prompt_stats
  before update on public.prompts
  for each row execute function public.protect_prompt_stats();

-- PURCHASES ------------------------------------------------------------
-- Written only by the server (service role) after Stripe confirms payment.
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts on delete cascade,
  buyer_id uuid not null references public.profiles on delete cascade,
  amount_cents integer not null,
  stripe_session_id text not null unique,
  created_at timestamptz not null default now(),
  unique (prompt_id, buyer_id)
);

alter table public.purchases enable row level security;

drop policy if exists "Buyers and sellers see purchases" on public.purchases;
create policy "Buyers and sellers see purchases" on public.purchases
  for select using (
    auth.uid() = buyer_id
    or exists (select 1 from public.prompts p where p.id = prompt_id and p.seller_id = auth.uid())
  );

create or replace function public.bump_prompt_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.prompts
  set sales_count = sales_count + 1,
      revenue_cents = revenue_cents + new.amount_cents
  where id = new.prompt_id;
  return new;
end;
$$;

drop trigger if exists on_purchase_created on public.purchases;
create trigger on_purchase_created
  after insert on public.purchases
  for each row execute function public.bump_prompt_stats();

-- PROMPT SECRETS (the actual prompt text, only for seller + buyers) ----
create table if not exists public.prompt_secrets (
  prompt_id uuid primary key references public.prompts on delete cascade,
  content text not null
);

alter table public.prompt_secrets enable row level security;

drop policy if exists "Seller or buyer can read prompt" on public.prompt_secrets;
create policy "Seller or buyer can read prompt" on public.prompt_secrets
  for select using (
    exists (select 1 from public.prompts p where p.id = prompt_id and p.seller_id = auth.uid())
    or exists (select 1 from public.purchases b where b.prompt_id = prompt_secrets.prompt_id and b.buyer_id = auth.uid())
  );
drop policy if exists "Seller writes own prompt" on public.prompt_secrets;
create policy "Seller writes own prompt" on public.prompt_secrets
  for insert with check (
    exists (select 1 from public.prompts p where p.id = prompt_id and p.seller_id = auth.uid())
  );
drop policy if exists "Seller updates own prompt" on public.prompt_secrets;
create policy "Seller updates own prompt" on public.prompt_secrets
  for update using (
    exists (select 1 from public.prompts p where p.id = prompt_id and p.seller_id = auth.uid())
  );

-- STORAGE: public bucket for result screenshots ------------------------
insert into storage.buckets (id, name, public)
values ('previews', 'previews', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view previews" on storage.objects;
create policy "Anyone can view previews" on storage.objects
  for select using (bucket_id = 'previews');
drop policy if exists "Users upload to own folder" on storage.objects;
create policy "Users upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'previews' and (storage.foldername(name))[1] = auth.uid()::text);

-- MANUAL PAYOUTS (bank / UPI / PayPal for sellers without Stripe) -------
alter table public.profiles add column if not exists manual_payout boolean not null default false;

alter table public.purchases add column if not exists seller_payout_cents integer not null default 0;
alter table public.purchases add column if not exists payout_status text not null default 'auto'
  check (payout_status in ('auto', 'pending', 'paid'));
alter table public.purchases add column if not exists paid_out_at timestamptz;

-- Private: only the seller (and the server) can read these.
create table if not exists public.payout_details (
  user_id uuid primary key references public.profiles on delete cascade,
  method text not null check (method in ('bank', 'upi', 'paypal')),
  account_name text not null,
  country text,
  bank_name text,
  account_number text,
  routing_code text,
  upi_id text,
  paypal_email text,
  updated_at timestamptz not null default now()
);

alter table public.payout_details enable row level security;

drop policy if exists "Owner reads payout details" on public.payout_details;
create policy "Owner reads payout details" on public.payout_details
  for select using (auth.uid() = user_id);
drop policy if exists "Owner inserts payout details" on public.payout_details;
create policy "Owner inserts payout details" on public.payout_details
  for insert with check (auth.uid() = user_id);
drop policy if exists "Owner updates payout details" on public.payout_details;
create policy "Owner updates payout details" on public.payout_details
  for update using (auth.uid() = user_id);

create or replace function public.sync_manual_payout()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set manual_payout = false where id = old.user_id;
    return old;
  end if;
  update public.profiles set manual_payout = true where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_payout_details_change on public.payout_details;
create trigger on_payout_details_change
  after insert or update or delete on public.payout_details
  for each row execute function public.sync_manual_payout();
