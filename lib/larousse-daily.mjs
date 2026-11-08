import { summarize } from "./larousse.mjs";
import { REPORTABLE, ratioHundredths, sumUnits } from "./larousse-commercial.mjs";

// Shared daily population: exactly the reportable, non-historical OPS cuts.
// Never treat absent dates or missing denominators as a measured zero.
export function dailyCommercialMetrics(rows, dates) {
  const commercial = rows.filter((row) =>
    row.source_kind === "OPS" &&
    row.historical === false &&
    REPORTABLE.has(row.state)
  );
  return dates.map((date) => {
    const daily = commercial.filter((row) => row.date === date);
    if (!daily.length) {
      return {
        date, net: null, footfall: null, conversion: null,
        piecesPerTicket: null, tickets: null, pieces: null,
        known: 0, count: 0, branchCount: 0,
      };
    }
    const sales = summarize(daily);
    const footfall = sumUnits(daily, "footfall");
    const tickets = sumUnits(daily, "tickets");
    const pieces = sumUnits(daily, "pieces");
    return {
      date,
      net: sales.net,
      footfall: footfall.value,
      conversion: tickets.value === null ? null :
        ratioHundredths(tickets.value * 100n, footfall.value),
      piecesPerTicket: ratioHundredths(pieces.value, tickets.value),
      tickets: tickets.value,
      pieces: pieces.value,
      known: sales.known,
      count: sales.count,
      branchCount: new Set(daily.map((row) => row.branch_id)).size,
    };
  });
}
