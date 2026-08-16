/* PRISTEEL Project Analysis run guard v1
 * Prevents an explicit Project Intelligence analysis from hanging forever
 * when a browser blocks Google OAuth pop-ups.
 * - Caps Gmail/Drive authorization waits only during the analysis run.
 * - Restores the original auth functions immediately afterwards.
 * - Does not send email, write BOM/tasks, or change project status.
 */
(function(){
'use strict';
if(window.__pstProjectAnalysisRunGuardV1)return;
window.__pstProjectAnalysisRunGuardV1=true;

var AUTH_WAIT_MS=8000;
var running={};
function str(v){return String(v==null?'':v);}
function activeId(id){var d=window.__pstIntegrityLastData;return str(id||window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'').trim();}
function setState(pid,text,color){var e=document.getElementById('pai-state-'+pid);if(!e)return;e.textContent=text;e.style.color=color||'var(--text3)';}
function timeoutPromise(p,ms,label){
  return new Promise(function(resolve,reject){
    var settled=false,t=setTimeout(function(){if(settled)return;settled=true;reject(new Error(label+' nuk u përfundua brenda '+Math.round(ms/1000)+' sekondave. Analiza vazhdon me të dhënat e PPPP-së.'));},ms);
    Promise.resolve(p).then(function(v){if(settled)return;settled=true;clearTimeout(t);resolve(v);},function(e){if(settled)return;settled=true;clearTimeout(t);reject(e);});
  });
}
function guardedAuth(owner,key,label){
  if(!owner||typeof owner[key]!=='function')return null;
  var base=owner[key];
  owner[key]=function(){var out;try{out=base.apply(this,arguments);}catch(e){return Promise.reject(e);}return timeoutPromise(out,AUTH_WAIT_MS,label);};
  return function(){if(owner[key]&&owner[key]!==base)owner[key]=base;};
}
async function withAuthGuards(fn){
  var restores=[];
  var a=guardedAuth(window.PSTEmail,'auth','Autorizimi Gmail');if(a)restores.push(a);
  var d=guardedAuth(window.PSTDriveImport,'authorize','Autorizimi Google Drive');if(d)restores.push(d);
  try{return await fn();}
  finally{for(var i=restores.length-1;i>=0;i--)try{restores[i]();}catch(e){}}
}
function chainHas(fn,flag){var n=0;while(typeof fn==='function'&&n++<12){if(fn[flag])return true;fn=fn.__pstOriginal||fn.__base||null;}return false;}
function install(){
  var original=window.pstAnalyzeProject;
  if(typeof original!=='function')return false;
  if(chainHas(original,'__pstAnalysisRunGuardV1'))return true;
  async function wrapped(pid){
    pid=activeId(pid);if(!pid)return original.apply(this,arguments);
    if(running[pid])return running[pid];
    var self=this,args=arguments;
    setState(pid,'Po përgatitet analiza e projektit…');
    var job=withAuthGuards(function(){return original.apply(self,args);});
    running[pid]=job;
    try{return await job;}
    finally{delete running[pid];}
  }
  wrapped.__pstAnalysisRunGuardV1=true;
  wrapped.__pstOriginal=original;
  window.pstAnalyzeProject=wrapped;
  return true;
}
install();
document.addEventListener('pst:modules-ready',function(){install();},{once:true});
setTimeout(install,300);setTimeout(install,1200);
window.PSTProjectAnalysisRunGuardV1={install:install,_test:{timeoutPromise:timeoutPromise,chainHas:chainHas}};
})();
