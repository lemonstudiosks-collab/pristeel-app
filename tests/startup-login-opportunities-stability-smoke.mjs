import fs from 'node:fs';
import assert from 'node:assert/strict';

const guard=fs.readFileSync('pristeel-startup-guard-v2.js','utf8');
const brand=fs.readFileSync('pristeel-login-brand-v1.js','utf8');
const html=fs.readFileSync('pristeel-procurement.html','utf8');
const opportunities=fs.readFileSync('pristeel-opportunities-filter-polish-v1.js','utf8');
const workflow=fs.readFileSync('pristeel-project-centric-workflow-v1.js','utf8');

assert.match(guard,/form\.querySelector\('\.pst-auth-brand'\)/,'startup owner must reuse the final login brand node');
assert.doesNotMatch(guard,/pst-auth-head/,'startup owner must not create a second login composition');
assert.match(guard,/Procurement Projects Platform/,'startup and final login must show identical copy');
assert.match(brand,/#auth-gate\.pst-auth-branded #auth-form\{[^}]*width:100%!important/,'final login must preserve the first-paint card width');

const recovery=html.slice(html.indexOf('function recoverUnsavedWork(){'),html.indexOf('// _curProjId deklarohet'));
assert.doesNotMatch(recovery,/\bconfirm\s*\(/,'startup recovery must never open a native confirmation');
assert.doesNotMatch(recovery,/\balert\s*\(/,'startup recovery must never open a native alert');
assert.match(recovery,/__pstPendingRecoveryNotice=keys\.length/,'queued writes must remain available for explicit in-app recovery');
assert.match(recovery,/deferred:true/,'startup recovery must be explicitly deferred');

assert.match(opportunities,/#pst-opp-desk\.pst-opp-workdesk\{[^}]*align-items:start!important/,'Opportunity desk columns must start at their content height');
assert.match(opportunities,/\.pst-opp-work-rows\{[^}]*display:block!important[^}]*height:auto!important/,'Opportunity row container must not stretch its children');
assert.match(opportunities,/\.pst-opp-work-row\{[^}]*height:59px!important[^}]*max-height:59px!important/,'Opportunity rows must keep a bounded stable height');
assert.match(opportunities,/function selectInPlace\(id\)/,'Opportunity selection must update in place');
assert.doesNotMatch(workflow,/\[0,90,260,700\]/,'navigation must not trigger four delayed workflow renders');
assert.match(workflow,/schedulePending=true/,'workflow renders must coalesce into one animation-frame update');

console.log('Startup, login, recovery, and Opportunity stability smoke: OK');
