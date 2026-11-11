import { cents } from "./larousse.mjs";
import { REPORTABLE } from "./larousse-commercial.mjs";

// Participation describes the distribution of *reported, valid* sales only.
// An absent/invalid branch never becomes a zero-sale branch. If coverage is
// partial, percentages are explicitly shares of the verified subtotal.
export function salesParticipation(rows, branches, selectedIds) {
  const desired = new Set(selectedIds);
  const selected = branches.filter((branch) => desired.has(branch.id));
  const eligible = rows.filter((row) =>
    row.source_kind === "OPS" && row.historical === false &&
    REPORTABLE.has(row.state)
  );
  const entries = selected.map((branch) => {
    const own = eligible.filter((row) => row.branch_id === branch.id);
    const days = new Set();
    let sum = 0n;
    let reason = null;
    if (!own.length) reason = "Sin cortes";
    for (const row of own) {
      if (days.has(row.date)) reason = "Cortes duplicados";
      days.add(row.date);
      const amount = cents(row.net_sales);
      if (amount === null) reason = "Ingresos no disponibles";
      else sum += amount;
    }
    return {
      id: branch.id, name: branch.name, count: own.length,
      net: reason === null ? sum : null, reason, tenths: null,
    };
  });
  const known = entries.filter((entry) => entry.net !== null);
  const total = known.length ? known.reduce((sum, entry) => sum + entry.net, 0n) : null;
  const chartable = total !== null && total > 0n;
  if (chartable) {
    const shares = known.map((entry, index) => ({
      entry, index,
      base: entry.net * 1000n / total,
      remainder: entry.net * 1000n % total,
    }));
    const leftover = 1000n - shares.reduce((sum, item) => sum + item.base, 0n);
    const byRemainder = [...shares].sort((a, b) =>
      a.remainder === b.remainder ? a.index - b.index :
        a.remainder > b.remainder ? -1 : 1
    );
    for (let i = 0; i < Number(leftover); i++) byRemainder[i].base++;
    for (const item of shares) item.entry.tenths = Number(item.base);
  }
  return {
    entries, total, chartable, complete: known.length === selected.length && selected.length > 0,
    knownBranches: known.length, selectedBranches: selected.length,
  };
}
