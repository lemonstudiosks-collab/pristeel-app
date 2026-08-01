/* PRISTEEL project schema compatibility */
(function(){
'use strict';
if(window.__pstProjectSchemaCompatLoaded)return;
window.__pstProjectSchemaCompatLoaded=true;

var tries=0;

function tableOf(endpoint){
  return String(endpoint||'').split('?')[0].replace(/^\/+/, '');
}
function copyWithout(body,keys){
  var out={};
  Object.keys(body||{}).forEach(function(key){
    if(keys.indexOf(key)<0)out[key]=body[key];
  });
  return out;
}
function cleanBody(endpoint,method,body){
  if(!body||typeof body!=='object'||Array.isArray(body))return body;
  var table=tableOf(endpoint);
  var verb=String(method||'GET').toUpperCase();
  if(table!=='projects'||(verb!=='PATCH'&&verb!=='POST'))return body;
  return copyWithout(body,['updated_at']);
}
function isPipelineConstraint(error){
  var text='';
  try{text=typeof error==='string'?error:JSON.stringify(error)}catch(e){text=String(error&&error.message||error||'')}
  return /projects_pipeline_stage_check|pipeline_stage.*check constraint|violates check constraint/i.test(text);
}
function install(){
  var current=window.supaFetch;
  if(typeof current!=='function')return false;
  if(current.__pstProjectSchemaCompat)return true;

  function wrapped(endpoint,method,body){
    var args=Array.prototype.slice.call(arguments);
    var table=tableOf(endpoint);
    var verb=String(method||'GET').toUpperCase();
    var cleaned=cleanBody(endpoint,method,body);
    args[2]=cleaned;

    var result=current.apply(this,args);
    if(!result||typeof result.catch!=='function'||table!=='projects'||(verb!=='POST'&&verb!=='PATCH')||!cleaned||typeof cleaned!=='object'||Array.isArray(cleaned)||!Object.prototype.hasOwnProperty.call(cleaned,'pipeline_stage'))return result;

    return result.catch(function(error){
      if(!isPipelineConstraint(error))throw error;
      var retryArgs=args.slice();
      retryArgs[2]=copyWithout(cleaned,['pipeline_stage']);
      return current.apply(this,retryArgs);
    });
  }

  wrapped.__pstProjectSchemaCompat=true;
  wrapped.__pstOriginal=current;
  window.supaFetch=wrapped;
  return true;
}

if(!install()){
  var timer=setInterval(function(){
    if(install()||++tries>200)clearInterval(timer);
  },50);
}
})();
