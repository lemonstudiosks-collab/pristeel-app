/* PRISTEEL Gmail intake: përfundimi i procesit duhet të duket qartë */
(function(){
'use strict';
if(window.__pstGmailIntakeUxLoaded)return;
window.__pstGmailIntakeUxLoaded=true;

function updateState(){
  var status=document.getElementById('pgi-status');
  if(!status)return;
  var text=String(status.textContent||'');
  var createBtn=document.getElementById('pgi-create');
  var linkBtn=document.getElementById('pgi-link-existing');
  var success=/projekti u krijua|emaili u lidh/i.test(text);
  if(!success)return;

  /*
    MutationObserver-i më poshtë dëgjon ndryshimet e tekstit. Pa këtë mbrojtje,
    vendosja e përsëritur e textContent krijonte një cikël pa fund sapo procesi
    përfundonte me sukses dhe Chrome e shfaqte faqen si "Page Unresponsive".
  */
  if(status.dataset.pstUxCompleted==='1')return;
  status.dataset.pstUxCompleted='1';

  if(createBtn){
    createBtn.disabled=true;
    var completedLabel=/projekti u krijua/i.test(text)?'U krijua ✓':'U përfundua ✓';
    if(createBtn.textContent!==completedLabel)createBtn.textContent=completedLabel;
    createBtn.setAttribute('aria-busy','false');
    createBtn.style.background='var(--green,#3F7A4E)';
    createBtn.style.borderColor='var(--green,#3F7A4E)';
    createBtn.style.color='#fff';
  }
  if(linkBtn)linkBtn.disabled=true;

  var openBtn=Array.prototype.slice.call(document.querySelectorAll('.pgi-ft button')).filter(function(btn){
    return /hap projektin/i.test(btn.textContent||'');
  })[0];
  if(openBtn){
    openBtn.disabled=false;
    openBtn.style.boxShadow='0 0 0 3px rgba(72,151,184,.16)';
  }
}
function init(){
  updateState();
  var observer=new MutationObserver(updateState);
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  setInterval(updateState,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
