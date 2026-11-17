"use client";

import { useEffect, useMemo, useState } from "react";
import { operationalMetrics } from "../lib/larousse-operational.mjs";
import "./LaRousseOperationalDashboard.css";

// Presentational layer only. The source contract, KPI definitions and authorization
// remain in lib/larousse-operational.mjs and app/api/larousse/operational/route.js.
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
  const end = month === currentMonth() ? Number(todayMexico().slice(-2)) : daysInMonth(month);
  return Array.from({ length: end }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
};
const shortDate = (date) => new Intl.DateTimeFormat("es-MX", {
  day: "numeric", month: "short", timeZone: "UTC",
}).format(new Date(date + "T12:00:00Z"));
const formatRate = (rate) => rate === null ? "No disponible" : rate.toLocaleString("es-MX", {
  minimumFractionDigits: 1, maximumFractionDigits: 1,
}) + "%";

function Kpi({ label, value, caption, variant = "neutral", kicker, children }) {
  return (
    <article className={`opx-kpi opx-kpi--${variant}`}>
      {kicker && <span className="opx-kpi-kicker">{kicker}</span>}
      <h3>{label}</h3>
      <div className="opx-kpi-value">{value}</div>
      <p>{caption}</p>
      {children}
    </article>
  );
}

function Trend({ title, description, values, dates, selected, onSelect, color, total }) {
  const left = 35, right = 840, top = 24, bottom = 173;
  const max = Math.max(1, ...values);
  const step = (right - left) / Math.max(1, dates.length - 1);
  const x = (index) => left + index * step;
  const y = (value) => bottom - (value / max) * (bottom - top);
  const coords = values.map((value, i) => `${x(i)},${y(value)}`).join(" ");
  const index = Math.max(0, dates.indexOf(selected));
  return (
    <section className="opx-panel opx-trend" aria-label={title}>
      <div className="opx-panel-heading">
        <div><h3>{title}</h3><p>{description}</p></div>
        <div className="opx-chart-total" aria-label={`Total del mes ${total}`}>
          <strong>{formatNumber(total)}</strong><span>Total mensual</span>
        </div>
      </div>
      <div className="opx-active-day"><span>Fecha seleccionada: {shortDate(dates[index])}</span><strong>{formatNumber(values[index] ?? 0)} incidencias / eventos</strong></div>
      <svg viewBox="0 0 880 208" className="opx-chart" role="img" aria-label={`${title}. Selecciona un día para consultar su valor.`}>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line x1={left} x2={right} y1={y(max * tick)} y2={y(max * tick)} stroke="#e5ebf2" strokeDasharray="4 5" />
            <text x="6" y={y(max * tick) + 4} fontSize="11" fill="#64748b">{Math.round(max * tick)}</text>
          </g>
        ))}
        {values.length > 1 && <polyline points={coords} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>}
        {dates.map((date, i) => (
          <g key={date} tabIndex={0} role="button" aria-label={`${shortDate(date)}: ${values[i]}`}
            onFocus={() => onSelect(date)} onMouseEnter={() => onSelect(date)} onClick={() => onSelect(date)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(date); } }}>
            <rect className="opx-hit-area" x={Math.max(0, x(i) - step / 2)} y={top - 12}
              width={Math.max(9, step)} height={bottom - top + 28} />
            {date === selected && <line x1={x(i)} x2={x(i)} y1={top - 12} y2={bottom + 14}
              stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" pointerEvents="none" />}
            <circle cx={x(i)} cy={y(values[i])} r={date === selected ? 5.4 : 2.9}
              fill={date === selected ? color : "#fff"} stroke={color} strokeWidth="2" pointerEvents="none" />
          </g>
        ))}
        {dates.filter((_, i) => i === 0 || (i + 1) % 5 === 0 || i === dates.length - 1).map((date) => (
          <text key={date} x={x(dates.indexOf(date))} y="203" fill="#64748b" textAnchor="middle" fontSize="11">{Number(date.slice(-2))}</text>
        ))}
      </svg>
    </section>
  );
}

