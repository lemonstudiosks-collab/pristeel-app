/* PRISTEEL Global Full-width Shell v1
 * Presentation/navigation owner only.
 * Removes the persistent sidebar on every page and exposes one Home back control
 * on non-Home pages. No data reads/writes and no business actions.
 */
(function(){
'use strict';
if(window.__pstGlobalFullwidthShellV1)return;
window.__pstGlobalFullwidthShellV1=true;

var VERSION='20260916-global-fullwidth1';
var scheduled=false;

function installStyle(){
  if(document.getElementById('pst-global-fullwidth-shell-v1-css'))return;
  var s=document.createElement('style');
  s.id='pst-global-fullwidth-shell-v1-css';
  s.textContent=`
.app-shell{grid-template-columns:minmax(0,1fr)!important}
.app-shell>.sidebar,.app-shell>aside.sidebar{display:none!important;width:0!important;min-width:0!important;max-width:0!important;border:0!important;overflow:hidden!important}
.app-shell>.main,.app-shell>main.main{width:100%!important;max-width:none!important;min-width:0!important;margin-left:0!important}
body.pst-global-fullwidth-shell .content{width:100%!important;max-width:none!important;margin-left:0!important;margin-right:0!important}
#pst-global-page-backbar{display:flex;align-items:center;min-height:48px;margin:0 0 12px;padding:0;position:relative;z-index:40}
#pst-global-back-home{height:42px;padding:0 17px;border:1px solid #3f8199;border-radius:13px;background:#4f97af;color:#fff;font:700 13px/1 inherit;letter-spacing:.01em;cursor:pointer;box-shadow:0 5px 14px rgba(63,127,152,.14);transition:background .15s ease,border-color .15s ease,transform .15s ease}
#pst-global-back-home:hover{background:#3f7f98;border-color:#3f7f98;transform:translateY(-1px)}
#pst-global-back-home:focus-visible{outline:3px solid rgba(79,151,175,.2);outline-offset:2px}
body.pst-global-fullwidth-shell #page-kek-tenders .pst-opp-v4-back{display:none!important}
body.pst-global-fullwidth-shell #page-workspace-projects [data-pmm-back]{display:none!important}
@media(max-width:720px){body.pst-global-fullwidth-shell .content{padding-left:14px!important;padding-right:14px!important}#pst-global-page-backbar{margin-bottom:8px}#pst-global-back-home{height:40px;padding:0 14px}}
`;
  document.head.appendChild(s);
  document.body&&document.body.classList.add('pst-global-fullwidth-shell');
}

function activePage(){
  return document.querySelector('.page.active,[id^="page-"][class~="active"]');
}
function isHome(page){
  if(!page)return true;
  var id=String(page.id||'').toLowerCase();
  if(id==='page-dashboard'||id==='page-workspace-home'||id==='page-home')return true;
  if(page.matches&&page.matches('[data-pst-home-canonical],.pst-home-canonical,.pst-home-canonical-page'))return true;
  return false;
}
function goHome(){
  try{
    if(window.PSTPrimaryNavResilienceV10&&typeof window.PSTPrimaryNavResilienceV10.openHome==='function'){
      window.PSTPrimaryNavResilienceV10.openHome();return true;
    }
    if(window.PSTHomeCanonicalV1&&typeof window.PSTHomeCanonicalV1.activateHome==='function'){
      window.PSTHomeCanonicalV1.activateHome();return true;
    }
    if(typeof window.pstWorkspaceGo==='function'){
      window.pstWorkspaceGo('home');return true;
    }
  }catch(e){console.warn('PRISTEEL global Home navigation:',e);}
  return false;
}
function removeBack(){
  var old=document.getElementById('pst-global-page-backbar');
  if(old)old.remove();
}
function decorate(){
  scheduled=false;
  installStyle();
  var page=activePage();
  removeBack();
  if(!page||isHome(page))return;
  var bar=document.createElement('div');
  bar.id='pst-global-page-backbar';
  bar.setAttribute('data-pst-global-shell','1');
  var btn=document.createElement('button');
  btn.type='button';btn.id='pst-global-back-home';btn.textContent='← Kthehu';
  btn.setAttribute('aria-label','Kthehu në Ballinë');
  btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();goHome();});
  bar.appendChild(btn);
  page.insertBefore(bar,page.firstChild||null);
}
function schedule(){
  if(scheduled)return;
  scheduled=true;
  (window.requestAnimationFrame||function(fn){return setTimeout(fn,0);})(decorate);
}
function observe(){
  if(!window.MutationObserver||!document.body)return;
  var mo=new MutationObserver(function(records){
    for(var i=0;i<records.length;i++){
      var t=records[i].target;
      if(t&&t.nodeType===1&&(t.classList.contains('page')||String(t.id||'').indexOf('page-')===0)){schedule();return;}
    }
  });
  mo.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
}
function boot(){installStyle();decorate();observe();}
window.addEventListener('pst:page-opened',schedule);
window.addEventListener('pst:home-canonical-rendered',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

window.PSTGlobalFullwidthShellV1={version:VERSION,refresh:decorate,goHome:goHome,_test:{activePage:activePage,isHome:isHome}};
})();
