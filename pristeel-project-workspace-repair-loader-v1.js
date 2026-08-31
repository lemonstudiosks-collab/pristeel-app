/* PRISTEEL canonical project critical preloader.
 * Loads the read-only project truth stack early so project navigation has one
 * deterministic owner before the large additive runtime finishes loading.
 * No Home mutation, no polling, no opener wrapping, no business-data writes.
 */
(function(){
'use strict';
if(window.__pstProjectCriticalPreloadV1)return;
window.__pstProjectCriticalPreloadV1=true;
window.__pstProjectWorkspaceRepairLoaderV1=true;

function ready(test){try{return !!test();}catch(e){return false;}}
function load(src,attr,test){
  if(ready(test))return Promise.resolve(true);
  return new Promise(function(resolve,reject){
    var old=document.querySelector('script['+attr+']');
    if(old){
      if(ready(test)){resolve(true);return;}
      old.addEventListener('load',function(){ready(test)?resolve(true):reject(new Error('Moduli nuk u aktivizua: '+src));},{once:true});
      old.addEventListener('error',function(){reject(new Error('Nuk u ngarkua: '+src));},{once:true});
      return;
    }
    var s=document.createElement('script');
    s.src=src;s.defer=true;s.setAttribute(attr,'1');
    s.onload=function(){ready(test)?resolve(true):reject(new Error('Moduli nuk u aktivizua: '+src));};
    s.onerror=function(){reject(new Error('Nuk u ngarkua: '+src));};
    document.head.appendChild(s);
  });
}

var chain=Promise.resolve()
  .then(function(){return load('pristeel-project-data-integrity-v1.js?v=20260831-canonical1','data-pst-project-data-integrity-critical',function(){return window.PSTProjectDataIntegrity&&typeof window.PSTProjectDataIntegrity.load==='function';});})
  .then(function(){return load('pristeel-project-engine-v1.js?v=20260831-canonical1','data-pst-project-engine-critical',function(){return window.PSTProjectEngineV1&&typeof window.PSTProjectEngineV1.loadProjectDossier==='function';});})
  .then(function(){return load('pristeel-project-integrity-ui-v1.js?v=20260831-canonical1','data-pst-project-integrity-ui-critical',function(){return typeof window.pstOpenProjectWorkspace==='function'&&window.pstOpenProjectWorkspace.__pstCanonicalOwner==='pristeel-project-integrity-ui-v1';});})
  .then(function(){return load('pristeel-project-owner-lock-v1.js?v=20260831-canonical1','data-pst-project-owner-lock-critical',function(){return window.PSTProjectOwnerLockV1&&typeof window.PSTProjectOwnerLockV1.open==='function';});})
  .then(function(){
    window.__pstProjectCriticalReady=true;
    try{document.dispatchEvent(new CustomEvent('pst:project-critical-ready'));}catch(e){}
    return true;
  })
  .catch(function(error){
    window.__pstProjectCriticalReady=false;
    window.__pstProjectCriticalError=String(error&&error.message||error);
    console.error('PPPP canonical project preload:',error);
    return false;
  });

window.PSTProjectCriticalRuntimeV1={ready:chain};
})();