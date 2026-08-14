/* PRISTEEL — Tender Business Flow v1
 * TED = awarded contracts / winner outreach.
 * KRPP + APP = active opportunities PRISTEEL can bid on directly.
 * Additive UI layer; does not replace the underlying collectors or project promotion logic.
 */
(function(){
'use strict';
if(window.__pstTenderBusinessFlowV1)return;
window.__pstTenderBusinessFlowV1=true;

var bizRows=[];
var installed=false;
var loading=false;
var originalLoad=null,originalSetStatus=null,originalPromote=null;

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function n(v){return String(v==null?'':v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function payload(r){return r&&r.payload&&typeof r.payload==='object'?r.payload:{};}
function source(r){var s=String(payload(r).source||'KRPP').toUpperCase();if(s==='TED')return'TED';if(s==='APP_AL'||s==='APP')return'APP_AL';return'KRPP';}
function phase(r){return payload(r).notice_phase==='award'?'award':'opportunity';}
function sourceLabel(r){var s=source(r);return s==='TED'?'EU · TED':s==='APP_AL'?'Shqipëri · APP':'Kosovë · KRPP';}
function sourceButton(r){var s=source(r);return s==='TED'?'TED ↗':s==='APP_AL'?'APP ↗':'KRPP ↗';}
function sourceClass(r){var s=source(r);return s==='TED'?'ted':s==='APP_AL'?'app':'krpp';}
function codeLabel(r){return source(r)==='KRPP'?'FPP':'CPV';}
function catLabel(v){return v==='raw_material'?'Lëndë e parë':v==='steel_structure'?'Strukturë çeliku':'Për shqyrtim';}
function dateText(v){var d=v?new Date(v+'T00:00:00'):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function db(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path,method,body);}
function safeHttp(v){var s=String(v||'').trim();return /^https?:\/\//i.test(s)?s:'';}
function winner(r){
 var w=payload(r).winner;
 if(!w||typeof w!=='object')return{name:'',email:'',website:'',country:'',city:'',names:[]};
 var names=Array.isArray(w.names)?w.names.filter(Boolean):(w.name?[w.name]:[]);
 return{name:String(w.name||names[0]||''),email:String(w.email||(Array.isArray(w.emails)&&w.emails[0])||''),website:String(w.website||(Array.isArray(w.websites)&&w.websites[0])||''),country:String(w.country||(Array.isArray(w.countries)&&w.countries[0])||''),city:String(w.city||(Array.isArray(w.cities)&&w.cities[0])||''),names:names};
}
function bizStatus(r){
 if(source(r)==='TED'&&payload(r).ted_contact_status==='contacted')return'contacted';
 return r.status||'new';
}
function hasTedWinner(r){return source(r)==='TED'&&!!winner(r).name;}
function statusLabel(r){
 var st=bizStatus(r);
 if(source(r)==='TED'){
  if(!hasTedWinner(r)&&st!=='ignored')return'Fituesi i papublikuar';
  return({new:'Fitues i ri',review:'Për kontakt',contacted:'Kontaktuar',ignored:'Anashkaluar',promoted:'Projekt'})[st]||st;
 }
 return({new:'E re',review:'Në shqyrtim',ignored:'Anashkaluar',promoted:'Projekt',contacted:'Kontaktuar'})[st]||st||'—';
}
function isOperationalFocus(r){return source(r)==='TED'?phase(r)==='award'&&hasTedWinner(r):phase(r)==='opportunity';}
function isOpen(r){var st=bizStatus(r);return st==='new'||st==='review';}

function setupShell(){
 var page=document.getElementById('page-kek-tenders');if(!page)return;
 var sub=page.querySelector('.pst-kek-sub');
 if(sub)sub.textContent='Kosovë dhe Shqipëri: tendera aktivë ku PRISTEEL mund të aplikojë. TED: vetëm kontrata të dhëna, fituesit dhe kontaktet për outreach.';
 var eye=page.querySelector('.pst-kek-eye');if(eye)eye.textContent='PUBLIC STEEL PROCUREMENT · APPLICATION + WINNER OUTREACH';
 var ph=document.getElementById('pst-kek-phase');
 if(ph){ph.innerHTML='<option value="focus">Fokus operativ</option><option value="opportunity">Të shpallura · KRPP/APP</option><option value="award">Të dhëna / fitues</option><option value="all">Të gjitha operative</option>';ph.value='focus';ph.onchange=window.pstKekRender;}
 var st=document.getElementById('pst-kek-status');
 if(st){st.innerHTML='<option value="open">Të hapura / për veprim</option><option value="new">Vetëm të reja</option><option value="review">Në shqyrtim / për kontakt</option><option value="contacted">Kontaktuar · TED</option><option value="promoted">Të kthyera në projekt</option><option value="ignored">Të anashkaluara</option><option value="all">Të gjitha</option>';st.value='open';st.onchange=window.pstKekRender;}
}
function updateBadge(){
 var badge=document.getElementById('pst-kek-nav-badge');if(!badge)return;
 var c=bizRows.filter(function(r){return isOperationalFocus(r)&&isOpen(r);}).length;
 badge.textContent=String(c);badge.style.display=c?'inline-flex':'none';
}
async function load(){
 var h=document.getElementById('pst-kek-list');if(h)h.innerHTML='<div class="pst-kek-empty">Duke ngarkuar tenderat…</div>';
 setupShell();loading=true;
 try{
  if(originalLoad)await originalLoad();
  bizRows=await db('kek_tender_watch?select=*&order=published_date.desc,relevance_score.desc&limit=2000');
  bizRows=Array.isArray(bizRows)?bizRows:[];
  setupShell();updateBadge();loading=false;render();
 }catch(e){loading=false;if(h)h.innerHTML='<div class="pst-kek-empty">Tabela e tenderëve nuk u ngarkua: '+esc(e.message)+'</div>';}
}
function statusMatch(r,st){var bs=bizStatus(r);if(st==='all')return true;if(st==='open')return bs==='new'||bs==='review';return bs===st;}
function phaseMatch(r,ph){
 /* Hard business boundary: TED opportunities are never operational rows in PPPP. */
 if(source(r)==='TED'&&phase(r)!=='award')return false;
 if(ph==='focus')return isOperationalFocus(r);
 if(ph==='opportunity')return source(r)!=='TED'&&phase(r)==='opportunity';
 if(ph==='award')return phase(r)==='award';
 return true;
}
function winnerHtml(r){
 if(source(r)!=='TED')return'';
 var w=winner(r);
 if(!w.name)return'<div class="pst-kek-meta" style="margin-top:6px;color:#9A6B45"><strong>Fituesi:</strong> ende nuk është publikuar në të dhënat e TED.</div>';
 var extra=[w.city,w.country].filter(Boolean).join(', ');var more=w.names.length>1?' · +'+(w.names.length-1)+' fitues tjetër':'';
 return'<div class="pst-kek-meta" style="margin-top:6px;color:#455B9A"><strong>Fituesi:</strong> '+esc(w.name)+(extra?' · '+esc(extra):'')+more+(w.email?' · '+esc(w.email):'')+'</div>';
}
function tedActions(r){
 var w=winner(r),a='';
 a+='<button class="pst-kek-btn" onclick="pstKekOpenSource(\''+esc(r.id)+'\')">TED ↗</button>';
 if(!w.name){
  if(r.status!=='ignored')a+='<button class="pst-kek-btn danger" onclick="pstTenderBizSetStatus(\''+esc(r.id)+'\',\'ignored\')">Anashkalo</button>';
  return a;
 }
 if(w.email)a+='<button class="pst-kek-btn" onclick="pstTenderBizEmail(\''+esc(r.id)+'\')">Email ↗</button>';
 if(safeHttp(w.website))a+='<button class="pst-kek-btn" onclick="pstTenderBizWebsite(\''+esc(r.id)+'\')">Web ↗</button>';
 var st=bizStatus(r);
 if(st==='new')a+='<button class="pst-kek-btn primary" onclick="pstTenderBizSetStatus(\''+esc(r.id)+'\',\'review\')">Për kontakt</button>';
 else if(st==='review')a+='<button class="pst-kek-btn primary" onclick="pstTenderBizMarkContacted(\''+esc(r.id)+'\')">Kontaktuar</button>';
 else if(st==='contacted')a+='<button class="pst-kek-btn" onclick="pstTenderBizReopen(\''+esc(r.id)+'\')">Rihap</button>';
 if(r.status!=='ignored')a+='<button class="pst-kek-btn danger" onclick="pstTenderBizSetStatus(\''+esc(r.id)+'\',\'ignored\')">Anashkalo</button>';
 return a;
}
function localActions(r){
 var a='';
 if((r.detail_url||r.source_url))a+='<button class="pst-kek-btn" onclick="pstKekOpenSource(\''+esc(r.id)+'\')">'+sourceButton(r)+'</button>';
 if(r.status==='promoted'&&r.project_id)return a+'<button class="pst-kek-btn primary" onclick="pstKekOpenProject(\''+esc(r.project_id)+'\')">Hap projektin</button>';
 a+='<button class="pst-kek-btn" onclick="pstTenderBizSetStatus(\''+esc(r.id)+'\',\'review\')">Shqyrto</button>';
 if(phase(r)==='opportunity')a+='<button class="pst-kek-btn primary" onclick="pstTenderBizPromote(\''+esc(r.id)+'\')">Krijo projekt</button>';
 a+='<button class="pst-kek-btn danger" onclick="pstTenderBizSetStatus(\''+esc(r.id)+'\',\'ignored\')">Anashkalo</button>';
 return a;
}
function render(){
 var h=document.getElementById('pst-kek-list');if(!h||loading)return;
 var q=n((document.getElementById('pst-kek-search')||{}).value||'');
 var src=(document.getElementById('pst-kek-source')||{}).value||'all';
 var ph=(document.getElementById('pst-kek-phase')||{}).value||'focus';
 var cat=(document.getElementById('pst-kek-category')||{}).value||'all';
 var st=(document.getElementById('pst-kek-status')||{}).value||'open';
 var list=bizRows.filter(function(r){
  if(!phaseMatch(r,ph))return false;
  if(src!=='all'&&source(r)!==src)return false;
  if(cat!=='all'&&r.category!==cat)return false;
  if(!statusMatch(r,st))return false;
  if(q&&n([r.title,r.authority,r.procurement_no,r.publication_no,r.fpp,r.fpp_description,winner(r).name,winner(r).email].join(' ')).indexOf(q)<0)return false;
  return true;
 });
 if(!list.length){h.innerHTML='<div class="pst-kek-empty">Nuk ka tenderë që përputhen me filtrin. Për TED shfaqen vetëm kontratat e dhëna; për KRPP/APP shfaqen tenderat aktivë.</div>';return;}
 h.innerHTML='<table class="pst-kek-table"><thead><tr><th>Tenderi</th><th>Burimi</th><th>Kategoria</th><th>Relevanca</th><th>Publikuar</th><th>Afati</th><th>Statusi</th><th></th></tr></thead><tbody>'+list.map(function(r){
  var reasons=Array.isArray(r.match_reasons)?r.match_reasons.join(' · '):'';
  var meta=esc(r.procurement_no||'')+(r.fpp?' · '+codeLabel(r)+' '+esc(r.fpp):'')+(r.authority?' · '+esc(r.authority):'');
  var isAward=phase(r)==='award';var actions=source(r)==='TED'?tedActions(r):localActions(r);
  return'<tr><td><div class="pst-kek-name">'+esc(r.title)+'</div><div class="pst-kek-meta">'+meta+'</div>'+winnerHtml(r)+'</td><td><span class="pst-kek-chip source '+sourceClass(r)+'">'+sourceLabel(r)+'</span>'+(isAward?'<span class="pst-kek-chip award">Rezultat</span>':'')+'</td><td><span class="pst-kek-chip '+esc(r.category)+'">'+esc(catLabel(r.category))+'</span></td><td><div class="pst-kek-score">'+esc(r.relevance_score)+'%</div><div class="pst-kek-reason">'+esc(reasons)+'</div></td><td>'+dateText(r.published_date)+'</td><td>'+(source(r)==='TED'?'—':dateText(r.deadline))+'</td><td>'+esc(statusLabel(r))+'</td><td><div class="pst-kek-rowacts">'+actions+'</div></td></tr>';
 }).join('')+'</tbody></table>';
}
async function refreshOwnRows(){
 bizRows=await db('kek_tender_watch?select=*&order=published_date.desc,relevance_score.desc&limit=2000');bizRows=Array.isArray(bizRows)?bizRows:[];updateBadge();render();
}
window.pstTenderBizSetStatus=async function(id,status){
 try{
  if(originalSetStatus)await originalSetStatus(id,status);else await db('kek_tender_watch?id=eq.'+encodeURIComponent(id),'PATCH',{status:status,updated_at:new Date().toISOString()});
  var r=bizRows.find(function(x){return String(x.id)===String(id);});if(r)r.status=status;updateBadge();render();
 }catch(e){alert('Gabim: '+e.message);}
};
window.pstTenderBizMarkContacted=async function(id){
 try{
  var r=bizRows.find(function(x){return String(x.id)===String(id);});if(!r)return;
  var p=Object.assign({},payload(r),{ted_contact_status:'contacted',ted_contacted_at:new Date().toISOString()});
  await db('kek_tender_watch?id=eq.'+encodeURIComponent(id),'PATCH',{payload:p,updated_at:new Date().toISOString()});r.payload=p;updateBadge();render();
 }catch(e){alert('Gabim: '+e.message);}
};
window.pstTenderBizReopen=async function(id){
 try{
  var r=bizRows.find(function(x){return String(x.id)===String(id);});if(!r)return;
  var p=Object.assign({},payload(r));delete p.ted_contact_status;delete p.ted_contacted_at;
  await db('kek_tender_watch?id=eq.'+encodeURIComponent(id),'PATCH',{payload:p,status:'review',updated_at:new Date().toISOString()});r.payload=p;r.status='review';updateBadge();render();
 }catch(e){alert('Gabim: '+e.message);}
};
window.pstTenderBizEmail=function(id){var r=bizRows.find(function(x){return String(x.id)===String(id);}),e=r&&winner(r).email;if(e)window.location.href='mailto:'+encodeURIComponent(e);};
window.pstTenderBizWebsite=function(id){var r=bizRows.find(function(x){return String(x.id)===String(id);}),u=r&&safeHttp(winner(r).website);if(u)window.open(u,'_blank','noopener');};
window.pstTenderBizPromote=async function(id){try{if(originalPromote)await originalPromote(id);await refreshOwnRows();}catch(e){alert('Gabim: '+e.message);}};

function install(){
 if(installed)return true;
 if(typeof window.pstKekLoad!=='function'||typeof window.pstKekRender!=='function')return false;
 installed=true;originalLoad=window.pstKekLoad;originalSetStatus=window.pstKekSetStatus;originalPromote=window.pstKekPromote;
 window.pstKekLoad=load;window.pstKekRender=render;
 var page=document.getElementById('page-kek-tenders');if(page&&page.style.display!=='none')setTimeout(load,50);
 return true;
}
[400,900,1600,2800,4800,8000].forEach(function(ms){setTimeout(install,ms);});
window.pstTenderBusinessFlow={source:source,phase:phase,bizStatus:bizStatus,isOperationalFocus:isOperationalFocus,phaseMatch:phaseMatch,winner:winner};
})();
