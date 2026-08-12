/* PRISTEEL Gmail intake safety helpers
 * - Zgjedh vetem revisionin me te ri.
 * - Kur mungon tokeni, shfaq autorizim te nisur nga klikimi qe Chrome te mos bllokoje pop-up-in.
 * - Ngarkon project-identity guard pas intake-it per te bllokuar company-only matching.
 * No MutationObserver or interval.
 */
(function(){
'use strict';
if(window.__pstGmailIntakeRevisionFixV1)return;
window.__pstGmailIntakeRevisionFixV1=true;

function base(name){
  return String(name||'').toLowerCase()
    .replace(/\.[^.]+$/,'')
    .replace(/(?:^|[._ -])(signed|finale?|approved|draft|preliminary)(?=$|[._ -])/g,' ')
    .replace(/(?:^|[._ -])rev(?:ision)?[._ -]*\d+(?:[._-]\d+)?/g,' ')
    .replace(/(?:^|[._ -])ver(?:sion)?[._ -]*\d+(?:[._-]\d+)?/g,' ')
    .replace(/(?:^|[._ -])\d{1,2}[._-]\d{1,2}[._-]20\d{2}(?=$|[._ -])/g,' ')
    .replace(/[^a-z0-9à-ž]+/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function rank(name){
  var n=String(name||'').toLowerCase(),score=0;
  var r=n.match(/rev(?:ision)?[._ -]*(\d+(?:[._-]\d+)?)/);if(r)score+=parseFloat(r[1].replace('_','.'))*100;
  var v=n.match(/ver(?:sion)?[._ -]*(\d+(?:[._-]\d+)?)/);if(v)score+=parseFloat(v[1].replace('_','.'))*80;
  if(/signed|approved/.test(n))score+=10000;
  if(/final/.test(n))score+=5000;
  if(/draft|preliminary/.test(n))score-=2000;
  return score;
}
function normalize(root){
  root=root||document.getElementById('pgi2-bg');
  if(!root||root.dataset.pstRevisionReviewed==='1')return false;
  var groups={};
  root.querySelectorAll('.pgi2-file-row').forEach(function(row,index){
    var nameEl=row.querySelector('.pgi2-file-main b'),box=row.querySelector('.pgi2-file');
    if(!nameEl||!box)return;
    var name=String(nameEl.textContent||''),key=base(name)||name.toLowerCase();
    (groups[key]=groups[key]||[]).push({row:row,box:box,name:name,index:index,score:rank(name)});
  });
  Object.keys(groups).forEach(function(key){
    var rows=groups[key];if(rows.length<2)return;
    rows.sort(function(a,b){return b.score-a.score||a.index-b.index;});
    rows.forEach(function(item,index){
      item.box.checked=index===0;
      item.row.classList.toggle('muted',index>0);
      var tag=item.row.querySelector('i');if(tag)tag.textContent=index===0?'Versioni me i ri':'Version me i vjeter';
    });
  });
  root.dataset.pstRevisionReviewed='1';
  return true;
}
function intakeTarget(){return window.__pstPendingGmailIntakeTarget||location.href;}
function needsGoogleAuth(root){
  var body=root&&root.querySelector('.pgi2-body');
  var text=String(body&&body.textContent||'').toLowerCase();
  return text.indexOf('autorizimi i google kerkohet')>-1||text.indexOf('autorizo gmail dhe drive')>-1;
}
function renderGoogleAuth(root){
  root=root||document.getElementById('pgi2-bg');
  if(!root||root.dataset.pstGoogleAuthPrompt==='1'||!needsGoogleAuth(root))return false;
  var body=root.querySelector('.pgi2-body');if(!body)return false;
  root.dataset.pstGoogleAuthPrompt='1';
  body.innerHTML='<div class="pgi2-banner info"><b>Autorizo Google nje here</b><span>Platforma eshte e hapur dhe sesioni i PRISTEEL-it mbetet aktiv. Klikimi me poshte autorizon Gmail dhe Drive; pop-up-i hapet nga klikimi yt dhe nuk duhet te bllokohet nga Chrome.</span></div><div class="pgi2-status" id="pgi2-google-auth-status">Autorizimi i vlefshem do te riperdoret automatikisht ne tab-et e platformes derisa te skadoje.</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="pgi2-btn" id="pgi2-auth-close">Mbylle</button><button class="pgi2-btn primary" id="pgi2-authorize-google">Autorizo Gmail dhe Drive</button></div>';
  var close=body.querySelector('#pgi2-auth-close');
  if(close)close.onclick=function(){var bg=document.getElementById('pgi2-bg');if(bg)bg.remove();};
  var button=body.querySelector('#pgi2-authorize-google');
  if(button)button.onclick=function(){
    if(button.disabled)return;
    var status=body.querySelector('#pgi2-google-auth-status');
    button.disabled=true;button.textContent='Duke autorizuar…';
    if(status)status.textContent='Po hapet dritarja e Google…';
    var G=window.PSTGoogleWorkspaceAuth;
    if(!G||typeof G.authorizeForIntake!=='function'){
      button.disabled=false;button.textContent='Autorizo Gmail dhe Drive';
      if(status)status.textContent='Moduli i autorizimit nuk eshte gati. Rifresko faqen dhe provo perseri.';
      return;
    }
    G.authorizeForIntake().then(function(){
      if(status)status.textContent='Autorizimi u krye. Po hapet thread-i…';
      return window.PSTGmailIntakeV2.open(intakeTarget());
    }).catch(function(error){
      button.disabled=false;button.textContent='Autorizo Gmail dhe Drive';
      if(status)status.textContent=String(error&&error.message||error||'Autorizimi deshtoi.');
    });
  };
  return true;
}
function loadProjectIdentityGuard(){
  if(window.__pstGmailProjectIdentityGuardV1||document.querySelector('script[data-pst-gmail-project-identity-guard]'))return;
  var s=document.createElement('script');s.dataset.pstGmailProjectIdentityGuard='1';s.src='pristeel-gmail-project-identity-guard-v1.js?v=20260812-1';s.defer=true;s.onerror=function(){console.error('Nuk u ngarkua Gmail project identity guard.');};document.head.appendChild(s);
}
function apply(){var root=document.getElementById('pgi2-bg');if(!root)return;renderGoogleAuth(root);normalize(root);if(window.PSTGmailProjectIdentityGuardV1&&typeof window.PSTGmailProjectIdentityGuardV1.applyIntake==='function')window.PSTGmailProjectIdentityGuardV1.applyIntake();}
function schedule(){[0,100,350,900,1800,3500].forEach(function(ms){setTimeout(apply,ms);});}
loadProjectIdentityGuard();
document.addEventListener('pst:gmail-intake-request',schedule);
document.addEventListener('pst:gmail-handoff-fallback',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.PSTGmailIntakeRevisionFixV1={base:base,rank:rank,normalize:normalize,renderGoogleAuth:renderGoogleAuth,loadProjectIdentityGuard:loadProjectIdentityGuard};
})();