import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyCommercialMetrics } from "../lib/larousse-daily.mjs";
import { commercialProjection } from "../lib/larousse-commercial.mjs";

const row = (patch = {}) => ({
  cut_id: "c1",
  revision_id: "r1",
  branch_id: "a",
  date: "2026-11-06",
  state: "APPROVED",
  source_kind: "OPS",
  historical: false,
  net_sales: "100.00",
  declared_total: "100.00",
  cut_expenses: "0.00",
  tickets: "1",
  footfall: "4",
  pieces: "3",
  ...patch,
});

test("BI-03: daily rates use aggregate numerators and denominators from the same OPS cohort", () => {
  const dates = ["2026-11-06", "2026-11-07"];
  const days = dailyCommercialMetrics([
    row(),
    row({ cut_id: "c2", revision_id: "r2", tickets: "3", footfall: "6", pieces: "9", net_sales: "300.00" }),
    row({ source_kind: "APPSHEET", historical: true, state: "HISTORICO_SIN_REVISAR", net_sales: null, tickets: "999", footfall: "999", pieces: "999" }),
    row({ state: "CANCELLED", tickets: "999", footfall: "999", pieces: "999" }),
  ], dates);
  assert.equal(days[0].net, 40000n);
  assert.equal(days[0].footfall, 10n);
  assert.equal(days[0].tickets, 4n);
  assert.equal(days[0].pieces, 12n);
  assert.equal(days[0].conversion, 4000n); // 4 / 10 * 100 = 40.00 %
  assert.equal(days[0].piecesPerTicket, 300n); // 12 / 4 = 3.00
  assert.equal(days[0].count, 2);
  for (const key of ["net", "tickets", "pieces", "footfall", "conversion", "piecesPerTicket"])
    assert.equal(days[1][key], null, "Missing day is never a measured zero: " + key);
});

test("BI-03: zero denominators and missing fields report N/A without fabricated ratios", () => {
  const zero = dailyCommercialMetrics([row({ tickets: "0", footfall: "0", pieces: "4" })], ["2026-11-06"])[0];
  assert.equal(zero.conversion, null);
  assert.equal(zero.piecesPerTicket, null);
  const missing = dailyCommercialMetrics([row({ footfall: null })], ["2026-11-06"])[0];
  assert.equal(missing.footfall, null);
  assert.equal(missing.conversion, null);
  assert.equal(missing.piecesPerTicket, 300n);
  const zeroVisits = dailyCommercialMetrics([row({ tickets: "0", footfall: "10", pieces: "0" })], ["2026-11-06"])[0];
  assert.equal(zeroVisits.conversion, 0n);
  assert.equal(zeroVisits.piecesPerTicket, null);
});

test("BI-03: projection for a selected branch preserves the global cutoff, not the branch's latest day", () => {
  const rows = [row({ net_sales: "70.00", tickets: "1", footfall: "4" })];
  const targets = [{ branch_id: "a", amount: "100.00" }];
  const projection = commercialProjection(rows, targets, "2026-11", "2026-11-07");
  assert.equal(projection.projectedNet, 30000n); // 70 * 30 / 7 = 300.00
  assert.equal(projection.scopedDate, "2026-11-06");
  assert.equal(projection.globalDate, "2026-11-07");
  assert.equal(commercialProjection([], targets, "2026-11", "2026-11-07").projectedNet, null);
  assert.equal(commercialProjection(rows, targets, "2026-11", null).projectedNet, null);
});

test("BI-03: UI exposes six daily metrics and per-branch projection without changing endpoint contract", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../components/LaRousseDashboard.js", import.meta.url), "utf8");
  assert.match(src, /dailyCommercialMetrics\(rows, dates\)/);
  for (const label of ["Ingresos", "Tickets", "Piezas vendidas", "Afluencia", "Conversión", "Piezas por ticket"])
    assert.ok(src.includes('label: "' + label + '"'));
  assert.match(src, /commercialProjection\(scopedRows, scopedTargets, month, globalCutoff\)/);
  assert.match(src, /<th>Proyección de ingresos<\/th>/);
  assert.match(src, /<th>Cumplimiento proyectado<\/th>/);
  assert.match(src, /branch \? read\("([^"]*)"\)\.catch\(\(\) => null\)/);
  assert.match(src, /commercialProjection\(rows, data\?\.targets \|\| \[\], month, globalCutoff\)/);
  assert.match(src, /Ritmo diario de ingresos/);
});


test("BI-03: tickets and pieces remain raw integer totals, not ratios, with N/A for incomplete entries", () => {
  const [valid, partial, zero] = [
    dailyCommercialMetrics([
      row({ tickets: "2", pieces: "5" }),
      row({ cut_id: "another", revision_id: "another", tickets: "3", pieces: "7" }),
    ], ["2026-11-06"])[0],
    dailyCommercialMetrics([
      row({ tickets: null, pieces: "5" }),
      row({ cut_id: "another", revision_id: "another", tickets: "3", pieces: null }),
    ], ["2026-11-06"])[0],
    dailyCommercialMetrics([row({ tickets: "0", pieces: "0" })], ["2026-11-06"])[0],
  ];
  assert.equal(valid.tickets, 5n);
  assert.equal(valid.pieces, 12n);
  assert.equal(valid.piecesPerTicket, 240n);
  assert.equal(partial.tickets, null);
  assert.equal(partial.pieces, null);
  assert.equal(zero.tickets, 0n);
  assert.equal(zero.pieces, 0n);
  assert.equal(zero.piecesPerTicket, null);
});

test("BI-03: six chart options use whole-unit number formatting in both view modes", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../components/LaRousseDashboard.js", import.meta.url), "utf8");
  const options = src.slice(src.indexOf("const DAILY_OPTIONS = ["), src.indexOf("function DailySeries("));
  for (const [key, label] of [["net","Ingresos"], ["tickets","Tickets"],
    ["pieces","Piezas vendidas"], ["footfall","Afluencia"],
    ["conversion","Conversión"], ["piecesPerTicket","Piezas por ticket"]])
    assert.ok(options.includes('{ key: "'+key+'", label: "'+label+'" }') ||
      options.includes('{ key: "'+key+'", label: "'+label+'",'),
      "Missing option " + key);
  assert.match(options, /const DAILY_UNIT_INDICATORS = new Set\(\["tickets", "pieces", "footfall"\]\)/);
  assert.equal((src.match(/DAILY_UNIT_INDICATORS\.has\(indicator\)/g) || []).length, 4);
  assert.match(src, /additionalIndicators\.length >= DAILY_OPTIONS\.length - 1/);
  assert.match(src, /const \[selectedDate, setSelectedDate\] = useState\(null\)/);
});
