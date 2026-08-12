/* PRISTEEL safe linked-Gmail recovery
 * Uses only Gmail messages already linked to the current project.
 * It never searches by client name and therefore cannot mix sibling projects.
 * Repeated Gmail copies are collapsed conservatively by exact filename + byte size.
 */
(function(){
'use strict';
if(window.__pstLinkedGmailRecoveryV2)return;
window.__pstLinkedGmailRecoveryV2=true;

var fallbackCollector=window.pstCollectProjectGmail;
var state={projectId:'',project:null,rows:[],messages:[],files:[],token:'',busy:false,stats:{raw:0,signatures:0,duplicates:0}};
function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function uniq(rows,key){var seen={};return arr(rows).filter(function(x){var k=String(key(x)||'');if(!k||seen[k])return false;seen[k]=1;return true;});}
function hdr(payload,name){var hs=payload&&payload.headers||[];name=String(name||'').toLowerCase();for(var i=0;i<hs.length;i++)if(String(hs[i].name||'').toLowerCase()===name)return hs[i].value||'';return'';}
function fmtDate(v){var d=new Date(v);return isNaN(d.getTime())?'':d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}
function fmtBytes(v){var n=Number(v||0);if(!n)return'';if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(n<10240?1:0)+' KB';return(n/1048576).toFixed(n<10485760?1:0)+' MB';}
function inFilter(field,values){return field+'=in.('+values.map(function(x){return'"'+String(x).replace(/"/g,'')+'"';}).join(',')+')';}
function isLikelySignature(file){var n=String(file.filename||'').toLowerCase(),m=String(file.mimeType||'').toLowerCase();if(file.inline)return true;if(/^(image\d+|outlook-|~wrd|logo|linkedin|facebook|instagram)/.test(n))return true;if(/smime\.p7s$/.test(n))return true;if(m.indexOf('image/')===0&&Number(file.size||0)<120000&&!/(drawing|zeichnung|plan|skic|schema|detail|screenshot|screen shot)/i.test(n))return true;return false;}
function fileKind(file){var x=String((file.filename||'')+' '+(file.subject||'')).toLowerCase();if(/angebot|quotation|quote|ofert|proposal|preis|\bquo\b/.test(x))return'Ofertë';if(/vertrag|contract|kontrat|agreement|nda|ugovor|purchase order|bestellung/.test(x))return'Kontratë';if(/invoice|rechnung|fatur|vorausrechnung|payment|zahlung/.test(x))return'Faturë / pagesë';if(/bom|material list|stückliste|lista e material/.test(x))return'BOM';if(/drawing|zeichnung|plan|statik|welding|schweiss|detail|cad|dwg|step|stp/.test(x))return'Teknik';return'Dokument';}
function normalizedFileName(name){var s=String(name||'').trim();try{s=s.normalize('NFKC');}catch(e){}return s.toLowerCase().replace(/\s+/g,' ');}
function fileExt(name){var m=String(name||'').toLowerCase().match(/\.([a-z0-9]{1,8})$/);return m?m[1]:'';}
function baseName(name){return String(name||'').toLowerCase().replace(/\.[^.]+$/,'').replace(/\b(?:rev|revision|ver|version)[._ -]*\d+(?:[._-]\d+)?\b/g,' ').replace(/\b(?:final|signed|approved|draft)\b/g,' ').replace(/[^a-z0-9à-ž]+/gi,' ').replace(/\s+/g,' ').trim();}
function dedupeKey(file){var n=normalizedFileName(file&&file.filename),size=Number(file&&file.size||0);return n&&size>0?n+'|'+size:String(file&&file.key||'');}
function collapseRepeatedFiles(files){
  var by={},out=[],signatures=0,duplicates=0;
  arr(files).forEach(function(f){
    if(isLikelySignature(f)){signatures++;return;}
    var k=dedupeKey(f);if(!k){out.push(f);return;}
    var existing=by[k];
    if(!existing){f.duplicateCount=1;by[k]=f;out.push(f);return;}
    duplicates++;var count=Number(existing.duplicateCount||1)+1;
    if(Number(f.internalDate||0)>Number(existing.internalDate||0)){
      var idx=out.indexOf(existing);f.duplicateCount=count;by[k]=f;if(idx>-1)out[idx]=f;
    }else existing.duplicateCount=count;
  });
  out.sort(function(a,b){return Number(b.internalDate||0)-Number(a.internalDate||0);});
  return{files:out,signatures:signatures,duplicates:duplicates,raw:arr(files).length};
}
function rank(file){var n=String(file.filename||'').toLowerCase(),r=Number(file.internalDate||0)/1e12,m=n.match(/(?:rev|revision)[._ -]*(\d+(?:[._-]\d+)?)/);if(m)r+=parseFloat(m[1].replace('_','.'))*100;if(/signed|nenshkruar|unterzeichnet/.test(n))r+=10000;if(/final|approved/.test(n))r+=5000;if(/draft/.test(n))r-=2000;return r;}
function versionFamily(file){var n=baseName(file&&file.filename)||normalizedFileName(file&&file.filename);return n+'|'+fileExt(file&&file.filename);}
function defaultSelectionReason(file){
  var name=normalizedFileName(file&&file.filename),ext=fileExt(file&&file.filename);
  if(/^(eml|msg)$/.test(ext))return'Email export — zgjedhje manuale';
  if(ext==='ics')return'Kalendari — zgjedhje manuale';
  if(/(^|[\s._-])(template|vorlage|briefvorlage|blanko|muster|letterhead|briefkopf)([\s._-]|$)/i.test(name))return'Template/blanko — zgjedhje manuale';
  return'';
}
function shouldAutoSelect(file){return !defaultSelectionReason(file);}
function markRecommended(files){
  var groups={};
  files.forEach(function(f){var k=versionFamily(f);f.selectionNote=defaultSelectionReason(f);(groups[k]=groups[k]||[]).push(f);});
  Object.keys(groups).forEach(function(k){groups[k].sort(function(a,b){return rank(b)-rank(a);}).forEach(function(f,i){f.recommended=i===0&&shouldAutoSelect(f);});});
}
function setStatus(text,type,pct){var e=document.getElementById('plgr-status');if(e){e.textContent=text||'';e.className='plgr-status'+(type?' '+type:'');}var p=document.getElementById('plgr-progress');if(p&&pct!=null)p.style.width=Math.max(0,Math.min(100,pct))+'%';}
function setBusy(on){state.busy=!!on;document.querySelectorAll('.plgr-action,.plgr-close').forEach(function(b){b.disabled=!!on;});}
async function safe(path){try{return arr(await window.supaFetch(path));}catch(e){return[];}}
async function linkedRows(projectId){
  var direct=await safe('project_emails?project_id=eq.'+encodeURIComponent(projectId)+'&select=*&order=sent_at.desc&limit=3000');
  var links=await safe('project_email_links?project_id=eq.'+encodeURIComponent(projectId)+'&select=gmail_message_id,gmail_thread_id&limit=5000');
  var ids=uniq(links,function(x){return x.gmail_message_id;}).map(function(x){return x.gmail_message_id;}).filter(Boolean),threads=uniq(links,function(x){return x.gmail_thread_id;}).map(function(x){return x.gmail_thread_id;}).filter(Boolean),linked=[];
  for(var i=0;i<ids.length;i+=30)linked=linked.concat(await safe('project_emails?'+inFilter('gmail_message_id',ids.slice(i,i+30))+'&select=*&order=sent_at.desc&limit=3000'));
  for(var j=0;j<threads.length;j+=25)linked=linked.concat(await safe('project_emails?'+inFilter('gmail_thread_id',threads.slice(j,j+25))+'&select=*&order=sent_at.desc&limit=3000'));
  return uniq(direct.concat(linked),function(x){return x.gmail_message_id||x.id;}).filter(function(x){return x.gmail_message_id;});
}
function collectParts(part,message,row,out){
  if(!part)return;
  var fn=String(part.filename||'').trim(),body=part.body||{},disp=hdr({headers:part.headers||[]},'Content-Disposition').toLowerCase();
  if(fn&&(body.attachmentId||body.data))out.push({
    key:message.id+':'+(body.attachmentId||fn),messageId:message.id,threadId:message.threadId,attachmentId:body.attachmentId||'',inlineData:body.data||'',filename:fn,mimeType:part.mimeType||'application/octet-stream',size:Number(body.size||0),internalDate:Number(message.internalDate||0),inline:disp.indexOf('inline')>-1,subject:row.subject||hdr(message.payload,'Subject')||'',sentAt:row.sent_at||new Date(Number(message.internalDate||0)).toISOString(),gmailUrl:row.gmail_url||('https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(message.threadId||message.id))
  });
  arr(part.parts).forEach(function(x){collectParts(x,message,row,out);});
}
async function map(items,limit,fn,progress){var out=new Array(items.length),i=0,done=0;async function worker(){while(true){var k=i++;if(k>=items.length)return;try{out[k]=await fn(items[k]);}catch(e){out[k]=null;}done++;if(progress)progress(done,items.length);}}var workers=[];for(var w=0;w<Math.min(limit,items.length);w++)workers.push(worker());await Promise.all(workers);return out.filter(Boolean);}
async function loadData(){
  setBusy(true);setStatus('Duke lexuar vetëm emailat e lidhur me këtë projekt…','',5);
  try{
    state.project=(await safe('projects?id=eq.'+encodeURIComponent(state.projectId)+'&select=id,name,client,ref&limit=1'))[0];
    if(!state.project)throw new Error('Projekti nuk u gjet.');
    var sub=document.getElementById('plgr-sub');if(sub)sub.textContent=state.project.name||'Projekti';
    state.rows=await linkedRows(state.projectId);
    if(!state.rows.length){render();setStatus('Ky projekt nuk ka ende emaila të lidhur. Përdor “Kërko emaila të tjerë” vetëm për këtë rast.','warn',0);return;}
    setStatus('U gjetën '+state.rows.length+' emaila të lidhur. Duke lexuar attachment-et…','',15);
    state.token=await window.PSTEmail.auth();
    var by={};state.rows.forEach(function(r){by[String(r.gmail_message_id)]=r;});
    state.messages=await map(state.rows,5,async function(row){return window.PSTEmail.gmail('/messages/'+encodeURIComponent(row.gmail_message_id)+'?format=full',state.token);},function(done,total){setStatus('Duke kontrolluar emailat '+done+'/'+total+'…','',15+Math.round(done/Math.max(total,1)*55));});
    var files=[];state.messages.forEach(function(m){collectParts(m.payload,m,by[String(m.id)]||{},files);});
    files=uniq(files,function(f){return f.key;});
    var collapsed=collapseRepeatedFiles(files);state.files=collapsed.files;state.stats={raw:collapsed.raw,signatures:collapsed.signatures,duplicates:collapsed.duplicates};
    markRecommended(state.files);render();
    if(state.files.length){
      var note='U gjetën '+state.files.length+' skedarë unikë realë.';
      if(state.stats.duplicates)note+=' U bashkuan '+state.stats.duplicates+' kopje të përsëritura.';
      if(state.stats.signatures)note+=' U fshehën '+state.stats.signatures+' inline/nënshkrime.';
      setStatus(note,'ok',100);
    }else setStatus('Emailat janë lidhur, por nuk kanë attachment-e realë pas filtrimit.','ok',100);
  }catch(e){setStatus('Gabim: '+String(e&&e.message||e),'err',0);}
  finally{setBusy(false);}
}
function render(){
  var host=document.getElementById('plgr-results');if(!host)return;
  var real=state.files,selected=real.filter(function(f){return f.recommended;});
  var messageRows=state.rows.slice(0,50).map(function(r){return'<a class="plgr-mail" target="_blank" href="'+esc(r.gmail_url||'')+'"><b>'+esc(r.subject||'(pa subjekt)')+'</b><span>'+esc(r.from_name||r.from_email||'')+' · '+esc(fmtDate(r.sent_at))+'</span></a>';}).join('');
  var fileRows=state.files.map(function(f){var checked=f.recommended?' checked':'',copies=Number(f.duplicateCount||1)>1?' · '+Number(f.duplicateCount||1)+' kopje në emaila':'',manual=f.selectionNote?' · '+f.selectionNote:'';return'<label class="plgr-file'+(f.selectionNote?' manual':'')+'"><input type="checkbox" class="plgr-check" value="'+esc(f.key)+'"'+checked+'><div class="plgr-filemain"><b>'+esc(f.filename)+'</b><span>'+esc(fileKind(f))+' · '+esc(fmtDate(f.sentAt))+' · '+esc(fmtBytes(f.size))+esc(copies)+esc(manual)+'</span></div><a target="_blank" href="'+esc(f.gmailUrl)+'">Emaili</a></label>';}).join('');
  var filtered=(state.stats.duplicates||state.stats.signatures)?'<div class="plgr-filter-note">'+(state.stats.duplicates?state.stats.duplicates+' kopje të përsëritura u bashkuan. ':'')+(state.stats.signatures?state.stats.signatures+' inline/nënshkrime u fshehën.':'')+'</div>':'';
  host.innerHTML='<div class="plgr-kpis"><div><b>'+state.rows.length+'</b><span>Emaila të lidhur</span></div><div><b>'+real.length+'</b><span>Skedarë unikë realë</span></div><div><b>'+selected.length+'</b><span>Të zgjedhur</span></div></div>'+filtered+'<h4>Skedarët unikë të emailave të këtij projekti</h4><div class="plgr-list">'+(fileRows||'<div class="plgr-empty">Nuk u gjet asnjë attachment real.</div>')+'</div><details><summary>Emailat e lidhur</summary><div class="plgr-mails">'+(messageRows||'<div class="plgr-empty">Nuk ka emaila.</div>')+'</div></details>';
}
function b64Bytes(data){var s=String(data||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var raw=atob(s),bytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;}
async function fileObject(a){var data=a.inlineData;if(!data){var r=await window.PSTEmail.gmail('/messages/'+encodeURIComponent(a.messageId)+'/attachments/'+encodeURIComponent(a.attachmentId),state.token);data=r.data||'';}return new File([b64Bytes(data)],a.filename,{type:a.mimeType||'application/octet-stream'});}
async function importSelected(){
  if(state.busy)return;
  var keys=Array.prototype.slice.call(document.querySelectorAll('.plgr-check:checked')).map(function(x){return x.value;}),selected=state.files.filter(function(f){return keys.indexOf(f.key)>-1;});
  if(!selected.length){setStatus('Zgjidh të paktën një skedar.','warn',0);return;}
  if(!window.PSTDriveImport||typeof window.PSTDriveImport.importFiles!=='function'){setStatus('Importuesi i skedarëve nuk është ngarkuar.','err',0);return;}
  setBusy(true);
  try{
    var files=[];for(var i=0;i<selected.length;i++){setStatus('Duke lexuar '+selected[i].filename+'…','',Math.round(i/selected.length*35));files.push(await fileObject(selected[i]));}
    var result=await window.PSTDriveImport.importFiles(state.projectId,files,function(s){setStatus(s.message||(s.name?'Duke ruajtur '+s.name:'Duke ruajtur…'),'',35+Math.round(Number(s.percent||0)*.55));});
    setStatus('U importuan '+Number(result&&result.uploaded||0)+' skedarë te projekti'+(result&&result.skipped?' · '+result.skipped+' ekzistonin tashmë':'')+'.','ok',100);
    setTimeout(async function(){var bg=document.getElementById('plgr-bg');if(bg)bg.remove();if(typeof window.pstOpenProjectWorkspace==='function')await window.pstOpenProjectWorkspace(state.projectId);},900);
  }catch(e){setStatus('Gabim gjatë importit: '+String(e&&e.message||e),'err',0);}
  finally{setBusy(false);}
}
function openFallback(){var id=state.projectId,bg=document.getElementById('plgr-bg');if(bg)bg.remove();if(typeof fallbackCollector==='function')fallbackCollector(id);}
function open(projectId){
  state={projectId:String(projectId||''),project:null,rows:[],messages:[],files:[],token:'',busy:false,stats:{raw:0,signatures:0,duplicates:0}};
  var old=document.getElementById('plgr-bg');if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend','<div class="plgr-bg" id="plgr-bg"><div class="plgr-modal"><div class="plgr-head"><div><h2>Rikupero skedarët e projektit</h2><p id="plgr-sub">Duke ngarkuar projektin…</p></div><button class="plgr-close">×</button></div><div class="plgr-body"><div id="plgr-results"><div class="plgr-empty">Duke lexuar emailat e lidhur…</div></div><div class="plgr-status" id="plgr-status">Duke filluar…</div><div class="plgr-track"><i id="plgr-progress"></i></div></div><div class="plgr-foot"><button class="plgr-action" id="plgr-other">Kërko emaila të tjerë</button><button class="plgr-action primary" id="plgr-import">Importo skedarët e zgjedhur</button></div></div></div>');
  document.querySelector('.plgr-close').onclick=function(){if(!state.busy)document.getElementById('plgr-bg').remove();};
  document.getElementById('plgr-import').onclick=importSelected;document.getElementById('plgr-other').onclick=openFallback;loadData();
}
window.pstCollectProjectGmail=open;
window.pstRecoverLinkedProjectGmail=open;
window.PSTLinkedGmailRecoveryV2={open:open,_test:{isLikelySignature:isLikelySignature,dedupeKey:dedupeKey,collapseRepeatedFiles:collapseRepeatedFiles,versionFamily:versionFamily,defaultSelectionReason:defaultSelectionReason,shouldAutoSelect:shouldAutoSelect,markRecommended:markRecommended}};

var css=document.createElement('style');css.textContent=`
.plgr-bg{position:fixed;inset:0;z-index:2200;background:rgba(25,42,50,.46);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px}.plgr-modal{width:min(980px,97vw);max-height:94vh;background:#fff;border-radius:20px;display:flex;flex-direction:column;box-shadow:0 30px 90px #142a3538;overflow:hidden}.plgr-head{padding:17px 20px;border-bottom:1px solid #DFE8EC;display:flex;justify-content:space-between;gap:15px;background:linear-gradient(#fff,#F7FBFC)}.plgr-head h2{font-size:18px;margin:0}.plgr-head p{font-size:11px;color:#748188;margin:3px 0 0}.plgr-close{border:0;background:none;font-size:25px;color:#78848A;cursor:pointer}.plgr-body{padding:15px 20px;overflow:auto}.plgr-foot{padding:13px 20px;border-top:1px solid #DFE8EC;display:flex;justify-content:flex-end;gap:8px;background:#FBFDFE}.plgr-action{height:36px;border:1px solid #D5E2E7;border-radius:10px;background:#fff;padding:0 13px;font-size:10.5px;font-weight:720;cursor:pointer}.plgr-action.primary{background:linear-gradient(135deg,#67A8C0,#3F7F98);color:#fff;border:0}.plgr-action:disabled,.plgr-close:disabled{opacity:.5}.plgr-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}.plgr-kpis div{border:1px solid #E0E9ED;border-radius:11px;background:#F9FCFD;padding:10px}.plgr-kpis b{font-size:18px;display:block}.plgr-kpis span{font-size:9px;color:#7D898F}.plgr-filter-note{margin:-5px 0 12px;padding:8px 10px;border-radius:9px;background:#F2F7F9;color:#66777F;font-size:9px}.plgr-body h4{font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:#60727B;margin:12px 0 7px}.plgr-list{border:1px solid #E0E9ED;border-radius:12px;overflow:hidden}.plgr-file{display:flex;align-items:center;gap:10px;padding:10px 11px;border-bottom:1px solid #EDF2F4}.plgr-file:last-child{border-bottom:0}.plgr-file:hover{background:#F8FBFC}.plgr-file.manual{background:#FCFDFD}.plgr-filemain{flex:1;min-width:0}.plgr-filemain b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.plgr-filemain span{font-size:9px;color:#829097}.plgr-file.manual .plgr-filemain span{color:#8A7352}.plgr-file>a{font-size:9px;color:#3F7F98;text-decoration:none}.plgr-status{margin-top:12px;padding:9px 11px;border-radius:9px;background:#F2F7F9;color:#596970;font-size:10px}.plgr-status.ok{background:#EAF5EF;color:#2F7657}.plgr-status.err{background:#F9ECEA;color:#A64B42}.plgr-status.warn{background:#FAF2E3;color:#8A6428}.plgr-track{height:5px;background:#E7EEF1;border-radius:5px;overflow:hidden;margin-top:6px}.plgr-track i{display:block;width:0;height:100%;background:linear-gradient(90deg,#5B9BB3,#A9CEDC);transition:width .2s}.plgr-empty{padding:18px;text-align:center;color:#87939A;font-size:10px}.plgr-body details{margin-top:13px}.plgr-body summary{font-size:10px;font-weight:700;cursor:pointer}.plgr-mails{border:1px solid #E0E9ED;border-radius:11px;margin-top:7px;overflow:hidden}.plgr-mail{display:block;padding:8px 10px;border-bottom:1px solid #EDF2F4;text-decoration:none}.plgr-mail:last-child{border-bottom:0}.plgr-mail b{display:block;color:#283238;font-size:10px}.plgr-mail span{color:#849198;font-size:8.5px}@media(max-width:650px){.plgr-kpis{grid-template-columns:1fr}.plgr-foot{flex-direction:column}.plgr-action{width:100%}}
`;
document.head.appendChild(css);
})();