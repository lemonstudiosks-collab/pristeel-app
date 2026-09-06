/* PRISTEEL Tender Dossier Import v1
 * Purpose-limited companion to the canonical tender dossier analyzer.
 * Uploads protected KRPP files into the existing protected_archive store and lets
 * pppp-tender-protected-archive-analysis perform the final dossier analysis.
 * No parallel analysis engine and no protected commercial actions.
 */
(function(){
'use strict';
if(window.__pstTenderDossierImportV1&&window.PSTTenderDossierImportV1)return;
window.__pstTenderDossierImportV1=true;
var busy={},canonicalAnalyze=null,canonicalOwner=null,decisionBound=false;
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
async function edge(payload){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 async function run(t){return fetch(base+'/functions/v1/pppp-tender-dossier-import',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
 var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}if(!res.ok||!data||data.ok===false)throw new Error(S(data&&(data.message||data.error)||('HTTP '+res.status)).slice(0,900));return data;
}
function fileBase64(file){return new Promise(function(resolve,reject){try{var r=new FileReader();r.onerror=function(){reject(new Error('Skedari nuk u lexua.'));};r.onload=function(){var v=S(r.result),i=v.indexOf(',');resolve(i>-1?v.slice(i+1):v);};r.readAsDataURL(file);}catch(e){reject(e);}});}
function ensureCanonical(){try{var D=window.PSTTenderDossierAnalysisV1;if(D&&typeof D.analyze==='function'){canonicalAnalyze=D.analyze;canonicalOwner=D;return true;}}catch(e){}return false;}
async function refreshCanonical(id){try{if(!canonicalAnalyze&&!ensureCanonical())return false;return await canonicalAnalyze.call(canonicalOwner,S(id),false);}catch(e){console.warn('PPPP tender import canonical refresh:',e);return false;}}
function installDecisionStyle(){if(document.getElementById('pst-tender-final-decision-css'))return;var s=document.createElement('style');s.id='pst-tender-final-decision-css';s.textContent='.pst-tender-final-decision{margin:14px 0;padding:15px 16px;border:1px solid #cbdde3;border-left:4px solid #397f98;border-radius:12px;background:#f7fbfc}.pst-tender-final-decision.leave{border-color:#ead1d1;border-left-color:#a65b5b;background:#fff8f8}.pst-tender-final-decision>span{display:block;font-size:10px;font-weight:900;letter-spacing:.08em;color:#6b8089}.pst-tender-final-decision>b{display:block;margin-top:4px;font-size:18px;color:#2f7188}.pst-tender-final-decision.leave>b{color:#934b4b}.pst-tender-final-decision ul{margin:8px 0 0;padding-left:19px}.pst-tender-final-decision li{font-size:12px;line-height:1.5;color:#50666f;margin:3px 0}';document.head.appendChild(s);}
function renderDecision(detail){try{detail=detail||{};if(detail.dossier_complete!==true)return false;var x=detail.analysis||{},rec=S(x.recommendation).toUpperCase();if(rec!=='VAZHDO'&&rec!=='LËRE')return false;var reasons=Array.isArray(x.decision_reasons)?x.decision_reasons.filter(Boolean).slice(0,6):[];if(!reasons.length&&x.capability_fit&&x.capability_fit.reason)reasons=[x.capability_fit.reason];var panel=document.getElementById('pst-tda-analysis');if(!panel)return false;installDecisionStyle();var old=panel.querySelector('.pst-tender-final-decision');if(old)old.remove();var box=document.createElement('div');box.className='pst-tender-final-decision'+(rec==='LËRE'?' leave':'');box.innerHTML='<span>REKOMANDIMI PËRFUNDIMTAR</span><b>'+E(rec)+'</b>'+(reasons.length?'<ul>'+reasons.map(function(r){return'<li>'+E(r)+'</li>';}).join('')+'</ul>':'');var summary=panel.querySelector('.pst-tda-summary');if(summary)summary.insertAdjacentElement('afterend',box);else panel.appendChild(box);return true;}catch(e){return false;}}
function bindDecision(){if(decisionBound)return;decisionBound=true;document.addEventListener('pst:tender-dossier-ready',function(ev){renderDecision(ev&&ev.detail||{});});}
function announcePartial(id,out){try{var panel=document.getElementById('pst-tda-analysis');if(panel){panel.setAttribute('data-tender-id',S(id));panel.setAttribute('data-dossier-complete','0');}document.dispatchEvent(new CustomEvent('pst:tender-dossier-ready',{detail:{tender_id:S(id),dossier_complete:false,protected_documents:Array.isArray(out&&out.remaining_protected_documents)?out.remaining_protected_documents:[],analysis:null,documents:0,cached:false}}));}catch(e){}}
async function uploadProtected(id,name,file,btn){id=S(id);name=S(name);if(!id||!name||!file)return false;var k=id+'|'+name;if(busy[k])return false;busy[k]=true;var old=btn&&btn.textContent;try{
 if(Number(file.size||0)>30*1024*1024)throw new Error('Dokumenti është më i madh se 30 MB.');
 if(btn){btn.disabled=true;btn.textContent='Duke ngarkuar…';}
 var b64=await fileBase64(file),out=await edge({tender_id:id,mode:'upload',expected_name:name,file:{name:file.name,type:file.type,size:file.size,base64:b64}});
 if(out.dossier_complete){if(typeof window.pstToast==='function')window.pstToast('Dosja u kompletua. PPPP po rifreskon analizën përfundimtare.','ok');await refreshCanonical(id);}else{if(typeof window.pstToast==='function')window.pstToast('Dokumenti u ngarkua. Mungojnë edhe '+Number((out.remaining_protected_documents||[]).length||0)+' dokument(e).','info');announcePartial(id,out);}
 try{document.dispatchEvent(new CustomEvent('pst:tender-dossier-imported',{detail:out}));}catch(e){}return true;
 }catch(e){alert(e&&e.message||e);return false;}finally{delete busy[k];if(btn&&document.contains(btn)){btn.disabled=false;if(old)btn.textContent=old;}}
}
function pickAndUpload(id,name,btn){try{var input=document.createElement('input');input.type='file';input.accept='.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf';input.style.display='none';input.addEventListener('change',function(){var f=input.files&&input.files[0];input.remove();if(f)uploadProtected(id,name,f,btn);},{once:true});document.body.appendChild(input);input.click();return true;}catch(e){alert(e&&e.message||e);return false;}}
async function finalize(id){id=S(id);if(!id)return false;try{var out=await edge({tender_id:id,mode:'finalize'});if(out&&out.dossier_complete){await refreshCanonical(id);return true;}return false;}catch(e){alert(e&&e.message||e);return false;}}
function apply(){ensureCanonical();bindDecision();return true;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else setTimeout(apply,0);
window.PSTTenderDossierImportV1={version:'1',apply:apply,pickAndUpload:pickAndUpload,uploadProtected:uploadProtected,finalize:finalize,renderDecision:renderDecision,_test:{edge:edge,fileBase64:fileBase64,announcePartial:announcePartial}};
})();