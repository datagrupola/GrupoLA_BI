// Run after pnpm build. Playwright is supplied by the QA environment, not the app.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createSessionToken } from "../../lib/auth.js";
const { chromium } = await import(process.env.BI_QA_PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.BI_QA_PLAYWRIGHT_MODULE).href : "playwright");
const output = process.env.BI_QA_OUTPUT || "/tmp/bi-series-qa";
await mkdir(output, { recursive: true });
const port = 3217;
const origin = `http://127.0.0.1:${port}`;
const secret = "local-fictional-qa-only";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  env: { ...process.env, SESSION_SECRET: secret }, stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", chunk => { serverLog += chunk; });
server.stderr.on("data", chunk => { serverLog += chunk; });
let browser;
const checks = [];
const ids = ["CAMELINAS", "CENTRO", "LAZARO", "PEPSI", "TORRE", "PLAZA", "NORTE", "BBVA"];
const branches = ids.map(id => ({ id, name: id }));
const row = (id, day, patch = {}) => ({ cut_id: `${id}-${day}`, branch_id: id,
  date: `2026-11-${day}`, count: 1, source_kind: "OPS", historical: false,
  state: "APPROVED", revision_id: null, net_sales: "100.00", declared_total: "100.00",
  cut_expenses: "0.00", net_basis: "NET", tickets: "2", footfall: "10", pieces: "6", ...patch });
const rows = [
  ...ids.map(id => row(id, "11")),
  ...["12", "13"].flatMap(day => ids.slice(0, 7).map(id => row(id, day))),
  row(ids[0], "14"), // 15 has no cuts, but stays in the common calendar.
  row(ids[0], "16"), row(ids[0], "16", { cut_id: "duplicate" }),
  row(ids[1], "16", { footfall: null, state: "PENDING_REVIEW" }),
  row(ids[2], "16", { tickets: "0", state: "CORRECTION_REQUESTED" }),
  row(ids[3], "16", { state: "CANCELLED" }),
  row("BBVA", "12", { source_kind: "APPSHEET", historical: true, net_sales: null }),
];
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(serverLog);
    try { if ((await fetch(origin + "/login")).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      isMobile: mobile, hasTouch: mobile });
    await context.addCookies([{ name: "bi_session", value: await createSessionToken(secret), url: origin }]);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.route("**/api/larousse?*", async route => {
      const url = new URL(route.request().url());
      const selected = url.searchParams.get("branch");
      await route.fulfill({ json: { schema: "finance-bi-commercial-v2", month: "2026-11",
        queried_at: "2026-11-17T12:00:00Z", branches,
        targets: branches.filter(b => !selected || b.id === selected).map(b => ({ branch_id: b.id, amount: "10000.00" })),
        rows: rows.filter(r => !selected || r.branch_id === selected) } });
    });
    // Block accidental external access during fictional QA.
    await page.route(/https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
    await page.goto(origin);
    await page.locator('input[type="month"]').fill("2026-11");
    const daily = page.locator(".lr6-daily");
    await daily.waitFor();
    const main = page.locator("#lr13-main-panel");
    const combo = page.getByRole("article", { name: "Conversión y afluencia a piso por fecha", exact: true });
    const target = (chart, day) => chart.locator('g[role="button"]').filter({ has: page.locator("rect") }).nth(day - 11);
    const select = async (chart, day) => {
      const point = target(chart, day);
      if (mobile) await point.tap(); else await point.hover();
    };
    await select(main, 11);
    assert.match(await main.innerText(), /Cobertura: 8\/8/);
    await select(main, 12);
    assert.match(await main.innerText(), /\$700\.00/);
    assert.match(await main.innerText(), /Cobertura: 7\/8.*Consolidado parcial.*Falta corte: BBVA/s);
    assert.equal(await main.locator("circle.lr19-partial").count(), 4);
    // The first segment contains 11, 12, 13 and 14; no fake point on 15.
    assert.equal((await main.locator("polyline").first().getAttribute("points")).split(" ").length, 4);
    assert.equal(await main.locator("circle").count(), 5);
    await main.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${mobile ? "mobile" : "desktop"}-7-of-8.png` });
    await combo.scrollIntoViewIfNeeded();
    await select(combo, 12);
    assert.match(await combo.innerText(), /20\.00%/);
    assert.match(await combo.innerText(), /Cobertura: 7\/8.*Falta corte: BBVA/s);
    assert.equal(await combo.locator(".lr19-partial-bar").count(), 4);
    await page.screenshot({ path: `${output}/${mobile ? "mobile" : "desktop"}-combo.png` });
    await select(main, 14);
    assert.match(await main.innerText(), /Cobertura: 1\/8.*CENTRO, LAZARO, PEPSI, TORRE, PLAZA, NORTE, BBVA/s);
    await select(main, 15);
    assert.match(await main.innerText(), /No disponible.*Cobertura: 0\/8/s);
    await target(main, 16).focus();
    await page.keyboard.press("Enter");
    assert.match(await main.innerText(), /Corte duplicado \(excluido\): CAMELINAS/);
    assert.match(await main.innerText(), /Pendiente de revisión: CENTRO.*Requiere corrección: LAZARO/s);
    await daily.getByRole("tab", { name: "Conversión", exact: true }).click();
    assert.match(await main.innerText(), /Cobertura: 1\/8.*Datos insuficientes para este indicador: CENTRO/s);
    await daily.getByRole("tab", { name: "Piezas por ticket", exact: true }).click();
    assert.match(await main.innerText(), /Denominador cero \(excluido\): LAZARO/);
    for (const label of ["Tickets", "Piezas vendidas", "Afluencia", "Ventas"]) {
      await daily.getByRole("tab", { name: label, exact: true }).click();
      await select(main, 12);
      assert.match(await main.innerText(), /Cobertura: 7\/8.*Falta corte: BBVA/s);
    }
    await daily.getByRole("button", { name: "Sucursales (8)", exact: false }).click();
    await daily.getByRole("button", { name: "Limpiar", exact: true }).click();
    for (const name of ["CAMELINAS", "CENTRO", "BBVA"]) await daily.getByRole("checkbox", { name, exact: true }).check();
    await page.keyboard.press("Escape");
    await select(main, 12);
    assert.match(await main.innerText(), /Cobertura: 2\/3.*Falta corte: BBVA/s);
    await daily.getByRole("button", { name: "Comparativo", exact: true }).click();
    await select(main, 12);
    assert.equal(await main.locator(".lr11-legend-item").count(), 3);
    assert.match(await main.locator(".lr11-legend-item").last().innerText(), /BBVA.*No disponible.*Cobertura: 0\/1.*Falta corte: BBVA/s);
    await target(main, 11).focus();
    await page.keyboard.press("Tab");
    assert.match(await main.locator(".lr11-legend-item").last().innerText(), /Falta corte: BBVA/);
    await main.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${mobile ? "mobile" : "desktop"}-comparison.png` });
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    checks.push({ viewport: mobile ? "390x844 touch" : "1440x1000 mouse", passed: true,
      checks: ["8/8", "7/8 BBVA", "1/8 names", "0/8 absence", "duplicate", "pending/correction", "metric-specific missing", "zero denominator", "six metrics", "continuous partial line", "combo", "2/3 selection", "comparison", "keyboard focus/tab/enter", "no console errors", "no viewport overflow"] });
    await context.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify(checks, null, 2));
  console.log(JSON.stringify(checks, null, 2));
} finally {
  await browser?.close();
  server.kill();
  await writeFile(`${output}/server.log`, serverLog);
}
