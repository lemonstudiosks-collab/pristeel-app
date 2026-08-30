/* PRISTEEL direct project opener
 * Canonical Projects row-navigation owner.
 * Loaded before Project Classification so one early capture listener owns row clicks.
 * Keeps row actions independent and falls back when the modern workspace cannot open.
 */
(function(){
'use strict';
if(window.__pstProjectOpenDirectV1)return;
window.__pstProjectOpenDirectV1=true;
window.__pstProjectRowOpenOwner='direct-v1';

var busy=false;

function ensureRowUi(){
  if(document.getElementById('pst-project-row-open-css'))return;
  var style=document.createElement('style');
  style.id='pst-project-row-open-css';
  style.textContent='.pst-pm-row{cursor:pointer}.pst-pm-open{display:none!important}#pst-pm-menu [data-act="open"]{display:none!important}';
  document.head.appendChild(style);
}

function interactiveTarget(target,row){
  if(!target||!target.closest)return false;
  var interactive=target.closest('.pst-pm-more,#pst-pm-menu,button,a,input,select,textarea,[role="button"],[data-act],[contenteditable="true"]');
  return !!(interactive&&(!row||row.contains(interactive)));
}

function projectIdFrom(target){
  if(!target||!target.closest)return'';
  var row=target.closest('#page-workspace-projects .pst-pm-row');
  if(row){
    if(interactiveTarget(target,row))return'';
    return String(
      row.getAttribute('data-project-id')||
      row.getAttribute('data-pm-open')||
      (row.querySelector('[data-pm-open]')&&row.querySelector('[data-pm-open]').getAttribute('data-pm-open'))||
      ''
    ).trim();
  }
  var node=target.closest('[data-pm-open]');
  return node?String(node.getAttribute('data-pm-open')||'').trim():'';
}

function setContext(id){
  id=String(id||'').trim();
  window.__pstCurrentProjectId=id;
  window._curProjId=id;
  try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  var select=document.getElementById('global-proj');
  if(select)select.value=id;
}

function showError(error){
  console.error('PRISTEEL direct project open:',error);
  var old=document.getElementById('pst-project-open-error');if(old)old.remove();
  var el=document.createElement('div');el.id='pst-project-open-error';
  el.textContent='Projekti nuk u hap: '+String(error&&error.message||error||'gabim i panjohur');
  el.style.cssText='position:fixed;right:20px;bottom:20px;z-index:9000;max-width:420px;padding:11px 14px;border-radius:10px;background:#A64B42;color:#fff;font:650 11px Inter,sans-serif;box-shadow:0 14px 36px rgba(30,40,45,.24)';
  document.body.appendChild(el);setTimeout(function(){if(el.parentNode)el.remove();},5500);
}

function ensureGmailButton(id){
  var actions=document.querySelector('#page-workspace-project .pst-pi-actions')||document.querySelector('.pst-pi-actions');
  if(!actions)return false;
  var button=document.getElementById('pst-gmail-collect-project');
  if(!button){
    button=document.createElement('button');
    button.id='pst-gmail-collect-project';
    button.type='button';
    button.className='pst-pi-btn';
    button.textContent='Mblidh nga Gmail';
    actions.insertBefore(button,actions.lastElementChild||null);
  }
  button.dataset.projectId=String(id||window.__pstCurrentProjectId||'');
  button.onclick=function(){
    var projectId=String(button.dataset.projectId||window.__pstCurrentProjectId||'');
    if(typeof window.pstCollectProjectGmail==='function'){
      window.pstCollectProjectGmail(projectId);
      return;
    }
    showError(new Error('Moduli Gmail nuk është ngarkuar.'));
  };
  return true;
}

async function open(id){
  id=String(id||'').trim();
  if(!id||busy)return false;
  busy=true;
  setContext(id);
  var firstError=null;
  try{
    if(typeof window.pstOpenProjectWorkspace==='function'){
      try{
        await window.pstOpenProjectWorkspace(id);
        ensureGmailButton(id);
        return true;
      }catch(error){
        firstError=error;
        console.warn('PRISTEEL: modern project workspace failed; trying legacy loader.',error);
      }
    }
    if(typeof window.loadProject==='function'){
      try{
        await window.loadProject(id);
        ensureGmailButton(id);
        return true;
      }catch(error){
        if(!firstError)firstError=error;
        console.warn('PRISTEEL: legacy loadProject failed; trying overview fallback.',error);
      }
    }
    var legacy=window.__pstWorkspaceLegacy||{};
    if(typeof legacy.openOverview==='function'){
      legacy.openOverview(id);
      return true;
    }
    if(typeof window.openOverview==='function'){
      window.openOverview(id);
      return true;
    }
    throw firstError||new Error('Funksioni i projektit nuk është ngarkuar.');
  }catch(error){
    showError(error);
    return false;
  }finally{
    busy=false;
  }
}

function click(event){
  var id=projectIdFrom(event.target);if(!id)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  open(id);
}

ensureRowUi();
document.addEventListener('click',click,true);
window.pstOpenProjectDirect=open;
window.pstEnsureProjectGmailButton=ensureGmailButton;
})();
