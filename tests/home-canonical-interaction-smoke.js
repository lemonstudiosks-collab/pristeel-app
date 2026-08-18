const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-home-canonical-interaction-v1.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div class="pst-canonical-action" id="dukley-action" data-action-project="p1" data-action-kind="task">
      <span class="pst-ws-action-dot"></span>
      <div class="pst-ws-action-main">
        <b>Urgjent: Zgjidh scope-in e montimit + aprovo planin dinamik</b>
        <span class="pst-ws-tag">Kërkesë e re e klientit</span>
      </div>
      <button type="button" class="pst-ws-action-open">Hap</button>
    </div>
    <div class="pst-canonical-action" id="ordinary-action" data-action-project="p2" data-action-kind="task">
      <span class="pst-ws-action-dot"></span>
      <div class="pst-ws-action-main"><b>Follow-up furnitori</b><span class="pst-ws-tag">Vonuar</span></div>
      <button type="button">Hap</button>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const opened=[];
  w.pstOpenProjectWorkspace=id=>opened.push(id);
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await new Promise(r=>setImmediate(r));

  const api=w.PSTHomeCanonicalInteractionV1;
  assert(api,'Canonical Home interaction API must install');
  assert.strictEqual(api.version,'20260818-2','Expected current Home interaction version');

  const urgent=w.document.getElementById('dukley-action');
  const ordinary=w.document.getElementById('ordinary-action');
  assert(urgent.classList.contains('pst-canonical-action-urgent'),'Urgent client request must style the whole card');
  assert(!ordinary.classList.contains('pst-canonical-action-urgent'),'Ordinary action must keep normal styling');
  assert.strictEqual(urgent.getAttribute('data-pst-canonical-row-click'),'1','Canonical action row must be marked clickable');

  urgent.querySelector('.pst-ws-action-main').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.deepStrictEqual(opened,['p1'],'Clicking the body of the urgent card must open its project');

  urgent.querySelector('button').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.deepStrictEqual(opened,['p1'],'Decorator must not hijack clicks on the existing Hap button');

  ordinary.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.deepStrictEqual(opened,['p1','p2'],'Ordinary canonical action rows must also open from the card body');

  const style=w.document.getElementById('pst-home-canonical-interaction-v1-style');
  assert(style&&style.textContent.includes('#fff9ed'),'Urgent whole-card treatment must use the warm amber background');
  assert(!style.textContent.includes('#A64B42'),'Urgent whole-card treatment must not reintroduce the old red alert accent');

  dom.window.close();
  console.log('Home canonical interaction smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
