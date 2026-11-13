import { test } from "node:test";
import assert from "node:assert/strict";
import { commercialMetrics, percent, validateCommercial, commercialProjection } from "../lib/larousse-commercial.mjs";
const bbva = "137ca756-6535-40f6-867d-b1df46c3f52f";
const names = ["BBVA", "CAMELINAS", "CENTRO", "DEL_RIO", "GRAN_P_LEON", "LAZARO", "PEPSI", "PONIENTE"];
const branches = names.map((name, i) => ({ name, id: i === 0 ? bbva : `bbcc0000-0000-4000-8000-${String(i).padStart(12,"0")}` }));
const row = (b, i) => ({ branch_id:b.id, cut_id:`cut-${i}`,revision_id:`revision-${i}`,date:"2026-11-12",state:"APPROVED",net_sales:"100.10",declared_total:"120.20",cut_expenses:"0.00",net_basis:"EXPLICIT_VERIFIED",count:1,source_kind:"OPS",historical:false,tickets:"2",footfall:"4",pieces:"6" });
const fixture = () => ({schema:"finance-bi-commercial-v2",month:"2026-11",queried_at:"2026-11-13T18:00:00Z",branches,rows:branches.map(row),targets:branches.map((b,i)=>({branch_id:b.id,amount:i===0?null:"200.20",updated_at:null}))});
test("eight sources preserve all known amounts while BBVA missing goal makes consolidated compliance unavailable", () => {
 const data=validateCommercial(fixture(),"2026-11",""); const all=commercialMetrics(data.rows,data.targets);
 assert.equal(all.sales.net,80080n); assert.equal(all.sales.declared,96160n);assert.equal(all.target,null);assert.equal(all.targetKnown,7);assert.equal(all.fullNet,80080n); assert.equal(percent(all.fullNet,all.target),"No disponible");assert.equal(all.remaining,null);
 const b=commercialMetrics(data.rows.filter(r=>r.branch_id===bbva),data.targets.filter(t=>t.branch_id===bbva));
 assert.equal(b.sales.net,10010n);assert.equal(b.target,null);assert.equal(b.remaining,null);assert.equal(b.average,5005n);
 for(const branch of branches.slice(1)) {const m=commercialMetrics(data.rows.filter(r=>r.branch_id===branch.id),data.targets.filter(t=>t.branch_id===branch.id));assert.equal(m.target,20020n);assert.equal(m.sales.net,10010n);assert.equal(percent(m.fullNet,m.target),"50.00%");}
 const legacy=commercialMetrics(data.rows.filter(r=>r.branch_id!==bbva),data.targets.filter(t=>t.branch_id!==bbva));assert.equal(legacy.target,140140n);assert.equal(legacy.fullNet,70070n);assert.equal(percent(legacy.fullNet,legacy.target),"50.00%");
 assert.equal(commercialProjection(data.rows,data.targets,"2026-11","2026-11-12").projectedNet,200200n);
});
test("enabled BBVA without cuts keeps null goal and known seven-branch sales; historical empty period fabricates neither sales nor compliance", () => {
 const p=fixture();p.rows=p.rows.filter(r=>r.branch_id!==bbva);const d=validateCommercial(p,"2026-11","");const m=commercialMetrics(d.rows,d.targets);assert.equal(m.sales.knownNet,70070n);assert.equal(m.complete,false);assert.equal(m.fullNet,null);assert.equal(m.target,null);
 const empty=commercialMetrics([],d.targets.filter(t=>t.branch_id===bbva));assert.equal(empty.sales.known,0);assert.equal(empty.fullNet,null);assert.equal(empty.target,null);assert.equal(percent(empty.fullNet,empty.target),"No disponible");assert.equal(commercialProjection([],d.targets,"2026-10",null).projectedNet,null);
});
test("BBVA commercial scoped response, missing target records and duplicate facts retain strict contract checks", () => {
 const p=fixture();p.rows=p.rows.filter(r=>r.branch_id===bbva);p.targets=p.targets.filter(t=>t.branch_id===bbva);assert.equal(validateCommercial(p,"2026-11",bbva).rows.length,1);
 const missing=fixture();missing.targets.pop();assert.throws(()=>validateCommercial(missing,"2026-11",""),/COVERAGE/);
 const duplicate=fixture();duplicate.rows.push({...duplicate.rows[0]});assert.throws(()=>validateCommercial(duplicate,"2026-11",""),/ROW/);
 const targets=fixture();targets.targets[1]={...targets.targets[0]};assert.throws(()=>validateCommercial(targets,"2026-11",""),/TARGET/);
});
