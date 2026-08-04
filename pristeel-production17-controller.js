/* PRISTEEL production17 deterministic controller
 * One owner for project opening, no MutationObserver, bounded retries.
 */
(function(){
'use strict';
if(window.__pstProduction17ControllerLoaded)return;
window.__pstProduction17ControllerLoaded=true;
var openSeq=0,wrapped=false;

function currentId(){return String(window.__pstCurrentProjectId||window._curProjId||'');}
function hideNode(node){
 if(!node||node===document.body)return;
 var wrap=node.closest('.global-project-selector,.top-project-selector,.project-selector,.project-switcher,.proj-switch,.top-proj');
 if(!wrap)wrap=node.parentElement;
 if(wrap&&wrap!==document.body&&wrap.children.length<=4)wrap.style.setProperty('display','none','important');else node.style.setProperty('display','none','important');
}
function hideDeadProjectSelector(){
 var direct=document.getElementById('global-proj');if(direct)hideNode(direct);
 document.querySelectorAll('.topbar select[id*="proj"],.topbar select[name*="proj"],.topbar [id*="project-switch"],.topbar [id*="proj-switch"],.topbar [class*="project-switch"],.topbar [class*="proj-switch"]').forEach(hideNode);
}
function host(){return document.getElementById('pst-ws-project-tab');}
function showError(msg){
 var h=host();if(!h)return;
 var old=document.getElementById('pst-production17-project-error');if(old)old.remove();
 var e=document.createElement('div');e.id='pst-production17-project-error';
 e.style.cssText='margin:0 0 14px;padding:13px 15px;border:1px solid #E4B9B4;border-radius:12px;background:#FFF7F6;color:#873D35;font-size:11px;line-height:1.55';
 e.innerHTML='<b>Dosja e projektit nuk u ngarkua plotësisht.</b><br>'+String(msg||'Gabim i panjohur').replace(/</g,'&lt;')+'<br><button type="button" style="margin-top:9px;height:30px;border:1px solid #D7B0AB;border-radius:8px;background:#fff;color:#873D35;padding:0 10px;font-weight:700;cursor:pointer" onclick="pstProduction17ReloadProject()">Provo përsëri</button>';
 h.insertBefore(e,h.firstChild);
}
function dossierLooksReady(){
 var h=host();if(!h)return false;
 return !!(h.querySelector('.pfw-card,.pfw-lost-banner,.pfw-family')||String(h.textContent||'').indexOf('Dokumentet komerciale')>-1);
}
function runDossier(id,seq){
 hideDeadProjectSelector();
 var tries=0,t=setInterval(function(){
  if(seq!==openSeq){clearInterval(t);return;}
  tries++;
  try{
   if(typeof window.pstProjectFamilyRefresh==='function')window.pstProjectFamilyRefresh();
   if(typeof window.pstProjectGmailDocumentsRefresh==='function')window.pstProjectGmailDocumentsRefresh(id);
  }catch(e){console.error('PRISTEEL project dossier:',e);}
  if(dossierLooksReady()||tries>=8){
   clearInterval(t);
   if(!dossierLooksReady())showError('Moduli i dosjes 360° nuk mori kontrollin e faqes. Kontrolli i sistemit e ka regjistruar këtë problem.');
  }
 },650);
}
function install(){
 hideDeadProjectSelector();
 if(wrapped)return true;
 var base=window.pstReleaseOpenProject;
 if(typeof base!=='function')return false;
 window.pstReleaseOpenProject=function(id){
  var seq=++openSeq;
  var result;
  try{result=base.apply(this,arguments);}catch(e){showError(e.message||String(e));throw e;}
  Promise.resolve(result).catch(function(e){showError(e.message||String(e));}).finally(function(){setTimeout(function(){runDossier(String(id),seq);},120);});
  return result;
 };
 window.pstReleaseOpenProject.__pstProduction17=true;
 wrapped=true;
 return true;
}
window.pstProduction17ReloadProject=function(){var id=currentId();if(!id)return;var seq=++openSeq;try{if(typeof window.pstOpenProjectWorkspace==='function')Promise.resolve(window.pstOpenProjectWorkspace(id)).finally(function(){runDossier(id,seq);});else runDossier(id,seq);}catch(e){showError(e.message||String(e));}};

var n=0,t=setInterval(function(){n++;install();hideDeadProjectSelector();if(wrapped||n>=80)clearInterval(t);},100);
setTimeout(function(){
 hideDeadProjectSelector();
 var id=currentId(),p=document.getElementById('page-workspace-project');
 if(id&&p&&p.classList.contains('active'))runDossier(id,++openSeq);
},1200);
})();