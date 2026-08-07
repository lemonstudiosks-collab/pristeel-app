/* PRISTEEL RFQ Stability v2
 * Prevents accidental duplicate RFQ logs / placeholder offers on repeated clicks.
 * Keeps writes explicit and never retries a POST automatically.
 */
(function(){
'use strict';
if(window.__pstRfqStabilityV2)return;
window.__pstRfqStabilityV2=true;

function enc(v){return encodeURIComponent(String(v==null?'':v));}
function arr(v){return Array.isArray(v)?v:[];}
function safeRead(path){
  if(typeof window.supaFetch!=='function')return Promise.resolve([]);
  return Promise.resolve(window.supaFetch(path)).then(arr).catch(function(){return[];});
}
function projectName(){var e=document.getElementById('i-projname');return String(e&&e.value||'');}
function projectId(){return String(window._curProjId||window.__pstCurrentProjectId||'');}
function decode(v){try{return decodeURIComponent(v||'');}catch(e){return String(v||'');}}
function bodyDecode(v){try{return decodeURIComponent(escape(atob(v||'')));}catch(e){return'';}}
function recentEnough(v){var t=v?new Date(v).getTime():0;return !!t&&(Date.now()-t)<120000;}

async function ensurePlaceholder(pid,supplier){
  if(!pid||!supplier)return;
  var rows=await safeRead('offers?project_id=eq.'+enc(pid)+'&supplier=eq.'+enc(supplier)+'&select=id,price_kg,total_eur,notes,created_at&order=created_at.desc&limit=10');
  var exists=rows.some(function(r){return Number(r.price_kg||0)===0&&Number(r.total_eur||0)===0&&/RFQ dërguar|RFQ derguar/i.test(String(r.notes||''));});
  if(exists)return;
  await window.supaFetch('offers','POST',{project_id:pid,supplier:supplier,price_kg:0,total_eur:0,qty_kg:0,zinc_kg:0,transport_eur:0,vat_pct:0,notes:'RFQ dërguar '+new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})+' — pritet çmimi.'});
}

window.logRfqSent=async function(nameEnc,emailEnc,lang,subjEnc,bodyEnc){
  if(typeof window.supaFetch!=='function')return;
  var supplier=decode(nameEnc),email=decode(emailEnc),subject=decode(subjEnc),body=bodyDecode(bodyEnc),pid=projectId(),proj=projectName();
  try{
    var recent=await safeRead('rfq_log?supplier_email=eq.'+enc(email)+'&subject=eq.'+enc(subject)+'&select=id,sent_at,project_id,supplier_email,subject&order=sent_at.desc&limit=5');
    var duplicate=recent.some(function(r){return String(r.project_id||'')===String(pid||'')&&recentEnough(r.sent_at);});
    if(!duplicate){
      await window.supaFetch('rfq_log','POST',{project_id:pid||null,project_name:proj,supplier_name:supplier,supplier_email:email,lang:lang||'en',subject:subject,body:body,sent_at:new Date().toISOString(),status:'sent'});
    }
    await ensurePlaceholder(pid,supplier);
    if(typeof window.loadCockpit==='function')window.loadCockpit();
  }catch(error){
    if(window.console&&console.error)console.error('PRISTEEL RFQ registration:',error);
    if(typeof window.toast==='function')window.toast('RFQ u hap në Gmail, por regjistrimi në platformë dështoi.',true);
  }
};

window.PSTRfqStabilityV2={recentEnough:recentEnough,ensurePlaceholder:ensurePlaceholder};
})();
