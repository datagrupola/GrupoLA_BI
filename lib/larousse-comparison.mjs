import { cents, summarize } from "./larousse.mjs";
import { REPORTABLE, ratioHundredths, roundRatio, sumUnits } from "./larousse-commercial.mjs";

const DATE_RE = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const pad = (n) => String(n).padStart(2, "0");
const utc = (date) => new Date(date + "T00:00:00Z");
const iso = (date) => date.toISOString().slice(0, 10);
const shiftDate = (date, offset) => {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + offset);
  return iso(d);
};
const previousMonth = (month) => {
  const d = utc(month + "-01");
  d.setUTCMonth(d.getUTCMonth() - 1);
  return iso(d).slice(0, 7);
};
const monthDays = (month) => new Date(Date.UTC(
  Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0
)).getUTCDate();
const within = (row, from, to) => row.date >= from && row.date <= to;
const validDate = (value) => DATE_RE.test(value || "") && iso(utc(value)) === value;

export function comparisonWindows(month, cutoff, mode) {
  if (!["week", "month"].includes(mode) ||
      !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month || "") ||
      !validDate(cutoff) || !cutoff.startsWith(month + "-")) return null;
  let currentStart, currentEnd, previousStart, previousEnd;
  if (mode === "week") {
    currentEnd = cutoff;
    currentStart = shiftDate(cutoff, -6);
    previousEnd = shiftDate(currentStart, -1);
    previousStart = shiftDate(currentStart, -7);
  } else {
    const before = previousMonth(month);
    // Compare exactly the same day numbers, not full prior month against MTD.
    const comparableEndDay = Math.min(Number(cutoff.slice(-2)), monthDays(before));
    currentStart = month + "-01";
    currentEnd = month + "-" + pad(comparableEndDay);
    previousStart = before + "-01";
    previousEnd = before + "-" + pad(comparableEndDay);
  }
  const months = new Set();
  for (const range of [[previousStart, previousEnd], [currentStart, currentEnd]]) {
    let cursor = range[0].slice(0, 7) + "-01";
    const finalMonth = range[1].slice(0, 7);
    while (cursor.slice(0, 7) <= finalMonth) {
      months.add(cursor.slice(0, 7));
      const next = utc(cursor);
      next.setUTCMonth(next.getUTCMonth() + 1);
      cursor = iso(next);
    }
  }
  return {
    mode,
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
    months: [...months].sort(),
    dayCount: Math.round((utc(currentEnd) - utc(currentStart)) / 86400000) + 1,
  };
}

function collectPopulation(rows, window, branchIds) {
  const expected = new Set(branchIds);
  const eligible = rows.filter((row) =>
    row.source_kind === "OPS" && row.historical === false &&
    REPORTABLE.has(row.state) && expected.has(row.branch_id) &&
    within(row, window.start, window.end)
  );
  const dates = Math.round((utc(window.end) - utc(window.start)) / 86400000) + 1;
  const expectedPairs = expected.size * dates;
  const pairs = new Set(eligible.map((row) => row.branch_id + "|" + row.date));
  // A complete comparison needs one unambiguous cut per selected branch/day.
  // Missing or duplicate pairs must never produce apparently valid growth.
  const complete = expectedPairs > 0 && pairs.size === expectedPairs &&
    eligible.length === expectedPairs;
  const sales = summarize(eligible);
  const ticketUnits = sumUnits(eligible, "tickets");
  const visitorUnits = sumUnits(eligible, "footfall");
  const pieceUnits = sumUnits(eligible, "pieces");
  const average = sales.net === null || ticketUnits.value === null ||
    ticketUnits.value <= 0n ? null : roundRatio(sales.net, ticketUnits.value);
  const conversion = ticketUnits.value === null ? null :
    ratioHundredths(ticketUnits.value * 100n, visitorUnits.value);
  const piecesPerTicket = ratioHundredths(pieceUnits.value, ticketUnits.value);
  return {
    complete, observedPairs: pairs.size, expectedPairs,
    values: {
      net: sales.net,
      tickets: ticketUnits.value,
      footfall: visitorUnits.value,
      pieces: pieceUnits.value,
      average,
      conversion,
      piecesPerTicket,
    },
  };
}

export const COMPARISON_METRICS = [
  { key: "net", label: "Ingresos", kind: "money" },
  { key: "tickets", label: "Tickets", kind: "units" },
  { key: "footfall", label: "Afluencia", kind: "units" },
  { key: "pieces", label: "Piezas vendidas", kind: "units" },
  { key: "average", label: "Ticket promedio", kind: "money" },
  { key: "conversion", label: "Conversión", kind: "ratio-percent" },
  { key: "piecesPerTicket", label: "Piezas por ticket", kind: "ratio" },
];

export function periodComparison(rows, windows, branchIds) {
  if (!windows) return null;
  const uniqueBranches = [...new Set(branchIds.filter(Boolean))];
  const current = collectPopulation(rows, windows.current, uniqueBranches);
  const previous = collectPopulation(rows, windows.previous, uniqueBranches);
  return {
    windows,
    current: { observedPairs: current.observedPairs, expectedPairs: current.expectedPairs, complete: current.complete },
    previous: { observedPairs: previous.observedPairs, expectedPairs: previous.expectedPairs, complete: previous.complete },
    metrics: COMPARISON_METRICS.map((metric) => {
      const currentValue = current.complete ? current.values[metric.key] : null;
      const previousValue = previous.complete ? previous.values[metric.key] : null;
      if (currentValue === null || previousValue === null) {
        return { ...metric, currentValue, previousValue, change: null };
      }
      if (metric.kind === "ratio-percent" || metric.kind === "ratio") {
        return { ...metric, currentValue, previousValue, change: currentValue - previousValue };
      }
      if (previousValue <= 0n) {
        return { ...metric, currentValue, previousValue, change: null };
      }
      const diff = currentValue - previousValue;
      const absolute = diff < 0n ? -diff : diff;
      const change = roundRatio(absolute * 10000n, previousValue);
      return { ...metric, currentValue, previousValue, change: diff < 0n ? -change : change };
    }),
  };
}
