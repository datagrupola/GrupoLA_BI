import test from "node:test";
import assert from "node:assert/strict";
import { branchDailyMetrics, datesForTimeline } from "../lib/larousse-branch-series.mjs";

const ids = ["CAMELINAS", "CENTRO", "LAZARO", "PEPSI", "TORRE", "PLAZA", "NORTE", "BBVA"];
const dates = ["2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"];
const row = (branch_id, date = dates[0], patch = {}) => ({
  branch_id, date, source_kind: "OPS", historical: false, state: "APPROVED",
  net_sales: "100.00", tickets: "2", pieces: "6", footfall: "10", ...patch,
});
const daysFor = (rows, selected = ids, mode = "consolidated") =>
  branchDailyMetrics(rows, dates, selected, mode);
const metrics = ["net", "tickets", "pieces", "footfall", "conversion", "piecesPerTicket"];

test("8/8, 7/8 BBVA, multiple missing, 1/8 and 0/8 retain exact coverage and values", () => {
  const rows = [
    ...ids.map(id => row(id)),
    ...ids.slice(0, 7).map(id => row(id, dates[1])),
    ...ids.slice(0, 2).map(id => row(id, dates[2])),
    row(ids[0], dates[3]),
  ];
  const days = daysFor(rows)[0].days;
  for (const [i, count] of [8, 7, 2, 1, 0].entries()) {
    const day = days[i];
    assert.equal(day.net, count ? BigInt(count) * 10000n : null);
    assert.equal(day.tickets, count ? BigInt(count) * 2n : null);
    assert.equal(day.pieces, count ? BigInt(count) * 6n : null);
    assert.equal(day.footfall, count ? BigInt(count) * 10n : null);
    assert.equal(day.conversion, count ? 2000n : null);
    assert.equal(day.piecesPerTicket, count ? 300n : null);
    assert.deepEqual(day.cuts.missingIds, ids.slice(count));
    for (const key of metrics) {
      assert.equal(day.coverage[key].known, count);
      assert.equal(day.coverage[key].expected, 8);
      assert.equal(day.coverage[key].complete, count === 8);
    }
  }
  assert.deepEqual(days[1].cuts.missingIds, ["BBVA"]);
});

test("duplicates exclude the entire branch-date even when one copy is non-reportable", () => {
  const day = daysFor([
    row("CAMELINAS"), row("CAMELINAS", dates[0], { state: "CANCELLED" }),
    row("CENTRO"), row("BBVA", dates[0], { net_sales: "invalid", pieces: "-1" }),
  ])[0].days[0];
  assert.deepEqual(day.cuts.duplicateIds, ["CAMELINAS"]);
  assert.deepEqual(day.coverage.net.invalidIds, ["BBVA"]);
  assert.deepEqual(day.coverage.pieces.invalidIds, ["BBVA"]);
  assert.equal(day.net, 10000n);
  assert.equal(day.tickets, 4n); // BBVA's valid independent metric is usable.
  assert.equal(day.pieces, 6n);
  assert.equal(day.conversion, 2000n);
  assert.equal(day.piecesPerTicket, 300n);
});

test("paired cohorts never borrow numerators or denominators from another metric", () => {
  const day = daysFor([
    row(ids[0], dates[0], { tickets: "2", footfall: "8", pieces: null }),
    row(ids[1], dates[0], { tickets: "3", footfall: "17", pieces: "7" }),
    row(ids[2], dates[0], { tickets: null, footfall: "100", pieces: "100" }),
    row(ids[3], dates[0], { tickets: "50", footfall: null, pieces: "50", net_sales: null }),
  ])[0].days[0];
  assert.equal(day.conversion, 2000n); // (2 + 3) / (8 + 17), NOT 55 / 125.
  assert.equal(day.piecesPerTicket, 108n); // (7 + 50) / (3 + 50).
  assert.equal(day.footfall, 125n);
  assert.equal(day.tickets, 55n);
  assert.equal(day.pieces, 157n);
  assert.deepEqual(day.coverage.conversion.includedIds, ids.slice(0, 2));
  assert.deepEqual(day.coverage.piecesPerTicket.includedIds, [ids[1], ids[3]]);
  assert.deepEqual(day.coverage.net.insufficientIds, [ids[3]]);
});

test("measured zero stays zero, but zero denominators never fabricate ratios", () => {
  const day = daysFor([row(ids[0], dates[0], {
    net_sales: "0", tickets: "0", footfall: "0", pieces: "0",
  })])[0].days[0];
  for (const key of ["net", "tickets", "footfall", "pieces"]) assert.equal(day[key], 0n);
  for (const key of ["conversion", "piecesPerTicket"]) {
    assert.equal(day[key], null);
    assert.equal(day.coverage[key].known, 1);
    assert.deepEqual(day.coverage[key].includedIds, [ids[0]]);
    assert.equal(day.coverage[key].zeroDenominator, true);
  }
  const mixed = daysFor([row(ids[0], dates[0], { footfall: "0" }), row(ids[1])])[0].days[0];
  assert.equal(mixed.conversion, 4000n);
  assert.deepEqual(mixed.coverage.conversion.includedIds, ids.slice(0, 2));
  assert.equal(mixed.coverage.conversion.zeroDenominator, false);
});

