/* PRISTEEL Gmail live triage v1
 * Extends the existing Gmail Live card; it does not create another Gmail reader.
 * Classifies bounces and cold-outreach replies, keeps Gmail read-only, and stores
 * only explicit human triage decisions in PPPP.
 */
(function(){
'use strict';
if(window.__pstGmailLiveTriageV1)return;
window.__pstGmailLiveTriageV1=true;

var state={busy:false,outreachThreads:new Map(),dismissed:new Set(),waiting:[],seq:0};
function text(v){return String(v==null?'':v).trim();}
function lower(v){return text(v).toLowerCase();}
function esc(v){return text(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c];});}
function email(v){var m=lower(v).match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function emails(v){return lower(v).match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/g)||[];}
function arr(v){return Array.isArray(v)?v:[];}
function uniq(v){var s=new Set();return arr(v).filter(function(x){x=text(x);if(!x||s.has(x))return false;s.add(x);return true;});}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function pad2(v){return String(v).padStart(2,'0');}
function localDay(v){var d=safeDate(v);if(!d)return'';return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function fmt(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function isInternal(e){return /@prissteel\.com$/i.test(email(e));}
function token(){var G=window.PSTGoogleWorkspaceAuth;return G&&G.currentToken?G.currentToken([G.gmailScope]):'';}
function rowById(mid){var G=window.PSTGmailLiveInboxV2,rows=G&&G._state&&G._state.rows||[];return rows.filter(function(r){return text(r.gmail_message_id)===text(mid);})[0]||null;}
function threadKey(r){return text(r&&r.gmail_thread_id);}
function status(msg,bad){var el=document.getElementById('pst-gli-status');if(el){el.textContent=msg||'';el.style.color=bad?'#A33A2E':'#6E7C83';}}
function queryIn(name,values){values=uniq(values);return name+'=in.('+values.map(function(x){return'"'+text(x).replace(/"/g,'')+'"';}).join(',')+')';}
function noteJson(v){try{return JSON.stringify(v);}catch(e){return text(v);}}
function parseNote(v){try{var x=JSON.parse(text(v));return x&&typeof x==='object'?x:{};}catch(e){return{};}}
function domain(e){e=email(e);return e?e.split('@')[1]:'';}
function findAction(mid){return document.querySelector('[data-mid="'+text(mid).replace(/["\\]/g,'')+'"]');}
function classify(r){
  var hay=lower([r&&r.from_email,r&&r.from_name,r&&r.subject,r&&r.snippet].join(' ')),tid=threadKey(r);
  if(state.dismissed.has(text(r&&r.gmail_message_id)))return'dismissed';
  if(/delivery status notification|mail delivery subsystem|mailer-daemon|postmaster|delivery failure|undeliver|unzustell|address not found|message blocked/.test(hay))return'bounce';
  if(/automatic reply|auto reply|autoreply|automatisch antwoord|automatische antwort|out of office|abwesen|vacation reply/.test(hay))return'auto';
  if(tid&&state.outreachThreads.has(tid))return'outreach_reply';
  return'intake';
}
function failedRecipient(r,body){var all=uniq(emails((body||'')+' '+text(r&&r.snippet))),from=email(r&&r.from_email);return all.filter(function(e){return e!==from&&!isInternal(e)&&!/mailer-daemon|postmaster/i.test(e);})[0]||'';}
function firstReplyBlock(body){return text(body).split(/\n(?:From|Von|Od):|\n-{2,}\s*(?:Original Message|Ursprüngliche Nachricht)/i)[0].slice(0,6000);}
function explicitReturnDate(body,sentAt){
  var top=firstReplyBlock(body),signal=/(godišn|odmor|vrat|return|back|urlaub|vacation|leave|odsutan|odsutna)/i.test(top);
  if(!signal)return'';
  var m=top.match(/\b(20\d{2})[-\/.](0?[1-9]|1[0-2])[-\/.]([0-2]?\d|3[01])\b/);
  if(m){var d1=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));if(!isNaN(d1.getTime()))return localDay(d1);}
  m=top.match(/\b([0-2]?\d|3[01])[.\/-](0?[1-9]|1[0-2])(?:[.\/-](20\d{2}))?\.?\b/);
  if(m){var base=safeDate(sentAt)||new Date(),yr=Number(m[3]||base.getFullYear()),d2=new Date(yr,Number(m[2])-1,Number(m[1]));if(!isNaN(d2.getTime())&&d2>=new Date(base.getFullYear()-1,0,1))return localDay(d2);}
  return'';
}
function header(payload,name){var hs=payload&&payload.headers||[],n=lower(name);for(var i=0;i<hs.length;i++)if(lower(hs[i].name)===n)return text(hs[i].value);return'';}
async function fullMessage(r){
  var t=token();if(!t||!window.PSTEmail||!window.PSTEmail.gmail)throw new Error('Gmail nuk është i lidhur.');
  var m=await window.PSTEmail.gmail('/messages/'+encodeURIComponent(r.gmail_message_id)+'?format=full',t),body='';
  if(window.PSTEmailFullBodyV1&&window.PSTEmailFullBodyV1.fullText)body=window.PSTEmailFullBodyV1.fullText(m.payload,m.snippet||r.snippet||'');
  else body=m.snippet||r.snippet||'';
  return{body:body,rfc822_message_id:header(m.payload,'Message-ID'),thread_id:text(m.threadId||r.gmail_thread_id)};
}
async function getOne(path){var x=await window.supaFetch(path);return Array.isArray(x)&&x[0]?x[0]:null;}
async function upsertOutreach(contact,patch){
  contact=email(contact);if(!contact)return null;var current=await getOne('outreach_contacts?select=*&contact_email=eq.'+encodeURIComponent(contact)+'&limit=1');
  patch=Object.assign({company_domain:domain(contact),contact_email:contact,updated_at:new Date().toISOString()},patch||{});
  if(current&&current.id){await window.supaFetch('outreach_contacts?id=eq.'+encodeURIComponent(current.id),'PATCH',patch);return Object.assign({},current,patch);}
  var made=await window.supaFetch('outreach_contacts','POST',patch);return Array.isArray(made)&&made[0]?made[0]:patch;
}
async function dismiss(mid,reason,label){
  mid=text(mid);if(!mid)return;var existing=await getOne('dismissed_items?select=id&item_type=eq.gmail_live&item_ref=eq.'+encodeURIComponent(mid)+'&limit=1');
  if(!existing)await window.supaFetch('dismissed_items','POST',{item_type:'gmail_live',item_ref:mid,project_id:null,label:label||null,reason:reason||'triaged',dismissed_by:null,dismissed_at:new Date().toISOString()});
  state.dismissed.add(mid);var b=findAction(mid),row=b&&b.closest('.pst-ws-action');if(row)row.remove();
}
function outreachContext(r){return state.outreachThreads.get(threadKey(r))||null;}
function originalRecipient(ctx){return email(ctx&&ctx.to_emails&&ctx.to_emails[0]);}
function touchDates(ctx){return uniq(arr(ctx&&ctx.rows).map(function(x){return localDay(x.sent_at);})).slice(0,3);}
function installStyle(){if(document.getElementById('pst-gmail-live-triage-v1-style'))return;var s=document.createElement('style');s.id='pst-gmail-live-triage-v1-style';s.textContent=`
#pst-gmail-live-card .pst-glt-tag{display:inline-flex;align-items:center;margin-left:7px;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:760;vertical-align:1px;background:#EEF5F7;color:#477A90}
#pst-gmail-live-card .pst-glt-tag.bounce{background:rgba(163,58,46,.07);color:#96392F}#pst-gmail-live-card .pst-glt-tag.reply{background:rgba(63,122,78,.08);color:#356741}#pst-gmail-live-card .pst-glt-tag.auto{background:#F4F5F5;color:#6F797D}
#pst-glt-modal-bg{position:fixed;inset:0;z-index:2147482400;background:rgba(25,35,40,.35);display:flex;align-items:center;justify-content:center;padding:18px}#pst-glt-modal{width:min(520px,96vw);background:#fff;border:1px solid #DDE7EB;border-radius:14px;box-shadow:0 20px 55px rgba(35,60,72,.18);overflow:hidden}#pst-glt-modal .hd{padding:16px 18px;border-bottom:1px solid #E7EEF1;display:flex;justify-content:space-between;gap:12px}#pst-glt-modal .title{font-size:15px;font-weight:780;color:#30383D}#pst-glt-modal .sub{font-size:10.5px;color:#7D898F;margin-top:3px}#pst-glt-modal .bd{padding:16px 18px}#pst-glt-modal .note{padding:10px 11px;border-radius:9px;background:#F6F9FA;font-size:10.5px;color:#64747B;line-height:1.45;margin-bottom:12px}#pst-glt-modal label{display:block;font-size:10px;font-weight:720;color:#59676E;margin-bottom:5px}#pst-glt-modal input{width:100%;height:36px;border:1px solid #DDE7EB;border-radius:9px;padding:0 9px}#pst-glt-modal .ft{padding:12px 18px;border-top:1px solid #E7EEF1;display:flex;justify-content:flex-end;gap:8px}#pst-glt-modal button{height:34px;padding:0 11px;border:1px solid #D6E1E5;border-radius:9px;background:#fff;font-size:10.5px;font-weight:740;cursor:pointer}#pst-glt-modal button.primary{background:#3F7F98;color:#fff;border-color:#3F7F98}
#pst-glt-waiting{margin:7px 0 12px;padding:10px 11px;border:1px solid #D9E6EA;border-radius:10px;background:#FAFCFD}#pst-glt-waiting .cap{font-size:9px;font-weight:800;letter-spacing:.45px;text-transform:uppercase;color:#708087;margin-bottom:7px}.pst-glt-waitrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #E8EFF2}.pst-glt-waitrow:first-of-type{border-top:0}.pst-glt-waitname{font-size:10.5px;font-weight:760;color:#334047}.pst-glt-waitmeta{font-size:9px;color:#7C898F;margin-top:2px}.pst-glt-waitctrl{display:flex;gap:6px;align-items:center}.pst-glt-waitctrl input{height:29px;border:1px solid #DDE7EB;border-radius:8px;padding:0 6px;font-size:9.5px}.pst-glt-waitctrl button{height:29px;border:1px solid #C9DCE4;border-radius:8px;background:#fff;color:#3F7F98;font-size:9.5px;font-weight:760;padding:0 8px;cursor:pointer}
`;(document.head||document.documentElement).appendChild(s);}
function restoreHeadings(){
  var live=document.getElementById('pst-gmail-live-card');if(live){var lt=live.querySelector('.pst-ws-card-title'),ls=live.querySelector('.pst-ws-card-sub');if(lt)lt.textContent='Gmail live';if(ls)ls.textContent='Emailat e rinj · klasifikohen para se të hyjnë në projekt ose follow-up';}
  var cards=document.querySelectorAll('#page-workspace-inbox .pst-ws-two > .pst-ws-card');if(cards[0]){var a=cards[0].querySelector('.pst-ws-card-title'),b=cards[0].querySelector('.pst-ws-card-sub');if(a)a.textContent='Follow-up për kontakte';if(b)b.textContent='Cold outreach pa përgjigje dhe përgjigje që kërkojnë ndjekje';}if(cards[1]){var c=cards[1].querySelector('.pst-ws-card-title');if(c)c.textContent='Kërkesa pa projekt';}
}
async function loadContext(rows,seq){
  rows=arr(rows);var tids=uniq(rows.map(threadKey).filter(Boolean)),mids=uniq(rows.map(function(r){return text(r.gmail_message_id);}).filter(Boolean)),out=[],dis=[];
  if(tids.length)try{out=await window.supaFetch('project_emails?select=gmail_message_id,gmail_thread_id,to_emails,subject,sent_at,direction,project_id&direction=eq.outgoing&project_id=is.null&'+queryIn('gmail_thread_id',tids)+'&order=sent_at.asc&limit=500');}catch(e){}
  if(mids.length)try{dis=await window.supaFetch('dismissed_items?select=item_ref,reason&item_type=eq.gmail_live&'+queryIn('item_ref',mids)+'&limit=200');}catch(e){}
  if(seq!==state.seq)return;state.dismissed=new Set(arr(dis).map(function(x){return text(x.item_ref);}));var map=new Map();arr(out).forEach(function(x){var t=threadKey(x);if(!t)return;if(!map.has(t))map.set(t,{rows:[],to_emails:[]});var g=map.get(t);g.rows.push(x);g.to_emails=uniq(g.to_emails.concat(arr(x.to_emails)));});state.outreachThreads=map;
}
function applyRows(){
  restoreHeadings();var G=window.PSTGmailLiveInboxV2,rows=G&&G._state&&G._state.rows||[];
  rows.forEach(function(r){var mid=text(r.gmail_message_id),btn=findAction(mid),row=btn&&btn.closest('.pst-ws-action');if(!row)return;var kind=classify(r);if(kind==='dismissed'){row.remove();return;}var title=row.querySelector('.pst-ws-action-title');if(title){var old=title.querySelector('.pst-glt-tag');if(old)old.remove();if(kind!=='intake'){var tag=document.createElement('span');tag.className='pst-glt-tag '+(kind==='outreach_reply'?'reply':kind);tag.textContent=kind==='bounce'?'Bounce':kind==='outreach_reply'?'Përgjigje outreach':'Auto-reply';title.appendChild(tag);}}
    if(kind==='bounce'){btn.textContent='Hiqe nga PPPP';btn.onclick=function(){window.PSTGmailLiveTriageV1.dismissBounce(mid,this);};}
    else if(kind==='outreach_reply'){btn.textContent='Ruaj follow-up';btn.onclick=function(){window.PSTGmailLiveTriageV1.followup(mid,this);};}
    else if(kind==='auto'){btn.textContent='Shqyrto';btn.onclick=function(){if(r.gmail_url)window.open(r.gmail_url,'PRISTEEL_GMAIL');};}
  });
}
async function injectWaiting(){
  var root=document.getElementById('pst-ws-inbox-emails');if(!root)return;var old=document.getElementById('pst-glt-waiting');if(old)old.remove();var rows=[];try{rows=await window.supaFetch('outreach_contacts?select=id,contact_email,company_domain,status,follow_up_date,notes,updated_at&status=eq.Waiting&closed=eq.false&follow_up_date=is.null&order=updated_at.desc&limit=100');}catch(e){return;}state.waiting=arr(rows);if(!state.waiting.length)return;
  state.waiting.forEach(function(x){var candidates=root.querySelectorAll('.pst-ofu-row');candidates.forEach(function(r){if(lower(r.textContent).indexOf(lower(x.contact_email))>-1)r.style.display='none';});});
  var box=document.createElement('div');box.id='pst-glt-waiting';box.innerHTML='<div class="cap">Përgjigje të ruajtura · kërkojnë datë</div>'+state.waiting.map(function(x){var n=parseNote(x.notes),who=text(n.responder_name||n.responder_email||'Përgjigje e marrë');return'<div class="pst-glt-waitrow"><div><div class="pst-glt-waitname">'+esc(x.company_domain||x.contact_email)+'</div><div class="pst-glt-waitmeta">'+esc(who)+' · '+esc(n.reply_subject||'')+' · Data e kthimit nuk u dha</div></div><div class="pst-glt-waitctrl"><input type="date" id="pst-glt-date-'+x.id+'"><button onclick="PSTGmailLiveTriageV1.saveDate('+Number(x.id)+')">Ruaj datën</button></div></div>';}).join('');
  var toolbar=root.querySelector('.pst-ofu-toolbar');if(toolbar&&toolbar.nextSibling)root.insertBefore(box,toolbar.nextSibling);else root.insertBefore(box,root.firstChild);
}
async function refresh(){if(state.busy)return;var G=window.PSTGmailLiveInboxV2,rows=G&&G._state&&G._state.rows||[];if(!rows.length){restoreHeadings();await injectWaiting();return;}state.busy=true;var seq=++state.seq;try{await loadContext(rows,seq);if(seq!==state.seq)return;applyRows();await injectWaiting();}finally{if(seq===state.seq)state.busy=false;}}
function schedule(){[120,900,2400,4800,8000].forEach(function(ms){setTimeout(function(){refresh().catch(function(e){console.warn('Gmail triage:',e);});},ms);});}
async function openFollowup(r){
  var ctx=outreachContext(r);if(!ctx)throw new Error('Thread-i nuk u gjet në historikun e cold outreach.');var full=await fullMessage(r),suggested=explicitReturnDate(full.body,r.sent_at),recipient=originalRecipient(ctx);if(!recipient)throw new Error('Nuk u gjet marrësi i emailit fillestar.');var old=document.getElementById('pst-glt-modal-bg');if(old)old.remove();var bg=document.createElement('div');bg.id='pst-glt-modal-bg';bg.innerHTML='<div id="pst-glt-modal"><div class="hd"><div><div class="title">Ruaj për follow-up</div><div class="sub">'+esc(r.from_name||r.from_email)+' · '+esc(r.subject||'')+'</div></div><button onclick="document.getElementById(\'pst-glt-modal-bg\').remove()">×</button></div><div class="bd"><div class="note">'+(suggested?'U gjet një datë konkrete në përgjigje. Kontrolloje para ruajtjes.':'Data e kthimit nuk u dha në këtë email. Mund ta ruash pa datë dhe ta vendosësh më vonë.')+'</div><label>Data e follow-up</label><input id="pst-glt-follow-date" type="date" value="'+esc(suggested)+'"><input id="pst-glt-follow-mid" type="hidden" value="'+esc(r.gmail_message_id)+'"></div><div class="ft"><button onclick="document.getElementById(\'pst-glt-modal-bg\').remove()">Anulo</button><button class="primary" onclick="PSTGmailLiveTriageV1.confirmFollowup()">Ruaj në pritje</button></div></div>';document.body.appendChild(bg);bg.__pstFull=full;bg.__pstCtx=ctx;bg.__pstRow=r;
}
window.PSTGmailLiveTriageV1={
  refresh:refresh,
  dismissBounce:async function(mid,btn){var r=rowById(mid);if(!r)return;var old=btn&&btn.textContent;if(btn){btn.disabled=true;btn.textContent='Duke hequr…';}try{var full=null,failed=failedRecipient(r,'');if(!failed){full=await fullMessage(r);failed=failedRecipient(r,full.body);}if(failed)await upsertOutreach(failed,{status:'Bounced',bounced:true,replied:false,meeting:false,closed:true,follow_up_date:null,notes:noteJson({type:'delivery_failure',gmail_message_id:r.gmail_message_id,gmail_thread_id:r.gmail_thread_id,subject:r.subject,failed_recipient:failed}),updated_at:new Date().toISOString()});await dismiss(mid,'delivery_failure',r.subject);status('Bounce u hoq nga PPPP'+(failed?' · '+failed+' u shënua si adresë e dështuar':'')+'. Gmail mbeti i paprekur.');}catch(e){if(btn){btn.disabled=false;btn.textContent=old||'Hiqe nga PPPP';}status(e.message||String(e),true);}},
  followup:async function(mid,btn){var r=rowById(mid);if(!r)return;var old=btn&&btn.textContent;if(btn){btn.disabled=true;btn.textContent='Duke lexuar…';}try{await openFollowup(r);}catch(e){status(e.message||String(e),true);}finally{if(btn){btn.disabled=false;btn.textContent=old||'Ruaj follow-up';}}},
  confirmFollowup:async function(){var bg=document.getElementById('pst-glt-modal-bg');if(!bg)return;var r=bg.__pstRow,ctx=bg.__pstCtx,full=bg.__pstFull||{},date=text((document.getElementById('pst-glt-follow-date')||{}).value),recipient=originalRecipient(ctx),touch=touchDates(ctx),note={type:'waiting_reply',reply_message_id:r.gmail_message_id,reply_thread_id:r.gmail_thread_id,rfc822_message_id:full.rfc822_message_id||null,reply_subject:r.subject||'',responder_email:r.from_email||'',responder_name:r.from_name||'',original_recipient:recipient,explicit_return_date:date||null};try{await upsertOutreach(recipient,{status:'Waiting',bounced:false,replied:false,meeting:false,closed:false,follow_up_date:date||null,touch_1:touch[0]||null,touch_2:touch[1]||null,touch_3:touch[2]||null,notes:noteJson(note)});await dismiss(r.gmail_message_id,'outreach_followup',r.subject);bg.remove();status(date?'Përgjigja u ruajt për follow-up më '+fmt(date)+'.':'Përgjigja u ruajt në pritje. Data duhet vendosur.');if(window.PSTOutreachFollowupV1&&window.PSTOutreachFollowupV1.refresh)window.PSTOutreachFollowupV1.refresh();schedule();}catch(e){status(e.message||String(e),true);}},
  saveDate:async function(id){var input=document.getElementById('pst-glt-date-'+id),date=text(input&&input.value);if(!date){alert('Zgjidh datën e follow-up.');return;}try{await window.supaFetch('outreach_contacts?id=eq.'+encodeURIComponent(id),'PATCH',{follow_up_date:date,updated_at:new Date().toISOString()});if(window.PSTOutreachFollowupV1&&window.PSTOutreachFollowupV1.refresh)window.PSTOutreachFollowupV1.refresh();schedule();}catch(e){status(e.message||String(e),true);}}
};

function bind(){
  installStyle();restoreHeadings();var page=document.getElementById('page-workspace-inbox');if(page&&page.classList.contains('active'))schedule();
  document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;if(t.closest('#pst-gli-refresh,#pst-gli-search,#pst-gli-auth'))schedule();},true);
  document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target&&e.target.id==='pst-gli-query')schedule();},true);
  var original=window.pstWorkspaceGo;if(typeof original==='function'&&!original.__pstGmailTriageWrapped){var wrapped=function(key){var out=original.apply(this,arguments);if(key==='inbox')schedule();return out;};wrapped.__pstGmailTriageWrapped=true;window.pstWorkspaceGo=wrapped;}
}
installStyle();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
document.addEventListener('pst:modules-ready',function(){restoreHeadings();schedule();},{once:true});
})();
