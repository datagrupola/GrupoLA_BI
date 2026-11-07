# Finance → Grupo LA BI v1

Owner authorization: Misión 4, 7 November 2026. Finance is canonical. No Ops access, OTB changes or financial writes. All current BI portal users have read access through the existing signed session.

## Endpoint and credentials

`GET /api/integrations/bi/v1/commercial-cuts?month=YYYY-MM&branch=<optional UUID>` on Finance. HTTPS only in BI; redirects rejected. Dedicated 32-byte random bearer secret stored as `FINANCE_BI_READ_TOKEN` exclusively in Production server variables of both apps. BI also stores `FINANCE_BI_URL`. No database, service-role, cookie or personal data crosses to the browser. Token authenticates only this endpoint; it does not authenticate Finance user operations. Rotate both server variables together; remove the Finance variable to disable this integration. Do not log Authorization headers.

Finance uses `finance_bi_cut_read(date,uuid)`, a STABLE read-only projection, with fixed empty search_path and EXECUTE revoked from PUBLIC/anon/authenticated, granted only to existing service_role. It does not grant BI a database identity. Enabled Finance sources define the eligible La Rousse population. Invalid individual sources fail closed. One calendar month per request, matching operational dates, no date timezone conversion. No cache of authenticated financial responses.

## Response

`schema: finance-bi-cuts-v1`, `month`, `queried_at`, enabled `branches: [{id,name}]`, and `rows`. Each row contains only `cut_id, branch_id, date, state, revision_id, net_sales, net_basis, declared_total, cut_expenses, count:1, updated_at`. A cut appears once, through its current revision only. Monetary amounts are decimal strings or null; missing values never become zero. No photos, source raw bodies, audit, actor identities or expenses details are exposed. Response metadata retains sources with no cuts. Additional domains require a new explicit contract, not a general query interface.

## Financial semantics

- V3 Ops: net_sales must equal cash_system + terminal_total. credit_notes and bonuses increase declared income, never net sales. Authoritative existing receiver: migration `20261105230831_commercial_cut_credit_notes_bonuses.sql`.
- V2 Ops: derive net sales from cash_system + terminal_total, consistent with that definition and the v2 cash semantics. Do not blindly use income_total. Do not invent missing card breakdown or adjustments.
- AppSheet or unknown/incomplete declarations: net_sales=null, net_basis=UNAVAILABLE. Preserve reported declared total separately. Historical semantics are not rewritten.
- APPROVED alone contributes to confirmed sales. PENDING_REVIEW is provisional. CORRECTION_REQUESTED and HISTORICO_SIN_REVISAR are separate; other effective states are displayed separately, never treated as approved.
- BigInt cents in BI, PostgreSQL numeric in Finance. Coverage shown for each KPI/table group. An incomplete aggregate is “No disponible” with known subtotal, never a purported full KPI. No rows in an otherwise complete query represents zero cuts.
- Expenses are expenses recorded on cuts, not an asserted P&L cost measure.

## Validation and deployment

Local tests use fictional data. Production validation is SELECT-only: independent sums by operational date, state and branch for every current month, comparing counts, net and declared totals; individual-branch calls compared with all-source subsets. No financial rows changed.

Migration ledger version `20261107064012` was assigned by authenticated Supabase apply_migration. The unpublished candidate filename was aligned to that actual version before commit; SQL bytes unchanged. No migration repair or rewrite of published SQL.

Sequence: additive Finance SQL → server-only credential variables → Finance PR/Production and contract smoke → BI PR/Production → authenticated browser smoke. Branch previews disabled in BI vercel.json; Finance project already disables previews. No hosted QA created.

Contingency: restore previous BI frontend/Looker view if BI fails; disable dedicated integration credential if needed. Keep the additive function and ledger intact. Never restore financial data, revise approvals or remove history.

Acceptance: local Finance endpoint+SQL+auth regressions and adapter tests; BI authorization/precision/validation/build plus local Chrome 1280/390 px; independent production reconciliation; dedicated endpoint rejects missing/invalid token and write methods; authenticated BI browser loads, changes month/branch and keeps other dashboards intact.
