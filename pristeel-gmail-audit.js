/* PRISTEEL Gmail Audit: klasifikim i gjithë mailbox-it në nivel mesazhi */
(function(){
'use strict';

if(window.__pstGmailAuditLoaded)return;
window.__pstGmailAuditLoaded=true;

var A=window.PSTEmail;if(!A)return;
var VERSION='20260801-1';
var KEYS={
  last:'pst_gmail_audit_last_id_'+VERSION,
  stats:'pst_gmail_audit_stats_'+VERSION,
  done:'pst_gmail_audit_done_'+VERSION
};
var running=false,stopRequested=false,profiles=[],owners={},threadMap={},linkMap={},projectMap={};
var stats={processed:0,linked:0,multi:0,review:0,nonproject:0,unmatched:0,protected:0,attachments:0};

var css=document.createElement('style');
css.id='pst-gmail-audit-style';
css.textContent=`
.pga-strip{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 10px;border:1px solid #E6E8EA;background:#FAFBFB;border-radius:9px;margin:8px 0 10px}
.pga-state{flex:1;min-width:240px}.pga-title{font-size:10.5px;font-weight:750;color:var(--text)}.pga-sub{font-size:9px;color:var(--text3);margin-top:2px;line-height:1.4}
.pga-stats{display:flex;gap:5px;flex-wrap:wrap}.pga-stat{font-size:8.5px;color:#667078;background:#fff;border:1px solid #E4E7E9;border-radius:10px;padding:3px 7px}.pga-stat b{color:#2F3438}
.pga-btn{height:29px;border:1px solid var(--border2);border-radius:7px;background:#fff;color:var(--text2);font-size:9px;font-weight:700;padding:0 9px;cursor:pointer}.pga-btn:hover{border-color:#A65F2E;color:#A65F2E}.pga-btn.primary{background:#A65F2E;border-color:#A65F2E;color:#fff}.pga-btn.danger{color:#A64B42}.pga-btn:disabled{opacity:.5;cursor:not-allowed}
.pga-progress{height:3px;background:#E8EBED;border-radius:3px;overflow:hidden;width:100%;display:none}.pga-progress.on{display:block}.pga-progress i{display:block;height:100%;width:0;background:#A65F2E;transition:width .2s}
.pga-modal-bg{position:fixed;inset:0;background:rgba(25,29,33,.42);z-index:1800;display:flex;align-items:center;justify-content:center;padding:20px}.pga-modal{width:min(900px,97vw);max-height:90vh;overflow:auto;background:#fff;border-radius:13px;box-shadow:0 20px 60px rgba(20,25,30,.22)}
.pga-modal-hd{position:sticky;top:0;background:#fff;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:15px 17px;border-bottom:1px solid var(--border)}.pga-modal-title{font-size:14px;font-weight:750}.pga-modal-sub{font-size:9.5px;color:var(--text3);margin-top:2px}.pga-x{border:0;background:none;font-size:21px;color:var(--text3);cursor:pointer}.pga-modal-body{padding:14px 17px}
.pga-review{border:1px solid var(--border);border-radius:9px;margin-bottom:7px;padding:10px}.pga-review-top{display:flex;gap:9px;align-items:flex-start}.pga-review-main{flex:1;min-width:0}.pga-review-subject{font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pga-review-meta{font-size:9px;color:var(--text3);margin-top:2px}.pga-review-snippet{font-size:9.5px;color:var(--text2);line-height:1.45;margin-top:5px}.pga-review-reason{font-size:9px;color:#8E4038;background:#FDF6F5;border-radius:7px;padding:6px 8px;margin-top:6px}.pga-review-actions{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:8px}.pga-review-actions select{min-width:240px;max-width:440px;font-size:10px;padding:5px 7px}.pga-empty{font-size:11px;color:var(--text3);padding:20px;text-align:center}
@media(max-width:800px){.pga-stats{width:100%}.pga-review-top{display:block}.pga-review-actions select{min-width:100%;max-width:100%}}
`;
document.head.appendChild(css);

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return A.esc?A.esc(v):String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function uniq(v){return arr(v).map(String).filter(function(x,i,a){return x&&a.indexOf(x)===i;});}
function phrase(v){return String(v||'').toLowerCase().replace(/[^a-z0-9à-ž]+/gi,' ').replace(/\s+/g,' ').trim();}
function toks(v){var stop={project:1,projekt:1,steel:1,stahl:1,construction:1,konstruktion:1,prissteel:1,offer:1,angebot:1,quotation:1,anfrage:1,request:1,reply:1,forward:1,invoice:1};return phrase(v).split(/\s+/).filter(function(w){return w.length>=5&&!stop[w];}).filter(function(w,i,a){return a.indexOf(w)===i;}).slice(0,20);}
function inText(field,values){return field+'=in.('+values.map(function(x){return'"'+String(x).replace(/"/g,'')+'"';}).join(',')+')';}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
function loadStats(){try{var s=JSON.parse(localStorage.getItem(KEYS.stats)||'null');if(s)stats=Object.assign(stats,s);}catch(e){}return stats;}
function saveStats(){try{localStorage.setItem(KEYS.stats,JSON.stringify(stats));}catch(e){}}
function setText(id,text){var e=document.getElementById(id);if(e)e.textContent=text;}
function setStatus(text,color){var e=document.getElementById('pga-sub');if(e){e.textContent=text;e.style.color=color||'var(--text3)';}}
function progress(on,pct){var a=document.getElementById('pga-progress'),b=document.getElementById('pga-progress-fill');if(a)a.classList.toggle('on',!!on);if(b)b.style.width=Math.max(0,Math.min(100,Number(pct)||0))+'%';}
function syncUi(){
  loadStats();
  ['processed','linked','review','nonproject','protected'].forEach(function(k){setText('pga-'+k,String(stats[k]||0));});
  var done=localStorage.getItem(KEYS.done)==='1',last=localStorage.getItem(KEYS.last)||'0';
  setText('pga-title',done?'Auditi i Gmail-it është përfunduar':'Auditi i plotë i Gmail-it');
  if(!running)setStatus(done?'Të gjithë emailat e indeksuar janë kontrolluar. Kliko “Rifillo” pas krijimit të projekteve të reja.':'Progresi ruhet automatikisht. Pozicioni aktual: email #'+last+'.');
  var run=document.getElementById('pga-run');if(run){run.disabled=running;run.textContent=done?'Kontrollo përsëri':'Nis auditin';}
  var stop=document.getElementById('pga-stop');if(stop)stop.style.display=running?'inline-flex':'none';
}
function setBusy(v){running=!!v;['pga-run','pga-reset','pga-review-btn'].forEach(function(id){var e=document.getElementById(id);if(e)e.disabled=!!v;});var s=document.getElementById('pga-stop');if(s)s.style.display=v?'inline-flex':'none';}

async function ready(){
  try{await supaFetch('project_email_links?select=id&limit=1');await supaFetch('project_attachment_links?select=id&limit=1');return true;}catch(e){return false;}
}
async function pageAll(base,size){
  size=size||1000;var out=[],offset=0;
  while(true){var rows=await supaFetch(base+(base.indexOf('?')>-1?'&':'?')+'limit='+size+'&offset='+offset);out=out.concat(rows||[]);if(!rows||rows.length<size)break;offset+=size;}
  return out;
}
async function mapLimit(items,limit,fn){
  var out=new Array(items.length),i=0;
  async function worker(){while(true){var k=i++;if(k>=items.length)return;try{out[k]=await fn(items[k],k);}catch(e){out[k]={error:e};}}}
  var w=[];for(var n=0;n<Math.min(limit,items.length);n++)w.push(worker());await Promise.all(w);return out;
}

async function prepare(){
  profiles=await A.profiles();projectMap={};owners={};
  profiles.forEach(function(p){
    var pid=String(p.p.id);projectMap[pid]=p.p;
    arr(p.emails).forEach(function(email){email=String(email).toLowerCase();if(!owners[email])owners[email]=[];if(owners[email].indexOf(pid)<0)owners[email].push(pid);});
  });
  var links=await pageAll('project_email_links?select=gmail_message_id,gmail_thread_id,project_id,link_method&order=id.asc',1000);
  threadMap={};linkMap={};
  links.forEach(function(l){
    var mid=String(l.gmail_message_id||''),tid=String(l.gmail_thread_id||''),pid=String(l.project_id||'');if(!mid||!pid)return;
    var lk=mid+'|'+pid;linkMap[lk]=l;
    if(tid){if(!threadMap[tid])threadMap[tid]={projects:[],manual:false};if(threadMap[tid].projects.indexOf(pid)<0)threadMap[tid].projects.push(pid);if(String(l.link_method||'').indexOf('manual')===0)threadMap[tid].manual=true;}
  });
}
function people(row){return uniq([row.from_email].concat(arr(row.to_emails),arr(row.cc_emails)).map(function(x){return String(x||'').toLowerCase();}).filter(function(x){return x&&!A.isInternal(x);}));}
function systemNoise(row){
  var sender=String(row.from_email||'').toLowerCase(),subject=String(row.subject||'').toLowerCase(),text=subject+' '+String(row.snippet||'').toLowerCase();
  if(/mailer-daemon|postmaster|no-?reply|notifications?|dmarc|security-noreply/.test(sender)&&!/rfq|quotation|angebot|project|projekt|tender|ausschreibung/.test(text))return true;
  if(/aggregate report|dmarc report|mail delivery|delivery status notification|password reset|security alert|google alert|ted search alert|calendar notification|automatic reply|out of office/.test(text))return true;
  return false;
}
function candidates(row){
  var text=phrase((row.subject||'')+' '+(row.snippet||'')),sub=phrase(row.subject||''),ps=people(row),thread=threadMap[String(row.gmail_thread_id||'')]||{projects:[],manual:false},out=[];
  profiles.forEach(function(p){
    var pid=String(p.p.id),score=0,evidence=[],direct=false;
    arr(p.refs).forEach(function(r){var x=phrase(r);if(x.length>4&&text.indexOf(x)>-1){score+=220;evidence.push('referenca');direct=true;}});
    var name=phrase(p.p.name||'');
    if(name.length>=7&&sub.indexOf(name)>-1){score+=175;evidence.push('emri në subjekt');direct=true;}
    else if(name.length>=7&&text.indexOf(name)>-1){score+=125;evidence.push('emri i projektit');direct=true;}
    var client=phrase(p.p.client||'');
    if(client.length>=5&&sub.indexOf(client)>-1){score+=70;evidence.push('klienti në subjekt');}
    else if(client.length>=5&&text.indexOf(client)>-1){score+=30;evidence.push('klienti');}
    ps.forEach(function(email){var own=owners[email]||[];if(own.length===1&&own[0]===pid){score+=100;evidence.push('kontakt unik');}else if(arr(p.emails).indexOf(email)>-1){score+=22;evidence.push('kontakt i përbashkët');}});
    arr(p.tokens).forEach(function(t){if(sub.indexOf(t)>-1){score+=22;evidence.push('fjalë në subjekt');}else if(text.indexOf(t)>-1){score+=5;evidence.push('fjalë në tekst');}});
    if(thread.projects.length===1&&thread.projects[0]===pid){score+=thread.manual?100:45;evidence.push(thread.manual?'thread i konfirmuar':'sinjal thread-i');}
    if(String(row.project_id||'')===pid){score+=25;evidence.push('lidhje ekzistuese');}
    if(score>0)out.push({project_id:pid,score:score,evidence:uniq(evidence),direct:direct,project:p.p});
  });
  out.sort(function(a,b){return b.score-a.score;});return out;
}
function decide(row){
  var method=String(row.match_method||'');
  if(method.indexOf('manual')===0)return{kind:'protected',projects:row.project_id?[String(row.project_id)]:[],confidence:100,reason:'Lidhje manuale e mbrojtur.'};
  var c=candidates(row),top=c[0],second=c[1],margin=top?top.score-(second?second.score:0):0;
  var direct=c.filter(function(x){return x.direct&&x.score>=120;});
  if(direct.length>1){return{kind:'auto',projects:direct.slice(0,4).map(function(x){return x.project_id;}),confidence:98,reason:'Emaili përmend drejtpërdrejt disa projekte.',candidates:c.slice(0,6)};}
  if(top&&((top.direct&&top.score>=120&&margin>=25)||(top.score>=145&&margin>=45))){return{kind:'auto',projects:[top.project_id],confidence:Math.min(100,Math.round(top.score>=220?100:top.score)),reason:top.evidence.join(', '),candidates:c.slice(0,6)};}
  var thread=threadMap[String(row.gmail_thread_id||'')]||{projects:[],manual:false};
  if(thread.manual&&thread.projects.length===1&&!top){return{kind:'auto',projects:[thread.projects[0]],confidence:100,reason:'Thread i konfirmuar manualisht.',candidates:[]};}
  if(top&&top.score>=45){return{kind:'ambiguous',projects:[],confidence:Math.min(89,Math.round(top.score)),reason:'Kandidati më i afërt: '+(top.project.name||top.project_id)+' · '+top.evidence.join(', '),candidates:c.slice(0,6)};}
  if(thread.projects.length>1)return{kind:'review',projects:[],confidence:0,reason:'Thread-i ka lidhje me disa projekte.',candidates:c.slice(0,6)};
  if(systemNoise(row))return{kind:'nonproject',projects:[],confidence:98,reason:'Email automatik ose administrativ pa sinjal projekti.',candidates:[]};
  return{kind:'unmatched',projects:[],confidence:0,reason:'Nuk u gjet sinjal i mjaftueshëm për projekt.',candidates:c.slice(0,6)};
}

function decode64(v){var s=String(v||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';try{return decodeURIComponent(Array.prototype.map.call(atob(s),function(c){return'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2);}).join(''));}catch(e){try{return atob(s);}catch(x){return'';}}}
function stripHtml(v){var e=document.createElement('div');e.innerHTML=String(v||'');return(e.textContent||'').replace(/\s+/g,' ').trim();}
function collectBody(part,out){if(!part)return;var t=String(part.mimeType||'').toLowerCase(),d=part.body&&part.body.data;if(d&&(t==='text/plain'||t==='text/html'))out.push({type:t,text:decode64(d)});arr(part.parts).forEach(function(p){collectBody(p,out);});}
function collectAttachments(part,message,out){
  if(!part)return;
  if(part.filename&&part.body&&(part.body.attachmentId||part.body.data))out.push({gmail_message_id:message.id,gmail_thread_id:message.threadId,attachment_id:part.body.attachmentId||('inline-'+out.length),attachment_name:part.filename});
  arr(part.parts).forEach(function(p){collectAttachments(p,message,out);});
}
async function fullMessage(row,token){
  var m=await A.gmail('/messages/'+enc(row.gmail_message_id)+'?format=full',token),parts=[];collectBody(m.payload,parts);
  var plain=parts.filter(function(x){return x.type==='text/plain';}).map(function(x){return x.text;}).join('\n');
  var html=parts.filter(function(x){return x.type==='text/html';}).map(function(x){return stripHtml(x.text);}).join('\n');
  var at=[];collectAttachments(m.payload,m,at);
  return{text:String(plain||html||row.snippet||'').slice(0,5000),attachments:at};
}
async function groqClassify(items,token){
  var key=localStorage.getItem('pristeel_apikey')||'';if(!key||!items.length)return{};
  var full=await mapLimit(items,4,async function(item){var f=await fullMessage(item.row,token);item.full=f;return item;});
  var valid=full.filter(function(x){return x&&!x.error;});var result={};
  for(var i=0;i<valid.length;i+=10){
    var batch=valid.slice(i,i+10),payload=batch.map(function(it){return{
      gmail_message_id:it.row.gmail_message_id,
      subject:it.row.subject,
      from:it.row.from_email,
      to:it.row.to_emails,
      cc:it.row.cc_emails,
      body:it.full.text,
      candidates:it.decision.candidates.map(function(c){return{id:c.project_id,name:c.project.name,client:c.project.client,ref:c.project.ref,score:c.score,evidence:c.evidence};})
    };});
    var prompt='Klasifiko emailat e mëposhtëm për një platformë prokurimi çeliku. Për secilin email zgjidh zero, një ose disa project_ids VETËM nga candidates. Zgjidh disa vetëm kur emaili realisht flet për disa projekte. Nëse është newsletter, njoftim sistemi ose jo-projekt, classification="non_project". Nëse provat nuk mjaftojnë, classification="review". Mos u mbështet vetëm te adresa e kontaktit kur ajo përdoret në disa projekte. Kthe vetëm JSON: {"results":[{"gmail_message_id":"","classification":"project|non_project|review","project_ids":[],"confidence":0,"reason":""}]}\n\n'+JSON.stringify(payload);
    var r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:'llama-3.1-8b-instant',temperature:0,max_tokens:4000,response_format:{type:'json_object'},messages:[{role:'system',content:'Je klasifikues konservativ i emailave të projekteve. Kthe vetëm JSON.'},{role:'user',content:prompt}]})});
    var txt=await r.text(),data={};try{data=JSON.parse(txt);}catch(e){}if(!r.ok)continue;
    var content=data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content,obj={};try{obj=JSON.parse(String(content||'').replace(/^```(?:json)?/i,'').replace(/```$/,'').trim());}catch(e){continue;}
    arr(obj.results).forEach(function(x){result[String(x.gmail_message_id||'')]=x;});
  }
  valid.forEach(function(it){if(result[it.row.gmail_message_id])result[it.row.gmail_message_id]._full=it.full;});
  return result;
}
function applyAi(item,ai){
  if(!ai)return item.decision;
  var allowed={};item.decision.candidates.forEach(function(c){allowed[c.project_id]=1;});
  var ids=uniq(arr(ai.project_ids).map(String).filter(function(x){return allowed[x];})),conf=Math.max(0,Math.min(100,Number(ai.confidence)||0));
  if(ai.classification==='project'&&ids.length&&conf>=92)return{kind:'auto',projects:ids,confidence:conf,reason:'AI: '+String(ai.reason||''),candidates:item.decision.candidates,full:ai._full};
  if(ai.classification==='non_project'&&conf>=92)return{kind:'nonproject',projects:[],confidence:conf,reason:'AI: '+String(ai.reason||''),candidates:item.decision.candidates,full:ai._full};
  return{kind:'review',projects:[],confidence:conf,reason:'AI kërkon kontroll: '+String(ai.reason||item.decision.reason||''),candidates:item.decision.candidates,full:ai._full};
}

