import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src=readFileSync(new URL("../components/LaRousseDashboard.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");
const shell=src.slice(src.indexOf("export default function LaRousseDashboard()"));

test("executive hierarchy keeps ranking above the Daily module and comparison", () => {
  const kpis=shell.indexOf('<section className="lr4-lead"');
  const ranking=shell.indexOf("<Branches data={data}");
  const daily=shell.indexOf("<Daily key={month");
  const compare=shell.indexOf("<CommercialComparison comparison={comparison}");
  const controls=shell.indexOf('<section className="lr16-data-controls"');
  assert.ok(kpis>=0 && kpis<ranking && ranking<daily &&
    daily<compare && compare<controls);
  assert.match(src,/\.sort\(compareProjectedCompliance\)/);
  assert.match(src,/projectedPerformanceTier\(b\.projection\.projectedNet, b\.m\.target\)/);
});

test("comparison control belongs to comparison module, not global header", () => {
  const header=shell.slice(shell.indexOf('<header className="lr2-header">'),shell.indexOf("</header>"));
  assert.doesNotMatch(header,/Comparación temporal global/);
  const section=src.slice(src.indexOf("function CommercialComparison("),src.indexOf("function Branches("));
  assert.match(section,/aria-label="Comparación temporal global"/);
  assert.match(section,/onModeChange\(event\.target\.value\)/);
  assert.match(section,/mode === "none"/);
  assert.match(shell,/mode=\{comparisonMode\} onModeChange=\{setComparisonMode\}/);
});

test("mobile ranking keeps four principal fields plus expandable details", () => {
  assert.match(src,/className="lr16-ranking-mobile"/);
  assert.match(src,/<strong>\{percent\(b\.projection\.projectedNet, b\.m\.target\)\}<\/strong>/);
  assert.match(src,/Proyección: \{money\(b\.projection\.projectedNet\)\}/);
  assert.match(src,/Meta: \{money\(b\.m\.target\)\}/);
  assert.match(src,/className="lr16-ranking-mobile-extra"/);
  assert.match(css,/@media\(max-width:740px\)/);
  assert.match(css,/\.lr16-ranking-desktop\{display:none\}/);
  assert.match(css,/\.lr16-ranking-mobile\{display:grid/);
});

test("controls stay collapsed and trend dates remain synchronized", () => {
  assert.match(shell,/<details className="lr16-review-details">/);
  assert.match(shell,/<CutReview rows=\{m\.commercial\} confirmed=\{m\.confirmed\} \/>/);
  assert.match(shell,/<History data=\{data\} selected=\{branch\} rows=\{m\.historical\} \/>/);
  assert.match(src,/className="lr3-history lr4-historical"|className="lr2-panel lr3-history lr4-historical"/);
  assert.match(src,/Gráficas: \{selectedSummary\}/);
  assert.match(src,/selectedDate=\{selectedDate\} setSelectedDate=\{setSelectedDate\}/);
  assert.match(src,/branchDailyMetrics\(rows, calendarDates, selectedIds, "consolidated"\)/);
});


test("sales participation is inside the Daily module with responsive paired charts", () => {
 assert.match(src,/<SalesByBranchChart rows=\{scopedRows\} branches=\{branches\} selectedIds=\{selectedIds\} \/>/);
 assert.doesNotMatch(src,/<SalesByBranchChart rows=\{m\.commercial\}/);
 assert.match(css,/\.lr17-daily-paired\{display:grid;grid-template-columns:/);
 assert.match(css,/@media\(max-width:1150px\)/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.doesNotMatch(css,/\.lr16-ranking-pie/);
});

test("dashboard retains ranking and trend priorities while reducing excess vertical gaps", () => {
 assert.match(css,/\.lr2\.lr3 \.lr4-lead\{gap:11px;margin-bottom:12px\}/);
 assert.match(css,/\.lr2\.lr3 \.lr4-activity\{gap:11px;margin-bottom:15px\}/);
 assert.match(css,/\.lr16-performance-group\{margin:0 0 14px\}/);
 assert.match(css,/\.lr17-daily-paired\{display:grid/);
 const ranking=shell.indexOf("<Branches data={data}");
 const daily=shell.indexOf("<Daily key={month");
 assert.ok(ranking>=0 && ranking<daily);
 assert.match(src,/\.sort\(compareProjectedCompliance\)/);
});
