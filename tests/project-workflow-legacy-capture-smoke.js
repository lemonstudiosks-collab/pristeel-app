const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-workflow-legacy-capture-v1.js','utf8');
  new Function(source);
  assert(!/MutationObserver|setInterval\s*\(/.test(source),'Legacy workflow capture must not observe or poll globally');
  assert(!/supaFetch\s*\(/.test(source),'Legacy workflow capture must remain UI-only');
  assert(!/findGlobalProjectStrip|pwf-global-project-strip|body:has\(#page-workspace-project\.active\)/.test(source),'Project cleanup must never discover/hide global ancestors');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="app-shell">
      <div id="global-strip"><button>Mbyll projektin</button><button>Ruaj</button><button>Projekt i ri</button><button>Eksporto</button></div>
      <div id="flow-bar"><button id="global-client" class="flow-step" onclick="flowGoto('oferta')">Oferta jonë</button></div>
      <div id="page-oferta" class="page" style="display:none"><div id="pfb-wrap-oferta">Generic file bucket</div></div>
      <div id="page-workspace-project" class="page active" data-pwf-area="overview" style="display:block">
        <div class="pst-pi-head"><div class="pst-pi-actions"><button class="pst-pi-btn">Projektet</button><button class="pst-pi-btn">Pamja e vjetër</button><button class="pst-pi-btn">Rifresko</button><button class="pst-pi-btn">Puno me projektin</button></div></div>
        <div id="legacy-ribbon"><button id="bom" class="flow-step" onclick="flowGoto('bom')">BOM</button><button id="offers" class="flow-step" onclick="flowGoto('offers')">Ofertat</button><button id="ranking" class="flow-step" onclick="flowGoto('ranking')">Krahasimi</button><button id="pricing" class="flow-step" onclick="flowGoto('kalkulator')">Çmimi</button><button id="client" class="flow-step" onclick="flowGoto('oferta')">Oferta jonë</button></div>
        <div id="pst-pi-body"><section class="pwf-project-context"><div class="pwf-project-main">Project identity</div><div class="pwf-project-kpis"><span>RFQ 2</span><span>Skedarë 18</span></div><button class="pwf-next">Next action</button></section><div class="pf2-grid"><section id="workflow-card" class="pf2-card"><header><b>Workflow</b></header><div>Project-first</div></section></div></div>
        <table><tbody><tr><td><button id="sector-detail" data-pf2-offer-detail="1">Detaje</button></td></tr><tr id="sector-row" class="pf2-detail-row" data-pf2-offer-detail-row="1" hidden><td>Sector Construction breakdown</td></tr></tbody></table>
      </div>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstCurrentProjectId='p1';
  w._curProjId='p1';
  w.__pstIntegrityLastData={project:{id:'p1',name:'Dukley'}};
  const calls=[];
  w.PSTCanonicalProjectWorkflowV1={render:(area,stage)=>{calls.push([area,stage]);return true;}};
  w.pstOpenProjectWorkspace=async(id)=>{calls.push(['open-project',id]);return true;};
  w.flowGoto=()=>{throw new Error('legacy flowGoto must not win for captured routes');};
  w.pstWorkspaceGo=(key)=>{calls.push(['workspace',key]);return true;};
  w.pstPiOld=()=>calls.push(['legacy','old']);
  w.HTMLElement.prototype.scrollIntoView=function(){};

  w.eval(source);
  const api=w.PSTProjectWorkflowLegacyCaptureV1;
  assert(api,'Legacy capture API must be installed');
  assert.strictEqual(JSON.stringify(api.destination('offers')),JSON.stringify(['procurement','offers']));
  assert.strictEqual(JSON.stringify(api.destination('ranking')),JSON.stringify(['procurement','comparison']));
  assert.strictEqual(JSON.stringify(api.destination('kalkulator')),JSON.stringify(['procurement','pricing']));
  assert.strictEqual(JSON.stringify(api.destination('oferta')),JSON.stringify(['procurement','client_offer']));
  assert.strictEqual(api._test.globalClientOfferStep(w.document.getElementById('global-client'),'oferta'),true,'Global legacy Oferta jone step must be recognized as the one safe global interception');
  assert.strictEqual(api._test.globalClientOfferStep(w.document.getElementById('client'),'oferta'),false,'Workspace-local offer step must use the normal local capture path');

  api.install();api.install();api.clean();

  const shell=w.document.getElementById('app-shell'),globalStrip=w.document.getElementById('global-strip');
  assert.strictEqual(shell.className,'','Project cleanup must never mark the app shell');
  assert.strictEqual(globalStrip.className,'','Project cleanup must never mark global action chrome');
  assert(!shell.hasAttribute('hidden')&&!globalStrip.hasAttribute('hidden'),'Project cleanup must never hide outer application nodes');
  assert(w.document.getElementById('legacy-ribbon').classList.contains('pwf-legacy-ribbon'),'Old project ribbon inside workspace must be marked for hiding');
  assert(w.document.getElementById('workflow-card').classList.contains('pwf-duplicate-workflow-card'),'Duplicate workflow card must be removed from canonical overview');
  assert.strictEqual(w.document.querySelectorAll('.pwf-header-clean-actions').length,1,'Canonical project header actions must be injected once');
  assert([...w.document.querySelectorAll('.pst-pi-actions>.pst-pi-btn')].every(x=>x.classList.contains('pwf-header-old-action')),'Legacy project header actions must be hidden only inside project header');
  assert.strictEqual(w.document.querySelector('[data-pwf-clean-action="old"]'),null,'Old view must not be offered in daily Project Workspace chrome');
  assert.strictEqual(w.document.querySelectorAll('.pwf-header-clean-actions [data-pwf-clean-action]').length,4,'Daily project header must contain only Projects, new project, export and close actions');

  ['bom','offers','ranking','pricing','client'].forEach(id=>w.document.getElementById(id).removeAttribute('onclick'));
  w.document.getElementById('offers').click();
  w.document.getElementById('ranking').click();
  w.document.getElementById('pricing').click();
  w.document.getElementById('client').click();
  assert.deepStrictEqual(calls.slice(0,4),[
    ['procurement','offers'],['procurement','comparison'],['procurement','pricing'],['procurement','client_offer']
  ],'Old ribbon stages must land exactly once in canonical project flow');

  const beforeDetailCalls=calls.length;
  const detail=w.document.getElementById('sector-detail'),row=w.document.getElementById('sector-row');
  detail.click();
  assert.strictEqual(row.hidden,false,'Supplier Detaje must expand inline');
  assert.strictEqual(detail.textContent,'Mbyll');
  assert.strictEqual(detail.getAttribute('aria-expanded'),'true');
  assert.strictEqual(calls.length,beforeDetailCalls,'Supplier Detaje must not navigate or rerender project');
  detail.click();
  assert.strictEqual(row.hidden,true,'Supplier detail must close inline');
  assert.strictEqual(detail.textContent,'Detaje');

  const back=w.document.querySelector('[data-pwf-clean-action="projects"]');
  back.click();
  assert(calls.some(x=>x[0]==='workspace'&&x[1]==='projects'),'Project back action must call top-level Projects route');

  const projectPage=w.document.getElementById('page-workspace-project');
  projectPage.classList.remove('active');projectPage.style.display='none';
  const legacyOfferPage=w.document.getElementById('page-oferta');
  legacyOfferPage.classList.add('active');legacyOfferPage.style.display='block';
  const beforeGlobal=calls.length;
  w.document.getElementById('global-client').click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepStrictEqual(calls.slice(beforeGlobal,beforeGlobal+2),[
    ['open-project','p1'],['procurement','client_offer']
  ],'Global Oferta jone step must open the project and land in canonical client-offer flow, not the file bucket');

  const css=w.document.getElementById('pwf-legacy-capture-css');
  assert(css&&css.textContent.includes('pwf-legacy-ribbon'),'Legacy ribbon cleanup CSS must be installed');
  assert(css.textContent.includes('.pwf-project-kpis{display:none!important}'),'Passive Project Workspace KPI counters must be hidden from daily work');
  assert(css.textContent.includes('.pwf-project-context{grid-template-columns:minmax(0,1fr) minmax(280px,420px)!important}'),'Project identity and next action must own the context bar');
  assert(!css.textContent.includes('body:has'),'Cleanup CSS must stay scoped to project workspace');
  assert.strictEqual(api.proxy('old'),true,'Legacy view fallback must remain technically reachable for compatibility even when removed from daily UI');
  assert(calls.some(x=>x[0]==='legacy'&&x[1]==='old'),'Legacy fallback must not be deleted');
  dom.window.close();
  console.log('Project-local calm chrome + fallback safety + canonical routing smoke test passed.');
})().catch(err=>{console.error(err);process.exit(1);});