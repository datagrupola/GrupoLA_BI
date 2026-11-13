"use client";

import { useEffect, useMemo, useState } from "react";

import { operationalMetrics, scopeOperational } from "../lib/larousse-operational.mjs";

const INCIDENT_NAMES = {
  APERTURA_TARDIA: "Apertura tardía",
  APERTURA_NO_REGISTRADA: "Apertura no registrada",
  CIERRE_TEMPRANO: "Cierre temprano",
  CIERRE_NO_REGISTRADO: "Cierre no registrado",
  ACTIVIDAD_FUERA_DE_TIEMPO: "Actividad fuera de tiempo",
  ACTIVIDAD_NO_REGISTRADA: "Actividad no registrada",
  UBICACION_NO_DISPONIBLE: "Ubicación no disponible",
};
const formatNumber = (number) => number.toLocaleString("es-MX");
const datePart = (value, key) => new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit",
}).formatToParts(value).find((x) => x.type === key)?.value;
const todayMexico = () => {
  const now = new Date();
  return [datePart(now, "year"), datePart(now, "month"), datePart(now, "day")].join("-");
};
const currentMonth = () => todayMexico().slice(0, 7);
const daysInMonth = (month) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
const monthDates = (month) => {
  const end = month === currentMonth()
    ? Number(todayMexico().slice(-2))
    : daysInMonth(month);
  return Array.from({ length: end }, (_, i) => month + "-" + String(i + 1).padStart(2, "0"));
};
const dateShort = (date) => new Intl.DateTimeFormat("es-MX", {
  day: "numeric", month: "short", timeZone: "UTC",
}).format(new Date(date + "T12:00:00Z"));
const formatRate = (rate) => rate === null ? "No disponible" : rate.toLocaleString("es-MX", {
  minimumFractionDigits: 1, maximumFractionDigits: 1,
}) + "%";

