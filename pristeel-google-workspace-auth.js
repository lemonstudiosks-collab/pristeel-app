/* PRISTEEL - autorizim Google me scope te verifikuara
 * Tokeni i perkohshem ruhet edhe ne localStorage qe tab-et e platformes ta ndajne.
 * Gmail intake nuk hap pop-up automatikisht: autorizimi interaktiv nis vetem nga klikimi i perdoruesit.
 */
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

function arr(v){return Array.isArray(v)?v:[];}
function uniq(v){return arr(v).map(String).filter(function(x,i,a){return x&&a.indexOf(x)===i;});}
function parseScopes(v){return uniq(String(v||'').split(/\s+/).filter(Boolean));}
function has(required){required=arr(required);return required.every(function(s){return scopes.indexOf(s)>-1;});}
function valid(){return !!token&&Date.now()<tokenExp-30000;}
function readStore(store,key){try{return store.getItem(key)||'';}catch(e){return'';}}
function writeStore(store,key,value){try{store.setItem(key,String(value));}catch(e){}}
function removeStore(store,key){try{store.removeItem(key);}catch(e){}}
function loadFrom(store){
  var t=readStore(store,TOKEN_KEY),e=parseInt(readStore(store,EXP_KEY)||'0',10)||0,s=parseScopes(readStore(store,SCOPE_KEY)||'');
  if(t&&Date.now()<e-30000){token=t;tokenExp=e;scopes=s;return true;}
  return false;
}
function restore(){
  if(valid())return true;
  if(loadFrom(localStorage)||loadFrom(sessionStorage)){
    persistStores();
    if(window.PSTEmail&&scopes.indexOf(GMAIL)>-1){window.PSTEmail.token=token;window.PSTEmail.tokenExp=tokenExp;}
    return true;
  }
  return false;
}
function persistStores(){
  [localStorage,sessionStorage].forEach(function(store){
    writeStore(store,TOKEN_KEY,token);
    writeStore(store,EXP_KEY,tokenExp);
    writeStore(store,SCOPE_KEY,scopes.join(' '));
  });
  writeStore(sessionStorage,'pst_drive_token',token);
  writeStore(sessionStorage,'pst_drive_token_exp',tokenExp);
}
function adoptLegacyGmail(){
  var A=window.PSTEmail;
  if(valid()||!A||!A.token||Date.now()>=Number(A.tokenExp||0)-30000)return false;
  token=A.token;tokenExp=Number(A.tokenExp||0);scopes=[GMAIL];persistStores();return true;
}
function persist(response){
  token=response.access_token||'';
  tokenExp=Date.now()+Math.max(60,Number(response.expires_in||3600)-60)*1000;
  scopes=parseScopes(response.scope||'');
  if(!scopes.length)scopes=[GMAIL];
  persistStores();
  if(window.PSTEmail&&scopes.indexOf(GMAIL)>-1){window.PSTEmail.token=token;window.PSTEmail.tokenExp=tokenExp;}
  return token;
}
function clear(){
  token='';tokenExp=0;scopes=[];pending=null;
  [localStorage,sessionStorage].forEach(function(store){
    [TOKEN_KEY,EXP_KEY,SCOPE_KEY,'pst_drive_token','pst_drive_token_exp'].forEach(function(k){removeStore(store,k);});
  });
}
function popupMessage(type){
  if(type==='popup_failed_to_open')return'Chrome e bllokoi dritaren e Google. Kliko butonin e autorizimit perseri dhe lejo pop-up-in nese Chrome e kerkon.';
  if(type==='popup_closed')return'Dritarja e Google u mbyll para se te perfundonte autorizimi.';
  return'Autorizimi i Google nuk u hap.';
}
function intakeActive(){
  try{return new URL(location.href).searchParams.get('gmail_intake')==='1';}catch(e){return false;}
}
function authRequiredError(){
  var e=new Error('Autorizimi i Google kerkohet. Kliko “Autorizo Gmail dhe Drive” per te vazhduar.');
  e.code='PST_GOOGLE_AUTH_REQUIRED';
  return e;
}
function request(required,options){
  required=uniq(arr(required).length?required:[GMAIL]);
  options=options||{};
  if(!valid())restore();
  if(!valid())adoptLegacyGmail();
  if(valid()&&has(required))return Promise.resolve(token);
  if(options.interactive!==true)return Promise.reject(authRequiredError());
  if(pending)return pending;

  pending=new Promise(function(resolve,reject){
    var cid=localStorage.getItem('pristeel_gclient')||'';
    if(!cid){pending=null;reject(new Error('Mungon Google Client ID te Cilesimet.'));return;}
    if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){pending=null;reject(new Error('Google Identity nuk u ngarkua. Rifresko faqen dhe provo perseri.'));return;}

    var requested=uniq(scopes.concat(required));
    var settled=false;
    var timer=setTimeout(function(){
      if(settled)return;settled=true;pending=null;
      reject(new Error('Google nuk e ktheu autorizimin. Kontrollo nese dritarja e Google eshte ende e hapur.'));
    },90000);

    try{
      var client=google.accounts.oauth2.initTokenClient({
        client_id:cid,
        scope:requested.join(' '),
        include_granted_scopes:true,
        callback:function(r){
          if(settled)return;settled=true;clearTimeout(timer);pending=null;
          if(!r||!r.access_token){reject(new Error((r&&r.error_description)||(r&&r.error)||'Autorizimi Google deshtoi.'));return;}
          var granted=parseScopes(r.scope||'');
          var ok=required.every(function(s){return granted.indexOf(s)>-1;});
          if(typeof google.accounts.oauth2.hasGrantedAllScopes==='function'){
            try{ok=google.accounts.oauth2.hasGrantedAllScopes.apply(null,[r].concat(required));}catch(e){}
          }
          if(!ok){clear();reject(new Error('Lejo qasjen e kerkuar ne Gmail dhe Google Drive per te vazhduar.'));return;}
          resolve(persist(r));
        },
        error_callback:function(e){
          if(settled)return;settled=true;clearTimeout(timer);pending=null;
          reject(new Error(popupMessage(e&&e.type)));
        }
      });
      client.requestAccessToken({prompt:options.forceConsent?'consent':''});
    }catch(e){
      if(!settled){settled=true;clearTimeout(timer);pending=null;reject(e);}
    }
  });
  return pending;
}

