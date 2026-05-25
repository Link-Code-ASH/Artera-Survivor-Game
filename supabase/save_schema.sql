create extension if not exists pgcrypto;

create table if not exists public.game_syncs (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  sync_id text not null,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  unique (project_id, sync_id)
);

create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  sync_id text not null,
  save_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, sync_id)
);

alter table public.game_syncs enable row level security;
alter table public.game_saves enable row level security;

drop policy if exists "game_syncs_no_direct_access" on public.game_syncs;
create policy "game_syncs_no_direct_access"
on public.game_syncs
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "game_saves_no_direct_access" on public.game_saves;
create policy "game_saves_no_direct_access"
on public.game_saves
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.verify_game_sync(
  input_project_id text,
  input_sync_id text,
  input_pin_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_count integer;
begin
  select count(*)
  into matched_count
  from public.game_syncs
  where project_id = input_project_id
    and sync_id = input_sync_id
    and pin_hash = crypt(input_pin_code, pin_hash);

  return matched_count > 0;
end;
$$;

create or replace function public.get_game_save(
  input_project_id text,
  input_sync_id text,
  input_pin_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_save jsonb;
begin
  if not public.verify_game_sync(input_project_id, input_sync_id, input_pin_code) then
    raise exception 'Invalid Sync ID or PIN Code';
  end if;

  insert into public.game_saves (project_id, sync_id, save_data)
  values (input_project_id, input_sync_id, '{}'::jsonb)
  on conflict (project_id, sync_id) do nothing;

  select save_data
  into current_save
  from public.game_saves
  where project_id = input_project_id
    and sync_id = input_sync_id;

  return coalesce(current_save, '{}'::jsonb);
end;
$$;

create or replace function public.upsert_game_save(
  input_project_id text,
  input_sync_id text,
  input_pin_code text,
  input_save_data jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_game_sync(input_project_id, input_sync_id, input_pin_code) then
    raise exception 'Invalid Sync ID or PIN Code';
  end if;

  insert into public.game_saves (project_id, sync_id, save_data, updated_at)
  values (input_project_id, input_sync_id, input_save_data, now())
  on conflict (project_id, sync_id)
  do update set
    save_data = excluded.save_data,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.verify_game_sync(text, text, text) from public;
revoke all on function public.get_game_save(text, text, text) from public;
revoke all on function public.upsert_game_save(text, text, text, jsonb) from public;

grant execute on function public.verify_game_sync(text, text, text) to anon, authenticated;
grant execute on function public.get_game_save(text, text, text) to anon, authenticated;
grant execute on function public.upsert_game_save(text, text, text, jsonb) to anon, authenticated;

-- Replace these values, then run this block once for each save slot you want.
insert into public.game_syncs (project_id, sync_id, pin_hash)
values (
  'YOUR_PROJECT_ID',
  'artera-main',
  crypt('YOUR_PIN_CODE', gen_salt('bf'))
)
on conflict (project_id, sync_id)
do update set pin_hash = excluded.pin_hash;
