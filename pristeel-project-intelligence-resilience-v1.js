/* PRISTEEL Project Intelligence resilience v1
 * Final additive guard for whole-project analysis.
 * - Filters completed/archived tasks from the active-task view used during analysis.
 * - Corrects the Project Summary "Detyra hapur" metric from live task status.
 * - On recoverable AI generation failures (429/TPM or invalid structured JSON generation), reuses the existing rule-based Project Intelligence analysis instead of leaving an empty result.
 * - Terminal projects become close-out briefs: historic delivery deadlines stay historic, real recent delivery/complaint communication is surfaced, and only genuinely open follow-up remains actionable.
 * Does not change the selected AI provider, send email, or auto-change project status.
 */
(function(){
'use strict';
if(window.__pstProjectIntelligenceResilienceV1)return;
window.__pstProjectIntelligenceResilienceV1=true;

function arr(v){return Array.isArray(v)?v:[];}
function str(v){return String(v==null?'':v);}
function enc(v){return encodeURIComponent(str(v));}
function norm(v){return str(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s-]+/g,'_').trim();}
function isOpenTask(t){
  var s=norm(t&&t.status);
  if(!s)return true;
  if(/^(kryer|arkivuar|mbyllur|done|closed|complete|completed|archived|cancel|cancelled|canceled|resolved)$/.test(s))return false;
  return true;
}
function terminalStatus(v){return /^(realizuar|mbyllur|arkivuar|archived|closed|complete|completed|done)$/.test(norm(v));}
function isRateLimitText(v){return /rate\s*limit|quota|tokens?\s+per\s+minute|\bTPM\b|\b429\b|too\s+many\s+requests|try\s+again\s+in/i.test(str(v));}
function isGenerationFailureText(v){return /failed[_\s-]*generation|failed\s+to\s+validate\s+json|invalid\s+(?:structured\s+)?json|malformed\s+json|json\s+(?:schema\s+)?validation\s+(?:failed|error)|could\s+not\s+(?:parse|validate).*json|unable\s+to\s+(?:parse|validate).*json/i.test(str(v));}
function recoverableFailureKind(v){if(isRateLimitText(v))return'rate_limit';if(isGenerationFailureText(v))return'generation';return'';}
function stateText(pid){var e=document.getElementById('pai-state-'+pid);return e?str(e.textContent):'';}
function setState(pid,text,color){var e=document.getElementById('pai-state-'+pid);if(!e)return;e.textContent=text;e.style.color=color||'var(--text3)';}
function activeId(){var d=window.__pstIntegrityLastData;return str(window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'');}
async function safe(path){try{return arr(await window.supaFetch(path));}catch(e){return[];}}
function dateOnly(v){if(!v)return'';var d=new Date(v);if(isNaN(d))return str(v).slice(0,10);try{return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'});}catch(e){return str(v).slice(0,10);}}
function emailText(x){return [x&&x.subject,x&&x.snippet,x&&x.from_email,arr(x&&x.to_emails).join(' ')].join(' ');}
function newestMatch(rows,re,direction){for(var i=0;i<rows.length;i++){var x=rows[i];if(direction&&str(x.direction)!==direction)continue;if(re.test(emailText(x)))return x;}return null;}
function financeTask(t){return /invoice|fatur|pages|pagese|payment|receivable|payable|ark[eë]tim/i.test([t&&t.title,t&&t.detail,t&&t.category,t&&t.source].join(' '));}

function taskQueryFor(path,pid){
  var p=str(path);
  return p.indexOf('tasks?')===0&&p.indexOf('project_id=eq.'+enc(pid))>-1;
}
async function withOpenTaskReads(pid,fn){
  var base=window.supaFetch;
  if(typeof base!=='function')return fn();
  function scoped(path){
    var args=arguments,out=base.apply(this,args);
    if(!taskQueryFor(path,pid))return out;
    return Promise.resolve(out).then(function(rows){return arr(rows).filter(isOpenTask);});
  }
  window.supaFetch=scoped;
  try{return await fn();}
  finally{if(window.supaFetch===scoped)window.supaFetch=base;}
}

function cleanTerminalAnalysis(a){
  if(!a||typeof a!=='object')return{analysis:a,changed:false,deadlinePenaltyRemoved:false};
  var changed=false,removed=false;
  var risks=arr(a.risks),next=arr(a.next_actions),dead=arr(a.deadlines);
  var nr=risks.filter(function(x){var hit=/afati i projektit ka kaluar/i.test(str(x&&x.text));if(hit){changed=true;removed=true;}return !hit;});
  var na=next.filter(function(x){var hit=/konfirmo statusin e afatit me klientin/i.test(str(x&&x.title));if(hit)changed=true;return !hit;});
  var nd=dead.map(function(x){if(/afati i regjistruar i projektit/i.test(str(x&&x.text))){var y=Object.assign({},x);y.text='Afati i regjistruar i projektit (historik)';y.status='completed';changed=true;return y;}return x;});
  if(nr.length!==risks.length||changed)a.risks=nr;
  if(na.length!==next.length||changed)a.next_actions=na;
  if(changed)a.deadlines=nd;
  if(/analiza semantike kërkon Groq API Key/i.test(str(a.executive_summary))){
    a.executive_summary=str(a.executive_summary).replace(/Ky është vlerësim operativ me rregulla; analiza semantike kërkon Groq API Key\.?/i,'Ky është vlerësim operativ nga të dhënat aktuale të platformës; analiza semantike mund të rifreskohet kur shërbimi AI është i disponueshëm.');changed=true;
  }
  return{analysis:a,changed:changed,deadlinePenaltyRemoved:removed};
}

function applyTerminalCloseout(a,p,emails,tasks,forceSummary){
  if(!a||typeof a!=='object')return false;
  emails=arr(emails).slice().sort(function(x,y){return str(y.sent_at).localeCompare(str(x.sent_at));});
  tasks=arr(tasks).filter(isOpenTask);
  var finance=tasks.filter(financeTask);
  var delivery=newestMatch(emails,/custom\s*clear|customs?\s*clear|zoll.*(?:überlass|freigab|abfertig)|einfuhranmeldung.*überlass|unload|entlad|zugestellt|delivered|delivery|dor[eë]z|shkark/i,'');
  var complaint=newestMatch(emails,/reklamation|reklam|complaint|besch[aä]dig|damage|lackier|paint\s*damage|qualit[aä]ts.*(?:problem|mangel)/i,'incoming');
  var response=newestMatch(emails,/reklamation|reklam|complaint|besch[aä]dig|damage|lackier|feedback/i,'outgoing');
  var complaintOpen=false;
  if(complaint&&response){
    var rt=new Date(response.sent_at||0).getTime();
    complaintOpen=!emails.some(function(x){return str(x.direction)==='incoming'&&new Date(x.sent_at||0).getTime()>rt&&/reklamation|reklam|complaint|feedback|besch[aä]dig|damage|lackier/i.test(emailText(x));});
  }else complaintOpen=!!complaint;

  var parts=[];
  parts.push('Projekti “'+str(p.name||'')+'” është i regjistruar si i realizuar'+(p.client?' për '+str(p.client):'')+'.');
  if(delivery)parts.push('Komunikimi i '+dateOnly(delivery.sent_at)+' konfirmon fazën e dorëzimit/logjistikës ('+str(delivery.subject||'komunikim logjistik')+').');
  if(complaint)parts.push('Më '+dateOnly(complaint.sent_at)+' është regjistruar reklamacion/feedback nga klienti'+(response?' dhe PRISTEEL ka kthyer përgjigje më '+dateOnly(response.sent_at):'')+'.');
  if(finance.length)parts.push('Mbeten '+finance.length+' çështje financiare/administrative për ndjekje: '+finance.map(function(t){return str(t.title||'Detyrë financiare');}).join('; ')+'.');
  else if(tasks.length)parts.push('Mbeten '+tasks.length+' detyra të hapura për close-out: '+tasks.map(function(t){return str(t.title||'Detyrë');}).join('; ')+'.');
  else parts.push('Nuk ka detyra të hapura të regjistruara për close-out.');
  if(forceSummary||/vlerësim operativ|ka \d+ emaila|analiza semantike/i.test(str(a.executive_summary)))a.executive_summary=parts.join(' ');

  a.current_stage=p.pipeline_stage||a.current_stage||'closeout';
  a.health=a.health&&typeof a.health==='object'?a.health:{};
  var follow=tasks.length+(complaintOpen?1:0);
  a.health.score=follow?Math.max(80,100-Math.min(20,follow*5)):100;
  a.health.label=follow?'realizuar · ndjekje':'realizuar';
  a.health.reason=follow?'Projekti operativ është realizuar; rezultati tregon vetëm plotësinë e close-out-it dhe çështjet e mbetura.':'Projekti operativ është realizuar dhe nuk ka çështje të hapura të regjistruara.';
  a.recommendation={
    decision:follow?'mbyllje_me_ndjekje':'projekt_realizuar',
    label:follow?'Mbyllje / ndjekje':'Projekt i realizuar',
    reason:follow?'Puna operative është përfunduar. Ndiq vetëm çështjet e hapura të close-out-it; mos e trajto projektin si ofertë ose prodhim aktiv.':'Puna operative dhe close-out-i janë të përfunduara.',
    source_ids:['P1']
  };
  a.next_actions=tasks.map(function(t,i){return{title:str(t.title||'Mbyll detyrën e hapur'),why:str(t.detail||'Detyrë e hapur e close-out-it.'),due_date:t.due_date||null,priority:t.priority||'medium',source_ids:['T'+(i+1)]};});
  var otherRisks=arr(a.risks).filter(function(x){return !/reklamacion.*pa konfirmim|afati i projektit ka kaluar/i.test(str(x&&x.text));});
  if(complaintOpen)otherRisks.push({text:'Reklamacioni/feedback-u i klientit ka marrë trajtim, por nuk ka konfirmim të regjistruar se çështja është mbyllur nga klienti.',severity:'medium',status:'open',source_ids:['E1']});
  a.risks=otherRisks;
  return true;
}

async function postprocessTerminal(pid,fallbackKind){
  var p=(await safe('projects?id=eq.'+enc(pid)+'&select=id,name,status,pipeline_stage,deadline,client&limit=1'))[0];
  if(!p||!terminalStatus(p.status))return false;
  var rec=(await safe('project_analyses?project_id=eq.'+enc(pid)+'&order=created_at.desc&limit=1'))[0];
  if(!rec||!rec.id||!rec.analysis)return false;
  var cloned;try{cloned=JSON.parse(JSON.stringify(rec.analysis));}catch(e){return false;}
  var out=cleanTerminalAnalysis(cloned);
  var emails=await safe('project_emails?project_id=eq.'+enc(pid)+'&select=subject,sent_at,direction,from_email,to_emails,snippet&order=sent_at.desc&limit=120');
  var tasks=await safe('tasks?project_id=eq.'+enc(pid)+'&select=id,title,status,due_date,priority,detail,category,source&order=due_date.asc&limit=500');
  var closeout=applyTerminalCloseout(out.analysis,p,emails,tasks,!!fallbackKind);
  if(!out.changed&&!closeout&&!fallbackKind)return false;
  var payload={analysis:out.analysis};
  if(fallbackKind){payload.engine=fallbackKind==='rate_limit'?'rules_rate_limit':'rules_generation_fallback';payload.model=null;}
  await window.supaFetch('project_analyses?id=eq.'+enc(rec.id),'PATCH',payload);
  return true;
}

async function refreshOpenTaskMetric(pid){
  pid=str(pid||activeId());if(!pid)return null;
  var tasks=await safe('tasks?project_id=eq.'+enc(pid)+'&select=id,status,due_date&limit=2000'),count=tasks.filter(isOpenTask).length;
  var bg=document.getElementById('pst-project-summary-bg');
  if(bg){
    var metrics=[].slice.call(bg.querySelectorAll('.pst-ps-metric'));
    metrics.forEach(function(m){var s=m.querySelector('span'),b=m.querySelector('b');if(s&&b&&norm(s.textContent)==='detyra_hapur')b.textContent=String(count);});
  }
  return count;
}

function wrapAnalyze(){
  var original=window.pstAnalyzeProject;
  if(typeof original!=='function')return false;
  if(original.__pstRateLimitResilience)return true;
  async function wrapped(pid){
    pid=str(pid||activeId());var self=this,args=arguments;
    return withOpenTaskReads(pid,async function(){
      var result=await original.apply(self,args),failureKind=recoverableFailureKind(stateText(pid));
      if(failureKind){
        var ai=window.PSTAI||{},oldHas=ai.hasApiKey;
        if(typeof oldHas==='function'){
          setState(pid,failureKind==='rate_limit'?'Kufiri i përkohshëm i AI u arrit. Po krijohet analiza operative nga të dhënat e platformës…':'Përgjigjja AI nuk kaloi validimin e strukturuar. Po krijohet analiza operative nga të dhënat e platformës…','#9B6A22');
          ai.hasApiKey=function(){return false;};
          try{result=await original.apply(self,args);}
          finally{ai.hasApiKey=oldHas;}
          try{await postprocessTerminal(pid,failureKind);}catch(e){if(window.console&&console.warn)console.warn('Project Intelligence terminal cleanup:',e);}
          if(typeof window.pstProjectAnalysisLoad==='function')try{await window.pstProjectAnalysisLoad(pid);}catch(e){}
          setState(pid,failureKind==='rate_limit'?'Analiza operative u krijua. AI arriti kufirin e përkohshëm; përdor Rianalizo më vonë për analizë semantike.':'Analiza operative u krijua. Përgjigjja AI nuk kaloi validimin JSON; përdor Rianalizo më vonë për analizë semantike.','#2F7657');
        }
      }else{
        try{var changed=await postprocessTerminal(pid,'');if(changed&&typeof window.pstProjectAnalysisLoad==='function')await window.pstProjectAnalysisLoad(pid);}catch(e){if(window.console&&console.warn)console.warn('Project Intelligence terminal cleanup:',e);}
      }
      try{await refreshOpenTaskMetric(pid);}catch(e){}
      return result;
    });
  }
  wrapped.__pstRateLimitResilience=true;wrapped.__pstOriginal=original;window.pstAnalyzeProject=wrapped;return true;
}

function scheduleMetric(){var id=activeId();[0,180,650,1400].forEach(function(ms){setTimeout(function(){refreshOpenTaskMetric(id);},ms);});}
function install(){wrapAnalyze();if(document.getElementById('pst-project-summary-bg'))scheduleMetric();}
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('[data-pst-project-summary]'))scheduleMetric();},true);
document.addEventListener('pst:modules-ready',function(){install();},{once:true});
install();setTimeout(install,300);setTimeout(install,1000);

window.PSTProjectIntelligenceResilienceV1={install:install,refreshOpenTaskMetric:refreshOpenTaskMetric,_test:{isOpenTask:isOpenTask,terminalStatus:terminalStatus,isRateLimitText:isRateLimitText,isGenerationFailureText:isGenerationFailureText,recoverableFailureKind:recoverableFailureKind,cleanTerminalAnalysis:cleanTerminalAnalysis,applyTerminalCloseout:applyTerminalCloseout,financeTask:financeTask,taskQueryFor:taskQueryFor}};
})();
