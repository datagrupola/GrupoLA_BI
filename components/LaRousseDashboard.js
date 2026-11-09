"use client";
import { useEffect, useRef, useState } from "react";
import { money, summarize } from "../lib/larousse.mjs";
import { reviewCutCounts } from "../lib/larousse-review.mjs";
import { dailyCommercialMetrics } from "../lib/larousse-daily.mjs";
import { datesForTimeline, branchDailyMetrics } from "../lib/larousse-branch-series.mjs";
import { salesParticipation } from "../lib/larousse-visualizations.mjs";
import { projectedPerformanceTier, compareProjectedCompliance } from "../lib/larousse-performance.mjs";
import { comparisonWindows, periodComparison } from "../lib/larousse-comparison.mjs";
import {
  commercialMetrics,
  commercialCutoffDate,
  commercialProjection,
  formatHundredths,
  percent,
  sumUnits,
} from "../lib/larousse-commercial.mjs";
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
      <span className="lr2-metric-label">Avance contra meta</span>
      <strong className="lr8-goal-value">{label}</strong>
      <div className="lr8-goal-details">
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
      </div>
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
      <div className="lr8-forecast-support">
        <div className="lr7-forecast-details">
          <div><span>Ritmo diario de venta</span><b>{money(forecast.observedDaily)} / día reportado</b></div>
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
      </div>
    </article>
  );
}
function CutReview({ rows, confirmed }) {
  const review = reviewCutCounts(rows);
  // Keep proportional segments; show a compact fallback only when a segment
  // is too narrow to display its count legibly (especially on mobile).
  const approvedInBar = review.approvedPercent >= 30;
  const pendingInBar = review.awaitingPercent >= 30;
  return (
    <aside className="lr8-review" aria-label="Revisión de cortes por Finance">
      <div className="lr8-review-heading">
        <strong>Revisión de cortes</strong>
        <span>{review.total} cortes OPS comerciales</span>
      </div>
      <div className="lr8-review-chart">
        {review.total > 0 ? (
          <>
            <div className="lr8-review-track"
              role="img"
              aria-label={`${review.approved} aprobados; ${review.awaiting} pendientes de aprobación, incluidos ${review.correction} en corrección`}>
              {review.approved > 0 && (
                <span className="lr8-review-approved"
                  style={{ width: review.approvedPercent + "%" }}
                  title={`${review.approved} aprobados`}>
                  {approvedInBar && <b>{number(review.approved)} aprobados</b>}
                </span>
              )}
              {review.awaiting > 0 && (
                <span className="lr8-review-pending"
                  style={{ width: review.awaitingPercent + "%" }}
                  title={`${review.awaiting} pendientes`}>
                  {pendingInBar && <b>{number(review.awaiting)} pendientes</b>}
                </span>
              )}
            </div>
            {((review.approved > 0 && !approvedInBar) ||
              (review.awaiting > 0 && !pendingInBar)) && (
              <p className="lr9-review-fallback">
                {review.approved > 0 && !approvedInBar && <span>{number(review.approved)} aprobados</span>}
                {review.awaiting > 0 && !pendingInBar && <span>{number(review.awaiting)} pendientes</span>}
              </p>
            )}
          </>
        ) : (
          <div className="lr8-review-empty">Sin cortes OPS comerciales para revisar</div>
        )}
      </div>
      <p className="lr8-review-foot">
        Venta aprobada: <strong>{money(confirmed.net)}</strong>
        <span aria-hidden="true"> · </span>
        {confirmed.known}/{confirmed.count} cortes aprobados con importe
        {review.correction > 0 && (
          <span> · Incluye {review.correction} en corrección</span>
        )}
      </p>
    </aside>
  );
}
const DAILY_OPTIONS = [
  { key: "net", label: "Ventas", selectedLabel: "Venta neta del día" },
  { key: "footfall", label: "Afluencia", selectedLabel: "Afluencia del día" },
  { key: "conversion", label: "Conversión", selectedLabel: "Conversión del día" },
  { key: "piecesPerTicket", label: "Piezas por ticket", selectedLabel: "Piezas por ticket del día" },
];
function DailySeries({ rows, indicator, selectedDate, setSelectedDate, calendarDates, dailyData }) {
  const chosen = DAILY_OPTIONS.find((option) => option.key === indicator) || DAILY_OPTIONS[0];
  const observedDates = calendarDates || [...new Set(rows.map((row) => row.date))].sort();
  const dates = [];
  if (observedDates.length) {
    const cursor = new Date(observedDates[0] + "T00:00:00Z");
    const last = new Date(observedDates[observedDates.length - 1] + "T00:00:00Z").getTime();
    while (cursor.getTime() <= last) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  const daily = dailyData || dailyCommercialMetrics(rows, dates);
  const known = daily.filter((day) => day[indicator] !== null);
  const selected = daily.find((day) => day.date === selectedDate)
    || known[known.length - 1] || daily[daily.length - 1];
  const maxKnown = known.reduce(
    (high, day) => day[indicator] > high ? day[indicator] : high, 0n
  );
  const chartMax = maxKnown > 0n ? maxKnown : 100n;
  const chartWidth = Math.max(700, daily.length * 42);
  const chartHeight = 250;
  const left = 100, right = 24, top = 16, bottom = 39;
  const chartBase = chartHeight - bottom;
  const chartInnerHeight = chartBase - top;
  const pointX = (index) => left + (daily.length === 1 ? (chartWidth - left - right) / 2 :
    index * (chartWidth - left - right) / (daily.length - 1));
  const pointY = (amount) => chartBase -
    Number(amount * BigInt(chartInnerHeight) / chartMax);
  const points = daily.map((day, index) => ({
    ...day, x: pointX(index),
    y: day[indicator] === null ? null : pointY(day[indicator]),
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
  const formatValue = (value) => {
    if (indicator === "net") return money(value);
    if (indicator === "footfall") return number(value);
    return formatHundredths(value, indicator === "conversion" ? "%" : "");
  };
  const formatAxis = (value) => {
    if (indicator === "net") return new Intl.NumberFormat("es-MX", {
      style: "currency", currency: "MXN", notation: "compact", maximumFractionDigits: 1,
    }).format(Number(value) / 100);
    if (indicator === "footfall") return new Intl.NumberFormat("es-MX", {
      notation: "compact", maximumFractionDigits: 1,
    }).format(Number(value));
    return formatHundredths(value, indicator === "conversion" ? "%" : "");
  };
  const dayLabel = (date) => date
    ? new Intl.DateTimeFormat("es-MX", {
        day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
      }).format(new Date(date + "T00:00:00Z"))
    : "";
  const tickStep = Math.max(1, Math.ceil(points.length / 11));
  return (
    <div className="lr10-series" aria-label={"Serie diaria de " + chosen.label.toLowerCase()}>
      <h3 className="lr10-series-title">{chosen.label}</h3>
      {!daily.length ? (
        <p className="lr2-empty">No hay cortes comerciales comparables para mostrar.</p>
      ) : (
        <>
          <div className="lr6-selected">
            <div>
              <span>{chosen.selectedLabel}</span>
              <strong>{formatValue(selected[indicator])}</strong>
            </div>
            <time dateTime={selected.date}>{dayLabel(selected.date)}</time>
          </div>
          <div className="lr6-scroll" role="region"
            aria-label={"Gráfica diaria de " + chosen.label.toLowerCase()} tabIndex={0}>
            <svg className="lr6-chart" width={chartWidth} height={chartHeight}
              viewBox={"0 0 " + chartWidth + " " + chartHeight}
              role="group" aria-label={"Serie temporal de " + chosen.label.toLowerCase()}>
              {Array.from({ length: 5 }, (_, i) => {
                const amount = chartMax * BigInt(4 - i) / 4n;
                const y = top + (chartInnerHeight * i) / 4;
                return (
                  <g key={"tick-" + i}>
                    <line className="lr6-grid" x1={left} y1={y}
                      x2={chartWidth - right} y2={y} />
                    <text className="lr6-axis" textAnchor="end" x={left - 12} y={y + 4}>
                      {formatAxis(amount)}
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
                  aria-label={dayLabel(point.date) + ": " + formatValue(point[indicator])}
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
                  <title>{dayLabel(point.date) + " · " + formatValue(point[indicator])}</title>
                </g>
              ))}
            </svg>
          </div>
          {daily.some((day) => day[indicator] === null) &&
            <p className="lr6-gap-note">Las fechas sin datos comparables para {chosen.label.toLowerCase()} se muestran como interrupciones de la línea.</p>}
          <details className="lr4-daily-detail">
            <summary>Ver detalle diario</summary>
            <div className="lr2-table-scroll">
              <table>
                <thead><tr><th>Fecha</th><th>{chosen.label}</th><th>Cobertura de venta</th></tr></thead>
                <tbody>
                  {daily.map((day) => (
                    <tr key={day.date}>
                      <td>{day.date}</td>
                      <td>{formatValue(day[indicator])}</td>
                      <td>{day.known}/{day.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}


const BRANCH_COLORS = ["#246bad", "#b14f69", "#148575", "#a46a20", "#735cb3", "#526d88", "#ad4e29", "#576e25"];
function BranchComparisonSeries({ indicator, series, branches, dates, selectedDate, setSelectedDate }) {
  const chosen = DAILY_OPTIONS.find((option) => option.key === indicator) || DAILY_OPTIONS[0];
  const formatValue = (value) => indicator === "net" ? money(value) :
    indicator === "footfall" ? number(value) :
    formatHundredths(value, indicator === "conversion" ? "%" : "");
  const axisValue = (value) => indicator === "net"
    ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", notation: "compact", maximumFractionDigits: 1 }).format(Number(value) / 100)
    : indicator === "footfall"
      ? new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))
      : formatValue(value);
  const dayLabel = (date) => date ? new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z")) : "";
  const names = new Map(branches.map((branch) => [branch.id, branch.name]));
  const charts = series.map((item) => ({
    ...item, name: names.get(item.id) || item.id,
    color: BRANCH_COLORS[Math.max(0, branches.findIndex((branch) => branch.id === item.id)) % BRANCH_COLORS.length],
  }));
  const lastKnown = [...dates].reverse().find((date) =>
    charts.some((item) => item.days.some((day) => day.date === date && day[indicator] !== null)));
  const activeDate = selectedDate && dates.includes(selectedDate)
    ? selectedDate : lastKnown || dates[dates.length - 1];
  let maximum = 0n;
  for (const item of charts)
    for (const day of item.days)
      if (day[indicator] !== null && day[indicator] > maximum) maximum = day[indicator];
  const chartMax = maximum > 0n ? maximum : 100n;
  const chartWidth = Math.max(700, dates.length * 42);
  const chartHeight = 250;
  const left = 100, right = 24, top = 16, bottom = 39;
  const baseY = chartHeight - bottom;
  const innerHeight = baseY - top;
  const x = (index) => left + (dates.length === 1 ? (chartWidth - left - right) / 2 :
    index * (chartWidth - left - right) / (dates.length - 1));
  const y = (value) => baseY - Number(value * BigInt(innerHeight) / chartMax);
  const plotted = charts.map((item) => ({
    ...item,
    points: item.days.map((day, index) => ({
      ...day, x: x(index), y: day[indicator] === null ? null : y(day[indicator]),
    })),
  }));
  const paths = (points) => {
    const segments = [];
    let group = [];
    for (const point of points) {
      if (point.y === null) {
        if (group.length) segments.push(group);
        group = [];
      } else group.push(point);
    }
    if (group.length) segments.push(group);
    return segments;
  };
  const tickStep = Math.max(1, Math.ceil(dates.length / 11));
  return (
    <div className="lr10-series" aria-label={"Comparación diaria de " + chosen.label.toLowerCase()}>
      <h3 className="lr10-series-title">{chosen.label}</h3>
      {!dates.length ? <p className="lr2-empty">No hay cortes comerciales comparables para mostrar.</p> : (
        <>
          <div className="lr11-series-meta">
            <span>{chosen.selectedLabel} · {dayLabel(activeDate)}</span>
            <div className="lr11-series-legend">
              {plotted.map((item) => (
                <div className="lr11-legend-item" key={item.id}>
                  <span className="lr11-color" style={{ backgroundColor: item.color }} aria-hidden="true" />
                  <span>{item.name}</span>
                  <strong>{formatValue(item.days.find((day) => day.date === activeDate)?.[indicator] ?? null)}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="lr6-scroll" role="region"
            aria-label={"Gráfica comparativa de " + chosen.label.toLowerCase()} tabIndex={0}>
            <svg className="lr6-chart" width={chartWidth} height={chartHeight}
              viewBox={"0 0 " + chartWidth + " " + chartHeight}
              role="group" aria-label={"Series comparativas de " + chosen.label.toLowerCase()}>
              {Array.from({ length: 5 }, (_, i) => {
                const amount = chartMax * BigInt(4 - i) / 4n;
                const axisY = top + (innerHeight * i) / 4;
                return <g key={"tick-" + i}>
                  <line className="lr6-grid" x1={left} y1={axisY}
                    x2={chartWidth - right} y2={axisY} />
                  <text className="lr6-axis" x={left - 12} y={axisY + 4} textAnchor="end">
                    {axisValue(amount)}
                  </text>
                </g>;
              })}
              {dates.map((date, index) =>
                index % tickStep === 0 || index === dates.length - 1
                  ? <text key={date} className="lr6-axis" x={x(index)}
                      y={chartHeight - 11} textAnchor="middle">{date.slice(8)}</text>
                  : null)}
              {plotted.flatMap((item) =>
                paths(item.points).filter((segment) => segment.length > 1)
                  .map((segment, index) => <polyline key={item.id + "-segment-" + index}
                    className="lr6-series" style={{ stroke: item.color }}
                    points={segment.map((point) => point.x + "," + point.y).join(" ")}
                    fill="none" strokeLinecap="round" strokeLinejoin="round" />))}
              {plotted.flatMap((item) => item.points.filter((point) => point.y !== null).map((point) => (
                <g key={item.id + "-" + point.date} role="button" tabIndex={0}
                  aria-label={item.name + " · " + dayLabel(point.date) + ": " + formatValue(point[indicator])}
                  aria-pressed={activeDate === point.date}
                  onMouseEnter={() => setSelectedDate(point.date)}
                  onFocus={() => setSelectedDate(point.date)}
                  onClick={() => setSelectedDate(point.date)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedDate(point.date);
                    }
                  }}>
                  <circle cx={point.x} cy={point.y} r={15} fill="transparent" />
                  <circle className={activeDate === point.date ? "lr6-dot lr6-dot-active" : "lr6-dot"}
                    style={{ stroke: item.color, fill: activeDate === point.date ? item.color : "#fff" }}
                    cx={point.x} cy={point.y} r={activeDate === point.date ? 6 : 4.5} />
                  <title>{item.name + " · " + dayLabel(point.date) + ": " + formatValue(point[indicator])}</title>
                </g>
              )))}
            </svg>
          </div>
          {plotted.some((item) => item.days.some((day) => day[indicator] === null)) &&
            <p className="lr6-gap-note">Los días sin un corte válido o sin datos completos interrumpen únicamente la serie correspondiente.</p>}
          <details className="lr4-daily-detail">
            <summary>Ver detalle diario por sucursal</summary>
            <div className="lr2-table-scroll">
              <table>
                <thead><tr><th>Fecha</th>{plotted.map((item) => <th key={item.id}>{item.name}</th>)}</tr></thead>
                <tbody>{dates.map((date, index) => <tr key={date}>
                  <td>{date}</td>
                  {plotted.map((item) => <td key={item.id}>{formatValue(item.days[index]?.[indicator] ?? null)}</td>)}
                </tr>)}</tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}


function SalesByBranchChart({ rows, branches, selectedIds }) {
  const result = salesParticipation(rows, branches, selectedIds);
  const colors = new Map(branches.map((item, index) =>
    [item.id, BRANCH_COLORS[index % BRANCH_COLORS.length]]));
  const slices = result.entries.filter((entry) => entry.net !== null && entry.net > 0n);
  const formatShare = (entry) => entry.tenths === null ? "No disponible"
    : (Math.floor(entry.tenths / 10) + "." + entry.tenths % 10 + "%");
  const coordinate = (angle, radius) => ({
    x: 115 + Math.cos(angle) * radius,
    y: 115 + Math.sin(angle) * radius,
  });
  let cumulative = 0n;
  const wedges = slices.map((entry) => {
    const start = -Math.PI / 2 + 2 * Math.PI * Number(cumulative * 1000000n / result.total) / 1000000;
    cumulative += entry.net;
    const finish = -Math.PI / 2 + 2 * Math.PI * Number(cumulative * 1000000n / result.total) / 1000000;
    const p1 = coordinate(start, 103), p2 = coordinate(finish, 103);
    const middle = coordinate((start + finish) / 2, 66);
    return {
      ...entry, color: colors.get(entry.id), middle,
      path: "M115,115 L" + p1.x + "," + p1.y +
        " A103,103 0 " + (finish - start > Math.PI ? 1 : 0) +
        " 1 " + p2.x + "," + p2.y + " Z",
    };
  });
  return (
    <article className="lr14-card" aria-label="Participación de venta por sucursal">
      <h3>Venta por sucursal</h3>
      {!result.chartable ? (
        <p className="lr2-empty">No hay ventas netas verificables para calcular porcentajes.</p>
      ) : (
        <>
          <div className="lr14-pie-layout">
            <svg viewBox="0 0 230 230" className="lr14-pie"
              role="img" aria-label="Gráfica circular de venta por sucursal">
              <title>Participación de ventas registradas por sucursal</title>
              {wedges.length === 1 ? (
                <circle cx="115" cy="115" r="103" fill={wedges[0].color}>
                  <title>{wedges[0].name + ": 100.0%"}</title>
                </circle>
              ) : wedges.map((entry) => (
                <path key={entry.id} d={entry.path} fill={entry.color} stroke="#fff" strokeWidth="1">
                  <title>{entry.name + ": " + formatShare(entry) + " · " + money(entry.net)}</title>
                </path>
              ))}
              {wedges.filter((entry) => entry.tenths >= 85).map((entry) => (
                <text key={entry.id} x={entry.middle.x} y={entry.middle.y + 4}
                  className="lr14-pie-label" textAnchor="middle">{formatShare(entry)}</text>
              ))}
            </svg>
            <div className="lr14-pie-legend">
              {result.entries.map((entry) => (
                <div key={entry.id} className="lr14-pie-legend-item">
                  <span className="lr14-color" style={{ backgroundColor: colors.get(entry.id) }} aria-hidden="true" />
                  <span className="lr14-branch-name">{entry.name}</span>
                  <strong>{formatShare(entry)}</strong>
                  <small>{entry.net === null ? entry.reason : money(entry.net)}</small>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </article>
  );
}

function ConversionFootfallChart({ days, selectedDate, setSelectedDate }) {
  const known = days.filter((day) => day.conversion !== null || day.footfall !== null);
  let peakConversion = 0n;
  let peakFootfall = 0n;
  for (const day of days) {
    if (day.conversion !== null && day.conversion > peakConversion) peakConversion = day.conversion;
    if (day.footfall !== null && day.footfall > peakFootfall) peakFootfall = day.footfall;
  }
  const convMax = (peakConversion > 5000n
    ? (peakConversion + 1999n) / 2000n * 2000n
    : 6000n);
  const trafficStep = peakFootfall <= 30n ? 10n :
    peakFootfall <= 300n ? 50n : peakFootfall <= 1500n ? 200n : 500n;
  const trafficMax = peakFootfall > 0n
    ? ((peakFootfall * 11n / 10n + trafficStep) / trafficStep) * trafficStep
    : trafficStep;
  const width = Math.max(720, days.length * 33 + 125);
  const height = 270, left = 57, right = 58, top = 24, bottom = 43;
  const chartBottom = height - bottom, chartHeight = chartBottom - top;
  const innerWidth = width - left - right;
  const stepX = innerWidth / Math.max(days.length, 1);
  const x = (index) => left + stepX * (index + 0.5);
  const yConversion = (value) => chartBottom -
    Number(value * BigInt(chartHeight) / convMax);
  const yFootfall = (value) => chartBottom -
    Number(value * BigInt(chartHeight) / trafficMax);
  const series = days.map((day, index) => ({
    ...day, x: x(index),
    lineY: day.conversion === null ? null : yConversion(day.conversion),
    barY: day.footfall === null ? null : yFootfall(day.footfall),
  }));
  const segments = [];
  let current = [];
  for (const point of series) {
    if (point.lineY === null) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push(point);
  }
  if (current.length) segments.push(current);
  const activeDay = days.find((day) => day.date === selectedDate) ||
    known[known.length - 1] || days[days.length - 1];
  const dayLabel = (date) => date ? new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z")) : "";
  const dateStep = Math.max(1, Math.ceil(days.length / 11));
  return (
    <article className="lr14-card" aria-label="Conversión y afluencia a piso por fecha">
      <h3>Conversión y afluencia a piso por fecha</h3>
      {!days.length ? (
        <p className="lr2-empty">No hay fechas comerciales verificables.</p>
      ) : (
        <>
          <div className="lr14-legend">
            <span><i className="lr14-line-marker" aria-hidden="true" />Conversión · eje izquierdo</span>
            <span><i className="lr14-bar-marker" aria-hidden="true" />Afluencia · eje derecho</span>
          </div>
          <div className="lr6-scroll lr14-combo-scroll" role="region"
            tabIndex={0} aria-label="Gráfica de conversión y afluencia con dos ejes">
            <svg width={width} height={height} viewBox={"0 0 " + width + " " + height}
              className="lr6-chart" role="group" aria-label="Conversión porcentual y afluencia diaria">
              {Array.from({ length: 4 }, (_, i) => {
                const val = BigInt(3 - i);
                const axisY = top + chartHeight * i / 3;
                return (
                  <g key={"axis-" + i}>
                    <line className="lr6-grid" x1={left} x2={width - right} y1={axisY} y2={axisY} />
                    <text className="lr14-axis-left" x={left - 9} y={axisY + 4}
                      textAnchor="end">{formatHundredths(convMax * val / 3n, "%")}</text>
                    <text className="lr14-axis-right" x={width - right + 9} y={axisY + 4}
                      textAnchor="start">{number(trafficMax * val / 3n)}</text>
                  </g>
                );
              })}
              {series.map((day, index) => day.barY === null ? null : (
                <rect key={"bar-" + day.date} x={day.x - Math.min(12, stepX * .3)}
                  y={day.barY} width={Math.min(24, stepX * .6)}
                  height={chartBottom - day.barY} fill="#274d92" rx="1" />
              ))}
              {segments.filter((segment) => segment.length > 1).map((segment, index) => (
                <polyline key={"curve-" + index} className="lr14-conversion-line"
                  points={segment.map((point) => point.x + "," + point.lineY).join(" ")}
                  fill="none" />
              ))}
              {series.filter((day) => day.lineY !== null).map((day) => (
                <circle key={"point-" + day.date} cx={day.x} cy={day.lineY}
                  r={activeDay?.date === day.date ? 5.5 : 3.4}
                  fill="#299cf0" stroke="#fff" strokeWidth="1.4" />
              ))}
              {series.map((day, index) =>
                index % dateStep === 0 || index === series.length - 1 ? (
                  <text className="lr6-axis" key={"date-" + day.date}
                    x={day.x} y={height - 12} textAnchor="middle">{day.date.slice(8)}</text>
                ) : null)}
              {activeDay && (() => {
                const activeIndex = days.findIndex((day) => day.date === activeDay.date);
                return <line x1={x(activeIndex)} x2={x(activeIndex)}
                  y1={top} y2={chartBottom} className="lr14-cursor" />;
              })()}
              {series.map((day) => (
                <g key={"interaction-" + day.date} role="button" tabIndex={0}
                  aria-label={dayLabel(day.date) + ": conversión " +
                    formatHundredths(day.conversion, "%") + ", afluencia " + number(day.footfall)}
                  onMouseEnter={() => setSelectedDate(day.date)}
                  onFocus={() => setSelectedDate(day.date)}
                  onClick={() => setSelectedDate(day.date)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedDate(day.date);
                    }
                  }}>
                  <rect x={day.x - stepX / 2} y={top} width={stepX}
                    height={chartHeight} fill="transparent" />
                  <title>{dayLabel(day.date) + " · " +
                    formatHundredths(day.conversion, "%") + " · " + number(day.footfall)}</title>
                </g>
              ))}
            </svg>
          </div>
          {activeDay && (
            <div className="lr14-selected-day" aria-live="polite">
              <strong>{dayLabel(activeDay.date)}</strong>
              <span>Conversión: <b>{formatHundredths(activeDay.conversion, "%")}</b></span>
              <span>Afluencia: <b>{number(activeDay.footfall)}</b></span>
            </div>
          )}
        </>
      )}
    </article>
  );
}

function Daily({ rows, branches, initialBranch }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [mainIndicator, setMainIndicator] = useState("net");
  const [additionalIndicators, setAdditionalIndicators] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState(
    () => initialBranch ? [initialBranch] : branches.map((item) => item.id)
  );
  const [branchMode, setBranchMode] = useState("consolidated");
  const [branchSearch, setBranchSearch] = useState("");
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const branchPickerRef = useRef(null);
  useEffect(() => {
    if (!branchPickerOpen) return;
    const closeOutside = (event) => {
      if (branchPickerRef.current && !branchPickerRef.current.contains(event.target))
        setBranchPickerOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setBranchPickerOpen(false);
        branchPickerRef.current?.querySelector(".lr12-branch-trigger")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [branchPickerOpen]);
  const selectedIds = branches.map((item) => item.id).filter((id) => selectedBranches.includes(id));
  const calendarDates = datesForTimeline(rows);
  const series = branchDailyMetrics(rows, calendarDates, selectedIds, branchMode);
  const scopedRows = rows.filter((row) => selectedIds.includes(row.branch_id));
  const chooseMainIndicator = (key) => {
    if (!DAILY_OPTIONS.some((option) => option.key === key)) return;
    setMainIndicator(key);
    setAdditionalIndicators((current) => current.filter((value) => value !== key));
  };
  const addAdditionalIndicator = () => setAdditionalIndicators((current) => {
    const next = DAILY_OPTIONS.find((option) =>
      option.key !== mainIndicator && !current.includes(option.key));
    return next ? [...current, next.key] : current;
  });
  const changeAdditionalIndicator = (previous, next) => {
    setAdditionalIndicators((current) => {
      if (next === mainIndicator ||
          !DAILY_OPTIONS.some((option) => option.key === next) ||
          (next !== previous && current.includes(next))) return current;
      return current.map((value) => value === previous ? next : value);
    });
  };
  const renderMetricChart = (indicator) => branchMode === "comparison" ? (
    <BranchComparisonSeries indicator={indicator}
      series={series} branches={branches} dates={calendarDates}
      selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
  ) : (
    <DailySeries rows={scopedRows} indicator={indicator}
      calendarDates={calendarDates} dailyData={series[0]?.days}
      selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
  );
  const toggleBranch = (id) => setSelectedBranches((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const shownBranches = branches.filter((item) =>
    item.name.toLocaleLowerCase("es-MX").includes(branchSearch.trim().toLocaleLowerCase("es-MX")));
  const summaryNames = branches.filter((item) => selectedIds.includes(item.id)).map((item) => item.name);
  const selectedSummary = !selectedIds.length ? "Sin sucursales" :
    selectedIds.length === branches.length ? "Todas las sucursales" :
    summaryNames.slice(0, 3).join(" · ") +
    (summaryNames.length > 3 ? " · +" + (summaryNames.length - 3) : "");
  return (
    <section className="lr2-panel lr6-daily">
      <div className="lr9-daily-header lr12-daily-header">
        <h2>Evolución diaria</h2>
      </div>
      <div className="lr9-indicator-picker lr12-metric-tabs lr13-main-tabs"
        role="tablist" aria-label="Métrica principal de evolución diaria">
        {DAILY_OPTIONS.map((option, index) => (
          <button key={option.key} id={"lr13-tab-" + option.key}
            type="button" role="tab" aria-controls="lr13-main-panel"
            aria-selected={mainIndicator === option.key}
            tabIndex={mainIndicator === option.key ? 0 : -1}
            className={mainIndicator === option.key ? "lr9-indicator-active" : ""}
            onClick={() => chooseMainIndicator(option.key)}
            onKeyDown={(event) => {
              const last = DAILY_OPTIONS.length - 1;
              let nextIndex = null;
              if (event.key === "ArrowRight") nextIndex = (index + 1) % DAILY_OPTIONS.length;
              if (event.key === "ArrowLeft") nextIndex = (index + last) % DAILY_OPTIONS.length;
              if (event.key === "Home") nextIndex = 0;
              if (event.key === "End") nextIndex = last;
              if (nextIndex === null) return;
              event.preventDefault();
              chooseMainIndicator(DAILY_OPTIONS[nextIndex].key);
              event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[nextIndex]?.focus();
            }}>
            {option.label}
          </button>
        ))}
      </div>
      <div className="lr12-toolbar">
        <div className="lr11-branch-picker" ref={branchPickerRef}>
          <button type="button" className="lr12-branch-trigger"
            aria-expanded={branchPickerOpen} aria-controls="lr12-branch-menu"
            aria-haspopup="true" onClick={() => setBranchPickerOpen((open) => !open)}>
            <span aria-hidden="true">▦</span>
            <span>Sucursales ({selectedIds.length})</span>
            <span className="lr12-chevron" aria-hidden="true">⌄</span>
          </button>
          {branchPickerOpen && (
            <div id="lr12-branch-menu" className="lr12-branch-popover"
              role="group" aria-label="Selección de sucursales para evolución diaria">
              <input type="search" aria-label="Buscar sucursal en series"
                placeholder="Buscar sucursal…" value={branchSearch}
                onChange={(event) => setBranchSearch(event.target.value)} />
              <div className="lr11-branch-actions">
                <button type="button" aria-label="Seleccionar todas las sucursales"
                  onClick={() => setSelectedBranches(branches.map((item) => item.id))}>Todas</button>
                <button type="button" onClick={() => setSelectedBranches([])}>Limpiar</button>
              </div>
              <div className="lr11-branch-options">
                {shownBranches.map((item) => (
                  <label key={item.id}>
                    <input type="checkbox" checked={selectedIds.includes(item.id)}
                      onChange={() => toggleBranch(item.id)} />
                    <span>{item.name}</span>
                  </label>
                ))}
                {!shownBranches.length && (
                  <span className="lr10-series-hint">Sin sucursales coincidentes.</span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="lr11-mode-buttons lr12-mode-switch" role="group"
          aria-label="Modo de visualización de series">
          <button type="button" aria-pressed={branchMode === "consolidated"}
            className={branchMode === "consolidated" ? "lr11-mode-active" : ""}
            onClick={() => setBranchMode("consolidated")}>Consolidado</button>
          <button type="button" aria-pressed={branchMode === "comparison"}
            className={branchMode === "comparison" ? "lr11-mode-active" : ""}
            onClick={() => setBranchMode("comparison")}>Comparativo</button>
        </div>
      </div>
      <p className="lr12-selection-summary">
        Gráficas: {selectedSummary} · {branchMode === "comparison" ? "Comparativo" : "Consolidado"}
        <span className="lr12-scope-hint"> · Selección independiente del filtro superior</span>
      </p>
      {!selectedIds.length ? (
        <p className="lr2-empty">Selecciona al menos una sucursal para mostrar las series.</p>
      ) : (
        <div className="lr10-series-list lr13-chart-list">
          <div id="lr13-main-panel" role="tabpanel" tabIndex={0}
            aria-labelledby={"lr13-tab-" + mainIndicator} className="lr13-main-chart">
            {renderMetricChart(mainIndicator)}
          </div>
          {additionalIndicators.map((indicator, index) => (
            <div key={indicator} className="lr13-extra-chart">
              <div className="lr13-extra-heading">
                <select aria-label={"Métrica de gráfica adicional " + (index + 1)}
                  value={indicator}
                  onChange={(event) => changeAdditionalIndicator(indicator, event.target.value)}>
                  {DAILY_OPTIONS.filter((option) =>
                    option.key === indicator ||
                    (option.key !== mainIndicator && !additionalIndicators.includes(option.key)))
                    .map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                </select>
                <button type="button" className="lr13-remove-chart"
                  aria-label={"Quitar gráfica de " + DAILY_OPTIONS.find((option) => option.key === indicator).label}
                  onClick={() => setAdditionalIndicators((current) =>
                    current.filter((value) => value !== indicator))}>×</button>
              </div>
              {renderMetricChart(indicator)}
            </div>
          ))}
          <button type="button" className="lr13-add-chart"
            disabled={additionalIndicators.length >= DAILY_OPTIONS.length - 1}
            onClick={addAdditionalIndicator}>
            <span aria-hidden="true">+</span>
            {additionalIndicators.length >= DAILY_OPTIONS.length - 1
              ? "Todas las gráficas agregadas" : "Agregar otra gráfica"}
          </button>
        </div>
      )}
      {!!selectedIds.length && (
        <div className="lr16-conversion-traffic">
          <ConversionFootfallChart
            days={branchDailyMetrics(rows, calendarDates, selectedIds, "consolidated")[0]?.days || []}
            selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
        </div>
      )}
    </section>
  );
}

function CommercialComparison({ comparison, windows, loading, error, mode, onModeChange }) {
  const formatPeriod = (window) => window.start + " a " + window.end;
  const formatValue = (metric, value) => {
    if (value === null) return "No disponible";
    if (metric.kind === "money") return money(value);
    if (metric.kind === "units") return number(value);
    return formatHundredths(value, metric.kind === "ratio-percent" ? "%" : "");
  };
  const formatChange = (metric) => {
    if (metric.change === null) return "No disponible";
    const absolute = metric.change < 0n ? -metric.change : metric.change;
    const magnitude = (absolute / 100n).toString() + "." +
      (absolute % 100n).toString().padStart(2, "0");
    const sign = metric.change < 0n ? "−" : metric.change > 0n ? "+" : "";
    const unit = metric.kind === "ratio-percent" ? " pp" :
      metric.kind === "ratio" ? " piezas/ticket" : "%";
    return sign + magnitude + unit;
  };
  return (
    <section className="lr2-panel lr10-comparison">
      <div className="lr10-comparison-title">
        <div>
          <h2>Comparativo comercial</h2>
          {mode !== "none" && windows && (
            <p>{windows.mode === "week" ? "Últimos 7 días vs. 7 días previos" :
              "Mes a la fecha vs. mismos días del mes anterior"}</p>
          )}
        </div>
        <label className="lr16-comparison-selector">
          <span>Comparar con</span>
          <select aria-label="Comparación temporal global" value={mode}
            onChange={(event) => onModeChange(event.target.value)}>
            <option value="none">Sin comparación</option>
            <option value="week">7 días anteriores</option>
            <option value="month">Mes anterior (mismos días)</option>
          </select>
        </label>
      </div>
      {mode === "none" ? (
        <p className="lr10-comparison-status">Selecciona un período para comparar.</p>
      ) : !windows ? (
        <p className="lr6-gap-note">Sin fecha de corte global verificable para realizar la comparación.</p>
      ) : loading ? (
        <p role="status" className="lr10-comparison-status">Consultando período anterior…</p>
      ) : error ? (
        <p role="status" className="lr10-comparison-status">{error}</p>
      ) : !comparison ? (
        <p role="status" className="lr10-comparison-status">Comparativo no disponible.</p>
      ) : (
        <>
          <div className="lr10-comparison-coverage">
            <span>Período actual: <b>{formatPeriod(windows.current)}</b>
              {" "}({comparison.current.observedPairs}/{comparison.current.expectedPairs} sucursal-días)
            </span>
            <span>Anterior: <b>{formatPeriod(windows.previous)}</b>
              {" "}({comparison.previous.observedPairs}/{comparison.previous.expectedPairs} sucursal-días)
            </span>
          </div>
          {(!comparison.current.complete || !comparison.previous.complete) && (
            <p className="lr10-comparison-warning" role="status">
              Cobertura insuficiente o duplicada en alguno de los períodos. Las variaciones sin evidencia
              comparable se muestran como «No disponible», nunca como cero.
            </p>
          )}
          <div className="lr2-table-scroll">
            <table className="lr10-comparison-table">
              <thead>
                <tr>
                  <th>Indicador</th><th>Actual</th><th>Anterior</th><th>Variación</th>
                </tr>
              </thead>
              <tbody>
                {comparison.metrics.map((metric) => (
                  <tr key={metric.key}>
                    <th scope="row">{metric.label}</th>
                    <td>{formatValue(metric, metric.currentValue)}</td>
                    <td>{formatValue(metric, metric.previousValue)}</td>
                    <td className="lr10-comparison-delta">{formatChange(metric)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Branches({ data, selected, overall, month, globalCutoff }) {
  const groups = data.branches
    .filter((b) => !selected || b.id === selected)
    .map((b) => {
      const scopedRows = data.rows.filter((r) => r.branch_id === b.id);
      const scopedTargets = data.targets.filter((t) => t.branch_id === b.id);
      return {
        ...b,
        m: commercialMetrics(scopedRows, scopedTargets),
        projection: commercialProjection(scopedRows, scopedTargets, month, globalCutoff),
        count: scopedRows.length,
      };
    })
    .sort(compareProjectedCompliance);
  return (
    <section className="lr2-panel lr15-branch-performance">
      <h2>Desempeño por sucursal</h2>
      {!overall.complete && <p className="lr3-note">Ranking parcial: hay registros sin venta neta comparable.</p>}
      <div className="lr2-table-scroll lr16-ranking-desktop">
        <table>
          <thead>
            <tr>
              <th>Sucursal</th>
              <th>Venta neta</th>
              <th>Proyección de cierre</th>
              <th>Cumplimiento proyectado</th>
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
              <tr key={b.id} className={
                "lr15-performance-" + (projectedPerformanceTier(b.projection.projectedNet, b.m.target) || "neutral")
              }>
                <th>{b.name}</th>
                <td>
                  {b.m.sales.known
                    ? money(b.m.sales.knownNet)
                    : "No disponible"}
                  {!b.m.complete && <small> Parcial</small>}
                </td>
                <td>{money(b.projection.projectedNet)}</td>
                <td>{percent(b.projection.projectedNet, b.m.target)}</td>
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
        <div className="lr16-ranking-mobile" aria-label="Ranking de sucursales en móvil">
          {groups.map((b) => (
            <details key={b.id} className={
              "lr16-ranking-mobile-item lr15-performance-" +
              (projectedPerformanceTier(b.projection.projectedNet, b.m.target) || "neutral")
            }>
              <summary>
                <span className="lr16-ranking-mobile-name">{b.name}</span>
                <span className="lr16-ranking-mobile-key">
                  <strong>{percent(b.projection.projectedNet, b.m.target)}</strong>
                  <small>Proyección: {money(b.projection.projectedNet)}</small>
                  <small>Meta: {money(b.m.target)}</small>
                </span>
                <span className="lr16-ranking-mobile-arrow" aria-hidden="true">⌄</span>
              </summary>
              <dl className="lr16-ranking-mobile-extra">
                <div><dt>Venta neta</dt><dd>{b.m.sales.known ? money(b.m.sales.knownNet) : "No disponible"}</dd></div>
                <div><dt>Avance actual</dt><dd>{percent(b.m.fullNet, b.m.target)}</dd></div>
                <div><dt>Faltante</dt><dd>{money(b.m.remaining)}</dd></div>
                <div><dt>Participación</dt><dd>{percent(overall.complete ? b.m.fullNet : null, overall.fullNet)}</dd></div>
                <div><dt>Cobertura</dt><dd>{b.m.sales.known}/{b.count}</dd></div>
                <div><dt>Tickets</dt><dd>{number(b.m.tickets.value)}</dd></div>
              </dl>
            </details>
          ))}
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
    [chartRows, setChartRows] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0),
    [comparisonMode, setComparisonMode] = useState("none"),
    [comparisonExtra, setComparisonExtra] = useState(null),
    [comparisonError, setComparisonError] = useState(""),
    [comparisonLoading, setComparisonLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    setChartRows([]);
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
          setChartRows(branch ? (global?.rows || selected.rows) : selected.rows);
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
  const windows = comparisonWindows(month, globalCutoff, comparisonMode);
  // Fetch only additional month(s) needed for a meaningful week/month comparison.
  // A separate effect keeps the existing month dashboard usable on comparison errors.
  useEffect(() => {
    const controller = new AbortController();
    setComparisonError("");
    setComparisonExtra(null);
    setComparisonLoading(false);
    if (comparisonMode === "none" || !data || !windows) return () => controller.abort();
    const missingMonths = windows.months.filter((item) => item !== month);
    if (!missingMonths.length) {
      setComparisonExtra({ month, branch, mode: comparisonMode, cutoff: globalCutoff, rows: data.rows });
      return () => controller.abort();
    }
    setComparisonLoading(true);
    Promise.all(missingMonths.map(async (item) => {
      const response = await fetch("/api/larousse?" + new URLSearchParams({
        month: item, version: "2", ...(branch ? { branch } : {}),
      }), { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw Error("No fue posible consultar el período anterior de Finance.");
      return (await response.json()).rows;
    })).then((batches) => {
      if (!controller.signal.aborted) {
        setComparisonExtra({
          month, branch, mode: comparisonMode, cutoff: globalCutoff,
          rows: [...data.rows, ...batches.flat()],
        });
      }
    }).catch((reason) => {
      if (!controller.signal.aborted) setComparisonError(reason.message);
    }).finally(() => {
      if (!controller.signal.aborted) setComparisonLoading(false);
    });
    return () => controller.abort();
  }, [data, month, branch, globalCutoff, comparisonMode, reload]);
  const rows = data?.rows || [],
    m = commercialMetrics(rows, data?.targets || []),
    forecast = commercialProjection(rows, data?.targets || [], month, globalCutoff);
  const currentComparison = comparisonExtra &&
    comparisonExtra.month === month && comparisonExtra.branch === branch &&
    comparisonExtra.mode === comparisonMode && comparisonExtra.cutoff === globalCutoff;
  const comparison = currentComparison && windows ?
    periodComparison(comparisonExtra.rows, windows,
      branch ? [branch] : (data?.targets || []).map((target) => target.branch_id)) : null;
  return (
    <div className="lr2 lr3 lr4 lr7 lr8">
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
            {!rows.length && (
              <div role="status" className="lr2-empty">
                Sin cortes para el período y sucursal seleccionados.
              </div>
            )}
            {!!rows.length && (
              <div className="lr16-performance-group" aria-label="Rendimiento y distribución por sucursal">
                <Branches data={data} selected={branch} overall={m} month={month} globalCutoff={globalCutoff} />
                <div className="lr16-ranking-pie">
                  <SalesByBranchChart rows={m.commercial} branches={data.branches}
                    selectedIds={branch ? [branch] : (data.targets || []).map((target) => target.branch_id)} />
                </div>
              </div>
            )}
            {commercialMetrics(chartRows, []).commercial.length > 0 && (
              <Daily key={month + ":" + branch} rows={commercialMetrics(chartRows, []).commercial}
                branches={catalog} initialBranch={branch} />
            )}
            <CommercialComparison comparison={comparison} windows={windows}
              loading={comparisonLoading || !currentComparison && !comparisonError && !!windows}
              error={comparisonError} mode={comparisonMode} onModeChange={setComparisonMode} />
            <section className="lr16-data-controls" aria-label="Control y trazabilidad de datos">
              <h2>Control de datos</h2>
              <details className="lr16-review-details">
                <summary>Revisión de cortes · {reviewCutCounts(m.commercial).total} cortes</summary>
                <CutReview rows={m.commercial} confirmed={m.confirmed} />
              </details>
              <History data={data} selected={branch} rows={m.historical} />
            </section>
          </>
        )
      )}
      <footer className="lr3-footer" aria-label="Fuente del dashboard">
        <span>Grupo LA BI · La Rousse · Información comercial de Finance</span>
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
