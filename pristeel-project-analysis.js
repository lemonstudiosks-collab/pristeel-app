/* PRISTEEL Project Intelligence: analiza e projektit me burime dhe hapa konkretë */
(function(){
'use strict';
if(window.__pstProjectAnalysisLoaded)return;
window.__pstProjectAnalysisLoaded=true;

var A=window.PSTEmail||null;
var MODEL_FAST='llama-3.1-8b-instant', MODEL_MAIN='llama-3.3-70b-versatile';
var cache={}, tableState={value:null,checked:0};

var css=document.createElement('style');
css.id='pst-project-analysis-style';
css.textContent=`
.pai-box{background:#fff;border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden}
.pai-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:15px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap}
.pai-kicker{font-size:8.5px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:#A65F2E;margin-bottom:3px}
.pai-title{font-size:14px;font-weight:750;color:var(--text)}.pai-sub{font-size:10px;color:var(--text3);margin-top:2px;line-height:1.45}
.pai-actions{display:flex;gap:6px;flex-wrap:wrap}.pai-btn{height:31px;border:1px solid var(--border2);border-radius:8px;background:#fff;color:var(--text2);padding:0 10px;font-size:9.5px;font-weight:700;cursor:pointer}
.pai-btn:hover{border-color:#A65F2E;color:#A65F2E;background:#FDF9F6}.pai-btn.primary{background:#A65F2E;border-color:#A65F2E;color:#fff}.pai-btn.primary:hover{background:#8A4E24;color:#fff}.pai-btn:disabled{opacity:.5;cursor:not-allowed}
.pai-state{padding:8px 16px;font-size:9.5px;color:var(--text3);background:#FAFBFB;border-bottom:1px solid var(--border);min-height:31px}
.pai-progress{height:3px;background:#ECEEEF;display:none}.pai-progress.on{display:block}.pai-progress i{display:block;height:100%;width:0;background:#A65F2E;transition:width .2s}
.pai-body{padding:15px 16px}.pai-empty{padding:22px 12px;text-align:center;border:1px dashed var(--border2);border-radius:10px;background:#FAFBFB}.pai-empty b{display:block;font-size:12.5px;margin-bottom:5px}.pai-empty p{font-size:10px;color:var(--text3);max-width:580px;margin:0 auto 12px;line-height:1.55}
.pai-top{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(230px,.65fr);gap:12px;margin-bottom:12px}.pai-card{border:1px solid var(--border);border-radius:10px;padding:13px 14px}.pai-label{font-size:8.5px;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);font-weight:800;margin-bottom:6px}.pai-summary{font-size:11.5px;color:var(--text2);line-height:1.62}
.pai-decision{border-color:var(--dc-line);background:var(--dc-bg)}.pai-decision .pai-label,.pai-decision-main{color:var(--dc)}.pai-decision-main{font-size:14px;font-weight:780;margin:5px 0 3px}.pai-decision-reason{font-size:9.5px;color:var(--text2);line-height:1.45}.pai-score{display:flex;align-items:center;gap:8px;margin-top:10px}.pai-score-track{height:5px;background:rgba(255,255,255,.75);border-radius:5px;overflow:hidden;flex:1}.pai-score-track i{display:block;height:100%;background:var(--dc)}.pai-score span{font-size:9px;font-weight:750;color:var(--dc)}
.pai-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pai-sec{border:1px solid var(--border);border-radius:10px;overflow:hidden}.pai-sec-hd{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border);background:#FCFCFC}.pai-sec-title{font-size:10.5px;font-weight:750}.pai-count{font-size:8.5px;color:var(--text3);background:#F0F2F3;border-radius:10px;padding:2px 6px}.pai-list{padding:5px 7px}
.pai-item{display:grid;grid-template-columns:8px minmax(0,1fr);gap:8px;padding:8px 6px;border-bottom:1px solid #F0F1F2}.pai-item:last-child{border-bottom:0}.pai-dot{width:7px;height:7px;border-radius:50%;margin-top:4px;background:var(--ic);box-shadow:0 0 0 3px var(--ib)}.pai-it{font-size:10.5px;font-weight:650;line-height:1.45}.pai-is{font-size:9px;color:var(--text3);line-height:1.42;margin-top:2px}.pai-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.pai-tag,.pai-src{font-size:7.5px;font-weight:750;text-transform:uppercase;letter-spacing:.25px;border-radius:9px;padding:2px 5px;background:#EDF1F3;color:#5D6872}.pai-src{border:0;cursor:pointer}.pai-src:hover{background:#F7EDE5;color:#A65F2E}
.pai-action{display:flex;align-items:flex-start;gap:8px;padding:9px 6px;border-bottom:1px solid #F0F1F2}.pai-action:last-child{border-bottom:0}.pai-n{width:20px;height:20px;border-radius:7px;background:var(--ab);color:var(--ac);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;flex-shrink:0}.pai-am{flex:1}.pai-at{font-size:10.5px;font-weight:700}.pai-aw{font-size:9px;color:var(--text3);margin-top:2px;line-height:1.4}.pai-due{font-size:8px;color:var(--text3);white-space:nowrap}
.pai-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:8.5px;color:var(--text3)}.pai-meta strong{color:var(--text2)}.pai-meta button{border:0;background:none;color:#A65F2E;font-size:8.5px;font-weight:700;cursor:pointer}
.pai-modal-bg{position:fixed;inset:0;background:rgba(26,26,25,.42);z-index:1700;display:flex;align-items:center;justify-content:center;padding:20px}.pai-modal{width:min(760px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:13px;box-shadow:0 18px 56px rgba(20,24,28,.22)}.pai-modal-hd{position:sticky;top:0;background:#fff;display:flex;justify-content:space-between;padding:15px 17px;border-bottom:1px solid var(--border)}.pai-modal-title{font-size:14px;font-weight:750}.pai-modal-sub{font-size:9.5px;color:var(--text3)}.pai-x{border:0;background:none;font-size:20px;color:var(--text3);cursor:pointer}.pai-modal-body{padding:14px 17px}.pai-source-row{padding:9px 4px;border-bottom:1px solid var(--border)}.pai-source-id{font-size:8px;font-weight:800;color:#A65F2E}.pai-source-name{font-size:10.5px;font-weight:650}.pai-source-meta{font-size:8.5px;color:var(--text3);margin-top:2px}.pai-source-text{font-size:9px;color:var(--text2);line-height:1.48;margin-top:5px;white-space:pre-wrap}.pai-history{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:9px;margin-bottom:7px;cursor:pointer}.pai-history:hover{border-color:#A65F2E;background:#FDF9F6}.pai-history-main{flex:1}.pai-history-title{font-size:10.5px;font-weight:700}.pai-history-sub{font-size:8.5px;color:var(--text3)}.pai-history-score{font-size:12px;font-weight:780;color:#A65F2E}
@media(max-width:900px){.pai-top,.pai-grid{grid-template-columns:1fr}}
`;
document.head.appendChild(css);

function arr(v){return Array.isArray(v)?v:[]}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function enc(v){return encodeURIComponent(String(v==null?'':v))}
function uniq(v){return arr(v).map(String).filter(function(x,i,a){return x&&a.indexOf(x)===i})}
function cap(v,n){var s=String(v||'').replace(/\u0000/g,'').trim();return s.length>n?s.slice(0,n)+'\n[teksti u shkurtua]':s}
function fmt(v){if(!v)return'';var d=new Date(v);return isNaN(d)?String(v):d.toLocaleDateString('de-DE')+' '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}
function strip(v){var e=document.createElement('div');e.innerHTML=String(v||'');return(e.textContent||'').replace(/\s+/g,' ').trim()}
function inText(f,v){return f+'=in.('+v.map(function(x){return'"'+String(x).replace(/"/g,'')+'"'}).join(',')+')'}
function safeJson(v){var s=String(v||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();try{return JSON.parse(s)}catch(e){var a=s.indexOf('{'),b=s.lastIndexOf('}');if(a>-1&&b>a)return JSON.parse(s.slice(a,b+1));throw e}}
async function sf(path){try{return await supaFetch(path)}catch(e){return[]}}
async function tableReady(){if(tableState.value!==null&&Date.now()-tableState.checked<60000)return tableState.value;try{await supaFetch('project_analyses?select=id&limit=1');tableState.value=true}catch(e){tableState.value=false}tableState.checked=Date.now();return tableState.value}
function setState(pid,t,c){var e=document.getElementById('pai-state-'+pid);if(e){e.textContent=t||'';e.style.color=c||'var(--text3)'}}
function prog(pid,on,n){var a=document.getElementById('pai-progress-'+pid),b=document.getElementById('pai-fill-'+pid);if(a)a.classList.toggle('on',!!on);if(b)b.style.width=Math.max(0,Math.min(100,n||0))+'%'}
function busy(pid,v){['analyze','tasks','history'].forEach(function(k){var e=document.getElementById('pai-'+k+'-'+pid);if(e)e.disabled=!!v})}
function source(id,type,label,date,url,text,meta){return{id:id,type:type,label:label||id,date:date||null,url:url||null,text:cap(text,14000),meta:meta||{}}}

async function linkedEmails(pid){
  var map={},ids=[];
  try{
    var links=await supaFetch('project_email_links?project_id=eq.'+enc(pid)+'&select=gmail_message_id&limit=5000');
    ids=uniq(arr(links).map(function(x){return x.gmail_message_id}));
    for(var i=0;i<ids.length;i+=35){
      var rows=await supaFetch('project_emails?select=*&'+inText('gmail_message_id',ids.slice(i,i+35))+'&order=sent_at.asc');
      arr(rows).forEach(function(x){if(x.gmail_message_id)map[x.gmail_message_id]=x})
    }
  }catch(e){}
  try{
    var legacy=await supaFetch('project_emails?project_id=eq.'+enc(pid)+'&select=*&order=sent_at.asc&limit=2500');
    arr(legacy).forEach(function(x){if(x.gmail_message_id)map[x.gmail_message_id]=x})
  }catch(e){}
  return Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return String(a.sent_at||'').localeCompare(String(b.sent_at||''))})
}
function hdr(p,n){var h=(p&&p.headers)||[],q=String(n).toLowerCase();for(var i=0;i<h.length;i++)if(String(h[i].name||'').toLowerCase()===q)return h[i].value||'';return''}
function decode64(v){var s=String(v||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';try{return decodeURIComponent(Array.prototype.map.call(atob(s),function(c){return'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)}).join(''))}catch(e){try{return atob(s)}catch(x){return''}}}
function mime(part,out){if(!part)return;var t=String(part.mimeType||'').toLowerCase(),d=part.body&&part.body.data;if(d&&(t==='text/plain'||t==='text/html'))out.push({type:t,text:decode64(d)});arr(part.parts).forEach(function(p){mime(p,out)})}
async function gmailBodies(rows,pid){
  var map={},list=rows.slice(Math.max(0,rows.length-160));
  if(!A||!A.auth||!A.gmail)return map;
  try{
    setState(pid,'Po lexohen përmbajtjet e emailave nga Gmail…');
    var token=await A.auth(),full=await A.map(list,4,async function(r){
      var m=await A.gmail('/messages/'+enc(r.gmail_message_id)+'?format=full',token),p=[];mime(m.payload,p);
      var plain=p.filter(function(x){return x.type==='text/plain'}).map(function(x){return x.text}).join('\n');
      var html=p.filter(function(x){return x.type==='text/html'}).map(function(x){return strip(x.text)}).join('\n');
      return{id:r.gmail_message_id,text:cap(plain||html||r.snippet||'',7500)}
    },function(d,n){prog(pid,true,5+Math.round(d/Math.max(n,1)*18))});
    arr(full).forEach(function(x){map[x.id]=x.text})
  }catch(e){setState(pid,'Gmail-i nuk dha tekstin e plotë. Po përdoren metadata dhe snippet-et.','#9B6A22')}
  return map
}
async function driveList(folder,token){
  var u='https://www.googleapis.com/drive/v3/files?q='+enc("'"+folder+"' in parents and trashed=false")+'&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&pageSize=1000';
  var r=await fetch(u,{headers:{Authorization:'Bearer '+token}}),t=await r.text();if(!r.ok)throw new Error('Drive '+r.status+': '+t.slice(0,150));return JSON.parse(t).files||[]
}
async function driveBuf(f,token){
  var mt=String(f.mimeType||''),u;
  if(mt.indexOf('application/vnd.google-apps.')===0){
    var ex=mt.indexOf('spreadsheet')>-1?'text/csv':mt.indexOf('presentation')>-1?'application/pdf':'text/plain';
    u='https://www.googleapis.com/drive/v3/files/'+enc(f.id)+'/export?mimeType='+enc(ex)
  }else u='https://www.googleapis.com/drive/v3/files/'+enc(f.id)+'?alt=media';
  var r=await fetch(u,{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw new Error('Skedari nuk u lexua: '+f.name);return r.arrayBuffer()
}
async function pdfText(buf){
  if(typeof pdfjsLib==='undefined')return'';var pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise,out=[];
  for(var i=1;i<=Math.min(pdf.numPages,40);i++){var p=await pdf.getPage(i),c=await p.getTextContent();out.push(c.items.map(function(x){return x.str}).join(' '));if(out.join('\n').length>32000)break}
  return out.join('\n')
}
async function fileText(f,buf){
  var mt=String(f.mimeType||'').toLowerCase(),n=String(f.name||'').toLowerCase();
  if(mt.indexOf('pdf')>-1||n.endsWith('.pdf'))return pdfText(buf);
  if(mt.indexOf('wordprocessingml')>-1||n.endsWith('.docx'))return typeof mammoth==='undefined'?'':(await mammoth.extractRawText({arrayBuffer:buf})).value||'';
  if(mt.indexOf('spreadsheet')>-1||/\.(xlsx|xls|csv)$/.test(n)){
    if(typeof XLSX==='undefined')return'';var wb=XLSX.read(buf,{type:'array'}),out=[];wb.SheetNames.slice(0,10).forEach(function(s){out.push('Fleta: '+s+'\n'+XLSX.utils.sheet_to_csv(wb.Sheets[s]))});return out.join('\n\n')
  }
  if(mt.indexOf('text')>-1||mt.indexOf('json')>-1||mt.indexOf('xml')>-1||mt.indexOf('html')>-1||/\.(txt|md|json|xml|html)$/.test(n))return new TextDecoder('utf-8').decode(buf);
  if(mt.indexOf('presentation')>-1)return pdfText(buf);
  return''
}
async function driveSources(project,pid){
  var sources=[],files=[];
  if(!project.drive_folder_id||!window.PSTDriveImport||!window.PSTDriveImport.authorize)return{sources:sources,files:files,read:0};
  try{
    setState(pid,'Po lexohen skedarët e projektit nga Google Drive…');
    var token=await window.PSTDriveImport.authorize();files=await driveList(project.drive_folder_id,token);
    var list=files.filter(function(f){return Number(f.size||0)<=18*1024*1024||String(f.mimeType||'').indexOf('application/vnd.google-apps.')===0}).slice(0,40);
    for(var i=0;i<list.length;i++){
      var f=list[i],text='';try{text=await fileText(f,await driveBuf(f,token))}catch(e){}
      sources.push(source('F'+(i+1),'skedar',f.name,f.modifiedTime,f.webViewLink||('https://drive.google.com/open?id='+f.id),text||'[Skedari u gjet, por përmbajtja nuk mund të lexohej automatikisht.]',{mimeType:f.mimeType,size:f.size||0}));
      prog(pid,true,24+Math.round((i+1)/Math.max(list.length,1)*18))
    }
  }catch(e){setState(pid,'Drive-i nuk u lexua. Analiza vazhdon me emailat dhe të dhënat e platformës.','#9B6A22')}
  return{sources:sources,files:files,read:sources.filter(function(s){return s.text.charAt(0)!=='['}).length}
}
function structured(data,sources){
  var p=data.project;
  sources.push(source('P1','projekt','Të dhënat bazë',p.updated_at||p.created_at,null,JSON.stringify({name:p.name,client:p.client,reference:p.ref,location:p.location,deadline:p.deadline,status:p.status,pipeline_stage:p.pipeline_stage,deal_type:p.deal_type},null,2)));
  if(data.bom.length)sources.push(source('B1','bom','Lista e materialeve / BOM',null,null,JSON.stringify(data.bom.slice(0,500),null,2)));
  if(data.offers.length)sources.push(source('O1','oferta','Ofertat e furnitorëve',null,null,JSON.stringify(data.offers.slice(0,200),null,2)));
  if(data.rfqs.length)sources.push(source('R1','rfq','RFQ-të e projektit',null,null,JSON.stringify(data.rfqs.slice(0,200),null,2)));
  if(data.docs.length)sources.push(source('D1','dokumente','Dokumentet komerciale',null,null,JSON.stringify(data.docs.slice(0,200),null,2)));
  if(data.tasks.length)sources.push(source('T1','detyra','Detyrat e projektit',null,null,JSON.stringify(data.tasks.slice(0,300),null,2)));
  if(data.contacts.length)sources.push(source('C1','kontakte','Kontaktet e projektit',null,null,JSON.stringify(data.contacts.slice(0,300),null,2)))
}
async function collect(pid){
  var p=await sf('projects?id=eq.'+enc(pid)+'&limit=1');if(!p[0])throw new Error('Projekti nuk u gjet.');
  var res=await Promise.all([
    sf('bom_items?project_id=eq.'+enc(pid)+'&order=id.asc&limit=3000'),
    sf('offers?project_id=eq.'+enc(pid)+'&order=created_at.asc&limit=1000'),
    sf('rfq_log?project_id=eq.'+enc(pid)+'&order=sent_at.asc&limit=1000'),
    sf('documents_registry?project_id=eq.'+enc(pid)+'&order=created_at.asc&limit=1000'),
    sf('tasks?project_id=eq.'+enc(pid)+'&order=due_date.asc&limit=1000'),
    sf('project_contacts?project_id=eq.'+enc(pid)+'&order=last_seen.desc&limit=1000'),
    linkedEmails(pid)
  ]);
  var data={project:p[0],bom:res[0],offers:res[1],rfqs:res[2],docs:res[3],tasks:res[4],contacts:res[5],emails:res[6],files:[]},sources=[];structured(data,sources);
  var bodies=await gmailBodies(data.emails,pid);
  data.emails.forEach(function(m,i){sources.push(source('E'+(i+1),'email',m.subject||'(pa subjekt)',m.sent_at,m.gmail_url||(A&&A.gmailUrl?A.gmailUrl(m.gmail_thread_id):null),bodies[m.gmail_message_id]||m.snippet||'',{from:m.from_name||m.from_email||'',to:arr(m.to_emails).join(', '),cc:arr(m.cc_emails).join(', '),direction:m.direction,needs_review:!!m.needs_review}))});
  var ds=await driveSources(data.project,pid);data.files=ds.files;sources=sources.concat(ds.sources);
  var counts={emails:data.emails.length,files:data.files.length,files_read:ds.read,contacts:data.contacts.length,bom:data.bom.length,offers:data.offers.length,rfqs:data.rfqs.length,tasks:data.tasks.length,docs:data.docs.length};
  return{data:data,sources:sources,counts:counts,sourceMap:sources.reduce(function(o,s){o[s.id]=s;return o},{})}
}
function block(s){return'=== ['+s.id+'] '+String(s.type).toUpperCase()+' | '+s.label+' ===\n'+(s.date?'Data: '+s.date+'\n':'')+(s.meta&&s.meta.from?'Nga: '+s.meta.from+'\n':'')+s.text}
function chunks(sources,max){var out=[],cur=[],n=0;arr(sources).forEach(function(s){var b=block(s);if(cur.length&&n+b.length>max){out.push(cur);cur=[];n=0}cur.push(s);n+=b.length});if(cur.length)out.push(cur);return out}

async function groq(model,messages,maxTokens){
  var key=localStorage.getItem('pristeel_apikey')||'';if(!key)throw new Error('Mungon Groq API Key te Cilësimet.');
  var r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:model,messages:messages,max_tokens:maxTokens||5000,temperature:0,response_format:{type:'json_object'}})});
  var text=await r.text(),data={};try{data=JSON.parse(text)}catch(e){}if(!r.ok)throw new Error((data.error&&data.error.message)||('Groq '+r.status+': '+text.slice(0,180)));
  var c=data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;if(!c)throw new Error('Modeli nuk ktheu analizë.');return safeJson(c)
}
async function ask(model,messages,maxTokens){try{return await groq(model,messages,maxTokens)}catch(e){if(model!==MODEL_FAST&&/model|permission|403|404/i.test(e.message))return groq(MODEL_FAST,messages,maxTokens);throw e}}
var extractShape={summary:'',facts:[{text:'',category:'scope|technical|quality|commercial|logistics|contractual|deadline|decision|contact|other',status:'confirmed|unclear|contradictory',source_ids:['P1']}],risks:[{text:'',severity:'critical|high|medium|low',why:'',source_ids:['E1']}],missing_information:[{text:'',why_needed:'',ask_to:'client|supplier|internal',source_ids:['P1']}],deadlines:[{date:'YYYY-MM-DD or null',text:'',status:'confirmed|mentioned|unclear',source_ids:['E1']}],next_actions:[{title:'',why:'',priority:'critical|high|medium|low',owner:'internal|client|supplier',due_in_days:1,source_ids:['E1']}],assumptions:[{text:'',source_ids:[]}]};
async function extractPart(part,i,n,pid){
  var ids=part.map(function(s){return s.id}),prompt='Analizo këtë pjesë të një projekti të prokurimit dhe konstruksioneve të çelikut. Përdor VETËM burimet e dhëna. Mos shpik. Çdo fakt, rrezik, afat dhe veprim duhet të ketë source_ids vetëm nga: '+ids.join(', ')+'. Dallo kërkesën e klientit, informacionin e furnitorit, propozimin e PRISTEEL-it, supozimet dhe kundërthëniet. Mos e trajto mungesën e një fjale në këtë pjesë si provë që mungon në krejt projektin. Përgjigju në shqip vetëm me JSON sipas kësaj forme:\n'+JSON.stringify(extractShape)+'\n\n'+part.map(block).join('\n\n');
  setState(pid,'Po analizohet pjesa '+i+'/'+n+'…');return ask(MODEL_FAST,[{role:'system',content:'Je analist i lartë i projekteve të çelikut. Kthe vetëm JSON të vlefshëm me source_ids.'},{role:'user',content:prompt}],4800)
}
var finalShape={executive_summary:'',current_stage:'',recommendation:{decision:'vazhdo|vazhdo_me_kushte|prit|mos_vazhdo',label:'',reason:'',source_ids:['P1']},health:{score:0,label:'dobët|në rrezik|mesatar|mirë|shumë mirë',reason:''},confidence:{score:0,reason:''},scope:[{text:'',status:'confirmed|inferred|unclear|contradictory',source_ids:['P1']}],requirements:[{category:'technical|quality|commercial|logistics|contractual|documentation',text:'',status:'confirmed|missing|unclear|contradictory',priority:'critical|high|medium|low',source_ids:['E1']}],risks:[{text:'',severity:'critical|high|medium|low',why:'',mitigation:'',source_ids:['E1']}],missing_information:[{text:'',why_needed:'',ask_to:'client|supplier|internal',priority:'critical|high|medium|low',source_ids:['P1']}],deadlines:[{date:'YYYY-MM-DD or null',text:'',status:'confirmed|mentioned|unclear',source_ids:['E1']}],decisions:[{text:'',status:'confirmed|proposed|unclear',source_ids:['E1']}],next_actions:[{title:'',why:'',priority:'critical|high|medium|low',owner:'internal|client|supplier',due_in_days:1,source_ids:['E1']}],assumptions:[{text:'',impact:'',source_ids:[]}],changes_since_last:[{text:'',impact:'positive|negative|neutral',source_ids:['E1']}]};
async function synth(bundle,extracts,previous,pid){
  var manifest=bundle.sources.map(function(s){return{id:s.id,type:s.type,label:s.label,date:s.date}}),prompt='Përgatit analizën përfundimtare operative të projektit në shqip. Përdor vetëm faktet e nxjerra dhe manifestin. Mos shpik. Çdo pikë faktike duhet të ketë source_ids ekzistuese. Nëse informacioni nuk mjafton, shënoje i paqartë ose mungon. Jep hapa konkretë sipas urgjencës. Rekomandimi Bid/No-Bid është këshillues. Mos ngatërro ofertën tonë, ofertën e furnitorit dhe kërkesën e klientit. Maksimum 12 kërkesa, 10 rreziqe, 10 boshllëqe dhe 10 hapa. Kthe vetëm JSON sipas kësaj forme:\n'+JSON.stringify(finalShape)+'\n\nPROJEKTI DHE NUMRAT:\n'+JSON.stringify({project:bundle.data.project,counts:bundle.counts})+'\n\nBURIMET:\n'+JSON.stringify(manifest)+'\n\nNXJERRJET:\n'+JSON.stringify(extracts)+'\n\nANALIZA E MËPARSHME:\n'+JSON.stringify(previous&&previous.analysis||null);
  setState(pid,'Po përgatitet vlerësimi përfundimtar…');return ask(MODEL_MAIN,[{role:'system',content:'Je drejtor i prokurimit dhe menaxhimit të projekteve të çelikut. Analiza duhet të jetë e saktë, e zbatueshme dhe e lidhur me burimet. Kthe vetëm JSON.'},{role:'user',content:prompt}],7000)
}
function localAnalysis(b){
  var d=b.data,p=d.project,today=new Date();today.setHours(0,0,0,0);var risks=[],missing=[],actions=[],req=[],dead=[],score=78;
  if(p.deadline){var dd=new Date(p.deadline),days=Math.ceil((dd-today)/86400000);dead.push({date:String(p.deadline).slice(0,10),text:'Afati i regjistruar i projektit',status:'confirmed',source_ids:['P1']});if(days<0){risks.push({text:'Afati i projektit ka kaluar.',severity:'critical',why:'Afati i regjistruar është '+String(p.deadline).slice(0,10)+'.',mitigation:'Konfirmo menjëherë nëse afati është shtyrë.',source_ids:['P1']});actions.push({title:'Konfirmo statusin e afatit me klientin',why:'Afati i regjistruar ka kaluar.',priority:'critical',owner:'client',due_in_days:0,source_ids:['P1']});score-=28}else if(days<=7){risks.push({text:'Afati është shumë afër.',severity:'high',why:'Kanë mbetur rreth '+days+' ditë.',mitigation:'Mbyll boshllëqet kritike dhe cakto review final.',source_ids:['P1']});score-=15}}else{missing.push({text:'Afati përfundimtar',why_needed:'Pa afat nuk mund të ndërtohet plani.',ask_to:'client',priority:'critical',source_ids:['P1']});actions.push({title:'Konfirmo afatin përfundimtar',why:'Projekti nuk ka afat të regjistruar.',priority:'high',owner:'client',due_in_days:1,source_ids:['P1']});score-=12}
  if(!d.contacts.length){missing.push({text:'Kontaktet përgjegjëse',why_needed:'Mungon rruga e komunikimit dhe vendimmarrjes.',ask_to:'internal',priority:'high',source_ids:['P1']});score-=10}
  if(!d.emails.length){risks.push({text:'Nuk ka emaila të lidhur me projektin.',severity:'high',why:'Komunikimi dhe vendimet nuk mund të verifikohen.',mitigation:'Sinkronizo dhe lidhi thread-et.',source_ids:['P1']});actions.push({title:'Lidhi emailat e projektit',why:'Komunikimi mungon nga dosja e projektit.',priority:'high',owner:'internal',due_in_days:1,source_ids:['P1']});score-=15}
  if(!d.files.length){missing.push({text:'Dokumentacioni teknik dhe komercial',why_needed:'Scope-i nuk mund të verifikohet.',ask_to:'internal',priority:'high',source_ids:['P1']});actions.push({title:'Importo dokumentet kryesore',why:'Dosja e Drive-it nuk ka skedarë.',priority:'high',owner:'internal',due_in_days:1,source_ids:['P1']});score-=12}
  if(!d.offers.length){missing.push({text:'Oferta e furnitorit',why_needed:'Kostoja dhe fizibiliteti nuk mund të vlerësohen.',ask_to:'supplier',priority:'high',source_ids:d.rfqs.length?['R1']:['P1']});actions.push({title:d.rfqs.length?'Ndiq furnitorët për ofertë':'Dërgo RFQ te furnitorët',why:'Ende nuk ka ofertë furnitori.',priority:'high',owner:'supplier',due_in_days:2,source_ids:d.rfqs.length?['R1']:['P1']});score-=12}
  if(d.emails.some(function(e){return e.needs_review})){risks.push({text:'Ka thread-e që kërkojnë kontroll të projektit.',severity:'high',why:'Komunikimi mund të përmbajë disa projekte.',mitigation:'Ndaji mesazhet sipas projektit.',source_ids:d.emails.filter(function(e){return e.needs_review}).slice(0,5).map(function(e){return'E'+(d.emails.indexOf(e)+1)})});score-=10}
  if(d.bom.length)req.push({category:'technical',text:'BOM është regjistruar me '+d.bom.length+' pozicione.',status:'confirmed',priority:'medium',source_ids:['B1']});
  if(d.offers.length)req.push({category:'commercial',text:'Janë regjistruar '+d.offers.length+' oferta furnitorësh.',status:'confirmed',priority:'medium',source_ids:['O1']});
  if(!actions.length)actions.push({title:'Bëj review të kërkesave dhe cakto hapin e ardhshëm',why:'Të dhënat bazë janë të pranishme, por kërkohet validim njerëzor.',priority:'medium',owner:'internal',due_in_days:2,source_ids:['P1']});
  score=Math.max(5,Math.min(95,score));return{executive_summary:'Projekti “'+(p.name||'pa emër')+'” për '+(p.client||'klient të pacaktuar')+' ka '+d.emails.length+' emaila, '+d.files.length+' skedarë, '+d.contacts.length+' kontakte dhe '+d.offers.length+' oferta furnitorësh. Ky është vlerësim operativ me rregulla; analiza semantike kërkon Groq API Key.',current_stage:p.pipeline_stage||p.status||'E pakonfirmuar',recommendation:{decision:score>=72?'vazhdo_me_kushte':score>=50?'prit':'mos_vazhdo',label:score>=72?'Vazhdo, me kushte':score>=50?'Prit dhe plotëso boshllëqet':'Mos vazhdo pa korrigjime',reason:'Rekomandimi bazohet në plotësinë e të dhënave, afatet, dokumentet dhe ofertat.',source_ids:['P1']},health:{score:score,label:score>=80?'mirë':score>=60?'mesatar':score>=40?'në rrezik':'dobët',reason:'Rezultat operativ.'},confidence:{score:Math.min(90,35+d.emails.length*2+d.files.length*4+d.contacts.length*3),reason:'Besueshmëria rritet me burimet e lidhura.'},scope:[{text:(p.name||'Projekti')+(p.client?' për '+p.client:''),status:'confirmed',source_ids:['P1']}],requirements:req,risks:risks,missing_information:missing,deadlines:dead,decisions:[],next_actions:actions,assumptions:[],changes_since_last:[]}
}
function normalize(a){a=a&&typeof a==='object'?a:{};a.executive_summary=String(a.executive_summary||'Nuk u krijua përmbledhja.');a.current_stage=String(a.current_stage||'E pakonfirmuar');a.recommendation=a.recommendation||{decision:'prit',label:'Prit',reason:'Të dhëna të pamjaftueshme',source_ids:[]};a.health=a.health||{score:0,label:'',reason:''};a.health.score=Math.max(0,Math.min(100,Number(a.health.score)||0));a.confidence=a.confidence||{score:0,reason:''};a.confidence.score=Math.max(0,Math.min(100,Number(a.confidence.score)||0));['scope','requirements','risks','missing_information','deadlines','decisions','next_actions','assumptions','changes_since_last'].forEach(function(k){a[k]=arr(a[k])});return a}
function ds(v){v=String(v||'').toLowerCase();if(v==='vazhdo')return{c:'#2F7657',bg:'#EAF5EF',line:'#CFE7D9'};if(v==='vazhdo_me_kushte')return{c:'#9B6A22',bg:'#FAF2E3',line:'#EEDDBB'};if(v==='mos_vazhdo')return{c:'#A64B42',bg:'#F9ECEA',line:'#EFCFCA'};return{c:'#3D6F8E',bg:'#EAF2F7',line:'#D2E3EC'}}
function ss(v){v=String(v||'').toLowerCase();if(v==='critical')return{c:'#A64B42',bg:'#F9ECEA'};if(v==='high')return{c:'#9B6A22',bg:'#FAF2E3'};if(v==='medium')return{c:'#3D6F8E',bg:'#EAF2F7'};return{c:'#5D6872',bg:'#EDF1F3'}}
function srcHtml(ids,b){return uniq(ids).filter(function(id){return b&&b.sourceMap&&b.sourceMap[id]}).map(function(id){return'<button class="pai-src" onclick="pstProjectAnalysisSource(\''+esc(b.pid)+'\',\''+esc(id)+'\')">'+esc(id)+'</button>'}).join('')}
function items(list,b){if(!list.length)return'<div class="pai-is" style="padding:9px">Asnjë pikë e identifikuar.</div>';return list.map(function(x){var s=ss(x.severity||x.priority||x.status),sub=x.why||x.why_needed||x.mitigation||x.impact||'';return'<div class="pai-item"><i class="pai-dot" style="--ic:'+s.c+';--ib:'+s.bg+'"></i><div><div class="pai-it">'+esc(x.text||x.title||'')+'</div>'+(sub?'<div class="pai-is">'+esc(sub)+'</div>':'')+'<div class="pai-tags">'+(x.category?'<span class="pai-tag">'+esc(x.category)+'</span>':'')+(x.status?'<span class="pai-tag">'+esc(x.status)+'</span>':'')+(x.severity||x.priority?'<span class="pai-tag" style="background:'+s.bg+';color:'+s.c+'">'+esc(x.severity||x.priority)+'</span>':'')+srcHtml(x.source_ids,b)+'</div></div></div>'}).join('')}
function actionItems(list,b){if(!list.length)return'<div class="pai-is" style="padding:9px">Nuk u propozuan hapa të rinj.</div>';return list.map(function(x,i){var s=ss(x.priority);return'<div class="pai-action"><div class="pai-n" style="--ac:'+s.c+';--ab:'+s.bg+'">'+(i+1)+'</div><div class="pai-am"><div class="pai-at">'+esc(x.title)+'</div><div class="pai-aw">'+esc(x.why||'')+'</div><div class="pai-tags"><span class="pai-tag" style="background:'+s.bg+';color:'+s.c+'">'+esc(x.priority||'medium')+'</span><span class="pai-tag">'+esc(x.owner||'internal')+'</span>'+srcHtml(x.source_ids,b)+'</div></div><div class="pai-due">'+(isFinite(Number(x.due_in_days))?'+'+Number(x.due_in_days)+' ditë':'')+'</div></div>'}).join('')}
function card(title,list,html){return'<div class="pai-sec"><div class="pai-sec-hd"><div class="pai-sec-title">'+title+'</div><div class="pai-count">'+list.length+'</div></div><div class="pai-list">'+html+'</div></div>'}
function render(pid,rec,b){
  var host=document.getElementById('pai-body-'+pid);if(!host)return;
  if(!rec||!rec.analysis){host.innerHTML='<div class="pai-empty"><b>Analiza nuk është krijuar ende</b><p>Platforma do të lexojë emailat, kontaktet, BOM-in, ofertat, detyrat dhe skedarët në Drive, pastaj do të nxjerrë rreziqet, boshllëqet dhe hapat konkretë.</p><button class="pai-btn primary" onclick="pstAnalyzeProject(\''+esc(pid)+'\')">Analizo të gjithë projektin</button></div>';return}
  var a=normalize(rec.analysis),d=ds(a.recommendation.decision);b=b||{sourceMap:{},pid:String(pid)};b.pid=String(pid);
  var h='<div class="pai-top"><div class="pai-card"><div class="pai-label">Përmbledhja ekzekutive</div><div class="pai-summary">'+esc(a.executive_summary)+'</div></div><div class="pai-card pai-decision" style="--dc:'+d.c+';--dc-bg:'+d.bg+';--dc-line:'+d.line+'"><div class="pai-label">Rekomandimi</div><div class="pai-decision-main">'+esc(a.recommendation.label||a.recommendation.decision)+'</div><div class="pai-decision-reason">'+esc(a.recommendation.reason||'')+'</div><div class="pai-score"><div class="pai-score-track"><i style="width:'+a.health.score+'%"></i></div><span>'+a.health.score+'/100</span></div></div></div><div class="pai-grid">';
  h+=card('Hapat e rekomanduar',a.next_actions,actionItems(a.next_actions,b));
  h+=card('Rreziqet',a.risks,items(a.risks,b));
  h+=card('Informacioni që mungon',a.missing_information,items(a.missing_information,b));
  h+=card('Kërkesat kryesore',a.requirements,items(a.requirements,b));
  if(a.deadlines.length)h+=card('Afatet',a.deadlines,items(a.deadlines,b));
  if(a.changes_since_last.length)h+=card('Çfarë ndryshoi',a.changes_since_last,items(a.changes_since_last,b));
  h+='</div><div class="pai-meta"><span>Faza: <strong>'+esc(a.current_stage)+'</strong></span><span>Besueshmëria: <strong>'+a.confidence.score+'%</strong></span><span>Analiza: <strong>'+fmt(rec.created_at)+'</strong></span><span>Burime: <strong>'+arr(rec.source_manifest).length+'</strong></span><button onclick="pstProjectAnalysisSources(\''+esc(pid)+'\')">Shiko burimet</button></div>';
  host.innerHTML=h;var bt=document.getElementById('pai-analyze-'+pid);if(bt)bt.textContent='Rifresko analizën'
}
async function latest(pid){if(!await tableReady()){try{return JSON.parse(localStorage.getItem('pst_project_analysis_'+pid)||'null')}catch(e){return null}}var r=await supaFetch('project_analyses?project_id=eq.'+enc(pid)+'&order=created_at.desc&limit=1');return r&&r[0]||null}
async function save(pid,b,a,engine,model){
  var payload={project_id:String(pid),status:'complete',engine:engine,model:model||null,analysis:a,source_manifest:b.sources.map(function(s){return{id:s.id,type:s.type,label:s.label,date:s.date,url:s.url,meta:s.meta}}),source_counts:b.counts,created_at:new Date().toISOString()};
  if(await tableReady()){var r=await supaFetch('project_analyses','POST',payload);return r&&r[0]||payload}
  payload.id='local-'+Date.now();localStorage.setItem('pst_project_analysis_'+pid,JSON.stringify(payload));return payload
}
window.pstProjectAnalysisLoad=async function(pid){
  setState(pid,'Po ngarkohet analiza…');try{var r=await latest(pid),b={pid:String(pid),sourceMap:{},sources:[]};arr(r&&r.source_manifest).forEach(function(s){b.sourceMap[s.id]=s;b.sources.push(s)});cache[String(pid)]={record:r,bundle:b};render(pid,r,b);setState(pid,r?'Analiza e fundit u ngarkua.':'Gati për analizën e parë.')}catch(e){setState(pid,'Analiza nuk u ngarkua: '+e.message,'#A64B42')}
};
window.pstAnalyzeProject=async function(pid){
  if(cache[String(pid)]&&cache[String(pid)].busy)return;cache[String(pid)]=cache[String(pid)]||{};cache[String(pid)].busy=true;busy(pid,true);prog(pid,true,3);
  try{
    setState(pid,'Po mblidhen të dhënat e projektit…');var previous=await latest(pid),b=await collect(pid),key=localStorage.getItem('pristeel_apikey')||'',a,engine='rules',model=null;prog(pid,true,44);
    if(key){
      var cc=chunks(b.sources,18500).slice(0,12),ex=[];for(var i=0;i<cc.length;i++){ex.push(await extractPart(cc[i],i+1,cc.length,pid));prog(pid,true,45+Math.round((i+1)/Math.max(cc.length,1)*34))}
      a=normalize(await synth(b,ex,previous,pid));engine='groq';model=MODEL_MAIN
    }else a=normalize(localAnalysis(b));
    prog(pid,true,88);setState(pid,'Po ruhet analiza dhe historiku…');var rec=await save(pid,b,a,engine,model);b.pid=String(pid);cache[String(pid)]={record:rec,bundle:b,busy:false};render(pid,rec,b);prog(pid,true,100);
    setState(pid,engine==='groq'?'Analiza e plotë u krijua nga të gjitha burimet e lexueshme.':'U krijua analiza operative me rregulla. Shto Groq API Key për analizë semantike.','#2F7657');setTimeout(function(){prog(pid,false,0)},900)
  }catch(e){setState(pid,'Analiza dështoi: '+e.message,'#A64B42');prog(pid,false,0)}
  finally{cache[String(pid)]=cache[String(pid)]||{};cache[String(pid)].busy=false;busy(pid,false)}
};
window.pstProjectAnalysisCreateTasks=async function(pid){
  var c=cache[String(pid)],r=c&&c.record,a=r&&normalize(r.analysis);if(!a||!a.next_actions.length){alert('Nuk ka hapa për t’u kthyer në detyra.');return}
  var old=await sf('tasks?project_id=eq.'+enc(pid)+'&source=eq.project_analysis&select=title&limit=500'),seen={};arr(old).forEach(function(x){seen[String(x.title||'').toLowerCase()]=1});var now=new Date(),rows=[];
  a.next_actions.slice(0,10).forEach(function(x){if(seen[String(x.title||'').toLowerCase()])return;var due=new Date(now.getTime()+Math.max(0,Number(x.due_in_days)||0)*86400000);rows.push({project_id:String(pid),title:x.title||'Veprim nga analiza',detail:(x.why||'')+(r&&r.id?'\nAnaliza #'+r.id:''),due_date:due.toISOString().slice(0,10),status:'hapur',priority:x.priority||'normal',category:x.owner==='client'?'klient':x.owner==='supplier'?'furnitor':'intern',source:'project_analysis'})});
  if(!rows.length){alert('Këto hapa janë krijuar tashmë.');return}try{await supaFetch('tasks','POST',rows);setState(pid,rows.length+' detyra u krijuan nga analiza.','#2F7657');if(typeof loadTasks==='function')loadTasks()}catch(e){alert('Detyrat nuk u krijuan: '+e.message)}
};
function modal(title,sub,body){var old=document.getElementById('pai-modal-bg');if(old)old.remove();var bg=document.createElement('div');bg.id='pai-modal-bg';bg.className='pai-modal-bg';bg.innerHTML='<div class="pai-modal"><div class="pai-modal-hd"><div><div class="pai-modal-title">'+esc(title)+'</div><div class="pai-modal-sub">'+esc(sub||'')+'</div></div><button class="pai-x" onclick="document.getElementById(\'pai-modal-bg\').remove()">×</button></div><div class="pai-modal-body">'+body+'</div></div>';bg.onclick=function(e){if(e.target===bg)bg.remove()};document.body.appendChild(bg)}
window.pstProjectAnalysisSources=function(pid){var c=cache[String(pid)],r=c&&c.record,b=c&&c.bundle,list=(b&&b.sources)||arr(r&&r.source_manifest),html=list.length?list.map(function(s){return'<div class="pai-source-row"><div class="pai-source-id">'+esc(s.id)+' · '+esc(s.type||'burim')+'</div><div class="pai-source-name">'+esc(s.label||'')+'</div><div class="pai-source-meta">'+esc(fmt(s.date))+(s.url?' · <a href="'+esc(s.url)+'" target="PRISTEEL_SOURCE">Hap burimin</a>':'')+'</div>'+(s.text?'<div class="pai-source-text">'+esc(cap(s.text,1200))+'</div>':'')+'</div>'}).join(''):'<div class="pai-is">Burimet nuk janë të disponueshme.</div>';modal('Burimet e analizës',list.length+' burime të lidhura me këtë version.',html)};
window.pstProjectAnalysisSource=function(pid,id){var c=cache[String(pid)],s=c&&c.bundle&&c.bundle.sourceMap&&c.bundle.sourceMap[id];if(!s){alert('Burimi '+id+' nuk u gjet.');return}modal('Burimi '+id,s.type||'', '<div class="pai-source-row"><div class="pai-source-name">'+esc(s.label)+'</div><div class="pai-source-meta">'+esc(fmt(s.date))+(s.url?' · <a href="'+esc(s.url)+'" target="PRISTEEL_SOURCE">Hap burimin</a>':'')+'</div><div class="pai-source-text">'+esc(s.text||'Përmbajtja e plotë nuk ruhet në historik; hape burimin origjinal.')+'</div></div>')};
window.pstProjectAnalysisHistory=async function(pid){
  if(!await tableReady()){alert('Historiku ruhet pasi të ekzekutohet SQL-ja e Project Intelligence.');return}var rows=await supaFetch('project_analyses?project_id=eq.'+enc(pid)+'&order=created_at.desc&limit=30'),html=arr(rows).length?rows.map(function(r){var a=normalize(r.analysis);return'<div class="pai-history" onclick="pstProjectAnalysisUseHistory(\''+esc(pid)+'\','+r.id+')"><div class="pai-history-main"><div class="pai-history-title">'+esc(a.recommendation.label||'Analizë projekti')+'</div><div class="pai-history-sub">'+fmt(r.created_at)+' · '+esc(r.engine||'')+' · '+arr(r.source_manifest).length+' burime</div></div><div class="pai-history-score">'+a.health.score+'</div></div>'}).join(''):'<div class="pai-is">Nuk ka analiza të ruajtura.</div>';modal('Historiku i analizave','Çdo rifreskim ruhet si version i veçantë.',html)
};
window.pstProjectAnalysisUseHistory=async function(pid,id){var rows=await supaFetch('project_analyses?id=eq.'+id+'&limit=1'),r=rows&&rows[0];if(!r)return;var b={pid:String(pid),sourceMap:{},sources:arr(r.source_manifest)};b.sources.forEach(function(s){b.sourceMap[s.id]=s});cache[String(pid)]={record:r,bundle:b};render(pid,r,b);var m=document.getElementById('pai-modal-bg');if(m)m.remove();setState(pid,'Po shfaqet analiza e datës '+fmt(r.created_at)+'.')};

