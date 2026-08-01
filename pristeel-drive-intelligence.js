/* PRISTEEL Drive Intelligence: skanim rekursiv, versionim dhe dosje kandidate */
(function(){
'use strict';
if(window.__pstDriveIntelligenceLoaded)return;
window.__pstDriveIntelligenceLoaded=true;

var nativeFetch=window.fetch.bind(window);
var ROOT_NAME='PRISTEEL — Projektet';
var FOLDER_MIME='application/vnd.google-apps.folder';
var SHORTCUT_MIME='application/vnd.google-apps.shortcut';
var MAX_DEPTH=10;
var MAX_ITEMS=2500;
var cache={};

var css=document.createElement('style');
css.id='pst-drive-intelligence-style';
css.textContent=`
.pdi-card{margin-top:16px;border:1px solid rgba(166,95,46,.18);border-radius:18px;background:linear-gradient(145deg,#fff 0%,#FCF8F5 100%);padding:16px;box-shadow:0 12px 34px rgba(52,38,29,.06)}
.pdi-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}.pdi-title{font-size:13px;font-weight:780;color:var(--text,#202326)}.pdi-sub{font-size:10px;line-height:1.55;color:var(--text3,#7A8086);margin-top:4px;max-width:760px}.pdi-actions{display:flex;gap:7px;flex-wrap:wrap}
.pdi-btn{height:34px;border:1px solid var(--border2,#D9DDDF);border-radius:12px;background:#fff;color:var(--text2,#535A60);padding:0 12px;font-size:9.5px;font-weight:730;cursor:pointer}.pdi-btn:hover{border-color:#A65F2E;color:#A65F2E}.pdi-btn.primary{background:#A65F2E;border-color:#A65F2E;color:#fff}.pdi-btn:disabled{opacity:.5;cursor:not-allowed}
.pdi-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:13px}.pdi-stat{border:1px solid rgba(166,95,46,.1);background:rgba(255,255,255,.75);border-radius:14px;padding:10px 11px}.pdi-stat b{display:block;font-size:16px}.pdi-stat span{display:block;font-size:8.5px;color:var(--text3,#7A8086);margin-top:2px}.pdi-note{font-size:9px;color:var(--text3,#7A8086);margin-top:10px}.pdi-progress{height:4px;background:#ECEEEF;border-radius:4px;overflow:hidden;margin-top:10px;display:none}.pdi-progress.on{display:block}.pdi-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#A65F2E,#D39A70);transition:width .2s}
.pdi-modal-bg{position:fixed;inset:0;z-index:2200;background:rgba(25,25,24,.44);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px}.pdi-modal{width:min(980px,97vw);max-height:92vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 28px 80px rgba(20,24,28,.24)}.pdi-modal-hd{position:sticky;top:0;z-index:2;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:17px 19px;border-bottom:1px solid var(--border,#E6E8EA)}.pdi-modal-title{font-size:15px;font-weight:780}.pdi-modal-sub{font-size:9.5px;color:var(--text3,#7A8086);margin-top:3px}.pdi-x{border:0;background:#F2F3F4;border-radius:12px;width:34px;height:34px;font-size:20px;color:#697077;cursor:pointer}.pdi-modal-body{padding:16px 19px}
.pdi-row{display:grid;grid-template-columns:minmax(0,1.4fr) 110px 110px minmax(220px,.8fr);gap:10px;align-items:center;padding:11px 12px;border:1px solid var(--border,#E6E8EA);border-radius:15px;margin-bottom:8px;background:#fff}.pdi-name{font-size:10.5px;font-weight:700}.pdi-path{font-size:8.5px;color:var(--text3,#7A8086);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pdi-pill{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:4px 8px;font-size:8px;font-weight:760;background:#F3F4F5;color:#697077}.pdi-row select{width:100%;font-size:9.5px;padding:7px 8px;border:1px solid var(--border2,#D9DDDF);border-radius:10px;background:#fff}.pdi-row-actions{display:flex;gap:6px}.pdi-empty{text-align:center;padding:30px;color:var(--text3,#7A8086);font-size:10.5px}
@media(max-width:850px){.pdi-stats{grid-template-columns:repeat(2,1fr)}.pdi-row{grid-template-columns:1fr}.pdi-row-actions{justify-content:flex-start}}
`;
document.head.appendChild(css);

function arr(v){return Array.isArray(v)?v:[]}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function enc(v){return encodeURIComponent(String(v==null?'':v))}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function authHeader(init){var h=init&&init.headers;if(!h)return'';if(h instanceof Headers)return h.get('Authorization')||'';return h.Authorization||h.authorization||''}
function setNote(text,color){var e=document.getElementById('pdi-note');if(e){e.textContent=text||'';e.style.color=color||'var(--text3,#7A8086)'}}
function setProgress(on,pct){var a=document.getElementById('pdi-progress'),b=document.getElementById('pdi-progress-fill');if(a)a.classList.toggle('on',!!on);if(b)b.style.width=Math.max(0,Math.min(100,Number(pct)||0))+'%'}
function setBusy(v){['pdi-run','pdi-open'].forEach(function(id){var e=document.getElementById(id);if(e)e.disabled=!!v})}

function apiUrl(path,params){var u=new URL('https://www.googleapis.com/drive/v3'+path);Object.keys(params||{}).forEach(function(k){if(params[k]!=null)u.searchParams.set(k,params[k])});return u.toString()}
async function jsonFetch(url,init){var r=await nativeFetch(url,init),t=await r.text();if(!r.ok)throw new Error('Google Drive '+r.status+': '+t.slice(0,220));return t?JSON.parse(t):{}}
async function driveToken(){if(!window.PSTDriveImport||typeof window.PSTDriveImport.authorize!=='function')throw new Error('Google Drive nuk është gati.');return window.PSTDriveImport.authorize()}
async function driveQuery(q,token,fields,pageSize){
  var out=[],page='';
  do{
    var data=await jsonFetch(apiUrl('/files',{q:q,fields:'nextPageToken,files('+fields+')',pageSize:pageSize||1000,pageToken:page||undefined,spaces:'drive'}),{headers:{Authorization:'Bearer '+token}});
    out=out.concat(arr(data.files));page=data.nextPageToken||''
  }while(page&&out.length<MAX_ITEMS);
  return out
}
async function rootFolder(token){
  var q="name='"+ROOT_NAME.replace(/'/g,"\\'")+"' and mimeType='"+FOLDER_MIME+"' and trashed=false";
  var f=await driveQuery(q,token,'id,name,mimeType,modifiedTime,webViewLink,parents',10);if(!f.length)throw new Error('Nuk u gjet dosja “'+ROOT_NAME+'”.');return f[0]
}
function parseParentFromUrl(url){
  try{var u=new URL(typeof url==='string'?url:url.url),q=u.searchParams.get('q')||'',m=q.match(/'([^']+)'\s+in\s+parents/i);return m?m[1]:''}catch(e){return''}
}
function isAnalysisList(url){
  try{var u=new URL(typeof url==='string'?url:url.url),fields=decodeURIComponent(u.searchParams.get('fields')||''),q=decodeURIComponent(u.searchParams.get('q')||'');return u.hostname==='www.googleapis.com'&&u.pathname==='/drive/v3/files'&&/modifiedTime/.test(fields)&&/webViewLink/.test(fields)&&/in parents/i.test(q)}catch(e){return false}
}
function extension(name,mime){
  var n=String(name||''),m=n.toLowerCase().match(/\.([a-z0-9]{1,8})$/);if(m)return m[1];
  if(String(mime||'').indexOf('google-apps.document')>-1)return'gdoc';
  if(String(mime||'').indexOf('google-apps.spreadsheet')>-1)return'gsheet';
  if(String(mime||'').indexOf('google-apps.presentation')>-1)return'gslides';
  return String(mime||'').split('/').pop()||'file'
}
function versionBase(name){
  var n=String(name||'').replace(/\.[^.]+$/,'');
  n=n.replace(/^copy of\s+/i,'').replace(/^kopje\s+(e\s+)?/i,'');
  n=n.replace(/\s*[\[(](?:copy|kopje|duplicate|duplikat)?\s*\d+[\])]?\s*$/i,'');
  n=n.replace(/(?:\s|_|-)+(?:rev(?:ision)?\s*[a-z0-9.-]+|ver(?:sion)?\s*[a-z0-9.-]+|v\s*\d+(?:\.\d+)?|r\s*\d+|final|finale|client|customer|sent|gesendet|approved|freigegeben|signed|unterschrieben|submission|issued|draft|entwurf|old|alt|archive|archiv|copy|kopje)+\s*$/ig,'');
  return norm(n)
}
function versionScore(f){
  var text=norm((f.name||'')+' '+(f.pst_path||'')),s=0,t=Date.parse(f.modifiedTime||'')||0;
  s+=Math.floor(t/86400000)/1000;
  if(/\b(final|client|customer|sent|gesendet|approved|freigegeben|signed|unterschrieben|submission|issued|as sent|per klient)\b/.test(text))s+=180;
  if(/\b(outgoing|to client|client version|final docs|submission|oferta finale|angebot final)\b/.test(text))s+=90;
  if(f.starred)s+=25;
  if(/\b(draft|entwurf|old|alt|archive|archiv|obsolete|superseded|temp|tmp|copy|kopje|backup)\b/.test(text))s-=140;
  return s
}
function meaningful(f){var n=String(f.name||'').toLowerCase();return n&&n!=='.ds_store'&&n!=='thumbs.db'&&!/^~\$/.test(n)&&!/^\.~lock\./.test(n)}
function chooseVersions(files){
  var groups={},picked=[],duplicates=[];
  arr(files).filter(meaningful).forEach(function(f){
    var key=versionBase(f.name)+'|'+extension(f.name,f.mimeType);
    if(!key.split('|')[0])key='__'+f.id;
    if(!groups[key])groups[key]=[];groups[key].push(f)
  });
  Object.keys(groups).forEach(function(k){
    var g=groups[k].sort(function(a,b){return versionScore(b)-versionScore(a)}),best=g[0];picked.push(best);
    if(g.length>1)duplicates.push({key:k,preferred:best,alternatives:g.slice(1)})
  });
  picked.sort(function(a,b){return String(b.modifiedTime||'').localeCompare(String(a.modifiedTime||''))});
  return{files:picked,duplicates:duplicates}
}
async function recursiveScan(folderId,token,onProgress){
  var queue=[{id:folderId,path:'',depth:0}],folders=[],files=[],seen={},processed=0;
  while(queue.length&&folders.length+files.length<MAX_ITEMS){
    var cur=queue.shift();if(seen[cur.id])continue;seen[cur.id]=true;
    var q="'"+cur.id+"' in parents and trashed=false";
    var rows=await driveQuery(q,token,'id,name,mimeType,size,modifiedTime,createdTime,webViewLink,parents,md5Checksum,starred,shortcutDetails(targetId,targetMimeType)',1000);
    rows.forEach(function(f){
      var path=cur.path?cur.path+' / '+f.name:f.name;f.pst_path=path;f.pst_parent_path=cur.path;
      if(f.mimeType===FOLDER_MIME){folders.push(f);if(cur.depth<MAX_DEPTH)queue.push({id:f.id,path:path,depth:cur.depth+1})}
      else if(f.mimeType===SHORTCUT_MIME&&f.shortcutDetails&&f.shortcutDetails.targetMimeType===FOLDER_MIME){if(cur.depth<MAX_DEPTH)queue.push({id:f.shortcutDetails.targetId,path:path+' ↗',depth:cur.depth+1})}
      else files.push(f)
    });
    processed++;if(onProgress)onProgress({folders:folders.length,files:files.length,queue:queue.length,processed:processed});
    if(processed%8===0)await sleep(80)
  }
  var v=chooseVersions(files);return{folderId:folderId,folders:folders,allFiles:files,files:v.files,duplicates:v.duplicates,truncated:folders.length+files.length>=MAX_ITEMS}
}
function responseJson(obj){return new Response(JSON.stringify(obj),{status:200,headers:{'Content-Type':'application/json'}})}

window.fetch=function(input,init){
  if(!isAnalysisList(input))return nativeFetch(input,init);
  var folderId=parseParentFromUrl(input),auth=authHeader(init);
  if(!folderId||!auth)return nativeFetch(input,init);
  var key=folderId+'|'+auth.slice(-18),now=Date.now(),hit=cache[key];
  var run=hit&&now-hit.time<120000?Promise.resolve(hit.data):recursiveScan(folderId,auth.replace(/^Bearer\s+/i,''),null).then(function(data){cache[key]={time:Date.now(),data:data};return data});
  return run.then(function(data){
    var files=data.files.slice(0,160).map(function(f){var x=Object.assign({},f);x.pst_original_name=f.name;x.name=f.pst_parent_path?f.pst_parent_path+' / '+f.name:f.name;return x});
    try{localStorage.setItem('pst_drive_analysis_last',JSON.stringify({at:new Date().toISOString(),folder_id:folderId,folders:data.folders.length,all_files:data.allFiles.length,selected_files:files.length,duplicates:data.duplicates.length,truncated:data.truncated}))}catch(e){}
    return responseJson({files:files})
  }).catch(function(){return nativeFetch(input,init)})
};

async function projects(){try{return await supaFetch('projects?select=id,name,client,drive_folder_id,drive_folder_url&order=created_at.desc&limit=2000')}catch(e){return[]}}
function closeMatch(name,list){
  var n=norm(name),best=null,score=0;
  arr(list).forEach(function(p){var a=norm(p.name),b=norm(p.client),s=0;if(n===a)s=100;else if(a&&n.indexOf(a)>-1||n&&a.indexOf(n)>-1)s=78;else{var nt=n.split(' '),at=a.split(' '),common=nt.filter(function(x){return x.length>3&&at.indexOf(x)>-1}).length;s=Math.round(common/Math.max(1,Math.min(nt.length,at.length))*70)}if(b&&n.indexOf(b)>-1)s+=12;if(s>score){score=s;best=p}});return{project:best,score:score}
}
async function auditWorkspace(){
  setBusy(true);setProgress(true,3);setNote('Po lidhemi me Google Drive…');
  try{
    var token=await driveToken(),root=await rootFolder(token),data=await recursiveScan(root.id,token,function(s){var pct=Math.min(88,5+Math.round((s.processed/(s.processed+s.queue+1))*80));setProgress(true,pct);setNote('Po hapen dosjet: '+s.folders+' · skedarë: '+s.files)}),ps=await projects();
    var linked={};ps.forEach(function(p){if(p.drive_folder_id)linked[p.drive_folder_id]=p});
    var topFolders=data.folders.filter(function(f){return arr(f.parents).indexOf(root.id)>-1});
    var autoLinked=[],candidates=[];
    for(var i=0;i<topFolders.length;i++){
      var f=topFolders[i];if(linked[f.id])continue;
      var m=closeMatch(f.name,ps);
      if(m.project&&m.score>=96&&!m.project.drive_folder_id){
        try{await supaFetch('projects?id=eq.'+enc(m.project.id),'PATCH',{drive_folder_id:f.id,drive_folder_url:f.webViewLink||('https://drive.google.com/drive/folders/'+f.id)});autoLinked.push({folder:f,project:m.project});continue}catch(e){}
      }
      var count=data.allFiles.filter(function(x){return String(x.pst_path||'').indexOf(f.name)===0}).length;
      candidates.push({folder:f,file_count:count,match:m})
    }
    var result={at:new Date().toISOString(),root:root,folders:data.folders.length,all_files:data.allFiles.length,preferred_files:data.files.length,duplicates:data.duplicates.length,truncated:data.truncated,auto_linked:autoLinked,candidates:candidates,projects:ps};
    try{localStorage.setItem('pst_drive_workspace_audit',JSON.stringify(result))}catch(e){}
    renderStats(result);setProgress(false,100);setNote('Auditi përfundoi. U zgjodhën versionet më të fundit ose versionet për klientin.','#2F7657');openAudit(result)
  }catch(e){setProgress(false,0);setNote('Auditi dështoi: '+e.message,'#A64B42')}
  finally{setBusy(false)}
}
function renderStats(r){
  var vals={folders:r&&r.folders||0,files:r&&r.all_files||0,preferred:r&&r.preferred_files||0,duplicates:r&&r.duplicates||0};Object.keys(vals).forEach(function(k){var e=document.getElementById('pdi-'+k);if(e)e.textContent=String(vals[k])})
}
function loadAudit(){try{return JSON.parse(localStorage.getItem('pst_drive_workspace_audit')||'null')}catch(e){return null}}
function auditHtml(r){
  var ps=arr(r.projects),rows=arr(r.candidates).map(function(c,i){var f=c.folder,m=c.match||{},selected=m.project?String(m.project.id):'';return '<div class="pdi-row"><div><div class="pdi-name">'+esc(f.name)+'</div><div class="pdi-path">'+esc(f.webViewLink||('https://drive.google.com/drive/folders/'+f.id))+'</div></div><span class="pdi-pill">'+Number(c.file_count||0)+' skedarë</span><span class="pdi-pill">'+(m.score||0)+'% ngjashmëri</span><div><select id="pdi-select-'+i+'"><option value="">Projekt i ri</option>'+ps.map(function(p){return'<option value="'+esc(p.id)+'"'+(String(p.id)===selected?' selected':'')+'>'+esc(p.name)+'</option>'}).join('')+'</select><div class="pdi-row-actions"><button class="pdi-btn" onclick="pstDriveLinkFolder('+i+')">Lidhe</button><button class="pdi-btn primary" onclick="pstDriveCreateProject('+i+')">Krijo projekt</button></div></div></div>'}).join('');
  return rows||'<div class="pdi-empty">Nuk u gjet asnjë dosje e palidhur. Drive-i është i organizuar mirë.</div>'
}
function openAudit(r){r=r||loadAudit();if(!r){alert('Nuk ka audit të ruajtur. Nis auditin e Drive-it.');return}window.__pstDriveAuditCurrent=r;var bg=document.createElement('div');bg.className='pdi-modal-bg';bg.id='pdi-modal-bg';bg.innerHTML='<div class="pdi-modal"><div class="pdi-modal-hd"><div><div class="pdi-modal-title">Google Drive Intelligence</div><div class="pdi-modal-sub">'+r.folders+' dosje · '+r.all_files+' skedarë · '+r.duplicates+' grupe versionesh të përsëritura</div></div><button class="pdi-x" onclick="document.getElementById(\'pdi-modal-bg\').remove()">×</button></div><div class="pdi-modal-body">'+auditHtml(r)+'</div></div>';document.body.appendChild(bg)}
window.pstDriveAudit=auditWorkspace;window.pstDriveAuditOpen=function(){openAudit(loadAudit())};
window.pstDriveLinkFolder=async function(i){var r=window.__pstDriveAuditCurrent,c=r&&r.candidates&&r.candidates[i],sel=document.getElementById('pdi-select-'+i),pid=sel&&sel.value;if(!c||!pid)return alert('Zgjidh projektin që duhet të lidhet.');try{await supaFetch('projects?id=eq.'+enc(pid),'PATCH',{drive_folder_id:c.folder.id,drive_folder_url:c.folder.webViewLink||('https://drive.google.com/drive/folders/'+c.folder.id)});alert('Dosja u lidh me projektin.');document.getElementById('pdi-modal-bg').remove();auditWorkspace()}catch(e){alert('Gabim: '+e.message)}};
window.pstDriveCreateProject=async function(i){var r=window.__pstDriveAuditCurrent,c=r&&r.candidates&&r.candidates[i];if(!c)return;var name=prompt('Emri i projektit të ri:',c.folder.name);if(!name)return;var now=new Date().toISOString(),payload={name:name,status:'Në pritje',pipeline_stage:'evaluation',drive_folder_id:c.folder.id,drive_folder_url:c.folder.webViewLink||('https://drive.google.com/drive/folders/'+c.folder.id),created_at:now,updated_at:now};try{await supaFetch('projects','POST',payload);alert('Projekti u krijua dhe u lidh me dosjen.');document.getElementById('pdi-modal-bg').remove();auditWorkspace()}catch(e){delete payload.created_at;delete payload.updated_at;try{await supaFetch('projects','POST',payload);alert('Projekti u krijua dhe u lidh me dosjen.');document.getElementById('pdi-modal-bg').remove();auditWorkspace()}catch(x){alert('Krijimi dështoi: '+x.message)}}};

function card(){var r=loadAudit();return '<div class="pdi-card" id="pdi-card"><div class="pdi-top"><div><div class="pdi-title">Google Drive Intelligence</div><div class="pdi-sub">Hap të gjitha nën-dosjet, grupon kopjet dhe versionet, zgjedh versionin më të fundit ose atë të përgatitur për klientin dhe zbulon dosje që mund të jenë projekte të paregjistruara.</div></div><div class="pdi-actions"><button class="pdi-btn" id="pdi-open" onclick="pstDriveAuditOpen()">Shiko auditin</button><button class="pdi-btn primary" id="pdi-run" onclick="pstDriveAudit()">Audito Drive-in</button></div></div><div class="pdi-stats"><div class="pdi-stat"><b id="pdi-folders">'+(r&&r.folders||0)+'</b><span>dosje të hapura</span></div><div class="pdi-stat"><b id="pdi-files">'+(r&&r.all_files||0)+'</b><span>skedarë të gjetur</span></div><div class="pdi-stat"><b id="pdi-preferred">'+(r&&r.preferred_files||0)+'</b><span>versione të zgjedhura</span></div><div class="pdi-stat"><b id="pdi-duplicates">'+(r&&r.duplicates||0)+'</b><span>grupe kopjesh</span></div></div><div class="pdi-progress" id="pdi-progress"><i id="pdi-progress-fill"></i></div><div class="pdi-note" id="pdi-note">'+(r?'Auditi i fundit: '+new Date(r.at).toLocaleString():'Ende nuk është bërë audit i plotë i Drive-it.')+'</div></div>'}
function inject(){var pg=document.getElementById('page-settings')||document.querySelector('[data-page="settings"]');if(!pg||document.getElementById('pdi-card'))return false;var holder=document.createElement('div');holder.innerHTML=card();pg.appendChild(holder.firstChild);return true}
var obs=new MutationObserver(inject);obs.observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(inject,800)});else setTimeout(inject,800);

window.PSTDriveIntelligence={scanProjectFolder:async function(folderId){var t=await driveToken();return recursiveScan(folderId,t)},auditWorkspace:auditWorkspace,chooseVersions:chooseVersions,lastAudit:loadAudit};
})();
