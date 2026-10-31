# Guía · Publicar la app

Paso a paso, de tu ordenador a una web a la que entra todo el equipo. Otra guía: [`GUIA-GHL.md`](GUIA-GHL.md).

---

## Antes de empezar

**Necesitas:**
- Cuentas gratuitas en **GitHub**, **Supabase** y **Vercel**.
- Una cuenta en **Resend** para los emails (avisos de reportes y enlaces para entrar).
- Opcional (de pago por uso): la **API de Claude** (Anthropic) para analizar llamadas y el coach, y **Deepgram** para transcribir llamadas de GHL.
- El CSV del equipo (paso 6) y una exportación de contactos de GHL (paso 7).

**Qué es cada cosa:**

| Servicio | Para qué | Qué guarda |
|---|---|---|
| GitHub | Guardar el código | El código de la app (sin claves) |
| Supabase | Base de datos y login | Leads, ventas, usuarios… |
| Vercel | Poner la web en internet | Nada propio: lee de Supabase |
| Resend | Mandar los emails de la app | Solo el registro de envíos |
| API de Claude (opcional) | Analizar llamadas, coach, scoring | Nada: solo procesa lo que se le manda |
| Deepgram (opcional) | Pasar a texto las llamadas de GHL que GHL no transcribe | Nada: solo procesa el audio |

**Antes de publicar, pon tu marca** (nombre, logos, colores, pipelines y productos): está todo en el [`README`](../README.md), sección «Ponerle tu marca».

> ⚠ Los nombres de los menús de Supabase, Vercel, Resend y GHL pueden cambiar con el tiempo; si no encuentras uno, busca el nombre del ajuste.

---

## Paso 1 · GitHub (guardar el código)

1. Crea un repositorio **privado** en github.com.
2. Sube el código. Ninguna clave se sube: `.gitignore` excluye `.env.local`, `.env.produccion` y `scripts/salida/`.

## Paso 2 · Supabase (base de datos)

1. En supabase.com, crea un proyecto nuevo. Guarda la contraseña de la base de datos en tu gestor de contraseñas. Elige la región más cercana a tu equipo.
2. **Cierra el registro libre** (muy importante): en Authentication, desactiva **«Allow new users to sign up»**. Así solo entra quien crea un administrador desde la app.
3. En Authentication → Email, pon **«Email OTP Expiration»** en `86400` (24 horas). Es lo que dura el enlace para entrar que manda la app.
4. Copia y guarda (Project Settings → API Keys / General):
   - **Project URL** (`https://xxxx.supabase.co`)
   - **Publishable key** (`sb_publishable_…`)
   - **Secret key** (`sb_secret_…`) → **nunca la compartas**: da acceso total a la base.
   - El **Project ref** (el código `xxxx` de la URL).

## Paso 3 · Crear las tablas en la nube

```bash
npx supabase@2.90.0 login
npx supabase@2.90.0 link --project-ref TU_PROJECT_REF
npx supabase@2.90.0 db push --dry-run
npx supabase@2.90.0 db push
```

`--dry-run` enseña qué va a crear sin tocar nada; luego `db push` lo crea de verdad (tablas, permisos cerrados y el espacio para los archivos).

## Paso 4 · Vercel (poner la web en internet)

