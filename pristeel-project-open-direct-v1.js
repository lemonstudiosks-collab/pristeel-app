/* PRISTEEL direct project opener
 * Makes the complete project row clickable while keeping row actions independent.
 * The original [data-pm-open] control stays in the DOM as the canonical project-id source;
 * it is hidden visually instead of being removed.
 */
(function(){
'use strict';
if(window.__pstProjectOpenDirectV1)return;
window.__pstProjectOpenDirectV1=true;

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
  var row=target.closest('.pst-pm-row');
  if(row){
    if(interactiveTarget(target,row))return'';
    return String(
      row.getAttribute('data-project-id')||
      row.getAttribute('data-pm-open')||
      (row.querySelector('[data-pm-open]')&&row.querySelector('[data-pm-open]').getAttribute('data-pm-open'))||
      ''
    );
  }
  var node=target.closest('[data-pm-open]');
  return node?String(node.getAttribute('data-pm-open')||''):'';
}
function setContext(id){
  id=String(id||'');
  window.__pstCurrentProjectId=id;
  window._curProjId=id;
  try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  var select=document.getElementById('global-proj');
  if(select){
    // Synchronize the visible selector only. Its inline onchange calls the legacy
    // loadProject path, while this module opens the canonical workspace explicitly.
    // Dispatching change here therefore starts two project loaders for one click.
    select.value=id;
  }
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
  if(!id||busy)return;
  busy=true;setContext(id);
  try{
    if(typeof window.pstOpenProjectWorkspace==='function'){
      await window.pstOpenProjectWorkspace(id);
      ensureGmailButton(id);
      return;
    }
    if(typeof window.loadProject==='function'){
      await window.loadProject(id);
      ensureGmailButton(id);
      return;
    }
    if(typeof window.openOverview==='function'){
      window.openOverview(id);
      return;
    }
    throw new Error('Funksioni i projektit nuk është ngarkuar.');
  }catch(error){showError(error);}finally{busy=false;}
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
