import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  OPERATIONAL_SCHEMA, LAROUSSE_BRANCH_NAMES,
  validateOperational, operationalMetrics,
} from "../lib/larousse-operational.mjs";
import { createSessionToken } from "../lib/auth.js";

const branches = LAROUSSE_BRANCH_NAMES.map((name, i) => ({
  name, id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
}));
const [id, second] = branches.map((b) => b.id);
const zero = (branch_id) => ({
  branch_id, missed_tasks: 0, missed_cycles: 0, on_time_cycles: 0,
  not_applicable_cycles: 0, unknown_cycles: 0,
});
const payload = () => ({
  schema: OPERATIONAL_SCHEMA, month: "2026-11",
  queried_at: "2026-11-10T18:00:00.000Z", branches,
  incident_daily: [], task_cycle_daily: [],
  task_monthly: branches.map((b) => zero(b.id)),
  task_activity_daily: [],
});

test("contrato v1 válido: siete sucursales y población mensual conciliada", () => {
  const p = payload();
  p.incident_daily.push({ branch_id: id, date: "2026-11-02", type: "APERTURA_TARDIA", count: 2 });
  p.task_cycle_daily.push({
    ...zero(id), date: "2026-11-02", missed_cycles: 2,
    missed_tasks: 1, on_time_cycles: 1,
  });
  p.task_monthly[0] = { ...zero(id), missed_cycles: 2, missed_tasks: 1, on_time_cycles: 1 };
  p.task_activity_daily.push({ branch_id: id, date: "2026-11-02", assigned: 3, approved: 1, reopened: 1 });
  const valid = validateOperational(p, "2026-11");
  const m = operationalMetrics(valid);
  assert.equal(m.incidents, 2);
  assert.equal(m.missedTasks, 1);
  assert.equal(m.missedCycles, 2);
  assert.equal(m.onTime, 1);
  assert.equal(m.assigned, 3);
  assert.equal(m.approved, 1);
  assert.equal(m.reopened, 1);
  assert.equal(m.onTimeRate, 100 / 3);
});

test("vencimientos diarios no se suman como tareas distintas mensuales", () => {
  const p = payload();
  p.task_cycle_daily.push({ ...zero(id), date: "2026-11-02", missed_cycles: 1, missed_tasks: 1 });
  p.task_cycle_daily.push({ ...zero(id), date: "2026-11-03", missed_cycles: 1, missed_tasks: 1 });
  p.task_monthly[0] = { ...zero(id), missed_cycles: 2, missed_tasks: 1 };
  assert.equal(operationalMetrics(validateOperational(p, "2026-11")).missedTasks, 1);
});

test("fallo cerrado por cobertura, duplicados, métricas inválidas o Chino Regalado", () => {
  const p = payload();
  p.branches.pop();
  assert.throws(() => validateOperational(p, "2026-11"), /CATALOG/);

  const q = payload();
  q.branches[0] = { ...q.branches[0], name: "Chino Regalado AMERICAS" };
  assert.throws(() => validateOperational(q, "2026-11"), /CATALOG/);

  const r = payload();
  r.incident_daily.push(
    { branch_id: id, date: "2026-11-02", type: "APERTURA_TARDIA", count: 1 },
    { branch_id: id, date: "2026-11-02", type: "APERTURA_TARDIA", count: 1 },
  );
  assert.throws(() => validateOperational(r, "2026-11"), /DUPLICATE/);

  const s = payload();
  s.task_monthly[0].missed_cycles = 5;
  assert.throws(() => validateOperational(s, "2026-11"), /TOTAL/);

  const t = payload();
  t.incident_daily.push({ branch_id: second, date: "2026-11-31", type: "ACTIVIDAD_NO_REGISTRADA", count: 1 });
  assert.throws(() => validateOperational(t, "2026-11"), /DATE/);

  const u = payload();
  u.task_monthly[0].unknown_cycles = 1;
  const v = validateOperational({ ...u, task_cycle_daily: [
    { ...zero(id), date: "2026-11-02", unknown_cycles: 1 },
  ] }, "2026-11");
  assert.equal(operationalMetrics(v).onTimeRate, null);
});

test("filtro de una sucursal exige solo su cobertura, no las otras seis", () => {
  const p = payload();
  p.branches = [branches[0]];
  p.task_monthly = [zero(id)];
  assert.equal(validateOperational(p, "2026-11", id).branches.length, 1);
  assert.throws(() => validateOperational(p, "2026-11", second), /CATALOG/);
});

test("API BI valida sesión y envía solo token Ops por HTTPS", async () => {
  let source = readFileSync(new URL("../app/api/larousse/operational/route.js", import.meta.url), "utf8");
  source = source.replace('"../../../../lib/auth"', JSON.stringify(new URL("../lib/auth.js", import.meta.url).href));
  source = source.replace('"../../../../lib/larousse-operational.mjs"',
    JSON.stringify(new URL("../lib/larousse-operational.mjs", import.meta.url).href));
  const { GET } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
  const before = { ...process.env }, priorFetch = globalThis.fetch;
  try {
    process.env.SESSION_SECRET = "test-session-secret";
    process.env.OPS_BI_READ_TOKEN = "c".repeat(64);
    process.env.OPS_BI_URL = "https://ops.example/api/integrations/bi/v1/operational";
    const token = await createSessionToken("test-session-secret");
    const request = (t, qs = "month=2026-11") => ({
      url: "https://bi.example/api/larousse/operational?" + qs,
      cookies: { get: () => t ? { value: t } : undefined },
    });
    let calls = 0, invalid = false;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url.origin, "https://ops.example");
      assert.equal(url.pathname, "/api/integrations/bi/v1/operational");
      assert.equal(options.headers.Authorization, "Bearer " + "c".repeat(64));
      assert.equal(options.redirect, "error");
      return Response.json(invalid ? { ...payload(), task_monthly: [] } : payload());
    };
    assert.equal((await GET(request(null))).status, 401);
    assert.equal((await GET(request("not-signed"))).status, 401);
    assert.equal(calls, 0);
    assert.equal((await GET(request(token, "month=2026-11&branch=bad"))).status, 400);
    assert.equal(calls, 0);
    const good = await GET(request(token));
    assert.equal(good.status, 200);
    assert.equal((await good.json()).schema, OPERATIONAL_SCHEMA);
    assert.match(good.headers.get("cache-control"), /no-store/);
    assert.equal(calls, 1);
    invalid = true;
    assert.equal((await GET(request(token))).status, 502);
    process.env.SESSION_SECRET = "changed";
    assert.equal((await GET(request(token))).status, 401);
    assert.equal(calls, 2);
  } finally {
    process.env = before;
    globalThis.fetch = priorFetch;
  }
});

test("shell operativo y comercial comparten navegación sin exponer secretos", () => {
  const shell = readFileSync(new URL("../components/PortalShell.js", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../components/LaRousseOperationalDashboard.js", import.meta.url), "utf8");
  const api = readFileSync(new URL("../app/api/larousse/operational/route.js", import.meta.url), "utf8");
  assert.match(shell, /Comercial/);
  assert.match(shell, /Operativo/);
  assert.match(ui, /Incidencias · Ritmo Diario/);
  assert.match(ui, /Tareas vencidas · Ad hoc/);
  assert.match(ui, /Incidencias por tipo/);
  assert.match(ui, /Desempeño por sucursal/);
  assert.match(ui, /Cumplimiento de actividades de Ritmo Diario/);
  assert.doesNotMatch(ui, /process\.env|OPS_BI_READ_TOKEN|service_role/);
  assert.match(api, /verifySessionToken/);
  assert.match(api, /validateOperational/);
});
