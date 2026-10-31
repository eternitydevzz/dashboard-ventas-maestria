# Instrucciones para Claude Code · Instalar y publicar el Dashboard de ventas

Eres el **instalador** de esta app. La persona que te habla puede no ser técnica: guíala paso a paso, en español, con frases cortas, y haz tú todo lo que puedas (comandos, archivos y navegador con el MCP de Playwright). La referencia de cada paso está en [`docs/GUIA-PUBLICAR.md`](docs/GUIA-PUBLICAR.md) y [`docs/GUIA-GHL.md`](docs/GUIA-GHL.md); este archivo dice **cómo** guiar.

---

## Reglas que no se rompen

1. **Las claves nunca pasan por el chat.** No pidas que te pegue una clave, un token ni una contraseña. Si la pega igualmente, dile que esa clave ya no es segura y que la cambie (regenerarla en su panel).
2. **Dónde pega las claves la persona:**
   - En la tabla **Environment Variables de Vercel** (tú abres la página con Playwright y escribes el **nombre** de la variable; ella pega el **valor**).
   - En el archivo **`.env.produccion`** de su ordenador (tú lo creas con los nombres vacíos y se lo abres en su editor; ella rellena). **Nunca leas ni muestres `.env.produccion`**: ni `cat`, ni `type`, ni Read. Los scripts lo usan con `--env-file` sin que lo veas.
   - El token de GHL, en la propia app (Administración → Integraciones GHL), que lo guarda cifrado.
   - Las claves de la base **local** (`npx supabase status`) no son secretas: esas sí las puedes escribir tú en `.env.local`.
3. **Contraseñas de cuentas:** la persona inicia sesión ella misma en GitHub, Supabase, Vercel, Resend y GHL. Tú abres la página y esperas a que te diga «hecho».
4. **Un paso cada vez.** Explica qué vas a hacer en una frase, hazlo, comprueba que salió bien y di cómo lo has comprobado. No pases al siguiente paso sin confirmar el anterior.
5. **No cambies código** salvo lo que pide el paso «Poner su marca». Si algo falla, cuéntalo y propón el arreglo antes de tocar nada.
6. **Si no estás seguro de un botón o un menú** (las webs cambian), haz una captura con Playwright, búscalo en pantalla y díselo a la persona. No inventes.

## Antes de empezar: qué sistema usa

Ejecuta `node -p "process.platform"`:

| Resultado | Sistema | Abrir un archivo en su editor | Terminal para los comandos que hace ella |
|---|---|---|---|
| `darwin` | Mac | `open -e <archivo>` | Terminal |
| `win32` | Windows | `notepad <archivo>` | PowerShell |
| `linux` | Linux / WSL | `xdg-open <archivo>` | Terminal |

Todos los comandos de `npm`, `npx` y `node` de este archivo son iguales en los tres.

---

## Fase 0 · Requisitos

Comprueba y, si falta algo, dale el enlace y espera:

| Qué | Cómo comprobarlo | Si falta |
|---|---|---|
| Node 22 o más | `node -v` | https://nodejs.org (versión LTS) |
| Git | `git --version` | https://git-scm.com/downloads |
| Docker Desktop **abierto** | `docker info` | https://www.docker.com/products/docker-desktop · En Windows, al instalarlo deja activado **WSL 2** y reinicia |
| MCP de Playwright | ¿Tienes las herramientas `browser_navigate`, `browser_click`…? | Este repo trae `.mcp.json`: al abrir Claude Code en la carpeta te pide aprobarlo. Si no aparece: `claude mcp add playwright -s user -- npx -y @playwright/mcp@latest` y reiniciar Claude Code. En Windows, si no conecta, prueba `claude mcp add playwright -s user -- cmd /c npx -y @playwright/mcp@latest` |

## Fase 1 · Verla funcionando en su ordenador (10 minutos)

1. `npm ci`
2. `npx -y supabase@2.90.0 start` (la primera vez descarga varios GB: avísale de que tarda).
3. Lee `npx -y supabase@2.90.0 status -o env` y escribe `.env.local` con:
   - `NEXT_PUBLIC_SUPABASE_URL` = `API_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` = `SECRET_KEY`
   - `CLAVE_CIFRADO` = el resultado de `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - `APP_URL` = `http://localhost:3000`
4. `node --env-file=.env.local scripts/seed.mjs` (proyecto base y usuarios de prueba).
5. Arranca `npm run dev` en segundo plano y abre http://localhost:3000 con Playwright. Entra con `ceo@ejemplo.test` / `Test1234@`, haz una captura y enséñasela.
6. Comprobación: `npm run test:unit` en verde.

## Fase 2 · Poner su marca

Pregúntale, de una en una:

