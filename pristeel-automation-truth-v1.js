/* PRISTEEL automation truth reconciler v1
 * Additive safety layer for runtime stability, supplier truth and actionable Home context.
 * Does not send mail, create orders or make commercial commitments.
 */
(function(){
'use strict';
if(window.__pstAutomationTruthV1)return;
window.__pstAutomationTruthV1=true;

var TC_BUTICO_ID='8017a2e4-9e87-4028-bf0b-ed692c9c642f';
var HINKLEY_ID='a0ab0b00-8898-452d-bdb6-ec5afda80268';
var STACON_D22_ID='38bdf772-d73e-47b2-9d0f-6020e105aa62';
var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com'];
var homeBusy=null;

function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v).trim();}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function num(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function ms(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.getTime():0;}
function date(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';}
function money(v){var n=num(v);return n?n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' EUR':'—';}
function db(path){return typeof window.supaFetch==='function'?window.supaFetch(path).catch(function(){return[];}):Promise.resolve([]);}
function activeProject(p){return !/(humbur|arkivuar|mbyllur|realizuar|lost|closedlost|cancelled|canceled)/i.test(S(p&&p.status));}
function internalEmail(e){e=N(e);return INTERNAL.indexOf(e)>-1||/@prissteel\.com$/.test(e);}
function autoReply(e){var t=N((e&&e.subject||'')+' '+(e&&e.snippet||''));return /(automatisch antwoord|automatic reply|auto reply|out of office|abwesenheits|delivery status notification|mailer-daemon|undeliver)/.test(t);}

/* Prevent the 12s fail-open from revealing intermediate Home owners. */
(function stabilizeStartup(){
 try{if(window.__pstRuntimeRevealFallback&&window.__pstRuntimeRevealFallback!==-1)clearTimeout(window.__pstRuntimeRevealFallback);}catch(e){}
 window.__pstRuntimeRevealFallback=setTimeout(function(){
   try{document.documentElement.classList.add('pst-runtime-ready');}catch(e){}
 },45000);
 var st=document.createElement('style');st.id='pst-automation-truth-css';st.textContent='html.pst-project-switching #page-workspace-project{visibility:hidden!important}html.pst-project-switching body:after{content:"Po hapet projekti…";position:fixed;inset:0 0 0 0;z-index:2147482500;background:#f7fafb;display:flex;align-items:center;justify-content:center;color:#6f838c;font:650 12px Inter,Arial,sans-serif}#pst-supplier-decision-card .pst-truth-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:14px}#pst-supplier-decision-card .pst-truth-cell{border:1px solid #e0eaed;border-radius:10px;padding:11px;background:#fbfdfe}#pst-supplier-decision-card .pst-truth-cell span{display:block;font-size:10px;color:#7e8d93;margin-bottom:4px}#pst-supplier-decision-card .pst-truth-cell b{font-size:13px;color:#30464f}#pst-supplier-decision-card .pst-truth-badge{display:inline-flex;margin:12px 14px 0;padding:5px 9px;border-radius:999px;background:#eaf5ef;color:#357255;font-size:10px;font-weight:800}#page-workspace-home .pst-truth-project{font-size:10px!important;line-height:1.35!important;font-weight:850!important;color:#367c95!important;letter-spacing:.15px;margin-bottom:6px!important}#pst-home-waiting .pst-home-wait-list{max-height:none!important}#pst-home-waiting .pst-home-wait-item{min-height:58px!important}@media(max-width:760px){#pst-supplier-decision-card .pst-truth-grid{grid-template-columns:1fr}}';document.head.appendChild(st);
})();

function commercialEvidence(row){
 if(!row||typeof row!=='object')return false;
 var supplier=S(row.supplier||row.supplier_name||row.company),hasMoney=num(row.price_kg)>0||num(row.total_eur)>0||num(row.total_amount)>0||num(row.total)>0;
 var positions=A(row.positions).length>0,ref=S(row.offer_ref||row.reference);
 return !!supplier&&(hasMoney||positions||ref);
}
function sanitizeSupplierOffers(d){
 if(!d)return d;
 var rows=A(d.offers).filter(function(o){return commercialEvidence(o)&&!/pristeel|oferta jone|our offer/i.test(S(o.supplier||o.supplier_name||o.origin||o.source));});
 var extra=A(d.inboxDocs).concat(A(d.docs),A(d.projectDocs)).filter(commercialEvidence);
 var seen={};d.supplierOffers=rows.concat(extra).filter(function(o){var k=S(o.id||o.offer_ref||o.reference||((o.supplier||o.supplier_name)+'|'+(o.total_eur||o.total_amount||'')));if(!k||seen[k])return false;seen[k]=1;return true;});
 return d;
}
async function enrichIntegrityData(d,id){
 sanitizeSupplierOffers(d);
 if(!d||!id)return d;
 var dec=await db('project_supplier_decisions?project_id=eq.'+encodeURIComponent(id)+'&status=eq.active&select=*&order=decided_at.desc');
 d.supplierDecisions=A(dec);
 return d;
}
function installIntegrityWrapper(){
 var api=window.PSTProjectDataIntegrity;if(!api||typeof api.load!=='function')return false;
 if(api.load.__pstTruthWrapped)return true;
 var base=api.load;
 async function wrapped(id){var d=await base.apply(this,arguments);return enrichIntegrityData(d,String(id||''));}
 wrapped.__pstTruthWrapped=true;wrapped.__base=base;api.load=wrapped;
 if(window.__pstIntegrityLastData){var id=S(window.__pstIntegrityLastData.project&&window.__pstIntegrityLastData.project.id);enrichIntegrityData(window.__pstIntegrityLastData,id).then(function(){decorateCommercial();});}
 return true;
}

function decisionCard(d){
 var dec=A(d&&d.supplierDecisions)[0];if(!dec)return'';
 var ev=dec.evidence||{},type=S(dec.decision_type),supplier=S(dec.supplier_name||'Furnitor');
 if(type==='selected_producer'){
  return '<section class="pf2-card wide" id="pst-supplier-decision-card"><header><div><b>Prodhuesi i kontraktuar</b><span>Gjendje e verifikuar nga kontrata dhe pagesa</span></div></header><span class="pst-truth-badge">ZGJEDHUR · KONTRAKTUAR</span><div class="pst-truth-grid"><div class="pst-truth-cell"><span>Prodhuesi</span><b>'+E(supplier)+'</b></div><div class="pst-truth-cell"><span>Nënkontrata</span><b>E nënshkruar</b></div><div class="pst-truth-cell"><span>Avansi</span><b>'+E(money(ev.advance_amount_eur))+' · paguar '+E(date(ev.advance_paid_date))+'</b></div></div></section>';
 }
 if(type==='pricing_basis'){
  return '<section class="pf2-card wide" id="pst-supplier-decision-card"><header><div><b>Baza e ofertës PRISTEEL</b><span>Furnitori i përdorur për kalkulimin komercial</span></div></header><span class="pst-truth-badge">BAZË E KONFIRMUAR</span><div class="pst-truth-grid"><div class="pst-truth-cell"><span>Furnitori</span><b>'+E(supplier)+'</b></div><div class="pst-truth-cell"><span>Kosto furnitori</span><b>'+E(num(ev.supplier_price_eur_kg).toFixed(2))+' EUR/kg</b></div><div class="pst-truth-cell"><span>Oferta PRISTEEL</span><b>'+E(ev.our_offer_doc_nr||'—')+' · '+E(num(ev.our_offer_price_eur_kg).toFixed(2))+' EUR/kg</b></div></div></section>';
 }
 return'';
}
function decorateCommercial(){
 var d=window.__pstIntegrityLastData,page=document.getElementById('page-workspace-project'),host=document.getElementById('pst-pi-body');if(!d||!page||!host||!page.classList.contains('pf2-on'))return false;
 sanitizeSupplierOffers(d);
 var old=document.getElementById('pst-supplier-decision-card');if(old)old.remove();
 var html=decisionCard(d);if(html)host.insertAdjacentHTML('afterbegin',html);
 return true;
}

function installProjectTransition(){
 var base=window.pstOpenProjectWorkspace;if(typeof base!=='function')return false;if(base.__pstTruthTransition)return true;
 async function wrapped(id){
  try{document.documentElement.classList.add('pst-project-switching');}catch(e){}
  var fail=setTimeout(function(){try{document.documentElement.classList.remove('pst-project-switching');}catch(e){}},9000);
  try{var r=await base.apply(this,arguments);await new Promise(function(res){requestAnimationFrame(function(){requestAnimationFrame(res);});});return r;}
  finally{clearTimeout(fail);try{document.documentElement.classList.remove('pst-project-switching');}catch(e){}}
 }
 wrapped.__pstTruthTransition=true;wrapped.__base=base;window.pstOpenProjectWorkspace=wrapped;return true;
}

async function waitingRows(){
 var rows=await Promise.all([
  db('projects?select=id,name,client,ref,status,pipeline_stage,deadline,last_email_at,notes&limit=3000'),
  db('documents_registry?series=eq.QUO&select=id,project_id,doc_nr,created_at,followup_status,offer_state&order=created_at.desc&limit=4000'),
  db('project_emails?select=id,project_id,subject,snippet,sent_at,direction,from_email,from_name,has_attachments&order=sent_at.desc&limit=7000'),
  db('rfq_log?select=project_id,supplier_email&limit=4000')
 ]);
 var projects={},docs={},emails={},supplier={};
 A(rows[0]).filter(activeProject).forEach(function(p){projects[S(p.id)]=p;});
 A(rows[1]).forEach(function(d){var id=S(d.project_id);if(!id||docs[id])return;docs[id]=d;});
 A(rows[2]).forEach(function(e){var id=S(e.project_id);if(!id)return;(emails[id]||(emails[id]=[])).push(e);});
 A(rows[3]).forEach(function(r){var id=S(r.project_id),em=N(r.supplier_email);if(id&&em)(supplier[id]||(supplier[id]={}))[em]=1;});
 var out=[];
 Object.keys(projects).forEach(function(id){
  var p=projects[id],es=A(emails[id]),sm=supplier[id]||{};
  if(id===TC_BUTICO_ID&&S(p.pipeline_stage)==='rfq_in'){
   var lastOut=es.filter(function(e){return N(e.direction)==='outgoing';})[0];
   if(lastOut)out.push({project_id:id,name:p.name,client:'linkut të ri nga Aleksandar',text:'Ridërgimi i dokumentacionit u kërkua '+date(lastOut.sent_at),activity:ms(lastOut.sent_at),kind:'document_resend'});
   return;
  }
  var d=docs[id];if(!d||S(d.followup_status)!=='open')return;
  var st=d.offer_state&&typeof d.offer_state==='object'?d.offer_state:{},sent=ms(st.pst_sent_at),nr=S(d.doc_nr||'Oferta jonë');
  if(!sent){
   var cand=es.filter(function(e){if(N(e.direction)!=='outgoing')return false;var t=N((e.subject||'')+' '+(e.snippet||''));return t.indexOf(N(nr))>-1;})[0];
   if(cand)sent=ms(cand.sent_at);
  }
  if(!sent)return;
  var reply=es.filter(function(e){var em=N(e.from_email);return N(e.direction)==='incoming'&&ms(e.sent_at)>sent&&!internalEmail(em)&&!sm[em]&&!autoReply(e);})[0];
  if(reply)return;
  out.push({project_id:id,name:p.name,client:p.client||'klientit',text:nr+' u dërgua '+date(sent)+(p.deadline?' · afati i projektit '+date(p.deadline):''),activity:sent,kind:'client_offer'});
 });
 return out.sort(function(a,b){return b.activity-a.activity;});
}
function actionProjectLabel(row){
 var pid=S(row.getAttribute('data-project-id'));if(!pid)return;
 var ctx=window.PSTHomeCanonicalV1&&typeof window.PSTHomeCanonicalV1.getContext==='function'?window.PSTHomeCanonicalV1.getContext(pid):null;
 var p=ctx&&ctx.project;if(!p){var card=document.querySelector('#pst-ws-home-projects [data-project-id="'+CSS.escape(pid)+'"]');if(card){p={name:S(card.querySelector('.pst-ws-projectcard-name')&&card.querySelector('.pst-ws-projectcard-name').textContent),client:S(card.querySelector('.pst-ws-projectcard-client')&&card.querySelector('.pst-ws-projectcard-client').textContent)};}}
 if(!p||!p.name)return;
 var main=row.querySelector('.pst-ws-action-main');if(!main)return;var old=main.querySelector('.pst-truth-project');if(old)old.remove();var e=document.createElement('div');e.className='pst-truth-project';e.textContent=p.name+(p.client?' · '+p.client:'');main.insertBefore(e,main.firstChild);
}
async function decorateHome(){
 if(homeBusy)return homeBusy;
 homeBusy=(async function(){
  var page=document.getElementById('page-workspace-home');if(!page||!page.classList.contains('active'))return false;
  page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(actionProjectLabel);
  /* Hinkley already has a client-offer draft and a confirmed pricing basis; the action is send verification, not supplier selection. */
  page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action[data-project-id="'+HINKLEY_ID+'"]').forEach(function(r){if(!/përgatit ofertën pristeel/i.test(S(r.textContent)))return;var t=r.querySelector('.pst-ws-action-title'),m=r.querySelector('.pst-ws-action-meta');if(t)t.textContent='Verifiko / dërgo ofertën PRISTEEL';if(m)m.innerHTML='<b>Pse tani:</b> KENTAUR IMPEX është baza e konfirmuar e çmimit. PST-QUO-2026-019 ekziston, por dërgimi te TISSOT nuk është verifikuar.';});
  var items=await waitingRows(),host=document.getElementById('pst-ws-home-actions');if(!host)return true;
  var old=document.getElementById('pst-home-waiting');if(old)old.remove();if(!items.length)return true;
  var owner=host.closest('.pst-ws-card')||host.parentElement,sec=document.createElement('section');sec.id='pst-home-waiting';sec.innerHTML='<div class="pst-home-wait-head"><div><b>Në pritje</b><span>PPPP po pret palën tjetër; nuk kërkohet veprim tani.</span></div></div><div class="pst-home-wait-list">'+items.map(function(w){return '<button type="button" class="pst-home-wait-item" data-project-id="'+E(w.project_id)+'"><span class="pst-home-wait-dot"></span><span class="pst-home-wait-copy"><b>'+E(w.name)+'</b><small>Në pritje të '+E(w.client)+' · '+E(w.text)+'</small></span><span class="pst-home-wait-arrow">›</span></button>';}).join('')+'</div>';
  if(owner)owner.insertAdjacentElement('afterend',sec);else host.insertAdjacentElement('afterend',sec);
  sec.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('.pst-home-wait-item');if(!b)return;var id=b.dataset.projectId;if(window.PSTHomeCanonicalInteractionV1&&typeof window.PSTHomeCanonicalInteractionV1.openProjectBrief==='function')return window.PSTHomeCanonicalInteractionV1.openProjectBrief(id,'waiting');if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);});
  return true;
 })().finally(function(){homeBusy=null;});return homeBusy;
}

