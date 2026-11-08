"use client";
import { useEffect, useState } from "react";
import { money, summarize } from "../lib/larousse.mjs";
import {
  commercialMetrics,
  commercialCutoffDate,
  commercialProjection,
  formatHundredths,
  percent,
  sumUnits,
} from "../lib/larousse-commercial.mjs";
const LOOKER =
  "https://datastudio.google.com/reporting/055e6005-5133-498d-8a93-4960dbc60f1b";
const number = (n) =>
  n === null ? "No disponible" : n.toLocaleString("es-MX");
function currentMonth() {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return (
    p.find((x) => x.type === "year").value +
    "-" +
    p.find((x) => x.type === "month").value
  );
}
function Card({ label, value, note, hero = false }) {
  return (
    <article className={hero ? "lr2-hero" : "lr2-metric"}>
      <span className="lr2-metric-label">{label}</span>
      <strong className="lr2-metric-value">{value}</strong>
      {note && <span className="lr2-metric-foot">{note}</span>}
    </article>
  );
}
function visualProgress(net, target) {
  if (net === null || target === null || target <= 0n) return null;
  const value = net * 10000n / target;
  return Number(value > 10000n ? 10000n : value) / 100;
}
function GoalProgress({ metrics }) {
  const width = visualProgress(metrics.fullNet, metrics.target);
  const label = percent(metrics.fullNet, metrics.target);
  return (
    <article className="lr4-goal" aria-label="Avance contra meta">
      <div className="lr4-goal-head"><span>Avance contra meta</span><strong>{label}</strong></div>
      <div className={"lr4-track" + (width === null ? " lr4-track-empty" : "")}
        role={width === null ? undefined : "progressbar"}
        aria-label="Cumplimiento de la meta"
        aria-valuemin={width === null ? undefined : 0}
        aria-valuemax={width === null ? undefined : 100}
        aria-valuenow={width === null ? undefined : width}
        aria-valuetext={label}>
        {width !== null && <span style={{ width: width + "%" }} />}
      </div>
      <small>{metrics.remaining === null ? "Sin datos suficientes para calcular el avance" :
        metrics.remaining === 0n ? "Meta alcanzada" :
        <>Faltan <strong>{money(metrics.remaining)}</strong></>}</small>
    </article>
  );
}
function Forecast({ forecast }) {
  const date = (value) => value ? new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(value + "T00:00:00Z")) : "No disponible";
  return (
    <article className="lr7-forecast">
      <span className="lr2-metric-label">Proyección de cierre</span>
      <strong className="lr7-forecast-value">{money(forecast.projectedNet)}</strong>
      <div className="lr7-forecast-details">
        <div><span>Ritmo observado</span><b>{money(forecast.observedDaily)} / día reportado</b></div>
        <div><span>Corte global</span><b>{date(forecast.globalDate)}</b></div>
      </div>
      {forecast.projectedNet !== null && forecast.expectedPairs !== null &&
        forecast.countedPairs < forecast.expectedPairs && (
          <small className="lr7-forecast-warning">
            Cobertura de fechas parcial: {forecast.countedPairs}/{forecast.expectedPairs} sucursal-días registrados.
          </small>
        )}
      {forecast.scopedDate !== null && forecast.globalDate !== null &&
        forecast.scopedDate < forecast.globalDate && (
          <small className="lr7-forecast-warning">
            Último corte de la selección: {date(forecast.scopedDate)}.
          </small>
        )}
      {forecast.projectedNet === null && (
        <small className="lr7-forecast-warning">
          Sin proyección comparable o sin fecha global verificada.
        </small>
      )}
    </article>
  );
}
function Daily({ rows }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const observedDates = [...new Set(rows.map((row) => row.date))].sort();
  const dates = [];
  if (observedDates.length) {
    const cursor = new Date(observedDates[0] + "T00:00:00Z");
    const last = new Date(observedDates[observedDates.length - 1] + "T00:00:00Z").getTime();
    while (cursor.getTime() <= last) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  // Missing dates and incomplete reports are gaps, never zero-valued sales.
  const daily = dates.map((date) => {
    const dayRows = rows.filter((row) => row.date === date);
    return {
      date,
      ...(dayRows.length ? summarize(dayRows) : { count: 0, known: 0, net: null }),
    };
  });
  const known = daily.filter((day) => day.net !== null);
  const selected = daily.find((day) => day.date === selectedDate)
    || known[known.length - 1] || daily[daily.length - 1];
  const maxKnown = known.reduce((high, day) => day.net > high ? day.net : high, 0n);
  const chartMax = maxKnown > 0n ? maxKnown : 100n;
  const chartWidth = Math.max(700, daily.length * 42);
  const chartHeight = 280;
  const left = 100, right = 24, top = 16, bottom = 39;
  const chartBase = chartHeight - bottom;
  const chartInnerHeight = chartBase - top;
  const pointX = (index) => left + (daily.length === 1 ? (chartWidth - left - right) / 2 :
    index * (chartWidth - left - right) / (daily.length - 1));
  const pointY = (amount) => chartBase -
    Number(amount * BigInt(chartInnerHeight) / chartMax);
  const points = daily.map((day, index) => ({
    ...day, x: pointX(index), y: day.net === null ? null : pointY(day.net),
  }));
  const segments = [];
  let current = [];
  for (const point of points) {
    if (point.y === null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push(point);
    }
  }
  if (current.length) segments.push(current);
  const axisMoney = (amount) => new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", notation: "compact", maximumFractionDigits: 1,
  }).format(Number(amount) / 100);
  const dayLabel = (date) => date
    ? new Intl.DateTimeFormat("es-MX", {
        day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
      }).format(new Date(date + "T00:00:00Z"))
    : "";
  const tickStep = Math.max(1, Math.ceil(points.length / 11));
  return (
    <section className="lr2-panel lr6-daily">
      <h2>Evolución diaria de ventas</h2>
      {!daily.length ? (
        <p className="lr2-empty">No hay cortes comerciales comparables para mostrar.</p>
      ) : (
        <>
          <div className="lr6-selected">
            <div>
              <span>Venta neta del día</span>
              <strong>{money(selected.net)}</strong>
            </div>
            <time dateTime={selected.date}>{dayLabel(selected.date)}</time>
          </div>
          <div className="lr6-scroll" role="region" aria-label="Gráfica de ventas diarias" tabIndex={0}>
            <svg className="lr6-chart" width={chartWidth} height={chartHeight}
              viewBox={"0 0 " + chartWidth + " " + chartHeight}
              role="group" aria-label="Serie temporal de ventas netas diarias">
              {Array.from({ length: 5 }, (_, i) => {
                const amount = chartMax * BigInt(4 - i) / 4n;
                const y = top + (chartInnerHeight * i) / 4;
                return (
                  <g key={"tick-" + i}>
                    <line className="lr6-grid" x1={left} y1={y}
                      x2={chartWidth - right} y2={y} />
                    <text className="lr6-axis" textAnchor="end" x={left - 12} y={y + 4}>
                      {axisMoney(amount)}
                    </text>
                  </g>
                );
              })}
              {points.map((point, index) =>
                index % tickStep === 0 || index === points.length - 1 ? (
                  <text key={"date-" + point.date} className="lr6-axis"
                    x={point.x} y={chartHeight - 11} textAnchor="middle">
                    {point.date.slice(8)}
                  </text>
                ) : null
              )}
              {segments.map((segment, index) =>
                segment.length > 1 ? (
                  <polyline key={"segment-" + index} className="lr6-series"
                    points={segment.map((point) => point.x + "," + point.y).join(" ")}
                    fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : null
              )}
              {points.filter((point) => point.y !== null).map((point) => (
                <g key={point.date} role="button" tabIndex={0}
                  aria-label={dayLabel(point.date) + ": " + money(point.net)}
                  aria-pressed={selected.date === point.date}
                  onMouseEnter={() => setSelectedDate(point.date)}
                  onFocus={() => setSelectedDate(point.date)}
                  onClick={() => setSelectedDate(point.date)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedDate(point.date);
                    }
                  }}>
                  <circle cx={point.x} cy={point.y} r={16} fill="transparent" />
                  <circle className={selected.date === point.date ? "lr6-dot lr6-dot-active" : "lr6-dot"}
                    cx={point.x} cy={point.y} r={selected.date === point.date ? 6 : 4.5} />
                  <title>{dayLabel(point.date) + " · " + money(point.net)}</title>
                </g>
              ))}
            </svg>
          </div>
          {daily.some((day) => day.net === null) &&
            <p className="lr6-gap-note">Los días sin venta neta comparable se muestran como interrupciones de la línea.</p>}
          <details className="lr4-daily-detail">
            <summary>Ver detalle diario</summary>
            <div className="lr2-table-scroll">
              <table>
                <thead><tr><th>Fecha</th><th>Venta neta</th><th>Cobertura</th></tr></thead>
                <tbody>
                  {daily.map((day) => (
                    <tr key={day.date}>
                      <td>{day.date}</td>
                      <td>{money(day.net)}</td>
                      <td>{day.known}/{day.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
function Branches({ data, selected, overall }) {
  const groups = data.branches
    .filter((b) => !selected || b.id === selected)
    .map((b) => ({
      ...b,
      m: commercialMetrics(
        data.rows.filter((r) => r.branch_id === b.id),
        data.targets.filter((t) => t.branch_id === b.id),
      ),
      count: data.rows.filter((r) => r.branch_id === b.id).length,
    }))
    .sort((a, b) =>
      a.m.sales.knownNet === b.m.sales.knownNet
        ? a.name.localeCompare(b.name)
        : a.m.sales.knownNet > b.m.sales.knownNet
          ? -1
          : 1,
    );
  return (
    <section className="lr2-panel">
      <h2>Desempeño por sucursal</h2>
      {!overall.complete && <p className="lr3-note">Ranking parcial: hay registros sin venta neta comparable.</p>}
      <div className="lr2-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Sucursal</th>
              <th>Venta neta</th>
              <th>Meta</th>
              <th>Avance</th>
              <th>Faltante</th>
              <th>Participación</th>
              <th>Cobertura</th>
              <th>Tickets</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((b) => (
              <tr key={b.id}>
                <th>{b.name}</th>
                <td>
                  {b.m.sales.known
                    ? money(b.m.sales.knownNet)
                    : "No disponible"}
                  {!b.m.complete && <small> Parcial</small>}
                </td>
                <td>{money(b.m.target)}</td>
                <td><div className="lr4-mini-progress">
                  <div className={"lr4-track" + (visualProgress(b.m.fullNet, b.m.target) === null ? " lr4-track-empty" : "")}>
                    {visualProgress(b.m.fullNet, b.m.target) !== null && <span style={{ width: visualProgress(b.m.fullNet, b.m.target) + "%" }} />}
                  </div>
                  <strong>{percent(b.m.fullNet, b.m.target)}</strong>
                </div></td>
                <td>{money(b.m.remaining)}</td>
                <td>
                  {percent(
                    overall.complete ? b.m.fullNet : null,
                    overall.fullNet,
                  )}
                </td>
                <td>
                  {b.m.sales.known}/{b.count}
                </td>
                <td>{number(b.m.tickets.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function History({ data, selected, rows }) {
  if (!rows.length) return null;
  const sum = summarize(rows);
  return (
    <details className="lr2-panel lr3-history lr4-historical">
      <summary>Histórico AppSheet · {rows.length} cortes</summary>
      <p>
        {rows.length} registros de origen histórico;{" "}
        {rows.filter((r) => r.state === "HISTORICO_SIN_REVISAR").length} sin
        revisar. No se integran a venta neta, cumplimiento ni ticket promedio
        comercial.
      </p>
      <p>
        Total declarado histórico: <strong>{money(sum.declared)}</strong> ·
        Tickets históricos: {number(sumUnits(rows, "tickets").value)} ·
        Afluencia histórica: {number(sumUnits(rows, "footfall").value)} · Piezas
        históricas: {number(sumUnits(rows, "pieces").value)}
      </p>
      <div className="lr2-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Sucursal</th>
              <th>Registros</th>
              <th>Total declarado histórico</th>
              <th>Tickets</th>
              <th>Afluencia</th>
              <th>Piezas</th>
              <th>Venta neta</th>
            </tr>
          </thead>
          <tbody>
            {data.branches
              .filter((b) => !selected || b.id === selected)
              .map((b) => {
                const group = rows.filter((r) => r.branch_id === b.id);
                if (!group.length) return null;
                return (
                  <tr key={b.id}>
                    <th>{b.name}</th>
                    <td>{group.length}</td>
                    <td>{money(summarize(group).declared)}</td>
                    <td>{number(sumUnits(group, "tickets").value)}</td>
                    <td>{number(sumUnits(group, "footfall").value)}</td>
                    <td>{number(sumUnits(group, "pieces").value)}</td>
                    <td>No disponible</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
export default function LaRousseDashboard() {
  const [month, setMonth] = useState(currentMonth),
    [branch, setBranch] = useState(""),
    [data, setData] = useState(null),
    [globalCutoff, setGlobalCutoff] = useState(null),
    [catalog, setCatalog] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    setGlobalCutoff(null);
    const read = async (scope) => {
      const response = await fetch(
        "/api/larousse?" +
          new URLSearchParams({
            month,
            version: "2",
            ...(scope ? { branch: scope } : {}),
          }),
        { signal: controller.signal, cache: "no-store" },
      );
      if (!response.ok) throw Error("No fue posible consultar Finance.");
      return response.json();
    };
    // If a branch is selected, independently read the unfiltered month to
    // obtain the legacy GLOBAL cutoff date. Never substitute branch date.
    Promise.all([
      read(branch),
      branch ? read("").catch(() => null) : Promise.resolve(null),
    ])
      .then(([selected, global]) => {
        if (!controller.signal.aborted) {
          setData(selected);
          setCatalog(selected.branches);
          setGlobalCutoff(commercialCutoffDate(
            (branch ? global?.rows : selected.rows) || [], month,
          ));
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, branch, reload]);
  const rows = data?.rows || [],
    m = commercialMetrics(rows, data?.targets || []),
    forecast = commercialProjection(rows, data?.targets || [], month, globalCutoff);
  return (
    <div className="lr2 lr3 lr4 lr7">
      <style>{styles}</style>
      <header className="lr2-header">
        <div>
          <div className="lr2-eyebrow">LA ROUSSE</div>
          <h1>Ventas y desempeño</h1>
        </div>
        <div className="lr2-controls">
          <label>
            <span>Mes</span>
            <input
              aria-label="Mes financiero"
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </label>
          <label>
            <span>Sucursal</span>
            <select
              aria-label="Sucursal financiera"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="">Todas las sucursales</option>
              {catalog.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setReload((x) => x + 1)}>Actualizar</button>
        </div>
      </header>
      {loading ? (
        <div role="status" className="lr2-loading">
          Consultando datos comerciales…
        </div>
      ) : error ? (
        <div role="alert" className="lr2-loading lr2-error">
          {error}
          <button onClick={() => setReload((x) => x + 1)}>Reintentar</button>
        </div>
      ) : (
        data && (
          <>
            {rows.length > 0 && !m.complete && <p className="lr4-coverage">Venta mensual incompleta: no se calcula el avance hasta tener datos comparables de todas las sucursales.</p>}
            <section className="lr4-lead" aria-label="Indicadores principales">
              <Card hero label="Venta neta"
                value={m.sales.known ? money(m.sales.knownNet) : "No disponible"}
                note={!m.complete && rows.length ? "Subtotal disponible · excluye históricos" : null} />
              <Card label="Meta mensual" value={money(m.target)}
                note={m.targetKnown < data.targets.length ? "Faltan metas por configurar" : null} />
              <GoalProgress metrics={m} />
              <Forecast forecast={forecast} />
            </section>
            <section className="lr4-activity" aria-label="Indicadores de tienda">
              <Card label="Ticket promedio" value={money(m.average)} />
              <Card label="Tickets" value={number(m.tickets.value)} />
              <Card label="Afluencia" value={number(m.footfall.value)} />
              <Card label="Piezas vendidas" value={number(m.pieces.value)} />
              <Card label="Conversión" value={formatHundredths(m.conversion, "%")}
                note={m.conversion === null ? "Datos incompletos o afluencia cero" : null} />
              <Card label="Piezas por ticket" value={formatHundredths(m.piecesPerTicket)}
                note={m.piecesPerTicket === null ? "Datos incompletos o tickets cero" : null} />
            </section>
            {!rows.length ? (
              <div role="status" className="lr2-empty">
                Sin cortes para el período y sucursal seleccionados.
              </div>
            ) : (
              <>
                <Daily rows={m.commercial} />
                <Branches data={data} selected={branch} overall={m} />
                <History data={data} selected={branch} rows={m.historical} />
              </>
            )}
            <aside
              className="lr2-audit"
              aria-label="Auditoría de cortes por Finance"
            >
              <span className="lr2-audit-heading">
                Revisión de cortes
              </span>
              <span>
                Venta aprobada: {money(m.confirmed.net)} ·{" "}
                {m.confirmed.known}/{m.confirmed.count} cortes aprobados con
                importe
              </span>
              <span>
                {rows.filter((r) => r.state === "PENDING_REVIEW").length}{" "}
                pendientes · {rows.filter((r) => r.state === "APPROVED").length}{" "}
                aprobados ·{" "}
                {rows.filter((r) => r.state === "CORRECTION_REQUESTED").length}{" "}
                en corrección
              </span>
            </aside>
          </>
        )
      )}
      <footer className="lr3-footer">
        <a href={LOOKER} target="_blank" rel="noreferrer">
          Ver reporte de Looker
        </a>
      </footer>
    </div>
  );
}
const styles = `.lr3-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0 24px}.lr3-kpis .lr2-hero{grid-column:auto;min-height:170px}.lr3-kpis .lr2-metric-value{font-size:clamp(22px,2.4vw,36px);overflow-wrap:anywhere}.lr3-kpis .lr2-metric{min-height:140px}.lr3 .lr2-panel{margin-bottom:20px}.lr3-note{font-size:12px;color:#64748b;margin:8px 0 18px}.lr3-activity{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:20px 0}.lr3-history{background:#fffaf0;border-color:#e8d7af}.lr3-history p{font-size:13px;line-height:1.8;margin:12px 0}.lr3-footer{padding:16px 0;font-size:12px}.lr3-footer a{color:#345b96}@media(max-width:1000px){.lr3-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.lr3-activity{grid-template-columns:1fr 1fr}}@media(max-width:600px){.lr3-kpis,.lr3-activity{grid-template-columns:1fr}.lr3-kpis .lr2-hero{grid-column:auto}.lr3 .lr2-metric-value{font-size:26px;overflow-wrap:anywhere}}
.lr6-daily{min-width:0}
.lr6-selected{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;margin:5px 0 14px}
.lr6-selected>div{display:flex;flex-direction:column;gap:4px}
.lr6-selected span{font-size:11px;font-weight:700;color:#748398}
.lr6-selected strong{font-size:clamp(22px,2.6vw,31px);font-weight:850;letter-spacing:-.04em;color:#1d395b;font-variant-numeric:tabular-nums}
.lr6-selected time{font-size:12px;color:#73839a;font-weight:700;text-transform:capitalize}
.lr6-scroll{width:100%;overflow-x:auto;overflow-y:hidden;border:1px solid #e7edf5;border-radius:12px;background:linear-gradient(#fff,#fcfdff);padding:8px 6px 4px;scrollbar-width:thin}
.lr6-scroll:focus-visible{outline:2px solid #2563eb;outline-offset:3px}
.lr6-chart{display:block;max-width:none}
.lr6-grid{stroke:#e9eff6;stroke-width:1;stroke-dasharray:3 5}
.lr6-axis{font-size:11px;fill:#7a8ba1;font-weight:600;font-variant-numeric:tabular-nums}
.lr6-series{stroke:#246bad;stroke-width:3.2;vector-effect:non-scaling-stroke}
.lr6-dot{fill:#fff;stroke:#246bad;stroke-width:3;cursor:pointer}
.lr6-dot-active{fill:#246bad;stroke:#fff;stroke-width:2;filter:drop-shadow(0 0 3px rgba(36,107,173,.45))}
.lr6-chart g[role="button"]:focus-visible .lr6-dot{stroke:#0d9b80;stroke-width:4}
.lr6-gap-note{font-size:11px;line-height:1.5;color:#8d691b;margin:11px 0 4px}
.lr6-daily .lr4-daily-detail{margin-top:12px}
.lr6-daily .lr4-daily-detail summary{font-size:12px;font-weight:700;color:#2c5b91;cursor:pointer}
.lr6-daily .lr4-daily-detail .lr2-table-scroll{margin-top:10px}
@media(max-width:700px){
.lr6-selected strong{font-size:26px}
.lr6-selected{gap:8px}
.lr6-scroll{padding:5px 0 3px}
}

.lr7 .lr4-lead{grid-template-columns:repeat(4,minmax(0,1fr))}
.lr7 .lr4-activity{grid-template-columns:repeat(3,minmax(0,1fr))}
.lr7-forecast{display:flex;flex-direction:column;gap:11px;justify-content:space-between;min-width:0;background:#fff;border:1px solid #e3e9f2;border-radius:16px;padding:20px 21px;box-shadow:0 5px 24px rgba(18,45,78,.035)}
.lr7-forecast-value{font-size:clamp(21px,2.1vw,30px);font-weight:800;letter-spacing:-.045em;line-height:1.2;color:#1d395b;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.lr7-forecast-details{display:grid;gap:7px}
.lr7-forecast-details>div{display:flex;justify-content:space-between;flex-wrap:wrap;gap:3px 9px;font-size:11px}
.lr7-forecast-details span{color:#7b899e}
.lr7-forecast-details b{font-weight:750;color:#38516b;text-align:right}
.lr7-forecast-warning{display:block;font-size:10px;color:#9a732b;line-height:1.45}
@media(max-width:1180px){.lr7 .lr4-lead{grid-template-columns:repeat(2,minmax(0,1fr))}.lr7 .lr4-goal{grid-column:auto}.lr7 .lr4-activity{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:800px){.lr7 .lr4-activity{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.lr7 .lr4-lead{grid-template-columns:1fr}.lr7-forecast{min-height:162px}}
`;
