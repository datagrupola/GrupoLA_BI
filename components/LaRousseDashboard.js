'use client';

import { useEffect, useState } from 'react';
import { money, summarize } from '../lib/larousse.mjs';

const REPORTABLE = new Set(['APPROVED', 'PENDING_REVIEW', 'CORRECTION_REQUESTED']);
const LOOKER_LEGACY = 'https://datastudio.google.com/reporting/055e6005-5133-498d-8a93-4960dbc60f1b';

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  return parts.find((part) => part.type === 'year').value + '-' +
    parts.find((part) => part.type === 'month').value;
}

function monthTitle(period) {
  const parts = period.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(parts[0], parts[1] - 1, 1)));
}

function displaySummary(summary) {
  return {
    value: money(summary.net === null ? summary.knownNet : summary.net),
    partial: summary.known !== summary.count,
    coverage: summary.known + '/' + summary.count,
  };
}

function MoneyCard({ label, summary, main = false, note = '' }) {
  const result = displaySummary(summary);
  return (
    <article className={main ? 'lr2-hero' : 'lr2-metric'}>
      <span className="lr2-metric-label">{label}</span>
      <strong className="lr2-metric-value">{result.value}</strong>
      <span className="lr2-metric-foot">
        {result.partial ? 'Subtotal disponible · ' + result.coverage + ' cortes con importe' : note}
      </span>
    </article>
  );
}

