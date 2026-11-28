-- Sparring IA · detalles de la oferta del comercial (para que el prospecto IA pueda negociar)
-- price: precio de referencia · terms: condiciones (pagos, plazos, garantías) · advantages: ventajas principales
alter table public.organizations add column if not exists offer_details jsonb not null default '{}'::jsonb;
