import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const ui = fs.readFileSync('pristeel-representations-v1.js','utf8');
const opportunityUi = fs.readFileSync('pristeel-representation-opportunities-v2.js','utf8');
const migration = fs.readFileSync('supabase/migrations/20260926062633_representations_module_v1.sql','utf8');
const worker = fs.readFileSync('supabase/functions/chatgpt-command-bridge/worker.ts','utf8');
const relationshipMigration = fs.readFileSync('supabase/migrations/20260926143300_representation_relationships_v1.sql','utf8');
const representationDraftWorker = fs.readFileSync('supabase/functions/pppp-representation-draft-generator/index.ts','utf8');
const bootstrap = fs.readFileSync('pristeel-project-emails.js','utf8');

new vm.Script(ui);

assert.match(bootstrap,/pristeel-representations-v1\.js\?v=20261003-representations9-compact-draft/);
assert.match(bootstrap,/pristeel-representation-opportunities-v2\.js\?v=20260927-opportunities4-compact-controls/);
assert.match(migration,/create table public\.pppp_representation_targets_v1/i);
assert.match(migration,/enable row level security/i);
assert.match(migration,/pppp_representation_targets_authenticated_update/i);
assert.match(migration,/create unique index pppp_representation_targets_domain_uidx/i);
assert.match(migration,/duplicate_representation_target_review_required/i);
assert.match(migration,/create or replace function public\.pppp_chatgpt_representation_targets_v1/i);
assert.match(migration,/create or replace function public\.pppp_chatgpt_register_representation_target_v1/i);
assert.match(migration,/created_source_command_id=v_command_id/i);
assert.match(migration,/'represented_automatically',false/i);
assert.match(migration,/'external_email_sent',false/i);
assert.doesNotMatch(migration,/insert\s+into\s+public\.(projects|partners|contacts|suppliers|pppp_outbound_queue_v1)/i);
assert.match(worker,/'representation_target'/);
assert.match(worker,/processRepresentationTarget/);
assert.match(worker,/pppp_chatgpt_register_representation_target_v1/);
assert.match(worker,/representation_relationship/);
assert.match(relationshipMigration,/create table if not exists public\.pppp_representation_relationships_v1/i);
assert.match(relationshipMigration,/pppp_chatgpt_register_representation_relationship_v1/i);
assert.match(ui,/JV \/ partnerë lokalë & rajonalë/);
assert.match(ui,/data-rep-act=\"add-relationship\"/);
assert.match(ui,/#perfaqesime/);
assert.match(ui,/data-rep-toggle="pipeline"/);
assert.match(ui,/data-rep-toggle="filters"/);
assert.match(ui,/data-rep-search/);
assert.match(ui,/data-rep-country/);
assert.match(ui,/data-rep-sector/);
assert.match(ui,/data-rep-capital/);
assert.match(ui,/body:has\(#page-representations\.active\) \.topbar/);
assert.doesNotMatch(ui,/function injectSystemCard/);
assert.match(ui,/priority_score\.desc/);
assert.match(ui,/Arkivo \/ Mbylle/);
assert.match(ui,/data-rep-back/);
assert.match(ui,/Krijo draft në Gmail/);
assert.match(ui,/Hap draftin në Gmail/);
assert.match(ui,/pppp-representation-draft-generator/);
assert.match(ui,/Gmail & Kontaktimi/);
assert.match(ui,/Pse Kosova/);
assert.match(ui,/function representationRows\(\)/);
assert.match(ui,/target_type\)==='representation'/);
assert.match(ui,/Modeli \/ territori/);
assert.match(opportunityUi,/PROJECT_ROLES/);
assert.match(opportunityUi,/options\(PROJECT_ROLES,'oem_specialist_partner'\)/);
assert.match(ui,/Rreziqe & sinjale historike/);
assert.match(ui,/Mesazhi i jashtëm/);
assert.match(ui,/data-rep-module="gmail"/);
assert.match(ui,/data-rep-module="strategy"/);
assert.match(ui,/data-rep-module="project"/);
assert.match(ui,/data-rep-module="jv"/);
assert.match(ui,/data-rep-module="commercial"/);
assert.match(ui,/data-rep-module="notes"/);
assert.match(ui,/Shiko detajet/);
assert.match(representationDraftWorker,/gmail_last_message_id/);
assert.doesNotMatch(representationDraftWorker,/gmail_draft_message_id/);
assert.match(representationDraftWorker,/findExistingDraft/);
assert.match(ui,/data-rep-profile-view/);
assert.match(ui,/pst-rep-back-primary/);
assert.match(ui,/previousPageId/);
assert.match(opportunityUi,/root\.insertBefore\(sw,target\)/);
assert.match(opportunityUi,/Përfaqësi në Kosovë/);
assert.match(opportunityUi,/Tenderë · JV · Konsorcium/);
assert.doesNotMatch(ui,/data-rep-new/);
assert.doesNotMatch(ui,/Kompanitë candidate/);
assert.doesNotMatch(ui,/data-rep-act=\"close-profile\"/);
assert.doesNotMatch(ui,/data-rep-kpis/);
assert.match(ui,/pppp_representation_opportunity_targets_v1\?select=\*/);
assert.match(representationDraftWorker,/external_pitch/);
assert.match(representationDraftWorker,/gmail\.googleapis\.com\/gmail\/v1\/users/);
assert.match(representationDraftWorker,/\/drafts/);
assert.doesNotMatch(representationDraftWorker,/\/messages\/send|gmail\.send/i);
assert.doesNotMatch(ui,/sendEmail|gmail\.send|external_email_send/i);

const dom = new JSDOM('<!doctype html><html><head></head><body><div class="topbar"></div><div id="page-origin" class="page active" style="display:block"></div><div class="content"></div><div id="pst-home-launchpad-v1"><div class="pst-morning-lanes"><section class="pst-morning-lane opportunities"></section><section class="pst-morning-lane material"></section></div></div><div id="page-workspace-apps"><div class="pst-ws-appgrid"></div></div></body></html>',{
  url:'https://pppp.test/',
  runScripts:'dangerously',
  pretendToBeVisual:true,
});
dom.window.supaFetch = async (path) => {
  const p=String(path||'');
  if(p.startsWith('pppp_representation_targets_v1?'))return [{
    id:'11111111-1111-4111-8111-111111111111',company_name:'KEC International Limited',company_domain:'kecrpg.com',company_domain_normalized:'kecrpg.com',
    company_website:'https://www.kecrpg.com/',country:'IN',headquarters:'Mumbai, India',sector:'Power Transmission & Distribution EPC',
    product_category:'Transmission lines, substations and EHV cabling',product_summary:'Global T&D EPC contractor.',manufacturer_description:'Global infrastructure EPC company.',
    products:['turnkey transmission lines','AIS substations'],stage:'contact_ready',kosovo_presence:'none_found',target_type:'lead_epc_candidate',
    target_model:'project_based_representation',target_territory:'Kosovo / Western Balkans',contact_email:'kecindia@kecrpg.com',contact_role:'Corporate contact',
    source_key:'rep:in:kecrpg.com',source_name:'KEC official website',source_url:'https://www.kecrpg.com/',priority_reason:'Operator-selected candidate',
    strategic_fit_notes:'Kosovo interface and execution support.',why_kosovo:'Project-specific fit for KOSTT 55387.',market_evidence:'EBRD-backed grid project.',
    created_at:'2026-09-27T00:00:00Z',updated_at:'2026-09-27T00:00:00Z',last_verified_at:'2026-09-27T00:00:00Z'
  },{
    id:'33333333-3333-4333-8333-333333333333',company_name:'Dripmate A/S',company_domain:'dripmate.example',company_domain_normalized:'dripmate.example',
    company_website:'https://dripmate.example/',country:'DK',headquarters:'Denmark',sector:'Industrial equipment',
    product_category:'Irrigation equipment',product_summary:'Manufacturer seeking distribution partners.',manufacturer_description:'Danish manufacturer focused on irrigation equipment.',
    products:['irrigation systems','industrial equipment'],stage:'verified',kosovo_presence:'none_found',target_type:'representation',
    target_model:'commercial_agent',target_territory:'Kosovo',contact_email:'sales@dripmate.example',contact_role:'International sales',
    source_key:'rep:dk:dripmate.example',source_name:'Official market-entry notice',source_url:'https://dripmate.example/',priority_reason:'Public Kosovo distributor signal',
    strategic_fit_notes:'Assess PriSteel as Kosovo commercial representative.',why_kosovo:'Public signal indicates distributor interest in Kosovo.',market_evidence:'Kosovo listed as a target market.',
    capital_fit:'review',created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-01T00:00:00Z',last_verified_at:'2026-10-01T00:00:00Z'
  }];
  if(p.startsWith('pppp_representation_relationships_v1?'))return [];
  if(p.startsWith('pppp_representation_opportunity_targets_v1?'))return [{
    target_id:'11111111-1111-4111-8111-111111111111',opportunity_id:'22222222-2222-4222-8222-222222222222',candidate_role:'lead_epc_candidate',company_fit_status:'review',
    fit_evidence:{technical_fit:'Strong T&D fit.',approach_thesis:'PriSteel provides the Kosovo execution layer.',pristeel_value:['local sourcing','logistics'],risks:['Package structure not public'],regional_position:'Global EPC',external_pitch:'Potential project-specific cooperation.'}
  }];
  if(p.startsWith('pppp_representation_opportunities_v1?'))return [{
    id:'22222222-2222-4222-8222-222222222222',project_name:'KOSTT Transmission Grid Strengthening',tender_reference:'EBRD Project ID 55387',
    funding_institution:'EBRD / KOSTT',total_project_value:42800000,currency:'EUR',status:'approved',procurement_stage:'pre-procurement',
    scope:'110 kV substations and underground cable',financing:'EBRD financing',fact_evidence:{approval_date:'2026-09-23',ebrd_finance:{value:25000000},danish_grant:{value:5250000}},
    procurement_packages:[],verification_status:'verified'
  }];
  return [];
};
dom.window.scrollTo = () => {};
dom.window.eval(ui);
await new Promise(resolve => setTimeout(resolve,20));
assert.ok(dom.window.PSTRepresentationsV1,'public module API missing');
dom.window.PSTRepresentationsV1.open();
await new Promise(resolve => setTimeout(resolve,20));
const page = dom.window.document.getElementById('page-representations');
assert.ok(page?.classList.contains('active'),'route did not open');
assert.equal(dom.window.location.hash,'#perfaqesime');
assert.equal(dom.window.document.getElementById('page-origin').style.display,'none','opening Representations must hide the previous page');
assert.ok(page.querySelector('[data-rep-back]'),'candidate view must expose a persistent back button');
assert.ok(page.querySelector('[data-rep-list-view]'),'candidate list view missing');
assert.ok(page.querySelector('[data-rep-profile-view]'),'full-width company dossier view missing');
assert.equal(page.querySelector('[data-rep-id="11111111-1111-4111-8111-111111111111"]'),null,'JV/EPC candidate must not appear in Dega 1');
const companyRow=page.querySelector('[data-rep-id="33333333-3333-4333-8333-333333333333"]');
assert.ok(companyRow,'representation company row missing');
companyRow.click();
await new Promise(resolve => setTimeout(resolve,0));
assert.equal(page.querySelector('[data-rep-list-view]').hidden,true,'company click must hide list view');
assert.equal(page.querySelector('[data-rep-profile-view]').hidden,false,'company click must open full dossier view');
assert.match(page.querySelector('[data-rep-detail]').textContent,/Dripmate A\/S/);
assert.match(page.querySelector('[data-rep-detail]').textContent,/Mundësia e përfaqësimit/);
assert.match(page.querySelector('[data-rep-detail]').textContent,/Pse Kosova/);
assert.doesNotMatch(page.querySelector('[data-rep-detail]').textContent,/KOSTT Transmission Grid Strengthening/);
assert.match(page.querySelector('[data-rep-detail]').textContent,/Edito kompaninë/);
assert.ok(page.querySelector('details[data-rep-module="gmail"][open]'),'Gmail module must be expanded by default');
assert.ok(page.querySelector('details[data-rep-module="strategy"]'),'strategy accordion missing');
assert.ok(page.querySelector('details[data-rep-module="project"]'),'project accordion missing');
const projectDetail=page.querySelector('details[data-rep-module="project"]');
assert.equal(projectDetail.open,false,'project details should start collapsed');
page.querySelector('[data-rep-act="open-module"][data-rep-module="project"]').click();
assert.equal(projectDetail.open,true,'project summary action must open project details');
page.querySelector('[data-rep-back]').click();
await new Promise(resolve => setTimeout(resolve,0));
assert.equal(page.querySelector('[data-rep-list-view]').hidden,false,'Kthehu from company dossier must restore list view');
const pipelineToggle=page.querySelector('[data-rep-toggle="pipeline"]');
const pipelineMenu=page.querySelector('[data-rep-menu="pipeline"]');
assert.ok(pipelineMenu.hidden,'pipeline menu must start collapsed');
pipelineToggle.click();
assert.equal(pipelineMenu.hidden,false,'pipeline menu must expand vertically on demand');
const filterToggle=page.querySelector('[data-rep-toggle="filters"]');
const filterMenu=page.querySelector('[data-rep-menu="filters"]');
filterToggle.click();
assert.equal(filterMenu.hidden,false,'filter menu must expand on demand');
assert.ok(dom.window.document.querySelector('.pst-morning-lane.opportunities').nextElementSibling?.id==='pst-representations-home-v1','Representations must sit directly under Opportunities on Home');
assert.equal(dom.window.document.getElementById('pst-representations-system-card'),null,'Representations must not be injected into System');
const companyRowAgain=page.querySelector('[data-rep-id="33333333-3333-4333-8333-333333333333"]');
assert.ok(companyRowAgain,'representation company row missing after return');
companyRowAgain.click();
await new Promise(resolve => setTimeout(resolve,0));
page.querySelector('[data-rep-act="edit"]').click();
assert.ok(dom.window.document.getElementById('pst-rep-modal'),'company editor did not open');
assert.ok(dom.window.document.getElementById('rep-company-name'));
assert.ok(dom.window.document.getElementById('rep-stage'));
assert.ok(dom.window.document.getElementById('rep-next-action'));
assert.ok(dom.window.document.getElementById('rep-capital-fit'));
assert.match(dom.window.document.getElementById('pst-rep-modal').textContent,/Edito kompaninë/);
dom.window.document.getElementById('pst-rep-modal').remove();
page.querySelector('[data-rep-back]').click();
await new Promise(resolve => setTimeout(resolve,0));
assert.equal(page.querySelector('[data-rep-list-view]').hidden,false,'first Kthehu from dossier must return to the company list');
assert.equal(page.classList.contains('active'),true,'first Kthehu must stay inside Representations');
page.querySelector('[data-rep-back]').click();
await new Promise(resolve => setTimeout(resolve,0));
assert.equal(page.classList.contains('active'),false,'second Kthehu from company list must leave Representations');
assert.equal(dom.window.document.getElementById('page-origin').classList.contains('active'),true,'second Kthehu must restore the immediately previous page');
assert.equal(dom.window.document.getElementById('page-origin').style.display,'block','second Kthehu must show the immediately previous page');

console.log('Representations v1 smoke passed');


