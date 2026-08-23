const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const navSrc=fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');
const finalizerSrc=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const happySrc=fs.readFileSync('pristeel-home-happy-v1.js','utf8');
assert.ok(!navSrc.includes('PSTRedesignFinalizerV1'),'Primary navigation must never re-enter the redesign finalizer');
assert.ok(!finalizerSrc.includes("s.src='pristeel-primary-nav-resilience-v1.js"),'Redesign finalizer must not dynamically preload primary navigation');
assert.ok(happySrc.includes('installNavigationStability'),'Cache-busted Home Happy runtime must install the live navigation guard');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="pst-ws-canonical-nav"><button class="pst-ws-navbtn" data-key="projects">Projects</button></div>
<div id="page-workspace-home" class="page active">
  <button class="pst-hog-tile" data-hog-act="">No urgent action</button>
  <button class="pst-hog-tile" data-hog-act="waiting">Waiting</button>
</div>
<div id="page-workspace-projects" class="page"><div class="pst-pm-page"><button data-pm-filter="waiting">Në pritje</button></div></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;
w.scrollTo=()=>{};
let projectLoads=0,waitingClicks=0,staleEnsureCalls=0;
w.__pstWorkspaceProjectRows=[];
w.pstProjectsModernOpen=()=>{projectLoads++;w.__pstWorkspaceProjectRows=[{id:'p1'}];const p=w.document.getElementById('page-workspace-projects');p.classList.add('active');p.style.display='block';return true;};
w.document.querySelector('[data-pm-filter="waiting"]').addEventListener('click',()=>waitingClicks++);
w.PSTOperatingAssistantV2={apply(){}};
w.PSTOperatingExperienceV1={apply(){}};
w.PSTHomeOperatingGridV1={render(){return true;}};
w.PSTProjectClassificationV1={decorate(){}};
w.PSTTenderPriorityActionsV1={wrapPromotion(){}};

w.eval(navSrc);
assert.ok(w.PSTPrimaryNavResilienceV1,'Primary navigation API missing');
w.PSTPrimaryNavResilienceV1.ensureAssistant=()=>{staleEnsureCalls++;return true;};
w.eval(happySrc);
assert.ok(w.__pstNavigationInteractionStabilityV1,'Live navigation stability guard missing');
w.PSTPrimaryNavResilienceV1.ensureAssistant();
assert.strictEqual(staleEnsureCalls,0,'Live guard must neutralize stale cached ensureAssistant recursion');

(async()=>{
  w.document.querySelector('[data-key="projects"]').click();
  assert.strictEqual(projectLoads,1,'Sidebar Projects must load the modern project register once');
  w.document.getElementById('page-workspace-home').classList.add('active');
  w.document.querySelector('.pst-hog-tile[data-hog-act=""]').click();
  assert.strictEqual(projectLoads,1,'Zero-state Home tile must reuse an already-loaded Projects page');
  w.document.getElementById('page-workspace-home').classList.add('active');
  w.document.querySelector('.pst-hog-tile[data-hog-act="waiting"]').click();
  await Promise.resolve();
  await new Promise(r=>setTimeout(r,5));
  assert.ok(waitingClicks>=1,'Waiting Home tile must route to the waiting project filter');
  console.log('Navigation interaction stability smoke test passed.');
  dom.window.close();
})().catch(err=>{console.error(err);process.exit(1);});
