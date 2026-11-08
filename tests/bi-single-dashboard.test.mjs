import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const shell = read("components/PortalShell.js");
const layout = read("app/layout.js");
const login = read("app/login/page.js");
const styles = read("app/globals.css");
const dashboard = read("components/LaRousseDashboard.js");

test("portal opens exactly one official La Rousse commercial dashboard", () => {
  assert.match(shell, /<LaRousseDashboard\s*\/>/);
  assert.equal(shell.match(/<LaRousseDashboard\s*\/>/g)?.length, 1);
  assert.doesNotMatch(shell, /PacasDashboard|<iframe|activeView|views\s*=|setActiveView/);
  assert.match(shell, /<main id="dashboard-comercial"/);
});

test("retired business views and obsolete Looker links are absent from the visible portal", () => {
  for (const legacy of ["Chino Regalado", "Encuestas", "Afluencia", "datastudio.google.com", "NavButton", "sidebar"])
    assert.ok(!shell.includes(legacy), "Legacy shell content: " + legacy);
  assert.doesNotMatch(dashboard, /Ver reporte de Looker|datastudio\.google\.com/);
});

test("semantic single-view shell stays scrollable and responsive across screen widths", () => {
  assert.match(shell, /className="bi-workspace"/);
  assert.match(shell, /className="bi-skip-link"/);
  assert.match(styles, /\.bi-appbar-inner/);
  assert.match(styles, /\.bi-workspace/);
  assert.match(styles, /@media\(max-width:560px\)/);
  assert.match(styles, /@media\(max-width:400px\)/);
  assert.doesNotMatch(styles, /\.app-shell|\.sidebar/);
});

test("brand copy and authentication remain available", () => {
  assert.match(layout, /Grupo LA BI \| Inteligencia comercial/);
  assert.match(login, /action="\/api\/login"/);
  assert.match(login, /dashboard comercial de La Rousse/);
});

test("finance-related commercial indicators remain present and Pacas stays in repository for later", () => {
  assert.match(dashboard, /commercialProjection\(rows, data\?\.targets \|\| \[\], month, globalCutoff\)/);
  assert.match(dashboard, /label="Conversión"/);
  assert.match(dashboard, /label="Piezas por ticket"/);
  const pacas = read("components/PacasDashboard.js");
  assert.match(pacas, /Pacas/);
});
