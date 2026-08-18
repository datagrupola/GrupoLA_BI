'use client';

import { useEffect, useRef, useState } from 'react';

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

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
      if (typeof input.showPicker === 'function') input.showPicker();
      else {
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
  const ticketSeries = daily.map((row) => Number(row.tickets) || 0);
  const salesSeries = daily.map((row) => Number(row.netSales) || 0);
  const messageSeries = inputs.map((row) => Number(row.messages) || 0);
  const visitSeries = inputs.map((row) => Number(row.visits) || 0);

  return (
    <div className="pacas-dashboard pacas-dashboard-v2">
      <header className="pacas-header pacas-header-v2">
        <div>
          <p className="pacas-eyebrow">PAQUEROS MX · BSALE → NEON</p>
          <h1>Pacas MX</h1>
          <p className="pacas-subtitle">Venta comercial, mensajes, visitas, tickets, vendedores y métodos de pago.</p>
        </div>

        <div className="pacas-header-actions">
          <div className="pacas-last-cut">Último corte: <strong>{formatLongDate(totals.lastDate)}</strong></div>
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
            <Kpi label="Venta total" value={money.format(totals.netSales || 0)} tone="blue" series={salesSeries} />
            <Kpi label="Mensajes" value={integer.format(totals.messages || 0)} tone="green" series={messageSeries} />
            <Kpi label="Tickets totales" value={integer.format(totals.tickets || 0)} tone="purple" series={ticketSeries} />
            <Kpi label="Visitas" value={integer.format(totals.visits || 0)} tone="orange" series={visitSeries} />
          </section>

          <article className="pacas-card pacas-sales-card-v2">
            <CardHeader title="Venta diaria neta" detail={`Último dato: ${formatShortDate(totals.lastDate)}`} />
            <SalesChart rows={daily} />
          </article>

          <section className="pacas-bottom-grid-v2">
            <article className="pacas-card">
              <CardHeader title="Ventas por método de pago" detail="Sobre venta bruta" />
              <PaymentsTiles rows={data.payments || []} total={totals.grossSales || 0} />
            </article>

            <article className="pacas-card pacas-sellers-card-v2">
              <CardHeader title="Ventas por vendedor" detail="Venta neta y tickets" />
              <SellerPerformance rows={data.sellers || []} />
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
            <Gauge value={targetPending ? null : (totals.currentCompliance || 0)} />
          </article>

          <SideMetric label="Meta mensual" value={targetPending ? 'Pendiente' : money.format(totals.target)} tone="blue" />
          <SideMetric label="Proyección del mes" value={money.format(totals.projection || 0)} tone="green" />
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
  const formatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${formatter.format(first)} - ${formatter.format(last)}`;
}

function formatLongDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(date);
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
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className="pacas-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
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
  return (
    <div className="pacas-gauge-wrap">
      <div className="pacas-gauge" style={{ '--gauge': `${percent ?? 0}%` }}>
        <div className="pacas-gauge-center">
          <strong>{percent == null ? '—' : `${number.format(percent)}%`}</strong>
          <span>del objetivo mensual</span>
        </div>
      </div>
      <div className="pacas-gauge-scale"><span>0%</span><span>100%</span></div>
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
  const maxAbsolute = Math.max(1, ...rows.map((row) => Math.abs(Number(row.netSales) || 0)));
  return (
    <div className="pacas-bars pacas-bars-v2" role="img" aria-label="Venta diaria neta">
      {rows.map((row) => {
        const value = Number(row.netSales) || 0;
        const height = Math.max(3, Math.round((Math.abs(value) / maxAbsolute) * 100));
        const day = String(row.date).slice(8, 10);
        return (
          <div className="pacas-bar-item" key={row.date} title={`${formatShortDate(row.date)} · ${money.format(value)}`}>
            <div className="pacas-bar-shell">
              <span className={`pacas-bar-fill${value < 0 ? ' negative' : ''}`} style={{ height: `${height}%` }} />
            </div>
            <div className="pacas-bar-day">{day}</div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentsTiles({ rows, total }) {
  if (!rows.length) return <div className="pacas-empty">Sin pagos en el periodo.</div>;
  return (
    <div className="pacas-payment-tiles">
      {rows.map((row, index) => {
        const share = total ? (row.amount / total) * 100 : 0;
        return (
          <div className={`pacas-payment-tile tile-${index % 5}`} key={row.paymentTypeId}>
            <span>{row.paymentTypeName}</span>
            <strong>{number.format(share)}%</strong>
            <small>{money.format(row.amount)}</small>
          </div>
        );
      })}
    </div>
  );
}

function SellerPerformance({ rows }) {
  if (!rows.length) return <div className="pacas-empty">Sin vendedores en el periodo.</div>;
  const max = Math.max(1, ...rows.map((row) => Math.max(0, Number(row.netSales) || 0)));
  return (
    <div className="pacas-seller-performance">
      <div className="pacas-seller-bars">
        {rows.map((row) => (
          <div className="pacas-seller-bar-row" key={`bar-${row.sellerId}`}>
            <span title={row.sellerName}>{row.sellerName}</span>
            <div><i style={{ width: `${Math.max(2, (Math.max(0, row.netSales) / max) * 100)}%` }} /></div>
            <strong>{money.format(row.netSales)}</strong>
          </div>
        ))}
      </div>
      <div className="pacas-table-wrap">
        <table className="pacas-table pacas-seller-table-v2">
          <thead><tr><th>Vendedor</th><th>Venta neta</th><th>Tickets</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sellerId}>
                <td>{row.sellerName}</td>
                <td className={row.netSales < 0 ? 'is-negative' : ''}>{money.format(row.netSales)}</td>
                <td>{integer.format(row.tickets)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
