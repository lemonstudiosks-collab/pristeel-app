/* PRISTEEL project integrity safety patch
 * Prevents relation rewrites from the new workspace. Existing multi-project email links remain untouched.
 * Also coalesces duplicate project integrity reads so layered workspace owners cannot immediately reload
 * the same project after a successful canonical open.
 */
(function(){
'use strict';
if(window.__pstProjectIntegritySafetyV2)return;
window.__pstProjectIntegritySafetyV2=true;

function current(){var d=window.__pstIntegrityLastData;return d&&d.project?d:null;}
function toast(text,bad){var old=document.getElementById('pst-pis-toast');if(old)old.remove();var e=document.createElement('div');e.id='pst-pis-toast';e.textContent=text;e.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:7000;padding:10px 14px;border-radius:10px;background:'+(bad?'#A64B42':'#263036')+';color:#fff;font:650 10px Inter,sans-serif;box-shadow:0 10px 30px rgba(20,32,38,.24)';document.body.appendChild(e);setTimeout(function(){if(e.parentNode)e.remove();},4500);}

function installLoadDeduper(){
  var I=window.PSTProjectDataIntegrity;
  if(!I||typeof I.load!=='function'||I.load.__pstIntegrityDedupe)return false;
  var base=I.load,activeId='',activePromise=null,recentId='',recentAt=0,recentData=null;
  var reuseMs=Number(window.__pstProjectIntegrityReuseMs||2600);
  if(!isFinite(reuseMs)||reuseMs<250)reuseMs=2600;
  function wrapped(id){
    id=String(id||'');
    if(id&&activePromise&&activeId===id)return activePromise;
    if(id&&recentData&&recentId===id&&Date.now()-recentAt<reuseMs)return Promise.resolve(recentData);
    var p;
    try{p=Promise.resolve(base.apply(this,arguments));}catch(e){return Promise.reject(e);}
    activeId=id;activePromise=p.then(function(data){
      if(data){recentId=id;recentAt=Date.now();recentData=data;}
      return data;
    });
    var mine=activePromise;
    mine.then(function(){if(activePromise===mine){activePromise=null;activeId='';}},function(){if(activePromise===mine){activePromise=null;activeId='';}});
    return mine;
  }
  wrapped.__pstIntegrityDedupe=true;
  wrapped.__base=base;
  I.load=wrapped;
  window.PSTProjectIntegritySafetyV2.loadDeduperInstalled=true;
  return true;
}

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

window.PSTProjectIntegritySafetyV2={installLoadDeduper:installLoadDeduper,loadDeduperInstalled:false};
installLoadDeduper();
document.addEventListener('pst:modules-ready',installLoadDeduper,{once:true});
})();