function boot(){
 installIntegrityWrapper();
 setInterval(installIntegrityWrapper,700);
 document.addEventListener('pst:modules-ready',function(){setTimeout(function(){installIntegrityWrapper();installProjectTransition();decorateHome();decorateCommercial();},80);});
 document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(decorateHome,0);setTimeout(decorateHome,180);});
 document.addEventListener('pst:project-integrity-loaded',function(){setTimeout(decorateCommercial,0);});
 document.addEventListener('click',function(e){
  if(e.target.closest&&e.target.closest('[data-pf2-tab="commercial"]'))setTimeout(decorateCommercial,80);
 },true);
 var mo=new MutationObserver(function(){if(document.getElementById('page-workspace-home')&&document.getElementById('page-workspace-home').classList.contains('active'))setTimeout(decorateHome,40);});
 mo.observe(document.documentElement,{childList:true,subtree:true});
 if(window.__pstModulesReady)setTimeout(function(){installProjectTransition();decorateHome();decorateCommercial();},80);
}
boot();
window.PSTAutomationTruthV1={sanitizeSupplierOffers:sanitizeSupplierOffers,decorateHome:decorateHome,decorateCommercial:decorateCommercial,installIntegrityWrapper:installIntegrityWrapper,installProjectTransition:installProjectTransition};
})();