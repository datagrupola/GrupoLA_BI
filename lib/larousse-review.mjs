// Presentation-only summary for the Finance cuts review bar.
// Only current, reportable OPS cuts are counted; AppSheet and historic
// records must never influence the commercial review distribution.
export function reviewCutCounts(rows) {
  let approved = 0;
  let pending = 0;
  let correction = 0;

  for (const row of rows) {
    if (row?.source_kind !== "OPS" || row.historical !== false) continue;
    if (row.state === "APPROVED") approved++;
    else if (row.state === "PENDING_REVIEW") pending++;
    else if (row.state === "CORRECTION_REQUESTED") correction++;
  }

  const awaiting = pending + correction;
  const total = approved + awaiting;
  const approvedTenths = total ? Math.round((approved * 1000) / total) : 0;

  return {
    approved,
    pending,
    correction,
    awaiting,
    total,
    approvedPercent: approvedTenths / 10,
    awaitingPercent: total ? (1000 - approvedTenths) / 10 : 0,
  };
}
