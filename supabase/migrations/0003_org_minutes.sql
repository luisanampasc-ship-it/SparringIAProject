-- Sparring IA · minutos consumidos por la organización en el mes actual
-- (para el saldo de créditos; todos los miembros ven el total de su organización,
-- aunque un comercial solo pueda ver sus propias sesiones).

create or replace function public.org_minutes_used() returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(duration_min), 0)::integer
  from public.sessions
  where org_id = public.my_org()
    and started_at >= date_trunc('month', now())
$$;

grant execute on function public.org_minutes_used() to authenticated;
