import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { comparisonWindows, periodComparison } from "../lib/larousse-comparison.mjs";

const row = (date, patch = {}) => ({
  date, branch_id: "a", source_kind: "OPS", historical: false,
  state: "APPROVED", net_sales: "100.00", tickets: "2",
  footfall: "4", pieces: "6", ...patch,
});
const dates = (start, count) => Array.from({ length: count }, (_, offset) => {
  const date = new Date(start + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
});

test("BI-04: weekly comparison aligns 7 consecutive calendar days and crosses months", () => {
  const plan = comparisonWindows("2026-11", "2026-11-07", "week");
  assert.deepEqual(plan.current, { start: "2026-11-01", end: "2026-11-07" });
  assert.deepEqual(plan.previous, { start: "2026-10-25", end: "2026-10-31" });
  assert.deepEqual(plan.months, ["2026-10", "2026-11"]);
  assert.equal(plan.dayCount, 7);
  const cross = comparisonWindows("2027-01", "2027-01-03", "week");
  assert.deepEqual(cross.current, { start: "2026-12-28", end: "2027-01-03" });
  assert.deepEqual(cross.previous, { start: "2026-12-21", end: "2026-12-27" });
  assert.deepEqual(cross.months, ["2026-12", "2027-01"]);
});

test("BI-04: month to date compares same calendar days; leap/short months are bounded", () => {
  const plan = comparisonWindows("2026-11", "2026-11-07", "month");
  assert.deepEqual(plan.current, { start: "2026-11-01", end: "2026-11-07" });
  assert.deepEqual(plan.previous, { start: "2026-10-01", end: "2026-10-07" });
  const short = comparisonWindows("2026-03", "2026-03-31", "month");
  assert.deepEqual(short.current, { start: "2026-03-01", end: "2026-03-28" });
  assert.deepEqual(short.previous, { start: "2026-02-01", end: "2026-02-28" });
  assert.equal(comparisonWindows("2026-11", null, "month"), null);
  assert.equal(comparisonWindows("2026-11", "2026-10-31", "month"), null);
  assert.equal(comparisonWindows("2026-02", "2026-02-30", "month"), null);
  assert.equal(comparisonWindows("2026-11", "2026-11-07", "none"), null);
});

test("BI-04: accurate totals and ratios for equal-coverage week, including points and units", () => {
  const plan = comparisonWindows("2026-11", "2026-11-07", "week");
  const previous = dates("2026-10-25", 7).map((date) =>
    row(date, { net_sales: "50.00", tickets: "1", footfall: "4", pieces: "2" }));
  const current = dates("2026-11-01", 7).map((date) => row(date));
  const result = periodComparison([...previous, ...current], plan, ["a"]);
  assert.equal(result.current.complete, true);
  assert.equal(result.previous.complete, true);
  const byKey = Object.fromEntries(result.metrics.map((m) => [m.key, m]));
  assert.equal(byKey.net.currentValue, 70000n);
  assert.equal(byKey.net.previousValue, 35000n);
  assert.equal(byKey.net.change, 10000n); // +100.00 %
  assert.equal(byKey.conversion.currentValue, 5000n); // 50.00 %
  assert.equal(byKey.conversion.previousValue, 2500n); // 25.00 %
  assert.equal(byKey.conversion.change, 2500n); // +25.00 percentage points
  assert.equal(byKey.piecesPerTicket.currentValue, 300n);
  assert.equal(byKey.piecesPerTicket.previousValue, 200n);
  assert.equal(byKey.piecesPerTicket.change, 100n); // +1.00 pieces/ticket
});

test("BI-04: missing/duplicate branch-days, history and unknown branch cannot fabricate growth", () => {
  const plan = comparisonWindows("2026-11", "2026-11-07", "week");
  const previous = dates("2026-10-25", 7).map((date) => row(date));
  const current = dates("2026-11-01", 7).map((date) => row(date));
  const missing = periodComparison([...previous, ...current.slice(0, 6)], plan, ["a"]);
  assert.equal(missing.current.complete, false);
  assert.equal(missing.current.observedPairs, 6);
  assert.equal(missing.current.expectedPairs, 7);
  assert.equal(missing.metrics.find((x) => x.key === "net").change, null);
  const duplicate = periodComparison([...previous, ...current, row("2026-11-01")], plan, ["a"]);
  assert.equal(duplicate.current.complete, false);
  assert.equal(duplicate.metrics.find((x) => x.key === "conversion").change, null);
  const isolated = periodComparison([
    ...previous, ...current,
    row("2026-11-01", { source_kind: "APPSHEET", historical: true, tickets: "999" }),
    row("2026-11-01", { branch_id: "other", tickets: "999" }),
  ], plan, ["a"]);
  assert.equal(isolated.current.complete, true);
  assert.equal(isolated.metrics.find((x) => x.key === "conversion").currentValue, 5000n);
});

test("BI-04: unavailable previous baseline or null denominators stay unavailable", () => {
  const plan = comparisonWindows("2026-11", "2026-11-07", "week");
  const previous = dates("2026-10-25", 7).map((date) =>
    row(date, { net_sales: "0.00", tickets: "0", footfall: "0", pieces: "0" }));
  const current = dates("2026-11-01", 7).map((date) => row(date));
  const result = periodComparison([...previous, ...current], plan, ["a"]);
  assert.equal(result.metrics.find((m) => m.key === "net").change, null);
  assert.equal(result.metrics.find((m) => m.key === "conversion").change, null);
  assert.equal(result.metrics.find((m) => m.key === "piecesPerTicket").change, null);
  const missing = current.map((x, i) => i === 0 ? { ...x, footfall: null } : x);
  assert.equal(periodComparison([...previous, ...missing], plan, ["a"])
    .metrics.find((m) => m.key === "conversion").currentValue, null);
});

test("BI-04: UI supports multiple separate synced series and one global comparison control", () => {
  const src = readFileSync(new URL("../components/LaRousseDashboard.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(src, /role="tablist" aria-label="Métrica principal de evolución diaria"/);
  assert.match(src, /aria-selected=\{mainIndicator === option\.key\}/);
  assert.match(src, /chooseMainIndicator\(option\.key\)/);
  assert.match(src, /renderMetricChart\(mainIndicator\)/);
  assert.match(src, /function DailySeries\(/);
  assert.match(src, /function BranchComparisonSeries\(/);
  assert.match(src, /additionalIndicators\.map\(\(indicator, index\)/);
  assert.match(src, /Agregar otra gráfica/);
  assert.match(src, /changeAdditionalIndicator\(indicator, event\.target\.value\)/);
  assert.match(src, /setAdditionalIndicators\(\(current\) =>\s*current\.filter/);
  assert.match(css, /\.lr13-extra-chart/);
  assert.match(src, /selectedDate={selectedDate} setSelectedDate={setSelectedDate}/);
  assert.match(css, /\.lr10-series-list/);
  assert.match(src, /Comparación temporal global/);
  assert.match(src, /month: item, version: "2"/);
});
