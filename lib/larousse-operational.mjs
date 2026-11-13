export const OPERATIONAL_SCHEMA = "ops-bi-operational-v1";
export const LAROUSSE_BRANCH_NAMES = [
  "CAMELINAS", "CENTRO", "DEL_RIO", "GRAN_P_LEON",
  "LAZARO", "PEPSI", "PONIENTE", "BBVA",
];
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
const MONTH = /^20\d{2}-(0[1-9]|1[0-2])$/;
const fieldsCycle = [
  "missed_cycles", "on_time_cycles", "not_applicable_cycles",
  "unknown_cycles", "missed_tasks",
];
const fieldsActivity = ["assigned", "approved", "reopened"];
const integer = (value) => Number.isSafeInteger(value) && value >= 0;

export function validateOperational(payload, month, branch = "") {
  if (!MONTH.test(month) || payload?.schema !== OPERATIONAL_SCHEMA ||
      payload.month !== month || !Number.isFinite(Date.parse(payload.queried_at)) ||
      !Array.isArray(payload.branches) ||
      !Array.isArray(payload.incident_daily) ||
      !Array.isArray(payload.task_cycle_daily) ||
      !Array.isArray(payload.task_monthly) ||
      !Array.isArray(payload.task_activity_daily))
    throw Error("INVALID_OPERATIONAL_CONTRACT");

  if (!(branch ? [1] : [7, 8]).includes(payload.branches.length))
    throw Error("INVALID_OPERATIONAL_CATALOG");
  const ids = new Set(), names = new Set();
  for (const b of payload.branches) {
    if (typeof b?.id !== "string" || !UUID.test(b.id) ||
        !LAROUSSE_BRANCH_NAMES.includes(b.name) || ids.has(b.id) ||
        names.has(b.name) || (branch && b.id !== branch))
      throw Error("INVALID_OPERATIONAL_CATALOG");
    ids.add(b.id);
    names.add(b.name);
  }
  if (!branch) {
    const expectedNames = payload.branches.length === 8
      ? LAROUSSE_BRANCH_NAMES
      : LAROUSSE_BRANCH_NAMES.filter((name) => name !== "BBVA");
    if (names.size !== expectedNames.length || expectedNames.some((name) => !names.has(name)))
      throw Error("INVALID_OPERATIONAL_CATALOG");
  }

  const validDate = (date) => {
    if (typeof date !== "string" || !/^20\d{2}-(0[1-9]|1[0-2])-\d{2}$/.test(date) ||
        !date.startsWith(month + "-") || !Number.isFinite(Date.parse(date + "T00:00:00Z")) ||
        new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date)
      throw Error("INVALID_OPERATIONAL_DATE");
  };
  const rows = (name, keys, metricKeys, check) => {
    const seen = new Set();
    if (payload[name].length > 20000) throw Error("INVALID_OPERATIONAL_SIZE");
    return payload[name].map((row) => {
      if (!row || !ids.has(row.branch_id))
        throw Error("INVALID_OPERATIONAL_SOURCE");
      if (keys.includes("date")) validDate(row.date);
      if (keys.includes("type") &&
          (typeof row.type !== "string" || !/^[A-Z][A-Z0-9_]{0,79}$/.test(row.type)))
        throw Error("INVALID_OPERATIONAL_TYPE");
      const key = keys.map((field) => row[field]).join("|");
      if (seen.has(key)) throw Error("DUPLICATE_OPERATIONAL_ROW");
      seen.add(key);
      for (const field of metricKeys) {
        if (!integer(row[field])) throw Error("INVALID_OPERATIONAL_METRIC");
      }
      if (check) check(row);
      return row;
    });
  };
  const incident_daily = rows("incident_daily", ["branch_id", "date", "type"], ["count"]);
  const task_cycle_daily = rows("task_cycle_daily", ["branch_id", "date"], fieldsCycle,
    (r) => { if (r.missed_tasks > r.missed_cycles) throw Error("INVALID_OPERATIONAL_METRIC"); });
  const task_monthly = rows("task_monthly", ["branch_id"], fieldsCycle,
    (r) => { if (r.missed_tasks > r.missed_cycles) throw Error("INVALID_OPERATIONAL_METRIC"); });
  const task_activity_daily = rows("task_activity_daily", ["branch_id", "date"], fieldsActivity);
  if (task_monthly.length !== ids.size) throw Error("INVALID_OPERATIONAL_COVERAGE");

  // Every monthly cycle total must equal the sum of its daily values. Unlike
  // cycles, distinct missed tasks cannot be summed across days.
  for (const monthly of task_monthly) {
    const daily = task_cycle_daily.filter((row) => row.branch_id === monthly.branch_id);
    for (const key of fieldsCycle.filter((key) => key !== "missed_tasks")) {
      const sum = daily.reduce((total, row) => total + row[key], 0);
      if (!Number.isSafeInteger(sum) || sum !== monthly[key])
        throw Error("INVALID_OPERATIONAL_TOTAL");
    }
    if (monthly.missed_tasks > daily.reduce((sum, row) => sum + row.missed_tasks, 0))
      throw Error("INVALID_OPERATIONAL_TOTAL");
  }
  return {
    schema: OPERATIONAL_SCHEMA, month, queried_at: payload.queried_at,
    branches: payload.branches, incident_daily, task_cycle_daily,
    task_monthly, task_activity_daily,
  };
}

export function operationalMetrics(data) {
  const count = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
  const incidents = count(data.incident_daily, "count");
  const missedTasks = count(data.task_monthly, "missed_tasks");
  const missedCycles = count(data.task_monthly, "missed_cycles");
  const onTime = count(data.task_monthly, "on_time_cycles");
  const unknown = count(data.task_monthly, "unknown_cycles");
  return {
    incidents, missedTasks, missedCycles, onTime, unknown,
    assigned: count(data.task_activity_daily, "assigned"),
    approved: count(data.task_activity_daily, "approved"),
    reopened: count(data.task_activity_daily, "reopened"),
    onTimeRate: unknown || !(onTime + missedCycles)
      ? null : (onTime / (onTime + missedCycles)) * 100,
  };
}
