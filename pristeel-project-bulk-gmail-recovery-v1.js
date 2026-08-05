/* PRISTEEL bulk Gmail recovery for all projects
 * Explicit relations only: project_id and project_email_links.
 * No keyword/client matching, no reassignment, no deletion.
 */
(function(){
'use strict';
if(window.__pstBulkGmailRecoveryV1)return;
window.__pstBulkGmailRecoveryV1=true;

var STORAGE='pst_bulk_gmail_recovery_v1';
var state={items:[],running:false,cancel:false,resume:{done:{}},report:{},gmailCache:{}};
var A=window.PSTProjectDataIntegrity;

function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function uniq(rows,key){var seen={};return arr(rows).filter(function(x){var k=String(key(x)||'');if(!k||seen[k])return false;seen[k]=1;return true;});}
function header(part,name){var hs=arr(part&&part.headers),n=String(name||'').toLowerCase();for(var i=0;i<hs.length;i++)if(String(hs[i].name||'').toLowerCase()===n)return hs[i].value||'';return'';}
function bytes(data){var s=String(data||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var raw=atob(s),out=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
function signature(item){return item.mails.map(function(x){return String(x.gmail_message_id||'');}).sort().join('|');}
function loadResume(){try{var x=JSON.parse(localStorage.getItem(STORAGE)||'{}');state.resume=x&&x.done?x:{done:{}};}catch(e){state.resume={done:{}};}}
function saveResume(){try{localStorage.setItem(STORAGE,JSON.stringify(state.resume));}catch(e){}}
function resetResume(){state.resume={done:{}};saveResume();}

async function fetchAll(table,order,max){
  var out=[],size=1000,limit=Number(max||50000);
  if(!A||typeof A.safe!=='function')return out;
  for(var offset=0;offset<limit;offset+=size){
    var path=table+'?select=*'+(order?'&order='+order:'')+'&limit='+size+'&offset='+offset;
    var rows=await A.safe(path);out=out.concat(rows);
    if(rows.length<size)break;
  }
  return out;
}
function buildInventory(projects,emails,links){
  var items={},byId={},byThread={};
  arr(projects).forEach(function(p){items[String(p.id)]={project:p,mails:[]};});
  arr(emails).forEach(function(m){
    var mid=String(m.gmail_message_id||''),tid=String(m.gmail_thread_id||'');
    if(mid)byId[mid]=m;if(tid)(byThread[tid]=byThread[tid]||[]).push(m);
  });
  function add(pid,m){
    var item=items[String(pid||'')],mid=String(m&&m.gmail_message_id||'');
    if(!item||!mid||item.mails.some(function(x){return String(x.gmail_message_id||'')===mid;}))return;
    item.mails.push(m);
  }
  arr(emails).forEach(function(m){if(m.project_id)add(m.project_id,m);});
  arr(links).forEach(function(l){
    var matches=[],mid=String(l.gmail_message_id||''),tid=String(l.gmail_thread_id||'');
    if(mid&&byId[mid])matches=[byId[mid]];else if(tid&&byThread[tid])matches=byThread[tid];
    matches.forEach(function(m){add(l.project_id,m);});
  });
  return Object.keys(items).map(function(id){var x=items[id];x.mails.sort(function(a,b){return String(a.sent_at||'').localeCompare(String(b.sent_at||''));});x.signature=signature(x);return x;}).sort(function(a,b){return String(a.project.name||'').localeCompare(String(b.project.name||''));});
}
async function loadInventory(){
  var all=await Promise.all([fetchAll('projects','created_at.asc',10000),fetchAll('project_emails','sent_at.asc',50000),fetchAll('project_email_links','created_at.asc',50000)]);
  state.items=buildInventory(all[0],all[1],all[2]);return state.items;
}

function skipAttachment(part){
  var name=String(part&&part.filename||'').trim(),body=part&&part.body||{},mime=String(part&&part.mimeType||'').toLowerCase();
  if(!name||!(body.attachmentId||body.data))return true;
  var n=name.toLowerCase(),size=Number(body.size||0),disp=header(part,'Content-Disposition').toLowerCase(),cid=header(part,'Content-ID');
  if(/\.p7s$/i.test(n)||/^smime/i.test(n))return true;
  if(mime.indexOf('image/')===0){
    if(/^(image\d+|outlook[-_]|~wrd|logo|signature|linkedin|facebook|instagram)/i.test(n))return true;
    if((disp.indexOf('inline')>-1||cid)&&size<150000&&!/(drawing|zeichnung|plan|skic|detail|screenshot)/i.test(n))return true;
  }
  return false;
}
function collectParts(part,message,row,out){
  if(!part)return;
  if(!skipAttachment(part)){
    var body=part.body||{};
    out.push({
      key:String(message.id)+':'+String(body.attachmentId||part.filename),messageId:String(message.id),
      attachmentId:String(body.attachmentId||''),inlineData:String(body.data||''),filename:String(part.filename||'').trim(),
      mimeType:part.mimeType||'application/octet-stream',size:Number(body.size||0),subject:row.subject||'',sentAt:row.sent_at||''
    });
  }
  arr(part.parts).forEach(function(child){collectParts(child,message,row,out);});
}
function uniqueFiles(files){return uniq(files,function(x){return String(x.filename||'').toLowerCase()+'|'+String(x.size||0);});}
async function mapLimit(items,limit,fn,progress){
  var output=new Array(items.length),index=0,done=0;
  async function worker(){while(true){var i=index++;if(i>=items.length)return;try{output[i]=await fn(items[i],i);}catch(e){output[i]={error:e};}done++;if(progress)progress(done,items.length);}}
  var jobs=[];for(var i=0;i<Math.min(limit,items.length);i++)jobs.push(worker());await Promise.all(jobs);return output;
}
async function gmailMessage(row,token){
  var id=String(row.gmail_message_id||'');if(!id)return null;
  if(!state.gmailCache[id])state.gmailCache[id]=window.PSTEmail.gmail('/messages/'+enc(id)+'?format=full',token);
  return state.gmailCache[id];
}
async function attachments(item,token){
  var responses=await mapLimit(item.mails,4,async function(row){var m=await gmailMessage(row,token),files=[];if(m)collectParts(m.payload,m,row,files);return files;},function(done,total){setProjectState(item.project.id,'Emailat '+done+'/'+total,'busy');});
  var files=[],errors=[];responses.forEach(function(x){if(x&&x.error)errors.push(String(x.error.message||x.error));else files=files.concat(arr(x));});
  return{files:uniqueFiles(files),errors:errors};
}
async function fileFromGmail(meta,token){
  var data=meta.inlineData;if(!data){var r=await window.PSTEmail.gmail('/messages/'+enc(meta.messageId)+'/attachments/'+enc(meta.attachmentId),token);data=r.data||'';}
  if(!data)throw new Error('Gmail nuk ktheu përmbajtjen e '+meta.filename);
  return new File([bytes(data)],meta.filename,{type:meta.mimeType||'application/octet-stream'});
}
async function importBatch(projectId,metas,token){
  var files=[],errors=[];
  for(var i=0;i<metas.length;i++){
    if(state.cancel)break;
    try{files.push(await fileFromGmail(metas[i],token));}catch(e){errors.push(metas[i].filename+': '+String(e.message||e));}
    setProjectState(projectId,'Shkarkimi '+(i+1)+'/'+metas.length,'busy');
  }
  if(!files.length)return{uploaded:0,skipped:0,errors:errors};
  try{
    var result=await window.PSTDriveImport.importFiles(projectId,files,function(s){setProjectState(projectId,s.message||'Duke ruajtur…','busy');});
    return{uploaded:Number(result.uploaded||0),skipped:Number(result.skipped||0),errors:errors};
  }catch(batchError){
    var uploaded=0,skipped=0;
    for(var j=0;j<files.length;j++){
      if(state.cancel)break;
      try{var one=await window.PSTDriveImport.importFiles(projectId,[files[j]],function(s){setProjectState(projectId,s.message||'Duke ruajtur…','busy');});uploaded+=Number(one.uploaded||0);skipped+=Number(one.skipped||0);}catch(e){errors.push(files[j].name+': '+String(e.message||e));}
    }
    return{uploaded:uploaded,skipped:skipped,errors:errors};
  }
}
async function processProject(item,token){
  var id=String(item.project.id),result={projectId:id,name:item.project.name||'Pa emër',emails:item.mails.length,found:0,uploaded:0,skipped:0,errors:[]};
  setProjectState(id,'Duke lexuar '+item.mails.length+' emaila…','busy');
  var found=await attachments(item,token);result.found=found.files.length;result.errors=result.errors.concat(found.errors);
  if(!found.files.length){setProjectState(id,'Pa attachment-e','empty');return result;}
  for(var i=0;i<found.files.length;i+=8){
    if(state.cancel)break;
    var imported=await importBatch(id,found.files.slice(i,i+8),token);result.uploaded+=imported.uploaded;result.skipped+=imported.skipped;result.errors=result.errors.concat(imported.errors);
  }
  var text=result.uploaded+' u ruajtën · '+result.skipped+' ekzistonin'+(result.errors.length?' · '+result.errors.length+' gabime':'');
  setProjectState(id,text,result.errors.length?'warn':'ok');return result;
}

function brand(){return(window.PRISTEEL_BRAND&&window.PRISTEEL_BRAND.primary)||'#5B9BB3';}
function openModal(){
  var old=document.getElementById('pst-bulk-bg');if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend','<div class="pst-bulk-bg" id="pst-bulk-bg"><section class="pst-bulk-modal"><header><div><h2>Mblidh skedarët për të gjitha projektet</h2><p>Secili projekt merr vetëm attachment-et nga emailat e lidhur me ID-në e tij. Nuk bëhet kërkim sipas klientit.</p></div><button id="pst-bulk-close">×</button></header><div class="pst-bulk-kpis" id="pst-bulk-kpis"></div><div class="pst-bulk-track"><i id="pst-bulk-progress"></i></div><p class="pst-bulk-status" id="pst-bulk-status">Duke lexuar projektet…</p><div class="pst-bulk-list"><div class="pst-bulk-row head"><span>Projekti</span><span>Emaila</span><span>Gjendja</span></div><div id="pst-bulk-rows"></div></div><footer><button id="pst-bulk-report" style="display:none">Shkarko raportin</button><button id="pst-bulk-reset">Rikontrollo të gjitha</button><button id="pst-bulk-stop" class="danger" style="display:none">Ndalo</button><button id="pst-bulk-start" class="primary" disabled>Mblidhi të gjitha</button></footer></section></div>');
  document.getElementById('pst-bulk-close').onclick=function(){if(!state.running)document.getElementById('pst-bulk-bg').remove();};
  document.getElementById('pst-bulk-stop').onclick=function(){state.cancel=true;setStatus('Procesi do të ndalet pas hapit aktual.');};
  document.getElementById('pst-bulk-start').onclick=runAll;
  document.getElementById('pst-bulk-reset').onclick=function(){if(!state.running){resetResume();renderInventory();}};
  document.getElementById('pst-bulk-report').onclick=downloadReport;
}
function renderInventory(){
  var total=state.items.length,withMail=state.items.filter(function(x){return x.mails.length;}).length,emailCount=state.items.reduce(function(s,x){return s+x.mails.length;},0),pending=state.items.filter(function(x){return x.mails.length&&state.resume.done[String(x.project.id)]!==x.signature;}).length;
  document.getElementById('pst-bulk-kpis').innerHTML='<div><b>'+total+'</b><span>Projektet</span></div><div><b>'+withMail+'</b><span>Me emaila</span></div><div><b>'+emailCount+'</b><span>Emaila të lidhur</span></div><div><b>'+pending+'</b><span>Për kontroll</span></div>';
  document.getElementById('pst-bulk-rows').innerHTML=state.items.map(function(x){var id=String(x.project.id),done=state.resume.done[id]===x.signature,text=!x.mails.length?'Pa emaila të lidhur':done?'Kontrolluar':'Gati';return'<div class="pst-bulk-row" data-pid="'+esc(id)+'"><span><b>'+esc(x.project.name||'Pa emër')+'</b><small>'+esc(x.project.client||x.project.ref||'')+'</small></span><span>'+x.mails.length+'</span><span class="pst-bulk-project-state '+(!x.mails.length?'empty':done?'ok':'')+'">'+text+'</span></div>';}).join('');
  var start=document.getElementById('pst-bulk-start');start.disabled=!pending;start.textContent=pending?'Mblidhi të gjitha':'Të gjitha janë kontrolluar';setStatus(pending?pending+' projekte janë gati.':'Nuk ka projekte të pakontrolluara.');
}
function projectRow(id){var rows=document.querySelectorAll('.pst-bulk-row[data-pid]');for(var i=0;i<rows.length;i++)if(rows[i].getAttribute('data-pid')===String(id))return rows[i];return null;}
function setProjectState(id,text,kind){var row=projectRow(id),el=row&&row.querySelector('.pst-bulk-project-state');if(el){el.textContent=text;el.className='pst-bulk-project-state '+(kind||'');}}
function setStatus(text){var e=document.getElementById('pst-bulk-status');if(e)e.textContent=text||'';}
function setProgress(done,total){var e=document.getElementById('pst-bulk-progress');if(e)e.style.width=Math.round(done/Math.max(total,1)*100)+'%';}
function running(on){state.running=on;var start=document.getElementById('pst-bulk-start'),stop=document.getElementById('pst-bulk-stop'),reset=document.getElementById('pst-bulk-reset'),close=document.getElementById('pst-bulk-close');if(start)start.disabled=on;if(stop)stop.style.display=on?'':'none';if(reset)reset.disabled=on;if(close)close.disabled=on;}
function csv(v){return'"'+String(v==null?'':v).replace(/"/g,'""')+'"';}
function downloadReport(){var rows=Object.keys(state.report).map(function(k){return state.report[k];}),text=['Projekti,Emaila,Skedarë,U ruajtën,Ekzistonin,Gabime'].concat(rows.map(function(r){return[csv(r.name),r.emails,r.found,r.uploaded,r.skipped,csv(r.errors.join(' | '))].join(',');})).join('\n'),blob=new Blob([text],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='PRISTEEL-projektet-Gmail-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);}
async function runAll(){
  if(state.running)return;state.cancel=false;state.report={};running(true);
  try{
    var targets=state.items.filter(function(x){return x.mails.length&&state.resume.done[String(x.project.id)]!==x.signature;});
    if(!targets.length){setStatus('Nuk ka projekte për kontroll.');return;}
    var G=window.PSTGoogleWorkspaceAuth;if(!G||!window.PSTEmail||!window.PSTDriveImport)throw new Error('Modulet Gmail/Drive nuk janë gati.');
    setStatus('Lejo qasjen Gmail dhe Drive vetëm një herë.');
    var token=await G.getToken([G.gmailScope,G.driveScope],{forceConsent:false});await window.PSTDriveImport.authorize();
    for(var i=0;i<targets.length;i++){
      if(state.cancel)break;
      var item=targets[i],id=String(item.project.id);setStatus('Projekti '+(i+1)+'/'+targets.length+': '+(item.project.name||'Pa emër'));setProgress(i,targets.length);
      var result;try{result=await processProject(item,token);}catch(e){result={projectId:id,name:item.project.name||'Pa emër',emails:item.mails.length,found:0,uploaded:0,skipped:0,errors:[String(e.message||e)]};setProjectState(id,'Gabim: '+String(e.message||e),'warn');}
      state.report[id]=result;if(!state.cancel&&!result.errors.length){state.resume.done[id]=item.signature;saveResume();}setProgress(i+1,targets.length);
    }
    var rows=Object.keys(state.report).map(function(k){return state.report[k];}),uploaded=rows.reduce(function(s,r){return s+r.uploaded;},0),skipped=rows.reduce(function(s,r){return s+r.skipped;},0),errors=rows.reduce(function(s,r){return s+r.errors.length;},0);
    setStatus(state.cancel?'Procesi u ndal. Mund ta vazhdosh pa dublime.':'Përfundoi: '+uploaded+' skedarë u ruajtën, '+skipped+' ekzistonin'+(errors?', '+errors+' gabime.':'.'));
    document.getElementById('pst-bulk-report').style.display=rows.length?'':'none';
  }catch(e){setStatus('Gabim: '+String(e.message||e));}
  finally{running(false);}
}
async function open(){loadResume();openModal();try{await loadInventory();renderInventory();}catch(e){setStatus('Gabim gjatë leximit: '+String(e.message||e));}}

window.pstBulkCollectProjectFiles=open;
window.PSTBulkGmailRecovery={open:open,buildInventory:buildInventory,skipAttachment:skipAttachment,collectParts:collectParts,uniqueFiles:uniqueFiles};

function inject(){var host=document.querySelector('.pst-pm-head-actions');if(!host||document.getElementById('pst-bulk-open'))return;var b=document.createElement('button');b.id='pst-bulk-open';b.className='pst-pm-btn';b.textContent='Mblidh skedarët nga Gmail';b.onclick=open;host.insertBefore(b,host.firstChild);}
var style=document.createElement('style');style.textContent=`
.pst-bulk-bg{position:fixed;inset:0;z-index:7000;background:rgba(24,38,46,.48);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px}.pst-bulk-modal{width:min(1100px,97vw);max-height:94vh;background:#fff;border-radius:20px;box-shadow:0 28px 90px rgba(18,35,44,.28);display:flex;flex-direction:column;overflow:hidden}.pst-bulk-modal header{display:flex;justify-content:space-between;gap:18px;padding:19px 21px;border-bottom:1px solid #E2EAED;background:linear-gradient(180deg,#fff,#F7FAFB)}.pst-bulk-modal h2{font-size:18px;margin:0;color:#20272B}.pst-bulk-modal header p{font-size:10.5px;color:#748188;line-height:1.45;margin:5px 0 0;max-width:820px}.pst-bulk-modal header button{border:0;background:none;font-size:25px;color:#7E898F;cursor:pointer}.pst-bulk-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;padding:14px 20px}.pst-bulk-kpis div{border:1px solid #E0E8EB;border-radius:12px;padding:10px 12px;background:#FAFCFD}.pst-bulk-kpis b{display:block;font-size:18px}.pst-bulk-kpis span{font-size:8.5px;color:#849097}.pst-bulk-track{height:5px;margin:0 20px;background:#E8EEF1;border-radius:5px;overflow:hidden}.pst-bulk-track i{display:block;width:0;height:100%;background:${brand()};transition:width .2s}.pst-bulk-status{font-size:10px;color:#66747B;padding:9px 20px;margin:0}.pst-bulk-list{margin:0 20px 14px;border:1px solid #DFE8EB;border-radius:13px;overflow:auto;max-height:52vh}.pst-bulk-row{display:grid;grid-template-columns:minmax(260px,1fr) 90px minmax(220px,.75fr);gap:12px;align-items:center;padding:9px 12px;border-bottom:1px solid #EDF2F4;font-size:10px}.pst-bulk-row:last-child{border-bottom:0}.pst-bulk-row.head{position:sticky;top:0;z-index:2;background:#F6F9FA;color:#7A878D;font-size:8px;font-weight:760;text-transform:uppercase}.pst-bulk-row b{display:block}.pst-bulk-row small{display:block;font-size:8.5px;color:#8A959A;margin-top:2px}.pst-bulk-project-state.busy{color:${brand()};font-weight:700}.pst-bulk-project-state.ok{color:#2F7657}.pst-bulk-project-state.warn{color:#A64B42}.pst-bulk-project-state.empty{color:#929CA1}.pst-bulk-modal footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid #E3EAED}.pst-bulk-modal footer button{height:35px;border:1px solid #DCE5E9;border-radius:9px;background:#fff;padding:0 12px;font-size:9px;font-weight:720;cursor:pointer}.pst-bulk-modal footer .primary{background:${brand()};border-color:${brand()};color:#fff}.pst-bulk-modal footer .danger{color:#A64B42;border-color:#E8CBC8}@media(max-width:760px){.pst-bulk-kpis{grid-template-columns:repeat(2,1fr)}.pst-bulk-row{grid-template-columns:1fr 55px}.pst-bulk-row span:last-child{grid-column:1/-1}}
`;
document.head.appendChild(style);
var observer=new MutationObserver(function(){setTimeout(inject,0);});function start(){inject();if(document.body)observer.observe(document.body,{childList:true,subtree:true});}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
