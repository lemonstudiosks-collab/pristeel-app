/* PRISTEEL non-blocking login handoff
 * The startup guard is the single owner of startup visibility.
 * This compatibility layer never places a full-screen blocker over an
 * authenticated reload. It only nudges the final Home render after login.
 */
(function(){
'use strict';
if(window.__pstLoginTransitionV2)return;
window.__pstLoginTransitionV2=true;

(function loadProjectIdentityLockEarly(){
  if(window.__pstProjectIdentityLockV1||document.querySelector('script[data-pst-project-identity-lock]'))return;
  var s=document.createElement('script');
  s.src='pristeel-project-identity-lock-v1.js?v=20260809-1';
  s.defer=true;
  s.setAttribute('data-pst-project-identity-lock','1');
  document.head.appendChild(s);
})();

var state={active:false,started:0,installTries:0,settleTimer:null};

function clearLegacyBlocker(){
  document.documentElement.classList.remove('pst-login-switching');
  var el=document.getElementById('pst-login-transition-v2');
  if(el&&el.parentNode)el.remove();
  var css=document.getElementById('pst-login-transition-v2-style');
  if(css&&css.parentNode)css.remove();
}

function renderFinalHome(){
  try{
    var owner=window.PSTHomeRuntimeOwnerGuardV2||window.PSTHomeRuntimeOwnerGuardV1;
    if(owner&&typeof owner.renderCanonical==='function'&&owner.renderCanonical())return true;
    if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('home');return true;}
    if(typeof window.renderHome==='function'){window.renderHome();return true;}
  }catch(e){console.warn('PPPP login handoff:',e);}
  return false;
}

function settle(){
  clearTimeout(state.settleTimer);
  var tries=0;
  (function attempt(){
    if(renderFinalHome()){state.active=false;return;}
    if(++tries>=24){state.active=false;return;}
    state.settleTimer=setTimeout(attempt,125);
  })();
}

function begin(){
  state.active=true;
  state.started=Date.now();
  clearLegacyBlocker();
  /* Login must never be blocked by presentation. The authenticated app/login
   * owner decides visibility; this layer only requests a final Home paint. */
  setTimeout(settle,0);
}

function finish(){
  state.active=false;
  clearTimeout(state.settleTimer);
  clearLegacyBlocker();
}

function install(){
  var form=document.getElementById('auth-form');
  if(form&&!form.__pstLoginTransitionV2){
    form.__pstLoginTransitionV2=true;
    form.addEventListener('submit',begin,true);
  }
  if(!form&&state.installTries++<40)setTimeout(install,100);
}

function settleExistingSession(){
  clearLegacyBlocker();
  try{
    if(typeof window.authGetSession==='function'){
      var session=window.authGetSession();
      if(session&&session.access_token){
        if(window.__pstModulesReady)setTimeout(settle,0);
        else document.addEventListener('pst:modules-ready',function(){setTimeout(settle,0);},{once:true});
      }
    }
  }catch(e){}
}

function boot(){
  clearLegacyBlocker();
  install();
  setTimeout(settleExistingSession,40);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

window.PSTLoginTransition={begin:begin,finish:finish,state:state,renderBaseHome:renderFinalHome,homeReady:function(){return true;}};
})();
