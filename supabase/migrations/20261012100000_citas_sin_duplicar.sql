-- Un doble clic en «Agendar» podía crear dos citas iguales.
-- Una cita creada en la app no se puede repetir: mismo lead, closer y hora mientras siga viva.
-- Las de GHL ya tienen su propia regla (citas_ghl_unica) y aquí no entran.
create unique index citas_app_unica on public.citas (lead_id, closer_id, fecha)
  where ghl_cita_id is null and estado not in ('cancelada', 'reagendada');
