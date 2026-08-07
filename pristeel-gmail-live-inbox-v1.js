/* PRISTEEL Gmail Live Inbox v1
 * Makes Gmail a real project-intake entry inside the workspace Inbox.
 * Read-only until the user explicitly starts Gmail intake.
 * No observers, polling or automatic OAuth popups.
 */
(function(){
'use strict';
if(window.__pstGmailLiveInboxV1)return;
window.__pstGmailLiveInboxV1=true;

var state={busy:false,rows:[],query:''};
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function short(v,n){v=String(v||'').replace(/\s+/g,' ').trim();return v.length>n?v.slice(0,n-1)+'…':v;}
function date(v){try{return new Date(v).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return'';}}
function token(){var G=window.PSTGoogleWorkspaceAuth;return G&&G.currentToken?G.currentToken([G.gmailScope]):'';}
function gmail(path,t){if(window.PSTEmail&&window.PSTEmail.gmail)return window.PSTEmail.gmail(path,t);return Promise.reject(new Error('Gmail core nuk është gati.'));}
function message(id,t){if(window.PSTEmail&&window.PSTEmail.message)return window.PSTEmail.message(id,t);return Promise.reject(new Error('Gmail core nuk është gati.'));}
function setStatus(text,bad){var e=document.getElementById('pst-gli-status');if(!e)return;e.textContent=text||'';e.style.color=bad?'#A64B42':'#6E7C83';}
function navLabel(){var b=document.querySelector('.pst-ws-navbtn[data-key="inbox"] span');if(b)b.textContent='Gmail / Inbox';}
function shell(){
  navLabel();
  var page=document.getElementById('page-workspace-inbox');
  if(!page||page.style.display==='none'||!page.classList.contains('active'))return null;
  var host=page.querySelector('.pst-ws-page');if(!host)return null;
  var old=document.getElementById('pst-gmail-live-card');if(old)return old;
  var head=host.querySelector('.pst-ws-head');
  var card=document.createElement('section');card.id='pst-gmail-live-card';card.className='pst-ws-card';
  card.style.marginBottom='14px';
  card.innerHTML='<div class="pst-ws-card-hd"><div><div class="pst-ws-card-title">Gmail live</div><div class="pst-ws-card-sub">Zgjidh një email real dhe nis projektin prej thread-it të tij</div></div><div style="display:flex;gap:7px;align-items:center"><button class="pst-ws-btn" id="pst-gli-auth" onclick="pstGmailLiveAuthorize()">Lidhu me Gmail</button><button class="pst-ws-btn" onclick="pstGmailLiveLoad(true)">Rifresko</button></div></div>'+
    '<div class="pst-ws-card-body"><div class="pst-ws-toolbar" style="padding:0 0 10px"><input class="pst-ws-input" id="pst-gli-query" placeholder="Kërko në Gmail: kompani, projekt, subjekt…" onkeydown="if(event.key===\'Enter\')pstGmailLiveLoad(true)"><button class="pst-ws-btn primary" onclick="pstGmailLiveLoad(true)">Kërko</button></div><div id="pst-gli-status" style="font-size:10px;color:#6E7C83;margin-bottom:8px"></div><div id="pst-gli-list"><div class="pst-ws-empty">Gmail po kontrollohet…</div></div></div>';
  if(head&&head.nextSibling)host.insertBefore(card,head.nextSibling);else host.insertBefore(card,host.firstChild);
  updateAuth();
  return card;
}
function updateAuth(){var b=document.getElementById('pst-gli-auth'),t=token();if(!b)return;b.textContent=t?'Gmail i lidhur':'Lidhu me Gmail';b.disabled=!!t;}
function render(){var h=document.getElementById('pst-gli-list');if(!h)return;if(!state.rows.length){h.innerHTML='<div class="pst-ws-empty">Nuk u gjet asnjë email.</div>';return;}h.innerHTML=state.rows.map(function(r){return'<div class="pst-ws-action" style="align-items:center"><i class="pst-ws-action-dot" style="--c:#3F7F98;--bg:#EAF4F7"></i><div class="pst-ws-action-main"><div class="pst-ws-action-title">'+esc(r.subject||'(pa subjekt)')+'</div><div class="pst-ws-action-meta">'+esc(r.from_name||r.from_email||'')+' · '+date(r.sent_at)+(r.has_attachments?' · Ka bashkëngjitje':'')+'</div><div class="pst-ws-action-meta" style="margin-top:2px">'+esc(short(r.snippet,145))+'</div></div><div style="display:flex;gap:5px;flex-shrink:0"><button class="pst-ws-rowaction" onclick="window.open(\''+esc(r.gmail_url||'')+'\',\'PRISTEEL_GMAIL\')">Hap Gmail</button><button class="pst-ws-rowaction" style="background:#3F7F98;color:#fff;border-color:#3F7F98" onclick="pstGmailLiveIntake(\''+esc(r.gmail_message_id)+'\',\''+esc(r.gmail_thread_id)+'\')">Krijo / Lidhe projektin</button></div></div>';}).join('');}
async function load(interactive){
  if(state.busy)return;shell();var t=token();
  if(!t){updateAuth();setStatus('Kliko “Lidhu me Gmail” për të lexuar inbox-in real.',false);var h=document.getElementById('pst-gli-list');if(h)h.innerHTML='<div class="pst-ws-empty">Gmail nuk është autorizuar në këtë sesion.</div>';return;}
  state.busy=true;setStatus('Duke lexuar Gmail…');var h=document.getElementById('pst-gli-list');if(h)h.innerHTML='<div class="pst-ws-empty">Duke ngarkuar emailat…</div>';
  try{
    var q=String((document.getElementById('pst-gli-query')||{}).value||'').trim();state.query=q;
    var path='/messages?labelIds=INBOX&maxResults=35'+(q?'&q='+enc(q):'');
    var list=await gmail(path,t),ids=(list.messages||[]).map(function(x){return x.id;});
    var rows=[];for(var i=0;i<ids.length;i+=6){var batch=ids.slice(i,i+6);var got=await Promise.all(batch.map(function(id){return message(id,t).catch(function(){return null;});}));rows=rows.concat(got.filter(Boolean));}
    var seen={};state.rows=rows.filter(function(r){var k=String(r.gmail_thread_id||r.gmail_message_id||'');if(!k||seen[k])return false;seen[k]=1;return true;}).slice(0,25);
    render();setStatus(state.rows.length+' thread-e nga Gmail'+(q?' për kërkimin “'+q+'”':'')+'.');
  }catch(e){setStatus((e&&e.message)||String(e),true);if(h)h.innerHTML='<div class="pst-ws-empty">Gmail nuk u ngarkua.</div>';}
  state.busy=false;updateAuth();
}
window.pstGmailLiveAuthorize=async function(){var G=window.PSTGoogleWorkspaceAuth;if(!G||!G.getGmailToken){setStatus('Moduli i autorizimit Gmail nuk është gati.',true);return;}try{setStatus('Po hap autorizimin Google…');await G.getGmailToken({interactive:true});updateAuth();await load(true);}catch(e){setStatus((e&&e.message)||String(e),true);}};
window.pstGmailLiveLoad=load;
window.pstGmailLiveIntake=function(mid,tid){var r=state.rows.filter(function(x){return String(x.gmail_message_id)===String(mid);})[0]||{};try{var u=new URL(location.href);u.searchParams.set('gmail_intake','1');u.searchParams.set('gmail_message_id',mid);u.searchParams.set('gmail_thread_id',tid||r.gmail_thread_id||'');u.searchParams.set('subject',r.subject||'');u.searchParams.set('from',r.from_email||'');var target=u.href;if(window.PSTGmailIntakeV2&&window.PSTGmailIntakeV2.open)return window.PSTGmailIntakeV2.open(target);if(window.PSTGmailHandoffV4&&window.PSTGmailHandoffV4.openTarget)return window.PSTGmailHandoffV4.openTarget(target);location.href=target;}catch(e){setStatus((e&&e.message)||String(e),true);}};
function decorate(){var c=shell();if(c)load(false);}
var original=window.pstWorkspaceGo;if(typeof original==='function'&&!original.__pstGmailLiveWrapped){var wrapped=function(key){var out=original.apply(this,arguments);if(key==='inbox')setTimeout(decorate,0);return out;};wrapped.__pstGmailLiveWrapped=true;window.pstWorkspaceGo=wrapped;}
document.addEventListener('pst:modules-ready',function(){setTimeout(function(){navLabel();var p=document.getElementById('page-workspace-inbox');if(p&&p.classList.contains('active'))decorate();},60);},{once:true});
window.PSTGmailLiveInboxV1={decorate:decorate,load:load};
navLabel();
})();
