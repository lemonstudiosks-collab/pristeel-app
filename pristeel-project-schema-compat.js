/* PRISTEEL project schema compatibility */
(function(){
'use strict';
if(window.__pstProjectSchemaCompatLoaded)return;
window.__pstProjectSchemaCompatLoaded=true;

var tries=0;

function cleanBody(endpoint,method,body){
  if(!body||typeof body!=='object'||Array.isArray(body))return body;
  var table=String(endpoint||'').split('?')[0].replace(/^\/+/, '');
  var verb=String(method||'GET').toUpperCase();
  if(table!=='projects'||(verb!=='PATCH'&&verb!=='POST'))return body;
  if(!Object.prototype.hasOwnProperty.call(body,'updated_at'))return body;

  var copy={};
  Object.keys(body).forEach(function(key){
    if(key!=='updated_at')copy[key]=body[key];
  });
  return copy;
}

function install(){
  var current=window.supaFetch;
  if(typeof current!=='function')return false;
  if(current.__pstProjectSchemaCompat)return true;

  function wrapped(endpoint,method,body){
    var args=Array.prototype.slice.call(arguments);
    args[2]=cleanBody(endpoint,method,body);
    return current.apply(this,args);
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
