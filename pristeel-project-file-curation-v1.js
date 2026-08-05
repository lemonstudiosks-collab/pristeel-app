/* PRISTEEL project file curation v1
 * Lets users keep a clean operational file set without deleting Gmail or Drive originals.
 * Uses dashboard_action_states for persistent kept/hidden decisions.
 */
(function(){
'use strict';
if(window.__pstProjectFileCurationV1)return;
window.__pstProjectFileCurationV1=true;

var BLUE=(window.PRISTEEL_BRAND&&window.PRISTEEL_BRAND.primary)||'#5B9BB3';
var DEEP=(window.PRISTEEL_BRAND&&window.PRISTEEL_BRAND.primaryDark)||'#3F7F98';
var GREEN='#2F7657',RED='#A64B42',AMBER='#9B6A22';
var state={projectId:'',items:[],decisions:{},selected:{},view:'selected',busy:false};

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function hash(s){s=String(s||'');var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}return(h>>>0).toString(36);}
function fileName(x){return String(x&&(x.file_name||x.filename||x.name||x.title||x.doc_nr||x.document_nr)||'Pa emër');}
function fileSize(x){var n=Number(x&&(x.size||x.file_size||x.size_bytes||x.bytes||0));return isFinite(n)?n:0;}
function fileUrl(x){return String(x&&(x.web_view_link||x.webViewLink||x.drive_url||x.file_url||x.url||x.gmail_url)||'');}
function fileBearing(x){return !!(x&&(x.file_name||x.filename||x.name||x.file_url||x.drive_url||x.web_view_link||x.webViewLink||x.drive_file_id||x.file_id||x.mime_type||x.mimeType));}
function identity(x){
  var name=fileName(x).trim().toLowerCase(),size=fileSize(x);
  if(name&&name!=='pa emër')return'name:'+name+'|size:'+size;
  return'id:'+String(x&&(x.drive_file_id||x.file_id||x.document_id||x.id||fileUrl(x))||'unknown');
}
function actionKey(projectId,item){return'pfc_'+hash(String(projectId)+'|'+identity(item));}
function unique(rows){var seen={};return rows.filter(function(x){var k=identity(x);if(!k||seen[k])return false;seen[k]=1;return true;});}
function collect(data){
  var out=[];
  function add(rows,source){arr(rows).forEach(function(row){if(!fileBearing(row))return;var copy={};Object.keys(row||{}).forEach(function(k){if(k!=='file_base64')copy[k]=row[k];});copy.__source=source;out.push(copy);});}
  add(data&&data.projectDocs,'Regjistri');
  add(data&&data.attachmentLinks,'Attachment');
  add(data&&data.inboxDocs,'Dokument hyrës');
  add(data&&data.drive&&data.drive.rows,'Google Drive');
  add(arr(data&&data.docs).filter(fileBearing),'Dokument');
  return unique(out);
}
function decision(item){var row=state.decisions[actionKey(state.projectId,item)];return row&&row.state||'review';}
function fmtSize(n){n=Number(n||0);if(!n)return'';if(n>=1048576)return(n/1048576).toFixed(n>=10485760?0:1)+' MB';if(n>=1024)return Math.round(n/1024)+' KB';return n+' B';}
function toast(text,bad){if(typeof window.toast==='function'){window.toast(text,bad);return;}var old=document.getElementById('pst-file-curation-toast');if(old)old.remove();var e=document.createElement('div');e.id='pst-file-curation-toast';e.textContent=text;e.style.cssText='position:fixed;right:20px;bottom:20px;z-index:9000;padding:11px 14px;border-radius:10px;background:'+(bad?RED:GREEN)+';color:#fff;font:650 11px Inter,sans-serif;box-shadow:0 15px 35px #0003';document.body.appendChild(e);setTimeout(function(){if(e.parentNode)e.remove();},4800);}
async function db(path,method,body){if(typeof window.supaFetch!=='function')throw new Error('Databaza nuk është gati.');return window.supaFetch(path,method,body);}

async function loadDecisions(){
  state.decisions={};
  if(!state.projectId)return;
  var rows=[];
  try{rows=arr(await db('dashboard_action_states?action_type=eq.project_file_curation&source_ref=eq.'+enc(state.projectId)+'&select=action_key,state,title,meta,updated_at&order=updated_at.asc&limit=5000'));}catch(e){console.warn('File curation states:',e);}
  rows.forEach(function(r){state.decisions[r.action_key]=r;});
}
async function saveDecision(item,value){
  var key=actionKey(state.projectId,item),payload={action_key:key,state:value,action_type:'project_file_curation',title:fileName(item),meta:{file_identity:identity(item),file_name:fileName(item),file_size:fileSize(item),source:item.__source||''},source_ref:String(state.projectId),updated_at:new Date().toISOString()};
  try{
    if(state.decisions[key])await db('dashboard_action_states?action_key=eq.'+enc(key),'PATCH',payload);
    else await db('dashboard_action_states','POST',payload);
  }catch(e){
    try{await db('dashboard_action_states?action_key=eq.'+enc(key),'PATCH',payload);}catch(e2){throw e2;}
  }
  state.decisions[key]=payload;
}
async function saveMany(items,value){for(var i=0;i<items.length;i++)await saveDecision(items[i],value);}

function css(){if(document.getElementById('pst-file-curation-css'))return;var s=document.createElement('style');s.id='pst-file-curation-css';s.textContent=`
.pst-fc-note{border:1px solid #D9E6EA;background:#F6FAFB;border-radius:11px;padding:10px 12px;color:#607078;font-size:9px;margin-bottom:10px}.pst-fc-toolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:10px}.pst-fc-tabs{display:flex;gap:4px;flex:1;flex-wrap:wrap}.pst-fc-tab,.pst-fc-btn{height:32px;border:1px solid #DCE7EB;border-radius:9px;background:#fff;padding:0 10px;font-size:8.5px;font-weight:730;color:#637078;cursor:pointer}.pst-fc-tab.on{background:#EAF5F8;border-color:#BBD9E4;color:${DEEP}}.pst-fc-btn.primary{background:${BLUE};border-color:${BLUE};color:#fff}.pst-fc-btn.danger{color:${RED};border-color:#E6C7C4}.pst-fc-btn:disabled{opacity:.45;cursor:not-allowed}.pst-fc-card{background:#fff;border:1px solid #DCE7EB;border-radius:13px;overflow:hidden}.pst-fc-head{display:grid;grid-template-columns:30px minmax(280px,1fr) 110px 100px 160px;gap:8px;align-items:center;padding:9px 12px;background:#F7FAFB;border-bottom:1px solid #E5ECEF;color:#7D898F;font-size:7.5px;font-weight:780;text-transform:uppercase;letter-spacing:.35px}.pst-fc-row{display:grid;grid-template-columns:30px minmax(280px,1fr) 110px 100px 160px;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #EDF2F4}.pst-fc-row:last-child{border-bottom:0}.pst-fc-row:hover{background:#FAFCFD}.pst-fc-check{width:16px;height:16px;accent-color:${BLUE}}.pst-fc-name{min-width:0}.pst-fc-name b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-fc-name small{display:block;font-size:8px;color:#88949A;margin-top:2px}.pst-fc-source{font-size:8.5px;color:#758188}.pst-fc-state{display:inline-flex;width:max-content;border-radius:999px;padding:3px 7px;font-size:7.5px;font-weight:760}.pst-fc-state.kept{background:#EAF5EF;color:${GREEN}}.pst-fc-state.hidden{background:#F9ECEA;color:${RED}}.pst-fc-state.review{background:#FAF2E3;color:${AMBER}}.pst-fc-actions{display:flex;justify-content:flex-end;gap:5px}.pst-fc-link{border:1px solid #DCE7EB;background:#fff;border-radius:7px;padding:5px 7px;color:${DEEP};font-size:8px;cursor:pointer;text-decoration:none;white-space:nowrap}.pst-fc-link.remove{color:${RED}}.pst-fc-empty{padding:30px;text-align:center;color:#859197;font-size:9px}.pst-fc-summary{font-size:8.5px;color:#7D898F;margin-left:auto}@media(max-width:900px){.pst-fc-head{display:none}.pst-fc-row{grid-template-columns:28px 1fr}.pst-fc-source,.pst-fc-state,.pst-fc-actions{grid-column:2}.pst-fc-actions{justify-content:flex-start}}
`;
document.head.appendChild(s);}
function visibleItems(){return state.items.filter(function(item){var d=decision(item);return state.view==='selected'?d==='kept':state.view==='hidden'?d==='hidden':true;});}
function checkedItems(){return state.items.filter(function(item){return!!state.selected[actionKey(state.projectId,item)];});}
function updateCounter(){
  var kept=state.items.filter(function(x){return decision(x)==='kept';}).length,total=state.items.length,stats=document.querySelectorAll('.pst-pi-stat');
  for(var i=0;i<stats.length;i++){var label=stats[i].querySelector('span');if(label&&String(label.textContent||'').trim()==='Skedarë'){var b=stats[i].querySelector('b');if(b)b.textContent=kept||total;label.textContent=kept?'Skedarë të zgjedhur':'Skedarë';break;}}
}
function render(){
  css();var host=document.getElementById('pst-pi-body'),data=window.__pstIntegrityLastData;if(!host||!data)return;
  state.projectId=String(data.project&&data.project.id||window.__pstCurrentProjectId||'');state.items=collect(data);
  var kept=state.items.filter(function(x){return decision(x)==='kept';}).length,hidden=state.items.filter(function(x){return decision(x)==='hidden';}).length;
  if(state.view==='selected'&&!kept)state.view='all';
  var rows=visibleItems(),checked=checkedItems();
  host.innerHTML='<div class="pst-fc-note"><b>Dosja operative e projektit.</b> “Hiqe” e largon skedarin vetëm nga kjo pamje. Origjinali në Gmail ose Google Drive nuk fshihet. Përdor <b>Mbaji vetëm të zgjedhurit</b> për ta pastruar listën me një veprim.</div>'+
  '<div class="pst-fc-toolbar"><div class="pst-fc-tabs"><button class="pst-fc-tab '+(state.view==='selected'?'on':'')+'" onclick="pstFileCurationView(\'selected\')">Të zgjedhurat '+kept+'</button><button class="pst-fc-tab '+(state.view==='all'?'on':'')+'" onclick="pstFileCurationView(\'all\')">Të gjithë '+state.items.length+'</button><button class="pst-fc-tab '+(state.view==='hidden'?'on':'')+'" onclick="pstFileCurationView(\'hidden\')">Të larguar '+hidden+'</button></div><button class="pst-fc-btn" onclick="pstFileCurationToggleAll()">Zgjidhi të dukshmit</button><button class="pst-fc-btn primary" '+(!checked.length?'disabled':'')+' onclick="pstFileCurationKeepOnly()">Mbaji vetëm të zgjedhurit</button><span class="pst-fc-summary">'+checked.length+' të zgjedhur</span></div>'+
  '<div class="pst-fc-card"><div class="pst-fc-head"><span></span><span>Skedari</span><span>Burimi</span><span>Gjendja</span><span>Veprimet</span></div><div>'+(rows.length?rows.map(function(item){var k=actionKey(state.projectId,item),d=decision(item),u=fileUrl(item),meta=[fmtSize(fileSize(item)),item.modifiedTime||item.modified_at||item.created_at||''].filter(Boolean).join(' · ');return'<div class="pst-fc-row"><input class="pst-fc-check" type="checkbox" '+(state.selected[k]?'checked':'')+' onchange="pstFileCurationSelect(\''+k+'\',this.checked)"><div class="pst-fc-name"><b>'+esc(fileName(item))+'</b><small>'+esc(meta||'Skedar i projektit')+'</small></div><div class="pst-fc-source">'+esc(item.__source||'Projekt')+'</div><span class="pst-fc-state '+d+'">'+(d==='kept'?'I zgjedhur':d==='hidden'?'I larguar':'Për shqyrtim')+'</span><div class="pst-fc-actions">'+(u?'<a class="pst-fc-link" target="_blank" href="'+esc(u)+'">Hap</a>':'')+(d==='kept'?'<button class="pst-fc-link remove" onclick="pstFileCurationSet(\''+k+'\',\'hidden\')">Hiqe</button>':d==='hidden'?'<button class="pst-fc-link" onclick="pstFileCurationSet(\''+k+'\',\'kept\')">Rikthe</button>':'<button class="pst-fc-link" onclick="pstFileCurationSet(\''+k+'\',\'kept\')">Mbaje</button>')+'</div></div>';}).join(''):'<div class="pst-fc-empty">'+(state.view==='selected'?'Ende nuk ka skedarë të shënuar si të zgjedhur. Hape “Të gjithë”, zgjidhi dhe kliko “Mbaji vetëm të zgjedhurit”.':'Nuk ka skedarë në këtë pamje.')+'</div>')+'</div></div>';
  updateCounter();
}
async function initialise(){var data=window.__pstIntegrityLastData;if(!data)return;state.projectId=String(data.project&&data.project.id||'');state.items=collect(data);await loadDecisions();var kept=state.items.some(function(x){return decision(x)==='kept';});state.view=kept?'selected':'all';state.selected={};render();}
function itemByKey(key){return state.items.filter(function(x){return actionKey(state.projectId,x)===key;})[0];}
window.pstFileCurationView=function(v){state.view=v;state.selected={};render();};
window.pstFileCurationSelect=function(k,on){if(on)state.selected[k]=true;else delete state.selected[k];render();};
window.pstFileCurationToggleAll=function(){var rows=visibleItems(),all=rows.length&&rows.every(function(x){return state.selected[actionKey(state.projectId,x)];});rows.forEach(function(x){var k=actionKey(state.projectId,x);if(all)delete state.selected[k];else state.selected[k]=true;});render();};
window.pstFileCurationSet=async function(k,value){if(state.busy)return;var item=itemByKey(k);if(!item)return;state.busy=true;try{await saveDecision(item,value);delete state.selected[k];render();toast(value==='kept'?'Skedari u mbajt në dosjen operative.':'Skedari u largua nga dosja operative.');}catch(e){toast('Nuk u ruajt: '+(e.message||e),true);}finally{state.busy=false;}};
window.pstFileCurationKeepOnly=async function(){
  if(state.busy)return;var chosen=checkedItems();if(!chosen.length)return;
  if(!confirm('Të mbahen vetëm '+chosen.length+' skedarët e zgjedhur? Skedarët e tjerë vetëm do të fshihen nga pamja e projektit; origjinalet nuk preken.'))return;
  state.busy=true;try{var chosenMap={};chosen.forEach(function(x){chosenMap[actionKey(state.projectId,x)]=true;});for(var i=0;i<state.items.length;i++)await saveDecision(state.items[i],chosenMap[actionKey(state.projectId,state.items[i])]?'kept':'hidden');state.selected={};state.view='selected';render();toast(chosen.length+' skedarë u ruajtën në dosjen operative.');}catch(e){toast('Përzgjedhja nuk u ruajt plotësisht: '+(e.message||e),true);}finally{state.busy=false;}
};

var originalTab=window.pstPiTab;
if(typeof originalTab==='function')window.pstPiTab=function(t){var result=originalTab.apply(this,arguments);if(t==='files')setTimeout(initialise,0);return result;};

function wrapImporter(){
  var D=window.PSTDriveImport;if(!D||typeof D.importFiles!=='function'||D.__pstFileCurationWrapped)return;
  var original=D.importFiles;D.__pstFileCurationWrapped=true;
  D.importFiles=async function(projectId,files,onStatus){var list=Array.prototype.slice.call(files||[]),result=await original.apply(this,arguments);if(projectId&&list.length){var oldId=state.projectId;state.projectId=String(projectId);for(var i=0;i<list.length;i++){var item={name:list[i].name,size:list[i].size,__source:'Import Gmail/kompjuter'};try{await saveDecision(item,'kept');}catch(e){console.warn('Nuk u shënua skedari i importuar si i zgjedhur:',e);}}state.projectId=oldId;}return result;};
}
wrapImporter();
window.PSTProjectFileCuration={collect:collect,identity:identity,actionKey:actionKey,render:render,initialise:initialise,wrapImporter:wrapImporter};
})();
