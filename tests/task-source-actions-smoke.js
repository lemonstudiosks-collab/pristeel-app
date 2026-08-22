const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-task-source-actions-v1.js','utf8');
  const contacts=fs.readFileSync('pristeel-contact-master-v1.js','utf8');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source),'Task source actions must not observe or poll the page');
  assert(!/supaFetch\s*\(|fetch\s*\(|new\s+XMLHttpRequest/.test(source),'Task source actions must remain read-only and query-free');
  assert(!/(?:window\.)?(?:pstWsActionOpen|pstWorkspaceGo|openTaskDetail)\s*=(?!=)/.test(source),'Task source actions must not override navigation or task behavior');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-home">
      <div id="pst-ws-home-actions">
        <div class="pst-ws-action" data-ws-action="ted-1" onclick="pstWsActionOpen('ted-1')">
          <div class="pst-ws-action-main">
            <div class="pst-ws-action-title">TED urgjent · Stahlbauarbeiten</div>
            <div class="pst-ws-action-meta">Afati nesër · Ref: 700001-2026 · https://ted.europa.eu/en/notice/700001-2026/html</div>
          </div>
          <span class="pst-ws-action-controls"><button class="done">Kryer</button><button class="dismiss">Hiqe</button></span>
        </div>
        <div class="pst-ws-action" data-ws-action="unsafe">
          <div class="pst-ws-action-main"><div class="pst-ws-action-title">Jo burim</div><div class="pst-ws-action-meta">http://example.com/not-secure</div></div>
          <span class="pst-ws-action-controls"><button>Kryer</button><button>Hiqe</button></span>
        </div>
      </div>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://pppp.example/'});
  const w=dom.window,opened=[];
  w.open=(url,target,features)=>{opened.push({url,target,features});return null;};
  w.eval(source);
  const api=w.PSTTaskSourceActionsV1;
  assert(api,'Task source action API missing');
  assert.strictEqual(api.sourceUrl('x https://ted.europa.eu/en/notice/1/html.'),'https://ted.europa.eu/en/notice/1/html','HTTPS source extraction failed');
  assert.strictEqual(api.sourceUrl('http://ted.europa.eu/not-allowed'),'','HTTP source must never be exposed as source shortcut');
  assert.strictEqual(api.sourceUrl('javascript:alert(1)'),'','non-HTTPS scheme must never be exposed');
  const row=w.document.querySelector('[data-ws-action="ted-1"]'),originalOnclick=row.getAttribute('onclick'),done=row.querySelector('.done'),dismiss=row.querySelector('.dismiss');
  assert.strictEqual(api.enhanceRow(row),true,'TED action row was not enhanced');
  assert.strictEqual(row.getAttribute('onclick'),originalOnclick,'Existing action handler changed');
  assert.strictEqual(row.querySelector('.done'),done,'Existing complete action was replaced');
  assert.strictEqual(row.querySelector('.dismiss'),dismiss,'Existing dismiss action was replaced');
  row.querySelector('.pst-task-source-open').click();
  assert.deepStrictEqual(opened,[{url:'https://ted.europa.eu/en/notice/700001-2026/html',target:'_blank',features:'noopener,noreferrer'}],'Source button did not open the exact safe source');
  dom.window.close();

  const shellDom=new JSDOM(`<!doctype html><html><head></head><body>
    <aside id="app-sidebar"><div id="pst-v2-sidebar"><aside id="pst-ws-sidebar"><div class="pst-ws-brand"></div><div class="pst-ws-create"><button class="pst-ws-create-main">Krijo</button></div><div class="pst-ws-spacer"></div></aside></div></aside>
    <div class="topbar">legacy project toolbar</div><div id="modbar">legacy module bar</div><div class="rail"></div>
    <main class="content"><section id="page-kek-tenders" class="active"></section></main>
  </body></html>`,{runScripts:'outside-only',url:'https://pppp.example/'});
  const sw=shellDom.window;
  sw.eval(source);
  assert.strictEqual(sw.PSTTaskSourceActionsV1.stabilizeWorkspaceShell(),true,'Tender page was not recognized as a Workspace surface');
  assert.strictEqual(sw.PSTTaskSourceActionsV1.currentKey(),'tenders','Tender page did not map to Tenderat nav');
  assert(sw.document.querySelector('#pst-ws-canonical-nav [data-key="tenders"].active'),'Tenderat sidebar entry was not activated');
  const shellCss=sw.document.getElementById('pst-task-source-actions-v19-css').textContent;
  assert(shellCss.includes('#page-kek-tenders.active'),'Tender shell selector missing');
  assert(shellCss.includes('#page-finance.active'),'Finance shell selector missing');
  assert(shellCss.includes('#page-document-center.active'),'Document Center shell selector missing');
  assert(shellCss.includes('#module-hub.active'),'Modules legacy surface selector missing');
  assert(shellCss.includes('#modbar'),'Legacy module strip is not suppressed on canonical surfaces');
  shellDom.window.close();

  const contactDom=new JSDOM(`<!doctype html><html><head></head><body>
    <aside id="pst-ws-sidebar"><button class="pst-ws-navbtn" data-key="contacts">Kontaktet</button></aside>
    <main class="content"></main>
  </body></html>`,{runScripts:'outside-only',url:'https://pppp.example/'});
  const cw=contactDom.window;
  const calls=[];
  cw.supaFetch=async(path)=>{
    calls.push(path);
    if(path.startsWith('pppp_contact_master_v1?'))throw new Error('primary unavailable');
    if(path.startsWith('contacts?'))return [
      {id:'c1',kind:'client',company:'ACME',person:'Ana',email:'ana@acme.test',last_contact:'2026-08-21'},
      {id:'c2',kind:'supplier',company:'SteelCo',person:'Ben',email:'ben@steel.test',last_contact:'2026-08-20'}
    ];
    return [];
  };
  cw.eval(contacts);
  await cw.PSTContactMasterV1.open();
  assert.strictEqual(cw.PSTContactMasterV1.snapshot().length,2,'Contact fallback did not recover canonical contacts');
  assert(/2 kontakte/.test(cw.document.getElementById('pcm-count').textContent),'Recovered contacts are not visible in the UI');
  assert(calls.some(x=>x.startsWith('pppp_contact_master_v1?'))&&calls.some(x=>x.startsWith('contacts?')),'Contact Master did not use primary then safe fallback');
  assert(!/0 kontakte/.test(cw.document.getElementById('pcm-count').textContent),'Contact load failure was falsely rendered as zero contacts');
  contactDom.window.close();

  const errorDom=new JSDOM('<!doctype html><html><head></head><body><main class="content"></main></body></html>',{runScripts:'outside-only',url:'https://pppp.example/'});
  const ew=errorDom.window;
  ew.supaFetch=async()=>{throw new Error('offline');};
  ew.eval(contacts);
  await ew.PSTContactMasterV1.open();
  assert(/Kontaktet nuk u ngarkuan/.test(ew.document.getElementById('pcm-list').textContent),'Contact failures must be shown as errors, never as an empty database');
  errorDom.window.close();

  console.log('Workspace shell + source actions + Contact Master smoke: OK');
})().catch(err=>{console.error(err);process.exit(1);});
