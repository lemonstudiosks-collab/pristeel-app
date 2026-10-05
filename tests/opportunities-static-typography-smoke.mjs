import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-platform-readability-v1.js','utf8');
const dom=new JSDOM('<!doctype html><html class="pst-spie-standard"><head></head><body><section id="page-kek-tenders"><button><span class="text">TED</span></button><p>Opportunity</p></section><div id="pst-opp-modal-bg"><p>Evidence</p></div><div id="pst-tender-draft-modal"><textarea>Draft</textarea></div><section id="page-contacts"><p>Legacy text</p></section></body></html>',{runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.setTimeout=()=>0;
window.eval(src);
const api=window.PSTPlatformReadabilityV1;
const targets=[...window.document.querySelectorAll('#page-kek-tenders button,#page-kek-tenders span,#page-kek-tenders p,#pst-opp-modal-bg p,#pst-tender-draft-modal textarea')];
for(let cycle=0;cycle<6;cycle++){
 for(const el of targets){el.style.fontSize='9px';api._test.mark(el);assert(!/pst-rd-/.test(el.className),'SPIE Opportunity content must never receive delayed font classes');}
 window.document.querySelector('#page-kek-tenders button').click();
 api.apply(window.document);
 for(const el of targets)assert(!/pst-rd-/.test(el.className));
}
const legacy=window.document.querySelector('#page-contacts p');legacy.style.fontSize='9px';api._test.mark(legacy);assert(legacy.classList.contains('pst-rd-sm'),'unrelated legacy readability remains functional');
window.document.documentElement.classList.remove('pst-spie-standard');api._test.mark(targets[0]);assert(targets[0].classList.contains('pst-rd-control'),'legacy mode retains its typography fallback');
dom.window.close();
console.log('Opportunities static typography across click cycles: OK');
