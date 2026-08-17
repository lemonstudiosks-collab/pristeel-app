/* PRISTEEL Home Live Fix v1
 * Read-only home consistency layer for the live workspace.
 * - enforces progressive Today/Week/Overview limits after async rendering
 * - recovers active project cards with a broad projects query if the legacy home query returns empty
 * - does not override auth, Gmail, project opening or database write functions
 */
(function(){
'use strict';
if(window.__pstHomeLiveFixV1)return;
window.__pstHomeLiveFixV1=true;

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function activeProject(p){
  var s=String(p&&p.status||'').toLowerCase().trim();
  return !/^(mbyllur|humbur|arkivuar|closedlost|cancelled|realizuar)$/.test(s);
}
function dateValue(p){
  var v=p&&((p.updated_at)||(p.last_activity_at)||(p.last_email_at)||(p.created_at));
  var t=v?new Date(v).getTime():0;
  return isFinite(t)?t:0;
}
function view(){
  try{
    if(window.PSTHomeCommandCenterV2&&typeof window.PSTHomeCommandCenterV2.getView==='function')return window.PSTHomeCommandCenterV2.getView();
  }catch(e){}
  return 'today';
}
function limits(){
  var v=view();
  if(v==='week')return{actions:5,projects:4};
  if(v==='overview')return{actions:7,projects:6};
  return{actions:3,projects:3};
}
function enforce(hostId,selector,limit,label){
  var host=document.getElementById(hostId);if(!host)return;
  var items=Array.prototype.slice.call(host.querySelectorAll(selector));
  var more=host.querySelector('.pst-hcc-more');
  if(more)more.remove();
  if(!items.length)return;
  items.forEach(function(item,i){item.classList.toggle('pst-hcc-hidden',i>=limit);});
  if(items.length<=limit)return;
  more=document.createElement('button');more.type='button';more.className='pst-hcc-more pst-live-more';
  more.innerHTML='<b>Shiko edhe '+(items.length-limit)+'</b><span>'+esc(label)+'</span>';
  var open=false;
  more.addEventListener('click',function(){
    open=!open;
    items.forEach(function(item,i){item.classList.toggle('pst-hcc-hidden',!open&&i>=limit);});
    more.innerHTML=open?'<b>Shfaq më pak</b><span>Mbyll listën e zgjeruar</span>':'<b>Shiko edhe '+(items.length-limit)+'</b><span>'+esc(label)+'</span>';
  });
  host.appendChild(more);
}
function enforceLimits(){
  var page=document.getElementById('page-workspace-home');
  if(!page||page.style.display==='none')return;
  var l=limits();
  enforce('pst-ws-home-actions',':scope > .pst-ws-action',l.actions,view()==='today'?'Hap prioritetet e tjera':'Hap veprimet e tjera');
  enforce('pst-ws-home-projects',':scope > .pst-ws-projectcard',l.projects,'Hap projektet e tjera');
}
function projectCard(p){
  var status=String(p.status||'Në pritje');
  var name=p.name||'Pa emër';
  var meta=(p.client||'Pa klient')+(p.ref?' · '+p.ref:'');
  var next=p.pipeline_stage?('Faza aktuale: '+String(p.pipeline_stage).replace(/_/g,' ')):'Hap workspace-in e projektit';
  return '<div class="pst-ws-projectcard pst-live-projectcard" onclick="pstOpenProjectWorkspace(\''+esc(p.id)+'\')">'
    +'<div class="pst-ws-projectcard-top"><div><div class="pst-ws-projectcard-name">'+esc(name)+'</div><div class="pst-ws-projectcard-client">'+esc(meta)+'</div></div><span class="pst-ws-status">'+esc(status)+'</span></div>'
    +'<div class="pst-ws-projectcard-next"><b>Hapi tjetër:</b> '+esc(next)+'</div></div>';
}
function recoverProjects(){
  var page=document.getElementById('page-workspace-home');
  var host=document.getElementById('pst-ws-home-projects');
  if(!page||page.style.display==='none'||!host||host.querySelector('.pst-ws-projectcard'))return Promise.resolve(false);
  if(typeof window.supaFetch!=='function')return Promise.resolve(false);
  return window.supaFetch('projects?select=*&limit=3000').then(arr).then(function(rows){
    var active=rows.filter(activeProject).sort(function(a,b){return dateValue(b)-dateValue(a);});
    if(!active.length)return false;
    host.innerHTML=active.slice(0,12).map(projectCard).join('');
    var badge=document.getElementById('pst-ws-b-projects');
    if(badge){badge.textContent=String(active.length);badge.style.display='inline-flex';}
    try{document.dispatchEvent(new CustomEvent('pst:home-projects-recovered',{detail:{count:active.length}}));}catch(e){}
    enforceLimits();
    return true;
  }).catch(function(error){
    if(window.console&&console.debug)console.debug('PRISTEEL home project recovery skipped:',error&&error.message);
    return false;
  });
}
function apply(){
  enforceLimits();
  return recoverProjects().then(function(){
    if(window.PSTDashboardTaskCardsV1&&typeof window.PSTDashboardTaskCardsV1.decorate==='function')window.PSTDashboardTaskCardsV1.decorate();
    enforceLimits();
    return true;
  });
}
/* A single async pass is enough; navigation and explicit refresh trigger future passes. */
function schedule(){return apply();}

var css=document.createElement('style');css.id='pst-home-live-fix-v1-css';css.textContent=`
#page-workspace-home .pst-hcc-hidden{display:none!important}
#page-workspace-home .pst-live-projectcard{cursor:pointer}
#page-workspace-home .pst-live-projectcard .pst-ws-status{background:#EDF6F9;color:#3F7F98;border:1px solid #CFE2E9}
`;
document.head.appendChild(css);

document.addEventListener('click',function(event){
  if(event.target.closest&&event.target.closest('#pst-home-view-tabs button,.pst-ws-navbtn,#pst-ws-home-refresh'))schedule();
},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('pst:home-projects-recovered',enforceLimits);
window.addEventListener('pageshow',schedule,{once:true});
window.PSTHomeLiveFixV1={apply:apply,recoverProjects:recoverProjects,enforceLimits:enforceLimits};
schedule();
})();