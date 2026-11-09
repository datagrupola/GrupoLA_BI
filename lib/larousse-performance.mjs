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
