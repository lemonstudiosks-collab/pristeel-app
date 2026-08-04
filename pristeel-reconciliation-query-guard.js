/* PRISTEEL reconciliation query guard: metadata only for file audits */
(function(){
'use strict';
if(window.__pstReconciliationQueryGuardLoaded)return;
window.__pstReconciliationQueryGuardLoaded=true;
var tries=0,t=setInterval(function(){
 var real=window.supaFetch;
 if(typeof real!=='function'){if(++tries>240)clearInterval(t);return;}
 if(real.__pstReconciliationGuard){clearInterval(t);return;}
 var wrapped=function(path,method,body){
  var p=String(path||'');
  if(p.indexOf('files?select=*&order=created_at.desc&limit=5000')===0){
   path='files?select=id,project_id,file_name,file_type,size_kb,created_at&order=created_at.desc&limit=5000';
  }
  return real.call(window,path,method,body);
 };
 wrapped.__pstReconciliationGuard=true;
 wrapped.__pstOriginal=real;
 window.supaFetch=wrapped;
 clearInterval(t);
},50);
})();