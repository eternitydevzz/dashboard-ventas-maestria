# Guía · Conectar GoHighLevel (GHL)

Otra guía: [`GUIA-PUBLICAR.md`](GUIA-PUBLICAR.md). Solo funciona **con la app publicada**: GHL no puede llegar a tu ordenador.

> **⚠ comprobar** = cosas que la documentación de GHL no detalla (nombres exactos de algunas variables y disparadores) o menús que pueden cambiar: se eligen en GHL con el selector y se prueban con un contacto de prueba.

---

## Cómo funciona

1. **La app lee GHL por API** (recomendado): cada minuto trae las citas de los calendarios elegidos y los contactos nuevos, y cada contacto entra en su pipeline según su etiqueta. Necesita un **token** (Parte 1).
2. **GHL avisa a la app con webhooks** (Parte 2): para lo que la API no cubre o si prefieres workflows.
3. **Las landings mandan su formulario directo a la app** (Parte 3).
4. **La app avisa a GHL** cuando alguien manda su reporte de fin de día (Parte 4).

Todo lo que hay que copiar está en la app: **Administración → Integraciones GHL** (URL, clave y los cuerpos JSON con botón «Copiar»).

---

## Parte 1 · Token de GHL y lectura por API

### El token

1. En GHL (tu subcuenta): **Settings → Private Integrations → Create**.
2. Dale estos permisos:
   - `calendars/events.readonly` → citas.
   - `contacts.readonly` → datos de cada contacto y contactos nuevos.
   - `locations/customFields.readonly` → el nombre de las preguntas de los formularios.
   - `opportunities.readonly` → en qué pipeline y columna está cada oportunidad (espejo de pipelines y citas sin pipeline).
   - `conversations/message.readonly` → llamadas, grabaciones y transcripciones (opcional).
   - `calendars.readonly` → el nombre de cada calendario (opcional).
3. En la app: **Administración → Integraciones GHL** → pega el token y el **Location ID** de tu subcuenta → Guardar → **Probar conexión**. El token se guarda cifrado y no se vuelve a enseñar.

### Qué calendarios lee la app (una vez, por SQL)

La app lee las citas de los calendarios que tenga apuntados el proyecto. El ID de cada calendario es el final de su enlace de reserva (`…/widget/booking/<ID>`). Se apuntan en Supabase → SQL Editor:

```sql
update public.proyectos
set ghl_calendarios = array['ID_CALENDARIO_1', 'ID_CALENDARIO_2']
where nombre = 'Mi Proyecto';   -- el nombre de tu proyecto en la app
```

Y, si no lo hiciste al publicar, activa la lectura cada minuto (ver GUIA-PUBLICAR, paso 8):

```sql
select public.programar_lectura_ghl('https://tu-app.vercel.app');
```

### Qué hace la lectura

- **Citas:** cada cita entra en «0. Agendas General → Agendan», con su **canal** sacado del UTM de la página donde se reservó (`?utm_source=yt`, `ig`, `email`, `webinar`, `callers`; sin UTM, «directo»). Los canales se cambian en `src/lib/canal.ts`.
- **Contactos nuevos:** cada uno entra en el pipeline de su etiqueta (`PIPELINE_ETIQUETA` en `src/lib/ghl-leads.ts`; por defecto, «lead magnet» → «1. Lead Magnet» y «webinar» → «2. Webinar»). Sin etiqueta conocida, a «0. Agendas General». Con varias, el lead gana una tarjeta 🔗 en cada pipeline.
- **Espejo de pipelines:** en los pipelines de `PIPELINES_ESPEJO` (`src/lib/ghl-espejo.ts`), la app copia las columnas de GHL y mueve cada lead a la misma columna que su oportunidad.
- Si GHL cambia los datos de un lead que ya está, la app se pone al día sin pisar lo que cambió el equipo.

### Calendario e ID de usuario de cada closer

En **Administración → Integraciones GHL → «Calendario de GHL de cada closer (por API)»** (o en la ficha de cada closer → «GHL y Fathom»): el id de su calendario o su **id de usuario** de GHL. Así sus citas se le asignan a él. **Agendas → Llamadas → «Sincronizar GHL»** trae sus citas a mano (de hace 30 días a dentro de 60).

Una cita borrada en GHL pasa a «cancelada» en la app (solo las que siguen abiertas). Una vez terminada en la app (cerrada, no show, perdida…), GHL ya no la cambia.

### Llamadas grabadas (opcional)

1. En **Integraciones GHL → «Llamadas de GHL: quién es quién»** (o en la ficha de cada persona), pon el **id de usuario de GHL** de cada caller y director que llame.
2. **«Traer llamadas de GHL»** trae las llamadas contestadas de más de 1 minuto, las transcribe (con la transcripción de GHL o, si no hay, con Deepgram) y Claude las analiza.
3. La API de GHL **no deja lanzar llamadas** desde la app: se sigue llamando desde GHL.

---

## Parte 2 · Webhooks de GHL → app

> Si la acción **«Custom webhook»** de GHL te da «not enough funds», es porque es premium: usa la acción **«Webhook»** normal, que deja añadir *Custom data* y *Headers*. La app entiende las dos.

### Configuración común

