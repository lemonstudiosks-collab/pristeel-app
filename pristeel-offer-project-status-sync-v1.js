/* PRISTEEL offer -> project status sync v2
 * - Explicitly marking a client quotation WON marks its linked project as won.
 * - Saving a client quotation advances a project from pricing to client_offer.
 * - LOST is intentionally not auto-propagated because another revision/offer may still be active.
 * - Saved is not sent: no wait state, win state or outbound action is inferred from saving.
 */
(function(){
'use strict';if(window.__pstOfferProjectStatusSyncV1)return;window.__pstOfferProjectStatusSyncV1=true;
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function norm(v){return String(v==null?'':v).toLowerCase().trim();}
function row(id){try{return(Array.isArray(window._oaRows)?window._oaRows:[]).filter(function(x){return String(x.id)===String(id);})[0]||null;}catch(e){return null;}}
function currentProjectId(){var d=window.__pstIntegrityLastData||{};return String(window._curProjId||window.__pstCurrentProjectId||(d.project&&d.project.id)||'').trim();}
function terminalStatus(v){return /fituar|won|realizuar|mbyllur|closed|arkivuar|archived|humbur|lost|cancel/.test(norm(v));}
async function projectId(id){var r=row(id);if(r&&r.project_id)return String(r.project_id);if(typeof window.supaFetch!=='function')return'';try{var x=await window.supaFetch('documents_registry?id=eq.'+enc(id)+'&select=project_id&limit=1');return x&&x[0]&&x[0].project_id?String(x[0].project_id):'';}catch(e){return'';}}
function localWon(id){var lists=[window.__pstWorkspaceProjectRows,window._allProjectsCache,window.projects,window._projects,window.PST_PROJECTS];lists.forEach(function(a){if(!Array.isArray(a))return;a.forEach(function(p){if(String(p.id)===String(id))p.status='fituar';});});var d=window.__pstIntegrityLastData;if(d&&d.project&&String(d.project.id)===String(id))d.project.status='fituar';}
function localStage(id,stage){var lists=[window.__pstWorkspaceProjectRows,window._allProjectsCache,window.projects,window._projects,window.PST_PROJECTS];lists.forEach(function(a){if(!Array.isArray(a))return;a.forEach(function(p){if(String(p.id)===String(id))p.pipeline_stage=stage;});});var d=window.__pstIntegrityLastData;if(d&&d.project&&String(d.project.id)===String(id))d.project.pipeline_stage=stage;}
async function syncWon(id){if(typeof window.supaFetch!=='function')return false;var pid=await projectId(id);if(!pid)return false;try{var p=await window.supaFetch('projects?id=eq.'+enc(pid)+'&select=id,status&limit=1'),cur=p&&p[0]&&String(p[0].status||'').toLowerCase();if(/fituar|won|realizuar/.test(cur||'')){localWon(pid);return true;}await window.supaFetch('projects?id=eq.'+enc(pid),'PATCH',{status:'fituar',updated_at:new Date().toISOString()});localWon(pid);if(window.PSTProjectClosureDirect&&typeof window.PSTProjectClosureDirect.refresh==='function')setTimeout(function(){window.PSTProjectClosureDirect.refresh();},150);return true;}catch(e){console.warn('PRISTEEL offer->project status sync:',e&&e.message);return false;}}
async function syncSavedOfferStage(){
  if(typeof window.supaFetch!=='function')return false;
  var pid=currentProjectId();if(!pid)return false;
  try{
    var rows=await window.supaFetch('projects?id=eq.'+enc(pid)+'&select=id,status,pipeline_stage,operational_state&limit=1'),p=rows&&rows[0];
    if(!p||terminalStatus(p.status))return false;
    if(norm(p.pipeline_stage)!=='pricing')return false;
    var op=norm(p.operational_state);if(op==='wait_for_client'||op==='execution')return false;
    var now=new Date().toISOString();
    await window.supaFetch('projects?id=eq.'+enc(pid),'PATCH',{pipeline_stage:'client_offer',updated_at:now,last_activity_at:now});
    localStage(pid,'client_offer');
    try{document.dispatchEvent(new CustomEvent('pst:project-stage-synced',{detail:{project_id:pid,pipeline_stage:'client_offer',source:'client_offer_saved'}}));}catch(x){}
    return true;
  }catch(e){console.warn('PRISTEEL saved offer->project stage sync:',e&&e.message);return false;}
}
function install(){var f=window.oaSetFollowupStatus;if(typeof f!=='function'||f.__pstProjectStatusSync)return false;function w(id,val){var out=f.apply(this,arguments);if(String(val||'').toLowerCase()==='won')Promise.resolve().then(function(){return syncWon(id);});return out;}w.__pstProjectStatusSync=true;w.__base=f;window.oaSetFollowupStatus=w;return true;}
install();[100,400,1200].forEach(function(ms){setTimeout(install,ms);});
document.addEventListener('pst:modules-ready',install,{once:true});
document.addEventListener('pst:offer-saved',function(){syncSavedOfferStage();});
window.PSTOfferProjectStatusSyncV1={install:install,sync:syncWon,syncWon:syncWon,syncSavedOfferStage:syncSavedOfferStage,_test:{currentProjectId:currentProjectId,terminalStatus:terminalStatus,localStage:localStage}};
})();
