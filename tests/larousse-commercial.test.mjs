import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commercialMetrics,
  commercialCutoffDate,
  commercialProjection,
  formatHundredths,
  percent,
  ratioHundredths,
  validateCommercial,
} from "../lib/larousse-commercial.mjs";
const row = (patch = {}) => ({
  cut_id: "c",
  revision_id: "r",
  date: "2026-11-01",
  branch_id: "a",
  state: "PENDING_REVIEW",
  net_sales: "100.10",
  declared_total: "120.10",
  cut_expenses: "0",
  count: 1,
  source_kind: "OPS",
  historical: false,
  tickets: "3",
  footfall: "5",
  pieces: "7",
  ...patch,
});
const target = [{ branch_id: "a", amount: "200.00" }];
test("commercial total includes existing reportable states and excludes history; exact same-population average", () => {
  const rows = [
    row(),
    row({
      cut_id: "d",
      revision_id: "s",
      state: "APPROVED",
      net_sales: "0.20",
      tickets: "2",
    }),
  ];
  const m = commercialMetrics(rows, target);
  assert.equal(m.sales.net, 10030n);
  assert.equal(m.target, 20000n);
  assert.equal(percent(m.fullNet, m.target), "50.15%");
  assert.equal(m.remaining, 9970n);
  assert.equal(m.average, 2006n);
  assert.equal(m.tickets.value, 5n);
  assert.equal(m.confirmed.net, 20n);
  assert.equal(m.pieces.value, 14n);
  assert.equal(m.footfall.value, 10n);
  assert.equal(percent(1n, 3n), "33.33%");
  assert.equal(percent(2n, 3n), "66.67%");
});
test("historical activity is preserved separately and cannot fabricate monthly compliance or mix ticket denominator", () => {
  const historical = row({
    cut_id: "h",
    revision_id: "hr",
    source_kind: "APPSHEET",
    historical: true,
    state: "HISTORICO_SIN_REVISAR",
    net_sales: null,
    tickets: "1000",
  });
  const m = commercialMetrics([row(), historical], target);
  assert.equal(m.sales.net, 10010n);
  assert.equal(m.historical.length, 1);
  assert.equal(m.fullNet, null);
  assert.equal(percent(m.fullNet, m.target), "No disponible");
  assert.equal(m.remaining, null);
  assert.equal(m.average, 3337n);
  assert.equal(m.tickets.value, 3n);
});
test("missing targets, activity, net, zero tickets and no reports stay unavailable; above-goal remaining zero", () => {
  assert.equal(commercialMetrics([row()], []).target, null);
  assert.equal(
    commercialMetrics([row()], [...target, { branch_id: "b", amount: null }])
      .target,
    null,
  );
  assert.equal(
    commercialMetrics([row({ tickets: null })], target).average,
    null,
  );
  assert.equal(
    commercialMetrics([row({ net_sales: null })], target).average,
    null,
  );
  assert.equal(
    commercialMetrics([row({ tickets: "0" })], target).average,
    null,
  );
  assert.equal(commercialMetrics([], target).fullNet, null);
  assert.equal(
    commercialMetrics([row({ net_sales: "300" })], target).remaining,
    0n,
  );
  assert.equal(
    commercialMetrics([row()], [{ branch_id: "a", amount: "0" }]).remaining,
    null,
  );
});
test("each branch KPI uses scoped targets and data; shares sum to 100% for complete exact population", () => {
  const rows = [
      row(),
      row({
        cut_id: "b",
        revision_id: "br",
        branch_id: "b",
        net_sales: "99.90",
      }),
    ],
    targets = [...target, { branch_id: "b", amount: "300.00" }];
  const all = commercialMetrics(rows, targets);
  assert.equal(all.target, 50000n);
  const a = commercialMetrics(
    rows.filter((r) => r.branch_id === "a"),
    targets.filter((t) => t.branch_id === "a"),
  );
  assert.equal(a.target, 20000n);
  assert.equal(percent(a.fullNet, all.fullNet), "50.05%");
  assert.equal(a.tickets.value, 3n);
});
test("V2 validates target coverage, historical provenance, units and V1 duplicate/scope guards", () => {
  const data = {
    schema: "finance-bi-commercial-v2",
    month: "2026-11",
    queried_at: new Date().toISOString(),
    branches: [{ id: "a", name: "A" }],
    rows: [row()],
    targets: target,
  };
  assert.equal(validateCommercial(data, "2026-11", null).rows.length, 1);
  for (const change of [
    { targets: [] },
    { targets: [{ branch_id: "b", amount: "1" }] },
    { targets: [{ branch_id: "a", amount: "1.001" }] },
    { rows: [row({ historical: true })] },
    { rows: [row({ tickets: 3 })] },
    { rows: [row(), row()] },
  ])
    assert.throws(() =>
      validateCommercial({ ...data, ...change }, "2026-11", null),
    );
  assert.throws(() => validateCommercial(data, "2026-11", "b"));
});
test("an enabled target branch without reports does not silently become zero sales in the global compliance", () => {
  const m = commercialMetrics(
    [row()],
    [...target, { branch_id: "b", amount: "300" }],
  );
  assert.equal(m.target, 50000n);
  assert.equal(m.fullNet, null);
  assert.equal(m.remaining, null);
});

