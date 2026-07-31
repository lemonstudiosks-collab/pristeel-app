/* PRISTEEL — hyrja e një kërkese nga paneli i Gmail-it */
(function(){
'use strict';

var params=new URLSearchParams(window.location.search);
if(params.get('gmail_intake')!=='1')return;

var currentMessageId=params.get('gmail_message_id')||'';
var currentThreadId=params.get('gmail_thread_id')||'';
var fallbackSubject=params.get('subject')||'';
var fallbackFrom=params.get('from')||'';
var state={token:'',thread:null,messages:[],attachments:[],projects:[],linkedProject:null};

var css=document.createElement('style');
css.textContent=`
.pgi-bg{position:fixed;inset:0;background:rgba(26,26,25,.42);z-index:1400;display:flex;align-items:center;justify-content:center;padding:22px}
.pgi-modal{width:min(860px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 16px 48px rgba(26,26,25,.2)}
.pgi-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:18px 20px;border-bottom:1px solid var(--border)}
.pgi-title{font-size:16px;font-weight:700}.pgi-sub{font-size:11px;color:var(--text3);margin-top:3px}.pgi-x{border:0;background:none;font-size:22px;color:var(--text3);cursor:pointer}
.pgi-body{padding:18px 20px}.pgi-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.pgi-field label{display:block;font-size:10px;font-weight:650;color:var(--text3);text-transform:uppercase;letter-spacing:.45px;margin-bottom:4px}
.pgi-field input,.pgi-field select,.pgi-field textarea{width:100%;font-size:12px;padding:8px 9px}
.pgi-field textarea{min-height:180px;resize:vertical;line-height:1.5}
.pgi-wide{grid-column:1/-1}.pgi-mail{border:1px solid var(--border);background:var(--bg2);border-radius:9px;padding:11px 12px;margin-bottom:14px}
.pgi-mail strong{display:block;font-size:12.5px}.pgi-mail div{font-size:10.5px;color:var(--text2);margin-top:3px}
.pgi-sec{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin:17px 0 7px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.pgi-att{display:flex;align-items:flex-start;gap:9px;padding:8px 9px;border:1px solid var(--border);border-radius:8px;margin:5px 0}
.pgi-att input{margin-top:3px}.pgi-att-main{flex:1;min-width:0}.pgi-att-name{font-size:11.5px;font-weight:620;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgi-att-meta{font-size:10px;color:var(--text3);margin-top:2px}.pgi-empty{font-size:11px;color:var(--text3);font-style:italic;padding:7px 0}
.pgi-status{font-size:11px;color:var(--text3);min-height:18px;margin-top:12px}.pgi-progress{height:4px;background:var(--bg3);border-radius:4px;overflow:hidden;margin-top:6px;display:none}
.pgi-progress.on{display:block}.pgi-progress i{display:block;height:100%;width:0;background:var(--bronze);transition:width .18s}
.pgi-ft{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;padding:14px 20px;border-top:1px solid var(--border)}
.pgi-linked{padding:11px 12px;border:1px solid rgba(63,122,78,.25);background:var(--green-bg);border-radius:9px;color:var(--green-text);font-size:11.5px;margin-bottom:14px}
@media(max-width:700px){.pgi-grid{grid-template-columns:1fr}.pgi-wide{grid-column:auto}}
`;
document.head.appendChild(css);

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function header(payload,name){
  var hs=(payload&&payload.headers)||[];
  name=String(name||'').toLowerCase();
  for(var i=0;i<hs.length;i++)if(String(hs[i].name||'').toLowerCase()===name)return hs[i].value||'';
  return '';
}
function cleanSubject(s){return String(s||'').replace(/^\s*((re|fw|fwd|wg|aw)\s*:\s*)+/i,'').trim().slice(0,180);}
function emailFrom(s){var m=String(s||'').match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);return m?m[0].toLowerCase():'';}
function senderName(s){var e=emailFrom(s),n=String(s||'').replace(/<[^>]+>/g,'').replace(/["']/g,'').trim();return n&&n.toLowerCase()!==e?n:e;}
function clientFrom(from){
  var email=emailFrom(from),name=senderName(from);
  if(name)return name.slice(0,120);
  if(email){var domain=(email.split('@')[1]||'').split('.')[0]||'';return domain?domain.charAt(0).toUpperCase()+domain.slice(1):email;}
  return String(from||'').slice(0,120);
}
function detectRef(text){
  var patterns=[/\b[A-Z]{2,8}[-_/]\d{2,}(?:[-_/][A-Z0-9]+)*\b/i,/\b(?:RFQ|RFP|ANFRAGE|TENDER|PROJEKT|PROJECT)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{3,})/i];
  for(var i=0;i<patterns.length;i++){var m=String(text||'').match(patterns[i]);if(m)return (m[1]||m[0]).slice(0,100);}
  return '';
}
function fmtBytes(n){n=parseInt(n||0,10);if(!n)return'';if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(n<10240?1:0)+' KB';return(n/1048576).toFixed(1)+' MB';}
function fmtDate(v){var d=new Date(v);return isNaN(d.getTime())?'':d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}
function setStatus(msg,color){var e=document.getElementById('pgi-status');if(e){e.textContent=msg||'';e.style.color=color||'var(--text3)';}}
function setProgress(on,pct){var p=document.getElementById('pgi-progress'),f=document.getElementById('pgi-progress-fill');if(p)p.classList.toggle('on',!!on);if(f)f.style.width=(pct||0)+'%';}
function closeModal(){var e=document.getElementById('pgi-bg');if(e)e.remove();var u=new URL(window.location.href);['gmail_intake','gmail_message_id','gmail_thread_id','subject','from'].forEach(function(k){u.searchParams.delete(k);});history.replaceState({},'',u.toString());}

function collectAttachments(part,message,out){
  if(!part)return;
  var filename=part.filename||'';
  var disposition=header({headers:part.headers||[]},'Content-Disposition').toLowerCase();
  if(filename&&part.body&&(part.body.attachmentId||part.body.data)){
    out.push({
      key:message.id+':'+(part.body.attachmentId||filename+':'+out.length),
      messageId:message.id,attachmentId:part.body.attachmentId||'',inlineData:part.body.data||'',
      filename:filename,mimeType:part.mimeType||'application/octet-stream',size:part.body.size||0,
      sender:header(message.payload,'From'),sentAt:header(message.payload,'Date'),inline:disposition.indexOf('inline')>-1
    });
  }
  (part.parts||[]).forEach(function(p){collectAttachments(p,message,out);});
}
function base64UrlBytes(data){var s=String(data||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var bin=atob(s),arr=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return arr;}
async function attachmentToFile(att){
  var data=att.inlineData;
  if(!data){var r=await window.PSTEmail.gmail('/messages/'+encodeURIComponent(att.messageId)+'/attachments/'+encodeURIComponent(att.attachmentId),state.token);data=r.data||'';}
  return new File([base64UrlBytes(data)],att.filename,{type:att.mimeType||'application/octet-stream'});
}

function makeSummary(){
  var rows=(state.messages||[]).slice().sort(function(a,b){return Number(a.internalDate||0)-Number(b.internalDate||0);});
  var participants={},lines=[];
  rows.forEach(function(m){
    var from=header(m.payload,'From'),to=header(m.payload,'To'),date=header(m.payload,'Date')||m.internalDate,sub=cleanSubject(header(m.payload,'Subject')),
        internal=window.PSTEmail.isInternal(emailFrom(from)),files=[];
    collectAttachments(m.payload,m,files);
    [from,to].forEach(function(v){var em=emailFrom(v);if(em)participants[em]=senderName(v)||em;});
    var snippet=String(m.snippet||'').replace(/\s+/g,' ').trim().slice(0,260);
    lines.push((fmtDate(date)||'Pa datë')+' · '+(internal?'Dërguar':'Pranuar')+' · '+(senderName(from)||emailFrom(from)||'Pa dërgues')
      +(sub?' · '+sub:'')+(snippet?'\n'+snippet:'')+(files.length?'\nSkedarë: '+files.filter(function(x){return!x.inline;}).map(function(x){return x.filename;}).join(', '):''));
  });
  return 'Përmbledhje e projektit\n'
    +'Ky projekt u krijua nga një Gmail thread me '+rows.length+' emaila të shkëmbyer.\n'
    +'Palët: '+Object.keys(participants).map(function(k){return participants[k]+' <'+k+'>';}).join('; ')+'\n\n'
    +'Historiku i komunikimit\n'+lines.map(function(x,i){return (i+1)+'. '+x;}).join('\n\n')
    +'\n\nGjendja aktuale\nVazhdimi i projektit duhet të bazohet në kërkesat dhe dokumentet e listuara më sipër. Përditëso këtë pjesë me hapin e ardhshëm sapo të konfirmohet.';
}

async function linkThread(projectId){
  var A=window.PSTEmail,ids=(state.thread&&state.thread.messages||[]).map(function(m){return m.id;});
  var metas=await A.map(ids,5,function(id){return A.message(id,state.token);});
  for(var i=0;i<metas.length;i++){
    var m=metas[i],rows=await supaFetch('project_emails?gmail_message_id=eq.'+encodeURIComponent(m.gmail_message_id)+'&select=id,project_id');
    var patch={project_id:projectId,suggested_project_id:projectId,match_method:'gmail-panel',match_confidence:100,updated_at:new Date().toISOString()};
    if(rows&&rows.length)await supaFetch('project_emails?id=eq.'+rows[0].id,'PATCH',patch);
    else await supaFetch('project_emails','POST',[Object.assign({},m,patch)]);
  }
}
function projectOptions(){return '<option value="">Zgjidh projektin ekzistues…</option>'+state.projects.map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.name||'(pa emër)')+(p.client?' — '+esc(p.client):'')+'</option>';}).join('');}

function renderModal(meta){
  if(document.getElementById('pgi-bg'))return;
  var subject=cleanSubject(meta.subject||fallbackSubject||'(pa subjekt)'),from=meta.from||fallbackFrom||'',
      ref=detectRef((meta.subject||'')+' '+(meta.snippet||'')),summary=makeSummary(),
      attachments=state.attachments.filter(function(a){return !a.inline;});
  var attHtml=attachments.length?attachments.map(function(a){
    var internal=window.PSTEmail.isInternal(emailFrom(a.sender));
    return '<label class="pgi-att"><input class="pgi-att-check" type="checkbox" data-key="'+esc(a.key)+'" checked><span class="pgi-att-main"><span class="pgi-att-name">'+esc(a.filename)+'</span><span class="pgi-att-meta">'+(internal?'Dërguar nga PRISTEEL':'Pranuar nga klienti')+' · '+esc(emailFrom(a.sender)||a.sender)+' · '+esc(fmtDate(a.sentAt))+(a.size?' · '+fmtBytes(a.size):'')+'</span></span></label>';
  }).join(''):'<div class="pgi-empty">Nuk u gjetën attachment-e në këtë thread.</div>';
  var linked=state.linkedProject?'<div class="pgi-linked">Ky email është tashmë i lidhur me projektin <strong>'+esc(state.linkedProject.name||'')+'</strong>.</div>':'';
  var html='<div class="pgi-bg" id="pgi-bg"><div class="pgi-modal">'
    +'<div class="pgi-hd"><div><div class="pgi-title">Kërkesë e re nga Gmail</div><div class="pgi-sub">Krijo projektin, ruaj historikun dhe importo skedarët e gjithë thread-it.</div></div><button class="pgi-x" id="pgi-close">×</button></div>'
    +'<div class="pgi-body">'+linked
    +'<div class="pgi-mail"><strong>'+esc(meta.subject||fallbackSubject||'(pa subjekt)')+'</strong><div>Nga: '+esc(from)+'</div><div>'+esc(meta.snippet||'')+'</div></div>'
    +'<div class="pgi-grid">'
      +'<div class="pgi-field pgi-wide"><label>Emri i projektit</label><input id="pgi-name" value="'+esc(subject)+'"></div>'
      +'<div class="pgi-field"><label>Klienti</label><input id="pgi-client" value="'+esc(clientFrom(from))+'"></div>'
      +'<div class="pgi-field"><label>Referenca</label><input id="pgi-ref" value="'+esc(ref)+'"></div>'
      +'<div class="pgi-field"><label>Lokacioni</label><input id="pgi-location" value=""></div>'
      +'<div class="pgi-field"><label>Afati</label><input id="pgi-deadline" type="date" value=""></div>'
      +'<div class="pgi-field pgi-wide"><label>Përmbledhja dhe historiku i projektit</label><textarea id="pgi-notes">'+esc(summary)+'</textarea></div>'
    +'</div>'
    +'<div class="pgi-sec">Skedarët e gjithë thread-it</div>'+attHtml
    +'<div class="pgi-sec">Ose lidhe me projekt ekzistues</div><div class="pgi-field"><select id="pgi-existing">'+projectOptions()+'</select></div>'
    +'<div class="pgi-status" id="pgi-status">Kontrollo përmbledhjen dhe skedarët para krijimit.</div><div class="pgi-progress" id="pgi-progress"><i id="pgi-progress-fill"></i></div>'
    +'</div><div class="pgi-ft"><button class="btn btn-sm" id="pgi-open-gmail">Hap emailin në Gmail</button><button class="btn btn-sm" id="pgi-link-existing">Lidhe me projekt ekzistues</button><button class="btn btn-sm btn-primary" id="pgi-create">Krijo projekt dhe importo</button></div>'
    +'</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  document.getElementById('pgi-close').onclick=closeModal;
  document.getElementById('pgi-open-gmail').onclick=function(){window.open('https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(currentThreadId||meta.threadId||''),'_blank');};
  document.getElementById('pgi-link-existing').onclick=linkExisting;
  document.getElementById('pgi-create').onclick=createProject;
}

function selectedAttachments(){var keys=Array.prototype.slice.call(document.querySelectorAll('.pgi-att-check:checked')).map(function(x){return x.getAttribute('data-key');});return state.attachments.filter(function(a){return keys.indexOf(a.key)>-1;});}
async function importSelected(projectId){
  var chosen=selectedAttachments();if(!chosen.length)return{uploaded:0,skipped:0};
  setStatus('Po shkarkohen skedarët nga Gmail…');setProgress(true,5);
  var files=[];
  for(var i=0;i<chosen.length;i++){setStatus('Po shkarkohet '+(i+1)+'/'+chosen.length+': '+chosen[i].filename);files.push(await attachmentToFile(chosen[i]));setProgress(true,5+Math.round((i+1)/chosen.length*35));}
  return window.PSTDriveImport.importFiles(projectId,files,function(x){
    if(x.phase==='upload'){var base=40+Math.round(((x.index-1)+(x.percent||0)/100)/Math.max(x.total,1)*60);setProgress(true,base);setStatus('Po ruhet '+x.index+'/'+x.total+': '+x.name+' ('+(x.percent||0)+'%)');}
    else if(x.message)setStatus(x.message);
  });
}
async function finish(projectId,projectName,created){
  setProgress(true,100);setStatus((created?'Projekti u krijua':'Emaili u lidh')+' me sukses.','var(--green-text)');
  var createBtn=document.getElementById('pgi-create'),linkBtn=document.getElementById('pgi-link-existing');
  if(createBtn)createBtn.disabled=true;if(linkBtn)linkBtn.disabled=true;setTimeout(function(){setProgress(false,0);},700);
  var project=(state.projects||[]).filter(function(p){return String(p.id)===String(projectId);})[0]||{id:projectId,name:projectName};
  if(typeof window.renderOverviewModal==='function'){var open=document.createElement('button');open.className='btn btn-sm btn-primary';open.textContent='Hap projektin';open.onclick=function(){closeModal();window.renderOverviewModal(projectId,project);};document.querySelector('.pgi-ft').appendChild(open);}
}
async function linkExisting(){
  if(busyButton('pgi-link-existing',true,'Duke lidhur…'))return;var success=false;
  try{
    var pid=(document.getElementById('pgi-existing')||{}).value||'';if(!pid)throw new Error('Zgjidh projektin ekzistues.');
    setStatus('Po lidhet thread-i me projektin…');await linkThread(pid);
    var notes=((document.getElementById('pgi-notes')||{}).value||'').trim();
    if(notes)await supaFetch('projects?id=eq.'+encodeURIComponent(pid),'PATCH',{notes:notes});
    var r=await importSelected(pid);await finish(pid,'',false);
    setStatus('Emaili u lidh dhe '+r.uploaded+' skedarë u importuan'+(r.skipped?' · '+r.skipped+' ekzistonin tashmë.':'.'),'var(--green-text)');success=true;
  }catch(e){setStatus(e.message,'var(--red-text)');}finally{if(!success)busyButton('pgi-link-existing',false,'Lidhe me projekt ekzistues');}
}
async function createProject(){
  if(busyButton('pgi-create',true,'Duke krijuar…'))return;var success=false;
  try{
    var name=(document.getElementById('pgi-name')||{}).value||'';if(!name.trim())throw new Error('Shkruaj emrin e projektit.');
    var payload={
      name:name.trim(),client:((document.getElementById('pgi-client')||{}).value||'').trim(),
      ref:((document.getElementById('pgi-ref')||{}).value||'').trim(),location:((document.getElementById('pgi-location')||{}).value||'').trim(),
      deadline:(document.getElementById('pgi-deadline')||{}).value||'',notes:((document.getElementById('pgi-notes')||{}).value||'').trim(),deal_type:'full'
    };
    setStatus('Po krijohet projekti…');var created=await supaFetch('projects','POST',payload);
    if(!created||!created.length)throw new Error('Projekti nuk u krijua.');
    var project=created[0];state.projects.unshift(project);setStatus('Projekti u krijua. Po lidhet gjithë thread-i…');
    await linkThread(project.id);var r=await importSelected(project.id);await finish(project.id,project.name,true);
    setStatus('Projekti u krijua, historiku u ruajt, thread-i u lidh dhe '+r.uploaded+' skedarë u importuan'+(r.skipped?' · '+r.skipped+' ekzistonin tashmë.':'.'),'var(--green-text)');success=true;
  }catch(e){setStatus(e.message,'var(--red-text)');}finally{if(!success)busyButton('pgi-create',false,'Krijo projekt dhe importo');}
}
function busyButton(id,on,text){var b=document.getElementById(id);if(!b)return false;if(on&&b.disabled)return true;b.disabled=!!on;b.textContent=text;return false;}

async function loadData(){
  var A=window.PSTEmail;state.token=await A.auth();
  if(!currentMessageId)throw new Error('Gmail nuk dërgoi ID-në e emailit.');
  var meta=await A.message(currentMessageId,state.token);currentThreadId=currentThreadId||meta.gmail_thread_id;
  state.thread=await A.gmail('/threads/'+encodeURIComponent(currentThreadId)+'?format=full',state.token);
  state.messages=state.thread.messages||[];state.attachments=[];state.messages.forEach(function(m){collectAttachments(m.payload,m,state.attachments);});
  var seen={};state.attachments=state.attachments.filter(function(a){if(seen[a.key])return false;seen[a.key]=1;return true;});
  state.projects=await supaFetch('projects?select=id,name,client&order=created_at.desc&limit=500');
  var linked=await supaFetch('project_emails?gmail_message_id=eq.'+encodeURIComponent(currentMessageId)+'&project_id=not.is.null&select=project_id&limit=1');
  if(linked&&linked.length){var p=await supaFetch('projects?id=eq.'+encodeURIComponent(linked[0].project_id)+'&select=id,name,client&limit=1');state.linkedProject=p&&p[0]||null;}
  renderModal({subject:meta.subject,from:meta.from_name?meta.from_name+' <'+meta.from_email+'>':meta.from_email,snippet:meta.snippet,threadId:meta.gmail_thread_id});
}
function waitAndStart(){
  var tries=0,timer=setInterval(function(){
    if(window.PSTEmail&&window.PSTDriveImport&&typeof window.supaFetch==='function'){clearInterval(timer);loadData().catch(function(err){renderModal({subject:fallbackSubject,from:fallbackFrom,snippet:''});setStatus(err.message,'var(--red-text)');});}
    else if(++tries>80){clearInterval(timer);alert('Modulet e Gmail-it ose Google Drive nuk u ngarkuan. Bëj hard refresh dhe provo përsëri.');}
  },400);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitAndStart);else waitAndStart();
})();