import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const ui = fs.readFileSync('pristeel-representations-v1.js','utf8');
const migration = fs.readFileSync('supabase/migrations/20260926062633_representations_module_v1.sql','utf8');
const worker = fs.readFileSync('supabase/functions/chatgpt-command-bridge/worker.ts','utf8');
const relationshipMigration = fs.readFileSync('supabase/migrations/20260926143300_representation_relationships_v1.sql','utf8');
const bootstrap = fs.readFileSync('pristeel-project-emails.js','utf8');

new vm.Script(ui);

assert.match(bootstrap,/pristeel-representations-v1\.js\?v=20260926-representations2/);
assert.match(bootstrap,/pristeel-representation-opportunities-v2\.js\?v=20260926-opportunities1/);
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
assert.match(ui,/JV \/ Partnerë lokalë & rajonalë/);
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
assert.match(ui,/Archive \/ Mbylle/);
assert.doesNotMatch(ui,/sendEmail|gmail\.send|external_email_send/i);

const dom = new JSDOM('<!doctype html><html><head></head><body><div class="topbar"></div><div class="content"></div><div id="pst-home-launchpad-v1"><div class="pst-morning-lanes"><section class="pst-morning-lane opportunities"></section><section class="pst-morning-lane material"></section></div></div><div id="page-workspace-apps"><div class="pst-ws-appgrid"></div></div></body></html>',{
  url:'https://pppp.test/',
  runScripts:'dangerously',
  pretendToBeVisual:true,
});
dom.window.supaFetch = async () => [];
dom.window.scrollTo = () => {};
dom.window.eval(ui);
await new Promise(resolve => setTimeout(resolve,20));
assert.ok(dom.window.PSTRepresentationsV1,'public module API missing');
dom.window.PSTRepresentationsV1.open();
await new Promise(resolve => setTimeout(resolve,20));
const page = dom.window.document.getElementById('page-representations');
assert.ok(page?.classList.contains('active'),'route did not open');
assert.equal(dom.window.location.hash,'#perfaqesime');
assert.equal(page.querySelectorAll('[data-rep-kpis] .pst-rep-kpi').length,4);
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
page.querySelector('[data-rep-new]').click();
assert.ok(dom.window.document.getElementById('pst-rep-modal'),'manual create editor did not open');
assert.ok(dom.window.document.getElementById('rep-company-name'));
assert.ok(dom.window.document.getElementById('rep-stage'));
assert.ok(dom.window.document.getElementById('rep-next-action'));
assert.ok(dom.window.document.getElementById('rep-capital-fit'));

console.log('Representations v1 smoke passed');


