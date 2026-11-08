# Looker La Rousse → native BI commercial V2

Read-only inspection: original report 055e6005-5133-498d-8a93-4960dbc60f1b, page aSIvF, Analisis mensual, 7 November 2026, Chrome existing authorized session. No report editing. Filters observed: date range and seven branch checkboxes. Other pages: weekly analysis, purchases, data entry; these are outside scope. Private screenshot retained outside Git.

| Looker visible indicator | Native V2 treatment | Definition / limitation |
|---|---|---|
| Venta acumulada | Main net commercial amount | Canonical Finance definition; reported commercial cohort, coverage visible |
| Meta mensual | Main monthly goal | Existing Finance branch-month targets, complete selected scope |
| Avance de venta | Main achievement + remaining | Owner formulas, only comparable population and complete goal |
| Ticket promedio; Tickets acumulados | Main average + ticket count | Same commercial cut population for numerator and denominator |
| Ventas diarias | Commercial daily chart + exact table | Operational date, one current revision per cut; missing amounts shown unavailable |
| Ranking de resultados; Venta por sucursal | Branch performance table | Net, target, achievement, remaining, share and cut coverage; partial ranking clearly identified |
| Afluencia acumulada; Piezas por ticket | Commercial footfall and pieces | Original counts exposed; a derived pieces/ticket KPI is not asserted without a separately accredited definition |
| Conversion y afluencia; Tasa de conversión | Counts retained; ratio deferred | Internal Looker conversion definition not inspectable from reading view |
| Proyección del mes; Ritmo diario | Projection deferred | Operating-day calendar, projection method and eligible reporting dates not accredited; do not invent |
| Tiendas iguales / totales 2025 | Deferred | No comparable Finance 2025 cohort supplied in current contract |
| Métodos de pago | Deferred | Historical card splits are not complete; not required by this mission's minimum V2 scope |
| Ventas por m²; Meta de afluencia | Deferred | Floor area/footfall goals are not in the approved Finance read contract |
| Cortes faltantes | Not inferred | Needs authoritative expected-cut calendar; audit-state counts remain a compact period-specific footer |

The native baseline at BI 4213c40 already prioritizes reported commercial sales, but its contract does not include goals or activity. V2 removes that unavailable-contract notice and fills the six priority KPIs, followed by daily/branch performance, operations, historical information and only then Finance audit.

## Historical information and legacy comparison

Finance read-only inspection finds 188 AppSheet historical current revisions. Tickets/footfall/pieces are syntactically valid in all 188. In five, cash_system + terminal_total differs from the saved income_total; even the other 183 equalities do not independently establish net-sales equivalence. V2 keeps reported historical declared totals and activity visible by branch, without manufacturing net sales, a historical ticket average or monthly achievement over a mixed population.

The Looker page currently displays a limited population (one branch/day in its daily table) with zero goals despite Finance having seven configured goals in each observed month. Its internal calculated fields and full source lineage were not verified from the read view. Accordingly, equality of numeric KPIs with Looker is NOT asserted. Recovery concerns the commercial functions; financial acceptance uses independently reconciled Finance data, never adjustment of real records to match Looker.

Month/scope, historical provenance and report coverage differ visibly. Historic declared amounts are not relabeled net; all imported values remain immutable. No Looker, other BI view, Ops or Finance financial rules are changed.