async function addLinks(row,pids,method,confidence){
  var fresh=[];
  pids.forEach(function(pid){var k=String(row.gmail_message_id)+'|'+String(pid);if(!linkMap[k]){fresh.push({gmail_message_id:String(row.gmail_message_id),gmail_thread_id:row.gmail_thread_id?String(row.gmail_thread_id):null,project_id:String(pid),link_method:method,confidence:Number(confidence)||0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});linkMap[k]=true;}});
  if(fresh.length)await supaFetch('project_email_links','POST',fresh);
  pids.forEach(function(pid){var tid=String(row.gmail_thread_id||'');if(tid){if(!threadMap[tid])threadMap[tid]={projects:[],manual:false};if(threadMap[tid].projects.indexOf(String(pid))<0)threadMap[tid].projects.push(String(pid));}});
}
async function addAttachmentLinks(row,pids,attachments){
  if(!attachments||!attachments.length||!pids.length)return 0;
  var existing=[];try{existing=await supaFetch('project_attachment_links?gmail_message_id=eq.'+enc(row.gmail_message_id)+'&select=attachment_id,project_id&limit=5000');}catch(e){}
  var have={};arr(existing).forEach(function(x){have[String(x.attachment_id)+'|'+String(x.project_id)]=1;});var fresh=[];
  attachments.forEach(function(a){pids.forEach(function(pid){var k=String(a.attachment_id)+'|'+String(pid);if(!have[k]){have[k]=1;fresh.push({gmail_message_id:String(row.gmail_message_id),gmail_thread_id:row.gmail_thread_id?String(row.gmail_thread_id):null,attachment_id:String(a.attachment_id),attachment_name:a.attachment_name||null,project_id:String(pid),link_method:'gmail-audit',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});}});});
  if(fresh.length)await supaFetch('project_attachment_links','POST',fresh);return fresh.length;
}
async function persist(item,token){
  var row=item.row,d=item.decision,now=new Date().toISOString(),method=String(row.match_method||'');
  if(d.kind==='protected'){stats.protected++;return[];}
  if(d.kind==='auto'&&d.projects.length){
    var multi=d.projects.length>1,mm=multi?'audit-multi':'audit-auto';
    await addLinks(row,d.projects,mm,d.confidence);
    var primary=d.projects[0],patch={project_id:primary,suggested_project_id:primary,match_method:mm,match_confidence:d.confidence,needs_review:false,review_reason:null,updated_at:now};
    await supaFetch('project_emails?id=eq.'+row.id,'PATCH',patch);
    var full=d.full;
    if(row.has_attachments&&!full){try{full=await fullMessage(row,token);}catch(e){}}
    if(full&&full.attachments)stats.attachments+=await addAttachmentLinks(row,d.projects,full.attachments);
    stats.linked++;if(multi)stats.multi++;return d.projects;
  }
  if(d.kind==='review'||d.kind==='ambiguous'){
    var top=d.candidates&&d.candidates[0],patchR={suggested_project_id:top?top.project_id:null,match_method:'audit-review',match_confidence:d.confidence||0,needs_review:true,review_reason:d.reason||'Kërkon kontroll manual.',updated_at:now};
    await supaFetch('project_emails?id=eq.'+row.id,'PATCH',patchR);stats.review++;return[];
  }
  if(d.kind==='nonproject'){
    if(!row.project_id){await supaFetch('project_emails?id=eq.'+row.id,'PATCH',{suggested_project_id:null,match_method:'audit-non-project',match_confidence:d.confidence||95,needs_review:false,review_reason:d.reason||null,updated_at:now});}
    stats.nonproject++;return[];
  }
  if(!row.project_id&&method.indexOf('manual')!==0){await supaFetch('project_emails?id=eq.'+row.id,'PATCH',{match_method:'audit-unmatched',match_confidence:0,needs_review:false,review_reason:null,updated_at:now});}
  stats.unmatched++;return[];
}

