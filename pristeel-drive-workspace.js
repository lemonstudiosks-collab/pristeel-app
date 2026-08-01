/* PRISTEEL Drive Workspace: audit i gjithë Drive-it mbi motorin rekursiv */
(function(){
'use strict';
if(window.__pstDriveWorkspaceLoaded)return;
window.__pstDriveWorkspaceLoaded=true;

var FOLDER='application/vnd.google-apps.folder';
var running=false;

function arr(v){return Array.isArray(v)?v:[]}
function enc(v){return encodeURIComponent(String(v==null?'':v))}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function uniqById(items){var seen={},out=[];arr(items).forEach(function(x){if(x&&x.id&&!seen[x.id]){seen[x.id]=1;out.push(x)}});return out}
function setNote(text,color){var e=document.getElementById('pdi-note');if(e){e.textContent=text||'';e.style.color=color||'var(--text3,#7A8086)'}}
function progress(on,pct){var a=document.getElementById('pdi-progress'),b=document.getElementById('pdi-progress-fill');if(a)a.classList.toggle('on',!!on);if(b)b.style.width=Math.max(0,Math.min(100,Number(pct)||0))+'%'}
function busy(v){running=!!v;['pdi-run','pdi-open'].forEach(function(id){var e=document.getElementById(id);if(e)e.disabled=!!v})}
function stats(r){var v={folders:r.folders||0,files:r.all_files||0,preferred:r.preferred_files||0,duplicates:r.duplicates||0};Object.keys(v).forEach(function(k){var e=document.getElementById('pdi-'+k);if(e)e.textContent=String(v[k])})}

async function token(){
  if(!window.PSTDriveImport||typeof window.PSTDriveImport.authorize!=='function')throw new Error('Google Drive nuk është gati.');
  return window.PSTDriveImport.authorize()
}
async function query(q,t,fields){
  var out=[],page='';
  do{
    var u='https://www.googleapis.com/drive/v3/files?q='+enc(q)+'&fields='+enc('nextPageToken,files('+fields+')')+'&pageSize=1000&spaces=drive'+(page?'&pageToken='+enc(page):'');
    var r=await fetch(u,{headers:{Authorization:'Bearer '+t}}),text=await r.text(),data={};
    if(!r.ok)throw new Error('Google Drive '+r.status+': '+text.slice(0,180));
    try{data=JSON.parse(text)}catch(e){}
    out=out.concat(arr(data.files));page=data.nextPageToken||''
  }while(page&&out.length<10000);
  return out
}
async function projects(){try{return await supaFetch('projects?select=id,name,client,drive_folder_id,drive_folder_url&order=created_at.desc&limit=3000')}catch(e){return[]}}
function matchFolder(name,list){
  var n=norm(name),best=null,score=0;
  arr(list).forEach(function(p){
    var pn=norm(p.name),pc=norm(p.client),s=0;
    if(n&&pn&&n===pn)s=100;
    else if(n&&pn&&(n.indexOf(pn)>-1||pn.indexOf(n)>-1))s=84;
    else{
      var a=n.split(' ').filter(function(x){return x.length>3}),b=pn.split(' ').filter(function(x){return x.length>3});
      var common=a.filter(function(x){return b.indexOf(x)>-1}).length;
      s=Math.round(common/Math.max(1,Math.min(a.length,b.length))*72)
    }
    if(pc&&n.indexOf(pc)>-1)s+=12;
    if(s>score){score=s;best=p}
  });
  return{project:best,score:Math.min(100,score)}
}
async function countFolder(folderId,t){
  try{var rows=await query("'"+folderId+"' in parents and trashed=false",t,'id,mimeType');return rows.length}catch(e){return 0}
}
async function scanSharedFolders(folders,onStep){
  var allFolders=[],allFiles=[],truncated=false,limit=Math.min(folders.length,80);
  for(var i=0;i<limit;i++){
    try{
      var d=await window.PSTDriveIntelligence.scanProjectFolder(folders[i].id);
      allFolders=allFolders.concat(arr(d.folders));allFiles=allFiles.concat(arr(d.allFiles));truncated=truncated||!!d.truncated
    }catch(e){}
    if(onStep)onStep(i+1,limit)
  }
  if(folders.length>limit)truncated=true;
  return{folders:allFolders,files:allFiles,truncated:truncated}
}

async function auditAll(){
  if(running)return;
  busy(true);progress(true,3);setNote('Po lidhemi me Google Drive…');
  try{
    if(!window.PSTDriveIntelligence||typeof window.PSTDriveIntelligence.scanProjectFolder!=='function')throw new Error('Motori i Drive Intelligence nuk është ngarkuar.');
    var t=await token();
    setNote('Po hapet i gjithë My Drive, dosje pas dosjeje…');
    var mine=await window.PSTDriveIntelligence.scanProjectFolder('root');
    progress(true,58);

    setNote('Po kontrollohen edhe skedarët dhe dosjet e ndara me PRISTEEL…');
    var shared=await query('sharedWithMe=true and trashed=false',t,'id,name,mimeType,size,modifiedTime,createdTime,webViewLink,parents,md5Checksum,starred');
    var sharedFolders=shared.filter(function(x){return x.mimeType===FOLDER});
    var sharedScan=await scanSharedFolders(sharedFolders,function(done,total){progress(true,58+Math.round(done/Math.max(1,total)*24))});

    var allFiles=uniqById(arr(mine.allFiles).concat(shared.filter(function(x){return x.mimeType!==FOLDER}),sharedScan.files));
    var allFolders=uniqById(arr(mine.folders).concat(sharedFolders,sharedScan.folders));
    var versions=window.PSTDriveIntelligence.chooseVersions(allFiles),ps=await projects();
    progress(true,86);setNote('Po krahasohen dosjet me projektet ekzistuese…');

    var linked={};ps.forEach(function(p){if(p.drive_folder_id)linked[String(p.drive_folder_id)]=p});
    var top=await query("'root' in parents and mimeType='"+FOLDER+"' and trashed=false",t,'id,name,mimeType,modifiedTime,webViewLink,parents');
    top=uniqById(top.concat(sharedFolders));
    var candidates=[],autoLinked=[];
    for(var i=0;i<top.length;i++){
      var f=top[i];if(linked[String(f.id)])continue;
      var m=matchFolder(f.name,ps);
      if(m.project&&m.score>=97&&!m.project.drive_folder_id){
        try{
          await supaFetch('projects?id=eq.'+enc(m.project.id),'PATCH',{drive_folder_id:f.id,drive_folder_url:f.webViewLink||('https://drive.google.com/drive/folders/'+f.id)});
          autoLinked.push({folder:f,project:m.project});continue
        }catch(e){}
      }
      candidates.push({folder:f,file_count:await countFolder(f.id,t),match:m})
    }

    var result={
      at:new Date().toISOString(),folders:allFolders.length,all_files:allFiles.length,
      preferred_files:versions.files.length,duplicates:versions.duplicates.length,
      shared_items:shared.length,truncated:!!mine.truncated||!!sharedScan.truncated,
      auto_linked:autoLinked,candidates:candidates,projects:ps
    };
    localStorage.setItem('pst_drive_workspace_audit',JSON.stringify(result));
    localStorage.setItem('pst_drive_workspace_versions',JSON.stringify({at:result.at,preferred:versions.files.slice(0,800),duplicates:versions.duplicates.slice(0,800)}));
    stats(result);progress(false,100);
    setNote('Auditi përfundoi: '+result.all_files+' skedarë, '+result.folders+' dosje dhe '+result.duplicates+' grupe versionesh.','#2F7657');
    if(typeof window.pstDriveAuditOpen==='function')window.pstDriveAuditOpen()
  }catch(e){progress(false,0);setNote('Auditi dështoi: '+e.message,'#A64B42')}
  finally{busy(false)}
}

function install(){
  if(!window.PSTDriveIntelligence||!window.PSTDriveImport)return false;
  window.pstDriveAudit=auditAll;
  window.PSTDriveIntelligence.auditWorkspace=auditAll;
  var sub=document.querySelector('#pdi-card .pdi-sub');
  if(sub)sub.textContent='Hap të gjithë My Drive-in dhe skedarët e ndarë me PRISTEEL, përfshirë nën-dosjet. Grupon kopjet, zgjedh versionin më të fundit ose versionin për klientin dhe zbulon dosje që mund të jenë projekte të paregjistruara.';
  var btn=document.getElementById('pdi-run');if(btn)btn.textContent='Audito gjithë Drive-in';
  return true
}
var tries=0,timer=setInterval(function(){if(install()||++tries>120)clearInterval(timer)},250);
})();
