-- Varios links de pago por programa (un pago, 2 meses, 4 semanas…) y el link de Reserva aparte, que vale para
-- cualquier programa. Se ponen desde la app (Programas y Links y recursos).
alter table public.productos add column links_pago jsonb not null default '[]'::jsonb;
alter table public.proyectos add column link_reserva text check (link_reserva is null or link_reserva ~ '^https://');
