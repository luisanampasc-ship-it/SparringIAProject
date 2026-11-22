-- Sparring IA · esquema inicial (Fase A)
-- Ejecutar una vez en Supabase: SQL Editor → New query → pegar todo → Run.
-- Es idempotente en lo posible: se puede volver a ejecutar si algo falla a mitad.

-- ─────────────────────────────────────────────────────────────
-- Tablas
-- ─────────────────────────────────────────────────────────────

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  offer_company text not null default '',
  offer_product text not null default '',
  rubrics jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  org_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'comercial' check (role in ('admin', 'manager', 'comercial')),
  active boolean not null default true,
  minute_limit integer not null default 120 check (minute_limit >= 0),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
-- De momento, cada usuario pertenece a una sola organización.
create unique index if not exists members_one_org_per_user on public.members (user_id);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  email text not null,
  role text not null default 'comercial' check (role in ('admin', 'manager', 'comercial')),
  minute_limit integer not null default 120,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create table if not exists public.personas (
  id text primary key,
  org_id uuid not null references public.organizations on delete cascade,
  created_by uuid references auth.users on delete set null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists personas_org on public.personas (org_id);

create table if not exists public.sessions (
  id text primary key,
  org_id uuid not null references public.organizations on delete cascade,
  rep_id uuid references auth.users on delete set null,
  type text not null check (type in ('real', 'roleplay')),
  call_type text not null,
  started_at timestamptz not null,
  duration_min integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_org_date on public.sessions (org_id, started_at desc);
create index if not exists sessions_rep_date on public.sessions (rep_id, started_at desc);

create table if not exists public.session_notes (
  session_id text primary key references public.sessions on delete cascade,
  org_id uuid not null references public.organizations on delete cascade,
  text text not null default '',
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Funciones auxiliares (organización y rol del usuario actual)
-- ─────────────────────────────────────────────────────────────

create or replace function public.my_org() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from public.members where user_id = auth.uid() and active limit 1
$$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where user_id = auth.uid() and active limit 1
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin', 'manager'), false)
$$;

-- ─────────────────────────────────────────────────────────────
-- Alta de usuarios: si tiene una invitación se une a esa organización;
-- si no, se crea su propia organización y queda como administrador.
-- (No se confía en los metadatos del registro para elegir organización.)
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_invite public.invites%rowtype;
  v_org uuid;
  v_role text;
  v_limit integer;
begin
  select * into v_invite from public.invites where lower(email) = lower(new.email) order by created_at desc limit 1;
  if found then
    v_org := v_invite.org_id;
    v_role := v_invite.role;
    v_limit := v_invite.minute_limit;
    delete from public.invites where id = v_invite.id;
  else
    insert into public.organizations (name)
    values (coalesce(nullif(new.raw_user_meta_data ->> 'org_name', ''), 'Mi organización'))
    returning id into v_org;
    v_role := 'admin';
    v_limit := 300;
  end if;
  insert into public.members (org_id, user_id, name, email, role, minute_limit)
  values (v_org, new.id, coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)), new.email, v_role, v_limit)
  on conflict do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Seguridad por filas (RLS): cada organización solo ve lo suyo;
-- los comerciales ven sus propias sesiones, admin/manager todas.
-- ─────────────────────────────────────────────────────────────

alter table public.organizations enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.personas enable row level security;
alter table public.sessions enable row level security;
alter table public.session_notes enable row level security;

drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select to authenticated using (id = public.my_org());
drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations for update to authenticated using (id = public.my_org() and public.is_manager());

drop policy if exists members_select on public.members;
create policy members_select on public.members for select to authenticated using (org_id = public.my_org());
drop policy if exists members_update on public.members;
create policy members_update on public.members for update to authenticated using (org_id = public.my_org() and public.my_role() = 'admin');

drop policy if exists invites_all on public.invites;
create policy invites_all on public.invites for all to authenticated
  using (org_id = public.my_org() and public.is_manager())
  with check (org_id = public.my_org() and public.is_manager());

drop policy if exists personas_select on public.personas;
create policy personas_select on public.personas for select to authenticated using (org_id = public.my_org());
drop policy if exists personas_insert on public.personas;
create policy personas_insert on public.personas for insert to authenticated with check (org_id = public.my_org() and created_by = auth.uid());
drop policy if exists personas_update on public.personas;
create policy personas_update on public.personas for update to authenticated using (org_id = public.my_org());
drop policy if exists personas_delete on public.personas;
create policy personas_delete on public.personas for delete to authenticated using (org_id = public.my_org() and (created_by = auth.uid() or public.is_manager()));

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select to authenticated
  using (org_id = public.my_org() and (public.is_manager() or rep_id = auth.uid()));
drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions for insert to authenticated
  with check (org_id = public.my_org() and (rep_id = auth.uid() or public.is_manager()));
drop policy if exists sessions_update on public.sessions;
create policy sessions_update on public.sessions for update to authenticated
  using (org_id = public.my_org() and (public.is_manager() or rep_id = auth.uid()));
drop policy if exists sessions_delete on public.sessions;
create policy sessions_delete on public.sessions for delete to authenticated
  using (org_id = public.my_org() and (public.is_manager() or rep_id = auth.uid()));

drop policy if exists notes_all on public.session_notes;
create policy notes_all on public.session_notes for all to authenticated
  using (org_id = public.my_org() and exists (select 1 from public.sessions s where s.id = session_id))
  with check (org_id = public.my_org() and exists (select 1 from public.sessions s where s.id = session_id));

-- Permisos de la API (solo usuarios con sesión iniciada).
revoke all on public.organizations, public.members, public.invites, public.personas, public.sessions, public.session_notes from anon;
grant select, update on public.organizations to authenticated;
grant select, update on public.members to authenticated;
grant select, insert, update, delete on public.invites, public.personas, public.sessions, public.session_notes to authenticated;
grant execute on function public.my_org(), public.my_role(), public.is_manager() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Almacenamiento de grabaciones: bucket privado, una carpeta por organización.
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false)
on conflict (id) do nothing;

drop policy if exists recordings_select on storage.objects;
create policy recordings_select on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = public.my_org()::text);
drop policy if exists recordings_insert on storage.objects;
create policy recordings_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = public.my_org()::text);
drop policy if exists recordings_delete on storage.objects;
create policy recordings_delete on storage.objects for delete to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = public.my_org()::text);
