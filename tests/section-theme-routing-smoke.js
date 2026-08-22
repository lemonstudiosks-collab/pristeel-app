const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-section-theme-v1.js','utf8');
  const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
  const contactCards=fs.readFileSync('pristeel-contact-category-cards-v1.js','utf8');

  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source),'Section theme must not observe or poll the page');
  assert(!/supaFetch\s*\(|fetch\s*\(|new\s+XMLHttpRequest/.test(source),'Section theme must not read or write business data');
  assert(finalizer.includes("pristeel-section-theme-v1.js?v=20260822-2"),'UI finalizer does not load the current section theme');
  assert(finalizer.includes("pristeel-contact-category-cards-v1.js?v=20260822-1"),'UI finalizer does not load Contact Master category cards');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(contactCards),'Contact category cards must stay bounded and observer-free');
  assert(!/insert|update|delete|patch/i.test(contactCards.replace(/manufacturerLoaded|updateCards/g,'')),'Contact category cards must remain read-only');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <aside id="pst-ws-sidebar">
      <button class="pst-ws-navbtn" data-key="home">Home</button>
      <button class="pst-ws-navbtn" data-key="finance">Financa</button>
      <button class="pst-ws-navbtn" data-key="apps">Modulet</button>
    </aside>
    <main class="content">
      <section id="page-workspace-home" class="active"></section>
      <section id="page-workspace-apps"></section>
    </main>
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

  const apps=w.document.querySelector('[data-key="apps"]');
  apps.addEventListener('click',()=>{
    w.document.getElementById('page-workspace-home').classList.remove('active');
    w.document.getElementById('page-workspace-apps').classList.add('active');
  });
  apps.click();
  await new Promise(resolve=>w.setTimeout(resolve,120));
  assert.strictEqual(w.document.body.dataset.pstSection,'apps','Sidebar navigation did not preserve the Modules visual family after the route changed pages');
  dom.window.close();

  const contactDom=new JSDOM(`<!doctype html><html><head></head><body>
    <section id="page-workspace-contacts" class="active" style="display:block">
      <div class="pcm-toolbar">
        <label><span>Kërko</span><input id="pcm-search"></label>
        <label><span>Roli</span><select id="pcm-kind"><option value="">Të gjithë</option><option value="client">Klient / Lead</option><option value="supplier">Furnitorë</option></select></label>
        <label><span>Burimi</span><select id="pcm-source"><option value="">Të gjitha</option></select></label>
      </div>
      <small id="pcm-count"></small>
      <table><tbody>
        <tr data-pcm-id="c1"><td>A</td><td><small>Klient / Lead</small></td></tr>
        <tr data-pcm-id="c2"><td>B</td><td><small>Furnitor</small></td></tr>
        <tr data-pcm-id="c3"><td>C</td><td><small>Furnitor</small></td></tr>
      </tbody></table>
    </section>
  </body></html>`,{runScripts:'outside-only',url:'https://pppp.example/'});
  const cw=contactDom.window;
  const contactRows=[
    {contact_id:'c1',kind:'client',company:'Buyer GmbH'},
    {contact_id:'c2',kind:'supplier',company:'Makstil'},
    {contact_id:'c3',kind:'supplier',company:'Other Steel'}
  ];
  cw.PSTContactMasterV1={state:{rows:contactRows,filtered:contactRows.slice()}};
  cw.supaFetch=async()=>[{name:'Makstil',aliases:['Makstil AD'],relation:['supplier','manufacturer']}];
  const kind=cw.document.getElementById('pcm-kind');
  kind.addEventListener('change',()=>{
    const v=kind.value;
    cw.PSTContactMasterV1.state.filtered=v?contactRows.filter(r=>r.kind===v):contactRows.slice();
    cw.document.querySelectorAll('[data-pcm-id]').forEach(tr=>{tr.style.display='';});
  });
  cw.eval(contactCards);
  cw.PSTContactCategoryCardsV1.decorate();
  await new Promise(resolve=>cw.setTimeout(resolve,60));
  cw.PSTContactCategoryCardsV1.decorate();

  const cards=[...cw.document.querySelectorAll('[data-pcm-business]')];
  assert.deepStrictEqual(cards.map(b=>b.querySelector('span').textContent),['Të gjithë','Klient / Lead','Furnitorë','Prodhues'],'Business categories are not in the requested direct-card order');
  assert(cw.document.getElementById('pcm-search').closest('label').classList.contains('pcm-search-compact'),'Search box was not reduced to compact width');
  assert(kind.closest('label').classList.contains('pcm-kind-hidden'),'Legacy role dropdown is still visible');
  const manufacturer=cards.find(b=>b.dataset.pcmBusiness==='manufacturer');
  assert.strictEqual(manufacturer.querySelector('b').textContent,'1','Manufacturer card count does not use partner manufacturer relation');
  manufacturer.click();
  await new Promise(resolve=>cw.setTimeout(resolve,50));
  assert.strictEqual(cw.document.querySelector('[data-pcm-id="c1"]').style.display,'none','Client row leaked into manufacturer filter');
  assert.strictEqual(cw.document.querySelector('[data-pcm-id="c2"]').style.display,'','Confirmed manufacturer was hidden');
  assert.strictEqual(cw.document.querySelector('[data-pcm-id="c3"]').style.display,'none','Non-manufacturer supplier leaked into manufacturer filter');
  assert(/^1 kontakte/.test(cw.document.getElementById('pcm-count').textContent),'Manufacturer filtered count was not updated');
  assert(cw.document.querySelector('[data-pcm-id="c2"] td:nth-child(2) small').textContent.includes('Prodhues'),'Manufacturer relationship is not visible on the contact row');
  contactDom.window.close();

  console.log('Section theme + Contact Master category cards smoke: OK');
})().catch(err=>{console.error(err);process.exitCode=1;});
