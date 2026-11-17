import { cents } from "./larousse.mjs";
import { REPORTABLE, units, ratioHundredths } from "./larousse-commercial.mjs";

const currentOps = (row) => row.source_kind === "OPS" && row.historical === false;

// Keep all charts on the same calendar, including days with no valid cuts.
export function datesForTimeline(rows) {
  const dates = rows.filter(currentOps).map((row) => row.date).sort();
  if (!dates.length) return [];
  const start = new Date(dates[0] + "T00:00:00Z");
  const end = new Date(dates[dates.length - 1] + "T00:00:00Z");
  const result = [];
  for (const date = start; date <= end; date.setUTCDate(date.getUTCDate() + 1))
    result.push(date.toISOString().slice(0, 10));
  return result;
}

// Restrict partial aggregation to daily chart series. Other commercial totals,
// targets, projections and financial formulas retain their existing population.
const METRICS = {
  net: ["net_sales"], tickets: ["tickets"], pieces: ["pieces"],
  footfall: ["footfall"], conversion: ["tickets", "footfall"],
  piecesPerTicket: ["pieces", "tickets"],
};
const parse = (row, key) => key === "net_sales" ? cents(row[key]) : units(row[key]);

export function branchDailyMetrics(rows, dates, selectedBranchIds, mode) {
  const selected = [...new Set(selectedBranchIds.filter(Boolean))];
  if (!selected.length) return [];
  if (mode !== "comparison" && mode !== "consolidated")
    throw Error("INVALID_SERIES_MODE");
  const selectedSet = new Set(selected);
  const byDate = new Map();
  for (const row of rows.filter(currentOps)) {
    if (!selectedSet.has(row.branch_id)) continue;
    const branches = byDate.get(row.date) || new Map();
    const matches = branches.get(row.branch_id) || [];
    matches.push(row);
    branches.set(row.branch_id, matches);
    byDate.set(row.date, branches);
  }
  const scopes = mode === "comparison"
    ? selected.map((id) => ({ id, ids: [id] }))
    : [{ id: "consolidated", ids: selected }];
  return scopes.map((scope) => ({
    id: scope.id, branchIds: scope.ids,
    days: dates.map((date) => {
      const cuts = { expected: scope.ids.length, presentIds: [], missingIds: [],
        duplicateIds: [], unreportableIds: [], pendingIds: [], correctionIds: [] };
      const usable = [];
      for (const id of scope.ids) {
        const matches = byDate.get(date)?.get(id) || [];
        if (!matches.length) { cuts.missingIds.push(id); continue; }
        cuts.presentIds.push(id);
        if (matches.some((row) => row.state === "PENDING_REVIEW")) cuts.pendingIds.push(id);
        if (matches.some((row) => row.state === "CORRECTION_REQUESTED")) cuts.correctionIds.push(id);
        if (matches.length !== 1) { cuts.duplicateIds.push(id); continue; }
        if (!REPORTABLE.has(matches[0].state)) { cuts.unreportableIds.push(id); continue; }
        usable.push(matches[0]);
      }
      const day = { date, cuts, coverage: {}, count: cuts.expected,
        branchCount: usable.length };
      for (const [metric, keys] of Object.entries(METRICS)) {
        const coverage = { expected: cuts.expected, includedIds: [],
          insufficientIds: [], invalidIds: [] };
        const sums = keys.map(() => 0n);
        for (const row of usable) {
          const values = keys.map((key) => parse(row, key));
          if (values.some((value) => value === null)) {
            const invalid = keys.some((key, i) => values[i] === null && row[key] != null);
            (invalid ? coverage.invalidIds : coverage.insufficientIds).push(row.branch_id);
            continue;
          }
          // Paired measured values, including zeros, belong to the same cohort.
          // Only the summed denominator determines whether the ratio is defined.
          coverage.includedIds.push(row.branch_id);
          values.forEach((value, i) => { sums[i] += value; });
        }
        coverage.known = coverage.includedIds.length;
        coverage.complete = coverage.known === coverage.expected;
        coverage.zeroDenominator = coverage.known > 0 && keys.length === 2 && sums[1] === 0n;
        day.coverage[metric] = coverage;
        day[metric] = !coverage.known ? null : keys.length === 1 ? sums[0] :
          ratioHundredths(metric === "conversion" ? sums[0] * 100n : sums[0], sums[1]);
      }
      day.known = day.coverage.net.known;
      day.complete = Object.values(day.coverage).every((item) => item.complete);
      return day;
    }),
  }));
}
