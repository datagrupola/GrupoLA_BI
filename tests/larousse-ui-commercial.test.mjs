import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../components/LaRousseDashboard.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const { projectedPerformanceTier, compareProjectedCompliance } = await import("../lib/larousse-performance.mjs");

test("BI-01 shows conversion and pieces/ticket from the audited same-population metrics", () => {
  assert.ok(src.includes('label="Conversión" value={formatHundredths(m.conversion, "%")}'));
  assert.ok(src.includes('label="Piezas por ticket" value={formatHundredths(m.piecesPerTicket)}'));
  assert.ok(src.includes("commercialMetrics(rows, data?.targets || [])"));
});

test("BI-02 queries the unfiltered month to preserve the GLOBAL cutoff with a selected branch", () => {
  assert.ok(src.includes('branch ? read("").catch(() => null)'));
  assert.ok(src.includes("(branch ? global?.rows : selected.rows) || []"));
  assert.ok(src.includes("setGlobalCutoff(commercialCutoffDate("));
  assert.ok(src.includes("commercialProjection(rows, data?.targets || [], month, globalCutoff)"));
  assert.ok(!src.includes("setGlobalCutoff(commercialCutoffDate(selected.rows"));
});

test("BI-02 labels projected close, observed rhythm, global cutoff and keeps history separate", () => {
  for (const label of ["Proyección de cierre", "Ritmo diario de venta", "Corte global"])
    assert.ok(src.includes(label), "Missing label: " + label);
  assert.ok(src.includes("<History data={data}"));
  assert.ok(src.includes('version: "2"'));
});


test("desempeño por sucursal colors use projected compliance, not accumulated sales", () => {
  assert.equal(projectedPerformanceTier(10000n, 10000n), "high");
  assert.equal(projectedPerformanceTier(11500n, 10000n), "high");
  assert.equal(projectedPerformanceTier(9999n, 10000n), "medium");
  assert.equal(projectedPerformanceTier(8000n, 10000n), "medium");
  assert.equal(projectedPerformanceTier(7999n, 10000n), "low");
  assert.equal(projectedPerformanceTier(0n, 10000n), "low");
  assert.equal(projectedPerformanceTier(null, 10000n), null);
  assert.equal(projectedPerformanceTier(9000n, null), null);
  assert.equal(projectedPerformanceTier(0n, 0n), null);
  assert.equal(projectedPerformanceTier(-1n, 10000n), null);
  assert.match(src, /projectedPerformanceTier\(b\.projection\.projectedNet, b\.m\.target\)/);
  assert.match(src, /className="lr2-panel lr15-branch-performance"/);
  assert.match(css, /\.lr15-performance-high > td/);
  assert.match(css, /\.lr15-performance-medium > td/);
  assert.match(css, /\.lr15-performance-low > td/);
  assert.match(css, /\.lr15-performance-neutral > td/);
});


test("ranking sorts by exact projected compliance descending, not accumulated sales", () => {
  const branch = (id, name, projectedNet, target, sales) =>
    ({ id, name, projection: { projectedNet }, m: { target, sales: { knownNet: sales } } });
  const ranked = [
    branch("pepsi", "Pepsi", 7999n, 10000n, 1000000n),
    branch("lazaro", "Lázaro", 10001n, 10000n, 500n),
    branch("cam", "Camelinas", 9000n, 10000n, 900n),
    branch("none", "Sin meta", 600000n, null, 90000000n),
    branch("centro", "Centro", 30000n, 30000n, 10000n),
    branch("empty", "Sin proyección", null, 10000n, 800n),
    branch("zero", "Meta cero", 50000n, 0n, 800n),
  ].sort(compareProjectedCompliance);
  assert.deepEqual(ranked.map((item) => item.id),
    ["lazaro", "centro", "cam", "pepsi", "zero", "none", "empty"]);
  assert.match(src, /\.sort\(compareProjectedCompliance\)/);
  assert.match(src, /<th>Cumplimiento proyectado<\/th>/);
  assert.doesNotMatch(src, /a\.m\.sales\.knownNet === b\.m\.sales\.knownNet/);
});

test("ranking compares fractions exactly and breaks ties deterministically by branch", () => {
  const branch = (id, name, projectedNet, target) =>
    ({ id, name, projection: { projectedNet }, m: { target } });
  const huge = 999999999999999999999999999999n;
  const sorted = [
    branch("lower", "Zeta", huge, huge + 1n),
    branch("higher", "Beta", huge, huge),
    branch("tie-z", "Zeta", 10n, 10n),
    branch("tie-a", "Águila", 50n, 50n),
  ].sort(compareProjectedCompliance);
  assert.deepEqual(sorted.map(x => x.id),
    ["tie-a", "higher", "tie-z", "lower"]);
  assert.equal(compareProjectedCompliance(branch("a", "A", 0n, 100n), branch("b", "B", null, 100n)), -1);
});
