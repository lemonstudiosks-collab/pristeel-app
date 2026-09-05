const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync('pristeel-operating-assistant-v2.js','utf8');

(async()=>{
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="pst-ws-canonical-nav"><button class="pst-business-primary active" data-key="home"></button></div>
    <div id="page-workspace-home" class="active" style="display:block"><div class="pst-ws-page"><div class="pst-ws-head"></div><div id="pst-bcc"></div>
      <section class="pst-ws-card"><div id="pst-ws-home-actions"><div class="pst-canonical-action" data-ws-action="a1"><button class="pst-ws-action-open">Vepro</button></div></div></section>
      <section id="pst-home-waiting"></section>
      <section class="pst-ws-card"><div id="pst-ws-home-projects"></div></section>
    </div></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window,writes=[];let canonicalClicks=0,confirms=0;
  w.confirm=()=>{confirms++;return true;};
  w.document.querySelector('.pst-ws-action-open').onclick=()=>canonicalClicks++;
  w.PSTHomeCanonicalV1={snapshot:()=>({
    actions:[{key:'a1',title:'Finalizo çështjet teknike para ofertës',why:'Ka sqarime teknike të hapura.',tag:'VONUAR',source:'project_decision_auto',project_id:'p1'},{key:'a2',title:'Kontrollo dokumentet',why:'Dokument i ri.',source:'document_bom_review',project_id:'p2'}],
    waiting:[{project_id:'p2',name:'Dukley',text:'Përgjigjja e klientit'}],
    projects:[{row:{id:'p1',name:'PROJEKT TENNET · SPIE',client:'SPIE'}},{row:{id:'p2',name:'Dukley',client:'Italian Style'}}]
  })};
  w.supaFetch=async(path,method,body)=>{
    if(method){writes.push({path,method,body});return[];}
    if(path.startsWith('project_emails?'))return[
      {id:1,gmail_message_id:'g1',project_id:'p1',subject:'Erection scope – substation steel structures in Germany',direction:'outgoing',sent_at:new Date().toISOString(),match_method:'manual-review',match_confidence:100},
      {id:2,gmail_message_id:'g2',project_id:null,subject:'New erection request',direction:'outgoing',sent_at:new Date().toISOString(),match_method:'server-ingest-unmatched-v1',match_confidence:0}
    ];
    return[];
  };
  w.eval(code);
  const api=w.PSTOperatingAssistantV2;
  assert(api,'Operating Assistant API missing');
  await api.renderHome(true);
  const home=w.document.getElementById('pst-operating-home-v2');
  assert(home,'Simplified Home was not rendered');
  assert(home.textContent.includes('Finalizo çështjet teknike para ofertës'),'Highest-priority action must dominate Home');
  assert(home.textContent.includes('Kontrollo çështjen'),'Hero CTA must be specific, not generic Vepro');
  assert(home.textContent.includes('PPPP PA DHE REGJISTROI'),'PPPP acknowledgement feed missing');
  assert(home.textContent.includes('e lidhi me PROJEKT TENNET · SPIE'),'Linked email acknowledgement missing');
  assert(home.textContent.includes('nuk arriti ta lidhë me një projekt'),'Unlinked email must be surfaced instead of silently disappearing');
  assert.strictEqual(writes.length,0,'Home acknowledgement rendering must be read-only');
  assert(w.document.querySelector('#pst-ws-home-actions').closest('.pst-ws-card').classList.contains('pst-oa-hidden-legacy'),'Legacy Home action rectangle must be hidden');
  home.querySelector('[data-oa-main-action]').click();
  assert.strictEqual(canonicalClicks,1,'Custom hero action must delegate to the canonical action behavior');

  w.localStorage.setItem('pristeel_unsaved_1',JSON.stringify({path:'tasks?id=eq.1',method:'PATCH',body:{status:'open'}}));
  w.recoverUnsavedWork=function(){w.confirm('legacy');};
  api.installRecoveryOverride();
  w.recoverUnsavedWork();
  assert.strictEqual(confirms,0,'Legacy browser confirm must never run');
  assert(w.document.getElementById('pst-oa-recovery'),'Unsaved work must appear as a non-blocking in-app banner');
  assert(w.document.getElementById('pst-oa-recovery').textContent.includes('Asgjë nuk fshihet'),'Recovery banner must explain safety');
  dom.window.close();

  const opp=new JSDOM(`<!doctype html><html><head></head><body><div id="page-kek-tenders" class="active" style="display:block"><h1>Tenderat e çelikut</h1><p>Long explanation for public tender monitor and market intelligence results.</p><input><select></select><select></select><select></select><select></select></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  opp.window.eval(code);opp.window.PSTOperatingAssistantV2.apply(false);
  assert.strictEqual(opp.window.document.querySelector('h1').textContent,'Mundësi për PRISTEEL','Opportunities title must use the business-language label');
  assert.strictEqual(opp.window.document.querySelectorAll('.pst-oa-advanced-filter').length,2,'Only advanced Opportunity filters should be collapsed');
  opp.window.close();

  const finance=new JSDOM(`<!doctype html><html><head></head><body><div id="page-finance" class="page active" style="display:block"><div id="fin-hub" class="card">Core finance tools</div></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  finance.window.eval(code);
  const financePage=finance.window.document.getElementById('page-finance');
  assert.strictEqual(financePage.hasAttribute('data-pst-oa-compact'),false,'Finance core must remain fail-open before the compact owner renders');
  finance.window.PSTOperatingAssistantV2.apply(false);
  assert(finance.window.document.getElementById('pst-oa-finance-home'),'Compact Finance owner was not rendered');
  assert.strictEqual(financePage.getAttribute('data-pst-oa-compact'),'finance','Finance core may be hidden only after its compact owner exists');
  finance.window.document.querySelector('.pst-oa-show-all-finance').click();
  assert.strictEqual(financePage.hasAttribute('data-pst-oa-compact'),false,'Expanding Finance must reveal the existing core tools');
  assert(!code.includes('#page-finance:not(.pst-oa-finance-expanded)>*:not(#pst-oa-finance-home)'),'Unsafe hide-before-render Finance selector must stay retired');
  finance.window.close();

  const system=new JSDOM(`<!doctype html><html><head></head><body><div id="page-workspace-apps" class="page active" style="display:block"><div class="card">Core system tools</div></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  system.window.PSTOperatingExperienceV1={currentZone:()=> 'apps'};
  system.window.eval(code);
  const systemPage=system.window.document.getElementById('page-workspace-apps');
  assert.strictEqual(systemPage.hasAttribute('data-pst-oa-compact'),false,'System core must remain fail-open before the compact owner renders');
  system.window.PSTOperatingAssistantV2.apply(false);
  assert(system.window.document.getElementById('pst-oa-system-home'),'Apps route must render the compact System owner');
  assert.strictEqual(systemPage.getAttribute('data-pst-oa-compact'),'system','System core may be hidden only after its compact owner exists');
  system.window.document.querySelector('.pst-oa-show-all-system').click();
  assert.strictEqual(systemPage.hasAttribute('data-pst-oa-compact'),false,'Expanding System must reveal the existing core tools');
  system.window.close();

  console.log('PPPP Operating Assistant v2 smoke: OK');
})().catch(e=>{console.error(e);process.exit(1);});
