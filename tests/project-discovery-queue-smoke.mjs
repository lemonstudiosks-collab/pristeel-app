import assert from 'node:assert/strict';
import { loadDiscoveryTools, authoritativeMatch } from '../scripts/project-discovery-queue.mjs';
import { loadIdentityTools } from '../scripts/project-email-reconcile.mjs';

const discovery=await loadDiscoveryTools();
const identity=await loadIdentityTools();

const projects=[
  {id:'p-airbus',name:'Airbus H24X — Halle 24X ModOps — Übergänge Ebene 1 & 2 [260784]',client:'Stacon GmbH & Co. KG',ref:'25007HH',business_ref:'25007HH',identity_aliases:['260784','260784_Airbus H24X_Anfrage Fertigung'],status:'humbur'},
  {id:'p-existing',name:'ITALIAN STYLE — BS Mrke 2 — Mega Totem 16m (Pumpa GM2)',client:'ITALIAN STYLE D.O.O.',ref:'PNR High Rise Single Column MID 16m',business_ref:'BS MRKE 2 - MEGA TOTEM 16m',identity_aliases:['Pumpa GM2'],status:'pritje'}
];
const index=identity.buildIndex(projects);
const base={to_emails:['sales@prissteel.com'],cc_emails:[],match_method:'server-ingest-unmatched-v1',match_confidence:0,needs_review:false,gmail_url:'https://mail.google.test/'};
const rows=[
  {...base,id:1,gmail_message_id:'m1',gmail_thread_id:'new-1',from_email:'buyer@acme.example',subject:'RFQ ACME-88421 Steel Platform',snippet:'Please quote fabrication and delivery. Drawing attached.',sent_at:'2026-08-15T08:00:00Z',direction:'incoming',has_attachments:true},
  {...base,id:2,gmail_message_id:'m2',gmail_thread_id:'new-1',from_email:'sales@prissteel.com',to_emails:['buyer@acme.example'],subject:'Re: RFQ ACME-88421 Steel Platform',snippet:'Thank you, we are reviewing the drawings.',sent_at:'2026-08-15T09:00:00Z',direction:'outgoing',has_attachments:false},
  {...base,id:3,gmail_message_id:'m3',gmail_thread_id:'airbus-1',from_email:'buyer@stacon.de',subject:'260784_Airbus H24X_Anfrage Fertigung',snippet:'Bitte um Angebot.',sent_at:'2026-08-15T10:00:00Z',direction:'incoming',has_attachments:true},
  {...base,id:4,gmail_message_id:'m4',gmail_thread_id:'cold-1',from_email:'sales@prissteel.com',to_emails:['hello@prospect.example'],subject:'Certified Steel Fabrication Cooperation Opportunity',snippet:'Introduction PRISTEEL',sent_at:'2026-08-15T11:00:00Z',direction:'outgoing',has_attachments:false},
  {...base,id:5,gmail_message_id:'m5',gmail_thread_id:'noise-1',from_email:'noreply@example.com',subject:'Delivery Status Notification',snippet:'automatic report',sent_at:'2026-08-15T12:00:00Z',direction:'incoming',has_attachments:false}
];

const candidates=discovery.buildCandidates(rows,[]);
assert(candidates.length>=2,'Expected one new RFQ cluster and one existing-project cluster');
assert(!candidates.some(c=>c.rows.some(r=>r.id===4)),'Cold outreach without reply/attachment must be excluded');
assert(!candidates.some(c=>c.rows.some(r=>r.id===5)),'System mail must be excluded');

const acme=candidates.find(c=>c.rows.some(r=>r.id===1));
assert(acme,'ACME RFQ candidate missing');
assert(acme.score>=80,'Two-way RFQ with attachment should be a strong discovery candidate');
const acmeMatch=authoritativeMatch(acme,index,identity);
assert.equal(acmeMatch.project,null,'Unknown ACME RFQ must not be forced into an existing project');

const airbus=candidates.find(c=>c.rows.some(r=>r.id===3));
assert(airbus,'Airbus candidate missing');
const airbusMatch=authoritativeMatch(airbus,index,identity);
assert.equal(airbusMatch.project?.id,'p-airbus','Alias 260784 must resolve to canonical Airbus/Halle project');
assert.equal(airbusMatch.score,100,'Strong existing-project identity should score 100');

console.log('Project Discovery queue smoke test passed.');
