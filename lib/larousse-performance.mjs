/**
 * Background tier for projected close versus branch target.
 * This is only presentation logic; it does not recalculate financial metrics.
 * Never interpret missing projection, absent goal or zero goal as 0% compliance.
 */
export function projectedPerformanceTier(projectedNet, goal) {
  if (typeof projectedNet !== "bigint" || typeof goal !== "bigint" ||
      goal <= 0n || projectedNet < 0n) return null;
  if (projectedNet >= goal) return "high"; // >= 100% projected
  if (projectedNet * 5n >= goal * 4n) return "medium"; // >= 80% and < 100%
  return "low"; // < 80%
}


/**
 * Sort branch ranking by the exact projected-close / goal ratio, descending.
 * Cross-multiplication with BigInt avoids rounding and floating-point errors.
 * Missing/invalid projections or goals always rank after valid branches.
 */
export function compareProjectedCompliance(a, b) {
  const projectedA = a?.projection?.projectedNet;
  const goalA = a?.m?.target;
  const projectedB = b?.projection?.projectedNet;
  const goalB = b?.m?.target;
  const validA = typeof projectedA === "bigint" && projectedA >= 0n &&
    typeof goalA === "bigint" && goalA > 0n;
  const validB = typeof projectedB === "bigint" && projectedB >= 0n &&
    typeof goalB === "bigint" && goalB > 0n;
  if (validA !== validB) return validA ? -1 : 1;
  if (validA && validB) {
    const left = projectedA * goalB;
    const right = projectedB * goalA;
    if (left !== right) return left > right ? -1 : 1;
  }
  return String(a?.name || "").localeCompare(String(b?.name || ""), "es-MX") ||
    String(a?.id || "").localeCompare(String(b?.id || ""), "es-MX");
}
