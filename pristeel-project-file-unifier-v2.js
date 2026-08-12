/* PRISTEEL project file unifier
 * Makes file-bearing registry rows visible in the project Files tab and counter.
 * Bridges a new browser/device to the project's permanent Drive folder only after an explicit user click.
 */
(function(){
'use strict';
var A=window.PSTProjectDataIntegrity;
if(!A||A.__pstFileUnifierV2||typeof A.load!=='function')return;
A.__pstFileUnifierV2=true;
var original=A.load;
function arr(v){return Array.isArray(v)?v:[];}
function key(x){return String(x&&(x.id||x.file_id||x.drive_file_id||x.document_id||x.file_name||x.filename||x.name||x.doc_nr||x.document_nr)||'');}
function uniq(rows){var seen={};return rows.filter(function(x){var k=key(x);if(!k||seen[k])return false;seen[k]=1;return true;});}
function fileBearing(x){return !!(x&&(x.file_name||x.filename||x.file_url||x.drive_url||x.web_view_link||x.webViewLink||x.drive_file_id||x.file_id||x.mime_type||x.mimeType));}
function current(){return window.__pstIntegrityLastData||null;}
function note(text){var e=document.querySelector('#pst-pi-body .pf2-note');if(e)e.textContent=text;}
function scheduleDecorate(){[0,180,650].forEach(function(ms){setTimeout(decorate,ms);});}
function decorate(){
  var d=current(),p=d&&d.project||{},state=d&&d.drive&&d.drive.state||'';
  if(!p.drive_folder_id||state==='ok')return false;
  var host=document.getElementById('pst-pi-body');if(!host)return false;
  var link=host.querySelector('a.pf2-btn[href*="drive.google.com/drive/folders/"]');if(!link)return false;
  link.textContent='Lidhu me Drive';
  link.removeAttribute('target');
  link.setAttribute('data-pst-drive-connect','1');
  if(state==='not-authorized')note('Dosja permanente e projektit është në Google Drive. Autorizo Drive në këtë pajisje që të shfaqen të gjithë skedarët e projektit.');
  else if(state==='module-missing')note('Dosja e projektit është lidhur, por moduli Google Drive nuk është gati në këtë pajisje. Rifresko faqen dhe provo përsëri.');
  else if(state==='error')note('Dosja e projektit është lidhur, por lista e Google Drive nuk u lexua. Kliko “Lidhu me Drive” për ta provuar përsëri.');
  return true;
}
async function connectDrive(link){
  var d=current(),p=d&&d.project||{};
  if(!p.id||!p.drive_folder_id)return;
  var I=window.PSTDriveImport;
  if(!I||typeof I.authorize!=='function'){
    note('Google Drive nuk është gati. Rifresko faqen dhe provo përsëri.');
    return;
  }
  var old=link.textContent;
  link.textContent='Duke u lidhur…';link.setAttribute('aria-disabled','true');
  try{
    await I.authorize();
    var fresh=await A.load(p.id);
    window.__pstIntegrityLastData=fresh;
    if(window.PSTProjectFirstV2&&typeof window.PSTProjectFirstV2.render==='function')window.PSTProjectFirstV2.render('files');
    scheduleDecorate();
  }catch(e){
    note('Google Drive nuk u lidh: '+String(e&&e.message||e||'Gabim i panjohur'));
    link.textContent=old||'Lidhu me Drive';
  }finally{link.removeAttribute('aria-disabled');}
}
A.load=async function(id){
  var data=await original.apply(this,arguments);
  if(!data)return data;
  var registryFiles=arr(data.docs).filter(fileBearing);
  data.projectDocs=uniq(arr(data.projectDocs).concat(registryFiles));
  data.files=uniq(arr(data.files).concat(data.projectDocs,arr(data.attachmentLinks),arr(data.inboxDocs),data.drive&&arr(data.drive.rows)||[],arr(data.mailAttachments)));
  setTimeout(function(){if(window.__pstIntegrityLastData===data)scheduleDecorate();},0);
  return data;
};
document.addEventListener('click',function(e){
  var c=e.target.closest&&e.target.closest('[data-pst-drive-connect="1"]');
  if(c){e.preventDefault();e.stopPropagation();connectDrive(c);return;}
  var t=e.target.closest&&e.target.closest('[data-pf2-tab="files"]');
  if(t)scheduleDecorate();
},true);
document.addEventListener('pst:modules-ready',scheduleDecorate,{once:true});
})();
