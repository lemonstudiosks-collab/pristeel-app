/* PRISTEEL canonical project owner lock v1
 * Keeps one project-open owner while leaving legacy compatibility modules loaded.
 * Navigation-only: no Supabase writes and no outbound actions.
 */
(function(){
'use strict';
if(window.__pstProjectOwnerLockV1)return;
window.__pstProjectOwnerLockV1=true;

var api=window.PSTProjectIntegrityUIV1;
if(!api||typeof api.open!=='function'){
  console.error('PPPP project owner lock: canonical Project Integrity owner is unavailable.');
  return;
}
var canonical=api.open;
var rejected=[];
canonical.__pstCanonicalOwner='pristeel-project-integrity-ui-v1';
canonical.__pstTruthTransition=true;

function S(v){return String(v==null?'':v).trim();}
function valid(id){return /^[a-z0-9-]{8,}$/i.test(S(id));}
function rememberRejected(fn){
  if(typeof fn!=='function')return;
  rejected.push({name:fn.name||'anonymous',at:new Date().toISOString(),flags:Object.keys(fn).filter(function(k){return /^__pst/.test(k);}).slice(0,12)});
  if(rejected.length>50)rejected.shift();
}

try{
  Object.defineProperty(window,'pstOpenProjectWorkspace',{
    configurable:true,
    enumerable:true,
    get:function(){return canonical;},
    set:function(fn){
      if(fn===canonical)return;
      if(fn&&fn.__pstCanonicalOwner==='pristeel-project-integrity-ui-v1'){canonical=fn;return;}
      rememberRejected(fn);
    }
  });
}catch(e){
  window.pstOpenProjectWorkspace=canonical;
}

function independentRowControl(target,row){
  if(!target||!target.closest||!row)return false;
  var el=target.closest('.pst-pm-more,#pst-pm-menu,button,a,input,select,textarea,[role="button"],[data-act],[contenteditable="true"]');
  if(!el||!row.contains(el))return false;
  return !el.hasAttribute('data-pm-open')&&!el.hasAttribute('data-live-project')&&!el.hasAttribute('data-live-open');
}
function hit(target){
  if(!target||!target.closest)return null;
  var live=target.closest('[data-live-project],[data-live-open]');
  if(live){var liveId=S(live.getAttribute('data-live-project')||live.getAttribute('data-live-open'));if(valid(liveId))return{id:liveId,node:live};}
  var row=target.closest('#page-workspace-projects .pst-pm-row[data-project-id]');
  if(row&&!independentRowControl(target,row)){
    var rowId=S(row.getAttribute('data-project-id')||row.getAttribute('data-pm-open')||(row.querySelector('[data-pm-open]')&&row.querySelector('[data-pm-open]').getAttribute('data-pm-open')));
    if(valid(rowId))return{id:rowId,node:row};
  }
  var direct=target.closest('[data-pm-open],[data-pdc-open]');
  if(direct){var id=S(direct.getAttribute('data-pm-open')||direct.getAttribute('data-pdc-open'));if(valid(id))return{id:id,node:direct};}
  return null;
}
function open(id){
  id=S(id);if(!valid(id))return Promise.resolve(false);
  return Promise.resolve(canonical(id)).catch(function(error){console.error('PPPP canonical project navigation:',error);return false;});
}
function click(event){
  var h=hit(event.target);if(!h)return;
  event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
  open(h.id);
}
function keydown(event){
  if(event.key!=='Enter'&&event.key!==' ')return;
  var h=hit(event.target);if(!h)return;
  event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
  open(h.id);
}

document.addEventListener('click',click,true);
document.addEventListener('keydown',keydown,true);
window.PSTProjectOwnerLockV1={open:open,current:function(){return canonical;},rejected:function(){return rejected.slice();}};
})();