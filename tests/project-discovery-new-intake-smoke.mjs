import assert from 'node:assert/strict';
import { loadDiscoveryTools, authoritativeMatch } from '../scripts/project-discovery-queue.mjs';
import { loadIdentityTools } from '../scripts/project-email-reconcile.mjs';

const tools=await loadDiscoveryTools('pristeel-project-discovery.js');
const existing=[{
  id:'cfedfdb6-3877-450e-917e-bddd76439096',
  name:'SSP - Smart City Camera Poles (46 qytete)',
  client:'SSP SHPK / Presight AI / MIA Albania',
  ref:'',business_ref:'Smart City Camera Poles',identity_aliases:[],status:'pritje',pipeline_stage:'supplier_selection'
}];

const rows=[
  {
    id:101,gmail_message_id:'1a0328ce9f006a82',gmail_thread_id:'thread-lakes',
    from_email:'shpend.kusari@fivainvestment.com',to_emails:['sales@prissteel.com'],cc_emails:['varis.mehmeti@sspfz.com'],
    subject:'Projekti i shtyllave te liqeneve',
    snippet:'Microsoft Teams meeting. Meeting ID: 316548692826444. Passcode 1234.',
    sent_at:'2026-08-23T08:00:00Z',direction:'incoming',has_attachments:false,match_method:'server-ingest-unmatched-v1'
  },
  {
    id:102,gmail_message_id:'1a033bf92671dcfc',gmail_thread_id:'thread-scope',
    from_email:'shpend.kusari@fivainvestment.com',to_emails:['sales@prissteel.com'],cc_emails:['varis.mehmeti@sspfz.com'],
    subject:'FW: Project Scope',
    snippet:'Following our meeting, please find attached the Scope of Work for steel poles 6 m, 9 m and 12 m, foundations, galvanization and siren mounting.',
    sent_at:'2026-08-23T17:00:00Z',direction:'incoming',has_attachments:true,match_method:'server-ingest-unmatched-v1'
  }
];

assert.equal(tools.projectSignal(rows[0]).ref,'','Teams Meeting ID must never become a project reference');
assert.equal(tools.projectSignal(rows[1]).ref,'','Project Scope is a project signal, not a project reference');
assert(tools.projectSignal(rows[1]).score>=60,'Project Scope + attachment + incoming should be a strong project signal');

const candidates=tools.buildCandidates(rows,existing);
assert.equal(candidates.length,1,'two cross-thread SSP/Fiva continuation emails must become one candidate');
const c=candidates[0];
assert.equal(c.rows.length,2,'both Gmail messages must be preserved as candidate evidence');
assert.deepEqual([...c.rows.map(x=>x.gmail_message_id)].sort(),['1a0328ce9f006a82','1a033bf92671dcfc']);
assert.equal(c.ref,'','candidate must not carry the Teams Meeting ID as project_ref');
assert(!c.title.includes('316548692826444'),'candidate title must not contain the Teams Meeting ID');
assert(/shtyllave te liqeneve/i.test(c.title),'specific project subject should win over generic Project Scope');
assert(c.score>=96,'independent same-participant continuation + scope attachment should surface as a 96%+ review candidate');
assert(c.tags.includes('vazhdim ndër-thread'),'candidate should explain that evidence was safely joined across Gmail threads');
assert(!c.match?.project||c.match.score<92,'new siren-pole project must not be attached to the existing SSP camera-poles project');

const identityTools=await loadIdentityTools();
const identityIndex=identityTools.buildIndex(existing);
const authoritative=authoritativeMatch(c,identityIndex,identityTools);
assert.equal(authoritative.project,null,'authoritative identity guard must keep the new siren-pole project distinct from SSP camera poles');

const separate=tools.buildCandidates([
  {id:201,gmail_message_id:'a',gmail_thread_id:'a',from_email:'same@example.com',to_emails:['sales@prissteel.com'],cc_emails:['buyer@example.com'],subject:'Project Alpha tower drawings',snippet:'Drawings attached.',sent_at:'2026-08-23T08:00:00Z',direction:'incoming',has_attachments:true},
  {id:202,gmail_message_id:'b',gmail_thread_id:'b',from_email:'same@example.com',to_emails:['sales@prissteel.com'],cc_emails:['buyer@example.com'],subject:'Project Beta warehouse drawings',snippet:'Drawings attached.',sent_at:'2026-08-23T18:00:00Z',direction:'incoming',has_attachments:true}
],[]);
assert.equal(separate.length,2,'same sender/company in a short window is not enough to merge two named projects');

const labeled={subject:'Project 411320-KR - technical drawings',snippet:'',direction:'incoming',has_attachments:false};
assert(/411320-KR/i.test(tools.projectSignal(labeled).ref),'real labeled alphanumeric project references must remain supported');

console.log('Project discovery new intake smoke OK');
