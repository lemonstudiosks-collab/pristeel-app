/* PRISTEEL exact project identity lock v1
 * Persists the exact project UUID across refreshes and devices/browser navigation.
 * Never resolves projects by name. No polling, no observers, no project data writes.
 */
(function(){
'use strict';
if(window.__pstProjectIdentityLockV1)return;window.__pstProjectIdentityLockV1=true;
var KEY='pst_exact_project_id_v1',LEGACY='pristeel_cur_proj',PARAM='project_id';
function id(v){v=String(v||'').trim();return /^[a-z0-9-]{8,}$/i.test(v)?v:'';}
function fromUrl(){try{return id(new URL(location.href).searchParams.get(PARAM));}catch(e){return'';}}
function read(store,key){try{return id(store.getItem(key));}catch(e){return'';}}
function put(store,key,value){try{store.setItem(key,value);}catch(e){}}
function updateUrl(value){try{var u=new URL(location.href);if(u.searchParams.get(PARAM)!==value){u.searchParams.set(PARAM,value);history.replaceState(history.state||null,'',u.pathname+u.search+u.hash);}}catch(e){}}
function remember(value,withUrl){value=id(value);if(!value)return'';window.__pstCurrentProjectId=value;window._curProjId=value;put(localStorage,KEY,value);put(sessionStorage,KEY,value);put(localStorage,LEGACY,value);if(withUrl!==false)updateUrl(value);return value;}
function seed(){var value=fromUrl()||read(sessionStorage,KEY)||read(localStorage,KEY)||read(localStorage,LEGACY);if(value){put(localStorage,LEGACY,value);put(localStorage,KEY,value);put(sessionStorage,KEY,value);window.__pstExactProjectRestoreId=value;}return value;}
function wrap(name){var base=window[name];if(typeof base!=='function'||base.__pstIdentityLock)return false;function f(projectId){var value=id(projectId);if(value)remember(value,true);var r=base.apply(this,arguments);if(value)Promise.resolve().then(function(){remember(value,true);});return r;}f.__pstIdentityLock=true;f.__pstIdentityBase=base;window[name]=f;return true;}
function install(){wrap('loadProject');wrap('pstOpenProjectWorkspace');wrap('pstOpenProjectDirect');}
seed();install();
document.addEventListener('change',function(e){var t=e.target;if(t&&t.id==='global-proj'&&id(t.value))remember(t.value,true);},true);
document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-pm-open],[data-pdc-open]');if(!t)return;var value=id(t.getAttribute('data-pm-open')||t.getAttribute('data-pdc-open'));if(value)remember(value,true);},true);
document.addEventListener('pst:modules-ready',function(){install();var value=fromUrl()||read(sessionStorage,KEY)||read(localStorage,KEY);if(value)remember(value,false);},{once:true});
window.addEventListener('pageshow',function(){var value=fromUrl()||read(sessionStorage,KEY)||read(localStorage,KEY);if(value){put(localStorage,LEGACY,value);window.__pstExactProjectRestoreId=value;}},{once:true});
window.PSTProjectIdentityLockV1={remember:remember,current:function(){return fromUrl()||read(sessionStorage,KEY)||read(localStorage,KEY)||id(window.__pstCurrentProjectId)||'';},seed:seed};
})();
