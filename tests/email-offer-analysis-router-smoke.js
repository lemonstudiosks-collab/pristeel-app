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
  assert.deepStrictEqual(structured,['m1'],'Legacy analyze button must route to structured parser when AI key is absent');
  assert.deepStrictEqual(core,[],'Legacy core analyzer must not run when structured fallback is selected');
  w.localStorage.setItem('pristeel_apikey','test-key');
  w.document.getElementById('new').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.deepStrictEqual(core,['m2'],'Structured analyze button must route to AI core when API key exists');
  dom.window.close();
  console.log('Email offer analysis router smoke test passed.');
})();
