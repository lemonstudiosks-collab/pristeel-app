/* PRISTEEL project file unifier
 * Makes file-bearing registry rows visible in the project Files tab and counter.
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
A.load=async function(id){
  var data=await original.apply(this,arguments);
  if(!data)return data;
  var registryFiles=arr(data.docs).filter(fileBearing);
  data.projectDocs=uniq(arr(data.projectDocs).concat(registryFiles));
  data.files=uniq(arr(data.files).concat(data.projectDocs,arr(data.attachmentLinks),arr(data.inboxDocs),data.drive&&arr(data.drive.rows)||[],arr(data.mailAttachments)));
  return data;
};
})();
