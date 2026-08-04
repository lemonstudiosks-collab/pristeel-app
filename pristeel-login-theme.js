/* PRISTEEL native login theme
 * Keeps the working native authentication flow and changes presentation only.
 */
(function(){
'use strict';
if(window.__pstLoginThemeLoaded)return;
window.__pstLoginThemeLoaded=true;

function visible(el){
  if(!el)return false;
  var s=getComputedStyle(el),r=el.getBoundingClientRect();
  return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
}
function commonAncestor(nodes){
  if(!nodes.length)return null;
  var p=nodes[0];
  while(p&&p!==document.body){
    if(nodes.every(function(n){return p.contains(n);}))return p;
    p=p.parentElement;
  }
  return null;
}
function injectCss(){
  if(document.getElementById('pst-native-login-theme-css'))return;
  var s=document.createElement('style');
  s.id='pst-native-login-theme-css';
  s.textContent=`
body.pst-native-login{margin:0!important;min-height:100vh!important;background:
 radial-gradient(circle at 18% 16%,rgba(91,155,179,.13),transparent 31%),
 radial-gradient(circle at 84% 82%,rgba(63,127,152,.10),transparent 35%),
 linear-gradient(145deg,#F6FBFD,#EEF6F8)!important;color:#20272B!important}
body.pst-native-login:before{content:"";position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(91,155,179,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(91,155,179,.035) 1px,transparent 1px);background-size:36px 36px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.7),transparent 88%)}
body.pst-native-login .pst-native-login-card{position:relative!important;width:min(430px,calc(100vw - 36px))!important;max-width:430px!important;background:rgba(255,255,255,.96)!important;border:1px solid #D8E7EC!important;border-radius:22px!important;padding:34px 34px 31px!important;box-shadow:0 24px 70px rgba(35,76,91,.16)!important;backdrop-filter:blur(10px)!important}
body.pst-native-login .pst-native-login-card input{width:100%!important;height:48px!important;border:1px solid #D5E2E7!important;border-radius:11px!important;background:#FBFDFE!important;padding:0 14px!important;color:#20272B!important;font-size:13px!important;box-shadow:none!important;outline:none!important;transition:border-color .15s,box-shadow .15s!important}
body.pst-native-login .pst-native-login-card input:focus{border-color:#5B9BB3!important;box-shadow:0 0 0 4px rgba(91,155,179,.13)!important;background:#fff!important}
body.pst-native-login .pst-native-login-card input::placeholder{color:#98A5AB!important}
body.pst-native-login .pst-native-login-card button.pst-login-submit{width:100%!important;height:47px!important;border:0!important;border-radius:11px!important;background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;color:#fff!important;font-size:13px!important;font-weight:750!important;box-shadow:0 10px 24px rgba(62,126,150,.22)!important;cursor:pointer!important;transition:transform .15s,box-shadow .15s!important}
body.pst-native-login .pst-native-login-card button.pst-login-submit:hover{transform:translateY(-1px)!important;box-shadow:0 13px 30px rgba(62,126,150,.27)!important}
body.pst-native-login .pst-native-login-card button.pst-login-submit:disabled{opacity:.62!important;transform:none!important;cursor:wait!important}
#pst-login-brand{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:24px}
#pst-login-brand .pst-login-mark{width:52px;height:52px;border-radius:16px 16px 16px 6px;background:linear-gradient(145deg,#72AEC4,#3E7E96);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:800;box-shadow:0 11px 25px rgba(62,126,150,.24);margin-bottom:13px}
#pst-login-brand .pst-login-name{font-size:20px;font-weight:800;letter-spacing:.2px;color:#20272B}
#pst-login-brand .pst-login-sub{font-size:11.5px;color:#7B898F;margin-top:4px}
#pst-login-brand .pst-login-note{font-size:10.5px;color:#8D999E;margin-top:12px;line-height:1.45}
body.pst-native-login .pst-login-hidden-brand{display:none!important}
@media(max-width:520px){body.pst-native-login .pst-native-login-card{padding:28px 22px 25px!important;border-radius:18px!important}}
`;
  document.head.appendChild(s);
}
function apply(){
  var password=Array.prototype.find.call(document.querySelectorAll('input[type="password"]'),visible);
  if(!password){document.body.classList.remove('pst-native-login');return false;}
  var inputs=Array.prototype.filter.call(document.querySelectorAll('input'),function(x){return visible(x);});
  var email=inputs.filter(function(x){return x!==password&&(x.type==='email'||/email|mail/i.test(x.placeholder||'')||/email|mail/i.test(x.name||''));})[0]||inputs.filter(function(x){return x!==password})[0];
  var buttons=Array.prototype.filter.call(document.querySelectorAll('button,input[type="submit"]'),visible);
  var submit=buttons.filter(function(x){var t=(x.textContent||x.value||'').trim();return /^(hyr|login|log in|sign in|anmelden|prijavi)/i.test(t);})[0]||buttons[0];
  if(!email||!submit)return false;
  var card=commonAncestor([email,password,submit]);
  if(!card)return false;
  while(card.parentElement&&card.parentElement!==document.body&&card.getBoundingClientRect().width>560){card=card.firstElementChild&&card.firstElementChild.contains(email)?card.firstElementChild:card;break;}
  document.body.classList.add('pst-native-login');
  card.classList.add('pst-native-login-card');
  submit.classList.add('pst-login-submit');
  if((submit.textContent||'').trim())submit.textContent='Hyr në platformë';
  else submit.value='Hyr në platformë';
  email.setAttribute('autocomplete','username');
  password.setAttribute('autocomplete','current-password');
  if(!document.getElementById('pst-login-brand')){
    var brand=document.createElement('div');brand.id='pst-login-brand';
    brand.innerHTML='<div class="pst-login-mark">P</div><div class="pst-login-name">PRISTEEL</div><div class="pst-login-sub">Workspace</div><div class="pst-login-note">Projektet, dokumentet dhe komunikimi në një vend.</div>';
    card.insertBefore(brand,card.firstChild);
  }
  Array.prototype.forEach.call(card.querySelectorAll('*'),function(el){
    if(el.closest('#pst-login-brand'))return;
    var t=(el.textContent||'').trim();
    if((t==='PRISTEEL'||t==='Procurement Platform')&&el.children.length===0)el.classList.add('pst-login-hidden-brand');
  });
  return true;
}
injectCss();
var observer=new MutationObserver(function(){apply();});
observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
var n=0,t=setInterval(function(){apply();if(++n>240)clearInterval(t);},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