test("BI-01 conversion and pieces/ticket use ratio of totals, not mean of daily ratios", () => {
  const m = commercialMetrics([
    row({ cut_id: "one", tickets: "1", footfall: "10", pieces: "2" }),
    row({ cut_id: "two", date: "2026-11-02", tickets: "90", footfall: "100", pieces: "270" }),
  ], target);
  assert.equal(m.tickets.value, 91n);
  assert.equal(m.footfall.value, 110n);
  assert.equal(m.pieces.value, 272n);
  assert.equal(m.conversion, 8273n);
  assert.equal(formatHundredths(m.conversion, "%"), "82.73%");
  assert.equal(m.piecesPerTicket, 299n);
  assert.equal(formatHundredths(m.piecesPerTicket), "2.99");
  assert.equal(ratioHundredths(1n, 0n), null);
  assert.equal(ratioHundredths(null, 1n), null);
});

test("BI-01 null activity and zero divisors fail closed without contaminating other metrics", () => {
  assert.equal(commercialMetrics([row({ tickets: null })], target).conversion, null);
  assert.equal(commercialMetrics([row({ tickets: null })], target).piecesPerTicket, null);
  assert.equal(commercialMetrics([row({ footfall: null })], target).conversion, null);
  assert.equal(commercialMetrics([row({ footfall: "0" })], target).conversion, null);
  assert.equal(commercialMetrics([row({ tickets: "0" })], target).piecesPerTicket, null);
  assert.equal(commercialMetrics([row({ tickets: "0" })], target).conversion, 0n);
  assert.equal(formatHundredths(null, "%"), "No disponible");
  assert.equal(formatHundredths(0n, "%"), "0.00%");
  const history = row({ cut_id: "hist", source_kind: "APPSHEET", historical: true,
    state: "HISTORICO_SIN_REVISAR", tickets: "99999", pieces: "99999", footfall: "99999", net_sales: null });
  const m = commercialMetrics([row(), history], target);
  assert.equal(m.tickets.value, 3n);
  assert.equal(m.conversion, 6000n);
  assert.equal(m.piecesPerTicket, 233n);
});

test("BI-02 reconstructs original natural-day projection and observed-date rhythm independently", () => {
  const r = row({ date: "2026-11-04", net_sales: "53812.00", tickets: "71", footfall: "115" });
  const globalDate = commercialCutoffDate([r], "2026-11");
  const p = commercialProjection([r], target, "2026-11", globalDate);
  assert.equal(globalDate, "2026-11-04");
  assert.equal(p.daysInMonth, 30);
  assert.equal(p.cutoffDay, 4);
  assert.equal(p.projectedNet, 40359000n); // $403,590 = $53,812 × 30/4
  assert.equal(p.observedDaily, 5381200n); // One distinct reported date, not four natural days
  assert.equal(p.reportedDates, 1);
  assert.equal(p.countedPairs, 1);
  assert.equal(p.expectedPairs, 4);
});

