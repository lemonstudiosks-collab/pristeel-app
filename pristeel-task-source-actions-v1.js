/* PRISTEEL task source actions v13
 * Safe, read-only source shortcut for Workspace action rows.
 * Owns shell cleanup only: one left Workspace sidebar, no legacy right rail/chrome.
 * Also normalizes Home priority presentation and Projects sort control.
 * No project/task/business data writes.
 */
(function(){
'use strict';
if(window.__pstTaskSourceActionsV1)return;
window.__pstTaskSourceActionsV1=true;

function sourceUrl(value){
  var text=String(value||'');
  var match=text.match(/https:\/\/[^\s<>"']+/i);
  if(!match)return'';
  var candidate=String(match[0]||'').replace(/[\]\)}>.,;]+$/g,'');
  try{
    var parsed=new URL(candidate,window.location&&window.location.href||undefined);
    return parsed.protocol==='https:'?parsed.href:'';
  }catch(e){return'';}
}
function metadataText(row){
  if(!row)return'';
  var original=String(row.dataset&&row.dataset.pstOriginalMeta||'').trim();
  if(original)return original;
  var meta=row.querySelector('.pst-ws-action-meta');
  if(!meta)return'';
  return String(meta.getAttribute('title')||meta.textContent||'').trim();
}
function sourceButton(url){
  var btn=document.createElement('button');
  btn.type='button';
  btn.className='pst-task-source-open';
  btn.textContent='Burimi';
  btn.title='Hap burimin zyrtar në tab të ri';
  btn.addEventListener('click',function(event){
    event.preventDefault();
    event.stopPropagation();
    window.open(url,'_blank','noopener,noreferrer');
  });
  return btn;
}
function enhanceRow(row){
  if(!row)return false;
  var controls=row.querySelector('.pst-ws-action-controls');
  if(!controls||controls.querySelector('.pst-task-source-open'))return false;
  var url=sourceUrl(metadataText(row));
  if(!url)return false;
  var btn=sourceButton(url);
  var menu=controls.querySelector('.pst-dash-task-menu');
  if(menu)controls.insertBefore(btn,menu);else controls.appendChild(btn);
  row.dataset.pstTaskSourceUrl=url;
  return true;
}
function workspacePage(){
  return document.querySelector('#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active');
}
function setHidden(el,hidden){
  if(!el||!el.style)return;
  if(hidden)el.style.setProperty('display','none','important');
  else el.style.removeProperty('display');
}
function tenderIcon(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h3"/><path d="m15.5 15.5 3.5 3.5M19 15.5l-3.5 3.5"/></svg>';
}
function openTenders(event){
  if(event){event.preventDefault();event.stopPropagation();}
  if(typeof window.pstTenderBizOpenMonitor==='function'){window.pstTenderBizOpenMonitor();return;}
  if(typeof window.pstWsKekTenders==='function'){window.pstWsKekTenders();return;}
  if(typeof window.showPage==='function'){window.showPage('kek-tenders');return;}
}
function normalizeSidebar(){
  if(!workspacePage())return false;
  var ws=document.getElementById('pst-ws-sidebar');
  if(!ws)return false;
  var titles=Array.prototype.slice.call(ws.querySelectorAll('.pst-ws-navtitle'));
  var workTitle=titles.find(function(x){return /^(puna|work)$/i.test(String(x.textContent||'').trim());});
  var systemTitle=titles.find(function(x){return /^(sistemi|system)$/i.test(String(x.textContent||'').trim());});
  var workNav=workTitle&&workTitle.nextElementSibling&&workTitle.nextElementSibling.classList.contains('pst-ws-nav')?workTitle.nextElementSibling:null;
  var systemNav=systemTitle&&systemTitle.nextElementSibling&&systemTitle.nextElementSibling.classList.contains('pst-ws-nav')?systemTitle.nextElementSibling:null;

  if(workNav){
    var tender=workNav.querySelector('[data-key="tenders"]');
    var candidates=Array.prototype.slice.call(workNav.querySelectorAll('.pst-ws-navbtn'));
    var duplicate=candidates.find(function(b){return /^(modulet|apps)$/i.test(String((b.querySelector('span')||b).textContent||'').trim());});
    if(!tender&&duplicate){
      tender=duplicate;
      tender.setAttribute('data-key','tenders');
    }
    if(!tender){
      tender=document.createElement('button');
      tender.type='button';
      tender.className='pst-ws-navbtn';
      tender.setAttribute('data-key','tenders');
      workNav.appendChild(tender);
    }
    tender.innerHTML=tenderIcon()+'<span>Tenderat</span>';
    tender.removeAttribute('onclick');
    if(!tender.__pstTenderBound){tender.addEventListener('click',openTenders);tender.__pstTenderBound=true;}
  }
  if(systemNav){
    var apps=systemNav.querySelector('[data-key="apps"]')||systemNav.querySelector('.pst-ws-navbtn');
    if(apps){var label=apps.querySelector('span');if(label)label.textContent='Modulet';}
  }
  var mailbar=ws.querySelector('.pst-ws-mailbar');if(mailbar)setHidden(mailbar,true);
  return true;
}
function hideLegacyBottomSearch(){
  if(!workspacePage())return;
  var ws=document.getElementById('pst-ws-sidebar');
  Array.prototype.forEach.call(document.querySelectorAll('button,div'),function(el){
    if(!el||el===ws||(ws&&ws.contains(el)))return;
    var text=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(!/^(Kërko|Kerko)(\s*[⌘⌃]?\s*K)?$/i.test(text))return;
    var r=el.getBoundingClientRect();
    if(r.left<285&&r.bottom>window.innerHeight-125&&r.width<210&&r.height<75)el.classList.add('pst-ws-legacy-floating-hide');
  });
}
function compactProjectSort(){
  if(!workspacePage())return false;
  var select=document.getElementById('pst-pm-sort');
  if(!select)return false;
  select.setAttribute('aria-label','Rendit projektet sipas');
  select.title='Rendit projektet sipas aktivitetit, afatit ose klientit';
  var wrap=select.parentElement;
  if(wrap&&!wrap.querySelector('.pst-pm-sort-label')){
    var label=document.createElement('span');
    label.className='pst-pm-sort-label';
    label.textContent='Rendit sipas';
    wrap.insertBefore(label,select);
  }
  return true;
}
function stabilizeWorkspaceShell(){
  if(!workspacePage())return false;
  var sidebar=document.getElementById('app-sidebar');
  var v2=document.getElementById('pst-v2-sidebar');
  var ws=document.getElementById('pst-ws-sidebar');
  if(sidebar)sidebar.classList.remove('open');
  if(v2&&ws&&ws.parentElement!==v2)v2.appendChild(ws);
  if(sidebar&&v2){Array.prototype.forEach.call(sidebar.children,function(child){if(child!==v2)setHidden(child,true);});}
  if(v2&&ws){Array.prototype.forEach.call(v2.children,function(child){if(child!==ws)setHidden(child,true);});}
  Array.prototype.forEach.call(document.querySelectorAll('.rail'),function(rail){setHidden(rail,true);rail.classList.remove('open');});
  normalizeSidebar();
  hideLegacyBottomSearch();
  compactProjectSort();
  return !!(sidebar&&v2&&ws);
}
function decorate(){
  stabilizeWorkspaceShell();
  var page=document.getElementById('page-workspace-home');
  if(!page||page.style.display==='none')return 0;
  var count=0;
  page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(row){if(enhanceRow(row))count++;});
  return count;
}
function schedule(){[0,100,260,600,1200].forEach(function(ms){setTimeout(decorate,ms);});}
function installStyle(){
  ['pst-task-source-actions-v10-css','pst-task-source-actions-v11-css','pst-task-source-actions-v12-css'].forEach(function(id){var old=document.getElementById(id);if(old)old.remove();});
  if(document.getElementById('pst-task-source-actions-v13-css'))return;
  var style=document.createElement('style');
  style.id='pst-task-source-actions-v13-css';
  style.textContent=`
#page-workspace-home .pst-task-source-open{height:32px;border:1px solid #CFE0E7;border-radius:10px;padding:0 11px;background:#F8FBFC;color:#3F7F98;font-size:10px;font-weight:760;line-height:1;cursor:pointer;white-space:nowrap}
#page-workspace-home .pst-task-source-open:hover{background:#EDF6F9;border-color:#B8D4DF;color:#2F6E86}

/* ONE WORKSPACE SHELL. Legacy shell remains in DOM only as a compatibility provider. */
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) .topbar,
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) .rail{
  display:none!important;
}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #app-sidebar,
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #app-sidebar.open{
  width:268px!important;min-width:268px!important;max-width:268px!important;height:100vh!important;position:sticky!important;top:0!important;overflow:hidden!important;transition:none!important;background:#fff!important;
}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #app-sidebar > *:not(#pst-v2-sidebar){display:none!important}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #pst-v2-sidebar{display:block!important;width:100%!important;height:100%!important;min-height:100vh!important;padding:0!important;overflow:hidden!important}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #pst-v2-sidebar > *:not(#pst-ws-sidebar){display:none!important}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #pst-ws-sidebar{display:flex!important;flex-direction:column!important;width:100%!important;height:100%!important;min-height:100vh!important;overflow-y:auto!important;overflow-x:hidden!important;background:#fff!important}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) .sidebar-footer,
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #side-nav,
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #side-quick,
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) .pst-ws-mailbar,
.pst-ws-legacy-floating-hide{display:none!important}

/* Sidebar alignment: one icon column, one text column, one badge column. */
#pst-ws-sidebar .pst-ws-navbtn{display:grid!important;grid-template-columns:20px minmax(0,1fr) auto!important;align-items:center!important;column-gap:11px!important;min-height:42px!important}
#pst-ws-sidebar .pst-ws-navbtn svg{width:18px!important;height:18px!important;justify-self:center!important;flex:none!important}
#pst-ws-sidebar .pst-ws-navbtn span{min-width:0!important;line-height:1.2!important}
#pst-ws-sidebar .pst-ws-search{margin-top:auto!important}

/* Home priorities: two calm cards per row, one neutral family, status pills keep meaning. */
#page-workspace-home #pst-ws-home-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important}
#page-workspace-home .pst-priority-card.pst-happy-priority,
#page-workspace-home .pst-priority-card.pst-happy-priority[data-pst-priority-kind],
#page-workspace-home .pst-priority-card.pst-happy-priority.is-urgent,
#page-workspace-home .pst-priority-card.pst-happy-priority.is-overdue{
  min-height:210px!important;
  background:linear-gradient(145deg,#FFFFFF 0%,#FAFCFD 100%)!important;
  border:1px solid #DDE8EC!important;
  border-left:0!important;
  border-radius:21px!important;
  box-shadow:0 9px 25px rgba(37,65,77,.055)!important;
}
#page-workspace-home .pst-priority-card.pst-happy-priority:before{content:"";position:absolute;left:0;top:0;right:0;height:4px;background:linear-gradient(90deg,#A9C8D2,#C5D9DF);z-index:2}
#page-workspace-home .pst-happy-priority-art{opacity:.055!important;color:#315766!important}

/* Projects register: the existing sort remains functional, but no longer looks like a full-width dead field. */
#page-workspace-projects .pst-pm-control-top{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important}
#page-workspace-projects .pst-pm-search{flex:1 1 420px!important;min-width:260px!important}
#page-workspace-projects #pst-pm-sort,
#page-workspace-projects .pst-pm-sortwrap .pst-pm-select{width:170px!important;min-width:170px!important;max-width:170px!important;flex:0 0 170px!important}
#page-workspace-projects .pst-pm-sort-label{font-size:9px!important;font-weight:700!important;color:#77838A!important;white-space:nowrap!important;margin-left:auto!important}

@media(max-width:980px){#page-workspace-home #pst-ws-home-actions{grid-template-columns:1fr!important}}
`;
  document.head.appendChild(style);
}
installStyle();
window.addEventListener('pst-dashboard-rendered',schedule);
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
document.addEventListener('click',function(event){
  var trigger=event.target&&event.target.closest?event.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],[onclick*="pstOpenProjectWorkspace"],#pst-ws-home-projects button'):null;
  if(trigger)schedule();
},true);
if(window.__pstModulesReady)schedule();
window.PSTTaskSourceActionsV1={sourceUrl:sourceUrl,metadataText:metadataText,enhanceRow:enhanceRow,decorate:decorate,stabilizeWorkspaceShell:stabilizeWorkspaceShell,normalizeSidebar:normalizeSidebar,compactProjectSort:compactProjectSort};
})();
