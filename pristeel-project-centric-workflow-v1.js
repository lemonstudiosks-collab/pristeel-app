/* PRISTEEL Project-Centric Workflow v1
 * Bounded final UX layer for the 2026-08-26 operator review.
 * Projects remain the daily center. Tender discovery stays backstage until it needs a decision.
 * Adds no parallel project/tender stores and never sends external communication.
 */
(function(){
'use strict';
if(window.__pstProjectCentricWorkflowV3&&window.PSTProjectCentricWorkflowV1)return;
window.__pstProjectCentricWorkflowV1=true;
window.__pstProjectCentricWorkflowV2=true;
window.__pstProjectCentricWorkflowV3=true;

var tenderState={rows:[],mode:'all',query:'',busy:false,last:0,partners:null};
var contactBusy={};
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function safeUrl(v){v=S(v).trim();return /^https?:\/\//i.test(v)?v:'';}
function activePage(id){
 var p=document.getElementById(id);if(!p)return null;
 if(p.style&&p.style.display==='none')return null;
 try{var cs=window.getComputedStyle?window.getComputedStyle(p):null;if(cs&&cs.display==='none')return null;}catch(e){}
 return p;
}
function db(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path,method,body);}

/* ---------- Home: project-first, full-card action ---------- */
function home(){
 var p=activePage('page-workspace-home');if(!p)return false;
 var h=document.getElementById('pst-home-operating-grid-v1');if(!h)return false;
 h.querySelectorAll('.pst-hao-go').forEach(function(b){b.remove();});
 h.querySelectorAll('.pst-hao-card').forEach(function(c){c.setAttribute('role','button');c.setAttribute('tabindex','0');c.title='Hap projektin / veprimin';});
 var title=h.querySelector('.pst-hao-head h1');if(title)title.textContent='Projektet që kërkojnë veprimin tënd';
 var copy=h.querySelector('.pst-hao-head p');if(copy)copy.textContent='PPPP vendos projektet përpara: çfarë po ndodh, pse kërkon vëmendje dhe cili është hapi i radhës.';
 return true;
}

/* ---------- Projects: complete register + whole-row open ---------- */
function projects(){
 var p=activePage('page-workspace-projects');if(!p)return false;
 try{var C=window.PSTProjectClassificationV1;if(C&&C._state)C._state.work='all';}catch(e){}
 p.querySelectorAll('.pst-pm-row[data-project-id]').forEach(function(row){
   row.setAttribute('role','button');row.setAttribute('tabindex','0');row.title='Hap projektin';
   if(row.dataset.pstWholeRow==='1')return;row.dataset.pstWholeRow='1';
   row.addEventListener('click',function(e){
     if(e.target&&e.target.closest&&e.target.closest('button,a,input,select,textarea,[data-pm-more],[data-pm-open]'))return;
     var id=row.getAttribute('data-project-id');if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);
   });
   row.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button,a,input,select,textarea')){e.preventDefault();var id=row.getAttribute('data-project-id');if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);}});
 });
 var title=p.querySelector('.pst-pm-title');if(title)title.textContent='Projektet';
 return true;
}

/* ---------- Opportunities: local bids + TED awards only ---------- */
function tenderApi(){return window.PSTTenderPriorityActionsV2||window.PSTTenderPriorityActionsV1||null;}
function tenderPayload(r){return r&&r.payload&&typeof r.payload==='object'?r.payload:{};}
function tenderSource(r){var x=S(tenderPayload(r).source||'KRPP').toUpperCase();return x==='TED'?'TED':(x==='APP'||x==='APP_AL')?'APP_AL':'KRPP';}
function tenderPhase(r){return tenderPayload(r).notice_phase==='award'?'award':'opportunity';}
function tenderVisible(r){
 var src=tenderSource(r),phase=tenderPhase(r),st=S(r&&r.status);
 if(src==='TED')return phase==='award'&&['new','review','watch'].indexOf(st)>-1&&!!S(tenderPayload(r).winner&&tenderPayload(r).winner.name).trim();
 return phase==='opportunity'&&['new','review'].indexOf(st)>-1;
}
function tenderMode(r){return tenderSource(r)==='TED'?'award':'local';}
function tenderScore(r){var n=Number(r&&r.relevance_score);return isFinite(n)&&n>0?Math.round(n):0;}
function winnerObj(r){var w=tenderPayload(r).winner;return w&&typeof w==='object'?w:{};}
function winnerName(r){return S(winnerObj(r).name);}
function winnerRole(r){var w=winnerObj(r),x=N(w.company_type||(w.company_classification&&w.company_classification.company_type)||'unknown');return ['producer','gc_epc','trader_consortium'].indexOf(x)>-1?x:'unknown';}
function winnerRoleLabel(r){var x=winnerRole(r);return x==='gc_epc'?'GC / EPC':x==='producer'?'PRODHUES / KONKURRENT':x==='trader_consortium'?'TRADER / KONSORCIUM':'ROL I PAQARTË';}
function winnerConfidence(r){var w=winnerObj(r),x=N(w.company_classification&&w.company_classification.confidence);return x==='high'?'besueshmëri e lartë':x==='medium'?'besueshmëri mesatare':x==='low'?'besueshmëri e ulët':'rol i paverifikuar';}
function winnerContacts(r){var P=tenderApi();if(P&&typeof P.enrichedContacts==='function')return A(P.enrichedContacts(r));var w=winnerObj(r),out=[];A(w.emails).forEach(function(x){if(x)out.push({email:S(x),purpose:'',confidence:''});});if(w.email)out.push({email:S(w.email),purpose:'',confidence:''});return out;}
function winnerWebsite(r){var w=winnerObj(r),u=safeUrl(w.website);if(u)return u;var e=w.contact_enrichment&&typeof w.contact_enrichment==='object'?w.contact_enrichment:{},org=A(e.organizations)[0];return safeUrl(org&&org.official_website);}
function winnerApproach(r){var x=winnerRole(r);if(x==='gc_epc')return'Klient potencial: qasje direkte me PRISTEEL si nënkontraktor/prodhues i paketave të çelikut.';if(x==='producer')return'Konkurrent / prodhues: qasje si kapacitet shtesë, overflow fabrication, paketë e ndarë ose mbështetje në prodhim dhe dorëzim.';if(x==='trader_consortium')return'Qasje e kujdesshme për furnizim ose prodhim të nënkontraktuar, sipas paketës konkrete.';return'Roli ende nuk është verifikuar; emaili përgatitet me formulim neutral për kapacitet shtesë dhe kontrollohet nga ti para krijimit në Gmail.';}
function sourceLabel(r){return tenderSource(r)==='TED'?'EU · TED':tenderSource(r)==='APP_AL'?'Shqipëri · APP':'Kosovë · KRPP';}
function tenderDate(v){var d=v?new Date(v+'T00:00:00'):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function tenderReason(r){var P=tenderApi();return P&&typeof P.reason==='function'?P.reason(r):A(r&&r.match_reasons).slice(0,2).join(' · ');}
function opportunityRows(){
 var rows=tenderState.rows.filter(tenderVisible),q=N(tenderState.query);
 if(tenderState.mode==='local')rows=rows.filter(function(r){return tenderMode(r)==='local';});
 if(tenderState.mode==='award')rows=rows.filter(function(r){return tenderMode(r)==='award';});
 if(q)rows=rows.filter(function(r){return N([r.title,r.authority,r.procurement_no,r.publication_no,tenderReason(r),winnerName(r),winnerRoleLabel(r)].join(' ')).indexOf(q)>-1;});
 rows.sort(function(a,b){return tenderScore(b)-tenderScore(a)||S(b.published_date).localeCompare(S(a.published_date));});
 return rows.slice(0,80);
}
function opportunityCard(r){
 var award=tenderMode(r)==='award',winner=winnerName(r),status=award?'FITUES I PUBLIKUAR':'PËR OFERTIM',role=award?winnerRoleLabel(r):'';
 return '<article class="pst-pcw-tender" role="button" tabindex="0" data-pcw-tender="'+E(r.id)+'">'
   +'<div class="pst-pcw-tender-copy"><div class="pst-pcw-tender-meta"><span class="kind">'+status+'</span><span>'+E(sourceLabel(r))+'</span><span>'+tenderScore(r)+'% relevant për PRISTEEL</span>'+(award?'<span class="winner-role '+E(winnerRole(r))+'">'+E(role)+'</span>':'')+'</div>'
   +'<h3>'+E(r.title||'Tender')+'</h3>'
   +'<p>'+E(tenderReason(r)||'Kliko për ta hapur mundësinë dhe për të vendosur hapin e radhës.')+'</p>'
   +'<small>'+(award?(winner?'Fituesi: '+E(winner):'Fituesi duhet verifikuar'):'Afati: '+E(tenderDate(r.deadline)))+(r.authority?' · '+E(r.authority):'')+'</small></div>'
   +'<div class="pst-pcw-tender-open"><b>'+ (award?'Shqyrto fituesin':'Hap mundësinë') +'</b><span>→</span></div>'
 +'</article>';
}
function ensureOpportunitySurface(){
 var p=activePage('page-kek-tenders');if(!p)return null;
 var focus=p.querySelector('#pst-opportunities-focus'),head=p.querySelector('.pst-kek-head');
 var eye=p.querySelector('.pst-kek-eye'),title=p.querySelector('.pst-kek-title'),sub=p.querySelector('.pst-kek-sub');
 if(eye)eye.textContent='MONITORI AUTOMATIK I TENDERËVE TË ÇELIKUT';if(title)title.textContent='Mundësitë';if(sub)sub.textContent='KRPP, APP dhe TED mblidhen në prapaskenë. Këtu punojmë vetëm me mundësitë që mund të kthehen në projekt.';
 if(!focus){
   focus=document.createElement('section');focus.id='pst-opportunities-focus';
   focus.innerHTML='<header></header><div id="pst-pcw-opportunity-tools"><label><span>Kërko</span><input id="pst-pcw-opportunity-search" placeholder="Titull, institucion, referencë ose përshkrim"></label></div><div id="pst-pcw-opportunity-tabs"></div><div id="pst-opportunities-list"></div>';
   if(head)head.insertAdjacentElement('afterend',focus);else p.prepend(focus);
 }else{
   if(!focus.querySelector('#pst-pcw-opportunity-tools')){
     var tools=document.createElement('div');tools.id='pst-pcw-opportunity-tools';tools.innerHTML='<label><span>Kërko</span><input id="pst-pcw-opportunity-search" placeholder="Titull, institucion, referencë ose përshkrim"></label>';
     var list=focus.querySelector('#pst-opportunities-list');if(list)focus.insertBefore(tools,list);else focus.appendChild(tools);
   }
   if(!focus.querySelector('#pst-pcw-opportunity-tabs')){
     var tabs=document.createElement('div');tabs.id='pst-pcw-opportunity-tabs';var list2=focus.querySelector('#pst-opportunities-list');if(list2)focus.insertBefore(tabs,list2);else focus.appendChild(tabs);
   }
   if(!focus.querySelector('#pst-opportunities-list')){var list3=document.createElement('div');list3.id='pst-opportunities-list';focus.appendChild(list3);}
 }
 var input=focus.querySelector('#pst-pcw-opportunity-search');
 if(input&&input.dataset.bound!=='1'){input.dataset.bound='1';input.value=tenderState.query;input.addEventListener('input',function(){tenderState.query=input.value||'';renderOpportunities();});}
 return focus;
}
function renderOpportunities(){
 var p=activePage('page-kek-tenders');if(!p)return false;
 var focus=ensureOpportunitySurface();if(!focus)return false;
 var list=focus.querySelector('#pst-opportunities-list');if(!list)return false;
 var all=tenderState.rows.filter(tenderVisible),local=all.filter(function(r){return tenderMode(r)==='local';}).length,award=all.filter(function(r){return tenderMode(r)==='award';}).length,rows=opportunityRows();
 var header=focus.querySelector('header');if(header)header.innerHTML='<div><span>MUNDËSITË</span><h2>Tenderat që mund të bëhen projekte</h2><p>Kliko një mundësi. PPPP merr dosjen, nxjerr kushtet dhe vetëm pastaj vendos ti nëse krijohet projekt.</p></div>';
 var tabs=focus.querySelector('#pst-pcw-opportunity-tabs');
 tabs.innerHTML='<button data-pcw-mode="all" class="'+(tenderState.mode==='all'?'on':'')+'"><span>Të gjitha</span><i>'+(local+award)+'</i></button><button data-pcw-mode="local" class="'+(tenderState.mode==='local'?'on':'')+'"><span>Për ofertim</span><i>'+local+'</i></button><button data-pcw-mode="award" class="'+(tenderState.mode==='award'?'on':'')+'"><span>Fitues nga TED</span><i>'+award+'</i></button>';
 list.innerHTML=rows.length?rows.map(opportunityCard).join(''):'<div class="pst-pcw-empty">Nuk ka mundësi që përputhen me këtë filtër.</div>';
 var legacy=p.querySelector('#pst-opportunities-all');if(legacy){legacy.classList.add('pst-pcw-backstage');legacy.hidden=true;legacy.style.display='none';}
 p.querySelectorAll('.pst-kek-filter,.pst-kek-card,#pst-tender-fit-summary').forEach(function(x){if(!focus.contains(x)){x.hidden=true;x.style.display='none';x.setAttribute('aria-hidden','true');}});
 p.setAttribute('data-pcw-opportunities-owner','2');
 return true;
}
async function loadOpportunities(force){
 if(!activePage('page-kek-tenders')||tenderState.busy)return false;
 if(!force&&tenderState.last&&Date.now()-tenderState.last<30000){renderOpportunities();return true;}
 tenderState.busy=true;
 try{tenderState.rows=A(await db('kek_tender_watch?select=*&status=in.(new,review,watch)&order=published_date.desc,relevance_score.desc&limit=2000'));tenderState.last=Date.now();renderOpportunities();return true;}
 catch(e){console.warn('PPPP opportunities project-centric:',e);return false;}finally{tenderState.busy=false;}
}
async function partnerContext(){
 if(tenderState.partners)return tenderState.partners;
 try{var rows=A(await db('partners?select=name,country,business_type,relation,categories,certifications,importance_reason,notes&limit=500'));tenderState.partners=rows.filter(function(r){var rel=A(r.relation).map(N),cat=A(r.categories).map(N);return rel.indexOf('manufacturer')>-1||rel.indexOf('subcontractor')>-1||rel.indexOf('supplier')>-1||cat.indexOf('fabrication')>-1;}).slice(0,80);}catch(e){tenderState.partners=[];}
 return tenderState.partners;
}
function tenderById(id){return tenderState.rows.find(function(r){return S(r.id)===S(id);})||null;}
async function serverTenderAnalysis(r){
 var AI=window.PSTOpenAIAssistantV1;if(!AI||typeof AI.ask!=='function')return null;
 var partners=await partnerContext(),role=winnerRole(r),q='';
 if(tenderMode(r)==='award'){
   if(role==='gc_epc')q='Ky është një tender TED i fituar nga një GC/EPC. Analizo sa relevant është projekti për PRISTEEL dhe çfarë pakete konkrete steel fabrication/subcontracting mund t’i ofrojmë fituesit. Mos sugjero ofertim në tenderin e mbyllur.';
   else if(role==='producer')q='Ky është një tender TED i fituar nga një prodhues/metalpërpunues që mund të jetë konkurrent. Analizo vetëm mundësinë për overflow fabrication, kapacitet shtesë, ndarje pakete, furnizim ose mbështetje tjetër B2B. Mos e trajto si GC dhe mos sugjero ofertim në tenderin e mbyllur.';
   else if(role==='trader_consortium')q='Ky është një tender TED i fituar nga trader/konsorcium. Analizo rolin e mundshëm të fituesit dhe nëse PRISTEEL mund të ofrojë furnizim ose prodhim të nënkontraktuar. Trego qartë çfarë duhet verifikuar.';
   else q='Ky është një tender TED i fituar, por roli i fituesit nuk është verifikuar. Vlerëso relevancën për PRISTEEL dhe thuaj çfarë duhet verifikuar para outreach. Mos përgatit ose rekomando email derisa roli të jetë i qartë.';
 }else q='Analizo këtë tender për PRISTEEL. Vlerëso scope-in e mundshëm, çfarë duhet verifikuar në dosje dhe cilët partnerë/prodhues të regjistruar në PPPP mund të jenë relevantë për realizim. Nëse Eurosteel është realisht i përshtatshëm sipas të dhënave, thuaje; mos e favorizo pa bazë.';
 try{return await AI.ask(q,{scope:'global',context:{tender:r,winner_role:role,candidate_partners:partners}});}catch(e){return null;}
}
function winnerBriefHtml(r){
 var w=winnerObj(r),contacts=winnerContacts(r).slice(0,5),site=winnerWebsite(r),confidence=winnerConfidence(r),role=winnerRole(r);
 var contactHtml=contacts.length?'<div class="pst-pcw-winner-contacts"><b>Kontaktet më të mira</b>'+contacts.map(function(c){var email=S(c.email),meta=[c.purpose,c.confidence].filter(Boolean).join(' · ');return'<a href="mailto:'+E(email)+'"><span>'+E(email)+'</span>'+(meta?'<small>'+E(meta)+'</small>':'')+'</a>';}).join('')+'</div>':'<div class="pst-pcw-winner-none">PPPP nuk ka ende email të verifikueshëm për këtë fitues.</div>';
 return '<div class="pst-pcw-winner-brief"><div class="pst-pcw-winner-head"><div><span>FITUESI TED</span><h3>'+E(w.name||'Fitues i publikuar')+'</h3></div><b class="role '+E(role)+'">'+E(winnerRoleLabel(r))+'</b></div>'
   +'<p>'+E(winnerApproach(r))+'</p><div class="pst-pcw-winner-facts"><span><b>'+tenderScore(r)+'%</b> relevant për PRISTEEL</span><span><b>'+E(confidence)+'</b> klasifikim</span>'+(site?'<a href="'+E(site)+'" target="_blank" rel="noopener">Website ↗</a>':'')+'</div>'+contactHtml+'</div>';
}
function officialSourceAction(r,label){
 var src=tenderSource(r),u=src==='APP_AL'?'':(safeUrl(r&&r.detail_url)||safeUrl(r&&r.source_url));
 if(u)return'<a class="pst-pcw-source-link" href="'+E(u)+'" target="_blank" rel="noopener">'+E(label||'Burimi zyrtar')+' ↗</a>';
 return'<button data-pcw-ti="source" data-id="'+E(r.id)+'">'+E(label||'Burimi zyrtar')+'</button>';
}
function modalActionBar(r){
 var id=E(r.id),award=tenderMode(r)==='award';
 if(award){
   return '<div id="pst-pcw-ti-actions"><button class="primary" data-pcw-ti="draft" data-id="'+id+'">Përgatit emailin</button><button data-pcw-ti="contacts" data-id="'+id+'">Shiko kontaktet</button>'+officialSourceAction(r,'Burimi TED')+'<button data-pcw-ti="review" data-id="'+id+'">Lëre për më vonë</button><button class="danger" data-pcw-ti="nogo" data-id="'+id+'">Hiqe nga lista</button></div>';
 }
 return '<div id="pst-pcw-ti-actions" data-tender-id="'+id+'"><button class="primary download" data-pcw-ti="download" data-id="'+id+'">Shkarko dosjen</button><button class="dossier" data-pcw-ti="dossier" data-id="'+id+'">Analizo kushtet</button><button class="create" data-pcw-ti="go" data-id="'+id+'" disabled title="Krijimi i projektit aktivizohet pasi PPPP ta ketë analizuar dosjen.">Krijo projekt</button>'+officialSourceAction(r,'Burimi zyrtar')+'<button data-pcw-ti="review" data-id="'+id+'">Lëre për më vonë</button><button class="danger" data-pcw-ti="nogo" data-id="'+id+'">Hiqe nga lista</button></div>';
}
function closeTenderModal(){
 var modal=document.getElementById('pst-ti-backdrop');if(!modal)return false;
 modal.style.display='none';modal.hidden=true;modal.setAttribute('aria-hidden','true');return true;
}
function ensureTenderModal(r){
 var modal=document.getElementById('pst-ti-backdrop');
 if(!modal){modal=document.createElement('div');modal.id='pst-ti-backdrop';document.body.appendChild(modal);}
 if(!modal.classList.contains('pst-pcw-modal')){
   modal.className='pst-pcw-modal';modal.removeAttribute('style');modal.innerHTML='<div id="pst-ti-card" role="dialog" aria-modal="true" aria-labelledby="pst-ti-title"><div class="pst-pcw-modal-head"><div><span>ACTION CONSOLE</span><h2 id="pst-ti-title"></h2><p id="pst-ti-meta"></p></div><button type="button" data-pcw-close-modal>Mbyll</button></div><div id="pst-ti-body"></div><div class="pst-pcw-modal-foot">PPPP nuk krijon projekt, nuk dërgon email dhe nuk merr angazhim pa veprimin tënd.</div></div>';
 }
 var card=modal.querySelector('#pst-ti-card'),title=modal.querySelector('#pst-ti-title'),meta=modal.querySelector('#pst-ti-meta'),body=modal.querySelector('#pst-ti-body');
 if(!card||!title||!meta||!body)return null;
 title.textContent=S(r.title||'Mundësi');
 meta.textContent=sourceLabel(r)+' · '+tenderScore(r)+'% relevant për PRISTEEL'+(winnerName(r)?' · '+winnerName(r):'');
 body.innerHTML='';
 modal.hidden=false;modal.removeAttribute('aria-hidden');modal.style.display='flex';
 return body;
}
async function openTender(id){
 var r=tenderById(id);if(!r)return false;
 var b=ensureTenderModal(r);if(!b)return false;
 var sec=document.createElement('section');sec.id='pst-pcw-server-analysis';
 if(tenderMode(r)==='award'){
   sec.innerHTML=winnerBriefHtml(r)+'<div id="pst-pcw-award-ai" class="pst-pcw-ai-loading">PPPP po analizon mundësinë e bashkëpunimit…</div>';b.appendChild(sec);
   b.insertAdjacentHTML('beforeend',modalActionBar(r));
   var out=await serverTenderAnalysis(r),aiBox=sec.querySelector('#pst-pcw-award-ai');
   if(aiBox)aiBox.innerHTML=out?'<div class="pst-pcw-ai"><span>PPPP AI</span><p>'+E(out.answer||'').replace(/\n/g,'<br>')+'</p>'+(out.suggested_next_step?'<small><b>Hapi i radhës:</b> '+E(out.suggested_next_step)+'</small>':'')+'</div>':'Analiza shtesë e AI nuk u përgjigj. Klasifikimi dhe kontaktet e verifikuara më sipër mbeten të vlefshme.';
 }else{
   sec.innerHTML='<div class="pst-pcw-decision-intro"><span>RRUGA E MUNDËSISË</span><b>1. Shkarko dosjen → 2. Analizo kushtet → 3. Ti vendos nëse bëhet projekt</b><small>Nuk krijohet projekt dhe nuk merret angazhim para analizës së dosjes.</small></div>';b.appendChild(sec);
   b.insertAdjacentHTML('beforeend',modalActionBar(r));
 }
 return true;
}
async function exactSource(r){
 var P=tenderApi(),src=tenderSource(r),u=safeUrl(r&&r.detail_url)||safeUrl(r&&r.source_url);
 if(src==='APP_AL'){alert('Për tenderët APP, PPPP e merr dosjen në prapaskenë sipas referencës së saktë. Nuk po të dërgojmë te faqja e përgjithshme e APP-së sepse nuk ka lidhje të drejtpërdrejtë të sigurt për këtë rekord.');return false;}
 if(u){window.open(u,'_blank','noopener');return true;}
 if(P&&typeof P.openSource==='function'){var out=P.openSource(r.id);return out!==false;}
 return false;
}
function dossierReady(id){
 var panel=document.getElementById('pst-tda-analysis');return !!(panel&&S(panel.getAttribute('data-tender-id'))===S(id)&&panel.getAttribute('data-analysis-ready')==='1'&&panel.getAttribute('data-dossier-complete')==='1');
}
async function tenderAction(kind,id,btn){
 var P=tenderApi(),r=tenderById(id);if(!P||!r)return false;
 if(btn)btn.disabled=true;
 try{
   if(kind==='source')return await exactSource(r);
   if(kind==='contacts'){if(P&&typeof P.contacts==='function')return P.contacts(id);return false;}
   if(kind==='download'){
     var DL=window.PSTTenderDossierAnalysisV1;if(!DL||typeof DL.download!=='function')throw new Error('Shkarkimi i dosjes nuk është gati. Rifresko platformën dhe provo përsëri.');
     return await DL.download(id,btn);
   }
   if(kind==='dossier'){
     var D=window.PSTTenderDossierAnalysisV1;if(!D||typeof D.analyze!=='function')throw new Error('Leximi i dosjes nuk është gati. Rifresko platformën dhe provo përsëri.');
     var ok=await D.analyze(id,false);if(!ok)throw new Error('Dosja nuk u analizua. Shiko mesazhin në popup dhe provo përsëri.');
     var ready=typeof D.isReady==='function'?D.isReady(id):dossierReady(id),create=document.querySelector('#pst-pcw-ti-actions [data-pcw-ti="go"][data-id="'+CSS.escape(S(id))+'"]');if(create){if(ready){create.disabled=false;create.removeAttribute('title');}else{create.disabled=true;create.title='Kërkohet Dosja e Tenderit / paramasa nga KRPP para krijimit të projektit.';}}
     return true;
   }
   if(kind==='go'){
     if(tenderMode(r)==='local'&&!dossierReady(id))throw new Error('Së pari merre dhe analizo dosjen e tenderit.');
     await P.go(id);
   }else if(kind==='review')await P.review(id);
   else if(kind==='draft')await P.prepareDraft(id);
   else if(kind==='nogo')await P.noGo(id);
   else return false;
   tenderState.last=0;await loadOpportunities(true);if((kind==='nogo'||kind==='go')&&window.pstTenderIntelligenceClose)window.pstTenderIntelligenceClose();return true;
 }catch(e){alert(e&&e.message||e);return false;}finally{if(btn&&kind!=='go')btn.disabled=false;}
}

/* ---------- Contact brief: hydrate live relations instead of empty shell ---------- */
function contactMasterRows(){var M=window.PSTContactMasterV3||window.PSTContactMasterV2||window.PSTContactMasterV1;return M&&M.state&&Array.isArray(M.state.rows)?M.state.rows:[];}
async function hydrateContact(id){
 id=S(id);if(!id||contactBusy[id])return;contactBusy[id]=true;
 try{
   var fresh=A(await db('pppp_contact_master_v1?contact_id=eq.'+encodeURIComponent(id)+'&select=contact_id,kind,company,person,email,phone,country,role,last_contact,sources,projects,project_email_count,last_seen_at&limit=1').catch(function(){return[];}))[0];
   var row=fresh||contactMasterRows().find(function(r){return S(r.contact_id||r.id)===id;});if(!row)return;
   var email=S(row.email).trim(),host=document.getElementById('pcm-detail');if(!host)return;
   var old=host.querySelector('#pst-contact-live-context');if(old)old.remove();
   if(!email)return;
   var mailIn=A(await db('project_emails?from_email=eq.'+encodeURIComponent(email)+'&select=project_id,subject,snippet,sent_at,direction,gmail_url&order=sent_at.desc.nullslast&limit=8').catch(function(){return[];}));
   var mailOut=A(await db('project_emails?to_emails=cs.'+encodeURIComponent('{'+email+'}')+'&select=project_id,subject,snippet,sent_at,direction,gmail_url&order=sent_at.desc.nullslast&limit=8').catch(function(){return[];}));
   var seen={},recent=mailIn.concat(mailOut).filter(function(m){var k=S(m.gmail_url||m.subject)+'|'+S(m.sent_at);if(seen[k])return false;seen[k]=1;return true;}).sort(function(a,b){return new Date(b.sent_at||0)-new Date(a.sent_at||0);}).slice(0,8);
   if(!recent.length)return;
   var projectNames={};A(row.projects).forEach(function(p){if(p&&p.project_id)projectNames[S(p.project_id)]=S(p.name||'Projekt');});
   function gmailLink(v){try{var u=new URL(S(v));return u.protocol==='https:'?u.href:'';}catch(e){return'';}}
   var sec=document.createElement('section');sec.id='pst-contact-live-context';sec.className='pcm-detail-section';
   sec.innerHTML='<div class="pst-contact-live-head"><h3>Komunikimi i fundit</h3><span>'+recent.length+' emaila të fundit</span></div><div class="pst-contact-live-mails">'+recent.map(function(m){
     var outgoing=N(m.direction)==='outgoing',url=gmailLink(m.gmail_url),project=projectNames[S(m.project_id)]||'',date=m.sent_at?new Date(m.sent_at).toLocaleDateString('sq-AL',{day:'2-digit',month:'short'}):'',body='<div class="pst-contact-mail-icon '+(outgoing?'out':'in')+'">'+(outgoing?'↑':'↓')+'</div><div class="pst-contact-mail-copy"><div class="pst-contact-mail-top"><b>'+E(m.subject||'Pa subjekt')+'</b><small>'+E(date)+'</small></div><p>'+E((m.snippet||'').slice(0,210))+'</p><span>'+E((outgoing?'Dërguar':'Marrë')+(project?' · '+project:''))+'</span></div>';
     return url?'<a class="pst-contact-mail" href="'+E(url)+'" target="_blank" rel="noopener">'+body+'</a>':'<div class="pst-contact-mail">'+body+'</div>';
   }).join('')+'</div>';
   var sources=host.querySelector('.pcm-sources-section'),actions=host.querySelector('.pcm-detail-actions');if(sources)host.insertBefore(sec,sources);else if(actions)host.insertBefore(sec,actions);else host.appendChild(sec);
 }catch(e){console.warn('PPPP contact hydration:',e);}finally{delete contactBusy[id];}
}

/* ---------- Project operator update: human text -> context + safe internal action ---------- */
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
async function edge(slug,payload){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 async function run(t){return fetch(base+'/functions/v1/'+slug,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
 var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}if(!res.ok||!data||data.ok===false)throw new Error(S(data&&(data.message||data.error)||('HTTP '+res.status)).slice(0,800));return data;
}
function currentProjectId(){var d=window.__pstIntegrityLastData,p=d&&d.project;return S(window.__pstCurrentProjectId||window._curProjId||p&&p.id).trim();}
function ensureProjectUpdate(){
 var p=activePage('page-workspace-project');if(!p)return false;var pid=currentProjectId();if(!pid)return false;
 var box=document.getElementById('pst-project-operator-update');if(box){box.setAttribute('data-project-id',pid);return true;}
 box=document.createElement('section');box.id='pst-project-operator-update';box.setAttribute('data-project-id',pid);box.innerHTML='<div class="pst-pou-copy"><span>PËRDITËSIM I PROJEKTIT</span><b>Çfarë po ndodh me këtë projekt?</b><small>Shkruaj vendimin ose gjendjen reale. PPPP e ruan si kontekst dhe organizon vetëm veprimet e sigurta të brendshme.</small></div><form><textarea rows="2" placeholder="P.sh. Oferta është dërguar dhe tani presim përgjigjen e klientit. Bëj follow-up të premten."></textarea><button type="submit">Përditëso projektin</button></form><div class="pst-pou-result" hidden></div>';
 var anchor=p.querySelector('.pwf-project-context')||p.querySelector('.pf2-project-context')||p.firstElementChild;if(anchor&&anchor.parentNode)anchor.insertAdjacentElement('afterend',box);else p.prepend(box);
 var form=box.querySelector('form'),ta=box.querySelector('textarea'),result=box.querySelector('.pst-pou-result');form.onsubmit=async function(e){e.preventDefault();var update=S(ta.value).trim(),id=S(box.getAttribute('data-project-id'));if(!update||!id)return;var btn=form.querySelector('button');btn.disabled=true;btn.textContent='Duke përditësuar…';result.hidden=false;result.innerHTML='PPPP po e lexon vendimin dhe po rifreskon kontekstin…';try{var out=await edge('pppp-project-operator-update',{project_id:id,update:update});var acts=A(out.actions_applied),labels=acts.map(function(a){if(a.type==='task_created')return'Detyrë e re: '+S(a.task&&a.task.title);if(a.type==='project_update')return'Gjendja e projektit u përditësua';return a.type;});result.innerHTML='<b>'+E(out.summary||'Përditësimi u ruajt.')+'</b>'+(labels.length?'<span>'+E(labels.join(' · '))+'</span>':'<span>Konteksti u ruajt; nuk u bë ndryshim i panevojshëm në workflow.</span>');ta.value='';try{var B=window.PSTProjectContextBridge;if(B&&typeof B.clear==='function')B.clear(id);if(B&&typeof B.load==='function')B.load(id,true);}catch(x){}try{var H=window.PSTHomeCanonicalV1;if(H&&typeof H.refresh==='function')H.refresh();}catch(x){}try{var C=window.PSTProjectClassificationV1;if(C&&typeof C.schedule==='function')C.schedule();}catch(x){}try{document.dispatchEvent(new CustomEvent('pst:project-operator-updated',{detail:{project_id:id,result:out}}));}catch(x){}}catch(err){result.innerHTML='<b>Nuk u ruajt.</b><span>'+E(err&&err.message||err)+'</span>';}finally{btn.disabled=false;btn.textContent='Përditëso projektin';}};
 return true;
}

function click(e){
 var close=e.target&&e.target.closest?e.target.closest('[data-pcw-close-modal]'):null;if(close||e.target&&e.target.id==='pst-ti-backdrop'){e.preventDefault();e.stopPropagation();closeTenderModal();return;}
 var tab=e.target&&e.target.closest?e.target.closest('[data-pcw-mode]'):null;if(tab){tenderState.mode=tab.getAttribute('data-pcw-mode')||'all';renderOpportunities();return;}
 var ti=e.target&&e.target.closest?e.target.closest('[data-pcw-ti]'):null;if(ti){e.preventDefault();e.stopPropagation();tenderAction(ti.getAttribute('data-pcw-ti'),ti.getAttribute('data-id'),ti);return;}
 var tender=e.target&&e.target.closest?e.target.closest('[data-pcw-tender]'):null;if(tender){e.preventDefault();openTender(tender.getAttribute('data-pcw-tender'));return;}
 var cp=e.target&&e.target.closest?e.target.closest('[data-pcw-contact-project]'):null;if(cp){var id=cp.getAttribute('data-pcw-contact-project');if(id&&window.pstOpenProjectWorkspace)window.pstOpenProjectWorkspace(id);return;}
 var contact=e.target&&e.target.closest?e.target.closest('[data-pcm-id]'):null;if(contact)setTimeout(function(){hydrateContact(contact.getAttribute('data-pcm-id'));},40);
}
function keydown(e){var t=e.target&&e.target.closest?e.target.closest('[data-pcw-tender]'):null;if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openTender(t.getAttribute('data-pcw-tender'));}}
function css(){if(document.getElementById('pst-project-centric-workflow-css'))return;var s=document.createElement('style');s.id='pst-project-centric-workflow-css';s.textContent=`
/* Home */
#page-workspace-home.active .pst-hao-go{display:none!important}
#page-workspace-home.active .pst-hao-card{padding:19px 22px!important;border-left:4px solid #6F9EAF!important;background:#fff!important}
#page-workspace-home.active .pst-hao-card:hover{border-color:#9AB8C3!important;border-left-color:#397F98!important;background:#F8FBFC!important}
#page-workspace-home.active .pst-hao-project{font-size:12px!important;color:#3E6675!important;font-weight:800!important}
#page-workspace-home.active .pst-hao-tag{background:#EDF5F7!important;color:#527E8F!important}
#page-workspace-home.active .pst-hao-head h1{color:#273F49!important}
/* Projects */
#page-workspace-projects.active .pst-pm-row{cursor:pointer}
#page-workspace-projects.active .pst-pm-row:focus-visible{outline:2px solid #6B9FAF;outline-offset:2px}
/* Opportunities */
#page-kek-tenders #pst-opportunities-all.pst-pcw-backstage{display:none!important}
#page-kek-tenders[data-pcw-opportunities-owner] .pst-kek-filter,
#page-kek-tenders[data-pcw-opportunities-owner] .pst-kek-card,
#page-kek-tenders[data-pcw-opportunities-owner] .pst-kek-head>.pst-kek-actions,
#page-kek-tenders[data-pcw-opportunities-owner] #pst-tender-fit-summary{display:none!important}
#page-kek-tenders #pst-opportunities-focus{border:0!important;border-radius:20px!important;padding:23px!important;background:linear-gradient(180deg,#fff 0%,#fbfdfe 100%)!important;box-shadow:0 12px 36px rgba(32,58,70,.07)!important}
#page-kek-tenders #pst-opportunities-focus>header span{font-size:9px!important;color:#397F98!important}
#page-kek-tenders #pst-opportunities-focus>header h2{font-size:24px!important;letter-spacing:-.02em!important;color:#263E48!important}
#page-kek-tenders #pst-opportunities-focus>header p{font-size:11px!important;max-width:760px!important;color:#71858E!important;line-height:1.5!important}
#pst-pcw-opportunity-tools{margin:18px 0 10px}#pst-pcw-opportunity-tools label{display:flex;align-items:center;gap:10px;border:1px solid #D9E5E9;border-radius:13px;background:#fff;padding:0 13px}#pst-pcw-opportunity-tools label span{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.09em;color:#6B8792}#pst-pcw-opportunity-search{height:48px;flex:1;border:0;outline:0;background:transparent;font-size:14px;color:#30464F}
#pst-pcw-opportunity-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:13px 0 10px}
#pst-pcw-opportunity-tabs button{min-height:44px;border:1px solid #DDE6E9;border-radius:12px;background:#fff;color:#66777E;padding:0 15px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
#pst-pcw-opportunity-tabs button.on{background:#EAF4F7;border-color:#9FC6D2;color:#2F758E;box-shadow:0 4px 12px rgba(57,127,152,.08)}#pst-pcw-opportunity-tabs i{font-style:normal;min-width:22px;height:22px;border-radius:999px;background:#F0F5F7;display:inline-flex;align-items:center;justify-content:center;opacity:.85}#pst-pcw-opportunity-tabs button.on i{background:#fff}
#pst-opportunities-list{display:grid!important;gap:9px!important}
.pst-pcw-tender{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;padding:20px 21px;border:1px solid #DFE7EA;border-left:5px solid #6D9BAA;border-radius:16px;background:#fff;cursor:pointer;transition:.15s;box-shadow:0 3px 14px rgba(40,65,77,.035)}
.pst-pcw-tender:hover,.pst-pcw-tender:focus-visible{border-color:#B9D0D8;border-left-color:#397F98;background:#F8FBFC;box-shadow:0 7px 20px rgba(43,75,86,.07);transform:translateY(-1px);outline:none}
.pst-pcw-tender-meta{display:flex;gap:9px;flex-wrap:wrap;font-size:11px;font-weight:850;color:#849197;letter-spacing:.05em}.pst-pcw-tender-meta span{padding:4px 7px;border-radius:999px;background:#F3F6F7}.pst-pcw-tender-meta .kind{color:#397F98;background:#EAF4F7}.pst-pcw-tender-meta .winner-role.gc_epc{background:#E9F5ED;color:#35734A}.pst-pcw-tender-meta .winner-role.producer{background:#FFF3E4;color:#8A6327}.pst-pcw-tender-meta .winner-role.trader_consortium{background:#F0ECF8;color:#6A5494}.pst-pcw-tender-meta .winner-role.unknown{background:#F4F4F4;color:#777}.pst-pcw-tender h3{margin:8px 0 0;font-size:17px;color:#2D434D;line-height:1.35}.pst-pcw-tender p{margin:7px 0 0;font-size:13px;color:#6F8087;line-height:1.5;max-width:900px}.pst-pcw-tender small{display:block;margin-top:9px;font-size:11.5px;color:#8A979C}.pst-pcw-tender-open{display:flex;align-items:center;gap:10px;color:#397F98;white-space:nowrap;padding:9px 12px;border-radius:10px;background:#F0F7F9}.pst-pcw-tender-open b{font-size:12px}.pst-pcw-tender-open span{font-size:19px}.pst-pcw-empty{padding:24px;color:#819096;text-align:center}
.pst-pcw-modal{position:fixed;inset:0;z-index:10080;background:rgba(28,38,43,.48);display:none;align-items:center;justify-content:center;padding:18px}.pst-pcw-modal #pst-ti-card{width:min(820px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;border:1px solid #D8E2E5;box-shadow:0 24px 80px rgba(0,0,0,.2);padding:22px}.pst-pcw-modal-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.pst-pcw-modal-head span{font-size:9px;font-weight:900;letter-spacing:.12em;color:#397F98}.pst-pcw-modal-head h2{font-size:20px;line-height:1.35;color:#2C434D;margin:4px 0 0}.pst-pcw-modal-head p{font-size:11px;color:#7A8A91;margin:5px 0 0}.pst-pcw-modal-head button{border:1px solid #D6E0E4;background:#fff;border-radius:9px;padding:7px 10px;color:#536970;font-size:10px;font-weight:800;cursor:pointer}.pst-pcw-modal-foot{margin-top:16px;padding-top:11px;border-top:1px solid #E7ECEE;font-size:9px;color:#87949A}
#pst-pcw-server-analysis{margin-top:16px;padding-top:14px;border-top:1px solid #E5ECEE}.pst-pcw-winner-brief{padding:15px 16px;border:1px solid #DCE7EA;border-radius:14px;background:#FAFCFD}.pst-pcw-winner-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.pst-pcw-winner-head span{font-size:9px;font-weight:900;letter-spacing:.1em;color:#397F98}.pst-pcw-winner-head h3{margin:4px 0 0;font-size:18px;color:#2E4650}.pst-pcw-winner-head .role{padding:7px 10px;border-radius:999px;font-size:10px}.pst-pcw-winner-head .role.gc_epc{background:#E9F5ED;color:#35734A}.pst-pcw-winner-head .role.producer{background:#FFF3E4;color:#8A6327}.pst-pcw-winner-head .role.trader_consortium{background:#F0ECF8;color:#6A5494}.pst-pcw-winner-head .role.unknown{background:#F1F2F3;color:#6E777B}.pst-pcw-winner-brief>p{font-size:12.5px;line-height:1.55;color:#596E77;margin:11px 0}.pst-pcw-winner-facts{display:flex;gap:8px;flex-wrap:wrap}.pst-pcw-winner-facts>*{padding:8px 10px;border-radius:9px;background:#fff;border:1px solid #E2E9EB;font-size:10.5px;color:#64777F;text-decoration:none}.pst-pcw-winner-facts b{color:#344E58}.pst-pcw-winner-contacts{margin-top:12px}.pst-pcw-winner-contacts>b{display:block;font-size:11px;color:#405761;margin-bottom:6px}.pst-pcw-winner-contacts a{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border-top:1px solid #E8EDEF;color:#397F98;text-decoration:none;font-size:11px}.pst-pcw-winner-contacts a small{color:#859399}.pst-pcw-winner-none{margin-top:12px;font-size:11px;color:#8A969B}.pst-pcw-ai-loading{margin-top:12px}.pst-pcw-ai>span{font-size:8px;font-weight:900;letter-spacing:.12em;color:#397F98}.pst-pcw-ai p{font-size:11.5px;line-height:1.62;color:#354B54;margin:7px 0}.pst-pcw-ai small{display:block;color:#657A83}.pst-pcw-ai-loading{font-size:9.5px;color:#7F8E94}
#pst-pcw-ti-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;padding-top:14px;border-top:1px solid #E5ECEE}#pst-pcw-ti-actions button,#pst-pcw-ti-actions .pst-pcw-source-link{min-height:41px;box-sizing:border-box;border:1px solid #D9E3E6;border-radius:10px;background:#fff;color:#536870;padding:0 13px;font-size:9px;font-weight:850;cursor:pointer;display:inline-flex;align-items:center;text-decoration:none}#pst-pcw-ti-actions button.primary{background:#397F98;border-color:#397F98;color:#fff}#pst-pcw-ti-actions button.create{background:#35734A;border-color:#35734A;color:#fff;margin-left:auto}#pst-pcw-ti-actions button.danger{color:#995151;border-color:#E6CCCC;background:#FFF9F9}#pst-pcw-ti-actions button:disabled{opacity:.42;cursor:not-allowed}.pst-pcw-decision-intro{padding:13px 14px;border:1px solid #DCE8EC;border-radius:12px;background:#F7FBFC}.pst-pcw-decision-intro span,.pst-pcw-decision-intro b,.pst-pcw-decision-intro small{display:block}.pst-pcw-decision-intro span{font-size:8px;font-weight:900;letter-spacing:.11em;color:#397F98}.pst-pcw-decision-intro b{font-size:11px;color:#314B55;margin-top:4px}.pst-pcw-decision-intro small{font-size:8.5px;color:#788A91;margin-top:4px}
/* Project operator update */
#pst-project-operator-update{display:grid;grid-template-columns:minmax(260px,.75fr) minmax(360px,1.25fr);gap:18px;align-items:center;margin:12px 0 16px;padding:16px 17px;border:1px solid #DCE7EA;border-left:4px solid #397F98;border-radius:13px;background:#F9FBFC}.pst-pou-copy>span{font-size:8px;font-weight:900;letter-spacing:.12em;color:#397F98}.pst-pou-copy>b{display:block;margin-top:3px;font-size:14px;color:#30464F}.pst-pou-copy>small{display:block;margin-top:4px;font-size:9px;line-height:1.45;color:#76868D}#pst-project-operator-update form{display:flex;gap:8px;align-items:stretch}#pst-project-operator-update textarea{flex:1;min-height:66px;border:1px solid #CADADF;border-radius:10px;padding:9px 10px;font-size:11px;line-height:1.45;resize:vertical;background:#fff}#pst-project-operator-update form button{width:126px;border:0;border-radius:10px;background:#397F98;color:#fff;font-size:9px;font-weight:850;cursor:pointer;padding:0 10px}#pst-project-operator-update form button:disabled{opacity:.55}.pst-pou-result{grid-column:1/-1;padding:10px 12px;border-radius:9px;background:#EFF6F8;color:#4C626B;font-size:9.5px}.pst-pou-result b{display:block;color:#30464F}.pst-pou-result span{display:block;margin-top:3px}
/* Contact hydration */
#pst-contact-live-context{margin-top:18px!important}.pst-contact-live-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.pst-contact-live-head h3{margin:0!important}.pst-contact-live-head span{font-size:8px;color:#8A9996}.pst-contact-live-mails{display:grid;gap:7px}.pst-contact-mail{display:flex;gap:10px;padding:10px 11px;border:1px solid #E2EAE8;border-radius:11px;background:#fff;text-decoration:none;transition:.15s}.pst-contact-mail[href]:hover{background:#F5FAF8;border-color:#BCD8D0;transform:translateY(-1px)}.pst-contact-mail-icon{width:28px;height:28px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:850;flex:0 0 auto}.pst-contact-mail-icon.out{background:#EAF5F2;color:#397366}.pst-contact-mail-icon.in{background:#EDF5F8;color:#397F98}.pst-contact-mail-copy{flex:1;min-width:0}.pst-contact-mail-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.pst-contact-mail-top b{font-size:10.5px;color:#3A4E56;line-height:1.3}.pst-contact-mail-top small{font-size:7.7px;color:#9AA4A8;white-space:nowrap}.pst-contact-mail-copy p{font-size:9px;line-height:1.45;color:#75858B;margin:3px 0 4px}.pst-contact-mail-copy span{display:block;font-size:8px;color:#66807A;font-weight:720}
@media(max-width:800px){.pst-pcw-tender{grid-template-columns:1fr}.pst-pcw-tender-open{justify-content:flex-end}#pst-project-operator-update{grid-template-columns:1fr}#pst-project-operator-update form{flex-direction:column}#pst-project-operator-update form button{width:100%;height:40px}.pst-contact-mail-top{flex-direction:column;gap:2px}}
`;document.head.appendChild(s);}
function apply(force){css();home();projects();ensureProjectUpdate();if(activePage('page-kek-tenders'))loadOpportunities(!!force);return true;}
function schedule(force){[0,90,260,700].forEach(function(ms){setTimeout(function(){apply(!!force);},ms);});}
document.addEventListener('click',click,true);document.addEventListener('keydown',keydown,true);document.addEventListener('pst:modules-ready',function(){schedule(false);},{once:true});document.addEventListener('pst:project-operator-updated',function(){schedule(true);});window.addEventListener('pageshow',function(){schedule(false);},{once:true});
document.addEventListener('click',function(e){var n=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[data-pm-open],[data-pwf-area],[data-pwf-stage],[data-pcm-id]'):null;if(n)schedule(false);},true);
if(document.readyState!=='loading')schedule(false);else document.addEventListener('DOMContentLoaded',function(){schedule(false);},{once:true});
window.PSTProjectCentricWorkflowV1={version:'3',apply:apply,schedule:schedule,home:home,projects:projects,loadOpportunities:loadOpportunities,renderOpportunities:renderOpportunities,openTender:openTender,closeTenderModal:closeTenderModal,hydrateContact:hydrateContact,ensureProjectUpdate:ensureProjectUpdate,_test:{tenderVisible:tenderVisible,tenderSource:tenderSource,tenderPhase:tenderPhase,opportunityRows:opportunityRows,winnerRole:winnerRole,winnerRoleLabel:winnerRoleLabel,winnerApproach:winnerApproach,ensureTenderModal:ensureTenderModal}};
})();
