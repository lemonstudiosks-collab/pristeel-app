import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('pristeel-opportunities-filter-polish-v1.js','utf8');
const dom=new JSDOM(`<!doctype html><html><head></head><body><section id="page-kek-tenders" class="page active"><div id="pst-opportunities-focus"><header></header><div id="pst-pcw-opportunity-tools"><label><span>Kërko</span><input id="pst-pcw-opportunity-search"></label></div><div id="pst-pcw-lifecycle-tabs">Legacy map</div><div id="pst-pcw-opportunity-tabs"></div><div id="pst-opportunities-list"></div></div></section></body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.eval(source);
assert.equal(window.document.querySelector('#pst-opp-desk'),null,'Desk waits for the canonical workflow owner');

window.PSTProjectCentricWorkflowV1={
 _state:{rows:[],mode:'all',source:'all',lifecycle:'all',field:'all',winner_group:'all',query:''},
 _test:{tenderVisible:()=>true,dedupeOpportunities:x=>x,opportunityRows:()=>[]},
 applyOpportunityFilter(){return true;},
 renderOpportunities(){}
};
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await new Promise(r=>setTimeout(r,650));
assert.equal(window.document.querySelectorAll('#pst-opp-desk').length,1,'Desk owner must still activate when canonical workflow arrives late');
assert.equal(window.document.querySelectorAll('[data-pst-opp-back]').length,1,'Late activation restores one Kthehu control');
assert.equal(window.document.querySelectorAll('#pst-opportunities-filter-polish-v1-css').length,1,'One Desk stylesheet remains');
console.log('Opportunities late-owner Desk smoke: OK');
