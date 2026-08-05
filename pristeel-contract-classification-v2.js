/* PRISTEEL contract classification repair
 * Corrects obviously misclassified saved contracts from their titles and persists the category.
 */
(function(){
'use strict';
if(window.__pstContractClassificationV2)return;
window.__pstContractClassificationV2=true;
var original=window.supaFetch;
if(typeof original!=='function')return;
var repaired={};
function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function title(row){return norm([row.title,row.name,row.contract_name,row.document_name,row.file_name,row.reference,row.ref,row.company,row.party].filter(Boolean).join(' '));}
function classify(row){
  var t=title(row);
  if(!t)return'';
  if(/\bnda\b|confidential|konfidencial|non disclosure|moszbulim/.test(t))return'nda';
  if(/nenkontrat|subcontract|furnitor|supplier|prodhim|production|manufactur/.test(t))return'prod';
  if(/werkvertrag|bleres|buyer|shitje|sales|client contract|customer contract/.test(t))return'sale';
  return'';
}
function typeField(row){
  var fields=['contract_type','contractType','category','kind','type','template_type','contract_kind'];
  for(var i=0;i<fields.length;i++)if(Object.prototype.hasOwnProperty.call(row,fields[i]))return fields[i];
  return'';
}
function isContractPath(path){return /(^|\/|\b)contracts?(\?|$)/i.test(String(path||''));}
function repairRows(rows){
  arr(rows).forEach(function(row){
    var target=classify(row),field=typeField(row),current=field?String(row[field]||'').toLowerCase():'';
    if(!target||!field||current===target)return;
    row[field]=target;
    if(!row.id||repaired[row.id])return;
    repaired[row.id]=true;
    var patch={};patch[field]=target;
    Promise.resolve().then(function(){return original('contracts?id=eq.'+enc(row.id),'PATCH',patch);}).catch(function(error){
      repaired[row.id]=false;
      console.warn('PRISTEEL contract category repair skipped:',error&&error.message);
    });
  });
  return rows;
}
window.supaFetch=function(path,method,body){
  var result=original.apply(this,arguments),m=String(method||'GET').toUpperCase();
  if(m==='GET'&&isContractPath(path))return Promise.resolve(result).then(repairRows);
  return result;
};
window.supaFetch.__pstContractClassificationV2=true;
function refresh(){
  try{if(typeof window.loadContracts==='function')window.loadContracts();}catch(e){}
  try{if(typeof window.ctrFilterList==='function')window.ctrFilterList('all');}catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(refresh,900);});else setTimeout(refresh,900);
})();
