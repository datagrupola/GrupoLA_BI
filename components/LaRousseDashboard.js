"use client";
import { useEffect, useState } from "react";
import { money, summarize } from "../lib/larousse.mjs";
import {
  commercialMetrics,
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
function Daily({ rows }) {
  const dates = [...new Set(rows.map((r) => r.date))].sort(),
    daily = dates.map((date) => ({
      date,
      ...summarize(rows.filter((r) => r.date === date)),
    })),
    max = daily.reduce((s, d) => (d.net !== null && d.net > s ? d.net : s), 1n);
  return (
    <section className="lr2-panel">
      <h2>Evolución diaria de ventas</h2>
      
      {!daily.length && (
        <p className="lr2-empty">
          No hay cortes comerciales comparables para mostrar.
        </p>
      )}
      <div className="lr2-chart-scroll">
        <div
          className="lr3-chart"
          style={{ minWidth: Math.max(320, dates.length * 124) }}
        >
          {daily.map((d) => (
            <div key={d.date} className="lr3-day">
              <strong className="lr5-day-amount" title={d.date + " · " + money(d.net)}>
                {d.net === null ? "N/D" : money(d.net)}
              </strong>
              <div
                className="lr3-bar-slot"
                title={d.date + " · " + money(d.net)}
              >
                {d.net !== null ? (
                  <span
                    style={{
                      height: Number((d.net * 10000n) / max) / 100 + "%",
                    }}
                  />
                ) : (
                  <small>ND</small>
                )}
              </div>
              <span>{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>
      <details className="lr4-daily-detail">
        <summary>Ver detalle diario</summary>
      <div className="lr2-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Venta neta</th>
              <th>Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>{money(d.net)}</td>
                <td>
                  {d.known}/{d.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </details>
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
    [catalog, setCatalog] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    fetch(
      "/api/larousse?" +
        new URLSearchParams({
          month,
          version: "2",
          ...(branch ? { branch } : {}),
        }),
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw Error("No fue posible consultar Finance.");
        return r.json();
      })
      .then((d) => {
        if (!controller.signal.aborted) {
          setData(d);
          setCatalog(d.branches);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, branch, reload]);
  const rows = data?.rows || [],
    m = commercialMetrics(rows, data?.targets || []);
  return (
    <div className="lr2 lr3 lr4">
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
            </section>
            <section className="lr4-activity" aria-label="Indicadores de tienda">
              <Card label="Ticket promedio" value={money(m.average)} />
              <Card label="Tickets" value={number(m.tickets.value)} />
              <Card label="Afluencia" value={number(m.footfall.value)} />
              <Card label="Piezas vendidas" value={number(m.pieces.value)} />
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
const styles = `.lr3-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0 24px}.lr3-kpis .lr2-hero{grid-column:auto;min-height:170px}.lr3-kpis .lr2-metric-value{font-size:clamp(22px,2.4vw,36px);overflow-wrap:anywhere}.lr3-kpis .lr2-metric{min-height:140px}.lr3 .lr2-panel{margin-bottom:20px}.lr3-note{font-size:12px;color:#64748b;margin:8px 0 18px}.lr3-activity{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:20px 0}.lr3-history{background:#fffaf0;border-color:#e8d7af}.lr3-history p{font-size:13px;line-height:1.8;margin:12px 0}.lr3-chart{display:flex;gap:8px;height:244px;align-items:end;margin:14px 0}.lr3-day{flex:1;min-width:116px;display:flex;flex-direction:column;align-items:center;gap:8px;font-size:11px;text-align:center;color:#64748b}.lr5-day-amount{min-height:18px;font-size:11px;font-weight:800;line-height:18px;white-space:nowrap;color:#26425f;font-variant-numeric:tabular-nums}.lr3-bar-slot{height:179px;width:100%;display:flex;align-items:end;justify-content:center}.lr3-bar-slot>span{display:block;background:#2155a0;max-width:28px;width:80%;border-radius:5px 5px 0 0}.lr3-footer{padding:16px 0;font-size:12px}.lr3-footer a{color:#345b96}@media(max-width:1000px){.lr3-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.lr3-activity{grid-template-columns:1fr 1fr}}@media(max-width:600px){.lr3-kpis,.lr3-activity{grid-template-columns:1fr}.lr3-kpis .lr2-hero{grid-column:auto}.lr3 .lr2-metric-value{font-size:26px;overflow-wrap:anywhere}}`;
