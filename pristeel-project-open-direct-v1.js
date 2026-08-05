/* PRISTEEL direct project opener
 * Keeps project-list clicks synchronous and independent from background observers.
 */
(function(){
'use strict';
if(window.__pstProjectOpenDirectV1)return;
window.__pstProjectOpenDirectV1=true;

var busy=false;
function projectIdFrom(target){
  var node=target&&target.closest?target.closest('[data-pm-open]'):null;
  return node?String(node.getAttribute('data-pm-open')||''):'';
}
function setContext(id){
  id=String(id||'');
  window.__pstCurrentProjectId=id;
  window._curProjId=id;
  try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  var select=document.getElementById('global-proj');
  if(select){
    select.value=id;
    try{select.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
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
async function open(id){
  if(!id||busy)return;
  busy=true;setContext(id);
  try{
    if(typeof window.pstOpenProjectWorkspace==='function'){
      await window.pstOpenProjectWorkspace(id);
      return;
    }
    if(typeof window.loadProject==='function'){
      await window.loadProject(id);
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
document.addEventListener('click',click,true);
window.pstOpenProjectDirect=open;
})();
