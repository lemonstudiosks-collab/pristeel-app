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
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null}catch(e){return null}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow()}catch(e){return sessionNow()}}
async function supplierGate(pid,supplier,email){
  var base=String(window._SB_URL||'').replace(/\/$/,''),key=String(window._SB_KEY||'');if(!base||!key)throw new Error('Supabase runtime nuk eshte gati.');
  var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
  var p={p_project_id:pid||null,p_tender_watch_id:null,p_supplier_name:supplier||'',p_supplier_email:email||'',p_rfq_mode:'firm'};
  async function run(t){return fetch(base+'/rest/v1/rpc/pppp_supplier_rfq_gate_v2',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(p)})}
  var r=await run(token);if(r.status===401){s=await refreshSession();if(s&&s.access_token)r=await run(s.access_token)}
  var raw=await r.text(),x=null;try{x=raw?JSON.parse(raw):null}catch(e){}
  if(!r.ok)throw new Error('Supplier Gate HTTP '+r.status+': '+raw.slice(0,400));
  return x||{allowed:false,reason:'empty_supplier_gate'};
}

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
    var gate=await supplierGate(pid,supplier,email);
    if(!gate||gate.allowed!==true){
      if(typeof window.toast==='function')window.toast('Supplier Gate bllokoi RFQ: '+String(gate&&gate.reason||'nuk lejohet'),true);
      else alert('Supplier Gate bllokoi RFQ: '+String(gate&&gate.reason||'nuk lejohet'));
      return false;
    }
    var recent=await safeRead('rfq_log?project_id=eq.'+enc(pid)+'&supplier_email=eq.'+enc(email)+'&subject=eq.'+enc(subject)+'&status=in.(planned,draft,draft_review,sent)&select=id,status,created_at,sent_at&order=created_at.desc&limit=5');
    if(!recent.length){
      await window.supaFetch('rfq_log','POST',{project_id:pid||null,project_name:proj,supplier_name:supplier,supplier_email:email,lang:lang||'en',subject:subject,body:body,status:'planned',rfq_mode:'firm',supplier_relationship_state:gate.relationship_state||null,supplier_gate_snapshot:gate,human_send_required:true});
    }
    if(typeof window.loadCockpit==='function')window.loadCockpit();
    return true;
  }catch(error){
    if(window.console&&console.error)console.error('PRISTEEL RFQ planning:',error);
    if(typeof window.toast==='function')window.toast('RFQ drafti nuk u regjistrua: '+String(error&&error.message||error),true);
    return false;
  }
};

window.PSTRfqStabilityV2={version:'20260925-commercial-engine-v3',recentEnough:recentEnough,ensurePlaceholder:ensurePlaceholder,supplierGate:supplierGate};
})();
