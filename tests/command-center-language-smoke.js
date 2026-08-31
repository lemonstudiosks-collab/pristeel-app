'use strict';
const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('pristeel-command-center-v2.js','utf8');
const guard=fs.readFileSync('pristeel-ui-english-guard-v1.js','utf8');
const loader=fs.readFileSync('pristeel-ui-standard-v1.js','utf8');
const visible=[
  'PPPP COMMAND CENTER','Good morning','Good afternoon','Good evening','Priority actions','Next 7 days','Client concentration','Recent project movement','Status distribution','Opportunity pipeline','Financial attention','System health','Portfolio pressure','ASK PPPP','Ask the platform about any project'
];
visible.forEach(s=>assert.ok(src.includes(s),`missing English Home label: ${s}`));
const retired=['Mirëmbrëma. Ja çfarë po ndodh.','Pyet platformën për çdo projekt','Veprime të konfirmuara','PËR TY TANI','Meaningful project changes'];
retired.forEach(s=>assert.ok(!src.includes(s),`retired mixed Home label leaked into command center: ${s}`));
assert.ok(guard.includes("'Mundësitë':'Opportunities'"),'navigation English mapping missing');
assert.ok(guard.includes("'Projektet':'Projects'"),'projects English mapping missing');
assert.ok(guard.includes("'Partnerët':'Partners'"),'partners English mapping missing');
assert.ok(guard.includes("'Financat':'Finance'"),'finance English mapping missing');
assert.ok(guard.includes("'Sistemi':'System'"),'system English mapping missing');
assert.ok(guard.includes("'Faturat e Furnitorëve':'Supplier invoices'"),'finance English mapping incomplete');
assert.ok(guard.includes("'Projekt i humbur':'Lost project'"),'project workspace English mapping incomplete');
assert.ok(guard.includes('NodeFilter.SHOW_TEXT'),'translation must preserve icons and badges by translating text nodes');
assert.ok(guard.includes('#page-workspace-home>#pst-openai-assistant-v1'),'late duplicate Home AI host must be retired');
assert.ok(!guard.includes('MutationObserver('),'English UI guard must not observe DOM mutations');
assert.ok(!guard.includes('setInterval('),'English UI guard must not poll');
assert.ok(loader.includes('pristeel-ui-english-guard-v1.js'),'UI loader must load English guard');
console.log('Command Center English visible-language smoke: OK');
