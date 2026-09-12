import assert from 'node:assert/strict';
import { SOURCE_REGISTRY, isoDate, parseHeadingRecords, parseEbrd, parseUngm, parseEaas, normalizeRecord, classify, dedupe, filterActionable } from '../scripts/multilateral-procurement-core.mjs';

assert.equal(SOURCE_REGISTRY.length,8);
assert.deepEqual(SOURCE_REGISTRY.map(s=>s.key),['MCA_KOSOVO','KCF','RCF','EBRD_ECEPP','WORLD_BANK','UNGM','UNDP_KOSOVO','EU_OFFICE_KOSOVO']);
assert.equal(isoDate('5 August 2026'),'2026-08-05');
assert.equal(isoDate('30-Sep-2026'),'2026-09-30');
assert.equal(isoDate('22/12/2025 16:33'),'2025-12-22');

const kcf=SOURCE_REGISTRY.find(s=>s.key==='KCF');
const fixture=`<h6>Published 15 May 2026</h6><h4>Works - Procurement of Building Construction/Adaptation of VET infrastructure in Kosovo</h4><p>Beneficiary Institution: AKADEMIA TEMPULLI, Prishtine, Republic of Kosovo</p><p>Reference number: KCF/KOS/100004/W/2025/001/R</p><p>Opening date: 15 May 2026 / Closing date: 15 June 2026</p>`;
const parsed=parseHeadingRecords(fixture,kcf).find(r=>/Building Construction/.test(r.title));assert.ok(parsed);assert.equal(parsed.published_date,'2026-05-15');assert.equal(parsed.deadline,'2026-06-15');assert.equal(parsed.reference,'KCF/KOS/100004/W/2025/001/R');
const normalized=normalizeRecord(parsed,kcf,'2026-05-16T00:00:00Z');assert.equal(normalized.payload.sector,'construction_civil');assert.equal(normalized.payload.competition_mode,'Consortium/JV');assert.equal(normalized.payload.recommended_lane,'direct_tender');assert.ok(normalized.relevance_score>=80);

const bess=classify({title:'Design and Build of Utility Scale Battery Energy Storage Systems (BESS) and Transmission Connection Infrastructure',body:'works transmission substation',notice_phase:'opportunity'});assert.equal(bess.sector,'energy_electrical');assert.equal(bess.competition_mode,'Consortium/JV');
const steel=classify({title:'Fabrication and installation of structural steel platform',body:'steel structure and welding',notice_phase:'opportunity'});assert.equal(steel.category,'steel_structure');assert.equal(steel.competition_mode,'PriSteel + subcontractor/supplier');
const consulting=classify({title:'Consulting services for construction supervision',body:'Kosovo infrastructure project',contract_type:'Consultancy',notice_phase:'opportunity'});assert.equal(consulting.sector,'other');assert.ok(consulting.relevance_score<45);

const ebrd=parseEbrd(`<h1>Kosovo: Reconstruction</h1><div>Country: | Kosovo</div><div>Client Name: | Municipality of Pristina</div><div>ECEPP ID: | 36972883</div><div>Procurement Exercise Name: | Reconstruction of public buildings to improve energy efficiency</div><div>Type of Procurement: | Works</div><div>Procurement Method: | Open Tender Single Stage</div><div>Notice Type: | Invitation For Tenders Single</div><div>Publication Date: | 06/05/2026 11:15</div><div>Closing Date: | 06/07/2026 14:00</div>`,SOURCE_REGISTRY.find(s=>s.key==='EBRD_ECEPP'));assert.equal(ebrd.reference,'36972883');assert.equal(ebrd.authority,'Municipality of Pristina');assert.equal(ebrd.deadline,'2026-07-06');
const ungm=parseUngm(`<h1>RFQ Supply and installation of solar equipment</h1><h3>UNDP</h3><div>Reference: UNDP-KOS-00599</div><div>Beneficiary countries or territories: Kosovo</div><div>Published on: 17-Aug-2026</div><div>Deadline on: 30-Sep-2026 11:30</div>`,SOURCE_REGISTRY.find(s=>s.key==='UNGM'));assert.equal(ungm.reference,'UNDP-KOS-00599');assert.equal(ungm.authority,'UNDP');assert.equal(ungm.deadline,'2026-09-30');
const eeas=parseEaas(`<h1>Tender for supply and installation of electrical equipment in Kosovo</h1><div>10.08.2026</div><p>Publication reference: EUOK/2026/001</p><p>Deadline to express your interest: 24 August 2026</p><p>European Union Office in Kosovo</p>`,SOURCE_REGISTRY.find(s=>s.key==='EU_OFFICE_KOSOVO'));assert.equal(eeas.reference,'EUOK/2026/001');assert.equal(eeas.deadline,'2026-08-24');

const u1=normalizeRecord({title:'Construction of municipal facility',body:'Kosovo civil works',authority:'UNDP',reference:'UNDP-KOS-999',published_date:'2026-09-01',deadline:'2026-10-01',notice_phase:'opportunity'},SOURCE_REGISTRY.find(s=>s.key==='UNDP_KOSOVO'),'2026-09-01T00:00:00Z');
const u2=normalizeRecord({title:'Construction of municipal facility',body:'Kosovo civil works',authority:'UNDP',reference:'UNDP-KOS-999',published_date:'2026-09-01',deadline:'2026-10-01',notice_phase:'opportunity'},SOURCE_REGISTRY.find(s=>s.key==='UNGM'),'2026-09-01T00:00:00Z');
const d=dedupe([u1,u2]);assert.equal(d.length,1);assert.equal(d[0].payload.source,'UNGM');assert.ok(d[0].payload.provenance.length>=2);
assert.equal(filterActionable([normalized],{today:new Date('2026-05-20T00:00:00Z'),minScore:45,recentDays:120}).length,1);
console.log('multilateral procurement sync smoke: ok');