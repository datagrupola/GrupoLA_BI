import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewCutCounts } from "../lib/larousse-review.mjs";

const ops = (state) => ({ source_kind: "OPS", historical: false, state });

test("review bar uses only reportable current OPS cuts", () => {
  const result = reviewCutCounts([
    ops("APPROVED"),
    ops("APPROVED"),
    ops("PENDING_REVIEW"),
    ops("CORRECTION_REQUESTED"),
    { source_kind: "APPSHEET", historical: true, state: "HISTORICO_SIN_REVISAR" },
    { source_kind: "APPSHEET", historical: true, state: "APPROVED" },
    { source_kind: "OPS", historical: true, state: "APPROVED" },
    ops("CANCELLED"),
  ]);
  assert.deepEqual(result, {
    approved: 2,
    pending: 1,
    correction: 1,
    awaiting: 2,
    total: 4,
    approvedPercent: 50,
    awaitingPercent: 50,
  });
});

test("review groups correction-requested with pending approval, never approved", () => {
  const result = reviewCutCounts([
    ops("APPROVED"),
    ops("PENDING_REVIEW"),
    ops("CORRECTION_REQUESTED"),
  ]);
  assert.equal(result.approved, 1);
  assert.equal(result.pending, 1);
  assert.equal(result.correction, 1);
  assert.equal(result.awaiting, 2);
  assert.equal(result.approvedPercent, 33.3);
  assert.equal(result.awaitingPercent, 66.7);
  assert.equal(result.approvedPercent + result.awaitingPercent, 100);
});

test("review is safe for empty or history-only months", () => {
  for (const rows of [[], [{ source_kind: "APPSHEET", historical: true, state: "HISTORICO_SIN_REVISAR" }]]) {
    const result = reviewCutCounts(rows);
    assert.equal(result.total, 0);
    assert.equal(result.approvedPercent, 0);
    assert.equal(result.awaitingPercent, 0);
  }
});

test("single horizontal stacked bar is linked to the audited commercial population", () => {
  const src = readFileSync(new URL("../components/LaRousseDashboard.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(src, /<CutReview rows={m\.commercial} confirmed={m\.confirmed} \/>/);
  assert.match(src, /role="img"/);
  assert.match(src, /lr8-review-track/);
  assert.match(src, /<b>\{number\(review\.approved\)\} aprobados<\/b>/);
  assert.match(src, /<b>\{number\(review\.awaiting\)\} pendientes<\/b>/);
  assert.doesNotMatch(src, /approvedPercent\.toFixed|awaitingPercent\.toFixed|lr8-review-legend/);
  assert.doesNotMatch(css, /\.lr8-review-legend/);
  assert.match(css, /min-height:172px/);
  assert.match(css, /min-height:158px/);
  assert.match(src, /Incluye \{review\.correction\} en corrección/);
  assert.match(css, /grid-template-rows:21px 45px minmax\(39px,1fr\)/);
  assert.match(css, /\.lr8 \.lr4-lead > article/);
  assert.match(css, /\.lr8-review-approved/);
  assert.match(css, /\.lr8-review-pending/);
  assert.match(src, /commercialProjection\(rows, data\?\.targets \|\| \[\], month, globalCutoff\)/);
  assert.match(src, /<History data={data} selected={branch} rows={m\.historical} \/>/);
});
