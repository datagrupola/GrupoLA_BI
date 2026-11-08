# BI V2 focused review / audit handoff

This is the developer's verification checklist, NOT an independent audit and NOT permission to migrate Production. Owner/ORQ must obtain the focused independent result against the exact candidate SHA before approving the new SQL.

| Area | Developer verification | Independent focus |
|---|---|---|
| SQL scope | One new STABLE SELECT-only function, fixed search_path, existing V1 projection reused | Inspect full new SQL and every dependency; no hidden DML or general query path |
| Effective privileges | Local real SET ROLE anon/authenticated denied, service_role succeeds; direct table writes denied | Verify PUBLIC revoke, inherited privileges, service boundary and branch filter |
| Compatibility | Local V1 before/after extension produces identical business data; default HTTP request stays V1 | Review version negotiation and immutable 18 prior SQLs |
| Snapshot/current revision | Function STABLE; joins current V1 revision AND cut ID; target unique branch+month | No duplication, cross-scope or mixed revisions |
| Data integrity | BI rejects duplicate targets/cuts/revisions, missing target coverage, invalid money/counts/provenance | Adversarial unknown-source and malformed-response examples |
| Financial population | Existing three reportable states preserved; historical provenance independent of approval | No mixed-population ticket average; unknown net is not zero |
| Targets/calculations | BigInt exact cents, half-up average/percentage; no ratio if missing target/history/no-report source | Check all branch/global denominators, zero, partial and above-goal cases |
| Historical data | Declared values + activity retained separately; no backfill or manufactured net | Do not accredit the 183 numerically equal historical rows solely by equality |
| Authentication | Existing BI signed session revalidated; dedicated server credential unchanged; no new browser secret | Tests for old/new endpoint versions and unauthorized/invalid requests |
| UI/release | Six commercial KPIs first, historical data visible, approval counts/confirmed amount only small footer | Read actual desktop/mobile screenshots; no hosted V2 release before SQL authorization |

Independent production-input reconciliation is SELECT-only over two months and all + seven individual branch scopes. It is not execution of the candidate function on hosted PostgreSQL. Hosted V2 transport/schema cache/smoke remain pending the explicit migration authorization. Current Production keeps V1, 18 migrations, and no candidate function.

No changes to Ops, other BI views, OTB, existing Auth settings/credentials, targets or approvals. No GitHub main write, merge, hosted deployment, QA or Preview is part of this handoff.