1. En vercel.com, entra **con tu cuenta de GitHub** → «Add New → Project» → elige tu repositorio.
2. **Environment Variables** (los nombres y para qué sirve cada una están en `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` (paso 2).
   - `CLAVE_CIFRADO`: genérala con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (vale en Windows y en Mac) y **guárdala también en tu gestor de contraseñas**. Con ella se guardan cifrados el token de GHL y las claves de Fathom; si se pierde o se cambia, hay que volver a pegarlos en la app.
   - `NEXT_PUBLIC_SUPABASE_URL` tiene que estar puesta **antes** del primer Deploy (la regla de seguridad que deja subir PDF y CSV se escribe al compilar).
   - Opcionales: `ANTHROPIC_API_KEY` y `DEEPGRAM_API_KEY`. Sin ellas la app funciona, pero no analiza ni transcribe llamadas.
3. Pulsa **Deploy**. En unos minutos tendrás una dirección tipo `tu-app.vercel.app`.
4. Recomendado: en Settings → Functions, la región más cercana a la de Supabase.

## Paso 5 · Emails con Resend

La app manda 2 tipos de email: el **aviso de cada reporte** (al CEO y a los directores) y el **enlace para entrar** (el acceso de alguien nuevo, el «¿No puedes entrar?» del login y el «Enviar enlace mágico» de la ficha de cada persona).

1. **Dominio:** resend.com → Domains → Add domain → tu dominio. Añade en tu DNS los registros que te da Resend y espera a que salga «Verified».
2. **Clave:** Resend → API Keys → Create, con permiso «Sending access» para tu dominio. Se copia una sola vez.
3. **Vercel → Environment Variables:** `RESEND_API_KEY`, `APP_URL` (la dirección de tu app) y, si quieres, `EMAIL_REMITENTE` (p. ej. `Tu Empresa <no-reply@tudominio.com>`). Después, Deployments → Redeploy.
4. **Probar:** Equipo → ficha de alguien → «Enviar enlace mágico».

## Paso 6 · Preparar el proyecto y crear el equipo

Crea un archivo `.env.produccion` (copia de `.env.example` con las claves de la nube; nunca se sube a GitHub). Después:

```bash
# Proyecto, pipelines, columnas y productos de scripts/proyecto-base.json
node --env-file=.env.produccion scripts/preparar-proyecto.mjs              # simula
node --env-file=.env.produccion scripts/preparar-proyecto.mjs --confirmar  # lo crea
```

Para el equipo, haz un CSV con las columnas `nombre,email,rol,proyecto` (rol: `ceo`, `director`, `closer` o `caller`) y, si quieres, `telefono` y `admin` (`si` = director con Administración):

```bash
node --env-file=.env.produccion scripts/crear-usuarios.mjs equipo.csv              # simula
node --env-file=.env.produccion scripts/crear-usuarios.mjs equipo.csv --confirmar  # los crea
```

Cada persona recibe una contraseña temporal al azar, que se guarda solo en `scripts/salida/` (excluido de GitHub). Pásasela por un canal privado y borra ese archivo después. La primera vez que entran hacen el onboarding (sus datos y, callers y closers, su horario) y pueden cambiar la contraseña en «Mi perfil». También puedes dar de alta a la gente desde la app (Equipo).

## Paso 7 · Subir los leads

1. Exporta los contactos de GHL a CSV.
2. En la app, como CEO → CRM → **Subir CSV** → revisa qué es cada columna → elige el pipeline → Importar. Los que ya están se ponen al día (etiquetas y respuestas nuevas) sin duplicarse.

## Paso 8 · Conectar GHL

Sigue [`GUIA-GHL.md`](GUIA-GHL.md): token de la API, calendarios, webhooks, landings y avisos de reportes.

**Lectura automática de GHL (una sola vez):** en Supabase → SQL Editor, ejecuta con la dirección de tu app:

```sql
select public.programar_lectura_ghl('https://tu-app.vercel.app');
```

Desde ese momento, cada minuto la app lee de GHL las citas y los leads nuevos de los proyectos con GHL conectado. Para pararlo: `select cron.unschedule('leer-ghl');`.

## Paso 9 · (Opcional) Fathom e IA

- **Fathom:** cada closer, en Agendas → Llamadas → Grabaciones → Cuentas → Añadir cuenta (o un administrador desde la ficha del closer): su API key de Fathom (Settings → API Access) y el formato de título de sus reuniones. Después, «Probar» y «Sincronizar Fathom».
- **IA:** en Agendas → Análisis → Configurar IA, el contexto de tu negocio (qué vendes, a quién, objeciones típicas).

## Paso 10 · Comprobar que todo va

- [ ] Entras como CEO y ves tu proyecto con sus pipelines, «Callers», «Closers» y sus productos.
- [ ] Un caller entra, hace el onboarding y ve sus leads; un closer pone su horario.
- [ ] Administración → Proyecto y reparto: el % de cada caller (suman 100) y el reparto automático; un lead de prueba de GHL entra asignado.
- [ ] Un lead de GHL llega solo (Administración → Integraciones → «Últimos eventos»).
- [ ] Un reporte de fin de día manda el aviso por email.
- [ ] Desde el móvil se ve bien.

## Paso 11 · (Opcional) Dominio propio

Vercel → Settings → Domains → añade, por ejemplo, `ventas.tudominio.com` y sigue las instrucciones de DNS. Después cambia `APP_URL`, vuelve a ejecutar `programar_lectura_ghl` con la dirección nueva y actualiza las URL de los workflows de GHL.

---

## Seguridad

**Ya hecho en la app:** la base de datos no se puede leer con la clave pública (RLS en todas las tablas); cada acción comprueba el rol y el permiso de la sección; límite de intentos en el login y en los webhooks; cabeceras de seguridad con nonce por petición; el token de GHL y las claves de Fathom se guardan cifrados; los archivos solo se abren con enlace temporal; las claves de GHL, Fathom, Claude y Deepgram nunca llegan al navegador; a Claude no se le mandan emails ni teléfonos de los leads; los CSV que se exportan están protegidos contra fórmulas de Excel.

**Depende de ti:**
- Desactivar «Allow new users to sign up» en Supabase (paso 2).
- No compartir nunca la **Secret key**, `CLAVE_CIFRADO` ni la clave del webhook.
- Dar de baja a quien deje el equipo (solo el CEO puede desactivar: ficha → «Acceso» → Desactivar).
- Revisar en tu plan de Supabase cómo funcionan las copias de seguridad.
- Las direcciones de las landings («Entradas») son públicas por diseño: si ves leads basura, pulsa «Nueva dirección» y cámbiala en la landing.

## Si algo falla

| Síntoma | Qué mirar |
|---|---|
| La web da error al entrar | Vercel → Deployments → Logs. Suele ser una variable mal copiada. |
| «Email o contraseña incorrectos» con la contraseña buena | Que el usuario exista. Un administrador puede ponerle otra en su ficha → «Acceso». |
| GHL no crea leads | Administración → Integraciones → «Últimos eventos». Que el workflow de GHL esté **publicado**. Si GHL dice «not enough funds», usa la acción «Webhook» normal (ver GUIA-GHL.md). |
| No llegan los emails | Que `RESEND_API_KEY` esté en Vercel y el dominio siga «Verified» en Resend; mira los Logs de Resend. |
| Las citas de GHL no llegan solas | Que hayas ejecutado `programar_lectura_ghl` (paso 8) y que el proyecto tenga token y calendarios elegidos. |
| Llamadas «En cola» que no avanzan | Que estén `ANTHROPIC_API_KEY` (y `DEEPGRAM_API_KEY`) en Vercel; después «Analizar pendientes». |
| «Falta la variable CLAVE_CIFRADO» | Ponerla en Vercel y volver a desplegar. |
| «Hay que volver a pegar el token de GHL / la API key de Fathom» | `CLAVE_CIFRADO` ha cambiado: pegar otra vez el token o la API key. |
| No se pueden subir PDF o CSV | `NEXT_PUBLIC_SUPABASE_URL` tiene que estar en Vercel al compilar: comprobarla y volver a desplegar. |
