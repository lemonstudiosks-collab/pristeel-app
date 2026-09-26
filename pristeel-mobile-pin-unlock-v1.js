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
var BYPASS_KEY='pst_mobile_pin_bypass_once_v1';
var MAX_ATTEMPTS=5;
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
function clearCfg(){try{localStorage.removeItem(CFG_KEY);}catch(e){} resetAttempts();}
function attempts(){try{return Math.max(0,parseInt(localStorage.getItem(ATTEMPTS_KEY)||'0',10)||0);}catch(e){return 0;}}
function setAttempts(n){try{localStorage.setItem(ATTEMPTS_KEY,String(Math.max(0,n||0)));}catch(e){}}
function resetAttempts(){try{localStorage.removeItem(ATTEMPTS_KEY);}catch(e){}}
function consumeBypass(){
  try{
    if(sessionStorage.getItem(BYPASS_KEY)==='1'){sessionStorage.removeItem(BYPASS_KEY);return true;}
  }catch(e){}
  return false;
}
function setBypass(){try{sessionStorage.setItem(BYPASS_KEY,'1');}catch(e){}}
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
  g.innerHTML='<div class="pst-pin-card"><div class="pst-pin-logo">P</div><h2 data-pst-pin-title>Shkruaj PIN-in</h2><p data-pst-pin-sub>4 shifrat e tua për të hapur PPPP.</p><input class="pst-pin-input" data-pst-pin-input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="PIN me 4 shifra"><div class="pst-pin-error" data-pst-pin-error></div><div class="pst-pin-actions"><button type="button" class="pst-pin-primary" data-pst-pin-submit>Hap PPPP</button><button type="button" class="pst-pin-secondary" data-pst-pin-skip style="display:none">Jo tani</button><button type="button" class="pst-pin-link" data-pst-pin-email>Hyr me email dhe fjalëkalim</button></div><div class="pst-pin-note">PIN-i ruhet vetëm në këtë pajisje dhe nuk zëvendëson llogarinë e PPPP-së.</div></div>';
  document.body.appendChild(g);
  var input=g.querySelector('[data-pst-pin-input]');
  input.addEventListener('input',function(){
    this.value=this.value.replace(/\D/g,'').slice(0,4);
    if(this.value.length===4)setTimeout(submit,60);
  });
  input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();submit();}});
  g.querySelector('[data-pst-pin-submit]').addEventListener('click',submit);
  g.querySelector('[data-pst-pin-skip]').addEventListener('click',function(){hide();unlocked=true;if(typeof originalStart==='function')originalStart();});
  g.querySelector('[data-pst-pin-email]').addEventListener('click',fullLogin);
  return g;
}
function setText(title,sub,error){
  var g=gate(),t=g.querySelector('[data-pst-pin-title]'),s=g.querySelector('[data-pst-pin-sub]'),e=g.querySelector('[data-pst-pin-error]');
  if(t)t.textContent=title||'';if(s)s.textContent=sub||'';if(e)e.textContent=error||'';
}
function show(which){
  mode=which;installCss();var g=gate(),input=g.querySelector('[data-pst-pin-input]'),skip=g.querySelector('[data-pst-pin-skip]'),btn=g.querySelector('[data-pst-pin-submit]');
  g.classList.add('on');if(input){input.value='';input.disabled=false;}
  setupFirstPin='';
  if(which==='setup'){setText('Krijo PIN-in','Vendos 4 shifra që do t’i përdorësh në këtë telefon.','');if(skip)skip.style.display='block';if(btn)btn.textContent='Vazhdo';}
  else{var left=Math.max(0,MAX_ATTEMPTS-attempts());setText('Shkruaj PIN-in','4 shifrat e tua për të hapur PPPP'+(left<MAX_ATTEMPTS?' · '+left+' tentativa të mbetura':''),'');if(skip)skip.style.display='none';if(btn)btn.textContent='Hap PPPP';}
  setTimeout(function(){try{input&&input.focus();}catch(e){}},80);
}
function hide(){var g=document.getElementById('pst-mobile-pin-gate');if(g)g.classList.remove('on');}
async function submit(){
  var g=gate(),input=g.querySelector('[data-pst-pin-input]'),pin=S(input&&input.value);
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
      resetAttempts();unlocked=true;hide();if(typeof originalStart==='function')originalStart();return;
    }
    var cfg=readCfg(),candidate=cfg&&cfg.salt?await derive(pin,cfg.salt):'';
    if(cfg&&sameHash(candidate,cfg.hash)){
      resetAttempts();unlocked=true;hide();if(typeof originalStart==='function')originalStart();return;
    }
    var n=attempts()+1;setAttempts(n);
    if(n>=MAX_ATTEMPTS){fullLogin();return;}
    if(input){input.value='';input.disabled=false;}
    setText('PIN i gabuar','Provo përsëri. Të mbetura: '+(MAX_ATTEMPTS-n),'PIN-i nuk përputhet.');
    if(input)input.focus();
  }catch(err){
    if(input)input.disabled=false;
    setText(mode==='setup'?'Krijo PIN-in':'Shkruaj PIN-in','Mund të vazhdosh me hyrjen normale.','PIN unlock nuk është i disponueshëm në këtë pajisje.');
  }
}
function clearSessionForFullLogin(){
  ['pristeel_session','pst_auth_remembered_session_v3','pst_auth_refresh_lock_v1'].forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
  try{sessionStorage.removeItem('pst_auth_restore_attempt_v3');}catch(e){}
}
function fullLogin(){
  setBypass();clearSessionForFullLogin();hide();
  var gateEl=document.getElementById('auth-gate'),app=document.getElementById('app-shell-root');
  if(gateEl)gateEl.style.display='flex';if(app)app.style.display='none';
  setTimeout(function(){try{var e=document.getElementById('auth-email');if(e)e.focus();}catch(x){}},80);
}
function guardedStart(){
  if(typeof originalStart!=='function')return;
  if(!mobile()){unlocked=true;return originalStart();}
  var s=session();if(!usableSession(s)){return originalStart();}
  if(consumeBypass()){resetAttempts();unlocked=true;return originalStart();}
  if(unlocked)return originalStart();
  var cfg=readCfg();
  if(cfg&&emailOf(s)!==S(cfg.email).toLowerCase()){clearCfg();cfg=null;}
  if(!cfg){show('setup');return;}
  show('unlock');
}
function guardedLogout(){
  clearCfg();clearSessionForFullLogin();unlocked=false;hide();
  if(typeof originalLogout==='function')return originalLogout();
  location.reload();
}
function install(){
  installCss();
  if(typeof originalStart==='function'){window.startApp=guardedStart;try{startApp=guardedStart;}catch(e){}}
  if(typeof originalLogout==='function'){window.doLogout=guardedLogout;try{doLogout=guardedLogout;}catch(e){}}
}
install();
window.PSTMobilePinUnlockV1={
  enabled:function(){return !!readCfg();},
  clear:clearCfg,
  lock:function(){if(mobile()&&readCfg()){unlocked=false;show('unlock');return true;}return false;},
  _test:{mobile:mobile,readCfg:readCfg,attempts:attempts,validPin:validPin,emailOf:emailOf,usableSession:usableSession}
};
})();