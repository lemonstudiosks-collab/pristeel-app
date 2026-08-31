const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const dom=new JSDOM('<!doctype html><html><body><div id="page-workspace-projects"><div class="pst-pm-row" data-project-id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"><span class="name">A</span><button class="pst-pm-more">...</button></div></div><div data-live-project="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb">Open B</div></body></html>',{runScripts:'outside-only',url:'https://example.test/pristeel-procurement.html'});
  const w=dom.window,calls=[];
  const canonical=async id=>{calls.push(id);return true;};
  w.PSTProjectIntegrityUIV1={open:canonical};
  w.eval(fs.readFileSync('pristeel-project-owner-lock-v1.js','utf8'));

  assert.strictEqual(w.pstOpenProjectWorkspace,canonical,'Canonical opener must own the global function');
  let wrappedCalls=0;
  const wrapper=async function(id){wrappedCalls++;return canonical(id);};
  wrapper.__pstFlowWrapped=true;
  w.pstOpenProjectWorkspace=wrapper;
  assert.strictEqual(w.pstOpenProjectWorkspace,canonical,'Late wrapper assignment must be rejected');
  assert.strictEqual(w.PSTProjectOwnerLockV1.rejected().length,1,'Rejected wrapper must remain diagnosable');

  let laterCapture=0;
  w.document.addEventListener('click',()=>{laterCapture++;},true);
  w.document.querySelector('.pst-pm-row .name').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,0));
  assert.deepStrictEqual(calls,['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],'Projects row must open exactly one canonical project');
  assert.strictEqual(laterCapture,0,'Canonical capture listener must stop later competing project click handlers');
  assert.strictEqual(wrappedCalls,0,'Rejected wrapper must never execute');

  w.document.querySelector('[data-live-project]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,0));
  assert.deepStrictEqual(calls,['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],'Home project action must use the same canonical opener');

  const before=calls.length;
  w.document.querySelector('.pst-pm-more').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,0));
  assert.strictEqual(calls.length,before,'Overflow/menu controls must remain independent from row opening');

  dom.window.close();
  console.log('Project owner lock smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});