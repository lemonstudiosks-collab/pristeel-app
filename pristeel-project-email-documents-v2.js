/* PRISTEEL project email evidence v2
 * Deterministic project document/status reconciliation from linked Gmail metadata.
 * Works without a live Google token and re-runs after project/tab changes.
 */
(function(){
'use strict';
if(window.__pstProjectEmailDocumentsV2Loaded)return;
window.__pstProjectEmailDocumentsV2Loaded=true;

var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com'];
var cache={},running={},lastId='';
var RED='#A64B42',RED_BG='#F9ECEA',BLUE='#5B9BB3',BLUE_DARK='#326F87';

function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function currentId(){return String(window.__pstCurrentProjectId||window._curProjId||'');}
function active(){var p=document.getElementById('page-workspace-project');return !!(p&&p.classList.contains('active'));}
function email(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function outgoing(r){return String(r.direction||'').toLowerCase()==='outgoing'||INTERNAL.indexOf(email(r.from_email))>-1;}
function date(v){if(!v)return'—';var d=new Date(v);return isNaN(d.getTime())?String(v):d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'});}
function bounded(p,ms,label){return new Promise(function(resolve,reject){var done=false,t=setTimeout(function(){if(done)return;done=true;reject(new Error((label||'Kërkesa')+' nuk u përgjigj.'));},ms||6500);Promise.resolve(p).then(function(x){if(done)return;done=true;clearTimeout(t);resolve(x);},function(e){if(done)return;done=true;clearTimeout(t);reject(e);});});}
async function q(path){if(typeof window.supaFetch!=='function')throw new Error('Databaza nuk është gati.');return arr(await bounded(window.supaFetch(path),6500,path.split('?')[0]));}
function gmailUrl(r){return r.gmail_url||(window.PSTEmail&&window.PSTEmail.gmailUrl?window.PSTEmail.gmailUrl(r.gmail_thread_id):'https://mail.google.com/mail/#all/'+encodeURIComponent(r.gmail_thread_id||r.gmail_message_id||''));}

function isDocument(r){
 var s=(String(r.subject||'')+' '+String(r.snippet||'')).toLowerCase();
 return r.has_attachments===true||r.has_attachments==='true'||/(document shared with you|shared (a|the) document|google docs|google drive|drive file|\.pdf\b|\.docx?\b|\.xlsx?\b|\.dwg\b|\.zip\b|attachment|anhang|bashk[aë]ngjit)/i.test(s);
}
function kind(r){
 var s=(String(r.subject||'')+' '+String(r.snippet||'')).toLowerCase(),out=outgoing(r);
 if(/document shared with you|shared (a|the) document|google docs|google drive|drive file/.test(s))return'Dokument i ndarë';
 if(/rechnung|invoice|fatur/.test(s))return'Faturë';
 if(/vertrag|contract|kontrat/.test(s))return'Kontratë';
 if(/angebot|offer|quotation|ofert/.test(s))return out?'Oferta jonë':'Ofertë e pranuar';
 return out?'Dokument i dërguar':'Dokument i pranuar';
}
function lossEvidence(rows){
 var text=rows.filter(function(r){return!outgoing(r);}).map(function(r){return String(r.subject||'')+' '+String(r.snippet||'');}).join(' ').toLowerCase();
 return /selbst fertigen|anderweitig vergeben|nicht berücksichtigt|projekt (?:wurde|ist) vergeben|awarded to another|given to another|manufacture it ourselves|do ta prodhojmë vetë|do ta prodhojme vete|e prodhojmë vetë|e prodhojme vete|sami ćemo proizvoditi|dodeljen drugom/.test(text);
}
function addCss(){if(document.getElementById('pst-email-evidence-v2-css'))return;var s=document.createElement('style');s.id='pst-email-evidence-v2-css';s.textContent=`
.pev2-card{margin:0 0 14px;border:1px solid #DCE7EB;border-radius:15px;background:#fff;overflow:hidden;box-shadow:0 3px 14px rgba(36,59,68,.045)}.pev2-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #E8EEF0}.pev2-title{font-size:12px;font-weight:780;color:#29343A}.pev2-sub{font-size:9.5px;color:#849097;margin-top:3px}.pev2-actions{display:flex;gap:7px}.pev2-btn{height:30px;border:1px solid #D7E2E6;border-radius:8px;background:#fff;color:#58656B;padding:0 10px;font-size:9px;font-weight:730;cursor:pointer}.pev2-btn.primary{background:linear-gradient(135deg,#67A8C0,#3F7F98);border-color:transparent;color:#fff}.pev2-body{padding:5px 16px 9px}.pev2-row{display:grid;grid-template-columns:minmax(0,1fr) 130px 100px auto;gap:12px;align-items:center;min-height:54px;padding:9px 0;border-bottom:1px solid #EDF1F2}.pev2-row:last-child{border-bottom:0}.pev2-name{font-size:10.5px;font-weight:730;color:#303B40;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pev2-meta{font-size:8.8px;color:#89949A;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pev2-tag{justify-self:start;border-radius:999px;padding:4px 8px;background:#EEF5F8;color:${BLUE_DARK};font-size:8.2px;font-weight:760}.pev2-date{font-size:9px;color:#6E7A80}.pev2-empty{padding:18px 2px;text-align:center;font-size:10px;color:#89949A}.pev2-lost{margin:0 0 8px;padding:11px 12px;border:1px solid #E4B7B2;border-radius:10px;background:${RED_BG};color:${RED};font-size:10px;line-height:1.5}.pst-ws-project-head.pev2-project-lost{border-color:#E1B3AE!important;background:linear-gradient(180deg,#FFFDFC,#FFF6F5)!important;box-shadow:inset 5px 0 0 ${RED}!important}@media(max-width:850px){.pev2-row{grid-template-columns:minmax(0,1fr) auto}.pev2-tag,.pev2-date{display:none}}
`;document.head.appendChild(s);}
function updateCounts(docCount,fileCount){
 document.querySelectorAll('.pst-ws-smart button').forEach(function(b){var l=b.querySelector('span'),v=b.querySelector('b');if(!l||!v)return;var t=String(l.textContent||'').trim();if(t==='Dokumente')v.textContent=String(Math.max(parseInt(v.textContent,10)||0,docCount));if(t==='Skedarë')v.textContent=String(Math.max(parseInt(v.textContent,10)||0,fileCount));});
 var kpis=document.querySelectorAll('.pfw-kpi');kpis.forEach(function(k){var label=k.querySelector('span'),value=k.querySelector('b');if(label&&value&&String(label.textContent||'').indexOf('Dokumente')>-1)value.textContent=String(Math.max(parseInt(value.textContent,10)||0,docCount));});
}
function applyLost(){
 var h=document.querySelector('.pst-ws-project-head');if(!h)return;h.classList.add('pev2-project-lost');
 var badge=h.querySelector('.pst-ws-status');if(badge){badge.textContent='Humbur';badge.style.setProperty('--c',RED);badge.style.setProperty('--bg',RED_BG);}
 h.querySelectorAll('button').forEach(function(b){if(String(b.textContent||'').trim()==='Mbyll projektin'){b.textContent='Projekt i humbur';b.disabled=true;b.style.color=RED;b.style.borderColor='#E1B3AE';}});
}
async function ensureLost(pid,rows){
 if(!lossEvidence(rows))return false;
 var p=(await q('projects?id=eq.'+enc(pid)+'&select=id,name,status&limit=1'))[0];if(!p)return true;
 var st=String(p.status||'').toLowerCase();
 if(['humbur','closedlost','cancelled'].indexOf(st)<0){
  await window.supaFetch('projects?id=eq.'+enc(pid),'PATCH',{status:'humbur'});
  try{await window.supaFetch('dismissed_items','POST',{item_type:'project_loss',item_ref:'email-evidence-v2:'+pid,project_id:pid,label:p.name||'Projekt',reason:'Emaili i blerësit konfirmon se projekti nuk vazhdon me PRISTEEL.',dismissed_by:'system-email-evidence'});}catch(_e){}
 }
 return true;
}
async function rowsFor(pid){
 var direct=await q('project_emails?project_id=eq.'+enc(pid)+'&select=*&order=sent_at.desc&limit=500'),links=[];
 try{links=await q('project_email_links?project_id=eq.'+enc(pid)+'&select=gmail_message_id&limit=1500');}catch(e){}
 var map={};direct.forEach(function(r){map[r.gmail_message_id||('id:'+r.id)]=r;});
 var ids=links.map(function(x){return x.gmail_message_id;}).filter(Boolean);
 for(var i=0;i<ids.length;i+=35){var vals=ids.slice(i,i+35).map(function(x){return'"'+String(x).replace(/"/g,'')+'"';}).join(',');var more=await q('project_emails?gmail_message_id=in.('+vals+')&select=*&order=sent_at.desc');more.forEach(function(r){map[r.gmail_message_id||('id:'+r.id)]=r;});}
 return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return String(b.sent_at||'').localeCompare(String(a.sent_at||''));});
}
function render(pid,data){
 if(currentId()!==String(pid)||!active())return;addCss();
 var host=document.getElementById('pst-ws-project-tab');if(!host)return;
 var old=document.getElementById('pst-project-gmail-docs');if(old)old.remove();var old2=document.getElementById('pst-project-email-evidence-v2');if(old2)old2.remove();
 if(data.lost)applyLost();
 var docs=data.rows.filter(isDocument),seen={},unique=[];docs.forEach(function(r){var k=String(r.gmail_message_id||r.id||r.subject);if(seen[k])return;seen[k]=1;unique.push(r);});
 var fileCount=unique.filter(function(r){return r.has_attachments===true||r.has_attachments==='true';}).length;
 var body=unique.length?unique.map(function(r){return'<div class="pev2-row"><div><div class="pev2-name">'+esc(r.subject||'(pa subjekt)')+'</div><div class="pev2-meta">'+esc(r.from_name||r.from_email||'')+(r.has_attachments?' · Ka attachment':'')+'</div></div><span class="pev2-tag">'+esc(kind(r))+'</span><span class="pev2-date">'+esc(date(r.sent_at))+'</span><button type="button" class="pev2-btn" onclick="window.open(\''+String(gmailUrl(r)).replace(/'/g,"\\'")+'\',\'PRISTEEL_GMAIL\')">Hap</button></div>';}).join(''):'<div class="pev2-empty">Nuk u gjet dokument ose attachment i lidhur me këtë projekt.</div>';
 var card=document.createElement('section');card.id='pst-project-email-evidence-v2';card.className='pev2-card';card.innerHTML='<div class="pev2-head"><div><div class="pev2-title">Dokumentet e projektit nga Gmail & Drive</div><div class="pev2-sub">Ofertat, dokumentet e ndara dhe emailat me attachment</div></div><div class="pev2-actions">'+(typeof window.pstImportProjectEmailFiles==='function'?'<button type="button" class="pev2-btn primary" onclick="pstImportProjectEmailFiles(\''+esc(pid)+'\')">Importo attachment-et</button>':'')+'</div></div><div class="pev2-body">'+(data.lost?'<div class="pev2-lost"><b>PROJEKT I HUMBUR.</b> Emaili i blerësit konfirmon se projekti nuk vazhdon me PRISTEEL.</div>':'')+body+'</div>';
 host.insertBefore(card,host.firstChild);updateCounts(unique.length,fileCount);
}
async function load(pid,force){
 pid=String(pid||currentId());if(!pid)return;if(running[pid])return running[pid];
 if(!force&&cache[pid]&&Date.now()-cache[pid].at<45000){render(pid,cache[pid]);return cache[pid];}
 running[pid]=(async function(){var rows=await rowsFor(pid),lost=false;try{lost=await ensureLost(pid,rows);}catch(e){console.warn('PRISTEEL email loss evidence:',e);}var data={at:Date.now(),rows:rows,lost:lost};cache[pid]=data;render(pid,data);return data;})().catch(function(e){console.error('PRISTEEL project email evidence:',e);var h=document.getElementById('pst-ws-project-tab');if(h&&currentId()===pid){var x=document.createElement('div');x.id='pst-project-email-evidence-v2';x.className='pev2-lost';x.innerHTML='<b>Dokumentet nga emaili nuk u ngarkuan.</b><br>'+esc(e.message||e);h.insertBefore(x,h.firstChild);}}).finally(function(){delete running[pid];});
 return running[pid];
}
window.pstProjectEmailDocumentsV2Refresh=function(pid){return load(pid||currentId(),true);};

function tick(){
 var id=currentId();if(!active()||!id)return;
 var card=document.getElementById('pst-project-email-evidence-v2');
 if(id!==lastId||!card){lastId=id;setTimeout(function(){load(id,false);},120);}
}
setInterval(tick,850);setTimeout(tick,500);
})();