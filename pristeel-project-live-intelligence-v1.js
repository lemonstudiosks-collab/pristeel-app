/* PRISTEEL Project Live Intelligence v1
 * Keeps Project Intelligence grounded in current project/email/task/commercial state.
 * Adds deterministic conversation fallback when structured AI JSON fails.
 * Read-only UI layer: no project/task/offer/database writes.
 */
(function(){
'use strict';
if(window.__pstProjectLiveIntelligenceV1)return;
window.__pstProjectLiveIntelligenceV1=true;
function arr(v){return Array.isArray(v)?v:[];}
function str(v){return String(v==null?'':v);}
function enc(v){return encodeURIComponent(str(v));}
function esc(v){return str(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function num(v){var n=Number(v);return isFinite(n)?n:0;}
function money(v){return num(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' EUR';}
function pid(v){return str(v||window.__pstCurrentProjectId||window._curProjId||'').trim();}
function terminal(v){return /^(realizuar|mbyllur|arkivuar|closed|archived|complete|completed|done)$/i.test(str(v).trim());}
async function safe(path){try{return arr(await window.supaFetch(path));}catch(e){return[];}}
function latest(rows,key){key=key||'created_at';return arr(rows).slice().sort(function(a,b){return str(b&&b[key]).localeCompare(str(a&&a[key]));})[0]||null;}
function revisionDoc(rows){return arr(rows).filter(function(x){var s=x&&x.offer_state||{};return s.revision_status==='draft_review'||s.installation_price_pending===true||str(x&&x.followup_status)==='draft';}).sort(function(a,b){return str(b.created_at).localeCompare(str(a.created_at));})[0]||null;}
async function liveSnapshot(projectId){
 projectId=pid(projectId);if(!projectId)return null;
 var q=await Promise.all([
  safe('projects?id=eq.'+enc(projectId)+'&select=id,name,client,status,pipeline_stage,deadline&limit=1'),
  safe('tasks?project_id=eq.'+enc(projectId)+'&status=eq.hapur&select=id,title,detail,due_date,priority,status,source,source_ref,created_at&order=created_at.desc&limit=80'),
  safe('project_emails?project_id=eq.'+enc(projectId)+'&select=gmail_message_id,subject,sent_at,direction,from_name,from_email,snippet,match_method,match_confidence&order=sent_at.desc&limit=80'),
  safe('documents_registry?project_id=eq.'+enc(projectId)+'&series=eq.QUO&select=id,doc_nr,total_eur,total_amount,followup_status,offer_state,revenue_breakdown,created_at&order=created_at.desc&limit=40'),
  safe('project_analyses?project_id=eq.'+enc(projectId)+'&select=id,created_at,engine,model,analysis&order=created_at.desc&limit=2')
 ]);
 return{project:q[0][0]||{},tasks:q[1],emails:q[2],docs:q[3],analyses:q[4],request:arr(q[1]).filter(function(t){return str(t.source)==='email_request_auto';})[0]||null,revision:revisionDoc(q[3])};
}
function newerThanAnalysis(s){
 var a=s&&s.analyses&&s.analyses[0],at=a&&Date.parse(a.created_at)||0;if(!at)return true;
 var newest=Math.max(Date.parse(s.request&&s.request.created_at||0)||0,Date.parse(s.emails&&s.emails[0]&&s.emails[0].sent_at||0)||0,Date.parse(s.revision&&s.revision.created_at||0)||0);
 var stage=str(a&&a.analysis&&a.analysis.current_stage),pstage=str(s&&s.project&&s.project.pipeline_stage),pstatus=str(s&&s.project&&s.project.status);
 return newest>at||(terminal(stage)&&!terminal(pstatus))||(stage&&pstage&&stage!==pstage&&terminal(stage));
}
function currentSummary(s){
 if(!s)return'';var p=s.project||{},t=s.request,d=s.revision,parts=[];
 parts.push('Gjendja aktuale: '+(p.status||'—')+(p.pipeline_stage?' / '+p.pipeline_stage:''));
 if(t)parts.push(t.title+(t.detail?'\n'+t.detail:''));
 if(d){var st=d.offer_state||{},sub=num(st.subtotal_before_installation||d.total_amount||d.total_eur);parts.push('Drafti i ofertës: '+(d.doc_nr||'draft')+(sub?' · '+money(sub)+' pa montim':'')+(st.installation_price_pending?' · montimi pret çmimin':''));}
 return parts.join('\n\n');
}
async function fallback(projectId,question){
 var s=await liveSnapshot(projectId),p=s&&s.project||{},t=s&&s.request,d=s&&s.revision,answer=[];
 answer.push('Projekti është aktiv në '+(p.pipeline_stage||p.status||'fazën aktuale')+'.');
 if(t)answer.push('Kërkesa më e re e klientit është regjistruar si veprim urgjent:\n'+str(t.detail||t.title));
 if(d){var st=d.offer_state||{},sub=num(st.subtotal_before_installation||d.total_amount||d.total_eur);answer.push('PPPP ka gati draftin '+str(d.doc_nr||'')+(sub?' me subtotal '+money(sub)+' pa montim':'')+'.'+(st.installation_price_pending?' Çmimi i montimit është lënë qëllimisht i hapur dhe duhet plotësuar para dërgimit.':''));}
 if(!t&&!d)answer.push('Nuk gjeta një kërkesë të re të strukturuar ose draft revizioni në të dhënat aktuale të projektit.');
 var next=d&&d.offer_state&&d.offer_state.installation_price_pending?'Plotëso çmimin e montimit, përcakto afatet e planit dinamik, verifiko draftin dhe vetëm pastaj dërgoje te klienti.':'Hap veprimin më të ri të projektit dhe verifiko kërkesën e klientit.';
 return{answer:answer.join('\n\n'),confidence:'high',evidence:[{source_id:'CURRENT',reason:'Përgjigje fallback nga projekti, emailat, task-et dhe dokumentet komerciale aktuale në PPPP.'}],uncertainty:'',suggested_next_step:next,follow_up:'',draft_email:{subject:'',body:''},_fallback:true};
}
function responseText(r){var parts=[str(r&&r.answer).trim()];if(r&&r.uncertainty)parts.push('Pasiguri: '+str(r.uncertainty));if(r&&r.suggested_next_step)parts.push('Hapi tjetër: '+str(r.suggested_next_step));return parts.filter(Boolean).join('\n\n');}
async function patchConversation(projectId){
 projectId=pid(projectId);var api=window.PSTProjectIntelligenceConversationV1;if(!projectId||!api||!api._test||typeof api.ask!=='function'||typeof api.mount!=='function')return false;
 api.mount(projectId);var root=document.getElementById('pst-pic-'+projectId);if(!root)return false;var send=root.querySelector('.pst-pic-send'),input=root.querySelector('.pst-pic-input');if(!send||!input||send.dataset.pstLiveFallback==='1')return false;
 send.dataset.pstLiveFallback='1';send.onclick=async function(){var q=str(input.value).trim();if(!q)return;input.value='';var result=await api.ask(projectId,q);if(result)return;try{var s=api._test.session(projectId),turns=s&&s.turns||[],last=turns[turns.length-1];if(last&&last.role==='assistant'&&/^Nuk mund ta vazhdoj biseden semantike tani\./.test(str(last.content)))turns.pop();var fb=await fallback(projectId,q);turns.push({role:'assistant',content:responseText(fb),result:fb});var state=root.querySelector('.pst-pic-state');if(state){state.textContent='AI JSON dështoi; u përdor përgjigjja deterministike nga të dhënat aktuale.';state.className='pst-pic-state';}api.mount(projectId);}catch(e){var state2=root.querySelector('.pst-pic-state');if(state2){state2.textContent='Nuk u ndërtua fallback-u: '+str(e&&e.message||e);state2.className='pst-pic-state err';}}};return true;
}
function openRevision(id){if(window.CommDocs&&typeof window.CommDocs.openById==='function')return window.CommDocs.openById(id);if(typeof window.pstWsOpenCommercial==='function')return window.pstWsOpenCommercial('offer',id);}
window.pstOpenLiveRevision=openRevision;
async function decorate(projectId){
 projectId=pid(projectId);if(!projectId)return false;var s=await liveSnapshot(projectId),host=document.getElementById('pai-body-'+projectId);if(!host||!s)return false;
 var stale=newerThanAnalysis(s),old=document.getElementById('pst-live-intel-'+projectId);if(old)old.remove();
 if(stale){Array.prototype.slice.call(host.querySelectorAll('.pai-top,.pai-grid,.pai-meta')).forEach(function(x){x.style.display='none';});var d=document.createElement('div');d.id='pst-live-intel-'+projectId;d.className='pst-live-intel';var rev=s.revision,st=rev&&rev.offer_state||{},sub=num(st.subtotal_before_installation||rev&&rev.total_amount||rev&&rev.total_eur);d.innerHTML='<div class="pst-live-kicker">GJENDJA AKTUALE</div><div class="pst-live-title">Analiza e vjetër është zëvendësuar nga aktiviteti i ri i projektit</div><div class="pst-live-text">'+esc(currentSummary(s))+'</div><div class="pst-live-actions">'+(rev?'<button type="button" onclick="pstOpenLiveRevision(\''+esc(rev.id)+'\')">Hap '+esc(rev.doc_nr||'draftin')+'</button>':'')+'<button type="button" onclick="pstAnalyzeProject(\''+esc(projectId)+'\')">Rifresko analizën e plotë</button></div>';host.insertBefore(d,host.firstChild);
 }
 await patchConversation(projectId);return true;
}
function schedule(projectId){projectId=pid(projectId);if(!projectId)return;setTimeout(function(){decorate(projectId);},120);}
var css=document.createElement('style');css.id='pst-project-live-intelligence-css';css.textContent=`
.pst-live-intel{border:1px solid #BFDCE6;background:#EEF7FA;border-radius:11px;padding:14px 15px;margin-bottom:12px}.pst-live-kicker{font-size:8px;letter-spacing:.9px;font-weight:850;color:#2F6E87}.pst-live-title{font-size:13px;font-weight:800;color:#263E48;margin:4px 0 7px}.pst-live-text{white-space:pre-wrap;font-size:10.5px;line-height:1.6;color:#46616C}.pst-live-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.pst-live-actions button{border:1px solid #B9D3DC;background:#fff;color:#315F72;border-radius:8px;padding:7px 10px;font-size:9px;font-weight:750;cursor:pointer}
`;document.head.appendChild(css);
document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('[data-pst-project-summary]');if(b)schedule(pid());},true);
document.addEventListener('pst:modules-ready',function(){if(document.getElementById('pst-project-summary-bg'))schedule(pid());},{once:true});
window.PSTProjectLiveIntelligenceV1={decorate:decorate,fallback:fallback,patchConversation:patchConversation,liveSnapshot:liveSnapshot,_test:{newerThanAnalysis:newerThanAnalysis,revisionDoc:revisionDoc,currentSummary:currentSummary,responseText:responseText}};
})();