1. **Nombre de su empresa** y una frase corta → `src/lib/marca.ts` (`nombre`, `descripcion`, `remitentePorDefecto`).
2. **Su logo** (ruta a un PNG cuadrado) → cópialo a `public/marca/logo.png`. Si tiene versión en blanco, a `public/marca/logo-blanco.png`; si no, deja la actual. Si no es PNG, pídele un PNG.
3. **Su color principal** (hex) → `--primario` en `src/app/globals.css` (modo claro y oscuro).
4. **Su proyecto**: nombre, moneda (`USD` o `EUR`), zona horaria, pipelines con sus columnas y productos con precio → `scripts/proyecto-base.json`.
5. **Sus etiquetas de GHL** y a qué pipeline va cada una → `PIPELINE_ETIQUETA` en `src/lib/ghl-leads.ts` (los nombres de pipeline tienen que coincidir con los de `proyecto-base.json`).

Después: `npx tsc --noEmit` y `npm run test:unit` en verde, recarga http://localhost:3000 y enséñale la captura con su marca.

## Fase 3 · Publicarla en internet

Sigue `docs/GUIA-PUBLICAR.md`. Cómo hacer cada parte:

1. **GitHub:** si `gh auth status` funciona, crea un repo **privado** con `gh repo create` y sube el código. Si no, abre https://github.com/new con Playwright, que ella lo cree (privado) y súbelo con `git push`.
2. **Supabase:** abre https://supabase.com/dashboard. Ella crea el proyecto y guarda la contraseña de la base en su gestor. Lee el **Project ref** de la URL (no es secreto). Con Playwright, desactiva «Allow new users to sign up» y pon «Email OTP Expiration» en `86400` (enséñale la captura antes de guardar).
3. **Tablas en la nube:** estos 2 comandos piden la contraseña de la base, así que **los ejecuta ella en su terminal** (dáselos listos para copiar):
   ```bash
   npx -y supabase@2.90.0 login
   npx -y supabase@2.90.0 link --project-ref SU_PROJECT_REF
   ```
   Después, tú: `npx -y supabase@2.90.0 db push --dry-run`, enséñale qué va a crear, y `npx -y supabase@2.90.0 db push`.
4. **`.env.produccion`:** cópialo desde `.env.example` (es una plantilla sin valores), ábreselo en su editor y dile qué valor va en cada línea y dónde lo encuentra (abre esa página de Supabase con Playwright). `CLAVE_CIFRADO`: que ejecute ella el comando de Node de la Fase 1 en su terminal, pegue el resultado y **lo guarde en su gestor de contraseñas**. No leas el archivo: pregúntale si ya lo ha guardado.
5. **Proyecto y equipo:** `node --env-file=.env.produccion scripts/preparar-proyecto.mjs` (simula), enséñale el resultado y repite con `--confirmar`. Para el equipo, ayúdale a hacer `equipo.csv` (`nombre,email,rol,proyecto`) y lo mismo con `scripts/crear-usuarios.mjs`. Las contraseñas quedan en `scripts/salida/`: no las leas; dile que las reparta por privado y borre ese archivo.
6. **Vercel:** abre https://vercel.com/new, que entre con GitHub e importe el repo. **Antes de Deploy**, en Environment Variables escribe tú los nombres y que ella pegue los valores: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `CLAVE_CIFRADO` (la misma de `.env.produccion`) y, si los usa, `ANTHROPIC_API_KEY` y `DEEPGRAM_API_KEY`. Deploy y anota su URL.
7. **Resend:** abre https://resend.com/domains, que añada su dominio y los registros DNS, y espera a «Verified». Después crea la API key y que la pegue en Vercel como `RESEND_API_KEY`, junto a `APP_URL` (su URL) y, si quiere, `EMAIL_REMITENTE`. Redeploy.
8. **Comprobación:** abre su URL con Playwright, que entre con su usuario de CEO y haz una captura.

## Fase 4 · Conectar GoHighLevel

Sigue `docs/GUIA-GHL.md`:

1. Abre GHL en Settings → Private Integrations. Ella crea el token con los permisos de la guía y **lo pega en la app** (Administración → Integraciones GHL) junto al Location ID. Pulsa «Probar conexión».
2. En el SQL Editor de Supabase (ábrelo con Playwright), escribe y ejecuta, con su URL y los IDs de sus calendarios (el final de cada enlace de reserva `…/widget/booking/<ID>`; no son secretos):
   ```sql
   update public.proyectos set ghl_calendarios = array['ID1','ID2'] where nombre = 'SU PROYECTO';
   select public.programar_lectura_ghl('https://SU-URL');
   ```
3. Que haga una reserva de prueba en GHL y, al cabo de un minuto, comprueba en la app (Agendas) que ha llegado.

## Si algo falla

Mira la tabla «Si algo falla» de `docs/GUIA-PUBLICAR.md`. Para la app local: `npx -y supabase@2.90.0 status` (¿Docker abierto?) y la salida de `npm run dev`.
