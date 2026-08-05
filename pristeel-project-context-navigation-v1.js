/* PRISTEEL project context and navigation repair
 * Keeps commercial records project-specific, exposes real file metadata,
 * and makes the legacy project workflow navigable from the 360 workspace.
 */
(function(){
'use strict';
if(window.__pstProjectContextNavigationV1)return;
window.__pstProjectContextNavigationV1=true;

var A=window.PSTProjectDataIntegrity;
if(!A||typeof A.load!=='function')return;
var originalLoad=A.load;
var currentProject=null;

function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function unique(rows){var seen={};return arr(rows).filter(function(row){var key=String(row&&(row.id||row.gmail_message_id||row.file_id||row.drive_file_id||row.doc_nr||row.document_nr||row.invoice_nr||row.file_name||row.filename||row.name)||'');if(!key||seen[key])return false;seen[key]=1;return true;});}
function explicitProjectText(row){return norm(['project','project_name','project_ref','ref','reference','rfq_ref','request_ref'].map(function(k){return row&&row[k]||'';}).join(' '));}
function identifiers(project){
  var source=norm((project&&project.name||'')+' '+(project&&project.ref||''));
  return (source.match(/\b[a-z]*\d{4,}[a-z0-9]*\b/g)||[]).filter(function(x,i,a){return a.indexOf(x)===i;});
}
function directRelation(row,project){
  if(!row||!project)return false;
  var id=String(project.id||'');
  return [row.project_id,row.source_project_id,row.linked_project_id,row.parent_project_id].some(function(v){return v!=null&&String(v)===id;});
}
function strictProjectMatch(row,project,allowDirectWhenUnlabelled){
  if(!row||!project)return false;
  var explicit=explicitProjectText(row),name=norm(project.name),ref=norm(project.ref),ids=identifiers(project);
  if(explicit){
    if(ref&&ref.length>=4&&explicit.indexOf(ref)>-1)return true;
    if(name&&name.length>=7&&(explicit.indexOf(name)>-1||name.indexOf(explicit)>-1))return true;
    if(ids.some(function(id){return explicit.indexOf(id)>-1;}))return true;
    return false;
  }
  return !!allowDirectWhenUnlabelled&&directRelation(row,project);
}
function isOurOffer(row){return String(row&&row.series||'').toUpperCase()==='QUO'||/oferta jone|our offer|pristeel/i.test(String(row&&(row.supplier||row.origin||row.source)||''));}
function isSupplierOffer(row){
  if(!row||isOurOffer(row))return false;
  return !!String(row.supplier||row.supplier_name||row.company||'').trim()||/offer|ofert|angebot|quotation|quote|rfq response|price proposal/i.test(String(row.title||row.subject||row.description||row.file_name||row.filename||''));
}
function tag(rows,source){return arr(rows).map(function(row){try{row.__pstSource=row.__pstSource||source;}catch(e){}return row;});}

A.load=async function(id){
  var data=await originalLoad(id),p=data.project;
  currentProject=p;

  data.docs=tag(arr(data.docs).filter(function(row){return strictProjectMatch(row,p,true);}), 'documents_registry');
  data.offers=tag(arr(data.offers).filter(function(row){return strictProjectMatch(row,p,true);}), 'offers');
  data.projectDocs=tag(arr(data.projectDocs).filter(function(row){return strictProjectMatch(row,p,true);}), 'project_docs');
  data.attachmentLinks=tag(arr(data.attachmentLinks).filter(function(row){return strictProjectMatch(row,p,true);}), 'project_attachment_links');
  data.inboxDocs=tag(arr(data.inboxDocs).filter(function(row){return strictProjectMatch(row,p,true);}), 'offers_inbox');

  var databaseFiles=await A.safe('files?project_id=eq.'+enc(p.id)+'&select=id,file_name,file_type,size_kb,created_at,project_id,page_context&order=created_at.desc&limit=1000');
  data.databaseFiles=tag(databaseFiles,'files');
  data.projectDocs=unique(data.projectDocs.concat(data.databaseFiles));

  data.ourOffers=unique(data.docs.filter(isOurOffer).concat(data.offers.filter(isOurOffer)));
  data.supplierOffers=unique(data.offers.concat(data.inboxDocs,data.projectDocs,data.attachmentLinks,data.docs).filter(function(row){return strictProjectMatch(row,p,true)&&isSupplierOffer(row);}));
  data.files=unique(data.projectDocs.concat(data.attachmentLinks,data.inboxDocs,data.drive&&data.drive.rows||[],data.mailAttachments||[]));
  activateProject(p,false);
  return data;
};

function ensureOption(select,project){
  if(!select||!project)return;
  var id=String(project.id),exists=[].some.call(select.options||[],function(option){return String(option.value)===id;});
  if(!exists){var option=document.createElement('option');option.value=id;option.textContent=project.name||'Projekt';select.appendChild(option);}
  select.value=id;
}
function setValue(id,value){var el=document.getElementById(id);if(el&&value!=null)el.value=value;}
function activateProject(project,loadLegacy){
  if(!project||!project.id)return;
  currentProject=project;
  var id=String(project.id);
  window.__pstCurrentProjectId=id;
  window._curProjId=id;
  try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  ensureOption(document.getElementById('global-proj'),project);
  ['oe-proj','iv-proj-select','ivin-proj-select'].forEach(function(key){ensureOption(document.getElementById(key),project);});
  setValue('i-projname',project.name||'');
  setValue('i-client',project.client||'');
  setValue('i-ref',project.ref||'');
  var badge=document.getElementById('proj-badge');if(badge)badge.textContent=project.name||'Projekt';
  if(loadLegacy&&typeof window.loadProject==='function'){
    try{window.loadProject(id,true);}catch(e){console.warn('PRISTEEL project activation:',e);}
  }
}
function legacyShow(page){
  var L=window.__pstWorkspaceLegacy||{},fn=L.showPage||window.showPage;
  if(typeof fn==='function'){fn.call(window,page);return true;}
  var el=document.getElementById('page-'+page);if(!el)return false;
  document.querySelectorAll('.page').forEach(function(x){x.classList.toggle('active',x===el);x.style.display=x===el?'':'none';});
  return true;
}
function refreshLegacyPage(page){
  try{
    if(page==='offers'&&typeof window.loadOffers==='function')window.loadOffers();
    if(page==='oferta'&&typeof window.loadSavedQuotesForProject==='function')window.loadSavedQuotesForProject();
    if(page==='library'&&typeof window.loadLibraryFiles==='function')window.loadLibraryFiles();
    if(page==='invoices'&&typeof window.loadInvoices==='function')window.loadInvoices();
  }catch(e){console.warn('PRISTEEL page refresh:',page,e);}
}
window.pstProjectGoStep=function(page){
  var project=currentProject||(window.__pstIntegrityLastData&&window.__pstIntegrityLastData.project);
  if(project)activateProject(project,true);
  setTimeout(function(){legacyShow(page);if(project)activateProject(project,false);setTimeout(function(){refreshLegacyPage(page);if(project)activateProject(project,false);},100);},90);
};
window.flowGoto=function(page){window.pstProjectGoStep(page);};
window.pstPiWork=function(){window.pstProjectGoStep('newproject');};

function recordName(row){return row&&(row.doc_nr||row.document_nr||row.invoice_nr||row.title||row.file_name||row.filename||row.name||row.supplier)||'Pa emër';}
function recordMeta(row){
  var amount=parseFloat(row&&(row.total_eur||row.amount));
  var parts=[];
  if(isFinite(amount))parts.push(amount.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(row.currency||'EUR'));
  if(row&&(row.created_at||row.doc_date)){var d=new Date(row.created_at||row.doc_date);if(!isNaN(d.getTime()))parts.push(d.toLocaleDateString('sq-AL'));}
  return parts.join(' · ');
}
function recordUrl(row){return row&&(row.web_view_link||row.webViewLink||row.drive_url||row.file_url||row.url||row.gmail_url)||'';}
function findCard(title){return [].find.call(document.querySelectorAll('.pst-pi-card'),function(card){var h=card.querySelector('.pst-pi-hd b');return h&&h.textContent.trim()===title;});}
function rowHtml(row,index,handler){return '<div class="pst-pi-row pst-project-record" role="button" tabindex="0" onclick="'+handler+'('+index+')"><i class="pst-pi-dot" style="--c:#5B9BB3;--bg:#EAF5F8"></i><div class="pst-pi-main"><div class="pst-pi-name">'+esc(recordName(row))+'</div><div class="pst-pi-meta">'+esc(recordMeta(row))+'</div></div><button class="pst-pi-link" onclick="event.stopPropagation();'+handler+'('+index+')">Hap</button></div>';}
function renderCommercialRecords(){
  var data=window.__pstIntegrityLastData;if(!data)return;
  var card=findCard('Ofertat tona');if(!card)return;
  var body=card.querySelector('.pst-pi-body');if(!body)return;
  body.innerHTML=data.ourOffers.length?data.ourOffers.map(function(row,index){return rowHtml(row,index,'pstProjectOpenOurOffer');}).join(''):'<div class="pst-pi-empty">Nuk ka ofertë të lidhur me këtë projekt.</div>';
}
function renderProjectFiles(){
  var data=window.__pstIntegrityLastData;if(!data)return;
  var card=findCard('Skedarët e projektit');if(!card)return;
  var rows=unique(data.files||[]),body=card.querySelector('.pst-pi-body');if(!body)return;
  body.innerHTML=rows.length?rows.map(function(row,index){return rowHtml(row,index,'pstProjectOpenFile');}).join(''):'<div class="pst-pi-empty">Nuk ka skedar të lidhur me këtë projekt.</div>';
}
function enhance(){
  var data=window.__pstIntegrityLastData;if(data&&data.project)activateProject(data.project,false);
  renderCommercialRecords();renderProjectFiles();
  document.querySelectorAll('.pst-pi-step').forEach(function(step){step.style.cursor='pointer';});
}
window.pstProjectOpenOurOffer=function(index){
  var data=window.__pstIntegrityLastData,row=data&&data.ourOffers&&data.ourOffers[index];if(!row)return;
  activateProject(data.project,false);
  var u=recordUrl(row);if(u){window.open(u,'_blank');return;}
  if((row.__pstSource==='documents_registry'||row.series||row.offer_state||row.doc_nr)&&typeof window.oaOpenQuoteModal==='function'){window.oaOpenQuoteModal(row.id);return;}
  if(typeof window.pstOpenOffer==='function'){window.pstOpenOffer(row.id,data.project.id);return;}
  window.pstProjectGoStep('oferta');
};
window.pstProjectOpenFile=function(index){
  var data=window.__pstIntegrityLastData,row=data&&data.files&&data.files[index];if(!row)return;
  activateProject(data.project,false);
  var u=recordUrl(row);if(u){window.open(u,'_blank');return;}
  if(row.__pstSource==='files'&&typeof window.downloadLibFile==='function'){window.downloadLibFile(row.id,row.file_name||row.name,row.file_type||'application/octet-stream');return;}
  if(row.gmail_url){window.open(row.gmail_url,'_blank');return;}
  window.pstProjectGoStep('library');
};

var originalOpen=window.pstOpenProjectWorkspace;
if(typeof originalOpen==='function')window.pstOpenProjectWorkspace=async function(id){var result=await originalOpen.apply(this,arguments);setTimeout(enhance,0);return result;};
var originalTab=window.pstPiTab;
if(typeof originalTab==='function')window.pstPiTab=function(){var result=originalTab.apply(this,arguments);setTimeout(enhance,0);return result;};

document.addEventListener('keydown',function(event){var target=event.target;if((event.key==='Enter'||event.key===' ')&&target&&target.classList&&target.classList.contains('pst-project-record')){event.preventDefault();target.click();}});
var style=document.createElement('style');style.textContent='.pst-project-record{cursor:pointer;transition:background .14s ease}.pst-project-record:hover{background:#F5FAFC}.pst-project-record:focus{outline:2px solid rgba(91,155,179,.35);outline-offset:-2px}.pst-pi-flow .pst-pi-step:hover i{border-color:#5B9BB3;box-shadow:0 0 0 4px rgba(91,155,179,.10)}';document.head.appendChild(style);
})();
