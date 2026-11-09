import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { datesForTimeline, branchDailyMetrics } from "../lib/larousse-branch-series.mjs";

const row = (branch_id, date, patch = {}) => ({
  branch_id, date, source_kind: "OPS", historical: false,
  state: "APPROVED", net_sales: "100.00", declared_total: "100.00",
  cut_expenses: "0.00", tickets: "2", footfall: "10", pieces: "6",
  ...patch,
});
const dates = ["2026-11-01", "2026-11-02", "2026-11-03"];

test("branch timeline shares a calendar and excludes historical/AppSheet cuts", () => {
  const rows = [
    row("a", "2026-11-01"), row("b", "2026-11-03"),
    row("a", "2026-11-05", { historical: true, source_kind: "APPSHEET" }),
  ];
  assert.deepEqual(datesForTimeline(rows), dates);
});
test("consolidated mode sums sales and denominators, never averages rates", () => {
  const series = branchDailyMetrics([
    row("a", dates[0], { net_sales: "150.00", tickets: "2", footfall: "8", pieces: "8" }),
    row("b", dates[0], { net_sales: "50.00", tickets: "3", footfall: "17", pieces: "7" }),
  ], [dates[0]], ["a", "b"], "consolidated");
  assert.equal(series.length, 1);
  assert.equal(series[0].days[0].net, 20000n);
  assert.equal(series[0].days[0].footfall, 25n);
  assert.equal(series[0].days[0].conversion, 2000n); // 5 / 25 = 20.00%
  assert.equal(series[0].days[0].piecesPerTicket, 300n); // 15 / 5 = 3.00
});
test("missing or duplicate branch-day blocks only that consolidated date", () => {
  const series = branchDailyMetrics([
    row("a", dates[0]), row("b", dates[0]),
    row("a", dates[1]), // b absent
    row("a", dates[2]), row("a", dates[2]), row("b", dates[2]),
  ], dates, ["a", "b"], "consolidated")[0].days;
  assert.equal(series[0].net, 20000n);
  for (const day of series.slice(1)) {
    assert.equal(day.complete, false);
    for (const key of ["net","footfall","conversion","piecesPerTicket"])
      assert.equal(day[key], null);
  }
});
test("comparison mode retains valid branches independently and excludes historical", () => {
  const series = branchDailyMetrics([
    row("a", dates[0]), row("b", dates[0], { footfall: null }),
    row("a", dates[1]), row("b", dates[1], { source_kind: "APPSHEET", historical: true }),
  ], dates.slice(0, 2), ["a", "b", "a"], "comparison");
  assert.deepEqual(series.map((s) => s.id), ["a", "b"]);
  assert.equal(series[0].days[0].net, 10000n);
  assert.equal(series[1].days[0].net, 10000n);
  assert.equal(series[1].days[0].conversion, null);
  assert.equal(series[1].days[1].net, null);
  assert.equal(series[0].days[1].net, 10000n);
});
test("no selections create no series and unknown mode is rejected", () => {
  assert.deepEqual(branchDailyMetrics([], dates, [], "comparison"), []);
  assert.throws(() => branchDailyMetrics([], dates, ["a"], "wrong"), /INVALID_SERIES_MODE/);
});
test("UI exposes branch multi-selection plus independent comparison and consolidation", () => {
  const src = readFileSync(new URL("../components/LaRousseDashboard.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const snippet of ["Buscar sucursal en series", "Seleccionar todas", "Limpiar",
    "branchMode === \"consolidated\"", "branchMode === \"comparison\"",
    "chartRows", "branchDailyMetrics(rows, calendarDates, selectedIds, branchMode)"])
    assert.ok(src.includes(snippet), snippet);
  assert.match(css, /\.lr11-branch-options/);
  assert.match(src, /<Daily key=\{month \+ ":" \+ branch\}/);
});
