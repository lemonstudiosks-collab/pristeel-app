/* PRISTEEL project schema compatibility */
(function(){
'use strict';
if(window.__pstProjectSchemaCompatLoaded)return;
window.__pstProjectSchemaCompatLoaded=true;

var tries=0;
var BUSINESS_TYPES=['trading','fabrication','hybrid'];
var BUSINESS_TYPE_FIELD_ID='i-business-type';

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
function isProjectFormSave(body){
  if(!body||typeof body!=='object'||Array.isArray(body))return false;
  return ['name','client','ref','location','deadline','deal_type'].every(function(key){
    return Object.prototype.hasOwnProperty.call(body,key);
  });
}
function businessTypeField(){
  return document.getElementById(BUSINESS_TYPE_FIELD_ID);
}
function businessTypeValue(){
  var field=businessTypeField();
  if(!field)return undefined;
  var value=String(field.value||'').trim();
  return BUSINESS_TYPES.indexOf(value)>-1?value:null;
}
function ensureBusinessTypeField(){
  var existing=businessTypeField();
  if(existing)return existing;
  var location=document.getElementById('i-location');
  var group=location&&location.closest?location.closest('.field-group'):null;
  if(!group||!group.parentNode)return null;

  var row=document.createElement('div');
  row.id='pst-project-business-type-row';
  row.className='field-group fg-3';
  row.innerHTML='<div><label class="lbl" for="'+BUSINESS_TYPE_FIELD_ID+'">Lloji i biznesit</label><select id="'+BUSINESS_TYPE_FIELD_ID+'"><option value="">— Pa përcaktuar —</option><option value="trading">Trading</option><option value="fabrication">Fabrication</option><option value="hybrid">Hybrid</option></select></div>';
  group.parentNode.insertBefore(row,group.nextSibling);
  return businessTypeField();
}
function syncBusinessType(project){
  var field=ensureBusinessTypeField();
  if(!field)return;
  var value=String(project&&project.business_type||'').trim();
  field.value=BUSINESS_TYPES.indexOf(value)>-1?value:'';
}
function isProjectByIdGet(endpoint,verb){
  return verb==='GET'&&tableOf(endpoint)==='projects'&&/(?:\?|&)id=eq\.[^&]+/.test(String(endpoint||''));
}
function cleanBody(endpoint,method,body){
  if(!body||typeof body!=='object'||Array.isArray(body))return body;
  var table=tableOf(endpoint);
  var verb=String(method||'GET').toUpperCase();
  if(table!=='projects'||(verb!=='PATCH'&&verb!=='POST'))return body;
  var cleaned=copyWithout(body,['updated_at']);
  if(isProjectFormSave(cleaned)){
    var businessType=businessTypeValue();
    if(businessType!==undefined)cleaned.business_type=businessType;
  }
  return cleaned;
}
function isPipelineConstraint(error){
  var text='';
  try{text=typeof error==='string'?error:JSON.stringify(error)}catch(e){text=String(error&&error.message||error||'')}
  return /projects_pipeline_stage_check|pipeline_stage.*check constraint|violates check constraint/i.test(text);
}
function wrapResetWorkspace(){
  var current=window.resetWorkspace;
  if(typeof current!=='function')return false;
  if(current.__pstBusinessTypeReset)return true;
  function wrapped(){
    var result=current.apply(this,arguments);
    var field=ensureBusinessTypeField();
    if(field)field.value='';
    return result;
  }
  wrapped.__pstBusinessTypeReset=true;
  wrapped.__pstOriginal=current;
  window.resetWorkspace=wrapped;
  return true;
}
function install(){
  ensureBusinessTypeField();
  wrapResetWorkspace();

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
    if(result&&typeof result.then==='function'&&isProjectByIdGet(endpoint,verb)){
      result=result.then(function(rows){
        if(Array.isArray(rows)&&rows.length)syncBusinessType(rows[0]);
        return rows;
      });
    }
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
    ensureBusinessTypeField();
    wrapResetWorkspace();
    if(install()||++tries>200)clearInterval(timer);
  },50);
}else{
  [0,100,300,900].forEach(function(ms){setTimeout(function(){ensureBusinessTypeField();wrapResetWorkspace();},ms);});
}
})();
