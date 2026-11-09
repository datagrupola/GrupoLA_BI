import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src=readFileSync(new URL("../components/LaRousseDashboard.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");
const consolidated=src.slice(src.indexOf("function DailySeries("),src.indexOf("const BRANCH_COLORS ="));
const comparative=src.slice(src.indexOf("function BranchComparisonSeries("),src.indexOf("function SalesByBranchChart("));
const pie=src.slice(src.indexOf("function SalesByBranchChart("),src.indexOf("function ConversionFootfallChart("));
const ranking=src.slice(src.indexOf("function Branches("),src.indexOf("function History("));

test("consolidated plot responds over the full height of every date column", () => {
  assert.match(consolidated, /<line className="lr18-crosshair" y1=\{top\} y2=\{chartBase\}/);
  assert.match(consolidated, /points\.map\(\(point, index\) => \{/);
  assert.match(consolidated, /width=\{to - from\} height=\{chartInnerHeight\}/);
  assert.match(consolidated, /onMouseEnter=\{\(\) => setSelectedDate\(point\.date\)\}/);
  assert.match(consolidated, /onFocus=\{\(\) => setSelectedDate\(point\.date\)\}/);
  assert.match(consolidated, /aria-pressed=\{selected\.date === point\.date\}/);
  assert.match(consolidated, /formatValue\(point\[indicator\]\)/);
});
test("comparison plot uses one crosshair and hover column per date, not per branch", () => {
  assert.match(comparative, /<line className="lr18-crosshair" y1=\{top\} y2=\{baseY\}/);
  assert.match(comparative, /dates\.map\(\(date, index\) => \{/);
  assert.match(comparative, /width=\{to - from\} height=\{innerHeight\}/);
  assert.match(comparative, /onMouseEnter=\{\(\) => setSelectedDate\(date\)\}/);
  assert.match(comparative, /onFocus=\{\(\) => setSelectedDate\(date\)\}/);
  assert.match(comparative, /item\.days\[index\]\?\.\[indicator\]/);
  assert.match(comparative, /aria-pressed=\{activeDate === date\}/);
});
test("pie segments and legend highlight on hover and on keyboard focus", () => {
  assert.match(pie,/const \[hoveredBranch, setHoveredBranch\] = useState\(null\)/);
  assert.match(pie,/onMouseEnter=\{\(\) => setHoveredBranch\(entry\.id\)\}/);
  assert.match(pie,/onFocus=\{\(\) => setHoveredBranch\(entry\.id\)\}/);
  assert.match(pie,/onMouseLeave=\{\(\) => setHoveredBranch\(null\)\}/);
  assert.match(pie,/className="lr18-pie-tooltip" role="tooltip"/);
  assert.match(pie,/focusedSlice\.name/);
  assert.match(pie,/money\(focusedSlice\.net\)/);
  assert.match(pie,/lr18-legend-entry/);
  assert.match(css,/\.lr18-pie-muted\{opacity:/);
  assert.match(css,/\.lr18-pie-slice:hover/);
});
test("ranking visually emphasizes the full row while retaining tier colors", () => {
  assert.match(ranking,/<tr key=\{b\.id\} tabIndex=\{0\}/);
  assert.match(ranking,/Cumplimiento proyectado/);
  assert.match(css,/\.lr15-branch-performance \.lr16-ranking-desktop tbody tr:is\(:hover,:focus-visible\)>td/);
  assert.match(css,/filter:brightness\(\.95\)/);
  for (const tier of ["high","medium","low","neutral"])
    assert.match(css,new RegExp("lr15-performance-"+tier+" > td"));
  assert.match(css,/\.lr16-ranking-mobile-item:hover/);
});
test("interactive targets are transparent, accessible, and do not overwrite financial logic", () => {
  assert.match(css,/\.lr18-hit-zone\{fill:transparent;pointer-events:all;cursor:crosshair\}/);
  assert.match(css,/\.lr18-crosshair\{[^}]*pointer-events:none/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(src,/\.sort\(compareProjectedCompliance\)/);
  assert.match(src,/branchDailyMetrics\(rows, calendarDates, selectedIds, branchMode\)/);
  assert.match(src,/commercialProjection\(rows, data\?\.targets \|\| \[\], month, globalCutoff\)/);
});
