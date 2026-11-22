-- Sparring IA · reparar usuarios creados antes de ejecutar 0001_init.sql
-- A cada usuario sin organización le crea la suya y lo deja como administrador.
-- Se puede ejecutar varias veces: solo actúa sobre usuarios que aún no tienen organización.

do $$
declare
  u record;
  v_org uuid;
begin
  for u in select * from auth.users where id not in (select user_id from public.members) loop
    insert into public.organizations (name)
    values (coalesce(nullif(u.raw_user_meta_data ->> 'org_name', ''), 'Mi organización'))
    returning id into v_org;
    insert into public.members (org_id, user_id, name, email, role, minute_limit)
    values (v_org, u.id, coalesce(nullif(u.raw_user_meta_data ->> 'name', ''), split_part(u.email, '@', 1)), u.email, 'admin', 300);
  end loop;
end
$$;
