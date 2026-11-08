# Finance → Grupo LA BI: commercial V2 candidate

Status: CANDIDATE. Owner's La Rousse BI V2 mission authorizes preparation and direct BI release only AFTER specific approval of the new Finance production SQL and a focused audit. No new SQL, backend deployment or BI deployment has been executed by this candidate task. V1 remains operational.

## Identity and backwards compatibility

Finance base: a3a09847186605d837d6121d3ec0c7106f1b8655. BI base: 4213c402fb3beece2af92499dc7416b02212429b (PR #6 included). Existing commercial population in that BI base is APPROVED + PENDING_REVIEW + CORRECTION_REQUESTED; V2 preserves it, excluding historical provenance. These are reported commercial sales, not all confirmed by Finance.

Existing HTTPS GET `/api/integrations/bi/v1/commercial-cuts?month=YYYY-MM&branch=<optional UUID>` remains V1 by default. Explicit `version=2` invokes `finance_bi_commercial_read(date,uuid)`, returning schema `finance-bi-commercial-v2`. Other version strings, duplicate parameters and unknown parameters are rejected. Credentials, read-only method, timing-safe dedicated bearer check, session validation in BI, private/no-store and redirect/timeout protections remain unchanged. No new credentials, roles or configuration changes are required.

## SQL and privileges for owner review

Candidate: `supabase/migrations/20261107104925_finance_bi_commercial_v2.sql`.

Creates exactly ONE new STABLE SECURITY DEFINER function with fixed empty search_path. EXECUTE revoked from PUBLIC, anon and authenticated; granted only to existing service_role. It performs SELECTs through V1 and Finance receipts/sources/monthly targets. It adds no tables, policies, indexes, writes or grants on existing data. No existing function, approval rule, historical SQL or ledger attestation is modified. BI never receives service_role or direct database credentials.

V1's body/schema/ACL and all 18 existing migration files are preserved. V2 calls the existing V1 projection under the same statement snapshot; enrichment joins current revision AND cut ID. Targets join branch and exact calendar month using the existing unique key. Branch purpose/enablement and month bounds are enforced by V1; targets use the same enabled scope. Sources without cuts remain in the catalog and target coverage, with null rather than zero for missing targets.

## V2 fields

All V1 row fields remain: cut/revision/branch/date/state, decimal-string net_sales/declared_total/cut_expenses, net_basis, count=1, update timestamp. New per-row fields: source_kind (OPS/APPSHEET/null), historical boolean, tickets/footfall/pieces (unsigned integer strings or null). New `targets`: one `{branch_id, amount, updated_at}` for each selected enabled source; amount decimal string or null. No names of people, raw declaration bodies, photos or audit data.

BI validates V1's identity/duplicates/per-period/per-branch rules, exact target coverage with no additions or duplicates, provenance consistency and activity types. It normalizes only allowlisted fields.

## Commercial definitions and coverage

- Net definition is unchanged from V1: v2 Ops cash_system + terminal_total; v3 explicit net verified against those components. Credit notes and bonuses never inflate net sales.
- Main commercial population: nonhistorical OPS current revisions in the three reportable states above. The header explicitly labels these as reported, not all Finance-confirmed.
- Historical origin remains distinct even if its Finance state later changes. No inference of net sales from equality of amounts alone. Retain original declared historical totals, tickets, footfall and pieces in a separate table; do not backfill or alter receipts.
- Sale coverage means recorded cuts received in Finance, not an assertion about all required operating days; the contract does not contain an expected-cut calendar.
- Main amount is an explicitly labeled available subtotal when any selected record is historical, unclassified or lacks net sales. Month-wide achievement/remaining/share are unavailable if this population is not comparable, if a selected branch has no commercial reports, or if a target is missing. Never silently treat a no-report branch as zero sales.
- Total goal requires every selected source's goal. No proration or invented goals.
- Achievement = net / target ×100. Remaining = max(target-net,0). Positive target required; ratio otherwise unavailable. Branch shares use the same selected population and denominator; incomplete overall populations have no published shares.
- Average ticket = net from the commercial population / tickets from EXACTLY those same cuts; unavailable if either field is missing on any commercial cut or total tickets=0. Historical tickets never enter this denominator. It is labeled commercial, with cut coverage, even when other historical records exist for the month.
- Afluencia/pieces and tickets are reported separately for commercial and historical populations. Finance approval does not silently change membership of the commercial cohort. Finance-confirmed amount and approval states are a compact footer only.
- Decimal money uses PostgreSQL numeric and JavaScript BigInt cents. Average rounds half-up to cents; percentages half-up to two decimals. Floating point is used only for bounded chart dimensions.

## Focused verification and release boundary

Local fictional PostgreSQL-compatible/PGlite tests cover actual V1+V2 SQL, effective anon/authenticated denial/service_role access, target scope/absence, source without cuts, latest revisions, null/provenance and V1 equality. BI tests cover precision, same-population average, missing data, zero denominators, targets without reports and response validation; server API tests retain session checks for both versions.

Production checks are SELECT-only. Candidate inputs are composed locally from V1, current receipt activity and targets and compared with independent native SQL aggregates for both observed periods and each of seven branches plus all sources. This is NOT hosted execution of the candidate RPC. No real records are copied into a local test database.

A developer's focused technical review is not an independent audit. Owner/ORQ must obtain that audit on the exact PR SHA, then explicitly authorize this SQL/privilege delta before execution. No automatic migration, merge or deployment is permitted by this candidate.

Sequence after that authorization: revalidate HEADs/ledger (currently 18); exact-project dry-run showing only candidate; apply the immutable version forward-only; verify body/ACL and ledger=19, compare V1 and V2; publish Finance endpoint version negotiation; smoke V1+V2 real HTTPS; merge/deploy BI and authenticated month/branch smoke, compare amounts/goals; verify aliases. Stop on mismatches. No hosted QA or Preview required/authorized.

Contingency: keep V1 endpoint and SQL intact; revert BI frontend through previous release or omit version=2 if new integration is unavailable. Do not delete tables/functions/history, repair ledger, alter receipts or change approvals. New independent function may remain dormant safely. No Ops, OTB or other dashboards change.
