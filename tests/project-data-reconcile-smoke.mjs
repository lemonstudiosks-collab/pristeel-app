import assert from 'node:assert/strict';
import fs from 'node:fs';
import { projectProfile,planProjectRelation,offerFieldPatch,planOfferFieldRepairs } from '../scripts/project-data-reconcile.mjs';

const source=fs.readFileSync('scripts/project-data-reconcile.mjs','utf8');
assert(source.includes("process.env.APPLY||'false'"),'Reconciliation must default to preview, never apply');
assert(!source.includes("process.env.APPLY || 'true'"),'Unsafe APPLY=true default must never return');

const p8910=projectProfile({id:'p8910',name:'EVOSYS Laser — ANF-8910',client:'EVOSYS',ref:'ANF 8910'});
const p8915=projectProfile({id:'p8915',name:'EVOSYS Laser — ANF-8915',client:'EVOSYS',ref:'ANF 8915'});
const projects=[p8910,p8915];
const valid=new Set(projects.map(p=>p.id));

let plan=planProjectRelation({id:'r1',project_id:null,project_ref:'ANF 8915',file_name:'ANF-8915 Anfrage Schweissgestell 03829.pdf'},projects,valid);
assert.equal(plan.kind,'repair','Exact dedicated project reference should be a deterministic repair candidate');
assert.equal(plan.best.project.id,'p8915');
assert(plan.best.score>=960);
assert(plan.margin>=150);

plan=planProjectRelation({id:'r2',project_id:null,title:'EVOSYS Laser documents'},projects,valid);
assert.equal(plan.kind,'unresolved','Company/general wording must not auto-assign between sibling projects');

plan=planProjectRelation({id:'r3',project_id:'p8910',project_ref:'ANF 8915',file_name:'ANF-8915.pdf'},projects,valid);
assert.equal(plan.kind,'conflict','Strong evidence against an existing valid link must be reported, never overwritten');
assert.equal(plan.current,'p8910');

const explicit={id:'o1',qty_kg:null,transport_eur:null,notes:'qty_kg: 81 400\ntransport_eur: 15200'};
assert.deepEqual(offerFieldPatch(explicit),{qty_kg:81400,transport_eur:15200});

const natural={id:'o2',qty_kg:null,transport_eur:null,notes:'Transport: 4 kamione x 3.800 EUR = 15.200 EUR. 81,400 kg material.'};
assert.deepEqual(offerFieldPatch(natural),{},'Natural-language transport/quantity must not be auto-parsed');

const existing={id:'o3',qty_kg:516,transport_eur:500,notes:'qty_kg: 81400\ntransport_eur: 15200'};
assert.deepEqual(offerFieldPatch(existing),{},'Existing structured values must never be overwritten');

const decimal={id:'o4',qty_kg:null,transport_eur:null,notes:'transport_eur: 15200,50'};
assert.deepEqual(offerFieldPatch(decimal),{transport_eur:15200.5});

const ambiguous={id:'o5',qty_kg:null,transport_eur:null,notes:'transport_eur: 15.200'};
const fields=planOfferFieldRepairs([explicit,natural,existing,decimal,ambiguous]);
assert(fields.candidates.some(x=>x.id==='o1'&&x.patch.qty_kg===81400&&x.patch.transport_eur===15200));
assert(fields.candidates.some(x=>x.id==='o4'&&x.patch.transport_eur===15200.5));
assert(fields.ambiguous.some(x=>x.id==='o5'),'Locale-ambiguous 15.200 must require review, not auto-apply');
assert(!fields.candidates.some(x=>x.id==='o2'),'Natural-language offer must remain out of deterministic apply');

console.log('Project data reconciliation safety smoke test passed.');
