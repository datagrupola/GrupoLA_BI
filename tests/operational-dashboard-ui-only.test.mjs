import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/LaRousseOperationalDashboard.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../components/LaRousseOperationalDashboard.css', import.meta.url), 'utf8');

test('se preservan API, mes, sucursal y fuente mensual actual', () => {
  assert.match(source, /\/api\/larousse\/operational\?/);
  assert.match(source, /new URLSearchParams\(\{ month \}\)/);
  assert.match(source, /operationalMetrics\(scoped\)/);
  assert.match(source, /data\.branches\.filter/);
  assert.match(source, /cache: "no-store"/);
});

test('se conservan los indicadores operativos y su semántica', () => {
  for (const label of [
    'Incidencias · Ritmo Diario', 'Tareas vencidas · Ad hoc',
    'Incidencias por tipo', 'Desempeño por sucursal',
    'Ciclos vencidos', 'Asignadas', 'Aprobadas', 'Reabiertas',
  ]) assert.ok(source.includes(label), `${label} no se encontró`);
  assert.match(source, /cumplimiento de actividades de Ritmo Diario/i);
  assert.match(source, /No hubo ciclos con plazo evaluable/);
  assert.match(source, /sin comparativo de periodos personalizados/i);
  assert.match(source, /Los umbrales son señales de seguimiento/);
});

test('los controles y el frontend no incluyen nuevas credenciales ni nuevas fuentes de datos', () => {
  assert.doesNotMatch(source, /process\.env|OPS_BI_READ_TOKEN|service_role|localStorage/);
  assert.doesNotMatch(source, /fetch\("https?:/);
  assert.match(source, /onKeyDown/);
  assert.match(source, /aria-label="Orden de sucursales"/);
});

test('CSS acotado al dashboard y con reglas responsive', () => {
  assert.match(css, /\.opx-dashboard\s*\{/);
  assert.match(css, /@media\s*\(max-width:560px\)/);
  assert.match(css, /focus-visible/);
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
});
