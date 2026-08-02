/* PRISTEEL - autorizim Google me scope te verifikuara */
(function(){
'use strict';
if(window.__pstGoogleWorkspaceAuthLoaded)return;
window.__pstGoogleWorkspaceAuthLoaded=true;

var GMAIL='https://www.googleapis.com/auth/gmail.readonly';
var DRIVE='https://www.googleapis.com/auth/drive';
var TOKEN_KEY='pst_google_workspace_token_v2';
var EXP_KEY='pst_google_workspace_token_exp_v2';
var SCOPE_KEY='pst_google_workspace_scopes_v2';
var token='';
var tokenExp=0;
var scopes=[];
var pending=null;

function arr(v){return Array.isArray(v)?v:[]}
function uniq(v){return arr(v).map(String).filter(function(x,i,a){return x&&a.indexOf(x)===i})}
function parseScopes(v){return uniq(String(v||'').split(/\s+/).filter(Boolean))}
function has(required){required=arr(required);return required.every(function(s){return scopes.indexOf(s)>-1})}
function valid(){return !!token&&Date.now()<tokenExp-30000}
function restore(){
  try{
    var t=sessionStorage.getItem(TOKEN_KEY)||'';
    var e=parseInt(sessionStorage.getItem(EXP_KEY)||'0',10)||0;
    var s=parseScopes(sessionStorage.getItem(SCOPE_KEY)||'');
    if(t&&Date.now()<e-30000){token=t;tokenExp=e;scopes=s;return true}
  }catch(e){}
  return false
}
function adoptLegacyGmail(){
  var A=window.PSTEmail;
  if(valid()||!A||!A.token||Date.now()>=Number(A.tokenExp||0)-30000)return false;
  token=A.token;tokenExp=Number(A.tokenExp||0);scopes=[GMAIL];return true
}
function persist(response){
  token=response.access_token||'';
  tokenExp=Date.now()+Math.max(60,Number(response.expires_in||3600)-60)*1000;
  scopes=parseScopes(response.scope||'');
  if(!scopes.length)scopes=[GMAIL];
  try{
    sessionStorage.setItem(TOKEN_KEY,token);
    sessionStorage.setItem(EXP_KEY,String(tokenExp));
    sessionStorage.setItem(SCOPE_KEY,scopes.join(' '));
    sessionStorage.setItem('pst_drive_token',token);
    sessionStorage.setItem('pst_drive_token_exp',String(tokenExp));
  }catch(e){}
  if(window.PSTEmail&&scopes.indexOf(GMAIL)>-1){window.PSTEmail.token=token;window.PSTEmail.tokenExp=tokenExp}
  return token
}
function clear(){
  token='';tokenExp=0;scopes=[];pending=null;
  try{
    [TOKEN_KEY,EXP_KEY,SCOPE_KEY,'pst_drive_token','pst_drive_token_exp'].forEach(function(k){sessionStorage.removeItem(k)});
  }catch(e){}
}
function popupMessage(type){
  if(type==='popup_failed_to_open')return'Chrome e bllokoi dritaren e Google. Lejo pop-up-et për këtë faqe dhe kliko përsëri.';
  if(type==='popup_closed')return'Dritarja e Google u mbyll para se të përfundonte autorizimi.';
  return'Autorizimi i Google nuk u hap.'
}
function request(required,options){
  required=uniq(arr(required).length?required:[GMAIL]);
  options=options||{};
  if(!valid())restore();
  if(!valid())adoptLegacyGmail();
  if(valid()&&has(required))return Promise.resolve(token);
  if(pending)return pending;

  pending=new Promise(function(resolve,reject){
    var cid=localStorage.getItem('pristeel_gclient')||'';
    if(!cid){pending=null;reject(new Error('Mungon Google Client ID te Cilësimet.'));return}
    if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){pending=null;reject(new Error('Google Identity nuk u ngarkua. Rifresko faqen dhe provo përsëri.'));return}

    var requested=uniq(scopes.concat(required));
    var settled=false;
    var timer=setTimeout(function(){
      if(settled)return;settled=true;pending=null;
      reject(new Error('Google nuk e ktheu autorizimin. Kontrollo nëse Chrome ka bllokuar pop-up-in.'));
    },90000);

    try{
      var client=google.accounts.oauth2.initTokenClient({
        client_id:cid,
        scope:requested.join(' '),
        include_granted_scopes:true,
        callback:function(r){
          if(settled)return;settled=true;clearTimeout(timer);pending=null;
          if(!r||!r.access_token){reject(new Error((r&&r.error_description)||(r&&r.error)||'Autorizimi Google dështoi.'));return}
          var granted=parseScopes(r.scope||'');
          var ok=required.every(function(s){return granted.indexOf(s)>-1});
          if(typeof google.accounts.oauth2.hasGrantedAllScopes==='function'){
            try{ok=google.accounts.oauth2.hasGrantedAllScopes.apply(null,[r].concat(required))}catch(e){}
          }
          if(!ok){clear();reject(new Error('Lejo qasjen e kërkuar në Google Drive për të importuar skedarët.'));return}
          resolve(persist(r));
        },
        error_callback:function(e){
          if(settled)return;settled=true;clearTimeout(timer);pending=null;
          reject(new Error(popupMessage(e&&e.type)));
        }
      });
      client.requestAccessToken({prompt:options.forceConsent?'consent':''});
    }catch(e){
      if(!settled){settled=true;clearTimeout(timer);pending=null;reject(e)}
    }
  });
  return pending
}

window.PSTGoogleWorkspaceAuth={
  gmailScope:GMAIL,
  driveScope:DRIVE,
  getGmailToken:function(){return request([GMAIL],{})},
  getDriveToken:function(options){return request([DRIVE],options||{})},
  getToken:function(required,options){return request(required,options)},
  currentToken:function(required){if(!valid())restore();return valid()&&has(required||[])?token:''},
  grantedScopes:function(){return scopes.slice()},
  clear:clear
};

function overrideGmailAuth(){
  var A=window.PSTEmail;if(!A)return false;
  if(A.auth&&A.auth.__pstWorkspaceScoped)return true;
  A.auth=function(){return request([GMAIL],{})};
  A.auth.__pstWorkspaceScoped=true;
  if(!valid())restore();if(!valid())adoptLegacyGmail();
  if(valid()&&has([GMAIL])){A.token=token;A.tokenExp=tokenExp}
  return true
}
var tries=0,timer=setInterval(function(){if(overrideGmailAuth()||++tries>150)clearInterval(timer)},100);
})();
