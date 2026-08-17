'use client';

import { useEffect, useMemo, useState } from 'react';

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function PacasDashboard() {
  const [period, setPeriod] = useState(currentPeriod());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return <div className="pacas-state">Cargando Pacas MX…</div>;
  }

  if (error) {
    return <div className="pacas-state pacas-error">{error}</div>;
  }

  const totals = data?.totals || {};
  const targetPending = totals.target == null;

  return (
    <div className="pacas-dashboard">
      <header className="pacas-header">
        <div>
          <p className="pacas-eyebrow">PAQUEROS MX · BSALE → NEON</p>
          <h1>Pacas MX</h1>
          <p className="pacas-subtitle">
            Venta comercial, devoluciones, vendedores y métodos de pago.
          </p>
        </div>

        <label className="pacas-period-control">
          <span>Periodo</span>
          <input
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </label>
      </header>

      <section className="pacas-kpis">
        <Kpi label="Venta neta" value={money.format(totals.netSales || 0)} accent />
        <Kpi label="Venta bruta" value={money.format(totals.grossSales || 0)} />
        <Kpi label="Devoluciones" value={money.format(totals.returns || 0)} negative />
        <Kpi label="Tickets" value={number.format(totals.tickets || 0)} />
        <Kpi label="Ticket promedio" value={money.format(totals.averageTicket || 0)} />
        <Kpi
          label="Meta"
          value={targetPending ? 'Pendiente' : money.format(totals.target)}
          muted={targetPending}
        />
      </section>

      <section className="pacas-grid pacas-grid-main">
        <article className="pacas-card pacas-card-wide">
          <CardHeader title="Venta diaria neta" detail={`Último dato: ${totals.lastDate || '—'}`} />
          <SalesChart rows={data.daily || []} />
        </article>

        <article className="pacas-card">
          <CardHeader title="Resumen del periodo" detail={`${totals.daysWithData || 0} días con datos`} />
          <div className="pacas-summary-list">
            <SummaryRow label="Ritmo diario" value={money.format(totals.dailyPace || 0)} />
            <SummaryRow label="Proyección" value={money.format(totals.projection || 0)} />
            <SummaryRow
              label="Cumplimiento actual"
              value={targetPending ? '—' : `${number.format((totals.currentCompliance || 0) * 100)}%`}
            />
            <SummaryRow
              label="Cumplimiento proyectado"
              value={targetPending ? '—' : `${number.format((totals.projectedCompliance || 0) * 100)}%`}
            />
            <SummaryRow label="Devoluciones sin resolver" value={number.format(totals.unresolvedReturns || 0)} />
          </div>
        </article>
      </section>

      <section className="pacas-grid">
        <article className="pacas-card">
          <CardHeader title="Vendedores" detail="Neto después de devoluciones" />
          <SellerTable rows={data.sellers || []} />
        </article>

        <article className="pacas-card">
          <CardHeader title="Métodos de pago" detail="Sobre venta bruta" />
          <PaymentsList rows={data.payments || []} total={totals.grossSales || 0} />
        </article>
      </section>
    </div>
  );
}

function Kpi({ label, value, accent = false, negative = false, muted = false }) {
  return (
    <article className={`pacas-kpi${accent ? ' accent' : ''}${negative ? ' negative' : ''}`}>
      <span>{label}</span>
      <strong className={muted ? 'muted' : ''}>{value}</strong>
    </article>
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

function SalesChart({ rows }) {
  const points = useMemo(() => {
    if (!rows.length) return [];
    const values = rows.map((row) => row.netSales);
    const min = Math.min(0, ...values);
    const max = Math.max(1, ...values);
    const range = max - min || 1;

    return rows.map((row, index) => ({
      ...row,
      x: rows.length === 1 ? 50 : 4 + (index / (rows.length - 1)) * 92,
      y: 88 - ((row.netSales - min) / range) * 72,
    }));
  }, [rows]);

  if (!points.length) return <div className="pacas-empty">Sin datos para el periodo.</div>;

  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="pacas-chart-wrap">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pacas-chart" aria-label="Venta diaria neta">
        <line x1="4" y1="88" x2="96" y2="88" className="pacas-chart-axis" />
        <polyline points={polyline} fill="none" className="pacas-chart-line" />
        {points.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r="1.2" className="pacas-chart-dot" />
        ))}
      </svg>
      <div className="pacas-chart-labels">
        <span>{points[0].date.slice(8, 10)}</span>
        <span>{points[Math.floor(points.length / 2)].date.slice(8, 10)}</span>
        <span>{points[points.length - 1].date.slice(8, 10)}</span>
      </div>
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
              <td className={row.netSales < 0 ? 'is-negative' : ''}>{money.format(row.netSales)}</td>
              <td>{number.format(row.tickets)}</td>
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
        const share = total ? Math.min(100, Math.max(0, (row.amount / total) * 100)) : 0;
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