window.pstGmailAuditStop=function(){stopRequested=true;setStatus('Po ndalet pas bllokut aktual…','#9B6A22');};
window.pstGmailAuditReset=function(){
  if(running)return;
  if(!confirm('Ta rifillojmë auditin nga emaili i parë? Lidhjet manuale mbeten të paprekura dhe emailat nuk dyfishohen.'))return;
  localStorage.removeItem(KEYS.last);localStorage.removeItem(KEYS.stats);localStorage.removeItem(KEYS.done);stats={processed:0,linked:0,multi:0,review:0,nonproject:0,unmatched:0,protected:0,attachments:0};syncUi();
};
window.pstGmailAuditRun=async function(){
  if(running)return;
  if(!await ready()){alert('Së pari ekzekuto SQL-në e Gmail relations në Supabase.');return;}
  if(!confirm('Auditi do të kontrollojë gjithë historikun e Gmail-it, do të ruajë lidhjet me siguri të lartë dhe do t’i lërë rastet e paqarta për kontroll. Lidhjet manuale nuk preken. Vazhdo?'))return;
  setBusy(true);stopRequested=false;progress(true,2);loadStats();var affected={};
  try{
    if(localStorage.getItem(A.keys.done)!=='1'){
      setStatus('Fillimisht po indeksohet gjithë historiku i Gmail-it…');
      await A.history(async function(x){setStatus('Indeksimi: '+x.processed+' emaila të lexuar…');var b=document.getElementById('pga-progress-fill');if(b)b.style.width='12%';});
    }
    setStatus('Po ndërtohet harta e projekteve, kontakteve dhe thread-eve…');await prepare();
    var last=parseInt(localStorage.getItem(KEYS.last)||'0',10)||0,token=await A.auth(),key=localStorage.getItem('pristeel_apikey')||'';
    while(!stopRequested){
      var rows=await supaFetch('project_emails?id=gt.'+last+'&order=id.asc&limit=160');
      if(!rows||!rows.length){localStorage.setItem(KEYS.done,'1');break;}
      var items=rows.map(function(row){return{row:row,decision:decide(row)};});
      var ambiguous=items.filter(function(x){return x.decision.kind==='ambiguous';});
      if(key&&ambiguous.length){setStatus('Po kontrollohen me AI '+ambiguous.length+' emaila të paqartë në këtë bllok…');var ai=await groqClassify(ambiguous,token);ambiguous.forEach(function(x){x.decision=applyAi(x,ai[x.row.gmail_message_id]);});}
      setStatus('Po ruhen lidhjet e emailave '+(last+1)+'–'+rows[rows.length-1].id+'…');
      var res=await mapLimit(items,5,async function(item){return persist(item,token);});
      res.forEach(function(x){if(Array.isArray(x))x.forEach(function(pid){affected[String(pid)]=1;});});
      stats.processed+=rows.length;last=Number(rows[rows.length-1].id)||last;localStorage.setItem(KEYS.last,String(last));saveStats();syncUi();
      var estimated=Math.min(96,15+Math.log10(Math.max(10,stats.processed))*20);progress(true,estimated);await sleep(80);
    }
    if(stopRequested){setStatus('Auditi u ndal. Progresi u ruajt te emaili #'+last+'.','#9B6A22');}
    else{
      var pids=Object.keys(affected);setStatus('Po rifreskohen kontaktet e '+pids.length+' projekteve…');
      if(typeof window.pstSyncProjectContacts==='function'){
        for(var i=0;i<pids.length&&!stopRequested;i++){try{await window.pstSyncProjectContacts(pids[i]);}catch(e){}if(i%5===0)await sleep(60);}
      }
      progress(true,100);setStatus('Auditi përfundoi: '+stats.processed+' emaila u kontrolluan, '+stats.linked+' u lidhën dhe '+stats.review+' presin verifikim.','#2F7657');
      setTimeout(function(){progress(false,0);},1200);
    }
    if(typeof window.pstEmailCenterLoad==='function')await window.pstEmailCenterLoad();
  }catch(e){setStatus('Auditi u ndërpre: '+e.message+' Progresi është ruajtur.','#A64B42');progress(false,0);}
  finally{setBusy(false);syncUi();}
};

