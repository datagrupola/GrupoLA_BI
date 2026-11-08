import { dailyCommercialMetrics } from "./larousse-daily.mjs";
import { REPORTABLE } from "./larousse-commercial.mjs";

const reportable = (row) => row.source_kind === "OPS" &&
  row.historical === false && REPORTABLE.has(row.state);

// Keep all charts on the same calendar, including days with no valid cuts.
export function datesForTimeline(rows) {
  const dates = rows.filter(reportable).map((row) => row.date).sort();
  if (!dates.length) return [];
  const start = new Date(dates[0] + "T00:00:00Z");
  const end = new Date(dates[dates.length - 1] + "T00:00:00Z");
  const result = [];
  for (const date = start; date <= end; date.setUTCDate(date.getUTCDate() + 1))
    result.push(date.toISOString().slice(0, 10));
  return result;
}

// In the consolidated view, a value is reportable only when each selected
// branch has exactly one eligible cut that day. Rates are recomputed from
// summed numerators/denominators by dailyCommercialMetrics, never averaged.
export function branchDailyMetrics(rows, dates, selectedBranchIds, mode) {
  const selected = [...new Set(selectedBranchIds.filter(Boolean))];
  if (!selected.length) return [];
  if (mode !== "comparison" && mode !== "consolidated")
    throw Error("INVALID_SERIES_MODE");
  const eligible = rows.filter(reportable);
  const scopes = mode === "comparison"
    ? selected.map((id) => ({ id, ids: [id] }))
    : [{ id: "consolidated", ids: selected }];
  return scopes.map((scope) => {
    const branchSet = new Set(scope.ids);
    const scoped = eligible.filter((row) => branchSet.has(row.branch_id));
    const byDate = new Map();
    for (const row of scoped) {
      const matches = byDate.get(row.date) || new Map();
      matches.set(row.branch_id, (matches.get(row.branch_id) || 0) + 1);
      byDate.set(row.date, matches);
    }
    const days = dailyCommercialMetrics(scoped, dates).map((day) => {
      const counts = byDate.get(day.date);
      const complete = !!counts && scope.ids.every((id) => counts.get(id) === 1);
      if (complete) return { ...day, complete: true };
      return {
        ...day, complete: false, net: null, footfall: null,
        conversion: null, piecesPerTicket: null, tickets: null, pieces: null,
      };
    });
    return { id: scope.id, branchIds: scope.ids, days };
  });
}