function DailySales({ rows }) {
  const dates = [...new Set(rows.map((row) => row.date))].sort();
  const daily = dates.map((date) => {
    const day = rows.filter((row) => row.date === date);
    const confirmed = summarize(day.filter((row) => row.state === 'APPROVED')).knownNet;
    const pending = summarize(day.filter((row) => row.state === 'PENDING_REVIEW')).knownNet;
    const correction = summarize(day.filter((row) => row.state === 'CORRECTION_REQUESTED')).knownNet;
    return { date, confirmed, pending, correction, total: confirmed + pending + correction };
  });
  const maximum = daily.reduce((previous, item) => item.total > previous ? item.total : previous, 0n);
  const percentage = (value, whole) => whole === 0n ? 0 : Number(value * 1000n / whole) / 10;

  return (
    <section className="lr2-panel lr2-chart-panel" aria-labelledby="lr2-trend-title">
      <div className="lr2-panel-head">
        <div>
          <h2 id="lr2-trend-title">Evolución de venta neta</h2>
          <p>Por fecha operativa · importes registrados</p>
        </div>
        <div className="lr2-legend">
          <span><i className="lr2-dot lr2-dot-approved" />Aprobada</span>
          <span><i className="lr2-dot lr2-dot-pending" />En revisión</span>
          <span><i className="lr2-dot lr2-dot-correction" />Corrección</span>
        </div>
      </div>
      {!daily.length ? (
        <div className="lr2-empty">No hay ventas reportadas para los filtros seleccionados.</div>
      ) : (
        <div className="lr2-chart-scroll">
          <div className="lr2-chart" style={{ minWidth: Math.max(420, daily.length * 42) + 'px' }}>
            {daily.map((item) => {
              const height = maximum > 0n ? Math.max(2, percentage(item.total, maximum)) : 0;
              return (
                <div className="lr2-bar-column" key={item.date}>
                  <span className="lr2-bar-space" title={item.date + ' · ' + money(item.total)}>
                    <span className="lr2-bar" style={{ height: height + '%' }}>
                      {item.confirmed > 0n && (
                        <span className="lr2-bar-approved" style={{ height: percentage(item.confirmed, item.total) + '%' }} />
                      )}
                      {item.pending > 0n && (
                        <span className="lr2-bar-pending" style={{ height: percentage(item.pending, item.total) + '%' }} />
                      )}
                      {item.correction > 0n && (
                        <span className="lr2-bar-correction" style={{ height: percentage(item.correction, item.total) + '%' }} />
                      )}
                    </span>
                  </span>
                  <span className="lr2-bar-label">{item.date.slice(8)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="lr2-chart-caption">
        <span>Los importes corresponden a cortes recibidos en Finance; no todos están aprobados.</span>
        <span>Desliza para ver más días</span>
      </div>
    </section>
  );
}

function BranchSales({ branches, reported }) {
  const groups = branches.map((branch) => {
    const rows = reported.filter((row) => row.branch_id === branch.id);
    return { ...branch, summary: summarize(rows), days: new Set(rows.map((row) => row.date)).size };
  }).sort((a, b) => a.summary.knownNet === b.summary.knownNet
    ? a.name.localeCompare(b.name, 'es-MX')
    : a.summary.knownNet > b.summary.knownNet ? -1 : 1);
  const maximum = groups.reduce((previous, item) =>
    item.summary.knownNet > previous ? item.summary.knownNet : previous, 0n);

  return (
    <section className="lr2-panel lr2-branch-panel">
      <div className="lr2-panel-head">
        <div>
          <h2>Desempeño por sucursal</h2>
          <p>Venta neta reportada</p>
        </div>
      </div>
      <div className="lr2-branch-list">
        {groups.map((item) => {
          const value = displaySummary(item.summary);
          const ratio = maximum > 0n ? Number(item.summary.knownNet * 1000n / maximum) / 10 : 0;
          return (
            <div className="lr2-branch" key={item.id}>
              <div className="lr2-branch-row">
                <span title={item.name}>{item.name}</span>
                <strong>{value.value}</strong>
              </div>
              <div className="lr2-track"><span style={{ width: ratio + '%' }} /></div>
              {value.partial && <small>Importe parcial · {value.coverage} cortes</small>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BranchTable({ branches, reported }) {
  const groups = branches.map((branch) => {
    const rows = reported.filter((row) => row.branch_id === branch.id);
    return {
      ...branch,
      all: summarize(rows),
      confirmed: summarize(rows.filter((row) => row.state === 'APPROVED')),
      provisional: summarize(rows.filter((row) => row.state !== 'APPROVED')),
      days: new Set(rows.map((row) => row.date)).size,
    };
  });
  return (
    <section className="lr2-panel lr2-table-panel">
      <div className="lr2-panel-head"><h2>Detalle comercial por sucursal</h2></div>
      <div className="lr2-table-scroll">
        <table>
          <thead><tr>
            <th scope="col">Sucursal</th>
            <th scope="col">Venta neta</th>
            <th scope="col">Aprobada</th>
            <th scope="col">En revisión</th>
            <th scope="col">Días reportados</th>
          </tr></thead>
          <tbody>{groups.map((branch) => (
            <tr key={branch.id}>
              <th scope="row">{branch.name}</th>
              <td>{displaySummary(branch.all).value}{branch.all.known !== branch.all.count && <small>Parcial</small>}</td>
              <td>{displaySummary(branch.confirmed).value}</td>
              <td>{displaySummary(branch.provisional).value}</td>
              <td>{branch.days}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

export default function LaRousseDashboard() {
  const [month, setMonth] = useState(currentMonth);
  const [branch, setBranch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    fetch('/api/larousse?' + new URLSearchParams({ month, ...(branch ? { branch } : {}) }), {
      signal: controller.signal, cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw Error('No fue posible consultar Finance.');
        return response.json();
      })
      .then((payload) => { if (!controller.signal.aborted) setData(payload); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, branch, reload]);

  const rows = data?.rows || [];
  const reported = rows.filter((row) => REPORTABLE.has(row.state));
  const approved = reported.filter((row) => row.state === 'APPROVED');
  const pending = reported.filter((row) => row.state === 'PENDING_REVIEW');
  const corrections = reported.filter((row) => row.state === 'CORRECTION_REQUESTED');
  const historical = rows.filter((row) => row.state === 'HISTORICO_SIN_REVISAR');
  const summary = summarize(reported);
  const days = new Set(reported.map((row) => row.date)).size;
  const dailyAverage = days > 0 ? summary.knownNet / BigInt(days) : null;
  const expenses = summary.expenses;
  const selectedTitle = monthTitle(month);

  return (
    <div className="lr2">
      <header className="lr2-header">
        <div>
          <div className="lr2-eyebrow">LA ROUSSE / INTELIGENCIA COMERCIAL</div>
          <h1>Desempeño comercial</h1>
          <p>Ventas y operación · {selectedTitle}</p>
        </div>
        <div className="lr2-controls">
          <label>
            <span>Período</span>
            <input type="month" aria-label="Mes financiero" value={month}
              onChange={(event) => { if (event.target.value) setMonth(event.target.value); }} />
          </label>
          <label>
            <span>Sucursal</span>
            <select value={branch} aria-label="Sucursal financiera"
              onChange={(event) => setBranch(event.target.value)}>
              <option value="">Todas las sucursales</option>
              {(data?.branches || []).map((source) => (
                <option key={source.id} value={source.id}>{source.name}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setReload((value) => value + 1)}>Actualizar</button>
        </div>
      </header>

      {loading ? (
        <div className="lr2-loading" role="status">Consultando datos financieros…</div>
      ) : error ? (
        <div className="lr2-loading lr2-error" role="alert">
          {error} <button type="button" onClick={() => setReload((value) => value + 1)}>Reintentar</button>
        </div>
      ) : data ? (
        <>
          <div className="lr2-updated">
            <span className="lr2-live-dot" /> Finance · Consulta: {new Date(data.queried_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
          </div>

          <section className="lr2-overview" aria-label="Indicadores comerciales principales">
            <MoneyCard label="Venta neta reportada" summary={summary} main
              note="Cortes enviados por sucursales · incluye importes aún no aprobados" />
            <div className="lr2-side-metrics">
              <article className="lr2-metric">
                <span className="lr2-metric-label">Promedio por día con corte</span>
                <strong className="lr2-metric-value">{dailyAverage === null ? '—' : money(dailyAverage)}</strong>
                <span className="lr2-metric-foot">
                  {days === 0 ? 'Sin cortes reportados' : days + ' días con corte' + (summary.net === null ? ' · subtotal parcial' : '')}
                </span>
              </article>
              <article className="lr2-metric">
                <span className="lr2-metric-label">Gastos registrados en cortes</span>
                <strong className="lr2-metric-value">{expenses === null ? 'No disponible' : money(expenses)}</strong>
                <span className="lr2-metric-foot">No representa el gasto total de Finance</span>
              </article>
            </div>
          </section>

          <div className="lr2-contract-note" role="note">
            <div><strong>Meta mensual, avance contra meta y ticket promedio</strong>
              <p>Finance ya registra metas y tickets, pero el contrato de consulta BI actual todavía no los entrega. No se muestran valores estimados.</p>
            </div>
            <a href={LOOKER_LEGACY} target="_blank" rel="noreferrer">Ver reporte anterior</a>
          </div>

          <div className="lr2-analysis">
            <DailySales rows={reported} />
            <BranchSales branches={data.branches} reported={reported} />
          </div>

          <BranchTable branches={data.branches} reported={reported} />

          <aside className="lr2-audit" aria-label="Seguimiento de auditoría de cortes">
            <span className="lr2-audit-heading">Auditoría Finance · {selectedTitle}</span>
            <strong>{approved.length} aprobados</strong>
            <span>{pending.length} pendientes · {corrections.length} en corrección</span>
            <span>{historical.length} históricos sin revisar (fuera de las ventas netas)</span>
          </aside>
        </>
      ) : null}
    </div>
  );
}
