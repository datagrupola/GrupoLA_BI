import { cents, summarize, validate } from "./larousse.mjs";
export const REPORTABLE = new Set([
  "APPROVED",
  "PENDING_REVIEW",
  "CORRECTION_REQUESTED",
]);
export const units = (value) =>
  typeof value === "string" && /^\d{1,12}$/.test(value) ? BigInt(value) : null;
export const roundRatio = (numerator, denominator) =>
  denominator > 0n ? (numerator + denominator / 2n) / denominator : null;
export function percent(numerator, denominator) {
  if (numerator === null || denominator === null || denominator <= 0n)
    return "No disponible";
  const value = roundRatio(numerator * 10000n, denominator);
  return (
    (value / 100n).toString() +
    "." +
    (value % 100n).toString().padStart(2, "0") +
    "%"
  );
}
export function validateCommercial(data, month, branch) {
  if (data?.schema !== "finance-bi-commercial-v2")
    throw Error("INVALID_VERSION");
  const base = validate(
    { ...data, schema: "finance-bi-cuts-v1" },
    month,
    branch,
  );
  const selected = new Set(
    base.branches.filter((b) => !branch || b.id === branch).map((b) => b.id),
  );
  if (!Array.isArray(data.targets) || data.targets.length !== selected.size)
    throw Error("INVALID_TARGET_COVERAGE");
  const targets = data.targets.map((t) => {
    if (
      !selected.delete(t.branch_id) ||
      (t.amount !== null && cents(t.amount) === null)
    )
      throw Error("INVALID_TARGET");
    return {
      branch_id: t.branch_id,
      amount: t.amount,
      updated_at: t.updated_at,
    };
  });
  const rows = base.rows.map((row, i) => {
    const raw = data.rows[i];
    if (
      ![null, "OPS", "APPSHEET"].includes(raw.source_kind) ||
      typeof raw.historical !== "boolean" ||
      raw.historical !==
        (raw.source_kind === "APPSHEET" ||
          row.state === "HISTORICO_SIN_REVISAR") ||
      (raw.historical && row.net_sales !== null)
    )
      throw Error("INVALID_PROVENANCE");
    for (const key of ["tickets", "footfall", "pieces"])
      if (raw[key] !== null && units(raw[key]) === null)
        throw Error("INVALID_ACTIVITY");
    return {
      ...row,
      source_kind: raw.source_kind,
      historical: raw.historical,
      tickets: raw.tickets,
      footfall: raw.footfall,
      pieces: raw.pieces,
    };
  });
  return { ...base, schema: data.schema, rows, targets };
}
export function sumUnits(rows, key) {
  let value = 0n,
    known = 0;
  for (const row of rows) {
    const n = units(row[key]);
    if (n !== null) {
      value += n;
      known++;
    }
  }
  return {
    value: known === rows.length ? value : null,
    known,
    count: rows.length,
  };
}
export function commercialMetrics(rows, targets) {
  const commercial = rows.filter(
    (r) => !r.historical && r.source_kind === "OPS" && REPORTABLE.has(r.state),
  );
  const sales = summarize(commercial),
    tickets = sumUnits(commercial, "tickets"),
    footfall = sumUnits(commercial, "footfall"),
    pieces = sumUnits(commercial, "pieces");
  // Ratios use sums from exactly the same non-historical OPS cohort.
  const conversion = ratioHundredths(
    tickets.value === null ? null : tickets.value * 100n,
    footfall.value,
  );
  const piecesPerTicket = ratioHundredths(pieces.value, tickets.value);
  const complete =
    rows.length > 0 &&
    commercial.length === rows.length &&
    sales.net !== null &&
    targets.length > 0 &&
    targets.every((t) => commercial.some((r) => r.branch_id === t.branch_id));
  const targetKnown = targets.filter((t) => cents(t.amount) !== null).length;
  const target =
    targets.length > 0 && targetKnown === targets.length
      ? targets.reduce((s, t) => s + cents(t.amount), 0n)
      : null;
  const fullNet = complete ? sales.net : null;
  const remaining =
    fullNet !== null && target !== null && target > 0n
      ? target > fullNet
        ? target - fullNet
        : 0n
      : null;
  const average =
    commercial.length > 0 &&
    sales.net !== null &&
    tickets.value !== null &&
    tickets.value > 0n
      ? roundRatio(sales.net, tickets.value)
      : null;
  return {
    commercial,
    sales,
    complete,
    fullNet,
    target,
    targetKnown,
    tickets,
    average,
    remaining,
    footfall,
    pieces,
    conversion,
    piecesPerTicket,
    historical: rows.filter((r) => r.historical),
    confirmed: summarize(rows.filter((r) => r.state === "APPROVED")),
  };
}

