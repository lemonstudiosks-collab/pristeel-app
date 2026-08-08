/* PRISTEEL offer -> project status sync v1
 * Explicitly marking a client quotation WON also marks its linked project as won.
 * LOST is intentionally not auto-propagated because another revision/offer may still be active.
 */
(function(){
'use strict';if(window.__pstOfferProjectStatusSyncV1)return;window.__pstOfferProjectStatusSyncV1=true;
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function row(id){try{return(Array.isArray(window._oaRows)?window._oaRows:[]).filter(function(x){return String(x.id)===String(id);})[0]||null;}catch(e){return null;}}
async function projectId(id){var r=row(id);if(r&&r.project_id)return String(r.project_id);if(typeof window.supaFetch!=='function')return'';try{var x=await window.supaFetch('documents_registry?id=eq.'+enc(id)+'&select=project_id&limit=1');return x&&x[0]&&x[0].project_id?String(x[0].project_id):'';}catch(e){return'';}}
function local(id){var lists=[window.__pstWorkspaceProjectRows,window._allProjectsCache,window.projects,window._projects,window.PST_PROJECTS];lists.forEach(function(a){if(!Array.isArray(a))return;a.forEach(function(p){if(String(p.id)===String(id))p.status='fituar';});});var d=window.__pstIntegrityLastData;if(d&&d.project&&String(d.project.id)===String(id))d.project.status='fituar';}
async function sync(id){if(typeof window.supaFetch!=='function')return false;var pid=await projectId(id);if(!pid)return false;try{var p=await window.supaFetch('projects?id=eq.'+enc(pid)+'&select=id,status&limit=1'),cur=p&&p[0]&&String(p[0].status||'').toLowerCase();if(/fituar|won|realizuar/.test(cur||'')){local(pid);return true;}await window.supaFetch('projects?id=eq.'+enc(pid),'PATCH',{status:'fituar',updated_at:new Date().toISOString()});local(pid);if(window.PSTProjectClosureDirect&&typeof window.PSTProjectClosureDirect.refresh==='function')setTimeout(function(){window.PSTProjectClosureDirect.refresh();},150);return true;}catch(e){console.warn('PRISTEEL offer->project status sync:',e&&e.message);return false;}}
function install(){var f=window.oaSetFollowupStatus;if(typeof f!=='function'||f.__pstProjectStatusSync)return false;function w(id,val){var out=f.apply(this,arguments);if(String(val||'').toLowerCase()==='won')Promise.resolve().then(function(){return sync(id);});return out;}w.__pstProjectStatusSync=true;w.__base=f;window.oaSetFollowupStatus=w;return true;}
install();[100,400,1200].forEach(function(ms){setTimeout(install,ms);});document.addEventListener('pst:modules-ready',install,{once:true});window.PSTOfferProjectStatusSyncV1={install:install,sync:sync};
})();