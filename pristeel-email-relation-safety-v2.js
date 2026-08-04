/* PRISTEEL multi-project email relation safety
 * Protects existing project_email.project_id assignments during Gmail/manual linking.
 * A new project relation is added to project_email_links instead of moving an already assigned email.
 */
(function(){
'use strict';
if(window.__pstEmailRelationSafetyV2)return;
window.__pstEmailRelationSafetyV2=true;

var original=window.supaFetch;
if(typeof original!=='function')return;

function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function clone(v){if(!v||typeof v!=='object')return v;return Array.isArray(v)?v.map(clone):Object.keys(v).reduce(function(o,k){o[k]=v[k];return o;},{});}
function relationSource(body){return String(body&&body.match_method||body&&body.source||'manual-link').slice(0,80);}
function isLinkWrite(path,method,body){
  return method==='PATCH'&&String(path||'').indexOf('project_emails?')===0&&body&&body.project_id&&/gmail-panel|manual|collector|multi-link|gmail|project-link/i.test(relationSource(body));
}
function selectPath(path){
  var p=String(path||'');
  if(/(?:\?|&)select=/.test(p))return p.replace(/([?&])select=[^&]*/,'$1select=id,project_id,gmail_message_id');
  return p+(p.indexOf('?')>-1?'&':'?')+'select=id,project_id,gmail_message_id';
}
async function addRelation(gmailMessageId,projectId,source){
  if(!gmailMessageId||!projectId)return;
  try{
    var check=await original('project_email_links?gmail_message_id=eq.'+enc(gmailMessageId)+'&project_id=eq.'+enc(projectId)+'&select=id&limit=1');
    if(arr(check).length)return;
    await original('project_email_links','POST',[{
      gmail_message_id:String(gmailMessageId),project_id:String(projectId),source:source||'manual-link',relation_type:'manual',confidence:100,created_at:new Date().toISOString()
    }]);
  }catch(e){
    console.warn('PRISTEEL email relation could not be recorded:',e);
  }
}
async function protectPatch(path,body){
  var target=String(body.project_id),rows=[];
  try{rows=arr(await original(selectPath(path)));}catch(e){rows=[];}
  await Promise.all(rows.map(function(row){return addRelation(row.gmail_message_id,target,relationSource(body));}));
  var conflicts=rows.some(function(row){return row.project_id&&String(row.project_id)!==target;});
  if(!conflicts)return original(path,'PATCH',body);
  var safeBody=clone(body);delete safeBody.project_id;
  if(!safeBody.suggested_project_id)safeBody.suggested_project_id=target;
  safeBody.updated_at=safeBody.updated_at||new Date().toISOString();
  return original(path,'PATCH',safeBody);
}
async function protectPost(path,body){
  var result=await original(path,'POST',body),rows=arr(body),resultRows=arr(result);
  await Promise.all(rows.map(function(row,index){var saved=resultRows[index]||row;return addRelation(saved.gmail_message_id||row.gmail_message_id,row.project_id,relationSource(row));}));
  return result;
}
window.supaFetch=function(path,method,body){
  method=String(method||'GET').toUpperCase();
  if(isLinkWrite(path,method,body))return protectPatch(path,body);
  if(method==='POST'&&String(path||'')==='project_emails'){
    var rows=Array.isArray(body)?body:[body];
    if(rows.some(function(x){return x&&x.project_id&&/gmail-panel|manual|collector|multi-link|gmail|project-link/i.test(relationSource(x));}))return protectPost(path,body);
  }
  return original.apply(this,arguments);
};
window.supaFetch.__pstEmailRelationSafetyV2=true;
})();
