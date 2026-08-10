/* PRISTEEL RFQ Gmail history sync v2
 * Explicit read-only Gmail lookup for historical sent RFQs.
 * One RFQ per supplier company. User confirms before any write.
 * Never sends email and never creates placeholder offers.
 */
(function(){
'use strict';
if(window.__pstRfqGmailHistorySyncV2)return;
window.__pstRfqGmailHistorySyncV2=true;

var state={busy:false,token:'',candidates:[],loadingSuppliers:false};
function A(v){return Array.isArray(v)?v:[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function O(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();}return'';}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function d(){return window.__pstIntegrityLastData||null;}
function R(){return window.PSTProjectFirstRfqDraftV1||null;}
function pid(){var x=d();return String(window.__pstCurrentProjectId||window._curProjId||(x&&x.project&&x.project.id)||'');}
function suppliers(){var r=R();return A(r&&r._state&&r._state.suppliers).filter(function(s){return String(s.email||'').trim();});}
async function ensureSuppliers(){
  var ss=suppliers(),r=R(),id=pid();
  if(ss.length)return ss;
  if(!r||typeof r.load!=='function'||!id||state.loadingSuppliers)return ss;
  state.loadingSuppliers=true;
  try{await r.load(id);}catch(e){console.warn('RFQ supplier load:',e);}
  finally{state.loadingSuppliers=false;}
  return suppliers();
}
function groups(ss){
  var map={},out=[];
  A(ss).forEach(function(s){
    var key=N(s.company||s.email);
    if(!key)return;
    if(!map[key]){map[key]={company:O(s.company,'Furnitor'),contacts:[]};out.push(map[key]);}
    if(!map[key].contacts.some(function(c){return String(c.email||'').toLowerCase()===String(s.email||'').toLowerCase();}))map[key].contacts.push(s);
  });
  return out;
}
function fmtDate(v){var x=v?new Date(v):null;return x&&!isNaN(x.getTime())?x.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';}
function projectLabel(){
  var x=d()||{},p=x.project||{},name=O(p.name,'Projekt'),client=O(p.client,'');
  if(client&&N(name).indexOf(N(client))===0){var raw=name.slice(client.length).replace(/^\s*[-–—|:]\s*/,'').trim();if(raw)name=raw;}
  return name;
}
function projectSignals(){
  var x=d()||{},p=x.project||{},name=projectLabel(),tok=N(name).split(' ').filter(function(w){return w.length>=4&&['projekt','project','steel','restoran','restaurant'].indexOf(w)<0;});
  return{name:name,tokens:tok.slice(0,8),ref:N(O(p.ref,p.reference,''))};
}
function score(meta){
  var s=projectSignals(),sub=N(meta.subject),sn=N(meta.snippet),text=sub+' '+sn,points=0,hits=0;
  if(s.ref&&s.ref.length>=5&&text.indexOf(s.ref)>-1){points+=160;hits+=3;}
  var full=N(s.name);if(full.length>=7&&sub.indexOf(full)>-1){points+=140;hits+=3;}
  s.tokens.forEach(function(t){if(sub.indexOf(t)>-1){points+=30;hits++;}else if(sn.indexOf(t)>-1){points+=10;hits++;}});
  if(/\b(rfq|offer|offerte|ofert|angebot|anfrage|ponud|kerkese|quotation|quote)\b/.test(sub))points+=20;
  return{points:points,hits:hits};
}
async function gmailIds(addr){
  var P=window.PSTEmail;if(!P||!P.gmail)throw new Error('Moduli Gmail nuk eshte gati.');
  var q='in:sent to:'+String(addr||'').trim()+' after:2025/01/01';
  var r=await P.gmail('/messages?maxResults=100&q='+enc(q),state.token);
  return A(r.messages).map(function(x){return x.id;}).filter(Boolean);
}
async function findForContact(s){
  var P=window.PSTEmail,ids=await gmailIds(s.email),best=null;
  for(var i=0;i<Math.min(ids.length,35);i++){
    var meta=await P.message(ids[i],state.token),sc=score(meta);
    if(sc.hits<2&&sc.points<90)continue;
    var row={contact:s,meta:meta,score:sc.points,hits:sc.hits};
    if(!best||row.score>best.score||(row.score===best.score&&String(meta.sent_at)>String(best.meta.sent_at)))best=row;
  }
  return best;
}
async function findForGroup(g){
  var best=null;
  for(var i=0;i<g.contacts.length;i++){
    try{
      var x=await findForContact(g.contacts[i]);
      if(x&&(!best||x.score>best.score||(x.score===best.score&&String(x.meta.sent_at)>String(best.meta.sent_at))))best=x;
    }catch(e){console.warn('RFQ Gmail history:',g.contacts[i].email,e);}
  }
  if(best){best.group=g;return best;}
  return null;
}
function setSyncText(t){
  document.querySelectorAll('[data-prfq-history-sync-native]').forEach(function(b){b.textContent=t;b.disabled=state.busy;});
}
async function scan(){
  if(state.busy)return;
  var ss=await ensureSuppliers(),gg=groups(ss);
  if(!gg.length){alert('Nuk u gjeten kontaktet e RFQ-se per kete projekt.');return;}
  var P=window.PSTEmail;
  if(!P||!P.auth||!P.gmail||!P.message){alert('Gmail read-only nuk eshte gati. Rifresko faqen dhe provo perseri.');return;}
  state.busy=true;setSyncText('Duke kerkuar ne Sent…');
  try{
    state.token=await P.auth();
    var out=[];
    for(var i=0;i<gg.length;i++){
      setSyncText('Duke kontrolluar '+(i+1)+'/'+gg.length+'…');
      var x=await findForGroup(gg[i]);if(x)out.push(x);
    }
    state.candidates=out;
    showCandidates();
  }catch(e){alert('Sinkronizimi Gmail deshtoi: '+String(e&&e.message||e));}
  finally{state.busy=false;setSyncText('Sinkronizo nga Gmail');}
}
function closeModal(){var x=document.getElementById('pst-rfq-history-modal');if(x)x.remove();}
function showCandidates(){
  closeModal();
  if(!state.candidates.length){alert('Nuk u gjet asnje RFQ i derguar qe perputhet me kete projekt dhe furnitoret e zgjedhur.');return;}
  var rows=state.candidates.map(function(x,i){
    var c=x.contact,m=x.meta;
    return '<label class="rhg-row"><input type="checkbox" data-rhg-pick="'+i+'" checked><div><b>'+E(x.group.company)+'</b><span>'+E(c.contactName||c.email)+' · '+E(c.email)+' · '+E(fmtDate(m.sent_at))+'</span><small>'+E(m.subject||'(pa subjekt)')+'</small></div></label>';
  }).join('');
  document.body.insertAdjacentHTML('beforeend','<div class="rhg-bg" id="pst-rfq-history-modal"><div class="rhg-modal"><header><div><h3>RFQ te gjetura ne Gmail Sent</h3><p>Kontrollo rezultatet. Vetem rreshtat e zgjedhur do te lidhen me projektin.</p></div><button type="button" data-rhg-close>×</button></header><div class="rhg-list">'+rows+'</div><footer><button type="button" data-rhg-close>Mbyll</button><button type="button" class="p" data-rhg-save>Lidh te zgjedhurat</button></footer></div></div>');
}
async function linkEmail(meta){
  var id=pid(),rows=await window.supaFetch('project_emails?gmail_message_id=eq.'+enc(meta.gmail_message_id)+'&select=id,project_id,match_method&limit=1').catch(function(){return[];});
  var old=A(rows)[0],method=String(old&&old.match_method||'').toLowerCase();
  if(old&&old.project_id&&String(old.project_id)!==String(id)&&method.indexOf('manual')===0)throw new Error('Emaili "'+meta.subject+'" eshte lidhur manualisht me nje projekt tjeter.');
  var patch={project_id:id,suggested_project_id:id,match_method:'manual-rfq-history-sync',match_confidence:100,needs_review:false,review_reason:null,updated_at:new Date().toISOString()};
  if(old)await window.supaFetch('project_emails?id=eq.'+enc(old.id),'PATCH',patch);
  else await window.supaFetch('project_emails','POST',[Object.assign({},meta,patch)]);
  try{await window.supaFetch('project_email_links','POST',{project_id:id,gmail_message_id:meta.gmail_message_id,gmail_thread_id:meta.gmail_thread_id,link_method:'manual-rfq-history-sync',confidence:100,created_at:new Date().toISOString()});}catch(e){}
}
async function upsertRfq(x){
  var id=pid(),p=(d()&&d().project)||{},company=x.group.company,c=x.contact,m=x.meta;
  var rows=await window.supaFetch('rfq_log?project_id=eq.'+enc(id)+'&select=*&order=sent_at.desc&limit=500').catch(function(){return[];});
  var existing=A(rows).filter(function(r){return N(r.supplier_name)===N(company)&&String(r.subject||'')===String(m.subject||'');})[0]||
    A(rows).filter(function(r){return N(r.supplier_name)===N(company)&&String(r.status||'').toLowerCase()==='planned';})[0]||null;
  var body={project_id:id,project_name:O(p.name,''),supplier_name:company,supplier_email:String(c.email||'').toLowerCase(),lang:O(c.lang,'en'),subject:O(m.subject,'RFQ'),body:O(m.snippet,''),status:'sent',sent_at:m.sent_at||new Date().toISOString()};
  if(existing)await window.supaFetch('rfq_log?id=eq.'+enc(existing.id),'PATCH',body);
  else await window.supaFetch('rfq_log','POST',body);
}
async function refresh(){
  var id=pid(),r=R();if(!id)return;
  if(window.PSTProjectDataIntegrity&&typeof window.PSTProjectDataIntegrity.load==='function')window.__pstIntegrityLastData=await window.PSTProjectDataIntegrity.load(id);
  if(window.PSTProjectFirstV2&&typeof window.PSTProjectFirstV2.render==='function')window.PSTProjectFirstV2.render('procurement');
  if(r&&typeof r.load==='function'){await r.load(id);if(typeof r.render==='function')r.render();}
  var F=window.PSTBomRfqAutoflowV1;if(F&&typeof F.installHistoryButton==='function')F.installHistoryButton();
}
async function saveSelected(){
  if(state.busy)return;
  var picks=Array.prototype.slice.call(document.querySelectorAll('[data-rhg-pick]:checked')).map(function(x){return Number(x.getAttribute('data-rhg-pick'));});
  var sel=picks.map(function(i){return state.candidates[i];}).filter(Boolean);
  if(!sel.length){alert('Zgjidh te pakten nje RFQ.');return;}
  state.busy=true;
  var b=document.querySelector('[data-rhg-save]');if(b){b.disabled=true;b.textContent='Duke lidhur…';}
  try{
    for(var i=0;i<sel.length;i++){await linkEmail(sel[i].meta);await upsertRfq(sel[i]);}
    closeModal();await refresh();
    if(typeof window.toast==='function')window.toast(sel.length+' RFQ u lidhen me projektin.');
    else alert(sel.length+' RFQ u lidhen me projektin.');
  }catch(e){
    alert('RFQ nuk u lidh: '+String(e&&e.message||e));
    if(b){b.disabled=false;b.textContent='Lidh te zgjedhurat';}
  }finally{state.busy=false;setSyncText('Sinkronizo nga Gmail');}
}
function css(){
  if(document.getElementById('rhg-native-css'))return;
  var s=document.createElement('style');s.id='rhg-native-css';
  s.textContent='.rhg-bg{position:fixed;inset:0;z-index:2147483000;background:rgba(28,44,52,.5);display:flex;align-items:center;justify-content:center;padding:18px}.rhg-modal{width:min(820px,96vw);max-height:90vh;background:#fff;border-radius:15px;box-shadow:0 28px 90px rgba(22,43,52,.26);overflow:hidden;display:flex;flex-direction:column}.rhg-modal header{padding:14px 16px;border-bottom:1px solid #e1e9ec;display:flex;justify-content:space-between}.rhg-modal h3{margin:0;font-size:15px}.rhg-modal p{margin:4px 0 0;font-size:9px;color:#7d898f}.rhg-modal header button{border:0;background:none;font-size:22px}.rhg-list{overflow:auto}.rhg-row{display:grid;grid-template-columns:24px minmax(0,1fr);gap:9px;align-items:center;padding:11px 14px;border-bottom:1px solid #eef2f3}.rhg-row b{display:block;font-size:9.5px}.rhg-row span,.rhg-row small{display:block;font-size:8px;color:#849197;margin-top:2px}.rhg-modal footer{padding:12px 15px;border-top:1px solid #e1e9ec;display:flex;justify-content:flex-end;gap:7px}.rhg-modal footer button{height:32px;border:1px solid #d5e2e6;border-radius:8px;background:#fff;color:#456e80;padding:0 10px;font-size:8.5px;font-weight:750;cursor:pointer}.rhg-modal footer button.p{background:#5b9bb3;border-color:#5b9bb3;color:#fff}';
  document.head.appendChild(s);
}
document.addEventListener('click',function(e){
  if(e.target&&e.target.closest&&e.target.closest('[data-rhg-close]')){e.preventDefault();closeModal();return;}
  if(e.target&&e.target.closest&&e.target.closest('[data-rhg-save]')){e.preventDefault();saveSelected();}
},true);
css();
window.PSTRfqGmailHistorySyncV2={scan:scan,refresh:refresh,_state:state};
})();