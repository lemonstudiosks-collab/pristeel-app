/* PRISTEEL Mobile PIN Unlock v1
 * Device-local 4-digit quick unlock layered over the existing remembered Supabase session.
 * Never stores the user's password or plaintext PIN.
 * No Supabase reads/writes, polling, or business actions.
 */
(function(){
'use strict';
if(window.__pstMobilePinUnlockV1)return;
window.__pstMobilePinUnlockV1=true;

var CFG_KEY='pst_mobile_pin_v1';
var ATTEMPTS_KEY='pst_mobile_pin_attempts_v1';
var LOCK_KEY='pst_mobile_pin_lock_until_v1';
var BYPASS_KEY='pst_mobile_pin_bypass_once_v1';
var SESSION_UNLOCK_KEY='pst_mobile_pin_session_unlocked_v1';
var REMEMBERED_KEY='pst_auth_remembered_session_v3';
var MAX_ATTEMPTS=5;
var LOCK_MS=60*1000;
var PBKDF2_ITERATIONS=150000;
var originalStart=window.startApp;
var originalLogout=window.doLogout;
var unlocked=false;
var setupFirstPin='';
var mode='unlock';

function S(v){return String(v==null?'':v);}
function mobile(){
  var iw=Number(window.innerWidth||9999),sw=Number(window.screen&&window.screen.width||9999);
  return Math.min(iw,sw)<=900;
}
function session(){
  try{if(typeof window.authGetSession==='function')return window.authGetSession();}catch(e){}
  try{return JSON.parse(localStorage.getItem('pristeel_session')||'null');}catch(e){return null;}
}
function emailOf(s){return S(s&&s.email).trim().toLowerCase();}
function parse(v){try{return JSON.parse(v||'null');}catch(e){return null;}}
function readCfg(){try{return parse(localStorage.getItem(CFG_KEY));}catch(e){return null;}}
function writeCfg(v){try{localStorage.setItem(CFG_KEY,JSON.stringify(v));return true;}catch(e){return false;}}
function clearCfg(){try{localStorage.removeItem(CFG_KEY);}catch(e){} resetAttempts();clearLock();}
function attempts(){try{return Math.max(0,parseInt(localStorage.getItem(ATTEMPTS_KEY)||'0',10)||0);}catch(e){return 0;}}
function setAttempts(n){try{localStorage.setItem(ATTEMPTS_KEY,String(Math.max(0,n||0)));}catch(e){}}
function resetAttempts(){try{localStorage.removeItem(ATTEMPTS_KEY);}catch(e){}}
function lockUntil(){try{return Math.max(0,parseInt(localStorage.getItem(LOCK_KEY)||'0',10)||0);}catch(e){return 0;}}
function setLock(){try{localStorage.setItem(LOCK_KEY,String(Date.now()+LOCK_MS));}catch(e){}}
function clearLock(){try{localStorage.removeItem(LOCK_KEY);}catch(e){}}
function locked(){var u=lockUntil();if(!u)return 0;if(Date.now()>=u){clearLock();resetAttempts();return 0;}return u;}
function consumeBypass(){
  try{
    if(sessionStorage.getItem(BYPASS_KEY)==='1'){sessionStorage.removeItem(BYPASS_KEY);return true;}
  }catch(e){}
  return false;
}
function setBypass(){try{sessionStorage.setItem(BYPASS_KEY,'1');}catch(e){}}
function markSessionUnlocked(s){
  try{sessionStorage.setItem(SESSION_UNLOCK_KEY,emailOf(s));}catch(e){}
}
function sessionUnlocked(s){
  try{return !!(emailOf(s)&&sessionStorage.getItem(SESSION_UNLOCK_KEY)===emailOf(s));}catch(e){return false;}
}
function clearSessionUnlocked(){try{sessionStorage.removeItem(SESSION_UNLOCK_KEY);}catch(e){}}
function b64(bytes){
  var s='';for(var i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(s){
  var raw=atob(S(s)),out=new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  return out;
}
function randomSalt(){
  var a=new Uint8Array(16);
  window.crypto.getRandomValues(a);
  return b64(a);
}
async function derive(pin,salt){
  if(!window.crypto||!window.crypto.subtle||typeof TextEncoder==='undefined')throw new Error('WEBCRYPTO_UNAVAILABLE');
  var key=await window.crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
  var bits=await window.crypto.subtle.deriveBits({name:'PBKDF2',salt:fromB64(salt),iterations:PBKDF2_ITERATIONS,hash:'SHA-256'},key,256);
  return b64(new Uint8Array(bits));
}
function sameHash(a,b){
  a=S(a);b=S(b);if(a.length!==b.length)return false;
  var x=0;for(var i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);
  return x===0;
}
function validPin(v){return /^\d{4}$/.test(S(v));}
function usableSession(s){return !!(s&&s.refresh_token&&emailOf(s));}
function rememberedSession(){
  try{
    var b=parse(localStorage.getItem(REMEMBERED_KEY));
    return b&&b.session&&usableSession(b.session)?b.session:null;
  }catch(e){return null;}
}
function identitySession(){return session()||rememberedSession()||null;}
function restoreRememberedSession(){
  var s=session();if(usableSession(s))return s;
  try{
    var api=window.PSTAuthPersistence;
    if(api&&typeof api.restoreOnce==='function')api.restoreOnce();
  }catch(e){}
  s=session();if(usableSession(s))return s;
  var b=rememberedSession();if(!b)return null;
  var clone={};Object.keys(b).forEach(function(k){clone[k]=b[k];});
  if(!Number(clone.expires_at)||Date.now()>=Number(clone.expires_at))clone.expires_at=0;
  try{localStorage.setItem('pristeel_session',JSON.stringify(clone));return clone;}catch(e){return null;}
}
async function resumeWithPin(){
  var s=restoreRememberedSession();
  if(!usableSession(s))return null;
  try{
    var api=window.PSTAuthPersistence;
    if(api&&typeof api.installRefreshSingleFlight==='function')api.installRefreshSingleFlight();
  }catch(e){}
  if(Number(s.expires_at)&&Date.now()<Number(s.expires_at))return s;
  if(typeof window.authRefreshIfNeeded==='function'){
    try{var fresh=await window.authRefreshIfNeeded();if(fresh)return fresh;}catch(e){}
  }
  return null;
}

function installCss(){
  if(document.getElementById('pst-mobile-pin-v1-css'))return;
  var st=document.createElement('style');st.id='pst-mobile-pin-v1-css';st.textContent=`
#pst-mobile-pin-gate{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;background:#F7F9FA;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
#pst-mobile-pin-gate.on{display:flex}
#pst-mobile-pin-gate .pst-pin-card{width:min(100%,360px);background:#fff;border:1px solid #E0E8EB;border-radius:22px;padding:24px 20px 20px;box-shadow:0 18px 50px rgba(30,55,66,.12);text-align:center}
#pst-mobile-pin-gate .pst-pin-logo{width:54px;height:54px;margin:0 auto 14px;border-radius:16px;background:linear-gradient(145deg,#5BA8C0,#2E7F9A);color:#fff;display:grid;place-items:center;font-size:22px;font-weight:800}
#pst-mobile-pin-gate h2{margin:0;color:#20323A;font-size:22px;letter-spacing:-.35px}
#pst-mobile-pin-gate p{margin:8px 0 18px;color:#7D898E;font-size:12px;line-height:1.45}
#pst-mobile-pin-gate .pst-pin-input{width:100%;height:58px;border:1px solid #D9E4E7;border-radius:15px;background:#FAFCFC;text-align:center;font-size:26px;letter-spacing:14px;padding-left:14px;color:#21343C;outline:none;box-sizing:border-box}
#pst-mobile-pin-gate .pst-pin-input:focus{border-color:#5A9FB5;box-shadow:0 0 0 3px rgba(79,151,175,.12)}
#pst-mobile-pin-gate .pst-pin-error{min-height:18px;margin:10px 0 2px;color:#B24C4C;font-size:11px}
#pst-mobile-pin-gate .pst-pin-actions{display:grid;gap:8px;margin-top:10px}
#pst-mobile-pin-gate button{min-height:44px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer}
#pst-mobile-pin-gate .pst-pin-primary{border:0;background:#347E95;color:#fff}
#pst-mobile-pin-gate .pst-pin-secondary{border:1px solid #D9E4E7;background:#fff;color:#53656D}
#pst-mobile-pin-gate .pst-pin-link{border:0;background:transparent;color:#65777F;min-height:34px;font-weight:600}
#pst-mobile-pin-gate .pst-pin-note{margin-top:12px;color:#9AA4A8;font-size:9.5px;line-height:1.45}
`;document.head.appendChild(st);
}
function gate(){
  var g=document.getElementById('pst-mobile-pin-gate');if(g)return g;
  g=document.createElement('div');g.id='pst-mobile-pin-gate';
  g.innerHTML='<div class="pst-pin-card"><div class="pst-pin-logo">P</div><h2 data-pst-pin-title>Shkruaj PIN-in</h2><p data-pst-pin-sub>4 shifrat e tua për të hapur PPPP.</p><input class="pst-pin-input" data-pst-pin-input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="PIN me 4 shifra"><div class="pst-pin-error" data-pst-pin-error></div><div class="pst-pin-actions"><button type="button" class="pst-pin-primary" data-pst-pin-submit>Hap PPPP</button><button type="button" class="pst-pin-secondary" data-pst-pin-skip style="display:none">Jo tani</button></div><div class="pst-pin-note">Pas aktivizimit të parë, rikthimi në këtë telefon bëhet vetëm me PIN. Emaili dhe fjalëkalimi nuk kërkohen për skadimin normal të sesionit.</div></div>';
  document.body.appendChild(g);
  var input=g.querySelector('[data-pst-pin-input]');
  input.addEventListener('input',function(){
    this.value=this.value.replace(/\D/g,'').slice(0,4);
    if(this.value.length===4)setTimeout(submit,60);
  });
  input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();submit();}});
  g.querySelector('[data-pst-pin-submit]').addEventListener('click',submit);
  g.querySelector('[data-pst-pin-skip]').addEventListener('click',function(){
    var s=session();hide();unlocked=true;markSessionUnlocked(s);
    try{document.dispatchEvent(new CustomEvent('pst:mobile-pin-unlocked',{detail:{email:emailOf(s),mode:'skip'}}));}catch(e){}
    if(typeof originalStart==='function')originalStart();
  });
  return g;
}
function setText(title,sub,error){
  var g=gate(),t=g.querySelector('[data-pst-pin-title]'),s=g.querySelector('[data-pst-pin-sub]'),e=g.querySelector('[data-pst-pin-error]');
  if(t)t.textContent=title||'';if(s)s.textContent=sub||'';if(e)e.textContent=error||'';
}
function show(which){
  installCss();var g=gate(),already=g.classList.contains('on')&&mode===which,input=g.querySelector('[data-pst-pin-input]'),skip=g.querySelector('[data-pst-pin-skip]'),btn=g.querySelector('[data-pst-pin-submit]');
  mode=which;
  if(already){setTimeout(function(){try{input&&input.focus();}catch(e){}},30);return;}
  g.classList.add('on');if(input){input.value='';input.disabled=false;}
  setupFirstPin='';
  if(which==='setup'){setText('Krijo PIN-in','Vendos 4 shifra që do t’i përdorësh në këtë telefon.','');if(skip)skip.style.display='block';if(btn)btn.textContent='Vazhdo';}
  else{
    var until=locked(),left=Math.max(0,MAX_ATTEMPTS-attempts());
    if(until){var sec=Math.max(1,Math.ceil((until-Date.now())/1000));setText('PIN i bllokuar përkohësisht','Prit '+sec+' sekonda dhe provo përsëri.','Shumë tentativa të pasakta.');}
    else setText('Shkruaj PIN-in','4 shifrat e tua për të hapur PPPP'+(left<MAX_ATTEMPTS?' · '+left+' tentativa të mbetura':''),'');
    if(skip)skip.style.display='none';if(btn)btn.textContent='Hap PPPP';
  }
  setTimeout(function(){try{input&&input.focus();}catch(e){}},80);
}
function hide(){var g=document.getElementById('pst-mobile-pin-gate');if(g)g.classList.remove('on');}
async function submit(){
  var g=gate(),input=g.querySelector('[data-pst-pin-input]'),pin=S(input&&input.value),until=locked();
  if(mode!=='setup'&&until){var sec=Math.max(1,Math.ceil((until-Date.now())/1000));setText('PIN i bllokuar përkohësisht','Prit '+sec+' sekonda dhe provo përsëri.','Shumë tentativa të pasakta.');return;}
  if(!validPin(pin)){setText(mode==='setup'?'Krijo PIN-in':'Shkruaj PIN-in','PIN-i duhet të ketë saktësisht 4 shifra.','Shkruaj 4 numra.');return;}
  if(input)input.disabled=true;
  try{
    if(mode==='setup'){
      if(!setupFirstPin){
        setupFirstPin=pin;if(input){input.value='';input.disabled=false;}
        setText('Përsërite PIN-in','Shkruaji edhe një herë të njëjtat 4 shifra.','');
        if(input)input.focus();return;
      }
      if(pin!==setupFirstPin){
        setupFirstPin='';if(input){input.value='';input.disabled=false;}
        setText('Krijo PIN-in','Vendos 4 shifra që do t’i përdorësh në këtë telefon.','PIN-et nuk përputhen. Provo përsëri.');
        if(input)input.focus();return;
      }
      var s=session(),salt=randomSalt(),hash=await derive(pin,salt);
      if(!writeCfg({v:1,email:emailOf(s),salt:salt,hash:hash,created_at:new Date().toISOString()}))throw new Error('STORE_FAILED');
      resetAttempts();unlocked=true;markSessionUnlocked(s);hide();
      try{document.dispatchEvent(new CustomEvent('pst:mobile-pin-unlocked',{detail:{email:emailOf(s),mode:'setup'}}));}catch(e){}
      if(typeof originalStart==='function')originalStart();return;
    }
    var cfg=readCfg(),candidate=cfg&&cfg.salt?await derive(pin,cfg.salt):'';
    if(cfg&&sameHash(candidate,cfg.hash)){
      resetAttempts();clearLock();
      var s2=await resumeWithPin();
      if(!s2){
        if(input){input.value='';input.disabled=false;}
        setText('Shkruaj PIN-in','Nuk arrita ta rifreskoj sesionin e këtij telefoni. Provo përsëri pas pak.','Sesioni i pajisjes nuk u rifreskua.');
        if(input)input.focus();return;
      }
      unlocked=true;markSessionUnlocked(s2);hide();
      try{document.dispatchEvent(new CustomEvent('pst:mobile-pin-unlocked',{detail:{email:emailOf(s2),mode:'unlock'}}));}catch(e){}
      if(typeof originalStart==='function')originalStart();return;
    }
    var n=attempts()+1;setAttempts(n);
    if(n>=MAX_ATTEMPTS){
      setLock();
      if(input){input.value='';input.disabled=false;}
      setText('PIN i bllokuar përkohësisht','Prit 60 sekonda dhe provo përsëri.','Shumë tentativa të pasakta.');
      return;
    }
    if(input){input.value='';input.disabled=false;}
    setText('PIN i gabuar','Provo përsëri. Të mbetura: '+(MAX_ATTEMPTS-n),'PIN-i nuk përputhet.');
    if(input)input.focus();
  }catch(err){
    if(input)input.disabled=false;
    setText(mode==='setup'?'Krijo PIN-in':'Shkruaj PIN-in',mode==='setup'?'Provo përsëri.':'Provo përsëri pas pak.','PIN unlock nuk është i disponueshëm për momentin.');
  }
}
function clearSessionForFullLogin(){
  ['pristeel_session','pst_auth_remembered_session_v3','pst_auth_refresh_lock_v1'].forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
  try{sessionStorage.removeItem('pst_auth_restore_attempt_v3');}catch(e){}
}
function fullLogin(){
  setBypass();clearSessionUnlocked();clearSessionForFullLogin();hide();
  var gateEl=document.getElementById('auth-gate'),app=document.getElementById('app-shell-root');
  if(gateEl)gateEl.style.display='flex';if(app)app.style.display='none';
}
function pinConfiguredForDevice(){
  var cfg=readCfg();if(!cfg)return false;
  var s=identitySession();
  if(s&&emailOf(s)&&cfg.email&&emailOf(s)!==S(cfg.email).toLowerCase())return false;
  return true;
}
function coverWithPin(){
  if(!mobile()||!pinConfiguredForDevice())return false;
  var gateEl=document.getElementById('auth-gate'),app=document.getElementById('app-shell-root');
  if(gateEl)gateEl.style.display='none';if(app)app.style.display='none';
  show('unlock');return true;
}
function guardedStart(){
  if(typeof originalStart!=='function')return;
  if(!mobile()){unlocked=true;return originalStart();}
  var s=identitySession(),cfg=readCfg();
  if(cfg&&s&&emailOf(s)&&emailOf(s)!==S(cfg.email).toLowerCase()){clearCfg();cfg=null;}
  if(cfg){
    if(unlocked||sessionUnlocked(s)){unlocked=true;return originalStart();}
    show('unlock');return;
  }
  s=session();
  if(!usableSession(s))return originalStart();
  if(consumeBypass()){resetAttempts();unlocked=true;markSessionUnlocked(s);return originalStart();}
  show('setup');
}
function guardedLogout(){
  clearCfg();clearSessionUnlocked();clearSessionForFullLogin();unlocked=false;hide();
  if(typeof originalLogout==='function')return originalLogout();
  location.reload();
}
function install(){
  installCss();
  if(typeof originalStart==='function'){window.startApp=guardedStart;try{startApp=guardedStart;}catch(e){}}
  if(typeof originalLogout==='function'){window.doLogout=guardedLogout;try{doLogout=guardedLogout;}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(coverWithPin,0);},{once:true});
  else setTimeout(coverWithPin,0);
  window.addEventListener('load',function(){setTimeout(coverWithPin,0);});
  window.addEventListener('pageshow',function(){if(!unlocked&&!sessionUnlocked(identitySession()))setTimeout(coverWithPin,0);});
}
install();
window.PSTMobilePinUnlockV1={
  enabled:function(){return !!readCfg();},
  clear:clearCfg,
  lock:function(){if(mobile()&&readCfg()){clearSessionUnlocked();unlocked=false;show('unlock');return true;}return false;},
  _test:{mobile:mobile,readCfg:readCfg,attempts:attempts,validPin:validPin,emailOf:emailOf,usableSession:usableSession,rememberedSession:rememberedSession,restoreRememberedSession:restoreRememberedSession,pinConfiguredForDevice:pinConfiguredForDevice,sessionUnlocked:sessionUnlocked,locked:locked}
};
})();