-- Sparring IA · perfil, preferencias, integraciones y notificaciones guardadas

-- Preferencias de cada miembro (avisos por email, Slack, resumen semanal…).
alter table public.members add column if not exists prefs jsonb not null default '{}'::jsonb;
-- Integraciones conectadas por la organización (id → true/false).
alter table public.organizations add column if not exists integrations jsonb not null default '{}'::jsonb;

-- Cada miembro puede cambiar su nombre y sus preferencias, pero no su rol, estado ni límite.
create or replace function public.update_my_profile(p_name text, p_prefs jsonb) returns void
language sql security definer set search_path = public as $$
  update public.members
  set name = coalesce(nullif(trim(p_name), ''), name),
      prefs = coalesce(p_prefs, prefs)
  where user_id = auth.uid()
$$;
grant execute on function public.update_my_profile(text, jsonb) to authenticated;

-- Notificaciones: cada persona ve y gestiona solo las suyas.
create table if not exists public.notifications (
  id text primary key,
  org_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  body text not null default '',
  session_id text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_date on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated with check (user_id = auth.uid() and org_id = public.my_org());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated using (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

revoke all on public.notifications from anon;
grant select, insert, update, delete on public.notifications to authenticated;
