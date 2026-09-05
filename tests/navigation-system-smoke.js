const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const homeSource=fs.readFileSync('pristeel-home-canonical-v1.js','utf8');
  const navSource=fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');
  const projectCapture=fs.readFileSync('pristeel-project-workflow-legacy-capture-v1.js','utf8');
  assert(!/findGlobalProjectStrip|pwf-global-project-strip|body:has\(#page-workspace-project\.active\)/.test(projectCapture),'Project layer may not hide outer application chrome');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="pst-ws-sidebar"><div class="pst-ws-brand"></div><button class="pst-ws-create" type="button">Krijo</button></div>
    <div id="app-shell"><div class="content">
      <button class="pst-ws-navbtn active" data-key="home">Home</button>
      <button class="pst-ws-navbtn" data-key="projects">Projektet</button>
      <div id="page-workspace-home" class="page active" style="display:block">
        <div class="pst-ws-card"><div class="pst-ws-card-title"></div><div class="pst-ws-card-sub"></div><div id="pst-ws-home-actions"></div></div>
        <div id="pst-ws-home-projects"></div>
      </div>
      <div id="page-workspace-projects" class="page" style="display:none"><div id="project-list">Projects loaded</div></div>
      <div id="page-workspace-project" class="page" style="display:none"><div id="project-loaded"></div></div>
      <div id="page-finance" class="page" style="display:none"><div class="card"><div id="fin-hub">Existing Finance records</div></div></div>
    </div></div>
    <span id="pst-ws-b-home"></span><span id="pst-ws-b-projects"></span><span id="pst-ws-b-finance"></span>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;w.console=console;w.scrollTo=()=>{};
  const waiting={id:'dukley',name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',client:'ITALIAN STYLE',status:'pritje',pipeline_stage:'client_offer',operational_state:'wait_for_client',operational_state_at:'2026-08-22T10:00:00Z',created_at:'2026-08-01T10:00:00Z'};
  const offer={id:25,project_id:'dukley',created_at:'2026-08-21T10:00:00Z',doc_nr:'PST-OFF-2026-08-025',offer_state:{pst_sent_at:'2026-08-21T11:00:00Z'}};
  w.supaFetch=async(path,method)=>{
    if(method)return [];
    if(String(path).startsWith('projects?'))return [waiting];
    if(String(path).startsWith('documents_registry?'))return [offer];
    if(String(path).startsWith('dashboard_action_states?'))return [];
    return [];
  };
  w.PSTHomeCommandCenterV2={decorate(){}};
  w.PSTDashboardTaskCardsV1={decorate(){}};
  w.PSTTaskSourceActionsV1={decorate(){}};
  w.PSTRedesignFinalizerV1={apply(){}};
  function activate(id){
    w.document.querySelectorAll('.page').forEach(p=>{p.classList.remove('active');p.style.display='none';});
    const p=w.document.getElementById(id);p.classList.add('active');p.style.display='block';return p;
  }
  const topCalls=[];
  w.pstWorkspaceGo=function(key){
    topCalls.push(String(key));
    if(key==='home'){activate('page-workspace-home');return true;}
    if(key==='projects'){activate('page-workspace-projects');return true;}
    /* Reproduce the production Finance regression: router reports success but leaves every content page hidden/inactive. */
    if(key==='finance')return true;
    return false;
  };
  let projectOpens=0;
  w.pstOpenProjectWorkspace=async function(id){
    projectOpens++;
    assert.strictEqual(String(id),'dukley');
    const p=activate('page-workspace-project');
    p.querySelector('#project-loaded').textContent='ITALIAN STYLE - Dukley';
    return true;
  };

  w.eval(homeSource);
  await w.PSTHomeCanonicalV1.render(true);

  const waitingItem=w.document.querySelector('#pst-home-waiting .pst-home-wait-item');
  assert(waitingItem,'Waiting project must render as an interactive Home item');
  waitingItem.click();
  const modal=w.document.getElementById('pst-project-brief-modal');
  assert(modal&&modal.classList.contains('open'),'Clicking a waiting project must open its project brief, not a blank route');
  const openProject=modal.querySelector('[data-brief-act="project"]');
  assert(openProject,'Project brief must contain Hap projektin');
  openProject.click();
  await new Promise(r=>w.setTimeout(r,0));
  assert.strictEqual(projectOpens,1,'Hap projektin must call the project workspace exactly once');
  assert(w.document.getElementById('page-workspace-project').classList.contains('active'),'Hap projektin must land on active Project Workspace');
  assert(w.document.getElementById('page-workspace-project').textContent.includes('Dukley'),'Project destination must not be blank');

  /* Canonical Home wraps top-level routing but must delegate every non-Home route. */
  w.pstWorkspaceGo('home');
  assert(w.document.getElementById('page-workspace-home').classList.contains('active'));
  w.pstWorkspaceGo('projects');
  assert(w.document.getElementById('page-workspace-projects').classList.contains('active'),'Projektet must leave Home and activate Projects');
  assert(!w.document.getElementById('page-workspace-home').classList.contains('active'),'Projektet must not leave Home active');
  assert(topCalls.includes('projects'),'Non-Home route must reach the original workspace router');

  /* Finance must verify the actual page, not infer success from the highlighted nav/router return value. */
  let financeRenders=0;
  w.finShowHub=function(){financeRenders++;w.document.getElementById('fin-hub').textContent='Existing Finance records restored';};
  w.eval(navSource);
  const financeOpened=w.PSTPrimaryNavResilienceV1.openFinance();
  assert.strictEqual(financeOpened,true,'Finance resilience route must report success after fallback activation');
  assert(!topCalls.includes('finance'),'Finance must bypass the decorated workspace router');
  assert(w.document.getElementById('page-finance').classList.contains('active'),'Finance fallback must activate the existing page-finance surface');
  assert.strictEqual(w.document.getElementById('page-finance').style.display,'block','Finance fallback must make the existing Finance page visible');
  assert(!w.document.getElementById('page-workspace-projects').classList.contains('active'),'Finance fallback must retire the previously active page');
  assert(financeRenders>=1,'Finance fallback must reuse the existing finShowHub renderer');
  assert(w.document.getElementById('fin-hub').textContent.includes('restored'),'Finance fallback must preserve and render the existing Finance hub rather than a replacement UI');

  dom.window.close();
  console.log('System navigation Home -> waiting -> project -> Projects -> Finance smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
