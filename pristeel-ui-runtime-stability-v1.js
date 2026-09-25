/* PRISTEEL global UI runtime stability v3
 * Observes normal route clicks and suppresses layout animation while the
 * destination settles. It never clones the current page, duplicates DOM ids,
 * cancels the original event or replays a synthetic click.
 */
(function(){
'use strict';
if(window.__pstUiRuntimeStabilityV1)return;
window.__pstUiRuntimeStabilityV1=true;

var root=document.documentElement;
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
html.pst-ui-route-transitioning #app-shell-root{cursor:progress}
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
  return [page.id||'',text.length,page.children.length].join('|');
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
      if(stableFrames>=2||Date.now()-started>900){twoFrames(function(){resolve(true);});return;}
      (window.requestAnimationFrame||function(cb){return setTimeout(cb,16);})(check);
    }
    (window.requestAnimationFrame||function(cb){return setTimeout(cb,16);})(check);
  });
}
function finish(token){
  if(token===sequence){running=null;root.classList.remove('pst-ui-route-transitioning');}
}
function begin(){
  installCss();
  var before=activePage(),beforeSignature=signature(before),token=++sequence;
  root.classList.add('pst-ui-route-transitioning');
  running={token:token};
  waitForStable(before,beforeSignature,token).then(function(){finish(token);},function(){finish(token);});
  return true;
}
function routeTrigger(target){
  if(!target||!target.closest)return null;
  return target.closest(ROUTE_SELECTOR);
}
function capture(e){
  if(e.defaultPrevented||(typeof e.button==='number'&&e.button!==0)||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  var trigger=routeTrigger(e.target);if(!trigger||trigger.disabled)return;
  begin();
}

installCss();
window.addEventListener('click',capture,true);
window.PSTUiRuntimeStabilityV1={begin:begin,waitForStable:waitForStable,activePage:activePage,signature:signature,isRunning:function(){return !!running;},_test:{routeTrigger:routeTrigger,loading:loading}};
})();