test("BI-02 forecast uses GLOBAL last date even with a selected branch behind", () => {
  const a = row({ date: "2026-11-04", branch_id: "a", net_sales: "53812.00" });
  const b = row({ cut_id: "b", date: "2026-11-07", branch_id: "b", net_sales: "100.00" });
  const global = commercialCutoffDate([a, b], "2026-11");
  const selected = commercialProjection([a], target, "2026-11", global);
  assert.equal(global, "2026-11-07");
  assert.equal(selected.scopedDate, "2026-11-04");
  assert.equal(selected.projectedNet, 23062286n); // $53,812 × 30 / 7
  assert.equal(selected.observedDaily, 5381200n); // $53,812 / 1 date
  assert.equal(selected.countedPairs, 1);
  assert.equal(selected.expectedPairs, 7);
  assert.equal(commercialCutoffDate([
    b, row({ cut_id: "historical", date: "2026-11-15", source_kind: "APPSHEET",
      historical: true, state: "HISTORICO_SIN_REVISAR", net_sales: null }),
  ], "2026-11"), "2026-11-07");
});

test("BI-02 current commercial sample reproduces audited net, projection and rhythm exactly", () => {
  const sales = [391950, 330283, 174337, 205962, 179572, 192028, 369022];
  const rows = sales.map((value, index) => row({
    cut_id: "nov-" + index,
    date: "2026-11-" + String(index + 1).padStart(2, "0"),
    net_sales: value + ".00",
  }));
  const p = commercialProjection(rows, target, "2026-11", commercialCutoffDate(rows, "2026-11"));
  assert.equal(p.projectedNet, 789923143n); // $7,899,231.43
  assert.equal(p.observedDaily, 26330771n); // $263,307.71
  assert.equal(p.reportedDates, 7);
  assert.equal(p.daysInMonth, 30);
});

test("BI-02 keeps incomplete, missing and invalid cutoff cases unavailable rather than inventing zero", () => {
  assert.equal(commercialProjection([], target, "2026-11", null).projectedNet, null);
  assert.equal(commercialProjection([row()], target, "2026-11", null).projectedNet, null);
  assert.equal(commercialProjection([row({ net_sales: null })], target, "2026-11", "2026-11-01").projectedNet, null);
  assert.equal(commercialProjection([row()], target, "2026-11", "2026-10-31").projectedNet, null);
  assert.equal(commercialProjection([row({ date: "2026-11-05" })], target, "2026-11", "2026-11-04").projectedNet, null);
  const mixed = [row(), row({ cut_id: "hist", state: "HISTORICO_SIN_REVISAR",
    historical: true, source_kind: "APPSHEET", net_sales: null })];
  assert.equal(commercialProjection(mixed, target, "2026-11", "2026-11-01").projectedNet, null);
  assert.equal(commercialProjection(mixed, target, "2026-11", "2026-11-01").observedDaily, null);
  const dated = [row({ date: "2026-11-01" }), row({ cut_id: "second", date: "2026-11-04" })];
  const p = commercialProjection(dated, target, "2026-11", "2026-11-04");
  assert.equal(p.reportedDates, 2);
  assert.equal(p.cutoffDay, 4);
  assert.equal(p.countedPairs, 2);
  assert.equal(p.expectedPairs, 4);
});

test("BI-02 handles February leap years, month bounds and no target for net-only projection", () => {
  const leap = row({ date: "2024-02-04", net_sales: "100.00" });
  const common = row({ date: "2025-02-04", net_sales: "100.00" });
  const a = commercialProjection([leap], [], "2024-02", "2024-02-04");
  const b = commercialProjection([common], [], "2025-02", "2025-02-04");
  assert.equal(a.daysInMonth, 29);
  assert.equal(a.projectedNet, 72500n);
  assert.equal(b.daysInMonth, 28);
  assert.equal(b.projectedNet, 70000n);
  assert.equal(commercialCutoffDate([row({ date: "2025-02-29" })], "2025-02"), null);
  assert.equal(commercialProjection([leap], target, "not-a-month", "2024-02-04").projectedNet, null);
});
