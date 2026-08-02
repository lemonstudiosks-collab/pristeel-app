/* PRISTEEL — importim automatik i skedarëve në Google Drive */
(function(){
'use strict';

var ROOT_FOLDER_NAME='PRISTEEL — Projektet';
var DRIVE_SCOPE='https://www.googleapis.com/auth/drive';
var TOKEN_KEY='pst_drive_token';
var EXP_KEY='pst_drive_token_exp';
var token=null,tokenExp=0,pending=null;

function getKeys(){return{clientId:localStorage.getItem('pristeel_gclient')||''};}
function restoreToken(){
  try{
    var saved=sessionStorage.getItem(TOKEN_KEY)||'';
    var exp=parseInt(sessionStorage.getItem(EXP_KEY)||'0',10)||0;
    if(saved&&Date.now()<exp-30000){token=saved;tokenExp=exp;return saved;}
  }catch(e){}
  return'';
}
function saveToken(value,expiresIn){
  token=value;tokenExp=Date.now()+((expiresIn||3600)-60)*1000;
  try{sessionStorage.setItem(TOKEN_KEY,token);sessionStorage.setItem(EXP_KEY,String(tokenExp));}catch(e){}
  return token;
}
function popupError(type){
  if(type==='popup_failed_to_open')return'Chrome e bllokoi dritaren e Google. Lejo pop-up-et për lemonstudiosks-collab.github.io dhe provo përsëri.';
  if(type==='popup_closed')return'Dritarja e Google u mbyll para përfundimit të autorizimit.';
  return'Autorizimi i Google Drive dështoi.';
}
function getToken(){
  if(window.PSTGoogleWorkspaceAuth&&typeof window.PSTGoogleWorkspaceAuth.getToken==='function'){
    return window.PSTGoogleWorkspaceAuth.getToken().then(function(t){token=t;tokenExp=Date.now()+55*60*1000;return t;});
  }
  if(token&&Date.now()<tokenExp-30000)return Promise.resolve(token);
  var restored=restoreToken();if(restored)return Promise.resolve(restored);
  if(pending)return pending;
  pending=new Promise(function(resolve,reject){
    var keys=getKeys();
    if(!keys.clientId){pending=null;reject(new Error('Mungon Google Client ID te Cilësimet.'));return;}
    if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){pending=null;reject(new Error('Google Identity nuk u ngarkua.'));return;}
    var settled=false;
    var timeout=setTimeout(function(){if(settled)return;settled=true;pending=null;reject(new Error('Google nuk e ktheu autorizimin. Kontrollo nëse Chrome ka bllokuar pop-up-in.'));},90000);
    try{
      var client=google.accounts.oauth2.initTokenClient({
        client_id:keys.clientId,
        scope:DRIVE_SCOPE,
        prompt:'',
        include_granted_scopes:true,
        callback:function(r){
          if(settled)return;settled=true;clearTimeout(timeout);pending=null;
          if(r&&r.access_token)resolve(saveToken(r.access_token,r.expires_in));
          else reject(new Error((r&&r.error_description)||(r&&r.error)||'Autorizimi i Google Drive dështoi.'));
        },
        error_callback:function(e){
          if(settled)return;settled=true;clearTimeout(timeout);pending=null;
          reject(new Error(popupError(e&&e.type)));
        }
      });
      client.requestAccessToken({prompt:''});
    }catch(e){if(!settled){settled=true;clearTimeout(timeout);pending=null;reject(e);}}
  });
  return pending;
}
async function drive(path,opts){
  opts=opts||{};var t=await getToken();
  var r=await fetch('https://www.googleapis.com/drive/v3'+path,{method:opts.method||'GET',headers:Object.assign({Authorization:'Bearer '+t},opts.headers||{}),body:opts.body});
  var text=await r.text();
  if(r.status===401&&window.PSTGoogleWorkspaceAuth){window.PSTGoogleWorkspaceAuth.clear();token='';tokenExp=0;}
  if(!r.ok)throw new Error('Drive '+r.status+': '+text.slice(0,240));
  return text?JSON.parse(text):{};
}
async function getProject(projectId){
  if(typeof supaFetch!=='function')throw new Error('Lidhja me databazën nuk është gati.');
  var rows=await supaFetch('projects?id=eq.'+encodeURIComponent(projectId)+'&select=id,name,drive_folder_id,drive_folder_url');
  if(!rows||!rows.length)throw new Error('Projekti nuk u gjet.');
  return rows[0];
}
async function findOrCreateFolder(name,parentId){
  var q="name='"+String(name||'').replace(/'/g,"\\'")+"' and mimeType='application/vnd.google-apps.folder' and trashed=false";
  if(parentId)q+=" and '"+parentId+"' in parents";
  var found=await drive('/files?q='+encodeURIComponent(q)+'&fields=files(id,name,webViewLink)&pageSize=1');
  if(found.files&&found.files.length)return found.files[0];
  var body={name:name,mimeType:'application/vnd.google-apps.folder'};if(parentId)body.parents=[parentId];
  return drive('/files?fields=id,name,webViewLink',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
}
async function ensureProjectFolder(project){
  if(project.drive_folder_id)return{id:project.drive_folder_id,webViewLink:project.drive_folder_url||('https://drive.google.com/drive/folders/'+project.drive_folder_id)};
  var root=await findOrCreateFolder(ROOT_FOLDER_NAME,null);
  var safe=String(project.name||'Projekt').replace(/[\\/:*?"<>|]/g,'-').slice(0,90);
  var folder=await findOrCreateFolder(safe,root.id),url=folder.webViewLink||('https://drive.google.com/drive/folders/'+folder.id);
  await supaFetch('projects?id=eq.'+encodeURIComponent(project.id),'PATCH',{drive_folder_id:folder.id,drive_folder_url:url});
  return{id:folder.id,webViewLink:url};
}
async function listFolderFiles(folderId){
  var q="'"+folderId+"' in parents and trashed=false";
  var r=await drive('/files?q='+encodeURIComponent(q)+'&fields=files(id,name,size)&pageSize=1000');return r.files||[];
}
function uploadFile(file,folderId,onProgress){
  return new Promise(function(resolve,reject){
    getToken().then(function(t){
      var meta={name:file.name,parents:[folderId]},boundary='-------pst-gmail-'+Date.now()+'-'+Math.random().toString(16).slice(2),reader=new FileReader();
      reader.onload=function(){
        var b64=String(reader.result||'').split(',')[1]||'';
        var body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)+'\r\n--'+boundary+'\r\nContent-Type: '+(file.type||'application/octet-stream')+'\r\nContent-Transfer-Encoding: base64\r\n\r\n'+b64+'\r\n--'+boundary+'--';
        var xhr=new XMLHttpRequest();
        xhr.open('POST','https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size,mimeType');
        xhr.setRequestHeader('Authorization','Bearer '+t);xhr.setRequestHeader('Content-Type','multipart/related; boundary='+boundary);
        xhr.upload.onprogress=function(ev){if(ev.lengthComputable&&onProgress)onProgress(Math.round(ev.loaded/ev.total*100));};
        xhr.onload=function(){if(xhr.status>=200&&xhr.status<300){try{resolve(JSON.parse(xhr.responseText));}catch(e){reject(e);}}else reject(new Error('Upload '+xhr.status+': '+xhr.responseText.slice(0,240)));};
        xhr.onerror=function(){reject(new Error('Ngarkimi në Drive dështoi për shkak të rrjetit.'));};xhr.send(body);
      };
      reader.onerror=function(){reject(new Error('Leximi i skedarit dështoi.'));};reader.readAsDataURL(file);
    }).catch(reject);
  });
}
async function importFiles(projectId,files,onStatus){
  files=Array.prototype.slice.call(files||[]);if(!files.length)return{uploaded:0,folder:null,files:[]};
  var project=await getProject(projectId);if(onStatus)onStatus({phase:'folder',message:'Duke përgatitur dosjen e projektit…'});
  var folder=await ensureProjectFolder(project),existing=await listFolderFiles(folder.id),known={};
  existing.forEach(function(x){known[String(x.name||'')+'|'+String(x.size||0)]=true;});
  var uploaded=[],skipped=0;
  for(var i=0;i<files.length;i++){
    var fileKey=String(files[i].name||'')+'|'+String(files[i].size||0);
    if(known[fileKey]){skipped++;if(onStatus)onStatus({phase:'skip',index:i+1,total:files.length,name:files[i].name,message:'Ekziston tashmë: '+files[i].name});continue;}
    if(onStatus)onStatus({phase:'upload',index:i+1,total:files.length,name:files[i].name,percent:0});
    var result=await uploadFile(files[i],folder.id,function(percent){if(onStatus)onStatus({phase:'upload',index:i+1,total:files.length,name:files[i].name,percent:percent});});
    uploaded.push(result);known[fileKey]=true;
  }
  if(onStatus)onStatus({phase:'done',message:uploaded.length+' skedarë u ruajtën në projekt'+(skipped?' · '+skipped+' ekzistonin tashmë.':'.')});
  return{uploaded:uploaded.length,skipped:skipped,folder:folder,files:uploaded};
}
window.PSTDriveImport={authorize:getToken,importFiles:importFiles,ensureProjectFolderById:async function(projectId){return ensureProjectFolder(await getProject(projectId));}};
})();
