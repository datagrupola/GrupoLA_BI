import { sessionConfig, verifySessionToken } from "../../../../lib/auth";
import { validateOperational } from "../../../../lib/larousse-operational.mjs";

export const dynamic = "force-dynamic";

const MONTH = /^20\d{2}-(0[1-9]|1[0-2])$/;
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;

export async function GET(request) {
  const reply = (data, status = 200) => Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });

  const cookie = request.cookies?.get(sessionConfig.cookieName)?.value;
  if (!process.env.SESSION_SECRET || !cookie ||
      !await verifySessionToken(cookie, process.env.SESSION_SECRET))
    return reply({ error: "Sesión requerida" }, 401);

  const url = new URL(request.url);
  const keys = new Set(["month", "branch"]);
  const month = url.searchParams.get("month");
  const branch = url.searchParams.get("branch");
  if ([...url.searchParams.keys()].some((key) =>
      !keys.has(key) || url.searchParams.getAll(key).length !== 1) ||
      !MONTH.test(month || "") || (branch !== null && !UUID.test(branch)))
    return reply({ error: "Filtros inválidos" }, 400);

  try {
    const base = new URL(process.env.OPS_BI_URL);
    if (base.protocol !== "https:" || base.username || base.password ||
        base.search || base.hash ||
        base.pathname !== "/api/integrations/bi/v1/operational")
      throw Error("INVALID_UPSTREAM_URL");
    if (!/^[a-f0-9]{64}$/.test(process.env.OPS_BI_READ_TOKEN || ""))
      throw Error("MISSING_READ_CREDENTIAL");

    base.searchParams.set("month", month);
    if (branch) base.searchParams.set("branch", branch);
    const upstream = await fetch(base, {
      headers: { Authorization: "Bearer " + process.env.OPS_BI_READ_TOKEN },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) throw Error("UPSTREAM_UNAVAILABLE");
    return reply(validateOperational(await upstream.json(), month, branch || ""));
  } catch {
    return reply({ error: "No fue posible consultar Ops. Reintenta." }, 502);
  }
}
