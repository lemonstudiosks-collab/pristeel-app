/* PRISTEEL project Gmail documents
 * Shows linked email attachments even when document tables are empty.
 * Reads only the current project and never runs a global audit.
 */
(function(){
'use strict';
if(window.__pstProjectGmailDocumentsLoaded)return;
window.__pstProjectGmailDocumentsLoaded=true;
var cache={},busy={},RED='#A64B42',RED_BG='#F9ECEA',BLUE='#5B9BB3',BLUE_DARK='#326F87';

function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function cleanEmail(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function header(payload,name){var hs=(payload&&payload.headers)||[],n=String(name||'').toLowerCase();for(var i=0;i<hs.length;i++)if(String(hs[i].name||'').toLowerCase()===n)return hs[i].value||'';return'';}
function date(v){if(!v)return'—';var d=new Date(v);return isNaN(d.getTime())?String(v):d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'});}
function bounded(p,ms,label){return new Promise(function(resolve,reject){var done=false,t=setTimeout(function(){if(done)return;done=true;reject(new Error((label||'Kërkesa')+' nuk u përgjigj.'));},ms||7000);Promise.resolve(p).then(function(x){if(done)return;done=true;clearTimeout(t);resolve(x);},function(e){if(done)return;done=true;clearTimeout(t);reject(e);});});}
async function q(path){if(typeof window.supaFetch!=='function')throw new Error('Databaza nuk është gati.');return arr(await bounded(window.supaFetch(path),6500,path.split('?')[0]));}
function currentId(){return String(window.__pstCurrentProjectId||window._curProjId||'');}
function gmailUrl(row){return row.gmail_url||(window.PSTEmail&&window.PSTEmail.gmailUrl?window.PSTEmail.gmailUrl(row.gmail_thread_id):'https://mail.google.com/mail/#all/'+encodeURIComponent(row.gmail_thread_id||row.gmail_message_id||''));}
function addCss(){if(document.getElementById('pst-gmail-docs-css'))return;var s=document.createElement('style');s.id='pst-gmail-docs-css';s.textContent=`
.pgd-card{margin:0 0 14px;border:1px solid #DCE7EB;border-radius:15px;background:#fff;overflow:hidden;box-shadow:0 3px 14px rgba(36,59,68,.045)}.pgd-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #E8EEF0}.pgd-title{font-size:12px;font-weight:780;color:#29343A}.pgd-sub{font-size:9.5px;color:#849097;margin-top:3px}.pgd-actions{display:flex;gap:7px;flex-wrap:wrap}.pgd-btn{height:30px;border:1px solid #D7E2E6;border-radius:8px;background:#fff;color:#58656B;padding:0 10px;font-size:9px;font-weight:730;cursor:pointer}.pgd-btn.primary{background:linear-gradient(135deg,#67A8C0,#3F7F98);border-color:transparent;color:#fff}.pgd-body{padding:5px 16px 9px}.pgd-row{display:grid;grid-template-columns:minmax(0,1fr) 135px 105px auto;gap:12px;align-items:center;min-height:54px;padding:9px 0;border-bottom:1px solid #EDF1F2}.pgd-row:last-child{border-bottom:0}.pgd-name{font-size:10.5px;font-weight:730;color:#303B40;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pgd-meta{font-size:8.8px;color:#89949A;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pgd-tag{justify-self:start;border-radius:999px;padding:4px 8px;background:#EEF5F8;color:${BLUE_DARK};font-size:8.2px;font-weight:760}.pgd-date{font-size:9px;color:#6E7A80}.pgd-empty{padding:18px 2px;text-align:center;font-size:10px;color:#89949A}.pgd-lost{margin:0 0 14px;padding:12px 14px;border:1px solid #E4B7B2;border-radius:12px;background:${RED_BG};color:${RED};font-size:10px;line-height:1.5}.pst-ws-project-head.pgd-project-lost{border-color:#E1B3AE!important;background:linear-gradient(180deg,#FFFDFC,#FFF6F5)!important;box-shadow:inset 5px 0 0 ${RED}!important}@media(max-width:850px){.pgd-row{grid-template-columns:minmax(0,1fr) auto}.pgd-tag,.pgd-date{display:none}}
`;document.head.appendChild(s);}
function lostText(rows){
 var text=rows.filter(function(x){return String(x.direction||'').toLowerCase()!=='outgoing';}).map(function(x){return String(x.subject||'')+' '+String(x.snippet||'');}).join(' ').toLowerCase();
 var patterns=[/selbst fertigen/,/anderweitig vergeben/,/an (?:einen|eine) andere/,/nicht berücksichtigt/,/projekt (?:wurde|ist) vergeben/,/awarded to another/,/given to another/,/we will manufacture it ourselves/,/projekti (?:i është|eshte) dhënë/,/e prodhojmë vetë/,/e prodhojme vete/,/dodeljen drugom/,/sami ćemo proizvoditi/];
 return patterns.some(function(r){return r.test(text);});
}
async function markLost(pid,rows){
 if(!lostText(rows))return false;
 var project=(await q('projects?id=eq.'+enc(pid)+'&select=id,name,status&limit=1'))[0];if(!project)return false;
 var st=String(project.status||'').toLowerCase();
 if(['humbur','closedlost','cancelled'].indexOf(st)<0){
  await window.supaFetch('projects?id=eq.'+enc(pid),'PATCH',{status:'humbur'});
  try{await window.supaFetch('dismissed_items','POST',{item_type:'project_loss',item_ref:'gmail-confirmed-loss:'+pid,project_id:pid,label:project.name||'Projekt',reason:'Statusi u konfirmua nga emaili i blerësit: projekti nuk vazhdon me PRISTEEL.',dismissed_by:'system-gmail'});}catch(_e){}
 }
 return true;
}
function applyLostHeader(){
 var h=document.querySelector('.pst-ws-project-head');if(!h)return;h.classList.add('pgd-project-lost');
 var badge=h.querySelector('.pst-ws-status');if(badge){badge.textContent='Humbur';badge.style.setProperty('--c',RED);badge.style.setProperty('--bg',RED_BG);}
 h.querySelectorAll('button').forEach(function(b){if(String(b.textContent||'').trim()==='Mbyll projektin'){b.textContent='Projekt i humbur';b.disabled=true;b.style.color=RED;b.style.borderColor='#E1B3AE';}});
}
function collectParts(part,msg,out){
 if(!part)return;
 var disposition=header({headers:part.headers||[]},'Content-Disposition').toLowerCase(),name=part.filename||'';
 if(name&&part.body&&(part.body.attachmentId||part.body.data)&&disposition.indexOf('inline')<0){out.push({name:name,mime:part.mimeType||'',size:part.body.size||0,messageId:msg.id,threadId:msg.threadId});}
 arr(part.parts).forEach(function(x){collectParts(x,msg,out);});
}
function classify(row,name){
 var s=(String(row.subject||'')+' '+String(name||'')).toLowerCase(),out=String(row.direction||'').toLowerCase()==='outgoing';
 if(out&&/(angebot|offer|quotation|ofert)/.test(s))return'Oferta jonë';
 if(!out&&/(angebot|offer|quotation|ofert)/.test(s))return'Ofertë furnitori';
 if(/rechnung|invoice|fatur/.test(s))return'Faturë';
 if(/vertrag|contract|kontrat/.test(s))return'Kontratë';
 return out?'Dokument i dërguar':'Dokument i pranuar';
}
async function metadata(pid){
 var direct=await q('project_emails?project_id=eq.'+enc(pid)+'&select=*&order=sent_at.desc&limit=300');
 var links=[];try{links=await q('project_email_links?project_id=eq.'+enc(pid)+'&select=*&limit=1000');}catch(e){}
 var ids=links.map(function(x){return x.gmail_message_id;}).filter(Boolean),map={};direct.forEach(function(x){map[x.gmail_message_id||('id:'+x.id)]=x;});
 for(var i=0;i<ids.length;i+=35){var values=ids.slice(i,i+35).map(function(x){return'"'+String(x).replace(/"/g,'')+'"';}).join(',');var extra=await q('project_emails?gmail_message_id=in.('+values+')&select=*&order=sent_at.desc');extra.forEach(function(x){map[x.gmail_message_id||('id:'+x.id)]=x;});}
 return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return String(b.sent_at||'').localeCompare(String(a.sent_at||''));});
}
function token(){var A=window.PSTEmail;return A&&A.token&&Date.now()<Number(A.tokenExp||0)?A.token:'';}
async function fullAttachments(rows){
 var A=window.PSTEmail,tok=token();if(!A||!tok)return[];
 var candidates=rows.filter(function(x){return x.gmail_message_id&&x.has_attachments!==false;}).slice(0,80);
 var full=await A.map(candidates,4,async function(row){var msg=await bounded(A.gmail('/messages/'+enc(row.gmail_message_id)+'?format=full',tok),8500,'Gmail');var files=[];collectParts(msg.payload,msg,files);return{row:row,files:files};});
 var out=[];full.forEach(function(x){x.files.forEach(function(f){out.push({name:f.name,type:classify(x.row,f.name),date:x.row.sent_at,sender:x.row.from_name||x.row.from_email||'',url:gmailUrl(x.row),messageId:x.row.gmail_message_id});});});
 return out;
}
function fallbackDocs(rows){return rows.filter(function(x){return x.has_attachments;}).map(function(x){return{name:'Email me attachment: '+(x.subject||'(pa subjekt)'),type:classify(x,''),date:x.sent_at,sender:x.from_name||x.from_email||'',url:gmailUrl(x),messageId:x.gmail_message_id};});}
function uniqueDocs(rows){var seen={};return rows.filter(function(x){var k=[x.messageId,x.name].join('|').toLowerCase();if(seen[k])return false;seen[k]=1;return true;});}
function updateCounts(n){
 document.querySelectorAll('.pst-ws-smart button').forEach(function(b){var l=b.querySelector('span'),v=b.querySelector('b');if(!l||!v)return;var t=l.textContent.trim();if(t==='Dokumente'||t==='Skedarë'){var old=parseInt(v.textContent,10)||0;v.textContent=String(Math.max(old,n));}});
}
function render(pid,data){
 addCss();var h=document.getElementById('pst-ws-project-tab');if(!h||currentId()!==String(pid))return;
 var old=document.getElementById('pst-project-gmail-docs');if(old)old.remove();
 if(data.lost)applyLostHeader();
 var card=document.createElement('section');card.id='pst-project-gmail-docs';card.className='pgd-card';
 var docs=data.docs,body=docs.length?docs.map(function(x){return'<div class="pgd-row"><div><div class="pgd-name">'+esc(x.name)+'</div><div class="pgd-meta">'+esc(x.sender||'')+'</div></div><span class="pgd-tag">'+esc(x.type)+'</span><span class="pgd-date">'+esc(date(x.date))+'</span><button type="button" class="pgd-btn" onclick="window.open(\''+String(x.url||'').replace(/'/g,"\\'")+'\',\'PRISTEEL_GMAIL\')">Hap</button></div>';}).join(''):'<div class="pgd-empty">Nuk u gjetën attachment-e të regjistruara për këtë projekt.</div>';
 var lost=data.lost?'<div class="pgd-lost"><b>PROJEKT I HUMBUR.</b> Emaili i blerësit konfirmon se projekti nuk do të vazhdojë me PRISTEEL.</div>':'';
 card.innerHTML='<div class="pgd-head"><div><div class="pgd-title">Dokumentet nga Gmail</div><div class="pgd-sub">Oferta jonë, ofertat e prodhuesve dhe dokumentet e shkëmbyera në emailat e projektit</div></div><div class="pgd-actions"><button type="button" class="pgd-btn" onclick="pstProjectGmailDocumentsAuthorize(\''+esc(pid)+'\')">Lexo emrat e skedarëve</button>'+(typeof window.pstImportProjectEmailFiles==='function'?'<button type="button" class="pgd-btn primary" onclick="pstImportProjectEmailFiles(\''+esc(pid)+'\')">Importo skedarët</button>':'')+'</div></div><div class="pgd-body">'+lost+body+'</div>';
 h.insertBefore(card,h.firstChild);updateCounts(docs.length);
}
async function load(pid,force){
 pid=String(pid||currentId());if(!pid)return;
 if(busy[pid])return busy[pid];if(!force&&cache[pid]&&Date.now()-cache[pid].at<60000){render(pid,cache[pid]);return cache[pid];}
 busy[pid]=(async function(){var rows=await metadata(pid),lost=false;try{lost=await markLost(pid,rows);}catch(e){console.warn('PRISTEEL lost status:',e);}var docs=[];try{docs=await fullAttachments(rows);}catch(e){console.warn('PRISTEEL Gmail attachments:',e);}if(!docs.length)docs=fallbackDocs(rows);var data={at:Date.now(),rows:rows,docs:uniqueDocs(docs),lost:lost};cache[pid]=data;render(pid,data);return data;})().catch(function(e){console.error('PRISTEEL Gmail project documents:',e);}).finally(function(){delete busy[pid];});
 return busy[pid];
}
window.pstProjectGmailDocumentsRefresh=function(pid){return load(pid||currentId(),false);};
window.pstProjectGmailDocumentsAuthorize=async function(pid){try{if(!window.PSTEmail)throw new Error('Moduli Gmail nuk është gati.');await window.PSTEmail.auth();return load(pid||currentId(),true);}catch(e){alert('Gmail: '+e.message);}};
})();