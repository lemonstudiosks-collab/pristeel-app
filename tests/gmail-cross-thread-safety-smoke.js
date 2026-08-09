const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-gmail-cross-thread-safety-v1.js','utf8');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source),'Cross-thread safety must not poll or globally observe');
  assert(!/PSTEmail\.auth|requestAccessToken|accounts\.oauth2/.test(source),'Cross-thread safety must not trigger OAuth');
  assert(!/project_emails[^?]*[\"']\s*,\s*[\"'](?:POST|PATCH|DELETE)/.test(source),'Safety layer must not write email relations');

  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.supaFetch=async path=>{
    if(path.startsWith('projects?'))return[{id:'p1',name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',client:'ITALIAN STYLE',ref:'',location:'Budva'}];
    if(path.startsWith('project_contacts?'))return[{email:'sectorconstruction20@gmail.com'},{email:'aleksandarcigelic@gmail.com'}];
    return[];
  };
  w.pstCollectProjectGmail=function(){
    w.document.body.innerHTML=`<div id="pgc-bg">
      <div class="pgc-status" id="pgc-status"></div>
      <label class="pgc-row"><input class="pgc-thread" type="checkbox" checked><span class="pgc-main">Fwd: Dukley Seafront Restoran / Zahtjev za ponudu <span class="pgc-meta">sectorconstruction20@gmail.com</span></span><span class="pgc-score">100%</span></label>
      <label class="pgc-row"><input class="pgc-thread" type="checkbox" checked><span class="pgc-main">Re: Zahtjev za ponudu - Salla Sportive Andrijevica <span class="pgc-meta">italianstyle.ks@gmail.com</span></span><span class="pgc-score">100%</span></label>
      <label class="pgc-row"><input class="pgc-thread" type="checkbox" checked><span class="pgc-main">Restauranti Budva - Marko <span class="pgc-meta">sectorconstruction20@gmail.com</span></span><span class="pgc-score">48%</span></label>
      <label class="pgc-row"><input class="pgc-thread" type="checkbox" checked><span class="pgc-main">Notification Italian Style / Andrijevica follow-up</span><span class="pgc-score">36%</span></label>
      <label class="pgc-att-row"><input class="pgc-attachment" type="checkbox" checked></label>
      <button id="pgc-import">Lidhi dhe importo skedarët</button><button id="pgc-link">Lidhi vetëm emailat</button><button id="pgc-all-threads">Zgjidh të gjitha</button><button id="pgc-latest-files">Vetëm versionet e fundit</button><button id="pgc-search">Kërko përsëri</button>
    </div>`;
  };
  w.eval(source);
  w.pstCollectProjectGmail('p1');
  await new Promise(r=>setTimeout(r,550));
  const rows=[...w.document.querySelectorAll('.pgc-row')];
  assert.strictEqual(rows[0].querySelector('.pgc-thread').checked,true,'Dukley thread should auto-select');
  assert.strictEqual(rows[1].querySelector('.pgc-thread').checked,false,'Andrijevica sibling project must not auto-select');
  assert.strictEqual(rows[2].querySelector('.pgc-thread').checked,true,'Sector Budva email should auto-select from Budva anchor + project contact');
  assert.strictEqual(rows[3].querySelector('.pgc-thread').checked,false,'Generic notification must not auto-select');
  const att=w.document.querySelector('.pgc-attachment');
  assert.strictEqual(att.checked,false,'Cross-thread attachments must start unchecked');
  assert.strictEqual(att.disabled,true,'Cross-thread attachments must be disabled until emails are linked');
  assert.strictEqual(w.document.getElementById('pgc-import').disabled,true,'Cross-thread file import must be blocked');
  assert.strictEqual(w.document.getElementById('pgc-link').textContent,'Lidhi emailat e zgjedhur');
  assert(rows[2].textContent.includes('Përputhje projekti'),'Strong-match explanation should be visible');
  dom.window.close();
  console.log('Gmail cross-thread safety smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
