/* PRISTEEL client-offer finalize v1
 * Explicit human gate: final pricing approval -> canonical QUO -> browser-rendered PDF -> Gmail draft.
 * Never sends email automatically and never invents markup/final pricing.
 */
(function(){
'use strict';
if(window.__pstClientOfferFinalizeV1)return;
window.__pstClientOfferFinalizeV1=true;
var busy=false;
function E(id){return document.getElementById(id);}
function S(v){return String(v==null?'':v).trim();}
function A(v){return Array.isArray(v)?v:[];}
function projectId(){var g=E('global-proj');return S(g&&g.value||window._curProjId||window.__pstCurrentProjectId);}
function val(id){return S((E(id)||{}).value);}
function toast(msg,type){if(typeof window.pstToast==='function')window.pstToast(msg,type||'ok');else alert(msg);}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
async function edge(payload){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 async function run(t){return fetch(base+'/functions/v1/pppp-client-offer-draft-generator',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
 var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}if(!res.ok||!data||data.ok===false)throw new Error(S(data&&(data.error||data.message)||('HTTP '+res.status)));return data;
}
function collect(){
 if(typeof window.PSTOfferFinalOutputFixV1==='object'&&typeof window.PSTOfferFinalOutputFixV1.ensureCommercialPositions==='function')window.PSTOfferFinalOutputFixV1.ensureCommercialPositions();
 var state=typeof window.collectOfferFormState==='function'?(window.collectOfferFormState()||{}):{};
 var positions=A(window.oferPos).map(function(p){return Object.assign({},p);});
 var currency=S(state.currency||val('of-currency')||'EUR').toUpperCase();
 var fx=S(state.exchange_rate_to_eur||val('of-exchange-rate')||(currency==='EUR'?'1':''));
 var email=S(state.em||val('of-em')||val('of-email'));
 var client=S(state.cli||val('of-cli'));
 var contact=S(state.con||val('of-con'));
 var lang=S(state.lang||val('of-lang')||'en').toLowerCase();
 var payment=[];try{if(typeof window.buildPayPlan==='function')payment=window.buildPayPlan()||[];}catch(e){}
 return{form_state:state,positions:positions,currency:currency,exchange_rate_to_eur:fx,recipient_email:email,client:client,contact:contact,language:lang,payment_plan:payment};
}
function base64(blob){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){var s=String(r.result||''),i=s.indexOf(',');resolve(i>=0?s.slice(i+1):s);};r.onerror=function(){reject(r.error||new Error('PDF nuk u lexua.'));};r.readAsDataURL(blob);});}
async function pdfBlob(){
 if(typeof window.genOfer!=='function')throw new Error('Gjeneratori i ofertës nuk është gati.');
 if(typeof window.html2pdf!=='function')throw new Error('Gjeneratori PDF nuk është gati.');
 window.genOfer();await new Promise(function(r){setTimeout(r,80);});
 var pre=E('of-pre');if(!pre)throw new Error('Preview i ofertës nuk u gjet.');
 var worker=window.html2pdf().set({margin:[7,7,7,7],html2canvas:{scale:2,useCORS:true,logging:false},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(pre);
 var blob=await worker.outputPdf('blob');if(!blob||blob.size<500)throw new Error('PDF-ja nuk u gjenerua siç duhet.');return blob;
}
async function approve(){
 if(busy)return;var id=projectId();if(!id){toast('Zgjidh projektin aktiv.','warn');return;}
 var payload=collect();if(!payload.positions.length){toast('Oferta nuk ka pozicione për t’u aprovuar.','warn');return;}
 if(!payload.recipient_email){toast('Emaili i klientit mungon.','warn');return;}
 if(!confirm('Konfirmon se çmimet e klientit, pozicionet dhe kushtet në këtë ofertë janë kontrolluar nga ti? PPPP do të krijojë vetëm QUO + PDF + Gmail draft; emaili nuk dërgohet automatikisht.'))return;
 if(typeof window.supaFetch!=='function'){toast('Databaza nuk është gati.','warn');return;}
 busy=true;var b=E('pst-finalize-client-offer'),old=b&&b.textContent;if(b){b.disabled=true;b.textContent='Duke përgatitur…';}
 try{
   var out=await window.supaFetch('rpc/pppp_approve_client_offer_pricing_v1','POST',{p_project_id:id,p_payload:payload});out=Array.isArray(out)?out[0]:out;if(!out||out.ok===false||!out.document_id)throw new Error(S(out&&out.error||'Aprovimi final nuk u ruajt.'));
   if(b)b.textContent='Duke gjeneruar PDF…';var blob=await pdfBlob(),pdf64=await base64(blob);
   if(b)b.textContent='Duke krijuar Gmail draft…';var draft=await edge({document_id:out.document_id,pdf_base64:pdf64,filename:S(out.doc_nr||'PriSteel-Quotation')+'.pdf'});
   toast('Oferta '+S(out.doc_nr)+' është gati si PDF + Gmail draft. Kontrolloje dhe dërgoje vetë nga Gmail.','ok');
   if(typeof window.loadTasks==='function')Promise.resolve(window.loadTasks()).catch(function(){});
   try{document.dispatchEvent(new CustomEvent('pst:client-offer-draft-ready',{detail:{document_id:out.document_id,doc_nr:out.doc_nr,gmail_draft_id:draft.gmail_draft_id,human_send_required:true}}));}catch(e){}
 }catch(err){console.error('PPPP client offer finalize:',err);toast('Nuk u përgatit oferta finale: '+S(err&&err.message||err),'warn');}
 finally{busy=false;if(b){b.disabled=false;b.textContent=old||'Aprovo çmimin & përgatit draftin';}}
}
function install(){
 if(E('pst-finalize-client-offer'))return true;
 var save=Array.from(document.querySelectorAll('button')).find(function(x){return /saveOfferState\s*\(/.test(S(x.getAttribute('onclick')));});if(!save)return false;
 var b=document.createElement('button');b.type='button';b.id='pst-finalize-client-offer';b.className=save.className||'btn btn-primary';b.textContent='Aprovo çmimin & përgatit draftin';b.title='Human gate: krijon QUO + PDF + Gmail draft. Nuk dërgon email.';b.addEventListener('click',approve);save.insertAdjacentElement('afterend',b);return true;
}
[120,350,750,1400].forEach(function(ms){setTimeout(install,ms);});
document.addEventListener('pst:modules-ready',install);
document.addEventListener('click',function(){if(!E('pst-finalize-client-offer'))setTimeout(install,0);},true);
window.PSTClientOfferFinalizeV1={install:install,approve:approve,collect:collect};
})();
