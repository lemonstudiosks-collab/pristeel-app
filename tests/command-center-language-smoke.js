'use strict';
const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('pristeel-command-center-v2.js','utf8');
const visible=[
  'PPPP COMMAND CENTER','Good morning','Good afternoon','Good evening','Priority actions','Next 7 days','Client concentration','Recent project movement','Status distribution','Opportunity pipeline','Financial attention','System health','Portfolio pressure','ASK PPPP','Ask the platform about any project'
];
visible.forEach(s=>assert.ok(src.includes(s),`missing English Home label: ${s}`));
const retired=['Mirëmbrëma. Ja çfarë po ndodh.','Pyet platformën për çdo projekt','Veprime të konfirmuara','PËR TY TANI','Meaningful project changes'];
retired.forEach(s=>assert.ok(!src.includes(s),`retired mixed Home label leaked into command center: ${s}`));
assert.ok(src.includes("'Mundësitë':'Opportunities'"),'navigation English mapping missing');
assert.ok(src.includes("'Projektet':'Projects'"),'projects English mapping missing');
assert.ok(src.includes("'Partnerët':'Partners'"),'partners English mapping missing');
assert.ok(src.includes("'Financat':'Finance'"),'finance English mapping missing');
assert.ok(src.includes("'Sistemi':'System'"),'system English mapping missing');
assert.ok(src.includes('NodeFilter.SHOW_TEXT'),'translation must preserve icons and badges by translating text nodes');
console.log('Command Center English visible-language smoke: OK');
