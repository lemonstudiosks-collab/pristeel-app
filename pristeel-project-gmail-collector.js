/* PRISTEEL — mbledh emailat dhe skedarët e një projekti nga Gmail */
(function(){
'use strict';
if(window.__pstProjectGmailCollectorLoaded)return;
window.__pstProjectGmailCollectorLoaded=true;

var state={projectId:'',project:null,token:'',messages:[],threads:[],attachments:[],busy:false};
var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com','prissteel@gmail.com'];

var SPECIAL=[{
  test:function(p){var x=((p&&p.name)||'')+' '+((p&&p.client)||'')+' '+((p&&p.ref)||'');x=x.toLowerCase();return (x.indexOf('ssp')>-1||x.indexOf('smart city')>-1)&&(x.indexOf('camera')>-1||x.indexOf('pole')>-1||x.indexOf('shtyll')>-1);},
  terms:['SSP','SSPFZ','Smart City','SMARTCT','Camera Pole','Camera Poles','shtyllat','shtyllave','bazamentet','bazamenteve','17S-25','PST-SSP-SC-001-2026','Presight'],
  contacts:['ermalrula@gmail.com','aldo@rt-grp.com','varis.mehmeti@sspfz.com','valon@fivainvestment.com','fitim@fivainvestment.com','shpend.kusari@fivainvestment.com','legal@sspfz.com','elvin.luci@sspfz.com','burim.fazliu@tehnoburimi.com','sasa.sacic@tehnoburimi.com','dimitar.zakov@vating.com.mk','indrit.bakalli@rfaecom.net','tsotas@biomek.gr'],
  after:'2026/02/01'
}];

var css=document.createElement('style');
css.textContent=`
.pgc-btn{height:34px;border:1px solid rgba(79,145,170,.24);border-radius:10px;background:#EAF5F8;color:#326F87;padding:0 12px;font-size:10.5px;font-weight:720;cursor:pointer;white-space:nowrap}
.pgc-btn:hover{background:#DDEFF4;border-color:#91C3D5}.pgc-btn:disabled{opacity:.55;cursor:wait}
.pgc-bg{position:fixed;inset:0;z-index:1800;background:rgba(24,42,50,.44);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px}
.pgc-modal{width:min(1050px,97vw);max-height:94vh;background:#fff;border-radius:22px 22px 22px 9px;box-shadow:0 30px 90px rgba(23,47,57,.25);overflow:hidden;display:flex;flex-direction:column}
.pgc-hd{padding:18px 20px;border-bottom:1px solid rgba(72,113,129,.12);display:flex;align-items:flex-start;justify-content:space-between;gap:14px;background:linear-gradient(180deg,#fff,#F5FAFC)}
.pgc-title{font-size:17px;font-weight:750;color:#20272B}.pgc-sub{font-size:11px;color:#738087;margin-top:4px;line-height:1.5}.pgc-x{border:0;background:transparent;font-size:24px;color:#7A858B;cursor:pointer}
.pgc-body{padding:16px 20px 18px;overflow:auto}.pgc-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.pgc-input{flex:1;min-width:260px;border:1px solid rgba(72,113,129,.18);border-radius:11px;padding:9px 11px;font-size:11.5px}
.pgc-action{height:36px;border:1px solid rgba(72,113,129,.17);border-radius:11px;background:#fff;color:#46545B;padding:0 12px;font-size:10.5px;font-weight:700;cursor:pointer}
.pgc-action.primary{background:linear-gradient(135deg,#67A8C0,#3F7F98);color:#fff;border-color:transparent}.pgc-action:disabled{opacity:.5;cursor:wait}
.pgc-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:10px 0 14px}.pgc-kpi{padding:11px 12px;border:1px solid rgba(72,113,129,.11);border-radius:14px;background:#F8FCFD}.pgc-kv{font-size:18px;font-weight:760}.pgc-kl{font-size:9.5px;color:#7D888E;margin-top:2px}
.pgc-sec{font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.75px;color:#5F747E;margin:16px 0 8px;display:flex;justify-content:space-between;align-items:center}
.pgc-list{border:1px solid rgba(72,113,129,.11);border-radius:15px;overflow:hidden}.pgc-row{display:grid;grid-template-columns:28px minmax(0,1fr) 90px 80px;gap:9px;align-items:start;padding:10px 11px;border-bottom:1px solid rgba(72,113,129,.08)}.pgc-row:last-child{border-bottom:0}.pgc-row:hover{background:#F7FBFC}
.pgc-check{margin-top:3px}.pgc-main{min-width:0}.pgc-name{font-size:11.5px;font-weight:680;color:#283136}.pgc-meta{font-size:9.5px;color:#869096;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pgc-snippet{font-size:10px;color:#66747B;margin-top:4px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pgc-score{font-size:10px;font-weight:740;color:#3E7E96;background:#EAF5F8;border-radius:999px;padding:3px 7px;text-align:center}.pgc-files{font-size:9.5px;color:#6D7B82;text-align:right}
.pgc-att-row{display:grid;grid-template-columns:28px minmax(0,1fr) 100px;gap:9px;align-items:center;padding:9px 11px;border-bottom:1px solid rgba(72,113,129,.08)}.pgc-att-row:last-child{border-bottom:0}.pgc-att-old{opacity:.58}.pgc-att-name{font-size:11px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pgc-att-meta{font-size:9.5px;color:#879198;margin-top:2px}.pgc-size{text-align:right;font-size:9.5px;color:#6C7A81}
.pgc-status{margin-top:12px;padding:10px 12px;border-radius:11px;background:#F3F8FA;color:#596970;font-size:10.5px;line-height:1.45}.pgc-status.err{background:#FBEFEE;color:#9A4037}.pgc-status.ok{background:#ECF7F1;color:#2F7657}.pgc-progress{height:5px;border-radius:5px;background:#E7EEF1;overflow:hidden;margin-top:7px}.pgc-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#5B9BB3,#A9CEDC);transition:width .18s}
.pgc-ft{padding:13px 20px;border-top:1px solid rgba(72,113,129,.11);display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;background:#FBFDFE}
@media(max-width:720px){.pgc-summary{grid-template-columns:1fr 1fr}.pgc-row{grid-template-columns:28px minmax(0,1fr)}.pgc-score,.pgc-files{display:none}.pgc-att-row{grid-template-columns:28px minmax(0,1fr)}.pgc-size{display:none}}
`;
document.head.appendChild(css);

function arr(v){return Array.isArray(v)?v:[]}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function hdr(payload,name){var hs=(payload&&payload.headers)||[];name=String(name||'').toLowerCase();for(var i=0;i<hs.length;i++)if(String(hs[i].name||'').toLowerCase()===name)return hs[i].value||'';return''}
function emailFrom(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:''}
function fmtDate(v){var d=new Date(v);return isNaN(d.getTime())?'':d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}
function fmtBytes(n){n=Number(n||0);if(!n)return'';if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(n<10240?1:0)+' KB';return(n/1048576).toFixed(n<10485760?1:0)+' MB'}
function uniq(a){return arr(a).filter(function(v,i,x){return v&&x.indexOf(v)===i})}
function normalize(s){return String(s||'').toLowerCase().replace(/[^a-z0-9à-ž]+/gi,' ').replace(/\s+/g,' ').trim()}
function setStatus(msg,type,pct){var e=document.getElementById('pgc-status');if(e){e.textContent=msg||'';e.className='pgc-status'+(type?' '+type:'')}var p=document.getElementById('pgc-progress-fill');if(p&&pct!=null)p.style.width=Math.max(0,Math.min(100,pct))+'%'}
function setBusy(on){state.busy=!!on;document.querySelectorAll('.pgc-action,.pgc-btn').forEach(function(b){b.disabled=!!on})}

function profileFor(p){
  var special=SPECIAL.filter(function(x){return x.test(p)})[0];
  if(special)return{terms:special.terms.slice(),contacts:special.contacts.slice(),after:special.after};
  var terms=[];
  [p&&p.name,p&&p.client,p&&p.ref,p&&p.location].forEach(function(v){var n=String(v||'').trim();if(n.length>=4)terms.push(n)});
  normalize((p&&p.name)||'').split(' ').filter(function(x){return x.length>=5}).forEach(function(x){terms.push(x)});
  return{terms:uniq(terms).slice(0,12),contacts:[],after:'2025/01/01'};
}
function gmailQuery(profile){var t=profile.terms.map(function(x){return /\s/.test(x)?'"'+x.replace(/"/g,'')+'"':x.replace(/[{}]/g,'')});return '-in:spam -in:trash after:'+profile.after+' {'+t.join(' ')+'}'}
function scoreMessage(m,profile){
  var subject=normalize(hdr(m.payload,'Subject')),snippet=normalize(m.snippet||''),text=subject+' '+snippet,score=0,reasons=[];
  profile.terms.forEach(function(term){var n=normalize(term);if(!n)return;if(subject.indexOf(n)>-1){score+=n.length>8?38:24;reasons.push(term+' në subjekt')}else if(text.indexOf(n)>-1){score+=n.length>8?22:10;reasons.push(term)}});
  var people=[hdr(m.payload,'From'),hdr(m.payload,'To'),hdr(m.payload,'Cc')].map(emailFrom).filter(Boolean);
  profile.contacts.forEach(function(c){if(people.indexOf(c.toLowerCase())>-1){score+=18;reasons.push(c)}});
  var files=[];collectAttachments(m.payload,m,files);
  files.forEach(function(f){var fn=normalize(f.filename);profile.terms.forEach(function(term){var n=normalize(term);if(n&&fn.indexOf(n)>-1){score+=18;reasons.push('skedar: '+term)}})});
  if(/hubspot|newsletter|notification/.test(subject))score-=50;
  if(/substation|tennet|spie/.test(text)&&!/camera|smartct|17s 25|shtyll/.test(text))score-=60;
  return{score:Math.max(0,score),reasons:uniq(reasons).slice(0,5),files:files};
}
function collectAttachments(part,message,out){
  if(!part)return;
  var fn=part.filename||'',disp=hdr({headers:part.headers||[]},'Content-Disposition').toLowerCase();
  if(fn&&part.body&&(part.body.attachmentId||part.body.data))out.push({key:message.id+':'+(part.body.attachmentId||fn),messageId:message.id,threadId:message.threadId,attachmentId:part.body.attachmentId||'',inlineData:part.body.data||'',filename:fn,mimeType:part.mimeType||'application/octet-stream',size:Number(part.body.size||0),sentAt:Number(message.internalDate||0),inline:disp.indexOf('inline')>-1});
  (part.parts||[]).forEach(function(p){collectAttachments(p,message,out)});
}
function attBase(name){var x=String(name||'').toLowerCase().replace(/\.[^.]+$/,'');return x.replace(/\bsigned\b|\bfinale?\b|\bpreliminary\b/g,' ').replace(/\brev(?:ision)?[._ -]*\d+(?:[._-]\d+)?/g,' ').replace(/\bver(?:sion)?[._ -]*\d+(?:[._-]\d+)?/g,' ').replace(/\b\d{1,2}[._-]\d{1,2}[._-]20\d{2}\b/g,' ').replace(/[^a-z0-9à-ž]+/gi,' ').replace(/\s+/g,' ').trim()}
function attRank(a){var n=String(a.filename||'').toLowerCase(),r=0,m=n.match(/rev(?:ision)?[._ -]*(\d+(?:[._-]\d+)?)/);if(m)r+=parseFloat(m[1].replace('_','.'))*100;var v=n.match(/ver(?:sion)?[._ -]*(\d+(?:[._-]\d+)?)/);if(v)r+=parseFloat(v[1].replace('_','.'))*80;if(/signed/.test(n))r+=10000;if(/finale?|approved/.test(n))r+=5000;if(/draft/.test(n))r-=2000;return r+Number(a.sentAt||0)/1e12}
function markLatest(list){var groups={};list.forEach(function(a){var b=attBase(a.filename)||a.filename.toLowerCase();(groups[b]=groups[b]||[]).push(a)});Object.keys(groups).forEach(function(k){var g=groups[k].sort(function(a,b){return attRank(b)-attRank(a)});g.forEach(function(a,i){a.recommended=i===0})})}
async function fullMessage(id){return window.PSTEmail.gmail('/messages/'+encodeURIComponent(id)+'?format=full',state.token)}
async function searchAll(query){var ids=[],page='';do{var path='/messages?maxResults=500&q='+encodeURIComponent(query)+(page?'&pageToken='+encodeURIComponent(page):'');var r=await window.PSTEmail.gmail(path,state.token);ids=ids.concat((r.messages||[]).map(function(x){return x.id}));page=r.nextPageToken||''}while(page&&ids.length<1000);return uniq(ids)}
async function loadCandidates(){
  setBusy(true);setStatus('Duke kërkuar emailat e projektit në Gmail…','',8);
  try{
    state.project=(await supaFetch('projects?id=eq.'+encodeURIComponent(state.projectId)+'&select=id,name,client,ref,location&limit=1'))[0];
    if(!state.project)throw new Error('Projekti nuk u gjet.');
    var profile=profileFor(state.project),query=document.getElementById('pgc-query')?document.getElementById('pgc-query').value:gmailQuery(profile);
    state.token=await window.PSTEmail.auth();
    var ids=await searchAll(query);setStatus('U gjetën '+ids.length+' mesazhe. Duke i kontrolluar…','',18);
    var full=await window.PSTEmail.map(ids,5,fullMessage,function(done,total){setStatus('Duke kontrolluar mesazhet '+done+'/'+total+'…','',18+Math.round(done/Math.max(total,1)*45))});
    var threadMap={};
    full.forEach(function(m){var sc=scoreMessage(m,profile);if(sc.score<18)return;var tid=m.threadId||m.id;if(!threadMap[tid])threadMap[tid]={id:tid,messages:[],score:0,reasons:[],attachments:[],latest:0};var t=threadMap[tid];t.messages.push(m);t.score+=sc.score;t.reasons=t.reasons.concat(sc.reasons);t.attachments=t.attachments.concat(sc.files.filter(function(f){return!f.inline}));t.latest=Math.max(t.latest,Number(m.internalDate||0))});
    state.threads=Object.keys(threadMap).map(function(k){var t=threadMap[k];t.reasons=uniq(t.reasons);t.score=Math.min(100,t.score);return t}).sort(function(a,b){return b.score-a.score||b.latest-a.latest});
    var exact={};state.attachments=[];
    state.threads.forEach(function(t){t.attachments.forEach(function(a){var k=a.filename.toLowerCase()+'|'+a.size;if(!exact[k]||Number(a.sentAt)>Number(exact[k].sentAt))exact[k]=a})});
    state.attachments=Object.keys(exact).map(function(k){return exact[k]});markLatest(state.attachments);
    renderResults();setStatus('Kontrollo listën. Emailat me lidhje të fortë janë zgjedhur automatikisht.','ok',100);
  }catch(e){setStatus('Gabim: '+String(e&&e.message||e),'err',0)}finally{setBusy(false)}
}
function threadSubject(t){var m=t.messages.slice().sort(function(a,b){return Number(b.internalDate||0)-Number(a.internalDate||0)})[0];return hdr(m.payload,'Subject')||'(pa subjekt)'}
function threadPeople(t){var people=[];t.messages.forEach(function(m){[hdr(m.payload,'From'),hdr(m.payload,'To'),hdr(m.payload,'Cc')].forEach(function(v){var e=emailFrom(v);if(e&&INTERNAL.indexOf(e)<0)people.push(e)})});return uniq(people)}
function selectedThreadIds(){return Array.prototype.slice.call(document.querySelectorAll('.pgc-thread:checked')).map(function(x){return x.value})}
function selectedAttachments(){var keys=Array.prototype.slice.call(document.querySelectorAll('.pgc-attachment:checked')).map(function(x){return x.value}),set={};keys.forEach(function(k){set[k]=1});return state.attachments.filter(function(a){return set[a.key]})}
function renderResults(){
  var host=document.getElementById('pgc-results');if(!host)return;
  var threadRows=state.threads.map(function(t){var subject=threadSubject(t),people=threadPeople(t),latest=fmtDate(t.latest),checked=t.score>=35?' checked':'';return '<label class="pgc-row"><input class="pgc-check pgc-thread" type="checkbox" value="'+esc(t.id)+'"'+checked+'><span class="pgc-main"><span class="pgc-name">'+esc(subject)+'</span><span class="pgc-meta">'+esc(people.join(', '))+' · '+esc(latest)+' · '+t.messages.length+' emaila</span><span class="pgc-snippet">'+esc((t.messages[0]&&t.messages[0].snippet)||'')+'</span></span><span class="pgc-score">'+t.score+'%</span><span class="pgc-files">'+t.attachments.length+' skedarë</span></label>'}).join('');
  var attRows=state.attachments.map(function(a){var old=!a.recommended,checked=a.recommended?' checked':'';return '<label class="pgc-att-row'+(old?' pgc-att-old':'')+'"><input class="pgc-attachment" type="checkbox" value="'+esc(a.key)+'"'+checked+'><span><span class="pgc-att-name">'+esc(a.filename)+'</span><span class="pgc-att-meta">'+esc(fmtDate(a.sentAt))+(old?' · version më i vjetër':' · version i rekomanduar')+'</span></span><span class="pgc-size">'+esc(fmtBytes(a.size))+'</span></label>'}).join('');
  host.innerHTML='<div class="pgc-summary"><div class="pgc-kpi"><div class="pgc-kv">'+state.threads.length+'</div><div class="pgc-kl">thread-e të gjetura</div></div><div class="pgc-kpi"><div class="pgc-kv">'+state.threads.reduce(function(s,t){return s+t.messages.length},0)+'</div><div class="pgc-kl">emaila të gjetur</div></div><div class="pgc-kpi"><div class="pgc-kv">'+state.attachments.length+'</div><div class="pgc-kl">skedarë unikë</div></div><div class="pgc-kpi"><div class="pgc-kv">'+state.attachments.filter(function(a){return a.recommended}).length+'</div><div class="pgc-kl">versione të rekomanduara</div></div></div>'
    +'<div class="pgc-sec"><span>Emailat dhe thread-et</span><span><button class="pgc-action" id="pgc-all-threads">Zgjidh të gjitha</button></span></div><div class="pgc-list">'+(threadRows||'<div class="pgc-status">Nuk u gjetën emaila të përshtatshëm.</div>')+'</div>'
    +'<div class="pgc-sec"><span>Skedarët</span><span><button class="pgc-action" id="pgc-latest-files">Vetëm versionet e fundit</button></span></div><div class="pgc-list">'+(attRows||'<div class="pgc-status">Nuk u gjetën skedarë.</div>')+'</div>';
  document.getElementById('pgc-all-threads').onclick=function(){document.querySelectorAll('.pgc-thread').forEach(function(x){x.checked=true})};
  document.getElementById('pgc-latest-files').onclick=function(){document.querySelectorAll('.pgc-attachment').forEach(function(x){x.checked=false});state.attachments.forEach(function(a){if(a.recommended){var x=document.querySelector('.pgc-attachment[value="'+CSS.escape(a.key)+'"]');if(x)x.checked=true}})};
}
async function persistMessage(m,projectId){
  var meta=await window.PSTEmail.message(m.id,state.token),rows=await supaFetch('project_emails?gmail_message_id=eq.'+encodeURIComponent(meta.gmail_message_id)+'&select=id,project_id,match_method');
  var old=arr(rows)[0],method=String(old&&old.match_method||'').toLowerCase();
  if(old&&old.project_id&&String(old.project_id)!==String(projectId)&&method.indexOf('manual')===0)return{conflict:true};
  var patch={project_id:projectId,suggested_project_id:projectId,match_method:'manual-project-collector',match_confidence:100,needs_review:false,review_reason:null,updated_at:new Date().toISOString()};
  if(old)await supaFetch('project_emails?id=eq.'+encodeURIComponent(old.id),'PATCH',patch);else await supaFetch('project_emails','POST',[Object.assign({},meta,patch)]);
  try{await supaFetch('project_email_links','POST',{project_id:projectId,gmail_message_id:meta.gmail_message_id,gmail_thread_id:meta.gmail_thread_id,link_method:'manual-project-collector',confidence:100,created_at:new Date().toISOString()})}catch(e){}
  return{linked:true};
}
async function linkSelected(){
  var ids=selectedThreadIds();if(!ids.length)throw new Error('Zgjidh të paktën një thread.');
  var selected=state.threads.filter(function(t){return ids.indexOf(t.id)>-1}),messages=[];selected.forEach(function(t){messages=messages.concat(t.messages)});
  var linked=0,conflicts=0;
  for(var i=0;i<messages.length;i++){setStatus('Duke lidhur emailin '+(i+1)+'/'+messages.length+'…','',Math.round((i+1)/messages.length*70));var r=await persistMessage(messages[i],state.projectId);if(r.conflict)conflicts++;else linked++}
  if(typeof window.pstSyncProjectContacts==='function')try{await window.pstSyncProjectContacts(state.projectId)}catch(e){}
  return{linked:linked,conflicts:conflicts};
}
function b64Bytes(data){var s=String(data||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
async function attFile(a){var data=a.inlineData;if(!data){var r=await window.PSTEmail.gmail('/messages/'+encodeURIComponent(a.messageId)+'/attachments/'+encodeURIComponent(a.attachmentId),state.token);data=r.data||''}return new File([b64Bytes(data)],a.filename,{type:a.mimeType||'application/octet-stream'})}
async function importSelected(){
  if(!window.PSTDriveImport||typeof window.PSTDriveImport.importFiles!=='function')throw new Error('Moduli i Google Drive nuk është gati.');
  var atts=selectedAttachments();if(!atts.length)throw new Error('Zgjidh të paktën një skedar.');
  var files=[];
  for(var i=0;i<atts.length;i++){setStatus('Duke lexuar skedarin '+(i+1)+'/'+atts.length+': '+atts[i].filename,'',70+Math.round((i+1)/atts.length*12));files.push(await attFile(atts[i]))}
  return window.PSTDriveImport.importFiles(state.projectId,files,function(s){var msg=s.message||(s.name?'Duke ruajtur '+s.name:'Duke ruajtur skedarët…');setStatus(msg,'',82+Math.round(Number(s.percent||0)*.18))});
}
async function runAction(withFiles){if(state.busy)return;setBusy(true);try{var l=await linkSelected(),imp=null;if(withFiles)imp=await importSelected();setStatus('U lidhën '+l.linked+' emaila'+(l.conflicts?' · '+l.conflicts+' konflikte kërkojnë kontroll':'')+(imp?' · '+imp.uploaded+' skedarë u importuan'+(imp.skipped?' · '+imp.skipped+' ekzistonin tashmë':''):'')+'.','ok',100)}catch(e){setStatus('Gabim: '+String(e&&e.message||e),'err',0)}finally{setBusy(false)}}
function openCollector(projectId){
  state={projectId:String(projectId||''),project:null,token:'',messages:[],threads:[],attachments:[],busy:false};
  var existing=document.getElementById('pgc-bg');if(existing)existing.remove();
  document.body.insertAdjacentHTML('beforeend','<div class="pgc-bg" id="pgc-bg"><div class="pgc-modal"><div class="pgc-hd"><div><div class="pgc-title">Mblidh nga Gmail</div><div class="pgc-sub" id="pgc-sub">Duke ngarkuar projektin…</div></div><button class="pgc-x" id="pgc-close">×</button></div><div class="pgc-body"><div class="pgc-toolbar"><input class="pgc-input" id="pgc-query" placeholder="Kërkimi Gmail"><button class="pgc-action primary" id="pgc-search">Kërko përsëri</button></div><div id="pgc-results"></div><div class="pgc-status" id="pgc-status">Duke përgatitur kërkimin…</div><div class="pgc-progress"><i id="pgc-progress-fill"></i></div></div><div class="pgc-ft"><button class="pgc-action" id="pgc-link">Lidhi vetëm emailat</button><button class="pgc-action primary" id="pgc-import">Lidhi dhe importo skedarët</button></div></div></div>');
  document.getElementById('pgc-close').onclick=function(){if(!state.busy)document.getElementById('pgc-bg').remove()};
  document.getElementById('pgc-search').onclick=loadCandidates;document.getElementById('pgc-link').onclick=function(){runAction(false)};document.getElementById('pgc-import').onclick=function(){runAction(true)};
  supaFetch('projects?id=eq.'+encodeURIComponent(state.projectId)+'&select=id,name,client,ref,location&limit=1').then(function(rows){state.project=arr(rows)[0]||null;var profile=profileFor(state.project||{name:'projekti'}),q=gmailQuery(profile),inp=document.getElementById('pgc-query'),sub=document.getElementById('pgc-sub');if(inp)inp.value=q;if(sub)sub.textContent=(state.project&&state.project.name)||'Projekti';loadCandidates()}).catch(function(e){setStatus('Gabim: '+e.message,'err',0)});
}
window.pstCollectProjectGmail=openCollector;
function inject(projectId){var hd=document.querySelector('#ov-backdrop .ov-head');if(!hd)return;var old=document.getElementById('pgc-open');if(old)old.remove();var close=hd.querySelector('.ov-close'),b=document.createElement('button');b.id='pgc-open';b.className='pgc-btn';b.textContent='Mblidh nga Gmail';b.onclick=function(){openCollector(projectId)};hd.insertBefore(b,close||null)}
function wrap(){if(typeof window.openOverview!=='function'||window.openOverview.__pgc)return false;var orig=window.openOverview;window.openOverview=function(id){window.__pstCurrentProjectId=id;var r=orig.apply(this,arguments);setTimeout(function(){inject(id)},250);return r};window.openOverview.__pgc=true;return true}
var tries=0,timer=setInterval(function(){if(wrap()||++tries>80)clearInterval(timer)},250);
})();
