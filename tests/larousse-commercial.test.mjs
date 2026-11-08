import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commercialMetrics,
  percent,
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
