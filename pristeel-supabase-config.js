/* PRISTEEL canonical Supabase public configuration + session handoff */
(function(){
'use strict';
window._SB_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
window._SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzeW14cWZxemtjaGJzcmJodWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDU1NzYsImV4cCI6MjA5ODIyMTU3Nn0.H25Z7TSVv0OD0X1QPqlowAr0uLSo88_Bu7R_cW6KAIM';
try{
  var handoff=sessionStorage.getItem('pst_login_session_handoff_v1');
  if(handoff){
    var parsed=JSON.parse(handoff);
    if(parsed&&parsed.access_token&&parsed.refresh_token){
      localStorage.setItem('pristeel_session',JSON.stringify(parsed));
    }
  }
}catch(e){console.warn('PRISTEEL session handoff restore failed',e);}
})();