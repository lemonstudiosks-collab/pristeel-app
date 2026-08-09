/* PRISTEEL project email full-body sync v1
 * Hydrates already-linked project emails from Gmail without changing relations.
 * No OAuth popup: sync runs only when an existing Gmail token is available.
 */
(function(){
'use strict';
if(window.__pstProjectEmailBodySyncV1)return;
window.__pstProjectEmailBodySyncV1=true;

var state={busy:false,done:{},seq:0};
function A(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function current(){return window.__pstIntegrityLastData||null;}
function activeCommunication(){var b=document.querySelector('[data-pf2-tab="communication"].on');return !!b;}
function gmailToken(){
  var G=window.PSTGoogleWorkspaceAuth;
  if(!G||typeof G.currentToken!=='function')return'';
  try{return G.currentToken([G.gmailScope])||'';}catch(e){return'';}
}
function fullText(payload,fallback){
  var F=window.PSTEmailFullBodyV1;
  if(F&&typeof F.fullText==='function')return F.fullText(payload,fallback||'');
  return String(fallback||'');
}
function setHeaderStatus(text){
  if(!activeCommunication())return;
  var card=[].slice.call(document.querySelectorAll('#page-workspace-project .pf2-card')).filter(function(c){
    var b=c.querySelector('header b');return b&&String(b.textContent||'').trim()==='Emailat e projektit';
  })[0];
  var s=card&&card.querySelector('header span');
  if(s&&text)s.textContent=text;
}
function css(){
  if(document.getElementById('pst-project-email-body-sync-css'))return;
  var s=document.createElement('style');s.id='pst-project-email-body-sync-css';
  s.textContent='.pst-mail-expand{margin-top:6px;border:1px solid #D8E5E9;background:#fff;color:#3F7F98;border-radius:7px;padding:5px 8px;font-size:8px;font-weight:740;cursor:pointer}.pst-mail-full{margin-top:7px;padding:9px 10px;border-radius:8px;background:#F8FAFB;color:#586970;font-size:8.8px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;max-height:480px;overflow:auto}.pst-mail-full[hidden]{display:none!important}';
  document.head.appendChild(s);
}
function displayText(m){return String(m&&(m.body_text||m.body||m.text||m.snippet)||'').trim();}
function enhanceDisplay(){
  css();
  if(!activeCommunication())return false;
  var d=current(),mails=A(d&&d.emails),articles=[].slice.call(document.querySelectorAll('#page-workspace-project .pf2-mail'));
  articles.forEach(function(article,i){
    if(article.querySelector('[data-pst-mail-expand]'))return;
    var txt=displayText(mails[i]);
    if(!txt)return;
    var p=article.querySelector('p');
    if(p)p.textContent=txt.replace(/\s+/g,' ').slice(0,900)+(txt.length>900?'…':'');
    if(txt.length<=900)return;
    var btn=document.createElement('button');btn.type='button';btn.className='pst-mail-expand';btn.setAttribute('data-pst-mail-expand','1');btn.textContent='Shfaq emailin e plotë';
    var full=document.createElement('div');full.className='pst-mail-full';full.hidden=true;full.textContent=txt;
    btn.onclick=function(){full.hidden=!full.hidden;btn.textContent=full.hidden?'Shfaq emailin e plotë':'Mbyll emailin e plotë';};
    article.appendChild(btn);article.appendChild(full);
  });
  return true;
}
async function patchMessage(row,text){
  if(!row||!row.gmail_message_id||!text||typeof window.supaFetch!=='function')return false;
  if(String(row.snippet||'')===String(text))return false;
  await window.supaFetch('project_emails?gmail_message_id=eq.'+enc(row.gmail_message_id),'PATCH',{snippet:text,updated_at:new Date().toISOString()});
  row.snippet=text;
  return true;
}
async function sync(force){
  var d=current(),p=d&&d.project,id=String(p&&p.id||'');
  if(!id||state.busy){enhanceDisplay();return false;}
  var token=gmailToken(),E=window.PSTEmail;
  if(!token||!E||typeof E.gmail!=='function'){enhanceDisplay();return false;}
  var mails=A(d.emails).filter(function(m){var mid=String(m&&m.gmail_message_id||'');return !!mid&&(force||!state.done[mid]);}).slice(0,80);
  if(!mails.length){enhanceDisplay();if(activeCommunication())setHeaderStatus(A(d.emails).length+' emaila · teksti i sinkronizuar');return false;}
  state.busy=true;var my=++state.seq,changed=0;
  if(activeCommunication())setHeaderStatus(A(d.emails).length+' emaila · duke sinkronizuar tekstin…');
  try{
    for(var i=0;i<mails.length;i++){
      if(my!==state.seq)break;
      var mid=String(mails[i].gmail_message_id||'');
      try{
        var gm=await E.gmail('/messages/'+enc(mid)+'?format=full',token);
        var txt=fullText(gm&&gm.payload,gm&&gm.snippet||mails[i].snippet||'');
        if(txt&&await patchMessage(mails[i],txt))changed++;
        state.done[mid]=true;
      }catch(e){if(window.console&&console.debug)console.debug('PRISTEEL email body sync skipped:',mid,e&&e.message);}
    }
    if(changed&&window.PSTProjectDataIntegrity&&typeof window.PSTProjectDataIntegrity.load==='function'){
      try{var fresh=await window.PSTProjectDataIntegrity.load(id);window.__pstIntegrityLastData=fresh;}catch(e){}
    }
    if(activeCommunication()&&window.PSTProjectFirstV2&&typeof window.PSTProjectFirstV2.render==='function')window.PSTProjectFirstV2.render('communication');
    setTimeout(enhanceDisplay,20);
    if(activeCommunication()){var now=current();setHeaderStatus(A(now&&now.emails).length+' emaila · teksti i sinkronizuar');}
    return true;
  }finally{state.busy=false;}
}
function schedule(force){[30,160,450].forEach(function(ms){setTimeout(function(){if(activeCommunication())sync(!!force);else enhanceDisplay();},ms);});}
document.addEventListener('click',function(e){
  var tab=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="communication"]');
  if(tab)schedule(false);
},true);
document.addEventListener('pst:modules-ready',function(){schedule(false);},{once:true});
window.addEventListener('pageshow',function(){schedule(false);},{once:true});
window.PSTProjectEmailBodySyncV1={sync:sync,enhanceDisplay:enhanceDisplay,_test:{displayText:displayText,activeCommunication:activeCommunication}};
})();