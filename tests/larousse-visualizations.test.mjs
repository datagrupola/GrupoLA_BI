import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { salesParticipation } from "../lib/larousse-visualizations.mjs";
import { branchDailyMetrics } from "../lib/larousse-branch-series.mjs";

const branches = [
  { id: "a", name: "Camelinas" },
  { id: "b", name: "Centro" },
  { id: "c", name: "Lázaro" },
];
const row = (id, date, net_sales, patch = {}) => ({
  branch_id: id, date, net_sales, state: "APPROVED",
  source_kind: "OPS", historical: false,
  tickets: "2", footfall: "10", pieces: "4",
  ...patch,
});
const scope = ["a","b","c"];

test("pie shares exact commercial population; rounded labels sum to 100.0%", () => {
  const result = salesParticipation([
    row("a","2026-11-01","100.00"),
    row("b","2026-11-01","200.00"),
    row("c","2026-11-01","300.00"),
  ], branches, scope);
  assert.equal(result.complete, true);
  assert.equal(result.total, 60000n);
  assert.deepEqual(result.entries.map((e) => e.tenths), [167,333,500]);
  assert.equal(result.entries.reduce((n,e)=>n+e.tenths,0),1000);
});

test("partial: absent branch is N/A, not zero; shares use known subtotal", () => {
  const result = salesParticipation([
    row("a","2026-11-01","50.00"), row("b","2026-11-01","150.00"),
  ], branches, scope);
  assert.equal(result.complete, false);
  assert.equal(result.knownBranches, 2);
  assert.equal(result.total, 20000n);
  assert.equal(result.entries[2].net, null);
  assert.equal(result.entries[2].tenths, null);
  assert.deepEqual(result.entries.slice(0,2).map((e)=>e.tenths),[250,750]);
});

test("duplicate date or invalid net excludes affected branch, not invented value", () => {
  const result = salesParticipation([
    row("a","2026-11-01","100.00"), row("a","2026-11-01","100.00"),
    row("b","2026-11-01","900.00"), row("c","2026-11-01",null),
  ], branches, scope);
  assert.equal(result.complete,false);
  assert.equal(result.total,90000n);
  assert.equal(result.entries[0].reason,"Cortes duplicados");
  assert.equal(result.entries[2].reason,"Venta no disponible");
  assert.equal(result.entries[1].tenths,1000);
});

test("historical, non-reportable and unselected rows never contaminate percentages", () => {
  const result = salesParticipation([
    row("a","2026-11-01","30.00"),
    row("b","2026-11-01","70.00"),
    row("a","2026-11-02","99999.00",{historical:true,source_kind:"APPSHEET"}),
    row("b","2026-11-02","99999.00",{state:"CANCELLED"}),
    row("c","2026-11-01","99999.00"),
  ], branches, ["a","b"]);
  assert.equal(result.total,10000n);
  assert.equal(result.complete,true);
  assert.deepEqual(result.entries.map(e=>e.tenths),[300,700]);
});

test("zero net and absence do not fabricate valid pie slices", () => {
  const zero=salesParticipation([row("a","2026-11-01","0.00")],branches,["a"]);
  assert.equal(zero.chartable,false);
  assert.equal(zero.total,0n);
  const empty=salesParticipation([],branches,["a"]);
  assert.equal(empty.chartable,false);
  assert.equal(empty.total,null);
});

test("combo uses consolidated weighted conversion, with gaps for incomplete days", () => {
  const dates=["2026-11-01","2026-11-02"];
  const days=branchDailyMetrics([
    row("a",dates[0],"100.00",{tickets:"2",footfall:"8"}),
    row("b",dates[0],"100.00",{tickets:"3",footfall:"17"}),
    row("a",dates[1],"100.00",{tickets:"1",footfall:"3"}),
  ],dates,["a","b"],"consolidated")[0].days;
  assert.equal(days[0].footfall,25n);
  assert.equal(days[0].conversion,2000n);
  assert.equal(days[1].footfall,null);
  assert.equal(days[1].conversion,null);
});

test("UI keeps pie with global ranking and combo tied to trend selection", () => {
  const src=readFileSync(new URL("../components/LaRousseDashboard.js",import.meta.url),"utf8");
  const css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");
  for(const snippet of [
    "function SalesByBranchChart(", "function ConversionFootfallChart(",
    "Venta por sucursal", "Conversión y afluencia a piso por fecha",
    'branchDailyMetrics(rows, calendarDates, selectedIds, "consolidated")',
    "setSelectedDate(day.date)", "No disponible",
  ])assert.ok(src.includes(snippet),snippet);
  assert.match(src, /<SalesByBranchChart rows=\{m\.commercial\} branches=\{data\.branches\}/);
  assert.match(src, /selectedIds=\{branch \? \[branch\] : \(data\.targets \|\| \[\]\)/);
  assert.match(src, /<ConversionFootfallChart[\s\S]*?selectedDate=\{selectedDate\} setSelectedDate=\{setSelectedDate\}/);
  assert.match(css, /\.lr16-ranking-pie/);
  assert.match(css, /\.lr16-conversion-traffic/);
});
