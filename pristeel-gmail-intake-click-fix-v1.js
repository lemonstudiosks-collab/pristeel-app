/* PRISTEEL Gmail intake click fix v1
 * Gives the Gmail live Inbox one deterministic click path into project intake.
 */
(function(){
'use strict';
if(window.__pstGmailIntakeClickFixV1)return;
window.__pstGmailIntakeClickFixV1=true;

function setStatus(text,bad){
  var e=document.getElementById('pst-gli-status');
  if(e){e.textContent=text||'';e.style.color=bad?'#8A5A52':'#3F7F98';}
}
function targetFromButton(btn){
  var mid=String(btn&&btn.getAttribute('data-mid')||'').trim();
  var tid=String(btn&&btn.getAttribute('data-tid')||'').trim();
  if(!mid)return'';
  var u=new URL(location.href);
  u.searchParams.set('gmail_intake','1');
  u.searchParams.set('gmail_message_id',mid);
  if(tid)u.searchParams.set('gmail_thread_id',tid);else u.searchParams.delete('gmail_thread_id');
  return u.href;
}
function launch(btn){
  var target=targetFromButton(btn);
  if(!target){setStatus('Emaili nuk ka Gmail message ID. Rifresko listën dhe provo përsëri.',true);return false;}
  setStatus('Duke hapur thread-in për lidhje me projektin…');
  btn.disabled=true;
  var old=btn.textContent;
  btn.textContent='Duke hapur…';
  try{
    if(window.PSTGmailHandoffV4&&typeof window.PSTGmailHandoffV4.openTarget==='function'){
      var ok=window.PSTGmailHandoffV4.openTarget(target);
      if(ok)return true;
    }
    try{
      var u=new URL(target);
      history.replaceState({},'',u.pathname+u.search+u.hash);
    }catch(e){}
    if(window.PSTGmailIntakeV3&&typeof window.PSTGmailIntakeV3.open==='function'){
      window.PSTGmailIntakeV3.open(target);
      return true;
    }
    if(window.PSTGmailIntakeV2&&typeof window.PSTGmailIntakeV2.open==='function'){
      window.PSTGmailIntakeV2.open(target);
      return true;
    }
    location.href=target;
    return true;
  }catch(e){
    setStatus((e&&e.message)||String(e),true);
    btn.disabled=false;
    btn.textContent=old;
    return false;
  }
}

document.addEventListener('click',function(ev){
  var btn=ev.target&&ev.target.closest&&ev.target.closest('.pst-gli-intake');
  if(!btn)return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
  launch(btn);
},true);

window.PSTGmailIntakeClickFixV1={launch:launch};
})();