function projectOptions(selected){return'<option value="">Zgjidh projektin…</option>'+Object.keys(projectMap).map(function(id){var p=projectMap[id];return'<option value="'+esc(id)+'"'+(String(selected||'')===id?' selected':'')+'>'+esc(p.name||'(pa emër)')+(p.client?' — '+esc(p.client):'')+'</option>';}).join('');}
window.pstGmailAuditReview=async function(){
  try{if(!profiles.length)await prepare();var rows=await supaFetch('project_emails?needs_review=eq.true&order=sent_at.desc&limit=500');var html=rows&&rows.length?rows.map(function(r){var who=r.direction==='outgoing'?arr(r.to_emails).join(', '):(r.from_name||r.from_email||'');return'<div class="pga-review" id="pga-review-'+r.id+'"><div class="pga-review-top"><div class="pga-review-main"><div class="pga-review-subject">'+esc(r.subject||'(pa subjekt)')+'</div><div class="pga-review-meta">'+esc(who)+' · '+esc(A.fmt(r.sent_at))+'</div><div class="pga-review-snippet">'+esc(r.snippet||'')+'</div><div class="pga-review-reason">'+esc(r.review_reason||'Kërkon kontroll manual.')+'</div><div class="pga-review-actions"><select id="pga-select-'+r.id+'">'+projectOptions(r.suggested_project_id)+'</select><button class="pga-btn primary" onclick="pstGmailAuditReviewLink('+r.id+')">Lidhe</button><button class="pga-btn" onclick="pstGmailAuditOpen(\''+esc(r.gmail_url||A.gmailUrl(r.gmail_thread_id))+'\')">Hap Gmail</button><button class="pga-btn danger" onclick="pstGmailAuditNonProject('+r.id+')">Jo projekt</button></div></div></div></div>';}).join(''):'<div class="pga-empty">Nuk ka emaila që presin kontroll.</div>';modal('Emailat për kontroll',(rows||[]).length+' raste të paqarta ose thread-e të përziera.',html);}catch(e){alert(e.message);}
};
window.pstGmailAuditOpen=function(url){var w=window.open(url,'PRISTEEL_GMAIL');if(w)try{w.focus();}catch(e){}};
window.pstGmailAuditReviewLink=async function(id){
  var s=document.getElementById('pga-select-'+id),pid=s&&s.value;if(!pid){alert('Zgjidh projektin.');return;}
  try{var rows=await supaFetch('project_emails?id=eq.'+id+'&limit=1'),r=rows&&rows[0];if(!r)throw new Error('Emaili nuk u gjet.');await addLinks(r,[pid],'manual-audit-review',100);await supaFetch('project_emails?id=eq.'+id,'PATCH',{project_id:pid,suggested_project_id:pid,match_method:'manual-audit-review',match_confidence:100,needs_review:false,review_reason:null,updated_at:new Date().toISOString()});var el=document.getElementById('pga-review-'+id);if(el)el.remove();if(typeof window.pstSyncProjectContacts==='function')window.pstSyncProjectContacts(pid);}catch(e){alert('Gabim: '+e.message);}
};
window.pstGmailAuditNonProject=async function(id){
  try{await supaFetch('project_emails?id=eq.'+id,'PATCH',{project_id:null,suggested_project_id:null,match_method:'manual-ignored',match_confidence:100,needs_review:false,review_reason:'Shënuar manualisht si jo projekt.',updated_at:new Date().toISOString()});var el=document.getElementById('pga-review-'+id);if(el)el.remove();}catch(e){alert('Gabim: '+e.message);}
};
function modal(title,sub,body){var old=document.getElementById('pga-modal-bg');if(old)old.remove();var bg=document.createElement('div');bg.id='pga-modal-bg';bg.className='pga-modal-bg';bg.innerHTML='<div class="pga-modal"><div class="pga-modal-hd"><div><div class="pga-modal-title">'+esc(title)+'</div><div class="pga-modal-sub">'+esc(sub||'')+'</div></div><button class="pga-x" onclick="document.getElementById(\'pga-modal-bg\').remove()">×</button></div><div class="pga-modal-body">'+body+'</div></div>';bg.onclick=function(e){if(e.target===bg)bg.remove();};document.body.appendChild(bg);}

