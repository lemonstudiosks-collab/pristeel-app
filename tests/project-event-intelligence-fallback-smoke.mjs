import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deterministicAnalyze,scheduleAttachments,scheduleHighlights,dateRange} from '../supabase/functions/pppp-project-event-intelligence/rules.mjs';

const project={id:'38bdf772-d73e-47b2-9d0f-6020e105aa62',name:'STACON - LAGERHALLE - HAMBURG',pipeline_stage:'production_control',operational_state:'execution'};
const attachment={
 id:1122,
 attachment_name:'FABRICATION SCHEDULE FOR STEEL BEAMS STACON.pdf',
 analysis_status:'analyzed',
 analysis_method:'pdf-parse-v1',
 extracted_text:[
  'Start welding main plate Beams6 daysSat 05/09/26Sat 12/09/26',
  'Start welding base plate20 daysSat 19/09/26Thu 15/10/26',
  'Transport8 daysTue 03/11/26Fri 13/11/26'
 ].join('\n')
};

assert.equal(scheduleAttachments([attachment]).length,1,'parsed PDF schedule must be recognized as a project plan');
const highlights=scheduleHighlights([attachment]);
assert(highlights.some(x=>x.label==='Saldimi i pllakës kryesore'&&x.start==='05/09/26'&&x.finish==='12/09/26'),'main-plate welding dates must come from the archived PDF');
assert(highlights.some(x=>x.label==='Saldimi i pllakës bazë'&&x.start==='19/09/26'&&x.finish==='15/10/26'),'base-plate welding dates must come from the archived PDF');
assert.equal(dateRange('We propose the period 07.09. – 15.10.2026 for your visit.'),'07.09. – 15.10.2026');

const incoming=deterministicAnalyze({
 direction:'incoming',
 subject:'RE: BV Airbus H260 geschw. Träger Freigabe',
 snippet:'Please see the attached work plan. Regarding the customer visit, please let me know which phase would be more convenient for him to come to our factory.',
 has_attachments:true
},project,[attachment]).result;
assert.equal(incoming.action_required,true,'incoming schedule + visit coordination request must require a response');
assert.equal(incoming.workflow_state,'action_required');
assert.equal(incoming.confidence,98);

const outgoing=deterministicAnalyze({
 direction:'outgoing',
 subject:'Re: BV Airbus H260 geschw. Träger Freigabe',
 snippet:'We propose the period 07.09. – 15.10.2026 for your visit to the factory. During this period the welding activities are planned. Please find attached the current production plan.',
 has_attachments:true
},project,[attachment]).result;
assert.equal(outgoing.action_required,false,'outgoing answer means the user has already acted');
assert.equal(outgoing.workflow_state,'wait_for_client','after proposing visit dates PPPP must wait for STACON');
assert.equal(outgoing.supersedes_prior_event_actions,true,'outgoing reply must supersede the prior email action');
assert.equal(outgoing.confidence,99);
assert(outgoing.summary.includes('07.09. – 15.10.2026'),'Home summary must preserve the proposed visit period');
assert(outgoing.summary.includes('pritet konfirmimi'),'Home summary must explain what is awaited now');

const edge=fs.readFileSync('supabase/functions/pppp-project-event-intelligence/index.ts','utf8');
assert(!edge.includes('paused_provider_unavailable'),'event intelligence must never stop just because OpenAI is unavailable');
assert(edge.includes("idempotency=\`email-event-v2:"),'new email-event facts must use the v2 idempotency namespace');
assert(!edge.includes('openai-email-event-v1'),'obsolete event idempotency must be gone');
assert(!edge.includes('openai_email_event_v1'),'obsolete operational-state source must be gone');
assert(edge.includes('recordScheduleFact'),'parsed schedule attachments must become current project context');
assert(edge.includes("source_ref',p.id+':execution_schedule"),'outgoing schedule evidence must close the stale execution schedule task');
assert(edge.includes("provider:OPENAI?'openai+deterministic-fallback':'deterministic'"),'runtime must declare its deterministic fallback mode');

console.log('STACON email → schedule → waiting-for-client event chain: OK');
