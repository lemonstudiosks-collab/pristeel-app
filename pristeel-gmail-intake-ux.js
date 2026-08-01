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

  if(createBtn){
    createBtn.disabled=true;
    createBtn.textContent=/projekti u krijua/i.test(text)?'U krijua ✓':'U përfundua ✓';
    createBtn.setAttribute('aria-busy','false');
    createBtn.style.background='var(--green,#3F7A4E)';
    createBtn.style.borderColor='var(--green,#3F7A4E)';
    createBtn.style.color='#fff'
  }
  if(linkBtn)linkBtn.disabled=true;

  var openBtn=Array.prototype.slice.call(document.querySelectorAll('.pgi-ft button')).filter(function(btn){
    return /hap projektin/i.test(btn.textContent||'')
  })[0];
  if(openBtn){
    openBtn.disabled=false;
    openBtn.style.boxShadow='0 0 0 3px rgba(72,151,184,.16)'
  }
}
function init(){
  updateState();
  var observer=new MutationObserver(updateState);
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  setInterval(updateState,1000)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()
})();
