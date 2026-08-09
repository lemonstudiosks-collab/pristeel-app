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
    if(path.startsWith('project_email_links?'))return[{gmail_thread_id:'t1'}];
    if(path.startsWith('project_emails?'))return[];
    return[];
  };
  w.PSTEmail={
    map:async function(){await new Promise(r=>setTimeout(r,650));return[];}
  };
  function renderCollector(){
    w.document.body.innerHTML=`<div id="pgc-bg">
      <div class="pgc-status" id="pgc-status"></div>
      <label class="pgc-row"><input class="pgc-thread" type="checkbox" value="t1" checked><span class="pgc-main">Fwd: Dukley Seafront Restoran / Zahtjev za ponudu <span class="pgc-meta">sectorconstruction20@gmail.com</span></span><span class="pgc-score">100%</span></label>
      <label class="pgc-row"><input class="pgc-thread" type="checkbox" value="t2" checked><span class="pgc-main">Re: Zahtjev za ponudu - Salla Sportive Andrijevica <span class="pgc-meta">italianstyle.ks@gmail.com</span></span><span class="pgc-score">100%</span></label>
      <label class="pgc-row"><input class="pgc-thread" type="checkbox" value="t3" checked><span class="pgc-main">You have been made the Deal owner of Italian Style — Salla Sportive Andrijevica <span class="pgc-meta">noreply@notifications.hubspot.com</span></span><span class="pgc-score">86%</span></label>
      <label class="pgc-row"><input class="pgc-thread" type="checkbox" value="t4" checked><span class="pgc-main">Restauranti Budva - Marko <span class="pgc-meta">sector.construction20@gmail.com</span></span><span class="pgc-score">48%</span></label>
      <label class="pgc-row"><input class="pgc-thread" type="checkbox" value="t5" checked><span class="pgc-main">Notification Italian Style / Andrijevica follow-up</span><span class="pgc-score">36%</span></label>
      <label class="pgc-att-row"><input class="pgc-attachment" type="checkbox" checked></label>
      <button id="pgc-import">Lidhi dhe importo skedarët</button><button id="pgc-link">Lidhi vetëm emailat</button><button id="pgc-all-threads">Zgjidh të gjitha</button><button id="pgc-latest-files">Vetëm versionet e fundit</button><button id="pgc-search">Kërko përsëri</button>
    </div>`;
  }
  let collectorCalls=0;
  w.pstCollectProjectGmail=function(){
    collectorCalls++;
    w.PSTEmail.map([],5,()=>{}).then(renderCollector);
  };
  w.eval(source);
  assert.strictEqual(w.PSTGmailCrossThreadSafetyV1.emailKey('sector.construction20@gmail.com'),'sectorconstruction20@gmail.com','Gmail dots must normalize');
  assert.strictEqual(w.PSTGmailCrossThreadSafetyV1.emailKey('sector.construction20+rfq@gmail.com'),'sectorconstruction20@gmail.com','Gmail plus aliases must normalize');
  assert.strictEqual(w.PSTGmailCrossThreadSafetyV1.emailKey('first.last@example.com'),'first.last@example.com','Dots on non-Gmail domains must be preserved');
  assert(w.PSTGmailCrossThreadSafetyV1.canonicalEmailText('x sector.construction20@gmail.com y').includes('sectorconstruction20@gmail.com'),'Canonical row text must normalize Gmail dots');

  const safeCollector=w.pstCollectProjectGmail;
  safeCollector('p1');
  await new Promise(r=>setTimeout(r,850));
  const rows=[...w.document.querySelectorAll('.pgc-row')];
  assert.strictEqual(rows.length,5,'Delayed collector render should complete');
  assert.strictEqual(rows[0].querySelector('.pgc-thread').checked,false,'Already-linked Dukley thread must not be selected again');
  assert.strictEqual(rows[0].querySelector('.pgc-thread').disabled,true,'Already-linked thread must be disabled');
  assert(rows[0].textContent.includes('Tashmë i lidhur'),'Already-linked explanation should be visible');
  assert.strictEqual(rows[1].querySelector('.pgc-thread').checked,false,'Andrijevica sibling project must not auto-select');
  assert.strictEqual(rows[2].querySelector('.pgc-thread').checked,false,'HubSpot sibling-project notification must not auto-select');
  const dbg=w.PSTGmailCrossThreadSafetyV1.debug(rows[3]);
  assert.strictEqual(dbg.result.strong,true,'Sector debug mismatch: '+JSON.stringify(dbg));
  assert.strictEqual(rows[3].querySelector('.pgc-thread').checked,true,'Sector Budva email should auto-select from Budva anchor + Gmail-equivalent project contact');
  assert.strictEqual(rows[4].querySelector('.pgc-thread').checked,false,'Generic notification must not auto-select');
  const att=w.document.querySelector('.pgc-attachment');
  assert.strictEqual(att.checked,false,'Cross-thread attachments must start unchecked');
  assert.strictEqual(att.disabled,true,'Cross-thread attachments must be disabled until emails are linked');
  assert.strictEqual(w.document.getElementById('pgc-import').disabled,true,'Cross-thread file import must be blocked');
  assert.strictEqual(w.document.getElementById('pgc-link').textContent,'Lidhi emailat e zgjedhur');
  assert(rows[3].textContent.includes('Përputhje projekti'),'Strong-match explanation should be visible');

  let recoveryCalls=0;
  function recovery(){recoveryCalls++;}
  w.pstRecoverLinkedProjectGmail=recovery;
  w.pstCollectProjectGmail=recovery;
  assert.strictEqual(w.PSTGmailCrossThreadSafetyV1.install(),false,'Safety layer must not wrap linked-email recovery');
  safeCollector('p1');
  await new Promise(r=>setTimeout(r,850));
  assert.strictEqual(collectorCalls,2,'Saved fallback wrapper must still call the original Gmail collector');
  assert.strictEqual(recoveryCalls,0,'Saved fallback wrapper must never bounce back into linked-email recovery');

  dom.window.close();
  console.log('Gmail cross-thread safety smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});