function panel(){return'<div class="pga-strip" id="pga-strip"><div class="pga-state"><div class="pga-title" id="pga-title">Auditi i plotë i Gmail-it</div><div class="pga-sub" id="pga-sub">Kontrollon çdo mesazh, mbron lidhjet manuale dhe ndan thread-et e përziera.</div></div><div class="pga-stats"><span class="pga-stat"><b id="pga-processed">0</b> kontrolluar</span><span class="pga-stat"><b id="pga-linked">0</b> lidhur</span><span class="pga-stat"><b id="pga-review">0</b> për kontroll</span><span class="pga-stat"><b id="pga-nonproject">0</b> jo projekt</span><span class="pga-stat"><b id="pga-protected">0</b> manuale</span></div><button class="pga-btn" id="pga-review-btn" onclick="pstGmailAuditReview()">Shiko për kontroll</button><button class="pga-btn primary" id="pga-run" onclick="pstGmailAuditRun()">Nis auditin</button><button class="pga-btn danger" id="pga-stop" style="display:none" onclick="pstGmailAuditStop()">Ndale</button><button class="pga-btn" id="pga-reset" onclick="pstGmailAuditReset()">Rifillo</button><div class="pga-progress" id="pga-progress"><i id="pga-progress-fill"></i></div></div>';}
function inject(){
  var center=document.getElementById('pst-email-center');if(!center)return false;
  if(document.getElementById('pga-strip')){syncUi();return true;}
  var state=center.querySelector('.pec-state');var h=document.createElement('div');h.innerHTML=panel();if(state&&state.parentNode)state.parentNode.insertBefore(h.firstChild,state.nextSibling);else center.insertBefore(h.firstChild,center.firstChild);syncUi();return true;
}
function hook(){
  if(typeof window.showPage!=='function'||window.showPage.__pga)return false;var o=window.showPage;window.showPage=function(p){o.apply(this,arguments);setTimeout(function(){if(String(p||'').toLowerCase()==='outreach')inject();},160);};window.showPage.__pga=true;return true;
}
var tries=0,t=setInterval(function(){hook();inject();if(++tries>100)clearInterval(t);},300);

})();
