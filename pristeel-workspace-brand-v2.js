/* PRISTEEL Workspace Brand Skeleton V2
 * Visual-only layer. No database queries, no routing changes, no business logic changes.
 */
(function(){
'use strict';
if(window.__pstWorkspaceBrandV2Loaded)return;
window.__pstWorkspaceBrandV2Loaded=true;

var BRAND=Object.freeze({
  primary:'#2B67AD',
  primaryDark:'#1F528C',
  primaryHover:'#245A96',
  primarySoft:'#EAF2FB',
  primarySoftStrong:'#DCEAF8',
  focus:'rgba(43,103,173,.22)',
  shell:'#F5F7F9',
  card:'#FFFFFF',
  line:'#E4E9ED',
  text:'#20262B',
  muted:'#77818A'
});
window.PRISTEEL_BRAND=BRAND;

var STAR='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.5c.9 6.4 4.1 9.6 10.5 10.5-6.4.9-9.6 4.1-10.5 10.5C11.1 16.1 7.9 12.9 1.5 12 7.9 11.1 11.1 7.9 12 1.5Z" fill="currentColor"/></svg>';

function installCss(){
  if(document.getElementById('pst-workspace-brand-v2-css'))return;
  var s=document.createElement('style');
  s.id='pst-workspace-brand-v2-css';
  s.textContent=`
:root{
  --pst-brand:${BRAND.primary};
  --pst-brand-dark:${BRAND.primaryDark};
  --pst-brand-hover:${BRAND.primaryHover};
  --pst-brand-soft:${BRAND.primarySoft};
  --pst-brand-soft-strong:${BRAND.primarySoftStrong};
  --pst-brand-focus:${BRAND.focus};
  --pst-shell:${BRAND.shell};
  --pst-card:${BRAND.card};
  --pst-line:${BRAND.line};
  --pst-text:${BRAND.text};
  --pst-muted:${BRAND.muted};
  --bronze:${BRAND.primary}!important;
  --bronze-light:#4F89C7!important;
  --bronze-dark:${BRAND.primaryDark}!important;
  --bronze-bg:${BRAND.primarySoft}!important;
  --bronze-text:${BRAND.primaryDark}!important;
  --copper:${BRAND.primary}!important;
  --copper-bg:${BRAND.primarySoft}!important;
}
body.pst-ui-v2{background:var(--pst-shell)!important;color:var(--pst-text)}
body.pst-ui-v2 .app-shell,body.pst-ui-v2 .main{background:var(--pst-shell)!important}
body.pst-ui-v2 .sidebar{background:#fff!important;border-right:1px solid var(--pst-line)!important;box-shadow:none!important}
body.pst-ui-v2 .topbar{background:rgba(255,255,255,.96)!important;border-bottom:1px solid var(--pst-line)!important;box-shadow:none!important}
body.pst-ui-v2 .content{background:transparent!important}
.pst-brand-mark,.pst-ws-mark,.pst-v2-brandmark{
  background:var(--pst-brand)!important;
  color:#fff!important;
  border-radius:11px!important;
  box-shadow:0 5px 14px rgba(43,103,173,.17)!important;
}
.pst-brand-mark svg,.pst-ws-mark svg,.pst-v2-brandmark svg{width:20px;height:20px;display:block}
.pst-ws-create-main,.pst-v2-new,.pst-ws-btn.primary,.pst-dash-btn.primary,.btn-primary{
  background:var(--pst-brand)!important;
  border-color:var(--pst-brand)!important;
  color:#fff!important;
  box-shadow:none!important;
}
.pst-ws-create-main:hover,.pst-v2-new:hover,.pst-ws-btn.primary:hover,.pst-dash-btn.primary:hover,.btn-primary:hover{
  background:var(--pst-brand-hover)!important;
  border-color:var(--pst-brand-hover)!important;
}
.pst-ws-navbtn.active,.pst-v2-navitem.active{
  background:var(--pst-brand-soft)!important;
  color:var(--pst-brand-dark)!important;
}
.pst-ws-tab.active{color:var(--pst-brand-dark)!important;border-bottom-color:var(--pst-brand)!important}
.pst-ws-link,.pst-panel-link{color:var(--pst-brand)!important}
.pst-ws-app-icon{background:var(--pst-brand-soft)!important;color:var(--pst-brand)!important}
.pst-ws-card,.pst-ws-project-head,.pst-ws-projectcard,.pst-ws-app,.pst-panel,.pst-kpi,.card{
  border-color:var(--pst-line)!important;
  box-shadow:0 1px 2px rgba(24,38,50,.035)!important;
}
.pst-ws-card:hover,.pst-ws-projectcard:hover,.pst-ws-app:hover,.pst-panel:hover,.pst-kpi:hover,.card:hover{
  box-shadow:0 8px 24px rgba(31,82,140,.07)!important;
}
.pst-ws-projectcard:hover,.pst-ws-app:hover{border-color:#C7DAEE!important}
.pst-ws-quick button:hover,.pst-ws-rowaction:hover,.pst-ws-smart button:hover,.pst-ws-create-item:hover{
  background:var(--pst-brand-soft)!important;
  border-color:#C7DAEE!important;
  color:var(--pst-brand-dark)!important;
}
.pst-ws-stage.done .pst-ws-stage-dot,.pst-ws-stage.current .pst-ws-stage-dot,.pst-ws-timeitem:before{
  background:var(--pst-brand)!important;
  border-color:var(--pst-brand)!important;
}
.pst-ws-stage.done:after{background:var(--pst-brand)!important}
.pst-ws-stage.current .pst-ws-stage-label{color:var(--pst-brand-dark)!important}
.pst-ws-legacy-note{background:var(--pst-brand-soft)!important;border-color:#C7DAEE!important;color:var(--pst-brand-dark)!important}
body.pst-ui-v2 button:focus-visible,body.pst-ui-v2 a:focus-visible,body.pst-ui-v2 input:focus-visible,body.pst-ui-v2 select:focus-visible,body.pst-ui-v2 textarea:focus-visible{
  outline:3px solid var(--pst-brand-focus)!important;
  outline-offset:2px!important;
}
@media(max-width:760px){
  .pst-brand-mark,.pst-ws-mark,.pst-v2-brandmark{box-shadow:none!important}
}
`;
  document.head.appendChild(s);
}

function applyBrandMark(root){
  var scope=root&&root.querySelectorAll?root:document;
  scope.querySelectorAll('.pst-ws-mark,.pst-v2-brandmark').forEach(function(mark){
    if(mark.getAttribute('data-pst-brand-mark')==='v2')return;
    mark.setAttribute('data-pst-brand-mark','v2');
    mark.setAttribute('role','img');
    mark.setAttribute('aria-label','PRISTEEL');
    mark.classList.add('pst-brand-mark');
    mark.innerHTML=STAR;
  });
}

function apply(){
  installCss();
  document.documentElement.style.setProperty('--pst-brand',BRAND.primary);
  document.documentElement.style.setProperty('--pst-brand-dark',BRAND.primaryDark);
  document.body&&document.body.classList.add('pst-brand-v2-ready');
  applyBrandMark(document);
}

apply();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
var observer=new MutationObserver(function(mutations){
  mutations.forEach(function(m){
    m.addedNodes.forEach(function(node){
      if(node.nodeType===1){
        if(node.matches&&node.matches('.pst-ws-mark,.pst-v2-brandmark'))applyBrandMark(node.parentNode||document);
        else applyBrandMark(node);
      }
    });
  });
});
function observe(){if(document.body)observer.observe(document.body,{childList:true,subtree:true});}
if(document.body)observe();else document.addEventListener('DOMContentLoaded',observe,{once:true});
})();
