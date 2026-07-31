/* PRISTEEL UI V2: rifreskon dashboard-in sapo sesioni të jetë aktiv */
(function(){
'use strict';
var tries=0;
var timer=setInterval(function(){
  var shell=document.getElementById('app-shell-root');
  var session=(typeof window.authGetSession==='function')?window.authGetSession():null;
  var visible=shell&&window.getComputedStyle(shell).display!=='none';
  if(session&&visible&&typeof window.pstV2RenderDashboard==='function'){
    clearInterval(timer);
    document.body.classList.add('pst-ui-v2');
    window.pstV2RenderDashboard();
  }else if(++tries>240){
    clearInterval(timer);
  }
},250);
})();
