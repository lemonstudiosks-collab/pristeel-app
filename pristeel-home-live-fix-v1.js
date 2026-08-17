/* PRISTEEL Home single-owner bridge v1
 * This official bootstrap slot no longer renders Home data.
 * It retires the competing legacy Home writers before they register listeners,
 * then loads the canonical Home owner exactly once.
 */
(function(){
'use strict';
if(window.__pstHomeLiveFixV1)return;
window.__pstHomeLiveFixV1=true;

/* Prevent the later legacy writers from registering competing render cycles. */
window.__pstHomeStabilityV2=true;
window.__pstHomeProjectRecoveryV3=true;
window.__pstHomeOperationalPriorityV1=true;

var loading=null;
function canonical(){return window.PSTHomeCanonicalV1||null;}
function load(){
  if(canonical())return Promise.resolve(canonical());
  if(loading)return loading;
  loading=new Promise(function(resolve,reject){
    var existing=document.querySelector('script[data-pst-home-canonical-v1]');
    if(existing){
      existing.addEventListener('load',function(){resolve(canonical());},{once:true});
      existing.addEventListener('error',reject,{once:true});
      return;
    }
    var s=document.createElement('script');
    s.src='pristeel-home-canonical-v1.js?v=20260817-singleowner1';
    s.defer=true;
    s.setAttribute('data-pst-home-canonical-v1','1');
    s.onload=function(){resolve(canonical());};
    s.onerror=function(){reject(new Error('Nuk u ngarkua Home canonical owner.'));};
    document.head.appendChild(s);
  }).catch(function(error){loading=null;console.error('PPPP canonical Home bootstrap failed',error);return null;});
  return loading;
}
function apply(){return load().then(function(api){return api&&typeof api.render==='function'?api.render(true):false;});}
window.PSTHomeLiveFixV1={apply:apply,loadCanonical:load,isBridge:true};
load();
})();
