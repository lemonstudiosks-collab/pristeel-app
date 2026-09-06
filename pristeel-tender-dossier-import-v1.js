/* PRISTEEL Tender Dossier Import v1
 * Purpose-limited companion to the canonical tender dossier analyzer.
 * Imports official KRPP files that the authenticated user downloaded manually,
 * persists them in PPPP, reconciles dossier completeness, and re-runs the existing analysis.
 * No external communication or protected commercial actions.
 */
(function(){
'use strict';
if(window.__pstTenderDossierImportV1&&window.PSTTenderDossierImportV1)return;
window.__pstTenderDossierImportV1=true;
var busy={},reconcileBusy={},canonicalAnalyze=null,canonicalOwner=null;
function S(v){return String(v==null?'':v);}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
async function edge(payload){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 async function run(t){return fetch(base+'/functions/v1/pppp-tender-dossier-import',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
 var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}if(!res.ok||!data||data.ok===false)throw new Error(S(data&&(data.message||data.error)||('HTTP '+res.status)).slice(0,700));return data;
}
function fileBase64(file){return new Promise(function(resolve,reject){try{var r=new FileReader();r.onerror=function(){reject(new Error('Skedari nuk u lexua.'));};r.onload=function(){var v=S(r.result),i=v.indexOf(',');resolve(i>-1?v.slice(i+1):v);};r.readAsDataURL(file);}catch(e){reject(e);}});}
async function refreshCanonical(id){try{if(!canonicalAnalyze)apply();if(typeof canonicalAnalyze!=='function'||!canonicalOwner)return false;return await canonicalAnalyze.call(canonicalOwner,S(id),false);}catch(e){console.warn('PPPP tender import canonical refresh:',e);return false;}}
async function uploadProtected(id,name,file,btn){id=S(id);name=S(name);if(!id||!name||!file)return false;var k=id+'|'+name;if(busy[k])return false;busy[k]=true;var old=btn&&btn.textContent;try{
 if(Number(file.size||0)>10*1024*1024)throw new Error('Dokumenti është më i madh se 10 MB.');
 if(btn){btn.disabled=true;btn.textContent='Duke ngarkuar…';}
 var b64=await fileBase64(file),out=await edge({tender_id:id,mode:'upload',expected_name:name,file:{name:file.name,type:file.type,size:file.size,base64:b64}});
 if(typeof window.pstToast==='function')window.pstToast(out.dossier_complete?'Dosja u kompletua. PPPP po rifreskon analizën.':'Dokumenti u ngarkua. Mungojnë edhe '+Number((out.remaining_protected_documents||[]).length||0)+' dokument(e).',out.dossier_complete?'ok':'info');
 await refreshCanonical(id);try{document.dispatchEvent(new CustomEvent('pst:tender-dossier-imported',{detail:out}));}catch(e){}return true;
 }catch(e){alert(e&&e.message||e);return false;}finally{delete busy[k];if(btn&&document.contains(btn)){btn.disabled=false;if(old)btn.textContent=old;}}
}
function pickAndUpload(id,name,btn){try{var input=document.createElement('input');input.type='file';input.accept='.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf';input.style.display='none';input.addEventListener('change',function(){var f=input.files&&input.files[0];input.remove();if(f)uploadProtected(id,name,f,btn);},{once:true});document.body.appendChild(input);input.click();return true;}catch(e){alert(e&&e.message||e);return false;}}
async function reconcile(id){id=S(id);if(!id||reconcileBusy[id])return false;reconcileBusy[id]=true;try{var out=await edge({tender_id:id,mode:'reconcile'});if(out&&out.changed&&Number(out.matched_count||0)>0){await refreshCanonical(id);return true;}return false;}catch(e){console.warn('PPPP tender dossier import reconcile:',e);return false;}finally{delete reconcileBusy[id];}}
function apply(){try{var D=window.PSTTenderDossierAnalysisV1;if(!D||typeof D.analyze!=='function')return false;if(D.__pstProtectedImportWrapped){if(!canonicalAnalyze&&D.__pstProtectedImportBaseAnalyze){canonicalAnalyze=D.__pstProtectedImportBaseAnalyze;canonicalOwner=D;}return true;}canonicalAnalyze=D.analyze;canonicalOwner=D;D.__pstProtectedImportBaseAnalyze=canonicalAnalyze;D.analyze=function(id,force){var ctx=this,args=arguments;return Promise.resolve(canonicalAnalyze.apply(ctx,args)).then(function(ok){if(!ok)return ok;var panel=document.getElementById('pst-tda-analysis'),namedProtected=panel&&panel.querySelector('.pst-tda-partial li');if(panel&&panel.getAttribute('data-dossier-complete')==='0'&&namedProtected)setTimeout(function(){reconcile(id);},0);return ok;});};D.__pstProtectedImportWrapped=true;return true;}catch(e){console.warn('PPPP tender dossier import apply:',e);return false;}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else setTimeout(apply,0);
window.PSTTenderDossierImportV1={version:'1',apply:apply,pickAndUpload:pickAndUpload,uploadProtected:uploadProtected,reconcile:reconcile,_test:{edge:edge,fileBase64:fileBase64}};
})();
