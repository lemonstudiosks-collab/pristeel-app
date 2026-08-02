/* PRISTEEL - ridrejton projektet e furnitoreve te projekti qendror */
(function(){
'use strict';
if(window.__pstProjectCanonicalGuardLoaded)return;
window.__pstProjectCanonicalGuardLoaded=true;

var SUPPLIERS=['biomek','zincometal','eurosteel','r&t','r t group','rt group','tehnoburimi','vating','mitas','isiklar','elmet'];
function arr(v){return Array.isArray(v)?v:[]}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function isShadow(p){
  var name=norm(p&&p.name),client=norm(p&&p.client),all=name+' '+client;
  var supplier=SUPPLIERS.some(function(x){return client.indexOf(norm(x))>-1});
  return supplier&&/ssp|smart city|camera pole|steel poles/.test(all);
}
function masterScore(p){
  var t=norm((p&&p.name)+' '+(p&&p.client)+' '+(p&&p.ref)),s=0;
  if(/smart city|smartct/.test(t))s+=80;
  if(/camera pole|camera poles|shtyll/.test(t))s+=80;
  if(/ssp|sspfz/.test(t))s+=50;
  if(/46 qytete|46 cities/.test(t))s+=30;
  if(SUPPLIERS.some(function(x){return norm(p&&p.client).indexOf(norm(x))>-1}))s-=160;
  return s;
}
async function resolveProject(id){
  var rows=await supaFetch('projects?select=id,name,client,ref,status&order=created_at.asc&limit=3000');
  var current=arr(rows).filter(function(p){return String(p.id)===String(id)})[0];
  if(!current||!isShadow(current))return{current:current,master:null};
  var ranked=arr(rows).map(function(p){return{p:p,s:masterScore(p)}}).sort(function(a,b){return b.s-a.s});
  return{current:current,master:ranked[0]&&ranked[0].s>=120?ranked[0].p:null};
}
function install(){
  if(typeof window.pstCollectProjectGmail!=='function'||window.pstCollectProjectGmail.__pstCanonical)return false;
  var original=window.pstCollectProjectGmail;
  window.pstCollectProjectGmail=async function(id){
    try{
      var r=await resolveProject(id);
      if(r.current&&r.master){
        alert('“'+r.current.name+'” është regjistruar si projekt furnitori. Emailat dhe ofertat do të mblidhen te projekti qendror “'+r.master.name+'”.');
        return original.call(this,r.master.id);
      }
      if(r.current&&!r.master){
        alert('Ky duket si projekt furnitori, por projekti qendror SSP nuk u identifikua. Importimi u ndal për të shmangur klasifikimin e gabuar.');
        return;
      }
    }catch(e){console.warn('Canonical project guard:',e);}
    return original.apply(this,arguments);
  };
  window.pstCollectProjectGmail.__pstCanonical=true;
  return true;
}
var tries=0,timer=setInterval(function(){if(install()||++tries>160)clearInterval(timer)},150);
})();
