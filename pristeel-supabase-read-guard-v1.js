/* PRISTEEL Supabase browser read guard v1
 * Free-plan safety: coalesce identical GETs and briefly cache read results.
 * Writes are never cached and invalidate related cached reads.
 * No UI behavior or business decision logic lives here.
 */
(function(){
'use strict';
if(window.__pstSupabaseReadGuardV1)return;
window.__pstSupabaseReadGuardV1=true;

var cache=new Map();
var inflight=new Map();
var MAX_ENTRIES=180;
var installAttempts=0;

function methodOf(v){return String(v||'GET').toUpperCase();}
function tableOf(path){return String(path||'').split('?')[0].replace(/^\/+/, '');}
function clone(v){
  if(v==null||typeof v!=='object')return v;
  try{if(typeof structuredClone==='function')return structuredClone(v);}catch(e){}
  try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}
}
function ttlFor(path){
  path=String(path||'');
  /* Known high-frequency single-document status lookups do not need sub-minute polling. */
  if(/^documents_registry\?/.test(path)&&/doc_nr=eq\./.test(path)&&/limit=1(?:&|$)/.test(path))return 60000;
  /* Large register/profile scans are expensive on Supabase Free; keep a short bounded snapshot. */
  if(/(?:limit=|limit%3D)(?:[3-9][0-9]{3}|[1-9][0-9]{4,})/.test(path))return 60000;
  if(/^(project_emails|documents_registry|rfq_log|projects)\?/.test(path))return 15000;
  return 5000;
}
function prune(){
  if(cache.size<=MAX_ENTRIES)return;
  var rows=Array.from(cache.entries()).sort(function(a,b){return Number(a[1].at||0)-Number(b[1].at||0);});
  for(var i=0;i<rows.length-MAX_ENTRIES;i++)cache.delete(rows[i][0]);
}
function invalidate(path){
  var table=tableOf(path);
  if(!table){cache.clear();return;}
  Array.from(cache.keys()).forEach(function(k){if(tableOf(k)===table)cache.delete(k);});
}
function install(){
  var original=window.supaFetch;
  if(typeof original!=='function')return false;
  if(original.__pstReadGuardV1)return true;

  function guarded(path,method,body){
    var m=methodOf(method),key=String(path||'');
    if(m!=='GET'){
      invalidate(key);
      return Promise.resolve(original.apply(this,arguments)).then(function(out){invalidate(key);return out;});
    }

    var now=Date.now(),ttl=ttlFor(key),hit=cache.get(key);
    if(hit&&now-hit.at<ttl)return Promise.resolve(clone(hit.value));
    if(inflight.has(key))return inflight.get(key).then(clone);

    var p=Promise.resolve(original.apply(this,arguments)).then(function(out){
      cache.set(key,{at:Date.now(),value:clone(out)});prune();return out;
    }).finally(function(){inflight.delete(key);});
    inflight.set(key,p);
    return p.then(clone);
  }
  guarded.__pstReadGuardV1=true;
  guarded.__base=original;
  window.supaFetch=guarded;
  return true;
}
function boot(){
  if(install())return;
  installAttempts++;
  if(installAttempts<20)setTimeout(boot,100);
}
boot();
window.PSTSupabaseReadGuardV1={install:install,clear:function(){cache.clear();},invalidate:invalidate,stats:function(){return{cached:cache.size,inflight:inflight.size};},_test:{ttlFor:ttlFor,tableOf:tableOf}};
})();
