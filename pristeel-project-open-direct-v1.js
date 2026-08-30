/* PRISTEEL direct project opener
 * Canonical project-navigation owner for Home and Projects.
 * Opens the real project workspace, protects row actions, and keeps the
 * post-award execution strip out of list/Home surfaces.
 */
(function(){
'use strict';
if(window.__pstProjectOpenDirectV2)return;
window.__pstProjectOpenDirectV2=true;
window.__pstProjectOpenDirectV1=true;
window.__pstProjectRowOpenOwner='direct-v2';

var busy=false;

function S(v){return String(v==null?'':v);}
function ensureUi(){
  if(document.getElementById('pst-project-open-direct-css'))return;
  var style=document.createElement('style');
  style.id='pst-project-open-direct-css';
  style.textContent='\
#page-workspace-projects .pst-pm-row[data-project-id],#pst-project-control-home-v2 [data-live-project],#pst-project-control-home-v2 [data-live-open]{cursor:pointer}\
#page-workspace-projects .pst-pm-open,#pst-pm-menu [data-act="open"]{display:none!important}\
body:not(:has(#page-workspace-project.active)) #flow-bar:has(.pxg-legacy-flow){display:none!important}\
';
  document.head.appendChild(style);
}

function independentRowControl(target,row){
  if(!target||!target.closest||!row)return false;
  var el=target.closest('.pst-pm-more,#pst-pm-menu,button,a,input,select,textarea,[role="button"],[data-act],[contenteditable="true"]');
  return !!(el&&row.contains(el));
}

function targetProject(target){
  if(!target||!target.closest)return null;

  var home=target.closest('#pst-project-control-home-v2 [data-live-project],#pst-project-control-home-v2 [data-live-open]');
  if(home){
    var homeId=S(home.getAttribute('data-live-project')||home.getAttribute('data-live-open')).trim();
    if(homeId)return{id:homeId,kind:'home',node:home};
  }

  var row=target.closest('#page-workspace-projects .pst-pm-row[data-project-id]');
  if(row){
    if(independentRowControl(target,row))return null;
    var rowId=S(row.getAttribute('data-project-id')||row.getAttribute('data-pm-open')||(row.querySelector('[data-pm-open]')&&row.querySelector('[data-pm-open]').getAttribute('data-pm-open'))).trim();
    if(rowId)return{id:rowId,kind:'projects',node:row};
  }

  var legacy=target.closest('[data-pm-open]');
  if(legacy){
    var legacyId=S(legacy.getAttribute('data-pm-open')).trim();
    if(legacyId)return{id:legacyId,kind:'legacy',node:legacy};
  }
  return null;
}

function setContext(id){
  id=S(id).trim();
  window.__pstCurrentProjectId=id;
  window._curProjId=id;
  try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  var select=document.getElementById('global-proj');
  if(select&&[].slice.call(select.options||[]).some(function(o){return S(o.value)===id;}))select.value=id;
}

function ensureProjectPage(){
  var p=document.getElementById('page-workspace-project');
  if(p)return p;
  var list=document.getElementById('page-workspace-projects');
  var host=list&&list.parentNode;
  if(!host)host=document.querySelector('.content')||document.querySelector('.workspace-content')||document.querySelector('.pst-ws-content')||document.querySelector('main');
  if(!host)throw new Error('Nuk u gjet zona e projektit në faqe.');
  p=document.createElement('div');
  p.id='page-workspace-project';
  p.className='page';
  p.style.display='none';
  host.appendChild(p);
  return p;
}

function projectPageVisible(){
  var p=document.getElementById('page-workspace-project');
  if(!p||!p.classList.contains('active'))return false;
  if(p.style&&p.style.display==='none')return false;
  try{var cs=window.getComputedStyle&&window.getComputedStyle(p);if(cs&&cs.display==='none')return false;}catch(e){}
  return true;
}

function forceProjectPageVisible(){
  var p=ensureProjectPage();
  [].slice.call(document.querySelectorAll('.page')).forEach(function(page){
    if(page===p)return;
    page.classList.remove('active');
    if(page.id==='page-workspace-projects'||page.id==='page-home'||page.id==='page-dashboard')page.style.display='none';
  });
  p.classList.add('active');
  p.style.display='block';
  return p;
}

function showError(error){
  console.error('PRISTEEL direct project open:',error);
  var old=document.getElementById('pst-project-open-error');if(old)old.remove();
  var el=document.createElement('div');el.id='pst-project-open-error';
  el.textContent='Projekti nuk u hap: '+S(error&&error.message||error||'gabim i panjohur');
  el.style.cssText='position:fixed;right:20px;bottom:20px;z-index:9000;max-width:420px;padding:11px 14px;border-radius:10px;background:#A64B42;color:#fff;font:650 11px Inter,sans-serif;box-shadow:0 14px 36px rgba(30,40,45,.24)';
  document.body.appendChild(el);setTimeout(function(){if(el.parentNode)el.remove();},5500);
}

function ensureGmailButton(id){
  var actions=document.querySelector('#page-workspace-project .pst-pi-actions')||document.querySelector('.pst-pi-actions');
  if(!actions)return false;
  var button=document.getElementById('pst-gmail-collect-project');
  if(!button){
    button=document.createElement('button');button.id='pst-gmail-collect-project';button.type='button';button.className='pst-pi-btn';button.textContent='Mblidh nga Gmail';
    actions.insertBefore(button,actions.lastElementChild||null);
  }
  button.dataset.projectId=S(id||window.__pstCurrentProjectId);
  button.onclick=function(e){
    if(e){e.preventDefault();e.stopPropagation();}
    var projectId=S(button.dataset.projectId||window.__pstCurrentProjectId);
    if(typeof window.pstCollectProjectGmail==='function'){window.pstCollectProjectGmail(projectId);return;}
    showError(new Error('Moduli Gmail nuk është ngarkuar.'));
  };
  return true;
}

async function open(id){
  id=S(id).trim();
  if(!id||busy)return false;
  busy=true;setContext(id);
  var firstError=null;
  try{
    try{ensureProjectPage();}catch(e){firstError=e;}

    if(typeof window.pstOpenProjectWorkspace==='function'){
      try{
        await Promise.resolve(window.pstOpenProjectWorkspace(id));
        var modernPage=document.getElementById('page-workspace-project');
        if(modernPage&&(modernPage.childElementCount||S(modernPage.textContent).trim()))forceProjectPageVisible();
        if(projectPageVisible()){
          ensureGmailButton(id);
          try{document.dispatchEvent(new CustomEvent('pst:project-opened',{detail:{project_id:id,source:'direct-v2'}}));}catch(e){}
          return true;
        }
        throw new Error('Workspace-i i projektit nuk u aktivizua.');
      }catch(error){
        if(!firstError)firstError=error;
        console.warn('PRISTEEL: project workspace failed; trying legacy loader.',error);
      }
    }

    if(typeof window.loadProject==='function'){
      try{
        await Promise.resolve(window.loadProject(id));
        var loadedPage=document.getElementById('page-workspace-project');
        if(loadedPage&&(loadedPage.childElementCount||S(loadedPage.textContent).trim()))forceProjectPageVisible();
        if(projectPageVisible()){ensureGmailButton(id);return true;}
      }catch(error){if(!firstError)firstError=error;console.warn('PRISTEEL: loadProject failed.',error);}
    }

    var legacy=window.__pstWorkspaceLegacy||{};
    if(typeof legacy.openOverview==='function'){
      try{await Promise.resolve(legacy.openOverview(id));return true;}catch(error){if(!firstError)firstError=error;}
    }
    if(typeof window.openOverview==='function'){
      try{await Promise.resolve(window.openOverview(id));return true;}catch(error){if(!firstError)firstError=error;}
    }
    throw firstError||new Error('Funksioni i projektit nuk është ngarkuar.');
  }catch(error){
    showError(error);return false;
  }finally{busy=false;}
}

function click(event){
  var hit=targetProject(event.target);if(!hit)return;
  event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
  open(hit.id);
}
function keydown(event){
  if(event.key!=='Enter'&&event.key!==' ')return;
  var hit=targetProject(event.target);if(!hit)return;
  event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
  open(hit.id);
}

ensureUi();
document.addEventListener('click',click,true);
document.addEventListener('keydown',keydown,true);
window.pstOpenProjectDirect=open;
window.pstEnsureProjectGmailButton=ensureGmailButton;
})();