window.PSTGoogleWorkspaceAuth={
  gmailScope:GMAIL,
  driveScope:DRIVE,
  getGmailToken:function(options){return request([GMAIL],Object.assign({interactive:true},options||{}));},
  getDriveToken:function(options){return request([DRIVE],Object.assign({interactive:true},options||{}));},
  getToken:function(required,options){return request(required,Object.assign({interactive:true},options||{}));},
  authorizeForIntake:function(){return request([GMAIL,DRIVE],{interactive:true,forceConsent:false});},
  cachedToken:function(required){if(!valid())restore();return valid()&&has(required||[])?token:'';},
  currentToken:function(required){if(!valid())restore();return valid()&&has(required||[])?token:'';},
  grantedScopes:function(){if(!valid())restore();return scopes.slice();},
  clear:clear
};

function overrideGmailAuth(){
  var A=window.PSTEmail;if(!A)return false;
  A.auth=function(){
    if(!valid())restore();if(!valid())adoptLegacyGmail();
    if(valid()&&has([GMAIL]))return Promise.resolve(token);
    if(intakeActive())return Promise.reject(authRequiredError());
    return request([GMAIL],{interactive:true});
  };
  A.auth.__pstWorkspaceScoped=true;
  A.authInteractive=function(){return request([GMAIL,DRIVE],{interactive:true});};
  if(valid()&&has([GMAIL])){A.token=token;A.tokenExp=tokenExp;}
  return true;
}
overrideGmailAuth();
})();
