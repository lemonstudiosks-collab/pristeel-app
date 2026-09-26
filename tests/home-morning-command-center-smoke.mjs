import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('pristeel-home-morning-command-center-v1.js','utf8');
assert(!/supaFetch|\/rest\/v1\/|\.insert\(|\.update\(|\.delete\(/.test(source),'Morning Home must reuse snapshots without database reads or writes');
assert(source.includes('Veprimet prioritare')&&source.includes('Projektet aktive')&&source.includes('Material → Ofertë'),'Morning Home must expose the redesigned three work zones');
assert(source.includes('home-project-empty4'),'Morning Home must expose the compact project-empty cache version');
assert(source.includes('groupActions(allActions)'),'Morning Home must group repetitive priority actions');

const dom=new JSDOM(`<!doctype html><html><head></head><body class="pst-ui-v2 pst-global-fullwidth-shell">
<div class="app-shell" id="app-shell-root"><aside class="sidebar" id="app-sidebar" style="display:none!important;width:0!important;visibility:hidden!important"><div id="pst-v2-sidebar" style="display:none!important"><div id="pst-ws-sidebar" style="display:none!important"></div></div></aside><main class="main" style="width:100%!important"><div class="content">
<section class="page active" id="page-workspace-home" style="display:block"><div id="pst-native-home-v4"><section class="pst-live-command-shell"><form class="pst-live-command"><textarea class="pst-live-input"></textarea><button class="pst-live-send">↑</button></form></section></div></section><button id="pst-daily-launch">The PriSteel Daily</button>
</div></main></div></body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
let actionCalls=0,projectCalls=0,projectAreaCalls=0,opportunityCalls=0,materialCalls=0;
window.PSTHomeCanonicalV1={snapshot:()=>({
 actions:[{key:'a1',project_name:'Airbus H24X',title:'Kontrollo ofertën',why:'Verifiko marzhën',priority:'high',due_date:new Date().toISOString()},{key:'a2',project_name:'Dukley Seafront',title:'Kontrollo ofertën',why:'Verifiko marzhën',priority:'high',due_date:new Date().toISOString()}],
 projects:[{id:'p1',name:'Dukley Seafront',pipeline_stage:'client_offer',next_action:'Përgjigju klientit'}],waiting:[]
})};
window.PSTHomeOperatingGridV1={_test:{proxyAction:key=>{if(key==='a1')actionCalls++;return true;}}};
window.pstOpenProjectWorkspace=id=>{if(id==='p1')projectCalls++;};
window.PSTPrimaryNavResilienceV10={openOpportunities:()=>{opportunityCalls++;},openProjects:()=>{projectAreaCalls++;return true;}};
window.PSTProjectCentricWorkflowV1={_state:{rows:[{id:'o1',status:'new',relevance_score:92}]},_test:{opportunityRows(){return thisRows;},opportunityLifecycle(){return'new';}}};
const thisRows=window.PSTProjectCentricWorkflowV1._state.rows;
window.PSTDachSteelSalesV3={snapshot:()=>({summary:{ready_for_outreach:11,draft_ready:2,replied:1},targets:Array.from({length:11})}),open:()=>{materialCalls++;}};
window.eval(source);
window.PSTHomeMorningCommandCenterV1.render();

const home=window.document.getElementById('pst-home-launchpad-v1');
assert(home&&home.classList.contains('pst-morning-home'),'Morning Command Center must own the visible Home');
assert.equal(window.document.getElementById('app-sidebar').style.getPropertyValue('display'),'','Home must clear the late inline sidebar hide');
assert.equal(home.querySelectorAll('[data-morning-action]').length,1,'Equivalent canonical actions must be grouped into one priority row');
assert.match(home.querySelector('[data-morning-action] .pst-morning-action-project').textContent,/2 projekte/,'Grouped priority must explain how many projects need attention');
assert.equal(home.querySelectorAll('[data-morning-project]').length,1,'Concrete project snapshot must render once');
assert.equal(home.querySelector('[data-morning-metric="opp-new"]').textContent,'1','Existing Opportunities state must populate Home');
assert.equal(home.querySelector('[data-morning-metric="mat-ready"]').textContent,'11','Existing Material Trade state must populate Home');
assert(home.querySelector('.pst-live-command-shell'),'Existing Pyet PPPP shell must be preserved and moved, not rebuilt');
assert(home.querySelector('[data-morning-ask-body]').hidden,'Pyet PPPP must start compact');
assert(home.querySelector('[data-morning-daily-slot] #pst-daily-launch'),'Daily launcher must move into the Home header');

home.querySelector('[data-morning-ask-toggle]').click();
assert.equal(home.querySelector('[data-morning-ask-body]').hidden,false,'Pyet PPPP must expand on demand');

home.querySelector('[data-morning-action]').click();
home.querySelector('[data-morning-project]').click();
home.querySelector('[data-morning-card][data-morning-area="projects"] .pst-morning-panel-head h2').click();
home.querySelector('[data-morning-card][data-morning-area="opportunities"] .pst-morning-metrics').click();
home.querySelector('[data-morning-card][data-morning-area="material"] .pst-morning-panel-head h2').click();
assert.equal(actionCalls,0,'A grouped Morning action must not open only the first underlying action');
assert.equal(projectCalls,1,'Morning project must open through the canonical project route');
assert.equal(projectAreaCalls,2,'Grouped actions and the full Projects card must open the canonical Projects area');
assert.equal(opportunityCalls,1,'Morning Opportunities must use canonical navigation');
assert.equal(materialCalls,1,'Morning Material Trade must use its existing owner');
assert.equal(home.querySelectorAll('[data-morning-card]').length,3,'All three Home work cards must expose full-card click targets');

dom.window.close();
console.log('Morning Command Center smoke: PASS');
