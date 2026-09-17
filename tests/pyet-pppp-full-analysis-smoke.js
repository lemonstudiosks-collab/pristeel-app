'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

(async function(){
  const listeners={};
  let renderCount=0,askCount=0;
  const state={busy:false,busyStage:0,busyToken:0,pendingQuestion:'',projects:[{id:'p1',name:'STACON',client:'Stacon GmbH',identity_aliases:['Stacon']}],last:null};
  global.window={
    PSTProjectControlHomeV1:{_state:state,render(){renderCount++;}},
    PSTOpenAIAssistantV1:{async ask(q,opt){askCount++;assert.strictEqual(q,'STACON');assert.strictEqual(opt.scope,'global');return{ok:true,answer:'Analizë e plotë\nGjendja aktuale\nHapi i ardhshëm',navigation:{project_id:'p1',project_name:'STACON'}};}}
  };
  global.document={
    addEventListener(type,fn,capture){listeners[type]=fn;assert.strictEqual(type==='submit'?capture:true,true);},
    querySelector(){return null;},
    getElementById(){return null;},
    createElement(){return{};},
    head:{appendChild(){}}
  };
  const src=fs.readFileSync('pristeel-pyet-pppp-full-analysis-v1.js','utf8');
  vm.runInThisContext(src,{filename:'pristeel-pyet-pppp-full-analysis-v1.js'});

  assert.strictEqual(window.PSTPyetPpppFullAnalysisV1.isReadIntent('STACON'),true,'bare known project must be a read');
  assert.strictEqual(window.PSTPyetPpppFullAnalysisV1.isReadIntent('ANGEBOT_STACON_22_26.pdf'),true,'project-linked file evidence must be a read');
  assert.strictEqual(window.PSTPyetPpppFullAnalysisV1.isReadIntent('RFQ 2026-1138'),true,'RFQ evidence must be a read');
  assert.strictEqual(window.PSTPyetPpppFullAnalysisV1.isReadIntent('regjistro STACON'),false,'explicit write command must stay with existing controller');

  const input={value:'STACON'};
  const form={querySelector(sel){return sel==='.pst-live-input'?input:null;}};
  let prevented=false,stopped=false;
  const ev={target:{closest(sel){return sel==='.pst-live-command'?form:null;}},preventDefault(){prevented=true;},stopPropagation(){stopped=true;},stopImmediatePropagation(){stopped=true;}};
  listeners.submit(ev);
  await new Promise(r=>setTimeout(r,0));
  assert.strictEqual(prevented,true,'rich read must own the submit');
  assert.strictEqual(stopped,true,'legacy compact submit must be bypassed for reads');
  assert.strictEqual(askCount,1,'live server assistant must be called');
  assert.strictEqual(state.last.kind,'answer');
  assert.match(state.last.data.answer,/Analizë e plotë/);
  assert.strictEqual(input.value,'');
  assert.ok(renderCount>=2,'busy and result states must render');

  input.value='regjistro STACON';prevented=false;stopped=false;
  listeners.submit(ev);
  assert.strictEqual(prevented,false,'explicit write must not be captured by rich read router');
  assert.strictEqual(askCount,1,'explicit write must not call read assistant');
  console.log('pyet-pppp-full-analysis smoke: PASS');
})().catch(err=>{console.error(err);process.exit(1);});
