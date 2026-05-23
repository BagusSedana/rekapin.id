create extension if not exists "pgcrypto";

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nama text not null,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  tanggal date not null,
  nama_customer text,
  nominal bigint not null check (nominal >= 0),
  metode_bayar text not null check (
    metode_bayar in (
      'QRIS',
      'TRANSFER',
      'CASH',
      'GOPAY',
      'OVO',
      'DANA',
      'SHOPEE_PAY',
      'LAINNYA'
    )
  ),
  status text not null default 'BELUM_LUNAS' check (
    status in ('LUNAS', 'BELUM_LUNAS', 'SEBAGIAN')
  ),
  catatan text,
  source_image_url text,
  ai_confidence integer check (
    ai_confidence is null
    or (ai_confidence >= 0 and ai_confidence <= 100)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_business_owner_fk
    foreign key (business_id, user_id)
    references public.businesses(id, user_id)
    on delete cascade
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'FREE' check (
    plan in ('FREE', 'STARTER', 'PRO', 'ADMIN')
  ),
  status text not null default 'ACTIVE' check (
    status in ('ACTIVE', 'CANCELLED', 'EXPIRED')
  ),
  transaction_count_this_month integer not null default 0 check (
    transaction_count_this_month >= 0
  ),
  current_period_end timestamptz,
  midtrans_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_user_id_idx
on public.businesses(user_id);

create index if not exists transactions_user_id_idx
on public.transactions(user_id);

create index if not exists transactions_business_id_idx
on public.transactions(business_id);

create index if not exists transactions_tanggal_idx
on public.transactions(tanggal);

create index if not exists transactions_user_tanggal_idx
on public.transactions(user_id, tanggal desc);

create index if not exists subscriptions_user_id_idx
on public.subscriptions(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row
execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

alter table public.businesses enable row level security;
alter table public.transactions enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "businesses_select_own" on public.businesses;
create policy "businesses_select_own"
on public.businesses
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "businesses_insert_own" on public.businesses;
create policy "businesses_insert_own"
on public.businesses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "businesses_update_own" on public.businesses;
create policy "businesses_update_own"
on public.businesses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "businesses_delete_own" on public.businesses;
create policy "businesses_delete_own"
on public.businesses
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
on public.transactions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
on public.transactions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
on public.transactions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
on public.transactions
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
on public.subscriptions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
on public.subscriptions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own"
on public.subscriptions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.increment_transaction_count(target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_id uuid := (select auth.uid());
  new_count integer;
begin
  if requester_id is not null and requester_id <> target_user_id then
    raise exception 'Tidak boleh mengubah counter user lain.';
  end if;

  insert into public.subscriptions (
    user_id,
    plan,
    status,
    transaction_count_this_month
  )
  values (
    target_user_id,
    'FREE',
    'ACTIVE',
    1
  )
  on conflict (user_id)
  do update set
    transaction_count_this_month =
      public.subscriptions.transaction_count_this_month + 1,
    updated_at = now()
  returning transaction_count_this_month into new_count;

  return new_count;
end;
$$;

revoke all on function public.increment_transaction_count(uuid) from public;
grant execute on function public.increment_transaction_count(uuid) to authenticated;
grant execute on function public.increment_transaction_count(uuid) to service_role;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

drop policy if exists "payment_proofs_select_own_folder" on storage.objects;
create policy "payment_proofs_select_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "payment_proofs_insert_own_folder" on storage.objects;
create policy "payment_proofs_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "payment_proofs_update_own_folder" on storage.objects;
create policy "payment_proofs_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "payment_proofs_delete_own_folder" on storage.objects;
create policy "payment_proofs_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'FREE', 'ACTIVE')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_subscription on auth.users;
create trigger on_auth_user_created_create_subscription
after insert on auth.users
for each row
execute function public.handle_new_user_subscription();

