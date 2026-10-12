-- =====================================================================
--  ISAT U Research Asset Management System (RAMS) v2
--  Supabase / PostgreSQL schema
--  Run this whole file once in Supabase → SQL Editor → New query → Run
-- =====================================================================

set client_min_messages = warning;

-- ---------- Roles -----------------------------------------------------
-- admin : everything, incl. user management and deletes
-- rsd   : Research Services Division staff — can add / edit records
-- user  : read-only access to all records
do $$ begin
  create type public.app_role as enum ('admin', 'rsd', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.research_status as enum ('ongoing', 'completed');
exception when duplicate_object then null; end $$;

-- ---------- Profiles (one per auth user) ------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text,
  role        public.app_role not null default 'user',
  created_at  timestamptz not null default now()
);

-- Create a profile automatically whenever a user is created.
-- Role is NEVER taken from user metadata (users could forge it); it is
-- always 'user' and is raised by an admin from the Users page.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers (security definer so RLS on profiles doesn't recurse)
create or replace function public.my_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.can_edit()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','rsd') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- ---------- Intellectual Property -------------------------------------
create table if not exists public.patents (            -- was `invention`
  id               bigint generated always as identity primary key,
  title            text not null,
  inventors        text not null,
  filing_date      date,
  application_no   text,
  category         text,
  commercialization text default 'Not yet commercialized',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.trademarks (         -- was `trademark`
  id            bigint generated always as identity primary key,
  mark_name     text not null,
  reg_number    text,
  reg_date      date,
  owner         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.copyrights (         -- was `copyright`
  id            bigint generated always as identity primary key,
  title         text not null,
  authors       text not null,
  publisher     text,
  pub_year      int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- People ----------------------------------------------------
create table if not exists public.researchers (        -- was `experts` + `areas` + `ed_quali`
  id               bigint generated always as identity primary key,
  full_name        text not null,
  email            text,
  phone            text,
  campus           text,
  college          text,
  cluster          text,
  research_center  text,
  researcher_type  text not null default 'Faculty',
  expertise        text,
  education        text[] not null default '{}',   -- educational qualifications
  specializations  text[] not null default '{}',   -- areas of specialization
  photo_url        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.research_projects (  -- was `researches`
  id                bigint generated always as identity primary key,
  researcher_id     bigint references public.researchers(id) on delete cascade,
  title             text not null,
  applicability     text,             -- industrial applicability
  status            public.research_status not null default 'ongoing',
  publication_date  date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists research_projects_researcher_idx on public.research_projects(researcher_id);

create table if not exists public.graduate_students (  -- was `grad`
  id             bigint generated always as identity primary key,
  full_name      text not null,
  thesis_title   text,
  applicability  text,
  program        text,       -- course
  college        text,
  grad_year      int,
  address        text,
  email          text,
  photo_url      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- Physical Resources ----------------------------------------
create table if not exists public.laboratories (       -- was `lab`
  id           bigint generated always as identity primary key,
  name         text not null,
  description  text,
  location     text,
  contact      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.services (
  id           bigint generated always as identity primary key,
  name         text not null,
  description  text,
  price        numeric(12,2),
  unit         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.equipment (
  id           bigint generated always as identity primary key,
  name         text not null,
  description  text,
  price        numeric(12,2),
  laboratory_id bigint references public.laboratories(id) on delete set null,
  condition    text default 'Good',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- updated_at trigger ----------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['patents','trademarks','copyrights','researchers','research_projects',
                           'graduate_students','laboratories','services','equipment'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s
                    for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- Row Level Security ----------------------------------------
-- Every signed-in user can read; admin + rsd can add/edit; only admin deletes.
do $$
declare t text;
begin
  foreach t in array array['patents','trademarks','copyrights','researchers','research_projects',
                           'graduate_students','laboratories','services','equipment'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s read"   on public.%1$s', t);
    execute format('drop policy if exists "%1$s insert" on public.%1$s', t);
    execute format('drop policy if exists "%1$s update" on public.%1$s', t);
    execute format('drop policy if exists "%1$s delete" on public.%1$s', t);
    execute format('create policy "%1$s read"   on public.%1$s for select to authenticated using (true)', t);
    execute format('create policy "%1$s insert" on public.%1$s for insert to authenticated with check (public.can_edit())', t);
    execute format('create policy "%1$s update" on public.%1$s for update to authenticated using (public.can_edit()) with check (public.can_edit())', t);
    execute format('create policy "%1$s delete" on public.%1$s for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists "profiles self read"    on public.profiles;
drop policy if exists "profiles admin read"   on public.profiles;
drop policy if exists "profiles self update"  on public.profiles;
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles self read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles admin read"  on public.profiles for select to authenticated using (public.is_admin());
create policy "profiles admin update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- Users may change their own display name, but not their role.
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());

-- ---------- Dashboard stats (one round trip) --------------------------
create or replace function public.dashboard_stats()
returns json language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'patents',            (select count(*) from patents),
    'trademarks',         (select count(*) from trademarks),
    'copyrights',         (select count(*) from copyrights),
    'researchers',        (select count(*) from researchers),
    'graduate_students',  (select count(*) from graduate_students),
    'research_projects',  (select count(*) from research_projects),
    'research_ongoing',   (select count(*) from research_projects where status = 'ongoing'),
    'research_completed', (select count(*) from research_projects where status = 'completed'),
    'laboratories',       (select count(*) from laboratories),
    'services',           (select count(*) from services),
    'equipment',          (select count(*) from equipment)
  )
$$;

-- ---------- Storage: photos bucket ------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos public read" on storage.objects;
drop policy if exists "photos editor write" on storage.objects;
drop policy if exists "photos editor update" on storage.objects;
drop policy if exists "photos editor delete" on storage.objects;
create policy "photos public read"   on storage.objects for select using (bucket_id = 'photos');
create policy "photos editor write"  on storage.objects for insert to authenticated with check (bucket_id = 'photos' and public.can_edit());
create policy "photos editor update" on storage.objects for update to authenticated using (bucket_id = 'photos' and public.can_edit());
create policy "photos editor delete" on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.can_edit());
