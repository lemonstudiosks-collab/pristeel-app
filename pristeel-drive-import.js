/* PRISTEEL - importim i skedareve ne Google Drive */
(function(){
'use strict';

var ROOT_FOLDER_NAME='PRISTEEL - Projektet';
var DRIVE_SCOPE='https://www.googleapis.com/auth/drive';
var FOLDER_MIME='application/vnd.google-apps.folder';
var token='',tokenExp=0,pending=null;

function enc(v){return encodeURIComponent(String(v==null?'':v))}
function err(stage,e){var m=String(e&&e.message||e||'Gabim i panjohur');return new Error(stage+': '+m)}
function parse(text){if(!text)return{};try{return JSON.parse(text)}catch(e){return{text:text}}}
function getClientId(){return localStorage.getItem('pristeel_gclient')||''}
function clearToken(){token='';tokenExp=0;pending=null;if(window.PSTGoogleWorkspaceAuth)window.PSTGoogleWorkspaceAuth.clear()}

function authorize(){
  if(window.PSTGoogleWorkspaceAuth&&typeof window.PSTGoogleWorkspaceAuth.getDriveToken==='function'){
    return window.PSTGoogleWorkspaceAuth.getDriveToken({forceConsent:false}).then(function(t){token=t;tokenExp=Date.now()+50*60*1000;return t})
  }
  if(token&&Date.now()<tokenExp-30000)return Promise.resolve(token);
  if(pending)return pending;
  pending=new Promise(function(resolve,reject){
    var cid=getClientId();
    if(!cid){pending=null;reject(new Error('Mungon Google Client ID te Cilësimet.'));return}
    if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){pending=null;reject(new Error('Google Identity nuk u ngarkua.'));return}
    try{
      var client=google.accounts.oauth2.initTokenClient({
        client_id:cid,
        scope:DRIVE_SCOPE,
        include_granted_scopes:true,
        callback:function(r){pending=null;if(r&&r.access_token){token=r.access_token;tokenExp=Date.now()+((r.expires_in||3600)-60)*1000;resolve(token)}else reject(new Error((r&&r.error_description)||(r&&r.error)||'Autorizimi i Drive dështoi.'))},
        error_callback:function(e){pending=null;reject(new Error(e&&e.type==='popup_failed_to_open'?'Chrome e bllokoi dritaren e Google. Lejo pop-up-et dhe provo përsëri.':'Autorizimi i Drive dështoi.'))}
      });
      client.requestAccessToken({prompt:''})
    }catch(e){pending=null;reject(e)}
  });
  return pending
}

function xhrRequest(url,options){
  options=options||{};
  return authorize().then(function(t){
    return new Promise(function(resolve,reject){
      var x=new XMLHttpRequest();
      x.open(options.method||'GET',url,true);
      x.setRequestHeader('Authorization','Bearer '+t);
      Object.keys(options.headers||{}).forEach(function(k){x.setRequestHeader(k,options.headers[k])});
      if(options.responseType)x.responseType=options.responseType;
      if(options.onProgress)x.upload.onprogress=function(ev){if(ev.lengthComputable)options.onProgress(Math.round(ev.loaded/ev.total*100))};
      x.onload=function(){
        if(x.status>=200&&x.status<300){resolve({data:parse(x.responseText),xhr:x});return}
        var body=parse(x.responseText),detail=(body&&body.error&&body.error.message)||x.responseText||('HTTP '+x.status);
        if(x.status===401||x.status===403)clearToken();
        reject(new Error('Google Drive '+x.status+': '+String(detail).slice(0,300)))
      };
      x.onerror=function(){reject(new Error('Lidhja me Google Drive dështoi para se serveri të kthente përgjigje.'))};
      x.ontimeout=function(){reject(new Error('Google Drive nuk u përgjigj brenda afatit.'))};
      x.timeout=120000;
      x.send(options.body==null?null:options.body)
    })
  })
}
function drive(path,options){return xhrRequest('https://www.googleapis.com/drive/v3'+path,options).then(function(r){return r.data})}

async function getProject(projectId){
  try{
    var rows=await supaFetch('projects?id=eq.'+enc(projectId)+'&select=id,name,drive_folder_id,drive_folder_url&limit=1');
    if(!rows||!rows.length)throw new Error('Projekti nuk u gjet.');
    return rows[0]
  }catch(e){throw err('Leximi i projektit nga databaza',e)}
}
async function findFolder(name,parentId){
  var q="name='"+String(name||'').replace(/'/g,"\\'")+"' and mimeType='"+FOLDER_MIME+"' and trashed=false";
  if(parentId)q+=" and '"+parentId+"' in parents";
  var r=await drive('/files?q='+enc(q)+'&fields='+enc('files(id,name,webViewLink)')+'&pageSize=10');
  return r.files&&r.files[0]||null
}
async function createFolder(name,parentId){
  var body={name:name,mimeType:FOLDER_MIME};if(parentId)body.parents=[parentId];
  return drive('/files?fields='+enc('id,name,webViewLink'),{method:'POST',headers:{'Content-Type':'application/json;charset=UTF-8'},body:JSON.stringify(body)})
}
async function findOrCreateFolder(name,parentId){return(await findFolder(name,parentId))||createFolder(name,parentId)}
async function ensureProjectFolder(project){
  if(project.drive_folder_id)return{id:project.drive_folder_id,webViewLink:project.drive_folder_url||('https://drive.google.com/drive/folders/'+project.drive_folder_id)};
  var root;
  try{root=await findOrCreateFolder(ROOT_FOLDER_NAME,null)}catch(e){throw err('Krijimi ose gjetja e dosjes kryesore në Drive',e)}
  var safe=String(project.name||'Projekt').replace(/[\\/:*?"<>|]/g,'-').slice(0,90),folder;
  try{folder=await findOrCreateFolder(safe,root.id)}catch(e){throw err('Krijimi ose gjetja e dosjes së projektit',e)}
  var url=folder.webViewLink||('https://drive.google.com/drive/folders/'+folder.id);
  try{await supaFetch('projects?id=eq.'+enc(project.id),'PATCH',{drive_folder_id:folder.id,drive_folder_url:url})}catch(e){throw err('Ruajtja e lidhjes së dosjes në databazë',e)}
  return{id:folder.id,webViewLink:url}
}
async function listFolderFiles(folderId){
  try{
    var q="'"+folderId+"' in parents and trashed=false";
    var r=await drive('/files?q='+enc(q)+'&fields='+enc('files(id,name,size,modifiedTime)')+'&pageSize=1000');
    return r.files||[]
  }catch(e){throw err('Kontrolli i skedarëve ekzistues në Drive',e)}
}

async function startUpload(file,folderId){
  var meta={name:file.name,parents:[folderId]};
  var r=await xhrRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields='+enc('id,name,webViewLink,size,mimeType'),{
    method:'POST',
    headers:{'Content-Type':'application/json;charset=UTF-8','X-Upload-Content-Type':file.type||'application/octet-stream','X-Upload-Content-Length':String(file.size||0)},
    body:JSON.stringify(meta)
  });
  var location=r.xhr.getResponseHeader('Location');
  if(!location)throw new Error('Google Drive nuk ktheu adresën e ngarkimit.');
  return location
}
async function uploadFile(file,folderId,onProgress){
  var location;
  try{location=await startUpload(file,folderId)}catch(e){throw err('Nisja e ngarkimit për '+file.name,e)}
  try{
    var r=await xhrRequest(location,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream'},body:file,onProgress:onProgress});
    return r.data
  }catch(e){throw err('Ngarkimi i skedarit '+file.name,e)}
}

async function importFiles(projectId,files,onStatus){
  files=Array.prototype.slice.call(files||[]);
  if(!files.length)return{uploaded:0,skipped:0,folder:null,files:[]};
  if(onStatus)onStatus({phase:'auth',message:'Duke verifikuar qasjen në Google Drive…'});
  try{await authorize()}catch(e){throw err('Autorizimi i Google Drive',e)}

  var project=await getProject(projectId);
  if(onStatus)onStatus({phase:'folder',message:'Duke përgatitur dosjen e projektit…'});
  var folder=await ensureProjectFolder(project);
  var existing=await listFolderFiles(folder.id),known={};
  existing.forEach(function(x){known[String(x.name||'')+'|'+String(x.size||0)]=true});

  var uploaded=[],skipped=0;
  for(var i=0;i<files.length;i++){
    var file=files[i],key=String(file.name||'')+'|'+String(file.size||0);
    if(known[key]){skipped++;if(onStatus)onStatus({phase:'skip',index:i+1,total:files.length,name:file.name,message:'Ekziston tashmë: '+file.name});continue}
    if(onStatus)onStatus({phase:'upload',index:i+1,total:files.length,name:file.name,percent:0,message:'Duke ruajtur '+file.name+'…'});
    var result=await uploadFile(file,folder.id,function(percent){if(onStatus)onStatus({phase:'upload',index:i+1,total:files.length,name:file.name,percent:percent,message:'Duke ruajtur '+file.name+' · '+percent+'%'})});
    uploaded.push(result);known[key]=true
  }
  if(onStatus)onStatus({phase:'done',message:uploaded.length+' skedarë u ruajtën në projekt'+(skipped?' · '+skipped+' ekzistonin tashmë.':'.')});
  return{uploaded:uploaded.length,skipped:skipped,folder:folder,files:uploaded}
}

window.PSTDriveImport={
  authorize:authorize,
  importFiles:importFiles,
  ensureProjectFolderById:async function(projectId){await authorize();return ensureProjectFolder(await getProject(projectId))}
};
})();
