/* PRISTEEL Project Analysis run guard v1
 * Prevents an explicit Project Intelligence analysis from hanging forever
 * when a browser blocks Google OAuth pop-ups.
 * - Caps Gmail/Drive authorization waits only during the analysis run.
 * - Restores the original auth functions immediately afterwards.
 * - Provides one guarded programmatic path for Project Intelligence analysis runs.
 * - If an AI run returns without creating a project_analyses row, retries once with the existing rule engine.
 * - Clears stale per-project running locks so a completed UI cannot stay blocked forever.
 * - Preserves newer server/canonical reactive analyses when Project Summary opens, instead of overwriting them with a weaker generic browser analysis.
 * - If Project Summary has no authoritative reactive analysis and cannot run fresh analysis because Google authorization failed, starts the guarded analysis from PPPP data after the summary settles.
 * - Does not send email, write BOM/tasks, or change project status.
 */
(function(){
'use strict';
if(window.__pstProjectAnalysisRunGuardV1)return;
window.__pstProjectAnalysisRunGuardV1=true;

var AUTH_WAIT_MS=8000;
var RUN_STALE_MS=180000;
var SUMMARY_RECHECK_MS=3500;
var SUMMARY_MAX_CHECKS=8;
var SUMMARY_INTENT_MS=180000;
var running={},summaryIntent={};
function str(v){return String(v==null?'':v);}
function enc(v){return encodeURIComponent(str(v));}
function activeId(id){var d=window.__pstIntegrityLastData;return str(id||window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'').trim();}
function stateText(pid){var e=document.getElementById('pai-state-'+pid);return e?str(e.textContent).trim():'';}
function setState(pid,text,color){var e=document.getElementById('pai-state-'+pid);if(!e)return;e.textContent=text;e.style.color=color||'var(--text3)';}
async function latestRecord(pid){
  if(typeof window.supaFetch!=='function')return null;
  try{var rows=await window.supaFetch('project_analyses?project_id=eq.'+enc(pid)+'&select=id,created_at,engine&order=created_at.desc&limit=1');return Array.isArray(rows)&&rows[0]?rows[0]:null;}catch(e){return null;}
}
function isNewRecord(before,after){return !!after&&(!before||str(before.id)!==str(after.id)||str(before.created_at)!==str(after.created_at));}
function authoritativeRecord(record){var e=str(record&&record.engine).toLowerCase().trim();return !!e&&(e.indexOf('server_')===0||e==='project_state_rules'||e==='dynamic_plan_rules');}
function summaryIntentActive(pid){var x=summaryIntent[pid];if(!x)return false;if(Date.now()-x.at>SUMMARY_INTENT_MS){delete summaryIntent[pid];return false;}return true;}
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
async function retryWithRules(original,self,args,pid){
  var ai=window.PSTAI||{},oldHas=ai.hasApiKey;
  if(typeof oldHas!=='function')return{attempted:false,result:null};
  setState(pid,'Analiza AI nuk u ruajt. Po krijohet analiza operative nga të dhënat e platformës…','#9B6A22');
  ai.hasApiKey=function(){return false;};
  try{return{attempted:true,result:await original.apply(self,args)};}
  finally{ai.hasApiKey=oldHas;}
}
function chainHas(fn,flag){var n=0;while(typeof fn==='function'&&n++<12){if(fn[flag])return true;fn=fn.__pstOriginal||fn.__base||null;}return false;}
function findGuard(fn){var n=0;while(typeof fn==='function'&&n++<12){if(fn.__pstAnalysisRunGuardV1)return fn;fn=fn.__pstOriginal||fn.__base||null;}return null;}
function activeRun(pid){
  var r=running[pid];if(!r)return null;
  if(!r.promise||!r.startedAt){delete running[pid];return null;}
  if(Date.now()-r.startedAt>=RUN_STALE_MS){delete running[pid];return null;}
  return r;
}
function install(){
  var original=window.pstAnalyzeProject;
  if(typeof original!=='function')return false;
  if(chainHas(original,'__pstAnalysisRunGuardV1'))return true;
  async function wrapped(pid){
    pid=activeId(pid);if(!pid)return original.apply(this,arguments);
    if(summaryIntentActive(pid)){
      delete summaryIntent[pid];
      var current=await latestRecord(pid);
      if(authoritativeRecord(current)){
        if(typeof window.pstProjectAnalysisLoad==='function')try{await window.pstProjectAnalysisLoad(pid);}catch(e){}
        setState(pid,'Po shfaqet analiza automatike më e fundit e projektit.','#2F7657');
        return current;
      }
    }
    var existing=activeRun(pid);
    if(existing){setState(pid,'Analiza është tashmë duke u përpunuar…');return existing.promise;}
    var self=this,args=arguments;
    setState(pid,'Po përgatitet analiza e projektit…');
    var job=withAuthGuards(async function(){
      var before=await latestRecord(pid),result=await original.apply(self,args),firstState=stateText(pid),after=await latestRecord(pid);
      if(isNewRecord(before,after))return result;
      var retry=await retryWithRules(original,self,args,pid);
      if(!retry.attempted){
        setState(pid,firstState||'Analiza nuk u ruajt. Motori operativ nuk ishte i disponueshëm.','#A64B42');
        return result;
      }
      var secondState=stateText(pid),afterRules=await latestRecord(pid);
      if(isNewRecord(before,afterRules)){
        setState(pid,'Analiza operative u krijua nga të dhënat aktuale të platformës.','#2F7657');
        return retry.result;
      }
      var failure=/^Analiza d[eë]shtoi\s*:/i.test(secondState)?secondState:(/^Analiza d[eë]shtoi\s*:/i.test(firstState)?firstState:'Analiza nuk u ruajt as me motorin operativ.');
      setState(pid,failure,'#A64B42');
      return retry.result;
    });
    running[pid]={promise:job,startedAt:Date.now()};
    try{return await job;}
    finally{if(running[pid]&&running[pid].promise===job)delete running[pid];}
  }
  wrapped.__pstAnalysisRunGuardV1=true;
  wrapped.__pstOriginal=original;
  window.pstAnalyzeProject=wrapped;
  return true;
}
function run(pid){
  pid=activeId(pid);if(!pid)return Promise.resolve(null);
  install();
  var fn=findGuard(window.pstAnalyzeProject)||window.pstAnalyzeProject;
  if(typeof fn!=='function'){
    setState(pid,'Motori i analizës nuk është ngarkuar. Rifresko faqen dhe provo përsëri.','#A64B42');
    return Promise.resolve(null);
  }
  return Promise.resolve(fn(pid));
}
function buttonAndPid(target){
  if(!target||!target.closest)return null;
  var button=target.closest('[id^="pai-analyze-"]');
  if(button)return{button:button,pid:str(button.id).slice('pai-analyze-'.length)};
  button=target.closest('.pai-empty .pai-btn.primary');
  if(!button)return null;
  var body=button.closest('[id^="pai-body-"]');
  return body?{button:button,pid:str(body.id).slice('pai-body-'.length)}:null;
}
function onAnalysisClick(e){
  var hit=buttonAndPid(e.target);if(!hit||!hit.pid||hit.button.disabled)return;
  delete summaryIntent[hit.pid];
  e.preventDefault();
  e.stopPropagation();
  if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
  setState(hit.pid,'Po nis rifreskimi i analizës…');
  setTimeout(function(){run(hit.pid);},0);
}
function summarySettled(){
  var s=document.getElementById('pst-ps-sync-state'),t=str(s&&s.textContent).trim();
  if(!t)return false;
  return !/^Po sinkronizohen/i.test(t)&&!/Po krijohet analiza e freskët/i.test(t);
}
function summaryBusy(pid){var b=document.getElementById('pai-analyze-'+pid),p=document.getElementById('pai-progress-'+pid);return !!((b&&b.disabled)||(p&&p.classList&&p.classList.contains('on')));}
function ensureSummaryAnalysis(pid,before,attempt){
  attempt=attempt||0;
  if(authoritativeRecord(before)){delete summaryIntent[pid];return;}
  if(!document.getElementById('pst-project-summary-bg')){delete summaryIntent[pid];return;}
  if((!summarySettled()||summaryBusy(pid))&&attempt<SUMMARY_MAX_CHECKS){setTimeout(function(){ensureSummaryAnalysis(pid,before,attempt+1);},SUMMARY_RECHECK_MS);return;}
  latestRecord(pid).then(function(after){
    delete summaryIntent[pid];
    if(authoritativeRecord(after)||isNewRecord(before,after)||summaryBusy(pid))return;
    setState(pid,'Google Workspace nuk e nisi analizën e re. Po vazhdohet automatikisht me të dhënat e PPPP-së…','#9B6A22');
    run(pid);
  });
}
function onSummaryClick(e){
  if(!e.target||!e.target.closest||!e.target.closest('[data-pst-project-summary]'))return;
  var pid=activeId();if(!pid)return;
  summaryIntent[pid]={at:Date.now()};
  latestRecord(pid).then(function(before){setTimeout(function(){ensureSummaryAnalysis(pid,before,0);},SUMMARY_RECHECK_MS);});
}
install();
document.addEventListener('click',onAnalysisClick,true);
document.addEventListener('click',onSummaryClick,true);
document.addEventListener('pst:modules-ready',function(){install();},{once:true});
setTimeout(install,300);setTimeout(install,1200);
window.PSTProjectAnalysisRunGuardV1={version:'20260818-7',install:install,run:run,_test:{timeoutPromise:timeoutPromise,chainHas:chainHas,buttonAndPid:buttonAndPid,isNewRecord:isNewRecord,authoritativeRecord:authoritativeRecord,summaryIntentActive:summaryIntentActive,activeRun:activeRun,summarySettled:summarySettled,summaryBusy:summaryBusy}};
})();
