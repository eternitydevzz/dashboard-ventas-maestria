"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, PhoneCall, Search, ShoppingCart, UserX, Users } from "lucide-react";
import { cargandoDatos } from "@/lib/pantalla-lista";
import { exigirOk } from "@/lib/resultado-cliente";
import { cargarLeadsPestana } from "./acciones";
import { descompactarLeads, type LeadsCompactos, type LeadVista } from "@/lib/leads-vista";
import { cifras, compararFuentes, embudo, filtrarLeads, filtrarSinFuente, paisDe, repartir } from "@/lib/leads-cifras";
import { ETIQUETA_ESTADO_CALLER, SIN_PAIS, nombrePais, pct } from "@/lib/formato";
import { PREFIJO_ETIQUETA } from "@/lib/canal";
import { Kpi, Seccion } from "@/components/ui";
import { EmbudoVidrio } from "@/components/embudo-vidrio";

// Qué cuenta cada paso del embudo (sale al pasar el ratón); las reglas son las de KPIs (lib/leads-vista.ts → marcasEmbudo)
const DETALLE_PASO = [
  "Los leads elegidos arriba (fuente, periodo, país…).",
  "Tienen una llamada o un WhatsApp apuntado, o agendaron.",
  "Contestaron una llamada (no «no contesta»), o agendaron.",
  "Tienen al menos una cita (también si luego se canceló).",
  "Fueron a la llamada: cita cerrada, en seguimiento o perdida.",
  "Tienen al menos una venta.",
];
import { Desplegable } from "@/components/eleccion";
import { PopupLead } from "@/components/popup-lead";
import { Modal } from "@/components/modal";
import { MapaPaises } from "@/components/mapa-paises";
import { GraficosLeads } from "./leads-graficos";
import { AccionesLeads } from "./leads-acciones";

// 1c: KPIs → «Leads». Todos los leads del proyecto para decidir a quién llamar, ver cómo rinde
// cada fuente (pipeline, con sus 🔗) y conocer al público. Los datos llegan compactos justo después de pintar
// (lib/leads-kpis.ts) y todo lo demás se calcula aquí: cambiar un filtro no pide nada a la base.
export function PestanaLeads({ barra, desde, hasta, zona, csv }: { barra: React.ReactNode; desde: number | null; hasta: number | null; zona: string; csv: React.ReactNode }) {
  const [datos, setDatos] = useState<LeadsCompactos | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let vivo = true;
    // Mientras llegan, la precarga del menú espera (lib/pantalla-lista.ts)
    const listo = cargandoDatos();
    exigirOk(cargarLeadsPestana())
      .then((d) => vivo && setDatos(d as LeadsCompactos))
      .catch((e) => vivo && setError(e instanceof Error ? e.message : "No se pudieron cargar los leads."))
      .finally(listo);
    return () => {
      vivo = false;
      listo();
    };
  }, []);
  const vista = useMemo(() => (datos ? descompactarLeads(datos) : null), [datos]);
  // Mientras cargan (o si fallan), las pestañas y el periodo siguen arriba para poder cambiar de pestaña
  if (error)
    return (
      <>
        <div className="tarjeta px-4">{barra}</div>
        <p className="text-sm text-mal">{error}</p>
      </>
    );
  if (!vista)
    return (
      <>
        <div className="tarjeta px-4">{barra}</div>
        {/* data-datos-pendientes: llega en el HTML desde el principio; mientras está, el menú no precarga (lib/pantalla-lista.ts) */}
        <div className="animate-pulse space-y-3" aria-busy="true" data-datos-pendientes="">
          <p className="text-sm text-texto-3">Cargando todos los leads…</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-panel-2" />)}</div>
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-9 rounded-lg bg-panel-2" />)}
        </div>
      </>
    );
  return <Contenido barra={barra} vista={vista} desde={desde} hasta={hasta} zona={zona} csv={csv} />;
}

type Vista = ReturnType<typeof descompactarLeads>;

