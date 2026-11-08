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
    tickets = sumUnits(commercial, "tickets");
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
    footfall: sumUnits(commercial, "footfall"),
    pieces: sumUnits(commercial, "pieces"),
    historical: rows.filter((r) => r.historical),
    confirmed: summarize(rows.filter((r) => r.state === "APPROVED")),
  };
}
