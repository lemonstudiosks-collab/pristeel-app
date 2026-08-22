const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
  const source=fs.readFileSync('pristeel-project-workflow-legacy-capture-v1.js','utf8');
  new Function(source);
  assert(!/MutationObserver|setInterval\s*\(/.test(source),'Legacy workflow capture must not observe or poll globally');
  assert(!/supaFetch\s*\(/.test(source),'Legacy workflow capture must remain UI-only');
  assert(!/findGlobalProjectStrip|pwf-global-project-strip|body:has\(#page-workspace-project\.active\)/.test(source),'Project cleanup must never discover/hide global ancestors');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="app-shell">
      <div id="global-strip"><button>Mbyll projektin</button><button>Ruaj</button><button>Projekt i ri</button><button>Eksporto</button></div>
      <div id="page-workspace-project" class="page active" data-pwf-area="overview" style="display:block">
        <div class="pst-pi-head"><div class="pst-pi-actions"><button class="pst-pi-btn">Projektet</button><button class="pst-pi-btn">Pamja e vjetër</button><button class="pst-pi-btn">Rifresko</button><button class="pst-pi-btn">Puno me projektin</button></div></div>
        <div id="legacy-ribbon"><button id="bom" class="flow-step" onclick="flowGoto('bom')">BOM</button><button id="offers" class="flow-step" onclick="flowGoto('offers')">Ofertat</button><button id="ranking" class="flow-step" onclick="flowGoto('ranking')">Krahasimi</button><button id="pricing" class="flow-step" onclick="flowGoto('kalkulator')">Çmimi</button><button id="client" class="flow-step" onclick="flowGoto('oferta')">Oferta jonë</button></div>
        <div id="pst-pi-body"><div class="pwf-project-context"></div><div class="pf2-grid"><section id="workflow-card" class="pf2-card"><header><b>Workflow</b></header><div>Project-first</div></section></div></div>
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
  w.pstOpenProjectWorkspace=async()=>true;
  w.flowGoto=()=>{throw new Error('legacy flowGoto must not win');};
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

  api.install();api.install();api.clean();

  const shell=w.document.getElementById('app-shell'),globalStrip=w.document.getElementById('global-strip');
  assert.strictEqual(shell.className,'','Project cleanup must never mark the app shell');
  assert.strictEqual(globalStrip.className,'','Project cleanup must never mark global action chrome');
  assert(!shell.hasAttribute('hidden')&&!globalStrip.hasAttribute('hidden'),'Project cleanup must never hide outer application nodes');
  assert(w.document.getElementById('legacy-ribbon').classList.contains('pwf-legacy-ribbon'),'Old project ribbon inside workspace must be marked for hiding');
  assert(w.document.getElementById('workflow-card').classList.contains('pwf-duplicate-workflow-card'),'Duplicate workflow card must be removed from canonical overview');
  assert.strictEqual(w.document.querySelectorAll('.pwf-header-clean-actions').length,1,'Canonical project header actions must be injected once');
  assert([...w.document.querySelectorAll('.pst-pi-actions>.pst-pi-btn')].every(x=>x.classList.contains('pwf-header-old-action')),'Legacy project header actions must be hidden only inside project header');

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

  const css=w.document.getElementById('pwf-legacy-capture-css');
  assert(css&&css.textContent.includes('pwf-legacy-ribbon'),'Legacy ribbon cleanup CSS must be installed');
  assert(!css.textContent.includes('body:has'),'Cleanup CSS must stay scoped to project workspace');
  dom.window.close();
  console.log('Project-local chrome + inline supplier detail smoke test passed.');
})();
