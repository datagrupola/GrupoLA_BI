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


const legacyRow = (date, patch = {}) => row(date, {
  source_kind: "APPSHEET", historical: true,
  state: "HISTORICO_SIN_REVISAR",
  net_sales: null, declared_total: "999999.99", tickets: "1",
  footfall: "4", pieces: "3", ...patch,
});

test("BI-19: AppSheet activity is comparable but declared sales never replace OPS net", () => {
  const plan = comparisonWindows("2026-11", "2026-11-07", "month");
  const historic = dates("2026-10-01", 7).map(date => legacyRow(date));
  const current = dates("2026-11-01", 7).map(date => row(date));
  const result = periodComparison([...historic, ...current], plan, ["a"]);
  assert.equal(result.current.complete, true);
  assert.equal(result.previous.complete, true);
  assert.deepEqual(result.previous.sources, { OPS: 0, APPSHEET: 7 });
  assert.deepEqual(result.current.sources, { OPS: 7, APPSHEET: 0 });
  assert.equal(result.historicalPresent, true);
  const metrics = Object.fromEntries(result.metrics.map(m => [m.key,m]));
  assert.equal(metrics.tickets.previousValue, 7n);
  assert.equal(metrics.tickets.currentValue, 14n);
  assert.equal(metrics.tickets.change, 10000n);
  assert.equal(metrics.footfall.change, 0n);
  assert.equal(metrics.pieces.previousValue, 21n);
  assert.equal(metrics.pieces.change, 10000n);
  assert.equal(metrics.conversion.previousValue, 2500n);
  assert.equal(metrics.conversion.currentValue, 5000n);
  assert.equal(metrics.conversion.change, 2500n);
  assert.equal(metrics.piecesPerTicket.previousValue, 300n);
  assert.equal(metrics.piecesPerTicket.change, 0n);
  assert.equal(metrics.net.previousValue, null);
  assert.equal(metrics.net.currentValue, 70000n);
  assert.equal(metrics.net.change, null);
  assert.equal(metrics.net.historicalFinancialBlocked, true);
  assert.equal(metrics.average.previousValue, null);
  assert.equal(metrics.average.change, null);
  assert.equal(metrics.average.historicalFinancialBlocked, true);
});

test("BI-19: a mixed AppSheet/Ops week compares operational activity", () => {
  const plan = comparisonWindows("2026-11", "2026-11-07", "week");
  const previous = dates("2026-10-25", 7).map((date,i) =>
    i < 3 ? legacyRow(date) : row(date, {net_sales:"80.00"}));
  const current = dates("2026-11-01", 7).map(date => row(date));
  const result = periodComparison([...previous,...current], plan, ["a"]);
  assert.equal(result.previous.complete, true);
  assert.deepEqual(result.previous.sources, {OPS:4,APPSHEET:3});
  assert.equal(result.metrics.find(x=>x.key==="tickets").previousValue,11n);
  assert.equal(result.metrics.find(x=>x.key==="pieces").previousValue,33n);
  assert.equal(result.metrics.find(x=>x.key==="net").previousValue,null);
  assert.equal(result.metrics.find(x=>x.key==="net").change,null);
});

test("BI-19: missing, duplicate, and invalid historical branch-days block a period", () => {
  const plan = comparisonWindows("2026-11", "2026-11-07", "month");
  const old = dates("2026-10-01",7).map(date=>legacyRow(date));
  const recent = dates("2026-11-01",7).map(date=>row(date));
  const cases = [
    old.slice(0,6),
    [...old,legacyRow("2026-10-01")],
    old.map((x,i)=>i===0?{...x,historical:false}:x),
    old.map((x,i)=>i===0?{...x,state:"APPROVED"}:x),
  ];
  for(const items of cases){
    const result=periodComparison([...items,...recent],plan,["a"]);
    assert.equal(result.previous.complete,false);
    assert.equal(result.metrics.find(x=>x.key==="tickets").previousValue,null);
    assert.equal(result.metrics.find(x=>x.key==="pieces").change,null);
  }
});

test("BI-19: null historical activity never becomes a zero or false ratio", () => {
  const plan=comparisonWindows("2026-11","2026-11-07","month");
  const old=dates("2026-10-01",7).map((date,i)=>
    legacyRow(date,i===3?{tickets:null,footfall:null,pieces:null}:{}));
  const recent=dates("2026-11-01",7).map(date=>row(date));
  const result=periodComparison([...old,...recent],plan,["a"]);
  assert.equal(result.previous.complete,true);
  for(const key of ["tickets","footfall","pieces","conversion","piecesPerTicket"]){
    const m=result.metrics.find(x=>x.key===key);
    assert.equal(m.previousValue,null,key);
    assert.equal(m.change,null,key);
  }
});

test("BI-19: even matching declared historic income cannot certify net sales", () => {
  const plan=comparisonWindows("2026-11","2026-11-07","month");
  const old=dates("2026-10-01",7).map(date=>legacyRow(date,{
    declared_total:"100.00",net_sales:"100.00"
  }));
  const recent=dates("2026-11-01",7).map(date=>row(date));
  const result=periodComparison([...old,...recent],plan,["a"]);
  assert.equal(result.metrics.find(x=>x.key==="net").previousValue,null);
  assert.equal(result.metrics.find(x=>x.key==="average").previousValue,null);
  assert.equal(result.metrics.find(x=>x.key==="tickets").previousValue,7n);
});

test("BI-19: UI identifies historical provenance, blocks finance and defaults to month", () => {
  const src=readFileSync(new URL("../components/LaRousseDashboard.js",import.meta.url),"utf8");
  const css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");
  assert.match(src,/\[comparisonMode, setComparisonMode\] = useState\("month"\)/);
  assert.match(src,/comparison\.previous\.sources\.APPSHEET/);
  assert.match(src,/comparison\.current\.sources\.OPS/);
  assert.match(src,/comparison\.historicalPresent/);
  assert.match(src,/Venta neta y ticket promedio permanecen no comparables/);
  assert.match(css,/\.lr19-comparison-source/);
});
