import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../components/LaRousseDashboard.js", import.meta.url), "utf8");

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
