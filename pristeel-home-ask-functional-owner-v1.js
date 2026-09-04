/* PRISTEEL Home Ask functional-owner bridge v3
 * Keeps the single visible Native UI v4 Home while reconnecting the moved Ask shell
 * to the already-bound Project Control Home renderer, even when that owner arrives late.
 * Adds a read-only local evidence preflight for company portfolios and confirmed execution facts.
 * No business writes and no duplicate AI/request path.
 */
(function(){
'use strict';
if(window.__pstHomeAskFunctionalOwnerV3)return;
window.__pstHomeAskFunctionalOwnerV3=true;
window.__pstHomeAskFunctionalOwnerV2=true;
window.__pstHomeAskFunctionalOwnerV1=true;
var observer=null,stopTimer=null;
function S(v){return String(v==null?'':v);}
function A(v){return Array.isArray(v)?v:[];}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function ts(v){var n=Date.parse(v||'');return Number.isFinite(n)?n:0;}
function clamp(v,n){v=S(v).replace(/\s+/g,' ').trim();return v.length>n?v.slice(0,n-1)+'…':v;}
var STOP={cfare:1,cka:1,kemi:1,ndodh:1,gjendja:1,statusi:1,projekt:1,projekte:1,projektet:1,oferta:1,ofertat:1,klient:1,klienti:1,kompani:1,kompania:1,trego:1,what:1,which:1,with:1,about:1,project:1,projects:1,offer:1,offers:1,status:1};
function queryTerms(q){return N(q).split(' ').filter(function(w){return w.length>=4&&!STOP[w];});}
function identityValues(p){return [p&&p.name,p&&p.client,p&&p.business_ref,p&&p.ref].concat(A(p&&p.identity_aliases)).map(N).filter(function(x){return x.length>=3;});}
function projectHit(q,p){
  var terms=queryTerms(q),ids=identityValues(p);if(!terms.length||!ids.length)return null;
  var matched=terms.filter(function(t){return ids.some(function(x){return x.indexOf(t)>-1;});});
  if(matched.length!==terms.length)return null;
  var full=N(q),score=matched.length*30;
  ids.forEach(function(x){if(full.indexOf(x)>-1)score=Math.max(score,100+x.length);});
  return{p:p,score:score,time:ts(p.last_activity_at||p.last_email_at||p.updated_at)};
}
function projectHits(q){
  var st=window.PSTProjectControlHomeV1&&window.PSTProjectControlHomeV1._state,h=[];
  A(st&&st.projects).forEach(function(p){var x=projectHit(q,p);if(x)h.push(x);});
  h.sort(function(a,b){return b.score-a.score||stageRank(b.p)-stageRank(a.p)||b.time-a.time;});return h;
}
function stageRank(p){var o=N(p&&p.operational_state),s=N(p&&p.pipeline_stage);if(o==='execution')return 100;if(s==='offer submitted')return 80;if(s==='calculation')return 70;if(s==='rfq sent')return 60;if(s==='inquiry')return 50;return 10;}
function questionLike(q){var n=N(q),words=n.split(' ').filter(Boolean);return /\?|^(cka|cfare|kush|ku|kur|pse|si|a ka|a kemi|me trego|trego|cil|what|which|who|where|when|why|how)\b/i.test(S(q).trim())||words.length<=4;}
function factsForProject(id){
  var st=window.PSTProjectControlHomeV1&&window.PSTProjectControlHomeV1._state;
  return A(st&&st.facts).filter(function(f){return S(f.project_id)===S(id)&&N(f.fact_status)==='observed';});
}
function rawFactText(f){var v=f&&f.value&&typeof f.value==='object'?f.value:{};return [v.text,v.summary,v.current_state,v.next_action,f&&f.subject].map(S).filter(Boolean).join('\n');}
function factAuthority(f){
  var cat=N(f&&f.category),src=N(f&&f.source_type),ev=N(f&&f.evidence_status),v=f&&f.value&&typeof f.value==='object'?f.value:{};
  if(src==='email'&&ev==='confirmed')return 1000;
  if(cat==='execution'&&ev==='confirmed')return 900;
  if(cat==='operator update'&&ev==='confirmed')return 800;
  if(cat==='execution schedule')return 500;
  if(cat==='email event ai'&&v.suppressed_by_operator_update!==true)return 200;
  return 0;
}
function factTime(f){var v=f&&f.value&&typeof f.value==='object'?f.value:{};return ts(v.source_sent_at||f.updated_at||f.created_at);}
function confirmedVisit(facts){
  var rows=A(facts).filter(function(f){return factAuthority(f)>=900;}).sort(function(a,b){return factAuthority(b)-factAuthority(a)||factTime(b)-factTime(a);});
  for(var i=0;i<rows.length;i++){
    var text=rawFactText(rows[i]),m=text.match(/\bam\s+(\d{1,2}\.\d{1,2}\.20\d{2})\b/i)||text.match(/\b(\d{1,2}\.\d{1,2}\.20\d{2})\b/);
    if(!m)continue;
    var tm=text.match(/\bgegen\s+(\d{1,2}:\d{2})\s*uhr\b/i)||text.match(/\b(\d{1,2}:\d{2})\s*uhr\b/i);
    if(/besuch|besichtigung|vizit|bei ihnen sein|werden voraussichtlich am/i.test(text))return{date:m[1],time:tm&&tm[1]||'',fact:rows[i]};
  }
  return null;
}
function latestSchedule(facts){
  return A(facts).filter(function(f){return N(f.category)==='execution schedule';}).sort(function(a,b){return factTime(b)-factTime(a);})[0]||null;
}
function refLabel(p){var x=S(p&&p.business_ref||p&&p.ref).trim();return x&&x!=='-'?x:'';}
function stageLabel(p){var o=N(p&&p.operational_state),s=S(p&&p.pipeline_stage||p&&p.status||'').trim();return o==='execution'?'EXECUTION':(s||'AKTIV');}
function entityLabel(q,hits){var terms=queryTerms(q);if(terms.length)return terms.join(' ').toUpperCase();return S(hits[0]&&hits[0].p&&hits[0].p.client||'PORTOFOLI');}
function portfolioAnswer(q,hits){
  var rows=hits.map(function(x){return x.p;}),label=entityLabel(q,hits),submitted=0,calc=0,execution=0;
  rows.forEach(function(p){if(N(p.pipeline_stage)==='offer submitted')submitted++;if(N(p.pipeline_stage)==='calculation')calc++;if(N(p.operational_state)==='execution')execution++;});
  rows.sort(function(a,b){return stageRank(b)-stageRank(a)||ts(b.last_activity_at||b.last_email_at||b.updated_at)-ts(a.last_activity_at||a.last_email_at||a.updated_at);});
  var lines=[label+': PPPP gjen '+rows.length+' projekte/registre të lidhura.'];
  if(submitted)lines.push(submitted+' janë me ofertë të dorëzuar (OFFER SUBMITTED).');
  if(calc)lines.push(calc+' '+(calc===1?'është':'janë')+' në kalkulim (CALCULATION).');
  if(execution)lines.push(execution+' '+(execution===1?'është':'janë')+' aktualisht në ekzekutim.');
  rows.slice(0,10).forEach(function(p){var ref=refLabel(p);lines.push('• '+(ref?ref+' — ':'')+S(p.name||'Projekt')+' — '+stageLabel(p));});
  var nav=rows.find(function(p){return N(p.operational_state)==='execution';})||rows[0];
  return{ok:true,answer:lines.join('\n'),confidence:'high',uncertainty:'',suggested_next_step:'Zgjidh projektin konkret për të parë komunikimet, ofertën dhe hapat e tij.',navigation:nav?{project_id:nav.id,project_name:nav.name,area:N(nav.operational_state)==='execution'?'execution':'commercial'}:null,evidence:rows.slice(0,10).map(function(p){return{source:'Regjistri kanonik i projekteve',reason:(refLabel(p)?refLabel(p)+' · ':'')+S(p.name)+' · '+stageLabel(p)};}),provider:{name:'pppp-live-portfolio',model:'deterministic-v1'},read_only:true};
}
function freshProjectAnswer(p){
  var facts=factsForProject(p.id),visit=confirmedVisit(facts);if(!visit)return null;
  var lines=[S(p.name||'Projekti')+' është '+(N(p.operational_state)==='execution'?'në ekzekutim':'aktiv')+'.'];
  lines.push('Vizita në fabrikë është konfirmuar nga klienti për '+visit.date+(visit.time?', rreth orës '+visit.time:'')+'.');
  var schedule=latestSchedule(facts),sv=schedule&&schedule.value&&typeof schedule.value==='object'?schedule.value:{};
  if(sv.summary)lines.push(clamp(sv.summary,650));
  return{ok:true,answer:lines.join('\n'),confidence:'high',uncertainty:'',suggested_next_step:'Përgatit vizitën e konfirmuar për '+visit.date+'; nuk duhet kërkuar përsëri konfirmimi i datës.',navigation:{project_id:p.id,project_name:p.name,area:'execution'},evidence:[{source:'Email i konfirmuar i lidhur me projektin',reason:clamp(rawFactText(visit.fact),500)}].concat(schedule?[{source:'Plan i prodhimit',reason:clamp(S(sv.summary),500)}]:[]),provider:{name:'pppp-live-confirmed-evidence',model:'deterministic-v1'},read_only:true};
}
function handleDataLookup(e){
  if(!e||!e.target||!e.target.matches||!e.target.matches('.pst-live-command'))return;
  var input=e.target.querySelector('.pst-live-input'),q=S(input&&input.value).trim();if(!q||!questionLike(q))return;
  var hits=projectHits(q),answer=null;
  if(hits.length>1)answer=portfolioAnswer(q,hits);
  else if(hits.length===1)answer=freshProjectAnswer(hits[0].p);
  if(!answer)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(input)input.value='';
  var result=e.target.parentNode&&e.target.parentNode.querySelector('.pst-live-result');if(result){result.removeAttribute('data-pst-dismissed');result.hidden=false;}
  var api=window.PSTProjectControlHomeV1,st=api&&api._state;if(!api||!st)return;
  st.busy=false;st.pendingQuestion='';st.busyStage=0;st.busyToken=(Number(st.busyToken)||0)+1;st.last={kind:'answer',data:answer};
  try{api.render();}catch(err){console.warn('PPPP Ask local evidence:',err);}
}
function bindDataLookup(shell){if(!shell||shell.__pstDataLookupBound)return false;shell.__pstDataLookupBound=true;shell.addEventListener('submit',handleDataLookup,true);return true;}
function installOwnerQueryBridge(owner){
  if(!owner)return false;
  try{
    if(window.PSTUiOwnershipCleanupV1&&typeof window.PSTUiOwnershipCleanupV1.installAskOwnerQueryBridge==='function'){
      if(window.PSTUiOwnershipCleanupV1.installAskOwnerQueryBridge())return true;
    }
  }catch(e){}
  if(owner.__pstAskQueryBridge)return true;
  var original=owner.querySelector.bind(owner);
  owner.__pstAskOriginalQuerySelector=owner.__pstAskOriginalQuerySelector||original;
  owner.querySelector=function(selector){
    if(selector==='.pst-live-result'||selector==='.pst-live-send'||selector==='.pst-live-input'||selector==='.pst-live-command'){
      var live=document.querySelector('#pst-native-home-v4 .pst-live-command-shell'),found=live&&live.querySelector(selector);
      if(found)return found;
    }
    return original(selector);
  };
  owner.__pstAskQueryBridge=true;
  return true;
}
function apply(){
  var home=document.getElementById('pst-native-home-v4');
  var slot=home&&home.querySelector('#pn-ask');
  var owner=document.getElementById('pst-project-control-home-v2');
  if(!home||!slot||!owner)return false;
  var shell=null;
  try{
    var original=owner.__pstAskOriginalQuerySelector;
    if(typeof original==='function')shell=original('.pst-live-command-shell');
    if(!shell)shell=Array.prototype.slice.call(owner.children||[]).find(function(x){return x&&x.classList&&x.classList.contains('pst-live-command-shell');})||null;
  }catch(e){}
  if(!shell) shell=slot.querySelector('.pst-live-command-shell');
  if(!shell)return false;
  /* The form must already belong to the canonical Project Control Home owner. */
  if(owner.dataset.bound!=='1'&&shell.parentNode===owner)return false;
  if(shell.parentNode!==slot){slot.innerHTML='';slot.appendChild(shell);}
  shell.style.display='block';shell.style.visibility='visible';
  bindDataLookup(shell);
  installOwnerQueryBridge(owner);
  try{if(window.PSTUiOwnershipCleanupV1&&typeof window.PSTUiOwnershipCleanupV1.installAskModalChrome==='function')window.PSTUiOwnershipCleanupV1.installAskModalChrome();}catch(e){}
  try{if(window.PSTProjectControlHomeV1&&typeof window.PSTProjectControlHomeV1.render==='function')window.PSTProjectControlHomeV1.render();}catch(e){}
  if(observer){observer.disconnect();observer=null;}
  if(stopTimer){clearTimeout(stopTimer);stopTimer=null;}
  return true;
}
function watchUntilReady(){
  if(apply())return true;
  if(observer||!window.MutationObserver)return false;
  var target=document.getElementById('page-workspace-home')||document.body||document.documentElement;
  if(!target)return false;
  observer=new MutationObserver(function(){apply();});
  observer.observe(target,{childList:true,subtree:true});
  stopTimer=setTimeout(function(){if(observer){observer.disconnect();observer=null;}stopTimer=null;},120000);
  return false;
}
function schedule(){[0,80,220,600,1400,3200,7000,15000,30000,60000,90000].forEach(function(ms){setTimeout(watchUntilReady,ms);});}
function loadOpportunityDraftState(){
  if(window.PSTOpportunityDraftStateV1||document.querySelector('script[data-pst-opportunity-draft-state]'))return;
  var s=document.createElement('script');
  s.src='pristeel-opportunity-draft-state-v1.js?v=20260903-draftstate1';
  s.defer=true;s.setAttribute('data-pst-opportunity-draft-state','1');
  document.head.appendChild(s);
}
document.addEventListener('pst:native-home-ready',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule);
document.addEventListener('click',function(e){var n=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[data-key="home"]'):null;if(n)setTimeout(watchUntilReady,120);},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){schedule();loadOpportunityDraftState();},{once:true});else{schedule();loadOpportunityDraftState();}
window.PSTHomeAskFunctionalOwnerV1=window.PSTHomeAskFunctionalOwnerV2=window.PSTHomeAskFunctionalOwnerV3={apply:apply,watch:watchUntilReady,portfolioAnswer:portfolioAnswer,freshProjectAnswer:freshProjectAnswer};
})();
