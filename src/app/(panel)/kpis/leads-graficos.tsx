"use client";

import { useMemo, useState } from "react";
import { preguntasDe, repartir, respuestasA, serieLeads } from "@/lib/leads-cifras";
import { GraficoLeads } from "@/components/grafico-leads";
import type { LeadVista } from "@/lib/leads-vista";
import { ETIQUETA_ESTADO_CALLER, SIN_PAIS, nombrePais } from "@/lib/formato";
import { PREFIJO_ETIQUETA } from "@/lib/canal";
import { Seccion } from "@/components/ui";
import { Barras } from "@/components/barras";
import { AnilloPartes } from "@/components/anillo-partes";
import { Desplegable } from "@/components/eleccion";

type Nombrado = { id: string; nombre: string };
const mismaPregunta = (p: string) => p;

// 1c · L4: los gráficos de la pestaña «Leads», de lo elegido arriba (fuente, periodo, país…)
export function GraficosLeads({ leads, pipelines, etapas, gente, fuente, zona, desde, hasta, embudo, mapa }: { leads: LeadVista[]; pipelines: Nombrado[]; etapas: Nombrado[]; gente: Nombrado[]; fuente: string | null; zona: string; desde: number | null; hasta: number | null; embudo: React.ReactNode; mapa: React.ReactNode }) {
  const nombre = useMemo(() => {
    const m = new Map([...pipelines, ...etapas, ...gente].map((x) => [x.id, x.nombre]));
    return (id: string | null) => (id ? m.get(id) ?? "—" : null);
  }, [pipelines, etapas, gente]);
  const serie = useMemo(() => serieLeads(leads, zona, desde, hasta, (l) => nombre(l.pipelineId) ?? "Sin pipeline"), [leads, zona, desde, hasta, nombre]);
  const columna = (l: LeadVista) => (!fuente ? null : l.pipelineId === fuente ? nombre(l.etapaId) : nombre(l.tarjetas.find((t) => t.pipelineId === fuente)?.etapaId ?? null));
  const canal = (l: LeadVista) => l.etiquetas.find((e) => e.startsWith(PREFIJO_ETIQUETA))?.slice(PREFIJO_ETIQUETA.length) ?? null;
  const barras = (lista: { t: string; n: number; pct: number }[], max = 10) => lista.slice(0, max);

  // Formularios: las respuestas de cada pregunta, eligiendo la pregunta
  const otras = useMemo(() => preguntasDe(leads, mismaPregunta), [leads]);
  const [elegida, setElegida] = useState("");
  const pregunta = otras.some((p) => p.pregunta === elegida) ? elegida : otras[0]?.pregunta ?? "";

  return (
    <div className="space-y-5">
      {/* El mapa, a todo el ancho (lleva su ranking al lado), antes del embudo */}
      {mapa}
      {/* Embudo y leads por día lado a lado en una sola tarjeta; en móvil, uno debajo del otro */}
      <Seccion>
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-0">
          <div className="min-w-0 lg:pr-6">
            <h2 className="titulo-seccion mb-4">Embudo</h2>
            {embudo}
          </div>
          <div className="min-w-0 border-t border-borde pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <h2 className="titulo-seccion mb-4">{serie.porHoras ? "Leads por hora de alta" : "Leads por día de alta"}</h2>
            <GraficoLeads puntos={serie.puntos} porHoras={serie.porHoras} />
          </div>
        </div>
      </Seccion>

      <Seccion titulo="De dónde vienen">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {!fuente && <AnilloPartes titulo="Por fuente" partes={repartir(leads, (l) => nombre(l.pipelineId), "Sin pipeline")} />}
          <AnilloPartes titulo="Por país" partes={repartir(leads, (l) => nombrePais(l.pais), SIN_PAIS)} />
          <AnilloPartes titulo="Canal de la cita" partes={repartir(leads.filter(canal), canal)} />
        </div>
      </Seccion>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {fuente && (
          <Seccion titulo="Por columna">
            <Barras titulo={`En «${nombre(fuente)}»`} filas={barras(repartir(leads, columna, "—"), 12)} numero />
          </Seccion>
        )}
        <Seccion titulo="Estado de la llamada">
          <Barras titulo="Según el caller" filas={barras(repartir(leads, (l) => ETIQUETA_ESTADO_CALLER[l.estado] ?? l.estado))} numero />
        </Seccion>
        <Seccion titulo="Por caller">
          <Barras titulo="Leads asignados" filas={barras(repartir(leads, (l) => nombre(l.callerId), "Sin caller"), 12)} numero />
        </Seccion>
      </div>

      {otras.length > 0 && (
        <Seccion
          titulo="Formularios"
          acciones={
            <Desplegable aria-label="Ver respuestas de" value={pregunta} onChange={(e) => setElegida(e.target.value)} className="campo w-auto max-w-md">
              {otras.map((p) => <option key={p.pregunta} value={p.pregunta}>{`${p.pregunta} (${p.n})`}</option>)}
            </Desplegable>
          }
        >
          {pregunta && (() => {
            const r = respuestasA(leads, pregunta, mismaPregunta);
            return <Barras titulo={`${pregunta} · ${r.total.toLocaleString("es-ES")} respondieron`} filas={r.filas} numero />;
          })()}
        </Seccion>
      )}
    </div>
  );
}