function Metric({ label, value, note, tone = "regular" }) {
  return (
    <article className={`op-metric op-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

function Trend({ title, values, dates, selected, onSelect, color, note }) {
  const width = 860, top = 34, bottom = 194, left = 36, right = 838;
  const max = Math.max(1, ...values);
  const step = (right - left) / Math.max(1, dates.length - 1);
  const x = (i) => left + i * step;
  const y = (value) => bottom - (value / max) * (bottom - top);
  const points = values.map((value, i) => `${x(i)},${y(value)}`).join(" ");
  const current = Math.max(0, dates.indexOf(selected));
  const active = values[current] ?? 0;
  return (
    <section className="op-panel op-trend" aria-label={title}>
      <div className="op-panel-top">
        <div><h2>{title}</h2>{note && <p>{note}</p>}</div>
        <div className="op-chart-selected"><strong>{formatNumber(active)}</strong><span>{dateShort(dates[current])}</span></div>
      </div>
      <div className="op-chart-scroll">
        <svg viewBox="0 0 860 226" className="op-chart" role="img" aria-label={`${title}; seleccionar un día para ver su valor`}>
          {[0, .25, .5, .75, 1].map((n) => (
            <g key={n}>
              <line x1={left} y1={y(max * n)} x2={right} y2={y(max * n)} stroke="#e3eaf3" strokeDasharray="3 5"/>
              <text x="5" y={y(max * n) + 4} fill="#7b8ba1" fontSize="10">{Math.round(max * n)}</text>
            </g>
          ))}
          {values.length > 1 && <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>}
          {dates.map((date, i) => (
            <g key={date} role="button" tabIndex={0} aria-label={`${date}: ${values[i]}`}
              onFocus={() => onSelect(date)} onMouseEnter={() => onSelect(date)}
              onClick={() => onSelect(date)} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(date); }
              }}>
              <rect x={Math.max(0, x(i) - step / 2)} y={top - 12} width={Math.max(7, step)} height={bottom - top + 28}
                className="op-hit-zone"/>
              {date === selected && <line x1={x(i)} x2={x(i)} y1={top - 12} y2={bottom + 16}
                stroke="#91a8c6" strokeDasharray="4 4" strokeWidth="1.5" pointerEvents="none"/>}
              <circle cx={x(i)} cy={y(values[i])} r={date === selected ? 5.5 : 2.7}
                fill={date === selected ? color : "#fff"} stroke={color} strokeWidth="2" pointerEvents="none"/>
            </g>
          ))}
          {dates.filter((_, i) => i === 0 || (i + 1) % 5 === 0 || i === dates.length - 1).map((date) => (
            <text key={date} x={x(dates.indexOf(date))} y="219" textAnchor="middle"
              fill="#73849b" fontSize="11">{Number(date.slice(-2))}</text>
          ))}
        </svg>
      </div>
    </section>
  );
}

function IncidentBreakdown({ rows }) {
  const list = Object.entries(rows.reduce((acc, row) => {
    acc[row.type] = (acc[row.type] || 0) + row.count;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const maximum = Math.max(1, ...list.map(([, count]) => count));
  return (
    <section className="op-panel" aria-label="Incidencias por tipo">
      <div className="op-panel-top"><h2>Incidencias por tipo</h2></div>
      {list.length ? <div className="op-type-list">
        {list.map(([type, count]) => (
          <div key={type} className="op-type-item">
            <div><span>{INCIDENT_NAMES[type] || type.replaceAll("_", " ")}</span><strong>{formatNumber(count)}</strong></div>
            <div className="op-type-track"><span style={{ width: ((count / maximum) * 100) + "%" }} /></div>
          </div>
        ))}
      </div> : <p className="op-no-data">Sin incidencias registradas para la selección.</p>}
    </section>
  );
}

function BranchRanking({ data, selection }) {
  const items = data.branches.filter((b) => !selection || b.id === selection).map((branch) => {
    const incidents = data.incident_daily.filter((r) => r.branch_id === branch.id)
      .reduce((sum, row) => sum + row.count, 0);
    const tasks = data.task_monthly.find((row) => row.branch_id === branch.id);
    return {
      ...branch, incidents, missedTasks: tasks?.missed_tasks || 0,
      missedCycles: tasks?.missed_cycles || 0,
      onTime: tasks?.on_time_cycles || 0,
    };
  }).sort((a, b) => b.incidents - a.incidents || b.missedTasks - a.missedTasks || a.name.localeCompare(b.name));
  return (
    <section className="op-panel op-ranking" aria-label="Comparación por sucursal">
      <div className="op-panel-top">
        <div><h2>Desempeño por sucursal</h2><p>Incidencias persistidas y vencimientos históricos del mes.</p></div>
      </div>
      <div className="op-table-scroll">
        <table className="op-table">
          <thead><tr>
            <th scope="col">Sucursal</th><th scope="col">Incidencias C1</th>
            <th scope="col">Tareas vencidas</th><th scope="col">Ciclos vencidos</th>
            <th scope="col">Ciclos a tiempo</th><th scope="col">Seguimiento</th>
          </tr></thead>
          <tbody>{items.map((b) => (
            <tr key={b.id}>
              <th scope="row">{b.name}</th>
              <td>{formatNumber(b.incidents)}</td><td>{formatNumber(b.missedTasks)}</td>
              <td>{formatNumber(b.missedCycles)}</td><td>{formatNumber(b.onTime)}</td>
              <td><span className={`op-followup ${b.incidents >= 10 || b.missedTasks >= 1 ? "op-followup-alert" : ""}`}>
                {b.incidents >= 20 ? "C1 ≥ 20" : b.incidents >= 15 ? "C1 ≥ 15" :
                  b.incidents >= 10 ? "C1 ≥ 10" : b.missedTasks >= 2 ? "C2 ≥ 2" :
                  b.missedTasks >= 1 ? "C2 ≥ 1" : "Sin umbral"}
              </span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="op-footnote">Umbrales de seguimiento, no descuentos ni actas automáticas. Las decisiones corresponden a Dirección.</p>
    </section>
  );
}

export default function LaRousseOperationalDashboard() {
  const [month, setMonth] = useState(currentMonth);
  const [branch, setBranch] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [hoveredDate, setHoveredDate] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/larousse/operational?" + new URLSearchParams({ month }), {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw Error("No fue posible consultar las métricas operativas.");
        const payload = await response.json();
        if (!controller.signal.aborted) { setData(payload); setError(""); }
      } catch (problem) {
        if (!controller.signal.aborted) {
          setError(problem.message || "Error de lectura operativa");
          setData(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [month, reload]);

  const scoped = useMemo(() => scopeOperational(data, branch), [data, branch]);

  const metrics = scoped ? operationalMetrics(scoped) : null;
  const dates = monthDates(month);
  const focus = hoveredDate && dates.includes(hoveredDate) ? hoveredDate : dates.at(-1);
  const incidentsByDay = dates.map((date) => (scoped?.incident_daily || [])
    .filter((row) => row.date === date).reduce((s, row) => s + row.count, 0));
  const missedByDay = dates.map((date) => (scoped?.task_cycle_daily || [])
    .filter((row) => row.date === date).reduce((s, row) => s + row.missed_tasks, 0));

  return (
    <div className="lr2 op-dashboard">
      <header className="lr2-header op-header">
        <div><div className="lr2-eyebrow">LA ROUSSE · OPERACIONES</div><h1>Ritmo y cumplimiento</h1></div>
        <div className="lr2-controls">
          <label><span>Mes</span><input type="month" aria-label="Mes operativo"
            value={month} onChange={(event) => {
              if (event.target.value) { setMonth(event.target.value); setLoading(true); setHoveredDate(null); }
            }}/></label>
          <label><span>Sucursal</span><select aria-label="Sucursal operativa" value={branch}
            onChange={(event) => setBranch(event.target.value)}>
            <option value="">Todas las sucursales</option>
            {(data?.branches || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select></label>
          <button type="button" onClick={() => { setLoading(true); setReload((x) => x + 1); }}>Actualizar</button>
        </div>
      </header>
      {loading ? <div className="lr2-loading" role="status">Consultando indicadores operativos…</div> :
        error ? <div className="lr2-loading lr2-error" role="alert">
          {error} <button onClick={() => { setLoading(true); setReload((x) => x + 1); }}>Reintentar</button>
        </div> : scoped && metrics ? <>
          <div className="lr2-updated"><span className="lr2-live-dot" aria-hidden="true" />
            Información consultada {new Date(data.queried_at).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}
            {month === currentMonth() ? " · Mes en curso" : ""}
          </div>
          <section className="op-kpis" aria-label="Indicadores ejecutivos">
            <Metric label="Incidencias · Ritmo Diario" value={formatNumber(metrics.incidents)}
              note="Hechos persistidos en el período" tone="primary" />
            <Metric label="Tareas vencidas · Ad hoc" value={formatNumber(metrics.missedTasks)}
              note="Tareas distintas con vencimiento histórico" tone="danger"/>
            <Metric label="Ciclos vencidos" value={formatNumber(metrics.missedCycles)}
              note="Una tarea puede tener varios ciclos"/>
            <Metric label="Puntualidad · Ad hoc" value={formatRate(metrics.onTimeRate)}
              note={metrics.unknown ? "Existen ciclos sin calificación" : "Ciclos entregados en plazo / evaluados"}/>
          </section>
          <section className="op-secondary-kpis" aria-label="Flujo de tareas">
            <Metric label="Asignadas" value={formatNumber(metrics.assigned)} />
            <Metric label="Aprobadas" value={formatNumber(metrics.approved)} />
            <Metric label="Reabiertas" value={formatNumber(metrics.reopened)} />
          </section>
          <section className="op-trend-grid" aria-label="Evolución diaria">
            <Trend title="Incidencias de Ritmo Diario" values={incidentsByDay} dates={dates}
              selected={focus} onSelect={setHoveredDate} color="#bf4652"
              note="Por FechaOperativa; incluye faltantes materializados."/>
            <Trend title="Tareas vencidas por día" values={missedByDay} dates={dates}
              selected={focus} onSelect={setHoveredDate} color="#245da0"
              note="Tareas distintas por fecha de deadline en México."/>
          </section>
          <section className="op-detail-grid">
            <IncidentBreakdown rows={scoped.incident_daily}/>
            <div className="op-panel op-explanation">
              <h2>Cómo leer este tablero</h2>
              <p>Una incidencia C1 es un hecho registrado. Las tareas vencidas se calculan desde ciclos históricos, aunque hoy estén reabiertas.</p>
              <p>La suma de tareas vencidas por día puede superar el total mensual, porque una tarea puede vencer en dos fechas distintas.</p>
              <p>El porcentaje de cumplimiento de actividades de Ritmo Diario se incorporará únicamente cuando esté disponible el denominador histórico verificado.</p>
            </div>
          </section>
          <BranchRanking data={scoped} selection={branch}/>
          <footer className="op-footer">Grupo LA BI · La Rousse · Fuente operativa: La Rousse Ops · Solo lectura</footer>
        </> : null}
    </div>
  );
}
