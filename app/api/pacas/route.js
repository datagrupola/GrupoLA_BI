import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function normalizePeriod(value) {
  if (!/^\d{4}-\d{2}$/.test(value || '')) return null;
  const [year, month] = value.split('-').map(Number);
  if (year < 2020 || month < 1 || month > 12) return null;
  return value;
}

function currentPeriodMexicoCity() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month}`;
}

function firstDay(period) {
  return `${period}-01`;
}

function nextMonth(period) {
  const [year, month] = period.split('-').map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return next.toISOString().slice(0, 10);
}

function number(value) {
  return Number(value ?? 0);
}

export async function GET(request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL is not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const period = normalizePeriod(url.searchParams.get('period')) || currentPeriodMexicoCity();
  const start = firstDay(period);
  const end = nextMonth(period);
  const sql = neon(databaseUrl);

  const [daily, sellers, payments, targets, inputs] = await Promise.all([
    sql`
      SELECT sale_date, gross_sales, returns_amount, net_sales, tickets_count,
             unresolved_returns_count
      FROM public.pacas_daily_sales
      WHERE office_id = 6
        AND sale_date >= ${start}::date
        AND sale_date < ${end}::date
      ORDER BY sale_date
    `,
    sql`
      SELECT seller_id, seller_name,
             SUM(gross_sales) AS gross_sales,
             SUM(returns_amount) AS returns_amount,
             SUM(net_sales) AS net_sales,
             SUM(tickets_count) AS tickets_count
      FROM public.pacas_seller_daily
      WHERE office_id = 6
        AND sale_date >= ${start}::date
        AND sale_date < ${end}::date
      GROUP BY seller_id, seller_name
      ORDER BY SUM(net_sales) DESC, seller_name
    `,
    sql`
      SELECT payment_type_id, payment_type_name, SUM(amount) AS amount
      FROM public.pacas_payments_daily
      WHERE office_id = 6
        AND sale_date >= ${start}::date
        AND sale_date < ${end}::date
      GROUP BY payment_type_id, payment_type_name
      ORDER BY SUM(amount) DESC, payment_type_name
    `,
    sql`
      SELECT target_amount
      FROM public.pacas_monthly_targets
      WHERE office_id = 6 AND period_date = ${start}::date
      LIMIT 1
    `,
    sql`
      SELECT input_date, messages_count, visits_count
      FROM public.pacas_daily_inputs
      WHERE office_id = 6
        AND input_date >= ${start}::date
        AND input_date < ${end}::date
      ORDER BY input_date
    `,
  ]);

  const totals = daily.reduce(
    (acc, row) => {
      acc.grossSales += number(row.gross_sales);
      acc.returns += number(row.returns_amount);
      acc.netSales += number(row.net_sales);
      acc.tickets += number(row.tickets_count);
      acc.unresolvedReturns += number(row.unresolved_returns_count);
      return acc;
    },
    { grossSales: 0, returns: 0, netSales: 0, tickets: 0, unresolvedReturns: 0 }
  );

  const inputTotals = inputs.reduce(
    (acc, row) => {
      acc.messages += number(row.messages_count);
      acc.visits += number(row.visits_count);
      return acc;
    },
    { messages: 0, visits: 0 }
  );

  const target = targets[0] ? number(targets[0].target_amount) : null;
  const lastDate = daily.length ? String(daily[daily.length - 1].sale_date).slice(0, 10) : null;
  const daysWithData = daily.length;
  const [year, month] = period.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const projection = daysWithData > 0 ? (totals.netSales / daysWithData) * daysInMonth : 0;

  return NextResponse.json({
    period,
    office: { id: 6, name: 'PAQUEROS MX' },
    totals: {
      ...totals,
      ...inputTotals,
      target,
      projection,
      currentCompliance: target ? totals.netSales / target : null,
      projectedCompliance: target ? projection / target : null,
      averageTicket: totals.tickets ? totals.netSales / totals.tickets : 0,
      dailyPace: daysWithData ? totals.netSales / daysWithData : 0,
      daysWithData,
      daysInMonth,
      lastDate,
    },
    daily: daily.map((row) => ({
      date: String(row.sale_date).slice(0, 10),
      grossSales: number(row.gross_sales),
      returns: number(row.returns_amount),
      netSales: number(row.net_sales),
      tickets: number(row.tickets_count),
    })),
    inputs: inputs.map((row) => ({
      date: String(row.input_date).slice(0, 10),
      messages: number(row.messages_count),
      visits: number(row.visits_count),
    })),
    sellers: sellers.map((row) => ({
      sellerId: number(row.seller_id),
      sellerName: row.seller_name,
      grossSales: number(row.gross_sales),
      returns: number(row.returns_amount),
      netSales: number(row.net_sales),
      tickets: number(row.tickets_count),
    })),
    payments: payments.map((row) => ({
      paymentTypeId: number(row.payment_type_id),
      paymentTypeName: row.payment_type_name,
      amount: number(row.amount),
    })),
  });
}
