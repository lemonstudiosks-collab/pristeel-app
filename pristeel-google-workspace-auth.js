/* PRISTEEL - nje autorizim Google per Gmail dhe Drive */
(function(){
'use strict';
if(window.__pstGoogleWorkspaceAuthLoaded)return;
window.__pstGoogleWorkspaceAuthLoaded=true;

var TOKEN_KEY='pst_google_workspace_token';
var EXP_KEY='pst_google_workspace_token_exp';
var SCOPES='https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/drive';
var token='';
var tokenExp=0;
var pending=null;

function readSaved(){
  try{
    var t=localStorage.getItem(TOKEN_KEY)||'';
    var e=parseInt(localStorage.getItem(EXP_KEY)||'0',10)||0;
    if(t&&Date.now()<e-30000){token=t;tokenExp=e;return t;}
  }catch(e){}
  return'';
}
function save(t,seconds){
  token=t||'';
  tokenExp=Date.now()+Math.max(60,Number(seconds||3600)-60)*1000;
  try{
    localStorage.setItem(TOKEN_KEY,token);
    localStorage.setItem(EXP_KEY,String(tokenExp));
    sessionStorage.setItem('pst_drive_token',token);
    sessionStorage.setItem('pst_drive_token_exp',String(tokenExp));
  }catch(e){}
  if(window.PSTEmail){window.PSTEmail.token=token;window.PSTEmail.tokenExp=tokenExp;}
  return token;
}
function clear(){
  token='';tokenExp=0;
  try{localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(EXP_KEY);sessionStorage.removeItem('pst_drive_token');sessionStorage.removeItem('pst_drive_token_exp');}catch(e){}
}
function current(){
  if(token&&Date.now()<tokenExp-30000)return token;
  return readSaved();
}
function friendlyPopupError(type){
  if(type==='popup_failed_to_open')return 'Chrome e bllokoi dritaren e Google. Lejo pop-up-et për lemonstudiosks-collab.github.io dhe kliko përsëri.';
  if(type==='popup_closed')return 'Dritarja e Google u mbyll para se të përfundonte autorizimi.';
  return 'Autorizimi i Google nuk u hap. Provo përsëri nga butoni i importimit.';
}
function requestToken(){
  var existing=current();
  if(existing)return Promise.resolve(existing);
  if(pending)return pending;
  pending=new Promise(function(resolve,reject){
    var cid=localStorage.getItem('pristeel_gclient')||'';
    if(!cid){pending=null;reject(new Error('Mungon Google Client ID te Cilësimet.'));return;}
    if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){pending=null;reject(new Error('Google Identity nuk u ngarkua. Rifresko faqen dhe provo përsëri.'));return;}
    var settled=false;
    var timeout=setTimeout(function(){
      if(settled)return;
      settled=true;pending=null;
      reject(new Error('Google nuk e ktheu autorizimin. Kontrollo në shiritin e adresës nëse Chrome ka bllokuar pop-up-in.'));
    },90000);
    try{
      var client=google.accounts.oauth2.initTokenClient({
        client_id:cid,
        scope:SCOPES,
        prompt:'',
        include_granted_scopes:true,
        callback:function(r){
          if(settled)return;
          settled=true;clearTimeout(timeout);pending=null;
          if(r&&r.access_token)resolve(save(r.access_token,r.expires_in));
          else reject(new Error((r&&r.error_description)||(r&&r.error)||'Autorizimi Google dështoi.'));
        },
        error_callback:function(e){
          if(settled)return;
          settled=true;clearTimeout(timeout);pending=null;
          reject(new Error(friendlyPopupError(e&&e.type)));
        }
      });
      client.requestAccessToken({prompt:''});
    }catch(e){
      if(!settled){settled=true;clearTimeout(timeout);pending=null;reject(e);}
    }
  });
  return pending;
}

window.PSTGoogleWorkspaceAuth={
  getToken:requestToken,
  currentToken:current,
  clear:clear,
  scopes:SCOPES
};

function overrideGmailAuth(){
  var A=window.PSTEmail;
  if(!A||A.auth&&A.auth.__pstWorkspaceUnified)return false;
  A.auth=function(){return requestToken();};
  A.auth.__pstWorkspaceUnified=true;
  var t=current();
  if(t){A.token=t;A.tokenExp=tokenExp;}
  return true;
}
var tries=0,timer=setInterval(function(){if(overrideGmailAuth()||++tries>120)clearInterval(timer)},100);
})();
