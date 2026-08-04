/* PRISTEEL unified project documents view */
(function(){
'use strict';
if(window.__pstProjectUnifiedDocumentsLoaded)return;
window.__pstProjectUnifiedDocumentsLoaded=true;

var BLUE='#5B9BB3',BLUE_PALE='#EAF5F8',GREEN='#2F7657',GREEN_PALE='#EAF5EF',AMBER='#9B6A22',AMBER_PALE='#FAF2E3',PURPLE='#6B5B95',PURPLE_PALE='#F0EDF7';
var tabWrapped=false,openWrapped=false,requestToken=0;
function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function num(v){var n=parseFloat(v);return isFinite(n)?n:0;}
function money(v,c){return num(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c||'EUR');}
function date(v){if(!v)return'—';var d=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(d.getTime())?String(v):d.toLocaleDateString('sq-AL');}
async function q(path){try{return arr(await window.supaFetch(path));}catch(e){console.warn('PRISTEEL unified documents:',path,e);return[];}}
function pid(){return String(window.__pstCurrentProjectId||window._curProjId||'');}
function kind(label,c,bg){return'<span class="pst-ws-status" style="--c:'+c+';--bg:'+bg+'">'+esc(label)+'</span>';}
function openButton(type,id){if(type==='offer')return'<button class="pst-ws-rowaction" onclick="pstWsOpenCommercial(\'offer\',\''+esc(id)+'\')">Hap</button>';if(type==='invoice')return'<button class="pst-ws-rowaction" onclick="pstWsOpenCommercial(\'invoice\',\''+esc(id)+'\')">Hap</button>';if(type==='credit_note'||type==='debit_note')return'<button class="pst-ws-rowaction" onclick="pstWsOpenCommercial(\''+type+'\',\''+esc(id)+'\')">Hap</button>';if(type==='file')return'<button class="pst-ws-rowaction" data-file-open="'+esc(id)+'">Hap</button>';return'<button class="pst-ws-rowaction" onclick="pstWsLegacy(\'contracts\')">Hap regjistrin</button>';}
function row(x){var meta=x.type==='file'?(x.file_type||'Skedar'):x.type==='contract'?(x.contract_type||'Kontratë'):(x.project||''),tone=x.type==='offer'?PURPLE:x.type==='invoice'?BLUE:x.type==='credit_note'?GREEN:x.type==='debit_note'?AMBER:'#667078',bg=x.type==='offer'?PURPLE_PALE:x.type==='invoice'?BLUE_PALE:x.type==='credit_note'?GREEN_PALE:x.type==='debit_note'?AMBER_PALE:'#EEF2F4';return'<tr><td>'+kind(x.label,tone,bg)+'</td><td><div class="pst-ws-name">'+esc(x.nr||x.name||'Dokument')+'</div><div class="pst-ws-meta">'+esc(meta||'')+'</div></td><td>'+date(x.date)+'</td><td>'+(x.amount==null?'—':money(x.amount,x.currency))+'</td><td>'+openButton(x.type,x.id)+'</td></tr>';}
function card(title,sub,rows,empty){return'<section class="pst-ws-card"><div class="pst-ws-card-hd"><div><div class="pst-ws-card-title">'+esc(title)+'</div><div class="pst-ws-card-sub">'+esc(sub)+'</div></div></div><div class="pst-ws-card-body">'+(rows.length?'<table class="pst-ws-table"><thead><tr><th>Lloji</th><th>Dokumenti</th><th>Data</th><th>Shuma</th><th></th></tr></thead><tbody>'+rows.map(row).join('')+'</tbody></table>':'<div class="pst-ws-empty">'+esc(empty)+'</div>')+'</div></section>';}
function normalizeData(out){
 var rows=[];
 out.offers.forEach(function(x){rows.push({type:'offer',label:'Ofertë',id:x.id,nr:x.doc_nr,date:x.created_at,amount:x.total_eur,currency:'EUR',project:x.project});});
 out.outgoing.forEach(function(x){rows.push({type:'invoice',label:'Faturë',id:x.id,nr:x.invoice_nr,date:x.date||x.created_at,amount:x.gross_amount||x.total_price,currency:x.currency||'EUR',project:x.project});});
 out.adjustments.forEach(function(x){rows.push({type:x.document_type,label:x.document_type==='credit_note'?'Notë kreditore':'Notë debitore',id:x.id,nr:x.document_nr,date:x.document_date||x.created_at,amount:x.gross_amount,currency:x.currency||'EUR',project:x.project});});
 out.incoming.forEach(function(x){rows.push({type:'incoming',label:'Faturë hyrëse',id:x.id,nr:x.supplier_invoice_nr,date:x.date||x.created_at,amount:x.amount||x.net_amount,currency:x.currency||'EUR',project:x.project});});
 out.contracts.forEach(function(x){rows.push({type:'contract',label:'Kontratë',id:x.id,nr:x.title||x.contract_nr||x.file_name||'Kontratë',date:x.created_at,amount:null,currency:'EUR',project:x.project,contract_type:x.contract_type});});
 out.files.forEach(function(x){rows.push({type:'file',label:'Skedar',id:x.id,nr:x.file_name,date:x.created_at,amount:null,currency:'EUR',file_type:x.file_type});});
 return rows.sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''));});
}
async function loadAll(id){
 var out=await Promise.all([
  q('documents_registry?project_id=eq.'+enc(id)+'&select=*&order=created_at.desc&limit=1000'),
  q('invoices_out?project_id=eq.'+enc(id)+'&select=*&order=created_at.desc&limit=1000'),
  q('commercial_adjustments?project_id=eq.'+enc(id)+'&select=*&order=created_at.desc&limit=1000'),
  q('invoices_in?project_id=eq.'+enc(id)+'&select=*&order=created_at.desc&limit=1000'),
  q('contracts?project_id=eq.'+enc(id)+'&select=*&order=created_at.desc&limit=1000'),
  q('files?project_id=eq.'+enc(id)+'&select=id,project_id,file_name,file_type,size_kb,created_at&order=created_at.desc&limit=1000')
 ]);
 return{offers:out[0],outgoing:out[1],adjustments:out[2],incoming:out[3],contracts:out[4],files:out[5]};
}
function updateSmart(data){var map={Dokumente:data.offers.length+data.outgoing.length+data.adjustments.length+data.incoming.length+data.contracts.length+data.files.length,Fatura:data.outgoing.length,Skedarë:data.files.length};document.querySelectorAll('.pst-ws-smart button').forEach(function(b){var s=b.querySelector('span'),n=b.querySelector('b');if(s&&n&&Object.prototype.hasOwnProperty.call(map,s.textContent.trim()))n.textContent=String(map[s.textContent.trim()]);});}
async function render(tab){
 var id=pid(),host=document.getElementById('pst-ws-project-tab');if(!id||!host)return;var token=++requestToken;host.innerHTML='<div class="pst-ws-card"><div class="pst-ws-empty">Duke ngarkuar të gjitha dokumentet e projektit…</div></div>';
 var data=await loadAll(id);if(token!==requestToken||id!==pid())return;updateSmart(data);var rows=normalizeData(data);
 if(tab==='files'){
  var fileRows=rows.filter(function(x){return x.type==='file'||x.type==='contract';});
  host.innerHTML=card('Skedarët dhe kontratat','Çdo skedar dhe kontratë e lidhur me këtë projekt',fileRows,'Nuk ka skedarë ose kontrata të lidhura me projektin.')+'<div style="height:14px"></div><section class="pst-ws-card"><div class="pst-ws-card-body"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="pst-ws-btn primary" onclick="pstWsWorkProject()">Ngarko skedarë</button><button class="pst-ws-btn" onclick="pstWsLegacy(\'library\')">Biblioteka globale</button><button class="pst-ws-btn" onclick="pstWsLegacy(\'contracts\')">Kontratat globale</button></div></div></section>';
 }else{
  var sales=rows.filter(function(x){return['offer','invoice','credit_note','debit_note'].indexOf(x.type)>-1;}),purchases=rows.filter(function(x){return x.type==='incoming';}),other=rows.filter(function(x){return x.type==='contract'||x.type==='file';});
  host.innerHTML=card('Oferta, faturat dhe korrigjimet','Dokumentet komerciale të lidhura me projektin',sales,'Nuk ka dokumente komerciale të lidhura.')+'<div style="height:14px"></div><div class="pst-ws-two">'+card('Faturat hyrëse','Faturat e furnitorëve për këtë projekt',purchases,'Nuk ka fatura hyrëse të lidhura.')+card('Kontratat dhe skedarët','Dokumentacioni mbështetës i projektit',other,'Nuk ka kontrata ose skedarë të lidhur.')+'</div>';
 }
 bindFiles(data.files);
}
function bindFiles(files){document.querySelectorAll('[data-file-open]').forEach(function(b){b.onclick=function(){var id=this.getAttribute('data-file-open'),f=arr(files).filter(function(x){return String(x.id)===String(id);})[0];if(!f)return;if(typeof window.downloadLibFile==='function')window.downloadLibFile(f.id,f.file_name||'Skedar',f.file_type||'');else if(typeof window.pstWsLegacy==='function')window.pstWsLegacy('library');};});}
function wrapTabs(){var base=window.pstWsProjectTab;if(typeof base!=='function'||base.__pstUnifiedDocs)return false;window.pstWsProjectTab=function(tab){var r=base.apply(this,arguments);if(tab==='commercial'||tab==='files')setTimeout(function(){render(tab);},30);return r;};window.pstWsProjectTab.__pstUnifiedDocs=true;tabWrapped=true;return true;}
function wrapOpen(){var base=window.pstOpenProjectWorkspace;if(typeof base!=='function'||base.__pstUnifiedDocs)return false;window.pstOpenProjectWorkspace=async function(){var r=await base.apply(this,arguments);setTimeout(async function(){var id=pid();if(!id)return;try{var data=await loadAll(id);updateSmart(data);}catch(e){}},80);return r;};window.pstOpenProjectWorkspace.__pstUnifiedDocs=true;openWrapped=true;return true;}
function start(){var n=0,t=setInterval(function(){wrapTabs();wrapOpen();if(tabWrapped&&openWrapped&&++n>20)clearInterval(t);else if(++n>240)clearInterval(t);},100);window.addEventListener('pst:document-project-audit',function(){var active=document.querySelector('.pst-ws-tab.active'),tab=active&&active.getAttribute('data-tab');if(tab==='commercial'||tab==='files')render(tab);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();