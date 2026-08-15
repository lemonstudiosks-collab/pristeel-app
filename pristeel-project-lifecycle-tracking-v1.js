/* PRISTEEL project lifecycle tracking v1
 * Final project UX reconciliation layer.
 * - Uses linked project_emails as the authoritative visible activity timestamp.
 * - Keeps terminal projects from looking overdue after completion.
 * - Mounts Project Intelligence as a deterministic, prominent project action.
 * No automatic status/stage changes, no outbound mail, no polling, no global observers.
 */
(function(){
'use strict';
if(window.__pstProjectLifecycleTrackingV1)return;
window.__pstProjectLifecycleTrackingV1=true;

var CACHE_MS=60000;
var cache={at:0,latest:{}};

function arr(v){return Array.isArray(v)?v:[];}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function activeId(){return String(window.__pstCurrentProjectId||window._curProjId||(window.__pstIntegrityLastData&&window.__pstIntegrityLastData.project&&window.__pstIntegrityLastData.project.id)||'');}
function safeTime(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.getTime():0;}
function activityText(v){var t=safeTime(v);if(!t)return'Pa aktivitet';var n=Math.max(0,Math.floor((Date.now()-t)/86400000));return n===0?'Sot':n===1?'Dje':'Para '+n+' ditësh';}
function terminal(v){return /realizuar|mbyllur|closed|arkivuar|archived/.test(norm(v));}
function ensureCss(){
  if(document.getElementById('pst-project-lifecycle-tracking-css'))return;
  var s=document.createElement('style');s.id='pst-project-lifecycle-tracking-css';s.textContent=`
#page-workspace-project .pst-pi-actions .pst-plt-summary{background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;border:0!important;color:#fff!important;font-weight:800!important;box-shadow:0 7px 18px rgba(63,127,152,.18)!important;min-width:128px}
#page-workspace-project .pst-pi-actions .pst-plt-summary:hover{background:linear-gradient(135deg,#5B9BB3,#356F86)!important;color:#fff!important}
.pst-pm-meta-value.pst-plt-complete{color:#68747B!important;font-weight:700}
`;
  document.head.appendChild(s);
}

function waitForSummary(resolve,reject,tries){
  var S=window.PSTProjectSummaryCommandV1;
  if(S&&typeof S.open==='function'){resolve(S);return;}
  if(tries<=0){reject(new Error('Project Intelligence nuk u ngarkua. Rifresko faqen dhe provo përsëri.'));return;}
  setTimeout(function(){waitForSummary(resolve,reject,tries-1);},75);
}
function ensureSummary(){
  var S=window.PSTProjectSummaryCommandV1;if(S&&typeof S.open==='function')return Promise.resolve(S);
  return new Promise(function(resolve,reject){
    var existing=document.querySelector('script[src*="pristeel-project-summary-command-v1.js"]');
    if(existing){waitForSummary(resolve,reject,24);return;}
    var s=document.createElement('script');s.src='pristeel-project-summary-command-v1.js?v=20260815-lifecycle1';s.defer=true;s.setAttribute('data-pst-project-summary-lifecycle','1');
    s.onload=function(){waitForSummary(resolve,reject,8);};s.onerror=function(){reject(new Error('Project Intelligence nuk u ngarkua.'));};document.head.appendChild(s);
  });
}
function openSummary(){
  var id=activeId();if(!id){alert('Nuk u gjet projekti aktiv.');return false;}
  ensureSummary().then(function(S){S.open(id);}).catch(function(e){alert(String(e&&e.message||e));});return true;
}
function decorateSummary(){
  ensureCss();
  var page=document.getElementById('page-workspace-project'),actions=page&&page.querySelector('.pst-pi-actions');if(!page||!actions)return false;
  var b=actions.querySelector('[data-pst-project-summary]');
  if(!b){b=document.createElement('button');b.type='button';b.className='pst-pi-btn';b.dataset.pstProjectSummary='1';b.textContent='Përmbledh projektin';b.onclick=openSummary;var work=arr([].slice.call(actions.querySelectorAll('button'))).filter(function(x){return /puno me projektin/i.test(String(x.textContent||''));})[0];if(work)actions.insertBefore(b,work);else actions.appendChild(b);}
  b.classList.add('pst-plt-summary');
  if(!b.onclick)b.onclick=openSummary;
  return true;
}

async function loadLatest(force){
  if(!force&&cache.at&&Date.now()-cache.at<CACHE_MS)return cache.latest;
  if(typeof window.supaFetch!=='function')return cache.latest;
  var rows=[];try{rows=arr(await window.supaFetch('project_emails?project_id=not.is.null&sent_at=not.is.null&select=project_id,sent_at,subject&order=sent_at.desc&limit=10000'));}catch(e){return cache.latest;}
  var latest={};rows.forEach(function(r){var id=String(r.project_id||'');if(id&&!latest[id])latest[id]={sent_at:r.sent_at,subject:r.subject||''};});cache={at:Date.now(),latest:latest};return latest;
}
function metaBlock(row,label){return arr([].slice.call(row.querySelectorAll('.pst-pm-meta-block'))).filter(function(x){var l=x.querySelector('.pst-pm-meta-label');return l&&norm(l.textContent)===norm(label);})[0]||null;}
function decorateRows(latest){
  var list=document.querySelector('.pst-pm-list');if(!list)return false;
  var rows=[].slice.call(list.querySelectorAll('.pst-pm-row[data-project-id]'));
  rows.forEach(function(row){
    var id=String(row.getAttribute('data-project-id')||''),e=latest[id];
    if(e){var ab=metaBlock(row,'Aktiviteti'),av=ab&&ab.querySelector('.pst-pm-meta-value');if(av){av.textContent=activityText(e.sent_at);av.title=e.subject||'';}row.dataset.pstActivityAt=String(safeTime(e.sent_at));}
    var sb=metaBlock(row,'Statusi'),badge=sb&&sb.querySelector('.pst-pm-badge');if(terminal(badge&&badge.textContent)){var db=metaBlock(row,'Afati'),dv=db&&db.querySelector('.pst-pm-meta-value');if(dv){dv.textContent='Përfunduar';dv.classList.add('pst-plt-complete');dv.style.color='#68747B';}row.style.setProperty('--urgency','#AAB4B9');}
  });
  var sort=document.getElementById('pst-pm-sort');if(sort&&sort.value==='activity')rows.sort(function(a,b){return Number(b.dataset.pstActivityAt||0)-Number(a.dataset.pstActivityAt||0);}).forEach(function(r){list.appendChild(r);});
  return true;
}
async function refreshProjectCards(force){var latest=await loadLatest(!!force);return decorateRows(latest);}

function scheduleSummary(){[0,80,220,600].forEach(function(ms){setTimeout(decorateSummary,ms);});}
function wrapWorkspace(){
  var base=window.pstOpenProjectWorkspace;if(typeof base!=='function'||base.__pstLifecycleTracking)return false;
  var wrapped=function(){var out=base.apply(this,arguments);return Promise.resolve(out).then(function(v){scheduleSummary();return v;});};wrapped.__pstLifecycleTracking=true;wrapped.__base=base;window.pstOpenProjectWorkspace=wrapped;return true;
}
function wrapProjectFirst(){
  var P=window.PSTProjectFirstV2,base=P&&P.render;if(typeof base!=='function'||base.__pstLifecycleTracking)return false;
  var wrapped=function(){var out=base.apply(this,arguments);scheduleSummary();return out;};wrapped.__pstLifecycleTracking=true;wrapped.__base=base;P.render=wrapped;return true;
}
function wrapProjectsFunction(name){
  var base=window[name];if(typeof base!=='function'||base.__pstLifecycleTracking)return false;
  var wrapped=function(){var out=base.apply(this,arguments);return Promise.resolve(out).then(function(v){return refreshProjectCards(true).then(function(){return v;});});};wrapped.__pstLifecycleTracking=true;wrapped.__base=base;window[name]=wrapped;return true;
}
function install(){wrapWorkspace();wrapProjectFirst();wrapProjectsFunction('pstProjectsModernOpen');wrapProjectsFunction('pstProjectsModernRefresh');scheduleSummary();if(document.querySelector('.pst-pm-list'))refreshProjectCards(false);}

document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest?e.target.closest('[data-pf2-tab],.pst-pi-tab,[data-pm-filter],[data-pm-view]'):null;if(!t)return;setTimeout(function(){decorateSummary();decorateRows(cache.latest);},0);setTimeout(function(){decorateSummary();decorateRows(cache.latest);},140);
},true);
document.addEventListener('input',function(e){if(e.target&&e.target.id==='pst-pm-search')setTimeout(function(){decorateRows(cache.latest);},0);},true);
document.addEventListener('change',function(e){if(e.target&&e.target.id==='pst-pm-sort')setTimeout(function(){decorateRows(cache.latest);},0);},true);
document.addEventListener('pst:modules-ready',function(){install();refreshProjectCards(true);},{once:true});

install();setTimeout(install,350);setTimeout(install,1100);
window.PSTProjectLifecycleTrackingV1={openSummary:openSummary,decorateSummary:decorateSummary,refreshProjectCards:refreshProjectCards,decorateRows:decorateRows,loadLatest:loadLatest,_test:{activityText:activityText,terminal:terminal}};
})();