function IncidentBreakdown({ rows }) {
  const sorted = Object.entries(rows.reduce((acc, row) => {
    acc[row.type] = (acc[row.type] || 0) + row.count;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  const max = Math.max(1, ...sorted.map(([, count]) => count));
  return (
    <section className="opx-panel" aria-label="Incidencias por tipo">
      <div className="opx-panel-heading"><div><h3>Incidencias por tipo</h3><p>Composición completa del total C1, incluidas apertura y cierre.</p></div></div>
      {sorted.length ? <div className="opx-types">
        {sorted.map(([type, count]) => <div className="opx-type" key={type}>
          <div className="opx-type-head"><span>{INCIDENT_NAMES[type] || type.replaceAll("_", " ")}</span><b>{formatNumber(count)} <small>({Math.round(count / total * 100)}%)</small></b></div>
          <div className="opx-track"><i style={{ width: `${(count / max) * 100}%` }} /></div>
        </div>)}
      </div> : <p className="opx-empty">Sin incidencias registradas para la selección.</p>}
    </section>
  );
}

function BranchRanking({ data, selection }) {
  const [order, setOrder] = useState("incidents");
  const rows = useMemo(() => data.branches.filter((b) => !selection || b.id === selection).map((branch) => {
    const incidents = data.incident_daily.filter((row) => row.branch_id === branch.id)
      .reduce((sum, row) => sum + row.count, 0);
    const cycles = data.task_monthly.find((row) => row.branch_id === branch.id);
    return {
      ...branch, incidents, missedTasks: cycles?.missed_tasks || 0,
      missedCycles: cycles?.missed_cycles || 0, onTime: cycles?.on_time_cycles || 0,
    };
  }).sort((a, b) => order === "tasks"
    ? b.missedTasks - a.missedTasks || b.incidents - a.incidents || a.name.localeCompare(b.name)
    : b.incidents - a.incidents || b.missedTasks - a.missedTasks || a.name.localeCompare(b.name)), [data, selection, order]);
  const most = rows.length > 1 ? rows[0] : null;
  const least = rows.length > 1 ? [...rows].sort((a, b) => a.incidents - b.incidents || a.missedTasks - b.missedTasks)[0] : null;
  return (
    <section className="opx-panel opx-ranking" aria-label="Comparación por sucursal">
      <div className="opx-panel-heading">
        <div><h3>Desempeño por sucursal</h3><p>Volumen de incidencias y tareas vencidas; no es una tasa de cumplimiento.</p></div>
        <label className="opx-order">Ordenar por
          <select value={order} onChange={(event) => setOrder(event.target.value)} aria-label="Orden de sucursales">
            <option value="incidents">Incidencias C1</option><option value="tasks">Tareas vencidas</option>
          </select>
        </label>
      </div>
      {most && order === "incidents" && <div className="opx-compare-pair">
        <div><span>Mayor volumen C1</span><strong>{most.name}</strong><b>{formatNumber(most.incidents)}</b></div>
        <div><span>Menor volumen C1</span><strong>{least.name}</strong><b>{formatNumber(least.incidents)}</b></div>
      </div>}
      <div className="opx-table-scroll"><table className="opx-table">
        <thead><tr><th scope="col">Sucursal</th><th scope="col">Incidencias C1</th><th scope="col">Tareas vencidas</th><th scope="col">Ciclos vencidos</th><th scope="col">Ciclos a tiempo</th><th scope="col">Seguimiento</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>
          <th scope="row">{row.name}</th><td>{formatNumber(row.incidents)}</td><td>{formatNumber(row.missedTasks)}</td>
          <td>{formatNumber(row.missedCycles)}</td><td>{formatNumber(row.onTime)}</td>
          <td><span className="opx-tags">
            {row.incidents >= 10 && <span className="opx-tag opx-tag--watch">C1 ≥ {row.incidents >= 20 ? 20 : row.incidents >= 15 ? 15 : 10}</span>}
            {row.missedTasks >= 1 && <span className="opx-tag opx-tag--watch">C2 ≥ {row.missedTasks >= 2 ? 2 : 1}</span>}
            {row.incidents < 10 && row.missedTasks === 0 && <span className="opx-tag">Sin umbral</span>}
          </span></td>
        </tr>)}</tbody>
      </table></div>
      <p className="opx-fineprint">Los umbrales son señales de seguimiento; no aplican descuentos, actas ni sanciones automáticamente. Mayor/menor volumen no implica desempeño relativo: no incluye el denominador de actividades esperadas.</p>
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
        if (!controller.signal.aborted) { setError(problem.message || "Error de lectura operativa"); setData(null); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [month, reload]);

  const scoped = useMemo(() => {
    if (!data) return null;
    const within = (row) => !branch || row.branch_id === branch;
    return {
      ...data,
      branches: data.branches.filter((b) => !branch || b.id === branch),
      incident_daily: data.incident_daily.filter(within),
      task_cycle_daily: data.task_cycle_daily.filter(within),
      task_monthly: data.task_monthly.filter(within),
      task_activity_daily: data.task_activity_daily.filter(within),
    };
  }, [data, branch]);
  const metrics = scoped ? operationalMetrics(scoped) : null;
  const dates = monthDates(month);
  const focus = hoveredDate && dates.includes(hoveredDate) ? hoveredDate : dates.at(-1);
  const incidentsByDay = dates.map((date) => (scoped?.incident_daily || [])
    .filter((row) => row.date === date).reduce((sum, row) => sum + row.count, 0));
  const missedByDay = dates.map((date) => (scoped?.task_cycle_daily || [])
    .filter((row) => row.date === date).reduce((sum, row) => sum + row.missed_tasks, 0));
  const includesUnknown = !!metrics?.unknown;
  const noEvaluableDeadlines = !!metrics && !metrics.unknown && !metrics.missedCycles &&
    !scoped.task_monthly.some((row) => row.on_time_cycles > 0);
  const branchTitle = branch ? data?.branches.find((row) => row.id === branch)?.name : "Todas las sucursales La Rousse";
  return (
    <div className="lr2 op-dashboard opx-dashboard">
      <header className="opx-header">
        <div className="opx-title"><span className="opx-eyebrow">LA ROUSSE · INTELIGENCIA OPERATIVA</span>
          <h1>Resumen ejecutivo</h1><p>Ritmo Diario y tareas ad hoc · Información mensual desde La Rousse Ops</p>
        </div>
        <div className="opx-controls">
          <label>Mes <input aria-label="Mes operativo" type="month" value={month} onChange={(event) => {
            if (event.target.value) { setMonth(event.target.value); setLoading(true); setHoveredDate(null); }
          }} /></label>
          <label>Sucursal<select aria-label="Sucursal operativa" value={branch} onChange={(event) => setBranch(event.target.value)}>
            <option value="">Todas las sucursales</option>
            {(data?.branches || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select></label>
          <button type="button" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Actualizar</button>
        </div>
      </header>
      {loading ? <div className="lr2-loading" role="status">Consultando indicadores operativos…</div> :
        error ? <div className="lr2-loading lr2-error" role="alert">{error}
          <button type="button" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Reintentar</button>
        </div> : scoped && metrics ? <>
          <div className="opx-context"><div><span className="opx-status-dot" aria-hidden="true" />
            <strong>{branchTitle}</strong><span> · {month === currentMonth() ? "Mes en curso" : "Mes cerrado"}</span>
          </div><span>Actualizado: {new Date(data.queried_at).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}</span></div>
          <section className="opx-section" aria-labelledby="opx-summary-title">
            <div className="opx-section-title"><div><span>01 · PANORAMA GENERAL</span><h2 id="opx-summary-title">Indicadores que requieren atención</h2></div><p>Lectura mensual · sin comparativo de periodos personalizados</p></div>
            <div className="opx-hero-grid" aria-label="Indicadores ejecutivos">
              <Kpi label="Incidencias · Ritmo Diario" value={formatNumber(metrics.incidents)}
                caption="Total de incidencias C1; incluye apertura, cierre y actividades." kicker="CARRIL 1" variant="primary" />
              <Kpi label="Tareas vencidas · Ad hoc" value={formatNumber(metrics.missedTasks)}
                caption={noEvaluableDeadlines ? "No hubo ciclos con plazo evaluable: cero no equivale a cumplimiento." : "Tareas distintas con vencimiento histórico."}
                kicker="CARRIL 2" variant={metrics.missedTasks ? "alert" : "neutral"} />
              <Kpi label="Puntualidad · Ad hoc" value={formatRate(metrics.onTimeRate)}
                caption={includesUnknown ? "Existen ciclos sin calificación: porcentaje no verificable." : noEvaluableDeadlines ? "Sin ciclos evaluables en el mes." : "Entregas a tiempo entre ciclos evaluados."}
                kicker="CALIDAD DE ENTREGA" variant="neutral" />
              <Kpi label="Ciclos vencidos" value={formatNumber(metrics.missedCycles)}
                caption="Una misma tarea puede registrar varios ciclos." kicker="HISTÓRICO" variant="neutral" />
            </div>
            <div className="opx-flow-strip" aria-label="Flujo de tareas ad hoc">
              <div><span>Asignadas</span><strong>{formatNumber(metrics.assigned)}</strong></div>
              <div><span>Aprobadas</span><strong>{formatNumber(metrics.approved)}</strong></div>
              <div><span>Reabiertas</span><strong>{formatNumber(metrics.reopened)}</strong></div>
              <p>Eventos del mes; las cantidades no representan una misma cohorte de tareas.</p>
            </div>
          </section>
          <section className="opx-section" aria-labelledby="opx-trend-title">
            <div className="opx-section-title"><div><span>02 · EVOLUCIÓN</span><h2 id="opx-trend-title">¿Cuándo ocurrieron las incidencias?</h2></div></div>
            <div className="opx-two-col">
              <Trend title="Incidencias de Ritmo Diario" description="Por FechaOperativa; incluye los faltantes persistidos."
                values={incidentsByDay} dates={dates} selected={focus} onSelect={setHoveredDate}
                color="#bc4958" total={metrics.incidents} />
              <Trend title="Tareas vencidas por día" description="Tareas distintas según fecha límite en México."
                values={missedByDay} dates={dates} selected={focus} onSelect={setHoveredDate}
                color="#2b699d" total={metrics.missedTasks} />
            </div>
          </section>
          <section className="opx-section" aria-labelledby="opx-diagnostic-title">
            <div className="opx-section-title"><div><span>03 · DIAGNÓSTICO</span><h2 id="opx-diagnostic-title">¿Qué está provocando las incidencias?</h2></div></div>
            <div className="opx-detail-layout">
              <IncidentBreakdown rows={scoped.incident_daily} />
              <aside className="opx-panel opx-reading" aria-label="Cómo interpretar el resumen">
                <h3>Lectura para Dirección</h3>
                <p><strong>Ritmo Diario:</strong> el total incluye todas las incidencias C1. Las actividades no registradas y fuera de tiempo son solo una parte de ese total.</p>
                <p><strong>Ad hoc:</strong> una tarea vencida se contabiliza por su histórico, incluso si fue reabierta o cambió de estado posteriormente.</p>
                <p><strong>Cero vencidas:</strong> revisar la existencia de plazos evaluables antes de interpretar el resultado como buen desempeño.</p>
                <p><strong>Cumplimiento de actividades de Ritmo Diario:</strong> no se muestra un porcentaje hasta contar con el denominador histórico verificado.</p>
              </aside>
            </div>
          </section>
          <section className="opx-section" aria-labelledby="opx-branch-title">
            <div className="opx-section-title"><div><span>04 · SUCURSALES</span><h2 id="opx-branch-title">¿Dónde concentrar el seguimiento?</h2></div></div>
            <BranchRanking data={scoped} selection={branch} />
          </section>
          <footer className="opx-footer">Grupo LA BI · La Rousse · Fuente: La Rousse Ops · Consulta de solo lectura · Sin ejecución de incentivos o sanciones</footer>
        </> : null}
    </div>
  );
}
