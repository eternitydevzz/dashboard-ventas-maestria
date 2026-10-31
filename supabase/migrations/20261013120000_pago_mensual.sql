-- Productos con pago mensual sin fin (cada mes queda un cobro pendiente hasta que se da de baja)
alter table public.productos drop constraint productos_modo_pago_check;
alter table public.productos add constraint productos_modo_pago_check check (modo_pago in ('unico', 'cuotas', 'mensual'));
alter table public.ventas drop constraint ventas_tipo_pago_check;
alter table public.ventas add constraint ventas_tipo_pago_check check (tipo_pago in ('completo', 'reserva', 'cuotas', 'mensual'));
alter table public.ventas add column baja_en timestamptz;
