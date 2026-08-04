/* PRISTEEL project integrity safety patch
 * Prevents relation rewrites from the new workspace. Existing multi-project email links remain untouched.
 */
(function(){
'use strict';
if(window.__pstProjectIntegritySafetyV2)return;
window.__pstProjectIntegritySafetyV2=true;

function current(){var d=window.__pstIntegrityLastData;return d&&d.project?d:null;}
function toast(text,bad){var old=document.getElementById('pst-pis-toast');if(old)old.remove();var e=document.createElement('div');e.id='pst-pis-toast';e.textContent=text;e.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:7000;padding:10px 14px;border-radius:10px;background:'+(bad?'#A64B42':'#263036')+';color:#fff;font:650 10px Inter,sans-serif;box-shadow:0 10px 30px rgba(20,32,38,.24)';document.body.appendChild(e);setTimeout(function(){if(e.parentNode)e.remove();},4500);}

window.pstPiRepair=async function(){
  var d=current();if(!d)return;
  try{
    if(typeof window.pstSyncProjectContacts==='function')await window.pstSyncProjectContacts(d.project.id);
    toast('Kontaktet u sinkronizuan. Lidhjet e emailave nuk u ndryshuan.');
    if(typeof window.pstPiRefresh==='function')window.pstPiRefresh();
  }catch(e){toast('Sinkronizimi dështoi: '+(e.message||e),true);}
};
window.pstPiImport=function(){
  var d=current();if(!d)return;
  if(typeof window.pstImportProjectEmailFiles==='function')return window.pstImportProjectEmailFiles(d.project.id);
  toast('Importuesi Gmail/Drive nuk është gati.',true);
};
})();
