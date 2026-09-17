import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-daily-zones-cleanup-v1.js','utf8');
const utility=()=>'<div class="pst-project-utilities"><button type="button" data-pwf-area="files">Skedarët</button><button type="button" data-pwf-area="communication">Komunikimi</button></div>';
const dom=new JSDOM(`<!doctype html><html><head></head><body><section id="page-workspace-project" class="page active"><div class="pst-pi-tabs pwf-area-nav"><button data-pwf-area="procurement">Prokurimi</button>${utility()}</div></section></body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.eval(src);
const page=window.document.getElementById('page-workspace-project');
const nav=page.querySelector('.pst-pi-tabs');
for(let cycle=0;cycle<4;cycle++){
  window.PSTDailyZonesCleanupV3.cleanProjectSummary();
  for(const area of ['files','communication']){
    assert.equal(page.querySelectorAll('[data-pwf-area="'+area+'"]').length,1,area+' has one control after rerender');
  }
  nav.innerHTML='<button data-pwf-area="procurement">Prokurimi</button>'+utility();
}
window.PSTDailyZonesCleanupV3.cleanProjectSummary();
assert.equal(page.querySelectorAll('.pst-ux-project-utils').length,1,'one utility container');
assert.equal(page.querySelectorAll('.pst-ux-project-utils button').length,2,'two unique utility actions');
window.close();
console.log('Project utility navigation rerender smoke passed.');
