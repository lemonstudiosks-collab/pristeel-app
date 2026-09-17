import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const src=fs.readFileSync('pristeel-operator-flow-v1.js','utf8');
const dom=new JSDOM('<!doctype html><html><head></head><body><nav><button data-key="projects"><span class="pst-nav-label">Projects</span></button></nav></body></html>',{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.eval(src);
await new Promise(resolve=>setTimeout(resolve,100));
assert.equal(window.document.querySelector('.pst-nav-label').textContent,'Projektet','Navigation label is localized');
let mutations=0;
const observer=new window.MutationObserver(records=>{mutations+=records.length;});
observer.observe(window.document.body,{subtree:true,childList:true,characterData:true});
await new Promise(resolve=>setTimeout(resolve,220));
observer.disconnect();
assert.equal(mutations,0,'Operator-flow observer must settle without rewriting unchanged labels');
window.close();
console.log('Operator flow idle observer smoke passed.');
