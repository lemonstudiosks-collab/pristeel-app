/* PRISTEEL early runtime stability guard.
 * Keeps project opening bounded and gives the final Live Home one visible owner.
 * UI-only: no business-data writes and no outbound communication.
 */
(function(){
'use strict';
if(window.__pstProjectWorkspaceRepairLoaderV2)return;
window.__pstProjectWorkspaceRepairLoaderV2=true;
window.__pstProjectWorkspaceRepairLoaderV1=true;

var OPEN_TIMEOUT_MS=5000;
var REPAIR_TIMEOUT_MS=3000;
var repairPromise=null;
var controlPromise=null;
var homeObserver=null;
var homeObservedPage=null;

function S(v){return String(v==null?'':v);}
function loadScriptOnce(attr,src,globalName){
  if(globalName&&window[globalName])return Promise.resolve(window[globalName]);
  return new Promise(function(resolve,reject){
    var old=document.querySelector('script['+attr+']');
    if(old){
      if(globalName&&window[globalName]){resolve(window[globalName]);return;}
      old.addEventListener('load',function(){resolve(globalName?window[globalName]:true);},{once:true});
      old.addEventListener('error',reject,{once:true});
      return;
    }
    var s=document.createElement('script');
    s.src=src;s.defer=true;s.setAttribute(attr,'1');
    s.onload=function(){resolve(globalName?window[globalName]:true);};
    s.onerror=function(){reject(new Error('Nuk u ngarkua '+src));};
    document.head.appendChild(s);
  });
}
function loadRepair(){
  if(window.__pstProjectWorkspaceRepairV1)return Promise.resolve(true);
  if(repairPromise)return repairPromise;
  repairPromise=loadScriptOnce('data-pst-project-workspace-repair-critical','pristeel-project-workspace-repair-v1.js?v=20260831-stability1')
    .catch(function(e){console.warn('PPPP project repair loader:',e);repairPromise=null;return false;});
  return repairPromise;
}
function setProjectContext(id){
  id=S(id).trim();if(!id)return'';
  window.__pstCurrentProjectId=id;window._curProjId=id;
  try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  var sel=document.getElementById('global-proj');if(sel)sel.value=id;
  return id;
}
function projectPageUsable(){
  var p=document.getElementById('page-workspace-project');if(!p)return false;
  var txt=S(p.textContent).replace(/\s+/g,' ').trim();
  if(!txt)return false;
  if(/^Duke hapur projektin(?:\.\.\.)?$/i.test(txt))return false;
  if(/^Duke bashkuar të dhënat e projektit(?:\.\.\.)?$/i.test(txt))return false;
  if(/^(Loading|Po ngarkohet)\b/i.test(txt)&&txt.length<90)return false;
  return true;
}
function withDeadline(value,ms){
  return new Promise(function(resolve){
    var done=false,t=setTimeout(function(){if(done)return;done=true;resolve({ok:false,timeout:true,value:false});},ms);
    Promise.resolve(value).then(function(v){if(done)return;done=true;clearTimeout(t);resolve({ok:true,timeout:false,value:v});},function(e){if(done)return;done=true;clearTimeout(t);resolve({ok:false,timeout:false,error:e,value:false});});
  });
}
async function repairProject(id){
  id=setProjectContext(id);if(!id)return false;
  await loadRepair();
  if(typeof window.pstRepairProjectWorkspace!=='function')return false;
  var out=await withDeadline((function(){try{return window.pstRepairProjectWorkspace();}catch(e){return Promise.reject(e);}})(),REPAIR_TIMEOUT_MS);
  return !!(out.ok&&projectPageUsable());
}
function wrapProjectOpener(){
  var base=window.pstOpenProjectWorkspace;
  if(typeof base!=='function'||base.__pstOpenStabilityV2)return false;
  async function stableOpen(id){
    id=setProjectContext(id);if(!id)return false;
    var args=arguments,self=this;
    var out=await withDeadline((function(){try{return base.apply(self,args);}catch(e){return Promise.reject(e);}})(),OPEN_TIMEOUT_MS);
    if(out.ok&&projectPageUsable())return out.value;
    var repaired=await repairProject(id);
    if(repaired)return true;
    if(out.error)console.warn('PPPP project opener:',out.error);
    return out.ok?out.value:false;
  }
  stableOpen.__pstOpenStabilityV2=true;
  stableOpen.__base=base;
  window.pstOpenProjectWorkspace=stableOpen;
  return true;
}

function homeActive(){
  var p=document.getElementById('page-workspace-home');if(!p)return null;
  if(!p.classList.contains('active')&&p.style.display==='none')return null;
  try{var cs=window.getComputedStyle&&window.getComputedStyle(p);if(cs&&cs.display==='none')return null;}catch(e){}
  return p;
}
function loadControlHome(){
  if(window.PSTProjectControlHomeV1)return Promise.resolve(window.PSTProjectControlHomeV1);
  if(controlPromise)return controlPromise;
  controlPromise=loadScriptOnce('data-pst-project-control-home-v6','pristeel-project-control-home-v1.js?v=20260831-stability1','PSTProjectControlHomeV1')
    .catch(function(e){console.warn('PPPP final Home loader:',e);controlPromise=null;return null;});
  return controlPromise;
}
function retireOtherHomeChildren(page,root){
  if(!page||!root||!page.contains(root))return false;
  Array.prototype.slice.call(page.children).forEach(function(child){
    if(child===root){child.hidden=false;child.style.removeProperty('display');child.removeAttribute('aria-hidden');return;}
    child.hidden=true;child.style.display='none';child.setAttribute('aria-hidden','true');
  });
  page.dataset.pstHomeStable='1';
  page.dataset.pstHomeOwner='project-control-v2';
  page.dataset.pstHomeExclusive='1';
  return true;
}
async function claimFinalHome(){
  var page=homeActive();if(!page)return false;
  var api=await loadControlHome();
  if(!api||typeof api.apply!=='function')return false;
  try{api.apply(false);}catch(e){console.warn('PPPP final Home apply:',e);}
  var root=document.getElementById('pst-project-control-home-v2');
  if(!root){await new Promise(function(r){setTimeout(r,40);});root=document.getElementById('pst-project-control-home-v2');}
  if(!root)return false;
  return retireOtherHomeChildren(page,root);
}
function observeHome(){
  var p=document.getElementById('page-workspace-home');if(!p||p===homeObservedPage)return;
  if(homeObserver){try{homeObserver.disconnect();}catch(e){}}
  homeObservedPage=p;
  homeObserver=new MutationObserver(function(muts){
    var directChange=muts.some(function(m){return m.target===p&&m.type==='childList';});
    if(directChange)setTimeout(function(){claimFinalHome();repairButtonContrast(document);},0);
  });
  homeObserver.observe(p,{childList:true});
}

function rgb(v){var m=S(v).match(/rgba?\((\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/i);return m?[Number(m[1]),Number(m[2]),Number(m[3])]:null;}
function lum(c){if(!c)return 1;function x(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}return .2126*x(c[0])+.7152*x(c[1])+.0722*x(c[2]);}
function contrast(a,b){var x=Math.max(a,b),y=Math.min(a,b);return(x+.05)/(y+.05);}
function repairButtonContrast(root){
  root=root&&root.querySelectorAll?root:document;
  Array.prototype.forEach.call(root.querySelectorAll('button,.btn,[role="button"],a.pf2-btn,a.pst-pi-btn'),function(el){
    try{
      var cs=getComputedStyle(el),bg=rgb(cs.backgroundColor),fg=rgb(cs.color);if(!bg||!fg)return;
      var bl=lum(bg),fl=lum(fg);if(bl<.42&&contrast(bl,fl)<3.2){el.style.setProperty('color','#fff','important');}
    }catch(e){}
  });
}
function installCss(){
  if(document.getElementById('pst-runtime-stability-v2-css'))return;
  var s=document.createElement('style');s.id='pst-runtime-stability-v2-css';s.textContent='\
#page-workspace-home[data-pst-home-stable="1"]>*:not(#pst-project-control-home-v2){display:none!important}\
#page-workspace-home[data-pst-home-stable="1"]>#pst-project-control-home-v2{display:block!important;visibility:visible!important;opacity:1!important}\
';document.head.appendChild(s);
}
function reconcile(){
  wrapProjectOpener();observeHome();claimFinalHome();repairButtonContrast(document);
}

installCss();loadRepair();
[0,120,400,1000,2500,5000].forEach(function(ms){setTimeout(reconcile,ms);});
document.addEventListener('pst:modules-ready',function(){[0,180,700,1800].forEach(function(ms){setTimeout(reconcile,ms);});},{once:true});
window.addEventListener('pageshow',function(){setTimeout(reconcile,80);});
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[data-live-project],[data-live-open],#page-workspace-projects .pst-pm-row,button,.btn'):null;
  if(t)[0,100,420].forEach(function(ms){setTimeout(reconcile,ms);});
},true);
window.PSTRuntimeStabilityV2={reconcile:reconcile,wrapProjectOpener:wrapProjectOpener,repairProject:repairProject,claimFinalHome:claimFinalHome,repairButtonContrast:repairButtonContrast};
})();