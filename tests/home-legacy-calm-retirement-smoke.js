const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync('pristeel-dashboard-calm.js','utf8');
assert(source.includes('compatibility stub'),'Legacy calm Home must stay explicitly retired');
assert(!source.includes('Qendra operative'),'Retired module must not contain the alternate Home shell');
assert(!source.includes('Projektet në fokus'),'Retired module must not contain the alternate project list');
assert(!/setInterval\s*\(/.test(source),'Retired module must not poll or repeatedly wrap navigation');
assert(!/wrapHome\s*\(/.test(source),'Retired module must not wrap goHome/renderHome');

const dom=new JSDOM('<!doctype html><html><body><div id="page-home"><b id="sentinel">legacy host</b></div></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;
let goHomeCalls=0;
const originalGoHome=function(){goHomeCalls++;};
w.goHome=originalGoHome;
w.eval(source);

assert.strictEqual(w.goHome,originalGoHome,'Retired calm module must not replace navigation');
assert(w.document.getElementById('sentinel'),'Retired calm module must not rewrite #page-home');
assert.strictEqual(w.PSTDashboardCalm.retired,true,'Retirement marker must be exposed');
assert.strictEqual(w.PSTDashboardCalm.render(),false,'Compatibility render must be a no-op');
assert.strictEqual(goHomeCalls,0,'Loading the retired module must not navigate');

dom.window.close();
console.log('Legacy calm Home retirement smoke test passed.');
