'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

(async function(){
  const listeners={};
  let renderCount=0,askCount=0,cssText='',shellMarked=false;
  const state={busy:false,busyStage:0,busyToken:0,pendingQuestion:'',projects:[{id:'p1',name:'STACON',client:'Stacon GmbH',identity_aliases:['Stacon']}],last:null};
  const command={};
  const result={parentElement:null};
  const shell={
    parentElement:null,
    classList:{add(name){if(name==='pst-pyet-pppp-scroll-shell')shellMarked=true;}},
    querySelector(sel){if(sel==='.pst-live-command')return command;if(sel==='.pst-live-result')return result;return null;}
  };
  const root={querySelector(sel){return sel==='.pst-live-result'?result:null;}};
  result.parentElement=shell;shell.parentElement=root;
  global.window={
    PSTProjectControlHomeV1:{_state:state,render(){renderCount++;}},
    PSTOpenAIAssistantV1:{async ask(q,opt){askCount++;assert.strictEqual(q,'STACON');assert.strictEqual(opt.scope,'global');return{ok:true,answer:'Analizë e plotë\nGjendja aktuale\nHapi i ardhshëm',navigation:{project_id:'p1',project_name:'STACON'}};}}
  };
  global.document={
    addEventListener(type,fn,capture){listeners[type]=fn;assert.strictEqual(type==='submit'?capture:true,true);},
    querySelector(){return null;},
    getElementById(id){return id==='pst-home-launchpad-v1'?root:null;},
    createElement(tag){return{tagName:String(tag||'').toUpperCase()};},
    head:{appendChild(node){if(node&&node.tagName==='STYLE')cssText=String(node.textContent||'');}}
  };
  const src=fs.readFileSync('pristeel-pyet-pppp-full-analysis-v1.js','utf8');
  vm.runInThisContext(src,{filename:'pristeel-pyet-pppp-full-analysis-v1.js'});

  assert.strictEqual(window.PSTPyetPpppFullAnalysisV1.isReadIntent('STACON'),true,'bare known project must be a read');
  assert.strictEqual(window.PSTPyetPpppFullAnalysisV1.isReadIntent('ANGEBOT_STACON_22_26.pdf'),true,'project-linked file evidence must be a read');
  assert.strictEqual(window.PSTPyetPpppFullAnalysisV1.isReadIntent('RFQ 2026-1138'),true,'RFQ evidence must be a read');
  assert.strictEqual(window.PSTPyetPpppFullAnalysisV1.isReadIntent('regjistro STACON'),false,'explicit write command must stay with existing controller');
  assert.strictEqual(window.PSTPyetPpppFullAnalysisV1.ensureScrollable(),true,'popup shell must be found');
  assert.strictEqual(shellMarked,true,'popup shell must be marked scrollable');
  assert.match(cssText,/pst-pyet-pppp-scroll-shell/,'scroll shell CSS must exist');
  assert.match(cssText,/100dvh/,'scroll shell must respect the dynamic viewport');
  assert.match(cssText,/overflow-y:auto/,'scroll shell must scroll vertically');
  assert.match(cssText,/max-height:none/,'result must not keep the old inner height cap');
  assert.strictEqual(/76vh/.test(cssText),false,'old 76vh result cap must be removed');

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

  const canonical=fs.readFileSync('pristeel-project-control-home-v1.js','utf8');
  const askStart=canonical.indexOf('async function askAI(q){');
  const assistantCall=canonical.indexOf("await AI.ask(q,{scope:'global'})",askStart);
  const localFallback=canonical.indexOf('var local=localAnswer(q);if(local)return local;',askStart);
  assert.ok(askStart>=0&&assistantCall>askStart,'canonical Home must call the live assistant for reads');
  assert.ok(localFallback>assistantCall,'canonical Home local summary must only be a fallback after the live assistant path');
  assert.match(canonical,/function explicitWriteIntent\(q\)/,'canonical Home must preserve explicit write routing');
  assert.match(canonical,/function evidenceReadIntent\(q\)/,'canonical Home must recognize evidence and bare-entity reads');
  assert.match(canonical,/!explicitWriteIntent\(q\).*evidenceReadIntent\(q\)/s,'canonical Home must keep explicit writes out of the read path');

  const edge=fs.readFileSync('supabase/functions/pppp-openai-assistant/index.ts','utf8');
  assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/,'server assistant must have a server-only credential for privileged PPPP reads');
  assert.match(edge,/const userHeaders=dbH\(auth,anon\),trustedHeaders=dbH\('Bearer '\+service,service\)/,'server assistant must keep user-scoped and trusted read headers separate');
  assert.match(edge,/pppp_assistant_identity_resolver_v1',userHeaders/,'identity resolution must remain user-scoped');
  assert.match(edge,/pppp_assistant_project_resolver_v2',userHeaders/,'project resolution must remain user-scoped');
  assert.match(edge,/pppp_assistant_project_context_v1',trustedHeaders/,'project context must use the trusted server read path after bridge hardening');
  assert.match(edge,/expandProjectEvidence\(base,trustedHeaders,compact\)/,'supplemental ChatGPT evidence must use the trusted server read path');
  assert.match(edge,/pppp_command_center_v1',userHeaders/,'legacy command center read must remain user-scoped');
  assert.match(edge,/pppp_chatgpt_entity_intelligence_v3',trustedHeaders/,'restricted entity intelligence must use the trusted server read path');
  assert.match(edge,/pppp_chatgpt_control_tower_v2',trustedHeaders/,'restricted control tower must use the trusted server read path');

  console.log('pyet-pppp-full-analysis smoke: PASS');
})().catch(err=>{console.error(err);process.exit(1);});
