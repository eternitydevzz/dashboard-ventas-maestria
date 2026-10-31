-- Leer las citas y los leads de GHL cada minuto, sin workflows.
-- El programador de Supabase (pg_cron) llama a la app (pg_net) en /api/ghl/leer/<proyecto> con la clave del proyecto
-- (la misma del webhook, en la cabecera x-webhook-secreto). Solo los proyectos con calendarios elegidos y GHL conectado.
-- Vercel Hobby no deja tareas de menos de un día; por eso lo programa Supabase.
--
-- Se activa UNA vez, en el SQL Editor de Supabase, con la dirección de TU app publicada:
--   select public.programar_lectura_ghl('https://tu-app.vercel.app');
-- Para pararla:
--   select cron.unschedule('leer-ghl');

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.programar_lectura_ghl(p_url text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text := rtrim(trim(p_url), '/');
begin
  if base !~ '^https://[^/\s]+$' then
    raise exception 'Pon la dirección de tu app, solo el dominio y con https:// (p. ej. https://tu-app.vercel.app)';
  end if;
  perform cron.schedule(
    'leer-ghl',
    '* * * * *',
    format($job$
      select net.http_post(
        url := %L || '/api/ghl/leer/' || p.id,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secreto', p.webhook_secreto),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      )
      from public.proyectos p
      where cardinality(p.ghl_calendarios) > 0 and p.ghl_token is not null
    $job$, base)
  );
  -- El historial del programador crece 1.440 filas al día: se guarda solo lo de los 2 últimos días
  perform cron.schedule(
    'limpiar-historial-cron',
    '17 4 * * *',
    $job$ delete from cron.job_run_details where end_time < now() - interval '2 days' $job$
  );
  return 'Lectura de GHL programada cada minuto en ' || base;
end;
$$;
revoke execute on function public.programar_lectura_ghl(text) from public, anon, authenticated;