function Contenido({ barra, vista, desde, hasta, zona, csv }: { barra: React.ReactNode; vista: Vista; desde: number | null; hasta: number | null; zona: string; csv: React.ReactNode }) {
  const { pipelines, etapas, gente, leads } = vista;
  const [fuente, setFuente] = useState<string | null>(null);
  const [pais, setPais] = useState("");
  const [sinCaller, setSinCaller] = useState(false);
  const [q, setQ] = useState("");
  const [paisVentana, setPaisVentana] = useState<string | null>(null);

  const base = useMemo(() => ({ desde, hasta, pais, sinCaller, q }), [desde, hasta, pais, sinCaller, q]);
  const sinFuente = useMemo(() => filtrarSinFuente(leads, base), [leads, base]);
  const visibles = useMemo(() => filtrarLeads(leads, { ...base, pipelineId: fuente }), [leads, base, fuente]);
  // El filtro de país enseña los países de lo elegido sin contar el propio país (si no, solo saldría el elegido)
  const paises = useMemo(() => repartir(filtrarLeads(leads, { ...base, pais: "", pipelineId: fuente }), paisDe, SIN_PAIS), [leads, base, fuente]);
  const c = cifras(visibles);
  const fuentes = useMemo(() => compararFuentes(sinFuente, pipelines), [sinFuente, pipelines]);

  return (
    <div className="space-y-5">
      {/* Qué ver: fuente (con su número), país, sin caller y búsqueda */}
      {/* Boceto B: pestañas con subrayado y el periodo ligero a la derecha. La fuente se elige en
          «Cómo rinde cada fuente» (las fichas de fuente de aquí se quitaron: repetían esa tabla) */}
      <div className="tarjeta space-y-3 px-4 pb-3.5">
        {barra}
        {/* Móvil: buscador y «Sin caller» en una línea; el país en la siguiente */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-auto">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-texto-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lead…" title="Busca por nombre, email, teléfono, país o etiqueta" className="campo pl-9" aria-label="Buscar leads" />
            </div>
            <label className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm text-texto-2 sm:order-last"><input type="checkbox" className="interruptor" checked={sinCaller} onChange={(e) => setSinCaller(e.target.checked)} /> Sin caller</label>
          </div>
          <div className="flex w-full min-w-0 gap-2 sm:w-auto">
          <Desplegable aria-label="País" value={pais} onChange={(e) => setPais(e.target.value)} className="campo min-w-0 flex-1 sm:w-44 sm:flex-none" title="País del lead (por el código de su teléfono)">
            <option value="">Todos los países</option>
            {paises.map((p) => <option key={p.t} value={p.t}>{`${nombrePais(p.t)} (${p.n})`}</option>)}
          </Desplegable>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {/* A mitad de tamaño: textos cortos; el entero, al pasar el ratón */}
        <Kpi compacto titulo="Leads" valor={c.total.toLocaleString("es-ES")} icono={Users} detalle={fuente ? pipelines.find((p) => p.id === fuente)?.nombre : "Todas las fuentes"} />
        <Kpi compacto titulo="Sin caller" valor={c.sinCaller.n.toLocaleString("es-ES")} icono={UserX} tono="aviso" detalle={`${pct(c.sinCaller.pct)} del total`} />
        <Kpi compacto titulo="Contactados" valor={c.contactados.n.toLocaleString("es-ES")} icono={PhoneCall} detalle={`${pct(c.contactados.pct)} del total`} ayuda="Con una llamada o un WhatsApp apuntado, o que agendaron" />
        <Kpi compacto titulo="Agendados" valor={c.agendados.n.toLocaleString("es-ES")} icono={CalendarCheck} tono="ok" detalle={`${pct(c.agendados.pct)} del total`} />
        <Kpi compacto titulo="Compraron" valor={c.compran.n.toLocaleString("es-ES")} icono={ShoppingCart} tono="oro" detalle={`${pct(c.compran.pct)} del total`} />
      </div>

      {/* La tabla sola a todo el ancho: al lado de ella, el embudo quedaba estrecho y cortaba los pasos pequeños («Co…») */}
      <div className="space-y-5">
        {/* Cómo rinde cada fuente. Más compacta y sin título: filas y letra más pequeñas, mismo estilo */}
        <Seccion>
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-5">
            <table className="tabla [&_td]:py-1.5 [&_td]:text-[13px] [&_th]:py-1.5 [&_th]:text-[10px]">
              <thead>
                <tr><th>Fuente</th><th className="text-right">Leads</th><th className="text-right">Sin caller</th><th className="text-right">Contactados</th><th className="text-right">Contestan</th><th className="text-right">Agendan</th><th className="text-right">Asisten</th><th className="text-right">Compran</th></tr>
              </thead>
              <tbody>
                {fuentes.map((f) => (
                  <tr key={f.id ?? "todos"} className={`cursor-pointer hover:bg-panel-2 ${fuente === f.id ? "bg-primario-suave/40" : ""}`} onClick={() => setFuente(f.id)}>
                    <td className="whitespace-nowrap font-medium">{f.nombre}</td>
                    <td className="text-right tabular-nums">{f.pasos[0].n.toLocaleString("es-ES")}</td>
                    <td className="text-right tabular-nums">{f.sinCaller.toLocaleString("es-ES")}</td>
                    {f.pasos.slice(1).map((p) => (
                      <td key={p.t} className="whitespace-nowrap text-right tabular-nums">{p.n.toLocaleString("es-ES")} <small className="text-texto-3">{pct(p.pct)}</small></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>
      </div>

      {/* L4 y L5: gráficos y mapa de lo elegido. El embudo va en la misma tarjeta que los leads por día */}
      <GraficosLeads
        embudo={<EmbudoVidrio pasos={embudo(visibles).map((p, i) => ({ t: p.t, n: p.n, d: DETALLE_PASO[i] }))} />}
        leads={visibles}
        pipelines={pipelines}
        etapas={etapas}
        gente={gente}
        fuente={fuente}
        zona={zona}
        desde={desde}
        hasta={hasta}
        mapa={
          <Seccion titulo="Mapa">
            <MapaPaises paises={repartir(visibles, paisDe, SIN_PAIS).map((p) => ({ pais: p.t, n: p.n }))} alElegir={setPaisVentana} />
          </Seccion>
        }
      />

      <Seccion
        titulo="Todos los datos"
        acciones={
          <div className="flex flex-wrap items-center gap-2">
            {csv}
            <AccionesLeads leads={visibles} pipelines={pipelines} etapas={etapas} gente={gente} fuente={fuente} callers={gente.filter((g) => g.rol === "caller" && !g.baja)} repartir="Repartir lo que ves" />
          </div>
        }
      >
        <TablaLeads leads={visibles} pipelines={pipelines} etapas={etapas} gente={gente} fuente={fuente} />
      </Seccion>
      {paisVentana && (
        <VentanaPais
          pais={paisVentana}
          leads={visibles.filter((l) => paisDe(l) === paisVentana)}
          pipelines={pipelines}
          etapas={etapas}
          gente={gente}
          fuente={fuente}
          onCerrar={() => setPaisVentana(null)}
        />
      )}
    </div>
  );
}

const POR_PAGINA = 100;

function TablaLeads({ leads, pipelines, etapas, gente, fuente }: { leads: LeadVista[]; pipelines: Vista["pipelines"]; etapas: Vista["etapas"]; gente: Vista["gente"]; fuente: string | null }) {
  const nombre = useMemo(() => {
    const m = new Map<string, string>([...pipelines, ...etapas, ...gente].map((x) => [x.id, x.nombre]));
    return (id: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [pipelines, etapas, gente]);
  const [col, setCol] = useState("alta");
  const [dir, setDir] = useState(-1);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [ficha, setFicha] = useState<LeadVista | null>(null);

  // Dónde está en lo elegido: su columna en ese pipeline (la principal o la de su 🔗)
  const donde = (l: LeadVista) => {
    if (!fuente || l.pipelineId === fuente) return { pipeline: nombre(l.pipelineId), columna: nombre(l.etapaId) };
    const t = l.tarjetas.find((x) => x.pipelineId === fuente);
    return { pipeline: `🔗 ${nombre(fuente)}`, columna: nombre(t?.etapaId ?? null) };
  };
  const filas = useMemo(
    () =>
      leads.map((l) => {
        const respuestas = l.respuestas.filter((x) => x.respuesta).length;
        const canal = l.etiquetas.find((e) => e.startsWith(PREFIJO_ETIQUETA))?.slice(PREFIJO_ETIQUETA.length) ?? null;
        return { l, respuestas, canal, d: donde(l) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, fuente, nombre]
  );
  type Fila = (typeof filas)[number];
  const COLS: { k: string; t: string; d?: string; v: (f: Fila) => string | number | null }[] = [
    { k: "nombre", t: "Nombre", v: (f) => f.l.nombre || null },
    { k: "telefono", t: "Teléfono", v: (f) => f.l.telefono },
    { k: "pais", t: "País", v: (f) => nombrePais(f.l.pais) },
    { k: "email", t: "Email", v: (f) => f.l.email },
    { k: "alta", t: "Alta", v: (f) => f.l.alta },
    { k: "caller", t: "Caller", v: (f) => (f.l.callerId ? nombre(f.l.callerId) : null) },
    { k: "pipeline", t: "Pipeline → columna", v: (f) => `${f.d.pipeline} ${f.d.columna}` },
    { k: "closer", t: "Closer", v: (f) => (f.l.closerId ? nombre(f.l.closerId) : null) },
    { k: "estado", t: "Estado", v: (f) => ETIQUETA_ESTADO_CALLER[f.l.estado] ?? f.l.estado },
    { k: "estrellas", t: "★", v: (f) => f.l.estrellas },
    { k: "canal", t: "Canal", v: (f) => f.canal },
    { k: "fuente", t: "Origen", v: (f) => f.l.fuente },
    { k: "respuestas", t: "Respuestas", d: "Respuestas de formularios (se ven en su ficha)", v: (f) => f.respuestas || null },
    { k: "etiquetas", t: "Etiquetas", v: (f) => (f.l.etiquetas.length ? f.l.etiquetas.join(", ") : null) },
  ];
  const ordenadas = useMemo(() => {
    const c = COLS.find((x) => x.k === col) ?? COLS[0];
    return [...filas].sort((a, b) => {
      const x = c.v(a);
      const y = c.v(b);
      if (x === y) return b.l.alta - a.l.alta;
      if (x === null) return 1; // los vacíos, siempre al final
      if (y === null) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es")) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, col, dir]);
  const ordenar = (k: string) => {
    if (k === col) setDir(-dir);
    else {
      setCol(k);
      setDir(k === "alta" || k === "estrellas" || k === "respuestas" ? -1 : 1);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-texto-3">
        Mostrando {Math.min(limite, ordenadas.length).toLocaleString("es-ES")} de {ordenadas.length.toLocaleString("es-ES")}. Clic en una fila para ver todos sus datos y formularios; clic en un título para ordenar.
      </div>
      <div className="-mx-4 overflow-x-auto sm:-mx-5">
        <table className="tabla">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.k} aria-sort={col === c.k ? (dir === 1 ? "ascending" : "descending") : "none"}>
                  <button type="button" className="flex items-center gap-1 whitespace-nowrap" title={c.d} onClick={() => ordenar(c.k)}>
                    {c.t}<span className="text-texto-3">{col === c.k ? (dir === 1 ? "▲" : "▼") : "↕"}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenadas.slice(0, limite).map(({ l, respuestas, canal, d }) => (
              <tr key={l.id} tabIndex={0} className="cursor-pointer hover:bg-panel-2" onClick={(e) => !(e.target as HTMLElement).closest("a") && setFicha(l)} onKeyDown={(e) => e.key === "Enter" && setFicha(l)}>
                <td className="whitespace-nowrap font-medium">{l.nombre || <span className="text-texto-3">Sin nombre</span>}</td>
                <td className="whitespace-nowrap">{l.telefono ?? "—"}</td>
                <td className="whitespace-nowrap">{nombrePais(l.pais)}</td>
                <td>{l.email ? <a href={`mailto:${l.email}`} className="text-primario hover:underline">{l.email}</a> : "—"}</td>
                <td className="whitespace-nowrap tabular-nums">{new Date(l.alta).toLocaleDateString("es-ES")}</td>
                <td className="whitespace-nowrap text-texto-2">{l.callerId ? nombre(l.callerId) : "—"}</td>
                <td className="whitespace-nowrap text-texto-2">{d.pipeline} → {d.columna}{l.tarjetas.length > 0 && !fuente ? <span className="text-texto-3" title={l.tarjetas.map((t) => nombre(t.pipelineId)).join(" · ")}> · 🔗{l.tarjetas.length}</span> : null}</td>
                <td className="whitespace-nowrap text-texto-2">{l.closerId ? nombre(l.closerId) : "—"}</td>
                <td className="whitespace-nowrap">{ETIQUETA_ESTADO_CALLER[l.estado] ?? l.estado}</td>
                <td className="tabular-nums">{l.estrellas ?? "—"}</td>
                <td className="whitespace-nowrap">{canal ?? "—"}</td>
                <td className="whitespace-nowrap text-texto-2">{l.fuente ?? "—"}</td>
                <td className="tabular-nums">{respuestas || "—"}</td>
                <td><div className="flex gap-1 whitespace-nowrap">{l.etiquetas.map((t) => <span key={t} className="chip bg-panel-2 text-texto-3">{t}</span>)}</div></td>
              </tr>
            ))}
            {ordenadas.length === 0 && <tr><td colSpan={COLS.length} className="py-6 text-center text-texto-3">No hay leads con esos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      {ordenadas.length > limite && <button onClick={() => setLimite((x) => x + POR_PAGINA)} className="w-full rounded-lg py-2 text-sm text-primario hover:bg-panel-2">Ver {Math.min(POR_PAGINA, ordenadas.length - limite)} más</button>}
      {ficha && <PopupLead leadId={ficha.id} nombre={ficha.nombre} onCerrar={() => setFicha(null)} />}
    </div>
  );
}

// clic en un país del mapa o del ranking → las personas de ese país (con los filtros de arriba)
// en la misma tabla que «Todos los datos»: clic en un título para ordenar y clic en una
// persona para ver su ficha. Exportar y repartir, solo los de ese país.
function VentanaPais({ pais, leads, pipelines, etapas, gente, fuente, onCerrar }: { pais: string; leads: LeadVista[]; pipelines: Vista["pipelines"]; etapas: Vista["etapas"]; gente: Vista["gente"]; fuente: string | null; onCerrar: () => void }) {
  return (
    <Modal titulo={`${nombrePais(pais)} · ${leads.length.toLocaleString("es-ES")} ${leads.length === 1 ? "lead" : "leads"}`} onCerrar={onCerrar} ancho="max-w-6xl">
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <AccionesLeads leads={leads} pipelines={pipelines} etapas={etapas} gente={gente} fuente={fuente} callers={gente.filter((g) => g.rol === "caller" && !g.baja)} repartir={`Repartir ${nombrePais(pais)}`} />
      </div>
      <div className="-mx-5 max-h-[65vh] overflow-y-auto px-5">
        <TablaLeads leads={leads} pipelines={pipelines} etapas={etapas} gente={gente} fuente={fuente} />
      </div>
    </Modal>
  );
}
