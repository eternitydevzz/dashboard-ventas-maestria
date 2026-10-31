// Cada cita se mide por el UTM de la página donde reservó (`tudominio.com/agenda?utm_source=yt`).
// Las páginas tipo `/agenda-yt` o `/agenda-ig` valen igual.
// Sin UTM = «directo». Un UTM que no es de la lista = «otro» (la página queda guardada en la cita).

export const CANALES = ["callers", "yt", "ig", "email", "webinar", "directo", "otro"] as const;
export type Canal = (typeof CANALES)[number];

export const NOMBRE_CANAL: Record<Canal, string> = {
  callers: "Callers",
  yt: "YouTube",
  ig: "Instagram",
  email: "Email",
  webinar: "Webinar",
  directo: "Directo",
  otro: "Otro",
};

// Un solo pipeline de agendas: todas las citas van a «Agendan» de «0. Agendas General»; el canal se ve por la
// etiqueta «Canal: …» y el filtro.
export const PIPELINE_GENERAL = "0. Agendas General";
export const PREFIJO_ETIQUETA = "Canal: ";
export const SIN_CANAL = "sin_canal"; // valor del filtro para las citas sin canal
export const etiquetaCanal = (c: Canal) => `${PREFIJO_ETIQUETA}${NOMBRE_CANAL[c]}`;

// Lo que puede venir en utm_source (en minúsculas)
const ALIAS: Record<string, Canal> = {
  callers: "callers",
  caller: "callers",
  yt: "yt",
  youtube: "yt",
  ig: "ig",
  instagram: "ig",
  email: "email",
  mail: "email",
  webinar: "webinar",
};

// Páginas viejas de agenda (sin UTM)
const PAGINAS: Record<string, Canal> = { "agenda-yt": "yt", "agenda-ig": "ig", "agenda-callers": "callers" };
// Dominios que cuentan como un canal aunque no lleven UTM, p. ej. { "webinar.tudominio.com": "webinar" }
const DOMINIOS: Record<string, Canal> = {};

function leerUrl(url: string) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return null;
  }
}

// `url`: página desde la que reservó · `utmSource`: el que GHL ya separó (si viene). Sin ninguno de los dos: null.
export function canalDeOrigen(url?: string | null, utmSource?: string | null): Canal | null {
  const u = url?.trim() ? leerUrl(url.trim()) : null;
  const utm = (utmSource?.trim() || u?.searchParams.get("utm_source")?.trim() || "").toLowerCase();
  if (utm) return ALIAS[utm] ?? "otro";
  if (!u) return null;
  const pagina = u.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  return PAGINAS[pagina] ?? DOMINIOS[u.hostname.toLowerCase()] ?? "directo";
}

// Para guardar la página sin datos personales: el widget de GHL lleva nombre, email y teléfono en la dirección.
// Se queda con la página y los utm_*.
export function limpiarUrl(url?: string | null): string | null {
  const u = url?.trim() ? leerUrl(url.trim()) : null;
  if (!u) return null;
  const utm = [...u.searchParams].filter(([k]) => k.toLowerCase().startsWith("utm_"));
  const q = new URLSearchParams(utm).toString();
  return `${u.origin}${u.pathname}${q ? `?${q}` : ""}`.slice(0, 500);
}

export function nombreCanal(c: string | null | undefined) {
  return c && c in NOMBRE_CANAL ? NOMBRE_CANAL[c as Canal] : null;
}

// Lo que se ve en una cita de GHL (Llamadas y tablero de Closers): «GHL · YouTube»; sin canal, como antes
export function origenCitaGhl(c: { canal?: string | null }) {
  const n = nombreCanal(c.canal);
  return n ? `GHL · ${n}` : "Calendario GHL";
}
