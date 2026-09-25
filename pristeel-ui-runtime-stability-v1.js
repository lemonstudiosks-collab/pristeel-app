/* PRISTEEL global UI runtime stability v2
 * Keeps the current route visually frozen until the destination has completed
 * its first stable layout. Prevents empty intermediate pages, size jumps and
 * transform-based click/hover motion without changing business behavior.
 */
(function(){
'use strict';
if(window.__pstUiRuntimeStabilityV1)return;
window.__pstUiRuntimeStabilityV1=true;

var root=document.documentElement;
var replaying=false;
var running=null;
var sequence=0;
var ROUTE_SELECTOR=[
  '#pst-ws-canonical-nav .pst-ws-navbtn[data-key]',
  '#pst-home-launchpad-v1 [data-pst-launch-area]',
  '#pst-global-back-home',
  '[data-dss-back]',
  '.pst-tech-back',
  '#page-workspace-projects [data-pm-open]',
  '#page-workspace-projects [data-project-id]',
  '#page-kek-tenders [data-pst-opp-back]',
  '[data-pst-stable-route]'
].join(',');

function installCss(){
  if(document.getElementById('pst-ui-runtime-stability-v1-css'))return;
  var s=document.createElement('style');
  s.id='pst-ui-runtime-stability-v1-css';
  s.textContent=`
html{scrollbar-gutter:stable!important;scroll-behavior:auto!important}
html,body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important}
body{min-width:0;overflow-y:scroll;overflow-anchor:none}
html.pst-ui-route-transitioning,html.pst-ui-route-transitioning body{scroll-behavior:auto!important;overflow-anchor:none!important}
html.pst-ui-route-transitioning #app-shell-root{pointer-events:none!important}
html.pst-runtime-ready #app-shell-root,
html.pst-runtime-ready #app-shell-root *,
html.pst-runtime-ready #app-shell-root *::before,
html.pst-runtime-ready #app-shell-root *::after{animation-duration:.001ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important;scroll-behavior:auto!important}
html.pst-runtime-ready #app-shell-root .main,
html.pst-runtime-ready #app-shell-root .content{min-height:100vh!important}
html.pst-runtime-ready #app-shell-root .content>.page{min-height:calc(100vh - 76px)}
html.pst-runtime-ready #app-shell-root button:hover,
html.pst-runtime-ready #app-shell-root button:active,
html.pst-runtime-ready #app-shell-root a:hover,
html.pst-runtime-ready #app-shell-root a:active,
html.pst-runtime-ready #app-shell-root [role="button"]:hover,
html.pst-runtime-ready #app-shell-root [role="button"]:active,
html.pst-runtime-ready #app-shell-root [onclick]:hover,
html.pst-runtime-ready #app-shell-root [onclick]:active,
html.pst-runtime-ready #app-shell-root .card:hover,
html.pst-runtime-ready #app-shell-root [class*="card"]:hover,
html.pst-runtime-ready #app-shell-root [class*="tile"]:hover,
html.pst-runtime-ready #app-shell-root [class*="row"]:hover,
html.pst-runtime-ready #app-shell-root .pst-panel:hover,
html.pst-runtime-ready #app-shell-root .pst-kpi:hover,
html.pst-runtime-ready #app-shell-root .pst-project:hover{transform:none!important;scale:1!important}
.pst-ui-stability-clone{position:fixed!important;z-index:2147481800!important;margin:0!important;overflow:hidden!important;pointer-events:none!important;contain:paint!important;background:#F7F6F3!important}
`;
  document.head.appendChild(s);
}

function activePage(){
  var pages=document.querySelectorAll('.page.active');
  for(var i=pages.length-1;i>=0;i--){
    var p=pages[i],cs=null;
    try{cs=window.getComputedStyle(p);}catch(e){}
    if(!cs||cs.display!=='none')return p;
  }
  return null;
}
function signature(page){
  if(!page)return 'none';
  var text=String(page.textContent||'').replace(/\s+/g,' ').trim();
  var rect={height:0,width:0};
  try{rect=page.getBoundingClientRect();}catch(e){}
  return [page.id||'',text.length,Math.round(rect.width),Math.round(rect.height),page.children.length].join('|');
}
function loading(page){
  var text=String(page&&page.textContent||'').replace(/\s+/g,' ').trim();
  return !page||text.length<40||/^(duke|loading|preparing|po ngarkohet)/i.test(text);
}
function twoFrames(fn){
  var raf=window.requestAnimationFrame||function(cb){return setTimeout(cb,16);};
  raf(function(){raf(fn);});
}
function waitForStable(before,beforeSignature,token){
  return new Promise(function(resolve){
    var started=Date.now(),last='',stableFrames=0;
    function check(){
      if(token!==sequence){resolve(false);return;}
      var page=activePage(),sig=signature(page),changed=page!==before||sig!==beforeSignature;
      if(changed&&!loading(page)&&sig===last)stableFrames++;else stableFrames=0;
      last=sig;
      if(stableFrames>=2||Date.now()-started>1200){twoFrames(function(){resolve(true);});return;}
      (window.requestAnimationFrame||function(cb){return setTimeout(cb,16);})(check);
    }
    (window.requestAnimationFrame||function(cb){return setTimeout(cb,16);})(check);
  });
}
function makeFallbackClone(page){
  if(!page||!page.cloneNode)return null;
  var rect=page.getBoundingClientRect(),clone=page.cloneNode(true);
  clone.classList.remove('page');
  clone.classList.add('pst-ui-stability-clone');
  clone.style.setProperty('top',rect.top+'px','important');
  clone.style.setProperty('left',rect.left+'px','important');
  clone.style.setProperty('width',Math.max(1,rect.width)+'px','important');
  clone.style.setProperty('height',Math.max(1,rect.height)+'px','important');
  try{
    var cs=window.getComputedStyle(page);
    clone.style.setProperty('font-family',cs.fontFamily,'important');
    clone.style.setProperty('font-size',cs.fontSize,'important');
    clone.style.setProperty('line-height',cs.lineHeight,'important');
    clone.style.setProperty('color',cs.color,'important');
    clone.style.setProperty('background-color',cs.backgroundColor,'important');
  }catch(e){}
  try{
    clone.scrollTop=page.scrollTop;clone.scrollLeft=page.scrollLeft;
    var sourceScrollers=page.querySelectorAll('*'),cloneScrollers=clone.querySelectorAll('*');
    for(var i=0;i<sourceScrollers.length&&i<cloneScrollers.length;i++){
      if(sourceScrollers[i].scrollTop)cloneScrollers[i].scrollTop=sourceScrollers[i].scrollTop;
      if(sourceScrollers[i].scrollLeft)cloneScrollers[i].scrollLeft=sourceScrollers[i].scrollLeft;
    }
  }catch(e){}
  clone.setAttribute('aria-hidden','true');
  (document.getElementById('app-shell-root')||document.body||document.documentElement).appendChild(clone);
  return clone;
}
function replay(trigger){
  replaying=true;
  try{trigger.click();}finally{replaying=false;}
}
function finish(token,clone){
  if(clone&&clone.parentNode)clone.remove();
  if(token===sequence){running=null;root.classList.remove('pst-ui-route-transitioning');}
}
function begin(trigger){
  if(running)return false;
  installCss();
  var before=activePage(),beforeSignature=signature(before),token=++sequence;
  root.classList.add('pst-ui-route-transitioning');
  var clone=makeFallbackClone(before);
  running={fallback:true};
  replay(trigger);
  waitForStable(before,beforeSignature,token).then(function(){finish(token,clone);},function(){finish(token,clone);});
  return true;
}
function routeTrigger(target){
  if(!target||!target.closest)return null;
  return target.closest(ROUTE_SELECTOR);
}
function capture(e){
  if(replaying||e.defaultPrevented||(typeof e.button==='number'&&e.button!==0)||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  var trigger=routeTrigger(e.target);if(!trigger||trigger.disabled)return;
  e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
  begin(trigger);
}

installCss();
window.addEventListener('click',capture,true);
window.PSTUiRuntimeStabilityV1={begin:begin,waitForStable:waitForStable,activePage:activePage,signature:signature,isRunning:function(){return !!running;},_test:{routeTrigger:routeTrigger,loading:loading}};
})();