test("selection determines denominator; comparison isolates missing branches", () => {
  const rows = ids.slice(0, 7).map(id => row(id));
  const selected = ["CAMELINAS", "CENTRO", "BBVA", "CENTRO"];
  const day = daysFor(rows, selected)[0].days[0];
  assert.equal(day.net, 20000n);
  assert.equal(day.coverage.net.expected, 3);
  assert.equal(day.coverage.net.known, 2);
  assert.deepEqual(day.cuts.missingIds, ["BBVA"]);
  const comparison = daysFor(rows, selected, "comparison");
  assert.equal(comparison.length, 3);
  assert.equal(comparison[0].days[0].net, 10000n);
  assert.equal(comparison[0].days[0].coverage.net.expected, 1);
  assert.equal(comparison[2].days[0].net, null);
  assert.deepEqual(comparison[2].days[0].cuts.missingIds, ["BBVA"]);
});

test("AppSheet never supplies coverage or creates duplicate OPS cuts; review states remain explicit", () => {
  const rows = [row(ids[0]),
    row(ids[0], dates[0], { source_kind: "APPSHEET", historical: true }),
    row(ids[1], dates[0], { state: "PENDING_REVIEW" }),
    row(ids[2], dates[0], { state: "CORRECTION_REQUESTED" }),
    row(ids[3], dates[0], { state: "CANCELLED" }),
    row(ids[4], dates[4], { source_kind: "APPSHEET", historical: true }),
  ];
  const day = daysFor(rows)[0].days[0];
  assert.equal(day.net, 30000n);
  assert.equal(day.cuts.presentIds.length, 4);
  assert.deepEqual(day.cuts.duplicateIds, []);
  assert.deepEqual(day.cuts.pendingIds, [ids[1]]);
  assert.deepEqual(day.cuts.correctionIds, [ids[2]]);
  assert.deepEqual(day.cuts.unreportableIds, [ids[3]]);
  assert.deepEqual(datesForTimeline(rows), [dates[0]]);
});

test("a cut can exist without a usable indicator; wholly invalid data never becomes zero", () => {
  const day = daysFor([row(ids[0], dates[0], {
    net_sales: "NaN", tickets: "-1", footfall: "1.5", pieces: "broken",
  })], [ids[0]])[0].days[0];
  assert.deepEqual(day.cuts.presentIds, [ids[0]]);
  assert.deepEqual(day.cuts.missingIds, []);
  for (const key of metrics) {
    assert.equal(day[key], null);
    assert.equal(day.coverage[key].known, 0);
    assert.deepEqual(day.coverage[key].invalidIds, [ids[0]]);
  }
});


test("R01 A: eight complete cuts retain 8/8 coverage with measured zero activity", () => {
  const rows = ids.map((id, index) => row(id, dates[0], index === 0
    ? { net_sales: "0.00", tickets: "0", pieces: "0", footfall: "0" } : {}));
  const day = daysFor(rows)[0].days[0];
  assert.deepEqual(day.cuts.missingIds, []);
  for (const metric of metrics) {
    assert.equal(day.coverage[metric].known, 8, metric);
    assert.equal(day.coverage[metric].complete, true, metric);
    assert.deepEqual(day.coverage[metric].includedIds, ids, metric);
  }
  assert.equal(day.complete, true);
  assert.equal(day.conversion, 2000n);
  assert.equal(day.piecesPerTicket, 300n);
});

test("R01 B: consolidated ratios include valid individual zero denominators", () => {
  const day = daysFor([
    row("CAMELINAS", dates[0], { pieces: "4", tickets: "0" }),
    row("CENTRO", dates[0], { pieces: "6", tickets: "2" }),
  ], ["CAMELINAS", "CENTRO"])[0].days[0];
  assert.equal(day.piecesPerTicket, 500n); // (4 + 6) / (0 + 2) = 5.00.
  assert.equal(day.coverage.piecesPerTicket.known, 2);
  assert.equal(day.coverage.piecesPerTicket.complete, true);
  const conversion = daysFor([
    row("CAMELINAS", dates[0], { tickets: "2", footfall: "0" }),
    row("CENTRO", dates[0], { tickets: "2", footfall: "10" }),
  ], ["CAMELINAS", "CENTRO"])[0].days[0];
  assert.equal(conversion.conversion, 4000n); // (2 + 2) / (0 + 10) = 40.00%.
  assert.equal(conversion.coverage.conversion.known, 2);
});

test("R01 C: a zero consolidated denominator keeps complete measured coverage", () => {
  const day = daysFor(ids.map(id => row(id, dates[0], { tickets: "0", pieces: "4" })))[0].days[0];
  assert.equal(day.piecesPerTicket, null);
  assert.equal(day.tickets, 0n);
  assert.equal(day.pieces, 32n);
  assert.equal(day.coverage.piecesPerTicket.known, 8);
  assert.equal(day.coverage.piecesPerTicket.complete, true);
  assert.equal(day.coverage.piecesPerTicket.zeroDenominator, true);
  assert.deepEqual(day.cuts.missingIds, []);
  assert.equal(day.conversion, 0n);
});

test("R01: comparison preserves zero cuts without borrowing another branch denominator", () => {
  const series = daysFor([
    row("CAMELINAS", dates[0], { pieces: "4", tickets: "0", footfall: "0" }),
    row("CENTRO", dates[0]),
  ], ["CAMELINAS", "CENTRO"], "comparison");
  const zero = series[0].days[0];
  assert.equal(zero.piecesPerTicket, null);
  assert.equal(zero.conversion, null);
  for (const metric of metrics) {
    assert.equal(zero.coverage[metric].known, 1, metric);
    assert.equal(zero.coverage[metric].complete, true, metric);
  }
  assert.equal(series[1].days[0].piecesPerTicket, 300n);
  assert.equal(series[1].days[0].conversion, 2000n);
});
