const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-section-theme-v1.js','utf8');
  const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');

  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source),'Section theme must not observe or poll the page');
  assert(!/supaFetch\s*\(|fetch\s*\(|new\s+XMLHttpRequest/.test(source),'Section theme must not read or write business data');
  assert(finalizer.includes("pristeel-section-theme-v1.js?v=20260822-2"),'UI finalizer does not load the current section theme');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <aside id="pst-ws-sidebar">
      <button class="pst-ws-navbtn" data-key="home">Home</button>
      <button class="pst-ws-navbtn" data-key="finance">Financa</button>
      <button class="pst-ws-navbtn" data-key="apps">Modulet</button>
    </aside>
    <main class="content"><section id="page-workspace-home" class="active"></section></main>
  </body></html>`,{runScripts:'outside-only',url:'https://pppp.example/'});
  const w=dom.window;
  w.eval(source);

  assert.strictEqual(w.document.body.dataset.pstSection,'home','Theme did not detect Home');
  const homeAccent=w.document.body.style.getPropertyValue('--pst-section-accent');
  w.PSTSectionThemeV1.setSection('finance');
  const financeAccent=w.document.body.style.getPropertyValue('--pst-section-accent');
  assert.notStrictEqual(financeAccent,homeAccent,'Finance must have a distinct section accent');

  const css=w.document.getElementById('pst-section-theme-v2-css');
  assert(css,'Current section theme stylesheet was not installed');
  const text=css.textContent;
  assert(text.includes('.content:before'),'Visible top section strip is missing');
  assert(text.includes('height:9px'),'Top section strip is too subtle or missing');
  assert(text.includes('body[data-pst-section="finance"] #fin-hub-grid>div'),'Finance top-level tiles are not normalized to one family');
  assert(text.includes('body[data-pst-section="apps"]'),'Modules section family is missing');
  assert(text.includes(':not(.danger):not(.btn-danger)'),'Destructive controls are not excluded from generic theming');

  w.document.querySelector('[data-key="apps"]').click();
  await new Promise(resolve=>w.setTimeout(resolve,5));
  assert.strictEqual(w.document.body.dataset.pstSection,'apps','Sidebar section click did not switch the visual family');
  dom.window.close();
  console.log('Section theme smoke: OK');
})().catch(err=>{console.error(err);process.exitCode=1;});
