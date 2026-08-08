/* PRISTEEL project Drive lifecycle v1
 * Project creation owns folder creation. Project Workspace never does.
 * Bounded hooks only; no global polling and no automatic OAuth popup on page load.
 */
(function(){
'use strict';
if(window.__pstProjectDriveLifecycleV1)return;window.__pstProjectDriveLifecycleV1=true;
var attempted={},gmailPending=null;
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function drive(){return window.PSTDriveImport&&typeof window.PSTDriveImport.ensureProjectFolderById==='function'?window.PSTDriveImport:null;}
async function project(id){if(!id||typeof window.supaFetch!=='function')return null;try{var r=await window.supaFetch('projects?id=eq.'+enc(id)+'&select=id,name,client,ref,drive_folder_id,drive_folder_url&limit=1');return r&&r[0]||null;}catch(e){return null;}}
async function ensure(id){id=String(id||'');if(!id||attempted[id])return false;var p=await project(id);if(!p||p.drive_folder_id)return !!(p&&p.drive_folder_id);var D=drive();if(!D)return false;attempted[id]=1;try{await D.ensureProjectFolderById(id);return true;}catch(e){delete attempted[id];if(window.console&&console.debug)console.debug('PRISTEEL Drive lifecycle: folder creation deferred:',e&&e.message);return false;}}
function wrapLegacySave(){var base=window.saveProject;if(typeof base!=='function'||base.__pstDriveLifecycle)return false;function wrapped(){var before=String(window._curProjId||'');var out=base.apply(this,arguments);[350,900,1800].forEach(function(ms){setTimeout(function(){var after=String(window._curProjId||'');if(after&&after!==before)ensure(after);},ms);});return out;}wrapped.__pstDriveLifecycle=true;wrapped.__base=base;window.saveProject=wrapped;return true;}
function rememberGmailCreate(){var n=document.getElementById('pgi2-name'),c=document.getElementById('pgi2-client'),r=document.getElementById('pgi2-ref');gmailPending={name:String(n&&n.value||'').trim(),client:String(c&&c.value||'').trim(),ref:String(r&&r.value||'').trim(),hasFiles:!!document.querySelector('.pgi2-file:checked'),at:Date.now()};return gmailPending;}
async function findGmailCreated(){var q=gmailPending;if(!q||q.hasFiles||!q.name||Date.now()-q.at>15000||typeof window.supaFetch!=='function')return false;try{var rows=await window.supaFetch('projects?name=eq.'+enc(q.name)+'&order=created_at.desc&select=id,name,client,ref,drive_folder_id,created_at&limit=8');rows=Array.isArray(rows)?rows:[];var p=rows.filter(function(x){if(q.client&&String(x.client||'').trim()!==q.client)return false;if(q.ref&&String(x.ref||'').trim()!==q.ref)return false;return true;})[0]||rows[0];if(!p)return false;gmailPending=null;return ensure(p.id);}catch(e){return false;}}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#pgi2-create');if(!b)return;var q=rememberGmailCreate();if(q.hasFiles)return;[600,1300,2600,5000].forEach(function(ms){setTimeout(findGmailCreated,ms);});},true);
function install(){wrapLegacySave();}
install();[100,400,1200].forEach(function(ms){setTimeout(install,ms);});document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTProjectDriveLifecycleV1={ensureForCreatedProject:ensure};
})();