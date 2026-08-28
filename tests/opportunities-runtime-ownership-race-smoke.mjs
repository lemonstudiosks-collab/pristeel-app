import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const read=name=>fs.readFileSync(name,'utf8');
const sources={
  kek:read('pristeel-kek-tender-watch-v1.js'),
  business:read('pristeel-tender-business-flow-v1.js'),
  navigation:read('pristeel-primary-nav-resilience-v1.js'),
  finalizer:read('pristeel-redesign-finalizer-v1.js'),
  projectCentric:read('pristeel-project-centric-workflow-v1.js'),
  dailyZones:read('pristeel-daily-zones-cleanup-v1.js'),
  opportunitiesDaily:read('pristeel-opportunities-daily-v1.js')
};

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="pst-ws-canonical-nav"><button class="pst-ws-navbtn" data-key="home">Home</button><button class="pst-ws-navbtn" data-key="tenders">Opportunities</button></div>
<main class="content"><section id="page-workspace-home" class="page active" style="display:block"></section></main>
</body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});

const {window}=dom;
const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
const row={id:'race-1',title:'Furnizim dhe montim konstruksioni metalik',authority:'Autoriteti kontraktues',procurement_no:'KRPP-RACE-1',relevance_score:96,status:'new',published_date:'2026-08-27',deadline:'2026-09-10',category:'steel_structure',match_reasons:['konstruksion metalik'],payload:{source:'KRPP',notice_phase:'opportunity',capability_fit:'strong'}};

window.console=console;window.scrollTo=()=>{};window.alert=()=>{};window.confirm=()=>false;window.open=()=>{};
window.CSS=window.CSS||{};window.CSS.escape=window.CSS.escape||String;
window.pageMeta={};window.PAGE_NAV={};window.PAGE_ICON={};window.MODULES=[];
window.supaFetch=async path=>String(path).startsWith('kek_tender_watch?')?[row]:[];

// Keep unrelated finalizer owners present so this fixture isolates the real Opportunities chain.
window.PSTPlatformReadabilityV1={apply(){}};window.PSTSectionThemeV1={apply(){}};window.PSTOperatingExperienceV1={apply(){}};
window.PSTOperatingAssistantV2={apply(){}};window.PSTOpenAIAssistantV1={apply(){}};window.PSTContactCategoryCardsV1={decorate(){}};
window.PSTProjectControlHomeV1={apply(){}};window.__pstLiveHomeV6=true;window.PSTHomeLiveSyncV1={refresh(){}};
window.PSTTenderDossierAnalysisV1={apply(){},isReady(){return false;}};window.__pstTenderDossierAnalysisV3=true;
window.PSTHomeOperatingGridV1={render(){}};window.PSTProjectClassificationV1={decorate(){}};
window.PSTOfferRevisionEmailDraftV1={};window.PSTOfferRevisionEmailBridgeV1={};window.PSTProjectOfferRevisionAssistantV1={inject(){}};

// Simulate browser dynamic loading with the production ordering hazard: final helpers arrive
// after navigation, Project-Centric claims ownership, then Opportunities Daily arrives later.
const nativeAppend=window.document.head.appendChild.bind(window.document.head);
window.document.head.appendChild=node=>{
  const added=nativeAppend(node);if(node.tagName!=='SCRIPT')return added;
  const src=String(node.getAttribute('src')||'');let delay=0,code='';
  if(src.includes('pristeel-daily-zones-cleanup-v1.js')){delay=120;code=sources.dailyZones;}
  else if(src.includes('pristeel-project-centric-workflow-v1.js')){delay=360;code=sources.projectCentric;}
  else if(src.includes('pristeel-opportunities-daily-v1.js')){delay=520;code=sources.opportunitiesDaily;}
  if(code)window.setTimeout(()=>{window.eval(code);if(typeof node.onload==='function')node.onload();},delay);
  return added;
};

// Production base-loader order: tender engines exist before finalizer/navigation settle.
window.eval(sources.kek);await wait(10);window.eval(sources.business);window.eval(sources.navigation);window.eval(sources.finalizer);

// Enter through canonical navigation while the final owner is still delayed.
window.document.querySelector('[data-key="tenders"]').click();
await wait(2400);

// Attempt reclamation through every legacy entry point and their delayed retries, then navigate again.
window.pstWsKekTenders();window.pstTenderBizOpenMonitor();await Promise.resolve(window.pstKekLoad());window.pstKekRender();
window.document.querySelector('[data-key="tenders"]').click();
await wait(2400);

const page=window.document.getElementById('page-kek-tenders');
assert(page&&page.style.display!=='none','navigation must leave Opportunities visible');
assert(window.PSTProjectCentricWorkflowV1?.version==='3','Project-Centric v3 must be loaded by the finalizer');
assert.equal(page.getAttribute('data-pcw-opportunities-owner'),'2','Project-Centric must retain final visible ownership');
const visible=node=>{if(!node||node.hidden||node.getAttribute('aria-hidden')==='true'||node.style.display==='none')return false;for(let p=node.parentElement;p&&p!==window.document.body;p=p.parentElement){if(p.hidden||p.getAttribute('aria-hidden')==='true'||p.style.display==='none')return false;}return true;};
const ownerRoots=[...page.querySelectorAll('#pst-opportunities-focus')].filter(visible);
assert.equal(ownerRoots.length,1,'exactly one visible Opportunities owner surface must remain after all retries');
assert.equal(page.querySelectorAll('.pst-pcw-tender').length,1,'final owner must render one whole-card opportunity');
assert(page.querySelector('.pst-pcw-tender').textContent.includes(row.title),'whole-card surface must contain the live opportunity');
assert.equal([...page.querySelectorAll('.pst-kek-filter')].filter(visible).length,0,'legacy tender filters must not return');
assert.equal([...page.querySelectorAll('.pst-kek-card')].filter(visible).length,0,'legacy tender table container must not return');
assert.equal([...page.querySelectorAll('#pst-tender-fit-summary')].filter(visible).length,0,'legacy capability summary must not return');
assert.equal([...page.querySelectorAll('.pst-kek-table')].filter(visible).length,0,'legacy table renderer must not reclaim visible output');

console.log('Opportunities delayed runtime ownership race: OK');
dom.window.close();
