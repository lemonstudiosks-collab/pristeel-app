const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
  const router=fs.readFileSync('pristeel-email-offer-analysis-router-v1.js','utf8');
  assert(!/MutationObserver|setInterval\s*\(/.test(router),'Analysis router must not poll or observe globally');
  const dom=new JSDOM('<!doctype html><html><body><button id="old" data-eoi-analyze="m1">Analyze old</button><button id="new" data-esf-analyze="m2">Analyze new</button></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;let structured=[],core=[];w.alert=()=>{};
  w.PSTEmailOfferStructuredFallbackV1={analyze:id=>structured.push(id)};
  w.PSTEmailOfferIntakeV1={analyze:id=>core.push(id)};
  w.eval(router);
  w.document.getElementById('old').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.deepStrictEqual(structured,['m1'],'Legacy analyze button must route to structured parser');
  assert.deepStrictEqual(core,[],'Legacy core analyzer must not run');
  w.localStorage.setItem('pristeel_apikey','stale-or-valid-key');
  w.document.getElementById('new').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.deepStrictEqual(structured,['m1','m2'],'API key presence must not bypass structured supplier-email parsing');
  assert.deepStrictEqual(core,[],'Core analyzer must not replace structured supplier-email parsing even when a key exists');
  dom.window.close();
  console.log('Email offer analysis router smoke test passed.');
})();
