/* PRISTEEL task source actions v12
 * Safe, read-only source shortcut for Workspace action rows.
 * Enforces one current Workspace shell across Home, Projects and project workspaces.
 * Legacy DOM remains loaded for compatibility but is not rendered beside the current UI.
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
function stabilizeWorkspaceShell(){
  if(!workspacePage())return false;
  var sidebar=document.getElementById('app-sidebar');
  var v2=document.getElementById('pst-v2-sidebar');
  var ws=document.getElementById('pst-ws-sidebar');
  if(sidebar)sidebar.classList.remove('open');
  if(v2&&ws&&ws.parentElement!==v2)v2.appendChild(ws);
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
function schedule(){[0,120,350,800,1600].forEach(function(ms){setTimeout(decorate,ms);});}
function installStyle(){
  ['pst-task-source-actions-v10-css','pst-task-source-actions-v11-css'].forEach(function(id){var old=document.getElementById(id);if(old)old.remove();});
  if(document.getElementById('pst-task-source-actions-v12-css'))return;
  var style=document.createElement('style');
  style.id='pst-task-source-actions-v12-css';
  style.textContent=`
#page-workspace-home .pst-task-source-open{height:32px;border:1px solid #CFE0E7;border-radius:10px;padding:0 11px;background:#F8FBFC;color:#3F7F98;font-size:10px;font-weight:760;line-height:1;cursor:pointer;white-space:nowrap}
#page-workspace-home .pst-task-source-open:hover{background:#EDF6F9;border-color:#B8D4DF;color:#2F6E86}

/* ONE WORKSPACE SHELL. Legacy shell stays in DOM only as a compatibility provider. */
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) .topbar{
  display:none!important;
}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #app-sidebar,
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #app-sidebar.open{
  width:268px!important;
  min-width:268px!important;
  max-width:268px!important;
  height:100vh!important;
  position:sticky!important;
  top:0!important;
  overflow:hidden!important;
  transition:none!important;
  background:#fff!important;
}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #app-sidebar > *:not(#pst-v2-sidebar){display:none!important}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #pst-v2-sidebar{
  display:block!important;
  width:100%!important;
  height:100%!important;
  min-height:100vh!important;
  padding:0!important;
  overflow:hidden!important;
}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #pst-v2-sidebar > *:not(#pst-ws-sidebar){display:none!important}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #pst-ws-sidebar{
  display:flex!important;
  flex-direction:column!important;
  width:100%!important;
  height:100%!important;
  min-height:100vh!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  background:#fff!important;
}
/* Old standalone launcher/search chrome must not overlap the Workspace sidebar. */
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) .sidebar-footer,
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #side-nav,
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active) #side-quick{
  display:none!important;
}
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
window.PSTTaskSourceActionsV1={sourceUrl:sourceUrl,metadataText:metadataText,enhanceRow:enhanceRow,decorate:decorate,stabilizeWorkspaceShell:stabilizeWorkspaceShell};
})();
