/* PRISTEEL Global Full-width Shell v3
 * Presentation/navigation owner only.
 * Keeps the canonical sidebar on Home, uses full width on the remaining pages,
 * and exposes one Home back control there. No data reads/writes or business actions.
 */
(function(){
'use strict';
if(window.__pstGlobalFullwidthShellV2)return;
window.__pstGlobalFullwidthShellV2=true;
window.__pstGlobalFullwidthShellV1=true;

var VERSION='20261005-home-final-audit1';
var scheduled=false;

function installStyle(){
  var s=document.getElementById('pst-global-fullwidth-shell-v1-css'),fresh=false;
  if(!s){s=document.createElement('style');s.id='pst-global-fullwidth-shell-v1-css';fresh=true;}
  s.textContent=`
body:not(.pst-home-shell-owned):has(#page-workspace-home.active) .app-shell{display:flex!important;grid-template-columns:204px minmax(0,1fr)!important}
body:not(.pst-home-shell-owned):has(#page-workspace-home.active) .app-shell>.sidebar,body:not(.pst-home-shell-owned):has(#page-workspace-home.active) .app-shell>aside.sidebar{display:flex!important;visibility:visible!important;flex:0 0 204px!important;width:204px!important;min-width:204px!important;max-width:204px!important;border-right:1px solid #e4e8e9!important;overflow:hidden!important}
body:not(.pst-home-shell-owned):has(#page-workspace-home.active) .app-shell>.main,body:not(.pst-home-shell-owned):has(#page-workspace-home.active) .app-shell>main.main{flex:1 1 auto!important;width:auto!important;max-width:none!important;min-width:0!important;margin-left:0!important}
body:not(.pst-home-shell-owned):not(:has(#page-workspace-home.active)) .app-shell{display:flex!important;grid-template-columns:minmax(0,1fr)!important}
body:not(.pst-home-shell-owned):not(:has(#page-workspace-home.active)) .app-shell>.sidebar,body:not(.pst-home-shell-owned):not(:has(#page-workspace-home.active)) .app-shell>aside.sidebar{display:none!important;visibility:hidden!important;flex:0 0 0!important;width:0!important;min-width:0!important;max-width:0!important;border:0!important;padding:0!important;margin:0!important;overflow:hidden!important}
body:not(.pst-home-shell-owned):not(:has(#page-workspace-home.active)) .app-shell>.main,body:not(.pst-home-shell-owned):not(:has(#page-workspace-home.active)) .app-shell>main.main{flex:1 1 auto!important;width:100%!important;max-width:none!important;min-width:0!important;margin-left:0!important}
body:not(.pst-home-shell-owned).pst-global-fullwidth-shell .content{width:100%!important;max-width:none!important;margin-left:0!important;margin-right:0!important}
#pst-global-page-backbar{display:flex;align-items:center;margin:0 0 12px}
#pst-global-back-home{min-height:34px;padding:6px 12px;border:1px solid #4f97af;border-radius:9px;background:#4f97af;color:#fff;font:750 11px sans-serif;cursor:pointer}
@media(max-width:760px){body:not(.pst-home-shell-owned):has(#page-workspace-home.active) .app-shell{grid-template-columns:72px minmax(0,1fr)!important}body:not(.pst-home-shell-owned):has(#page-workspace-home.active) .app-shell>.sidebar,body:not(.pst-home-shell-owned):has(#page-workspace-home.active) .app-shell>aside.sidebar{flex-basis:72px!important;width:72px!important;min-width:72px!important;max-width:72px!important}}
`;
  if(fresh)document.head.appendChild(s);
  document.body&&document.body.classList.add('pst-global-fullwidth-shell');
}

function isVisiblePage(page){
  if(!page||page.hidden)return false;
  if(page.style&&page.style.display==='none')return false;
  try{
    var cs=window.getComputedStyle?window.getComputedStyle(page):null;
    if(cs&&(cs.display==='none'||cs.visibility==='hidden'))return false;
  }catch(e){}
  return true;
}
function activePage(){
  var active=Array.prototype.slice.call(document.querySelectorAll('.page.active,[id^="page-"][class~="active"]')).filter(isVisiblePage);
  if(active.length)return active[active.length-1];
  var visible=Array.prototype.slice.call(document.querySelectorAll('.page,[id^="page-workspace-"],#page-kek-tenders,#page-dashboard,#page-home,#page-finance,#page-contacts,#page-partners,#page-system')).filter(isVisiblePage);
  return visible[visible.length-1]||null;
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
function decorate(){
  scheduled=false;
  installStyle();
  var page=activePage(),opportunitiesOwnsBack=!!(page&&Array.prototype.some.call(page.querySelectorAll('[data-pst-opp-back],[data-rep-back],[data-eu-back],[data-dss-back],[data-pmm-back],[data-pst-fin-home]'),isVisiblePage));
  document.querySelectorAll('#pst-global-page-backbar').forEach(function(bar){
    if(opportunitiesOwnsBack||!page||isHome(page)||bar.parentNode!==page)bar.remove();
  });
  if(!page||isHome(page)||opportunitiesOwnsBack)return;
  if(page.querySelector(':scope > #pst-global-page-backbar'))return;
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
      var r=records[i],t=r.target;
      if(r.type==='attributes'&&t&&t.nodeType===1&&(t.classList.contains('page')||String(t.id||'').indexOf('page-')===0)){schedule();return;}
      if(r.type==='childList'){
        var nodes=[].slice.call(r.addedNodes||[]).concat([].slice.call(r.removedNodes||[]));
        for(var j=0;j<nodes.length;j++){var n=nodes[j];if(n&&n.nodeType===1&&(n.matches&&n.matches('[data-pst-opp-back],[data-rep-back],[data-eu-back],[data-dss-back],#pst-global-page-backbar')||n.querySelector&&n.querySelector('[data-pst-opp-back],[data-rep-back],[data-eu-back],[data-dss-back],#pst-global-page-backbar'))){schedule();return;}}
      }
    }
  });
  mo.observe(document.body,{subtree:true,attributes:true,childList:true,attributeFilter:['class','style','hidden']});
}
function boot(){installStyle();decorate();observe();}
window.addEventListener('pst:page-opened',schedule);
window.addEventListener('pst:home-canonical-rendered',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

window.PSTGlobalFullwidthShellV2=window.PSTGlobalFullwidthShellV1={version:VERSION,refresh:decorate,goHome:goHome,_test:{activePage:activePage,isHome:isHome,isVisiblePage:isVisiblePage}};
})();