| Campo | Valor |
|---|---|
| Method | **POST** |
| URL | La de Administración → Integraciones GHL («Copiar URL») |
| Headers | Nombre `x-webhook-secreto` · Valor: la clave («Copiar clave») |
| Body | El JSON del workflow (abajo; en «Raw Body» o como *Custom data*) |

La clave va siempre en la cabecera, nunca en la URL (las direcciones quedan guardadas en registros).

### Workflow 1 · Lead nuevo

- **Disparador:** «Form Submitted» o «Contact Created». ⚠ comprobar cuál usas.
- **Body:** el JSON «1 · Lead nuevo» de la app. Cambia `"pipeline"` por el pipeline donde debe entrar (vale sin el número de delante, sin tildes y sin mayúsculas).
- En `customData`, **una línea por pregunta del formulario**: a la izquierda el texto de la pregunta (tal cual quieres verlo en la ficha) y a la derecha la variable del campo. El Webhook normal no manda los campos personalizados por su cuenta.
- Si el **reparto automático** está encendido (Administración → Proyecto y reparto), el lead se asigna solo a un caller según su %.

### Workflow 2 · Cita agendada (solo si no usas la lectura por API)

Si el proyecto tiene calendarios apuntados (Parte 1), este aviso se guarda pero no crea la cita: las citas llegan por la API con su canal.

- **Disparador:** «Customer Booked Appointment». ⚠ comprobar.
- **Body:** el JSON «2 · Cita agendada». `fecha`: la fecha y hora de inicio de la cita; `closer_email`: el email del usuario asignado (el mismo con el que el closer entra en la app, y tiene que estar en el proyecto). Opcional: `pipeline` con el pipeline de la app donde debe ir.
- La app encuentra al lead por el Contact Id de GHL, el email o el teléfono (últimas 9 cifras). Si no existe, lo crea. Si GHL reenvía la misma cita, no se duplica.
- **Agendar por link:** el caller manda al lead el link del calendario (Administración → Proyecto y reparto → «Link de agenda (GHL)») y pulsa **«Link enviado»**. Cuando el lead reserva, la agenda cuenta para quien marcó «Link enviado»; si a los 2 días no hay cita, el lead vuelve a su cola.

### Workflow 3 · Cambio de etapa (normalmente no hace falta)

La app es el CRM principal. Úsalo solo si alguien sigue moviendo oportunidades en GHL: disparador «Pipeline Stage Changed», JSON «3 · Cambio de etapa». El pipeline y la etapa tienen que llamarse igual que en la app.

### Probar

1. En GHL, «Test Workflow» con un contacto de prueba.
2. En la app: **Administración → Integraciones GHL → «Últimos eventos recibidos»**: OK, o el error con lo que falta. Si no aparece nada, revisa la URL y la clave (`401` en los logs de GHL = clave mal puesta).

### Si cambias la clave

Administración → Integraciones GHL → «Nueva clave». Pon la nueva en la cabecera de **todos** tus workflows. La lectura por API la coge sola.

---

## Parte 3 · Landings → app directo

1. **Administración → Entradas (landings) → Nueva entrada**: nombre, pipeline y columna donde entran los leads.
2. Copia su **dirección** y ponla en la landing como destino del formulario (el mismo JSON que mandas a GHL). Cada landing tiene la suya; si ves envíos basura, pulsa «Nueva dirección» y cámbiala en la landing.
3. La app guarda todo lo que llega (UTM, `source`, `event`, `quiz_*`…) y lo enseña en la ficha del lead.
4. **Reglas** (opcional): «si el campo X es Y → este pipeline, esta columna y esta etiqueta».
5. Debajo se ven los últimos envíos con su estado y el JSON entero.

## Parte 4 · App → GHL (avisos de los reportes)

El email del aviso ya lo manda la app con Resend. Esto es para avisar también por WhatsApp:

1. En GHL, crea un workflow con el disparador **«Inbound Webhook»** y copia su URL.
2. En la app: **Administración → Proyecto y reparto → «Webhook de avisos»** → pega la URL → Guardar.
3. Manda un reporte de prueba desde la app (GHL necesita uno para conocer los campos).
4. En el workflow, añade el aviso por WhatsApp (o «Internal Notification») y usa el campo **`texto`** (el reporte entero ya redactado). ⚠ Para mandar un WhatsApp desde un workflow, el destinatario suele tener que existir como contacto en GHL.

**Lo que manda la app en cada reporte:**

| Campo | Qué es |
|---|---|
| `tipo` | `reporte_fin_de_dia` |
| `texto` | El reporte completo en texto |
| `persona`, `rol`, `fecha` | Quién, si es caller o closer, y de qué día |
| `respuestas` | Preguntas y respuestas (se cambian en Administración → Reportes) |
| `tasa_agendamiento`, `tasa_cierre` | Solo en reportes de closer |
| `destinatarios` | Nombre, email y WhatsApp de los directores del proyecto y del CEO |
| `proyecto`, `enviado_en` | Proyecto y hora de envío |

Un reporte por persona y día: si alguien lo manda dos veces el mismo día, el segundo sustituye al primero y el aviso no se repite.

---

Fuente de los permisos y datos de la API: [especificación oficial de la API de GHL](https://github.com/GoHighLevel/highlevel-api-docs).
