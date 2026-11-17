import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { branchDailyMetrics } from "../lib/larousse-branch-series.mjs";

const ui = readFileSync(new URL("../components/LaRousseDashboard.js", import.meta.url), "utf8");
const ids = ["CAMELINAS", "CENTRO", "LAZARO", "PEPSI", "PONIENTE", "GRAN_P_LEON", "DEL_RIO", "BBVA"];
const date = "2026-11-13";
const dayFor = rows => branchDailyMetrics(rows, [date], ids, "consolidated")[0].days[0];

test("UI summary shows requested concise dynamic labels and preserves diagnostics", () => {
  const part = ui.split("function DailyCoverage({ day, indicator, branches }) {")[1].split("\nfunction DailySeries(")[0];
  assert.match(part, /const present = day\.cuts\.presentIds\.length/);
  assert.match(part, /const pending = day\.cuts\.pendingIds\.length/);
  assert.match(part, /const missing = day\.cuts\.missingIds\.length/);
  assert.match(part, /<strong>\{present\}\/\{expected\}<\/strong> cortes/);
  assert.match(part, /Revisión de Finance pendiente: <strong>\{pending\}<\/strong>/);
  assert.match(part, /Cortes faltantes: <strong>\{missing\}<\/strong>/);
  assert.match(part, /title=\{dailyCoverageText\(day, indicator, branches\)\}/);
});
test("7 of 8 cuts with two awaiting Finance review and BBVA missing", () => {
  const rows=ids.slice(0,7).map((branch_id,index)=>({
    branch_id,date,source_kind:"OPS",historical:false,
    state:index<2?"PENDING_REVIEW":"APPROVED",
    net_sales:"100.00",tickets:"2",pieces:"6",footfall:"10",
  }));
  const day=dayFor(rows);
  assert.equal(day.cuts.presentIds.length,7);
  assert.equal(day.cuts.expected,8);
  assert.equal(day.cuts.pendingIds.length,2);
  assert.deepEqual(day.cuts.missingIds,["BBVA"]);
});
test("zero-cut day and valid-zero full day preserve separate counts", () => {
  const absent=dayFor([]);
  assert.equal(absent.cuts.presentIds.length,0);
  assert.equal(absent.cuts.pendingIds.length,0);
  assert.equal(absent.cuts.missingIds.length,8);
  const complete=dayFor(ids.map(branch_id=>({
    branch_id,date,source_kind:"OPS",historical:false,state:"APPROVED",
    net_sales:"0.00",tickets:"0",pieces:"0",footfall:"0",
  })));
  assert.equal(complete.cuts.presentIds.length,8);
  assert.equal(complete.cuts.missingIds.length,0);
  assert.equal(complete.coverage.net.known,8);
});
