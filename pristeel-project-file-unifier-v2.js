/* PRISTEEL project file unifier
 * Makes file-bearing registry rows visible in the project Files tab and counter.
 * Bridges a new browser/device to the project's permanent Drive folder only after an explicit user click.
 * Verifies the connected Google account and the concrete project folder before treating Drive as linked.
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
function workspace(){return window.PSTGoogleWorkspaceAuth||null;}
function driveToken(){var G=workspace();return G&&typeof G.currentToken==='function'?G.currentToken([G.driveScope]):'';}
async function api(url,token){
  var r=await fetch(url,{headers:{Authorization:'Bearer '+token}}),data={};
  try{data=await r.json();}catch(e){}
  return{ok:r.ok,status:r.status,data:data};
}
async function driveSnapshot(folderId,withAccount){
  var G=workspace(),token=driveToken();
  if(!G||!token)return{state:'not-authorized',rows:[]};
  var accountEmail='',accountName='';
  if(withAccount){
    try{
      var about=await api('https://www.googleapis.com/drive/v3/about?fields='+encodeURIComponent('user(displayName,emailAddress)'),token);
      if(about.ok&&about.data&&about.data.user){accountEmail=about.data.user.emailAddress||'';accountName=about.data.user.displayName||'';}
    }catch(ignore){}
  }
  var metaUrl='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(folderId)+'?fields='+encodeURIComponent('id,name,mimeType,owners(displayName,emailAddress)')+'&supportsAllDrives=true';
  var meta;
  try{meta=await api(metaUrl,token);}catch(e){return{state:'error',rows:[],accountEmail:accountEmail,accountName:accountName,error:String(e&&e.message||e)};}
  if(meta.status===401)return{state:'not-authorized',rows:[],accountEmail:accountEmail,accountName:accountName,error:'Drive 401'};
  if(meta.status===403||meta.status===404)return{state:'folder-inaccessible',rows:[],accountEmail:accountEmail,accountName:accountName,error:'Drive '+meta.status};
  if(!meta.ok)return{state:'error',rows:[],accountEmail:accountEmail,accountName:accountName,error:'Drive '+meta.status};
  var owners=arr(meta.data&&meta.data.owners),ownerEmail=owners[0]&&owners[0].emailAddress||'',folderName=meta.data&&meta.data.name||'';
  var q="'"+folderId+"' in parents and trashed=false";
  var listUrl='https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+'&fields='+encodeURIComponent('files(id,name,size,modifiedTime,webViewLink,mimeType)')+'&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&spaces=drive';
  var list;
  try{list=await api(listUrl,token);}catch(e){return{state:'error',rows:[],accountEmail:accountEmail,accountName:accountName,ownerEmail:ownerEmail,folderName:folderName,error:String(e&&e.message||e)};}
  if(!list.ok)return{state:list.status===401?'not-authorized':'error',rows:[],accountEmail:accountEmail,accountName:accountName,ownerEmail:ownerEmail,folderName:folderName,error:'Drive '+list.status};
  return{state:'ok',rows:arr(list.data&&list.data.files),accountEmail:accountEmail,accountName:accountName,ownerEmail:ownerEmail,folderName:folderName};
}
function unify(data){
  if(!data)return data;
  var registryFiles=arr(data.docs).filter(fileBearing);
  data.projectDocs=uniq(arr(data.projectDocs).concat(registryFiles));
  data.files=uniq(arr(data.files).concat(data.projectDocs,arr(data.attachmentLinks),arr(data.inboxDocs),data.drive&&arr(data.drive.rows)||[],arr(data.mailAttachments)));
  if(data.integration&&data.drive)data.integration.driveState=data.drive.state;
  return data;
}
function decorate(){
  var d=current(),p=d&&d.project||{},drive=d&&d.drive||{},state=drive.state||'';
  if(!p.drive_folder_id||state==='ok')return false;
  var host=document.getElementById('pst-pi-body');if(!host)return false;
  var link=host.querySelector('a.pf2-btn[href*="drive.google.com/drive/folders/"]');if(!link)return false;
  var reconnect=state==='folder-inaccessible';
  link.textContent=reconnect?'Ndërro llogarinë Drive':'Lidhu me Drive';
  link.removeAttribute('target');
  link.setAttribute('data-pst-drive-connect','1');
  if(reconnect)link.setAttribute('data-pst-drive-reconnect','1');else link.removeAttribute('data-pst-drive-reconnect');
  if(state==='not-authorized')note('Dosja permanente e projektit është në Google Drive. Autorizo Drive në këtë pajisje që të shfaqen të gjithë skedarët e projektit.');
  else if(state==='folder-inaccessible')note('Drive u lidh'+(drive.accountEmail?' me '+drive.accountEmail:'')+', por kjo llogari nuk ka qasje te dosja e këtij projekti. Kliko “Ndërro llogarinë Drive” dhe zgjidh llogarinë që ka qasje.');
  else if(state==='module-missing')note('Dosja e projektit është lidhur, por moduli Google Drive nuk është gati në këtë pajisje. Rifresko faqen dhe provo përsëri.');
  else if(state==='error')note('Dosja e projektit është lidhur, por Google Drive nuk u lexua'+(drive.accountEmail?' me '+drive.accountEmail:'')+'. Kliko “Lidhu me Drive” për ta provuar përsëri.');
  return true;
}
async function authorize(force){
  var G=workspace(),I=window.PSTDriveImport;
  if(force&&G&&typeof G.clear==='function'&&typeof G.getDriveToken==='function'){
    G.clear();return G.getDriveToken({forceConsent:true});
  }
  if(I&&typeof I.authorize==='function')return I.authorize();
  if(G&&typeof G.getDriveToken==='function')return G.getDriveToken({forceConsent:!!force});
  throw new Error('Google Drive nuk është gati. Rifresko faqen dhe provo përsëri.');
}
async function connectDrive(link){
  var d=current(),p=d&&d.project||{};
  if(!p.id||!p.drive_folder_id)return;
  var old=link.textContent,force=link.getAttribute('data-pst-drive-reconnect')==='1';
  link.textContent=force?'Duke ndërruar llogarinë…':'Duke u lidhur…';link.setAttribute('aria-disabled','true');
  try{
    await authorize(force);
    var snap=await driveSnapshot(p.drive_folder_id,true);
    if(snap.state!=='ok'){
      d.drive=snap;if(d.integration)d.integration.driveState=snap.state;
      window.__pstIntegrityLastData=unify(d);
      if(window.PSTProjectFirstV2&&typeof window.PSTProjectFirstV2.render==='function')window.PSTProjectFirstV2.render('files');
      scheduleDecorate();
      return;
    }
    var fresh=await original.call(A,p.id);
    fresh.drive=snap;
    window.__pstIntegrityLastData=unify(fresh);
    if(window.PSTProjectFirstV2&&typeof window.PSTProjectFirstV2.render==='function')window.PSTProjectFirstV2.render('files');
    note('Google Drive u lidh'+(snap.accountEmail?' me '+snap.accountEmail:'')+'. U lexuan '+snap.rows.length+' skedarë nga dosja permanente e projektit.');
  }catch(e){
    note('Google Drive nuk u lidh: '+String(e&&e.message||e||'Gabim i panjohur'));
    link.textContent=old||'Lidhu me Drive';
  }finally{link.removeAttribute('aria-disabled');}
}
A.load=async function(id){
  var data=await original.apply(this,arguments);
  if(!data)return data;
  var p=data.project||{},drive=data.drive||{};
  if(p.drive_folder_id&&driveToken()&&(drive.state!=='ok'||!arr(drive.rows).length)){
    var snap=await driveSnapshot(p.drive_folder_id,false);
    if(snap.state==='ok'||drive.state!=='ok')data.drive=snap;
  }
  unify(data);
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