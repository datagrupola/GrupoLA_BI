'use client';

import { useEffect, useRef, useState } from 'react';

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const pacasStyles = `
.pacas-dashboard-v2{height:100%;overflow:auto;padding:26px;background:#f5f7fb;color:#172033}
.pacas-header-v2{align-items:center;margin-bottom:20px}
.pacas-header-actions{display:flex;align-items:center;gap:18px}
.pacas-period-control-v2{position:relative;display:flex;align-items:center;gap:10px;min-width:260px;padding:12px 15px;border:1px solid #2563eb;border-radius:13px;background:#2563eb;color:#fff;box-shadow:0 5px 14px rgba(37,99,235,.18);cursor:pointer}
.pacas-period-control-v2 input{position:absolute;inset:0;opacity:0;pointer-events:none}
.pacas-period-label{flex:1;font-size:.82rem;font-weight:750}
.pacas-period-icon,.pacas-period-chevron{font-size:.95rem}
.pacas-layout-v2{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:16px}
.pacas-main-column{min-width:0}
.pacas-kpis-v2{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.pacas-kpi-v2{min-height:132px;padding:16px 18px;border-radius:16px;display:flex;flex-direction:column;justify-content:space-between}
.pacas-kpi-v2-top span{margin:0 0 7px;font-size:.78rem}
.pacas-kpi-v2-top strong{font-size:1.55rem}
.pacas-sparkline{width:100%;height:46px}
.pacas-sparkline polyline{stroke:currentColor;stroke-width:2}
.pacas-kpi-v2.tone-blue{color:#2563eb}
.pacas-kpi-v2.tone-green{color:#16a34a}
.pacas-kpi-v2.tone-purple{color:#7c3aed}
.pacas-kpi-v2.tone-orange{color:#f97316}
.pacas-kpi-v2 .pacas-kpi-v2-top span{color:#64748b}
.pacas-kpi-v2 .pacas-kpi-v2-top strong{color:#172033}
.pacas-sparkline-empty{height:46px}
.pacas-sales-card-v2{margin-bottom:16px}
.pacas-bars-v2{height:270px;grid-auto-columns:minmax(34px,1fr);gap:5px}
.pacas-bars-v2 .pacas-bar-item{min-width:34px;grid-template-rows:22px minmax(0,1fr) 18px}
.pacas-bars-v2 .pacas-bar-value{display:block;font-size:.58rem;color:#64748b;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pacas-bars-v2 .pacas-bar-fill{background:#2563eb}
.pacas-bottom-grid-v2{display:grid;grid-template-columns:minmax(250px,.9fr) minmax(360px,1.45fr) minmax(250px,.9fr);gap:16px}
.pacas-side-column-v2{display:grid;grid-auto-rows:max-content;gap:12px}
.pacas-side-column-v2 .pacas-card{padding:18px}
.pacas-side-title{font-weight:800;font-size:.9rem}
.pacas-gauge-card{min-height:210px}
.pacas-gauge-wrap{margin-top:18px}
.pacas-gauge{position:relative;width:190px;height:95px;margin:0 auto;overflow:hidden}
.pacas-gauge:before{content:'';position:absolute;inset:0;border-radius:190px 190px 0 0;background:conic-gradient(from 270deg at 50% 100%,#2563eb 0 var(--gauge),#e5e7eb var(--gauge) 50%,transparent 50% 100%)}
.pacas-gauge-center{position:absolute;left:24px;right:24px;bottom:-1px;height:70px;background:#fff;border-radius:150px 150px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:4px}
.pacas-gauge-center strong{font-size:1.65rem;color:#2563eb}
.pacas-gauge-center span{font-size:.65rem;color:#64748b}
.pacas-gauge-scale{display:flex;justify-content:space-between;color:#94a3b8;font-size:.65rem;margin-top:4px}
.pacas-side-metric{display:grid;gap:5px;min-height:84px}
.pacas-side-metric span{font-size:.76rem;color:#475569}
.pacas-side-metric strong{font-size:1.25rem}
.pacas-side-metric.tone-blue{border-left:4px solid #2563eb}
.pacas-side-metric.tone-green{border-left:4px solid #16a34a}
.pacas-side-metric.tone-purple{border-left:4px solid #7c3aed}
.pacas-sellers-card-v2 .pacas-table{font-size:.72rem}
.pacas-sellers-card-v2 .pacas-table th,.pacas-sellers-card-v2 .pacas-table td{padding:10px 7px}
.pacas-summary-row{padding:9px 0}
.pacas-summary-row span,.pacas-summary-row strong{font-size:.74rem}
@media(max-width:1350px){.pacas-layout-v2{grid-template-columns:1fr}.pacas-side-column-v2{grid-template-columns:repeat(4,1fr)}.pacas-gauge-card{min-height:150px}.pacas-gauge{width:150px;height:75px}.pacas-gauge-center{left:20px;right:20px;height:55px}.pacas-gauge-center strong{font-size:1.25rem}}
@media(max-width:1100px){.pacas-bottom-grid-v2{grid-template-columns:1fr 1fr}.pacas-bottom-grid-v2>article:last-child{grid-column:1/-1}.pacas-header-actions{align-items:stretch;flex-direction:column;gap:8px}}
@media(max-width:760px){.pacas-dashboard-v2{padding:18px}.pacas-kpis-v2{grid-template-columns:repeat(2,1fr)}.pacas-bottom-grid-v2,.pacas-side-column-v2{grid-template-columns:1fr}.pacas-bottom-grid-v2>article:last-child{grid-column:auto}.pacas-period-control-v2{min-width:0;width:100%}}
`;

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function PacasDashboard() {
  const [period, setPeriod] = useState(currentPeriod());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const periodInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetch(`/api/pacas?period=${period}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar Pacas MX');
        return payload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  function openPeriodPicker() {
    const input = periodInputRef.current;
    if (!input) return;

    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
        input.click();
      }
    } catch {
      input.focus();
    }
  }

  function handlePeriodKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPeriodPicker();
    }
  }

  if (loading) return <div className="pacas-state">Cargando Pacas MX…</div>;
  if (error) return <div className="pacas-state pacas-error">{error}</div>;

  const totals = data?.totals || {};
  const targetPending = totals.target == null;
  const daily = data?.daily || [];
  const inputs = data?.inputs || [];
  const periodLabel = formatPeriod(period);

  return (
    <div className="pacas-dashboard pacas-dashboard-v2">
      <style>{pacasStyles}</style>

      <header className="pacas-header pacas-header-v2">
        <div>
          <p className="pacas-eyebrow">PAQUEROS MX · BSALE → NEON</p>
          <h1>Pacas MX</h1>
          <p className="pacas-subtitle">
            Venta comercial, mensajes, visitas, tickets, vendedores y métodos de pago.
          </p>
        </div>

        <div className="pacas-header-actions">
          <div
            className="pacas-period-control pacas-period-control-v2"
            role="button"
            tabIndex={0}
            onClick={openPeriodPicker}
            onKeyDown={handlePeriodKeyDown}
            aria-label="Seleccionar periodo"
          >
            <span className="pacas-period-icon">▣</span>
            <span className="pacas-period-label">{periodLabel}</span>
            <span className="pacas-period-chevron">⌄</span>
            <input
              ref={periodInputRef}
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        </div>
      </header>

      <div className="pacas-layout-v2">
        <div className="pacas-main-column">
          <section className="pacas-kpis pacas-kpis-v2">
            <Kpi
              label="Venta total"
              value={money.format(totals.netSales || 0)}
              tone="blue"
              series={daily.map((row) => Number(row.netSales) || 0)}
            />
            <Kpi
              label="Mensajes"
              value={integer.format(totals.messages || 0)}
              tone="green"
              series={inputs.map((row) => Number(row.messages) || 0)}
            />
            <Kpi
              label="Tickets totales"
              value={integer.format(totals.tickets || 0)}
              tone="purple"
              series={daily.map((row) => Number(row.tickets) || 0)}
            />
            <Kpi
              label="Visitas"
              value={integer.format(totals.visits || 0)}
              tone="orange"
              series={inputs.map((row) => Number(row.visits) || 0)}
            />
          </section>

          <article className="pacas-card pacas-sales-card-v2">
            <CardHeader
              title="Venta diaria neta"
              detail={`Último dato: ${formatShortDate(totals.lastDate)}`}
            />
            <SalesChart rows={daily} />
          </article>

          <section className="pacas-bottom-grid-v2">
            <article className="pacas-card">
              <CardHeader title="Métodos de pago" detail="Sobre venta bruta" />
              <PaymentsList rows={data.payments || []} total={totals.grossSales || 0} />
            </article>

            <article className="pacas-card pacas-sellers-card-v2">
              <CardHeader title="Ventas por vendedor" detail="Neto después de devoluciones" />
              <SellerTable rows={data.sellers || []} />
            </article>

            <article className="pacas-card">
              <CardHeader title="Resumen del período" detail={periodLabel} />
              <div className="pacas-summary-list">
                <SummaryRow label="Venta total" value={money.format(totals.netSales || 0)} />
                <SummaryRow label="Venta diaria promedio" value={money.format(totals.dailyPace || 0)} />
                <SummaryRow label="Tickets totales" value={integer.format(totals.tickets || 0)} />
                <SummaryRow label="Ticket promedio" value={money.format(totals.averageTicket || 0)} />
                <SummaryRow label="Visitas totales" value={integer.format(totals.visits || 0)} />
                <SummaryRow label="Mensajes totales" value={integer.format(totals.messages || 0)} />
                <SummaryRow label="Devoluciones" value={money.format(totals.returns || 0)} />
                <SummaryRow label="Devoluciones sin resolver" value={integer.format(totals.unresolvedReturns || 0)} />
              </div>
            </article>
          </section>
        </div>

        <aside className="pacas-side-column-v2">
          <article className="pacas-card pacas-gauge-card">
            <div className="pacas-side-title">Cumplimiento</div>
            <Gauge value={targetPending ? null : totals.currentCompliance || 0} />
          </article>

          <SideMetric
            label="Meta mensual"
            value={targetPending ? 'Pendiente' : money.format(totals.target)}
            tone="blue"
          />
          <SideMetric
            label="Proyección del mes"
            value={money.format(totals.projection || 0)}
            tone="green"
          />
          <SideMetric
            label="Cumplimiento proyectado"
            value={targetPending ? '—' : `${number.format((totals.projectedCompliance || 0) * 100)}%`}
            tone="purple"
          />
        </aside>
      </div>
    </div>
  );
}

function formatPeriod(value) {
  if (!value) return '—';
  const [year, month] = value.split('-').map(Number);
  const first = new Date(year, month - 1, 1, 12);
  const last = new Date(year, month, 0, 12);
  const formatter = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${formatter.format(first)} - ${formatter.format(last)}`;
}

function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function Kpi({ label, value, tone, series }) {
  return (
    <article className={`pacas-kpi pacas-kpi-v2 tone-${tone}`}>
      <div className="pacas-kpi-v2-top">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Sparkline values={series} />
    </article>
  );
}

function Sparkline({ values }) {
  if (!values?.length) return <div className="pacas-sparkline-empty" />;

  const width = 180;
  const height = 48;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      className="pacas-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CardHeader({ title, detail }) {
  return (
    <div className="pacas-card-header">
      <h2>{title}</h2>
      <span>{detail}</span>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="pacas-summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Gauge({ value }) {
  const percent = value == null ? null : Math.max(0, Math.min(100, value * 100));
  const visibleArc = percent == null ? 0 : percent / 2;

  return (
    <div className="pacas-gauge-wrap">
      <div className="pacas-gauge" style={{ '--gauge': `${visibleArc}%` }}>
        <div className="pacas-gauge-center">
          <strong>{percent == null ? '—' : `${number.format(percent)}%`}</strong>
          <span>del objetivo mensual</span>
        </div>
      </div>
      <div className="pacas-gauge-scale">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function SideMetric({ label, value, tone }) {
  return (
    <article className={`pacas-card pacas-side-metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SalesChart({ rows }) {
  if (!rows.length) return <div className="pacas-empty">Sin datos para el periodo.</div>;

  const maxAbsolute = Math.max(
    1,
    ...rows.map((row) => Math.abs(Number(row.netSales) || 0))
  );

  return (
    <div className="pacas-bars pacas-bars-v2" role="img" aria-label="Venta diaria neta">
      {rows.map((row) => {
        const value = Number(row.netSales) || 0;
        const height = Math.max(3, Math.round((Math.abs(value) / maxAbsolute) * 100));
        const day = String(row.date).slice(8, 10);

        return (
          <div
            className="pacas-bar-item"
            key={row.date}
            title={`${formatShortDate(row.date)} · ${money.format(value)}`}
          >
            <div className="pacas-bar-value">{money.format(value)}</div>
            <div className="pacas-bar-shell">
              <span
                className={`pacas-bar-fill${value < 0 ? ' negative' : ''}`}
                style={{ height: `${height}%` }}
              />
            </div>
            <div className="pacas-bar-day">{day}</div>
          </div>
        );
      })}
    </div>
  );
}

function SellerTable({ rows }) {
  if (!rows.length) return <div className="pacas-empty">Sin vendedores en el periodo.</div>;

  return (
    <div className="pacas-table-wrap">
      <table className="pacas-table">
        <thead>
          <tr>
            <th>Vendedor</th>
            <th>Bruta</th>
            <th>Dev.</th>
            <th>Neta</th>
            <th>Tickets</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sellerId}>
              <td>{row.sellerName}</td>
              <td>{money.format(row.grossSales)}</td>
              <td>{money.format(row.returns)}</td>
              <td className={row.netSales < 0 ? 'is-negative' : ''}>
                {money.format(row.netSales)}
              </td>
              <td>{integer.format(row.tickets)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsList({ rows, total }) {
  if (!rows.length) return <div className="pacas-empty">Sin pagos en el periodo.</div>;

  return (
    <div className="pacas-payments">
      {rows.map((row) => {
        const share = total
          ? Math.min(100, Math.max(0, (row.amount / total) * 100))
          : 0;

        return (
          <div className="pacas-payment" key={row.paymentTypeId}>
            <div className="pacas-payment-label">
              <span>{row.paymentTypeName}</span>
              <strong>{money.format(row.amount)}</strong>
            </div>
            <div className="pacas-payment-track">
              <span style={{ width: `${share}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