function section(pid){return'<div class="pai-box" id="pai-'+esc(pid)+'"><div class="pai-hd"><div><div class="pai-kicker">Project Intelligence</div><div class="pai-title">Analiza dhe hapat e ardhshëm</div><div class="pai-sub">Emailat, skedarët, kontaktet, ofertat, afatet dhe detyrat analizohen si një projekt i vetëm.</div></div><div class="pai-actions"><button class="pai-btn" id="pai-history-'+esc(pid)+'" onclick="pstProjectAnalysisHistory(\''+esc(pid)+'\')">Historiku</button><button class="pai-btn" id="pai-tasks-'+esc(pid)+'" onclick="pstProjectAnalysisCreateTasks(\''+esc(pid)+'\')">Krijo detyrat</button><button class="pai-btn primary" id="pai-analyze-'+esc(pid)+'" onclick="pstAnalyzeProject(\''+esc(pid)+'\')">Analizo projektin</button></div></div><div class="pai-state" id="pai-state-'+esc(pid)+'">Duke ngarkuar…</div><div class="pai-progress" id="pai-progress-'+esc(pid)+'"><i id="pai-fill-'+esc(pid)+'"></i></div><div class="pai-body" id="pai-body-'+esc(pid)+'"></div></div>'}
function inject(){
  if(typeof window.renderOverviewModal!=='function')return false;if(window.renderOverviewModal.__pai)return true;var original=window.renderOverviewModal;
  window.renderOverviewModal=function(id,p){original.apply(this,arguments);try{var body=document.getElementById('ov-body');if(!body||document.getElementById('pai-'+id))return;var h=document.createElement('div');h.innerHTML=section(String(id));var node=h.firstChild,contacts=document.getElementById('pct-'+id),emails=document.getElementById('pem-'+id);if(contacts&&contacts.parentNode)contacts.parentNode.insertBefore(node,contacts);else if(emails&&emails.parentNode)emails.parentNode.insertBefore(node,emails);else body.insertBefore(node,body.firstChild);setTimeout(function(){pstProjectAnalysisLoad(String(id))},60)}catch(e){console.error('project analysis inject',e)}};window.renderOverviewModal.__pai=true;return true
}
var tries=0,t=setInterval(function(){if(inject()||++tries>80)clearInterval(t)},300);
})();
