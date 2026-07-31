/* PRISTEEL — importim automatik i skedarëve në Google Drive */
(function(){
'use strict';

var ROOT_FOLDER_NAME='PRISTEEL — Projektet';
var DRIVE_SCOPE='https://www.googleapis.com/auth/drive';
var token=null, tokenExp=0;

function getKeys(){
  return {clientId:localStorage.getItem('pristeel_gclient')||''};
}

function getToken(){
  return new Promise(function(resolve,reject){
    if(token&&Date.now()<tokenExp){resolve(token);return;}
    var keys=getKeys();
    if(!keys.clientId){reject(new Error('Mungon Google Client ID te Cilësimet.'));return;}
    if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){
      reject(new Error('Google Identity nuk u ngarkua.'));return;
    }
    try{
      var client=google.accounts.oauth2.initTokenClient({
        client_id:keys.clientId,
        scope:DRIVE_SCOPE,
        prompt:'consent',
        callback:function(r){
          if(r&&r.access_token){
            token=r.access_token;
            tokenExp=Date.now()+((r.expires_in||3600)-60)*1000;
            resolve(token);
          }else reject(new Error((r&&r.error_description)||'Autorizimi i Google Drive dështoi.'));
        }
      });
      client.requestAccessToken();
    }catch(e){reject(e);}
  });
}

async function drive(path,opts){
  opts=opts||{};
  var t=await getToken();
  var r=await fetch('https://www.googleapis.com/drive/v3'+path,{
    method:opts.method||'GET',
    headers:Object.assign({Authorization:'Bearer '+t},opts.headers||{}),
    body:opts.body
  });
  var text=await r.text();
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
  var body={name:name,mimeType:'application/vnd.google-apps.folder'};
  if(parentId)body.parents=[parentId];
  return drive('/files?fields=id,name,webViewLink',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
}

async function ensureProjectFolder(project){
  if(project.drive_folder_id){
    return {id:project.drive_folder_id,webViewLink:project.drive_folder_url||('https://drive.google.com/drive/folders/'+project.drive_folder_id)};
  }
  var root=await findOrCreateFolder(ROOT_FOLDER_NAME,null);
  var safe=String(project.name||'Projekt').replace(/[\\/:*?"<>|]/g,'-').slice(0,90);
  var folder=await findOrCreateFolder(safe,root.id);
  var url=folder.webViewLink||('https://drive.google.com/drive/folders/'+folder.id);
  await supaFetch('projects?id=eq.'+encodeURIComponent(project.id),'PATCH',{
    drive_folder_id:folder.id,
    drive_folder_url:url
  });
  return {id:folder.id,webViewLink:url};
}

function uploadFile(file,folderId,onProgress){
  return new Promise(function(resolve,reject){
    getToken().then(function(t){
      var meta={name:file.name,parents:[folderId]};
      var boundary='-------pst-gmail-'+Date.now()+'-'+Math.random().toString(16).slice(2);
      var reader=new FileReader();
      reader.onload=function(){
        var b64=String(reader.result||'').split(',')[1]||'';
        var body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'
          +JSON.stringify(meta)+'\r\n'
          +'--'+boundary+'\r\nContent-Type: '+(file.type||'application/octet-stream')
          +'\r\nContent-Transfer-Encoding: base64\r\n\r\n'+b64+'\r\n'
          +'--'+boundary+'--';
        var xhr=new XMLHttpRequest();
        xhr.open('POST','https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size,mimeType');
        xhr.setRequestHeader('Authorization','Bearer '+t);
        xhr.setRequestHeader('Content-Type','multipart/related; boundary='+boundary);
        xhr.upload.onprogress=function(ev){
          if(ev.lengthComputable&&onProgress)onProgress(Math.round(ev.loaded/ev.total*100));
        };
        xhr.onload=function(){
          if(xhr.status>=200&&xhr.status<300){
            try{resolve(JSON.parse(xhr.responseText));}catch(e){reject(e);}
          }else reject(new Error('Upload '+xhr.status+': '+xhr.responseText.slice(0,240)));
        };
        xhr.onerror=function(){reject(new Error('Ngarkimi në Drive dështoi për shkak të rrjetit.'));};
        xhr.send(body);
      };
      reader.onerror=function(){reject(new Error('Leximi i skedarit dështoi.'));};
      reader.readAsDataURL(file);
    }).catch(reject);
  });
}

async function importFiles(projectId,files,onStatus){
  files=Array.prototype.slice.call(files||[]);
  if(!files.length)return {uploaded:0,folder:null,files:[]};
  var project=await getProject(projectId);
  if(onStatus)onStatus({phase:'folder',message:'Duke përgatitur dosjen e projektit…'});
  var folder=await ensureProjectFolder(project);
  var uploaded=[];
  for(var i=0;i<files.length;i++){
    if(onStatus)onStatus({phase:'upload',index:i+1,total:files.length,name:files[i].name,percent:0});
    var result=await uploadFile(files[i],folder.id,function(percent){
      if(onStatus)onStatus({phase:'upload',index:i+1,total:files.length,name:files[i].name,percent:percent});
    });
    uploaded.push(result);
  }
  if(onStatus)onStatus({phase:'done',message:uploaded.length+' skedarë u ruajtën në projekt.'});
  return {uploaded:uploaded.length,folder:folder,files:uploaded};
}

window.PSTDriveImport={
  importFiles:importFiles,
  ensureProjectFolderById:async function(projectId){return ensureProjectFolder(await getProject(projectId));}
};

})();
