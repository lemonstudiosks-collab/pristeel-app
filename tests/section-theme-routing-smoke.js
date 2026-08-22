const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-section-theme-v1.js','utf8');
  const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');

  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source),'Section theme must not observe or poll the page');
  assert(!/supaFetch\s*\(|fetch\s*\(|new\s+XMLHttpRequest/.test(source),'Section theme must not read or write business data');
  assert(finalizer.includes("pristeel-section-theme-v1.js?v=20260822-1"),'UI finalizer does not load the section theme');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <aside id="pst-ws-sidebar">
      <button class="pst-ws-navbtn" data-key="inbox"><span>Gmail</span><i class="pst-ws-badge">50</i></button>
    </aside>
    <main>
      <section id="page-workspace-home" class="active"></section>
      <section id="page-workspace-projects"></section>
      <section id="page-kek-tenders"></section>
      <section id="page-workspace-contacts"></section>
      <section id="page-workspace-inbox"></section>
      <section id="page-document-center"></section>
      <section id="page-finance"></section>
      <section id="page-workspace-apps"></section>
    </main>
  </body></html>`,{runScripts:'outside-only',url:'https://pppp.example/'});

  const w=dom.window;
  const routed=[];
  let legacyExternal=0;
  let decorated=0;
  w.pstWorkspaceGo=(key)=>routed.push(key);
  w.PSTGmailLiveInboxV2={decorate:()=>{decorated++;}};
  const gmailButton=w.document.querySelector('[data-key="inbox"]');
  gmailButton.addEventListener('click',()=>{legacyExternal++;});

  w.eval(source);
  gmailButton.click();
  await new Promise(resolve=>w.setTimeout(resolve,5));

  assert.deepStrictEqual(routed,['inbox'],'Sidebar Gmail did not route to the internal PPPP inbox');
  assert.strictEqual(legacyExternal,0,'Sidebar Gmail click leaked through to the legacy/external handler');
  assert.strictEqual(decorated,1,'Internal Gmail live module was not decorated after routing');

  const css=w.document.getElementById('pst-section-theme-v1-css');
  assert(css,'Section theme stylesheet was not installed');
  const text=css.textContent;
  [
    '#page-workspace-home.active',
    '#page-workspace-projects.active',
    '#page-kek-tenders.active',
    '#page-workspace-contacts.active',
    '#page-workspace-inbox.active',
    '#page-document-center.active',
    '#page-finance.active',
    '#page-workspace-apps.active'
  ].forEach(selector=>assert(text.includes(selector),'Missing top-level theme selector: '+selector));
  assert(text.includes('#page-finance.active #fin-hub-grid>div'),'Finance top-level tiles are not normalized to one color family');
  assert(text.includes('#page-workspace-inbox.active .pst-gli-intake'),'Internal Gmail primary action is not themed');
  assert(text.includes(':not(.danger):not(.btn-danger)'),'Destructive controls are not explicitly excluded from generic theming');

  dom.window.close();
  console.log('Section theme + internal Gmail routing smoke: OK');
})().catch(err=>{console.error(err);process.exitCode=1;});