/**
 * Decimal division rounded half-up to 2 places, returned as integer hundredths.
 * Callers may scale the numerator by 100n to represent a percentage.
 * Missing values or a zero denominator never become a numeric zero.
 */
export function ratioHundredths(numerator, denominator) {
  return numerator === null || denominator === null || denominator <= 0n
    ? null
    : roundRatio(numerator * 100n, denominator);
}
export function formatHundredths(value, suffix = "") {
  return value === null
    ? "No disponible"
    : (value / 100n).toString() + "." +
        (value % 100n).toString().padStart(2, "0") + suffix;
}
function daysInMonth(month) {
  if (typeof month !== "string" || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))
    return null;
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}
function eligibleDate(date, month) {
  const days = daysInMonth(month);
  if (days === null || typeof date !== "string" ||
      !/^20\d{2}-(0[1-9]|1[0-2])-\d{2}$/.test(date) ||
      !date.startsWith(month + "-")) return false;
  const day = Number(date.slice(-2));
  return day >= 1 && day <= days;
}
/**
 * Latest month-wide report date, across all branches.
 * Uses only current reportable OPS cuts: historic AppSheet reports do not set
 * the clock for an OPS-net forecast.
 */
export function commercialCutoffDate(rows, month) {
  let latest = null;
  for (const row of rows) {
    if (row.source_kind !== "OPS" || row.historical ||
        !REPORTABLE.has(row.state) || !eligibleDate(row.date, month)) continue;
    if (latest === null || row.date > latest) latest = row.date;
  }
  return latest;
}
/**
 * Finance commercial adaptation of the legacy Sheets method:
 * projected close = selected OPS net * natural days in month / last GLOBAL
 * reported calendar day, with half-up cent precision.
 *
 * Distinct-date observed daily rhythm is independent of this global divisor.
 * Both refuse incomplete / non-comparable selected populations. The calendar
 * coverage figure is diagnostic only; it does NOT certify operating days.
 */
export function commercialProjection(rows, targets, month, globalDate) {
  const metrics = commercialMetrics(rows, targets);
  const days = daysInMonth(month);
  const currentDate = commercialCutoffDate(rows, month);
  const validGlobalDate = eligibleDate(globalDate, month) ? globalDate : null;
  const reportedDates = new Set(metrics.commercial.map((row) => row.date)).size;
  const knownPopulation = metrics.commercial.length > 0 &&
    metrics.commercial.length === rows.length &&
    metrics.sales.net !== null;
  const cutoffDay = validGlobalDate === null ? null : Number(validGlobalDate.slice(-2));
  const globalContainsScope = currentDate === null || validGlobalDate === null ||
    currentDate <= validGlobalDate;
  const projectedNet = knownPopulation && globalContainsScope &&
    days !== null && cutoffDay !== null
    ? roundRatio(metrics.sales.net * BigInt(days), BigInt(cutoffDay))
    : null;
  const observedDaily = knownPopulation && reportedDates > 0
    ? roundRatio(metrics.sales.net, BigInt(reportedDates))
    : null;
  const countedPairs = new Set(metrics.commercial.map(
    (row) => row.branch_id + "|" + row.date,
  )).size;
  const expectedPairs = cutoffDay === null ? null : targets.length * cutoffDay;
  return {
    projectedNet,
    observedDaily,
    globalDate: validGlobalDate,
    scopedDate: currentDate,
    daysInMonth: days,
    cutoffDay,
    reportedDates,
    countedPairs,
    expectedPairs,
    dataComparable: knownPopulation,
  };
}
