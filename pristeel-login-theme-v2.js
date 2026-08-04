/* PRISTEEL native login theme v2: presentation only */
(function(){
'use strict';
if(window.__pstLoginThemeV2Loaded)return;
window.__pstLoginThemeV2Loaded=true;

function visible(el){if(!el)return false;var s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;}
function common(nodes){var p=nodes[0];while(p&&p!==document.body){if(nodes.every(function(n){return p.contains(n);}))return p;p=p.parentElement;}return null;}
function css(){if(document.getElementById('pst-login-theme-v2-css'))return;var s=document.createElement('style');s.id='pst-login-theme-v2-css';s.textContent=`
body.pst-login-v2{margin:0!important;min-height:100vh!important;background:radial-gradient(circle at 16% 15%,rgba(91,155,179,.14),transparent 31%),radial-gradient(circle at 84% 82%,rgba(63,127,152,.10),transparent 35%),linear-gradient(145deg,#F6FBFD,#EEF6F8)!important;color:#20272B!important}
body.pst-login-v2:before{content:"";position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(91,155,179,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(91,155,179,.035) 1px,transparent 1px);background-size:36px 36px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.7),transparent 88%)}
body.pst-login-v2 .pst-login-card-v2{position:relative!important;width:min(430px,calc(100vw - 36px))!important;max-width:430px!important;background:rgba(255,255,255,.97)!important;border:1px solid #D8E7EC!important;border-radius:22px!important;padding:34px 34px 31px!important;box-shadow:0 24px 70px rgba(35,76,91,.16)!important;backdrop-filter:blur(10px)!important}
body.pst-login-v2 .pst-login-card-v2 input{width:100%!important;height:48px!important;border:1px solid #D5E2E7!important;border-radius:11px!important;background:#FBFDFE!important;padding:0 14px!important;color:#20272B!important;font-size:13px!important;box-shadow:none!important;outline:none!important}
body.pst-login-v2 .pst-login-card-v2 input:focus{border-color:#5B9BB3!important;box-shadow:0 0 0 4px rgba(91,155,179,.13)!important;background:#fff!important}
body.pst-login-v2 .pst-login-card-v2 input::placeholder{color:#98A5AB!important}
body.pst-login-v2 .pst-login-submit-v2{width:100%!important;height:47px!important;border:0!important;border-radius:11px!important;background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;color:#fff!important;font-size:13px!important;font-weight:750!important;box-shadow:0 10px 24px rgba(62,126,150,.22)!important;cursor:pointer!important}
body.pst-login-v2 .pst-login-submit-v2:hover{transform:translateY(-1px)!important;box-shadow:0 13px 30px rgba(62,126,150,.27)!important}
#pst-login-brand-v2{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:24px}
#pst-login-brand-v2 .mark{width:52px;height:52px;border-radius:16px 16px 16px 6px;background:linear-gradient(145deg,#72AEC4,#3E7E96);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:800;box-shadow:0 11px 25px rgba(62,126,150,.24);margin-bottom:13px}
#pst-login-brand-v2 .name{font-size:20px;font-weight:800;letter-spacing:.2px;color:#20272B}
#pst-login-brand-v2 .sub{font-size:11.5px;color:#7B898F;margin-top:4px}
#pst-login-brand-v2 .note{font-size:10.5px;color:#8D999E;margin-top:12px;line-height:1.45}
body.pst-login-v2 .pst-hide-old-login-brand{display:none!important}
@media(max-width:520px){body.pst-login-v2 .pst-login-card-v2{padding:28px 22px 25px!important;border-radius:18px!important}}
`;document.head.appendChild(s);}
function apply(){
 var pass=Array.prototype.find.call(document.querySelectorAll('input[type="password"]'),visible);if(!pass){document.body.classList.remove('pst-login-v2');return false;}
 var inputs=Array.prototype.filter.call(document.querySelectorAll('input'),visible);var email=inputs.filter(function(x){return x!==pass&&(x.type==='email'||/email|mail/i.test((x.placeholder||'')+(x.name||'')));})[0]||inputs.filter(function(x){return x!==pass})[0];
 var controls=Array.prototype.filter.call(document.querySelectorAll('button,input[type="submit"]'),visible);var submit=controls.filter(function(x){return /^(hyr|login|log in|sign in|anmelden|prijavi)/i.test((x.textContent||x.value||'').trim());})[0]||controls[0];
 if(!email||!submit)return false;var card=common([email,pass,submit]);if(!card)return false;
 if(card.classList.contains('pst-login-card-v2'))return true;
 document.body.classList.add('pst-login-v2');card.classList.add('pst-login-card-v2');submit.classList.add('pst-login-submit-v2');
 if(submit.tagName==='INPUT')submit.value='Hyr në platformë';else submit.textContent='Hyr në platformë';
 email.autocomplete='username';pass.autocomplete='current-password';
 var brand=document.createElement('div');brand.id='pst-login-brand-v2';brand.innerHTML='<div class="mark">P</div><div class="name">PRISTEEL</div><div class="sub">Workspace</div><div class="note">Projektet, dokumentet dhe komunikimi në një vend.</div>';card.insertBefore(brand,card.firstChild);
 Array.prototype.forEach.call(card.querySelectorAll('*'),function(el){if(el.closest('#pst-login-brand-v2'))return;var t=(el.textContent||'').trim();if((t==='PRISTEEL'||t==='Procurement Platform')&&el.children.length===0)el.classList.add('pst-hide-old-login-brand');});
 return true;
}
css();var count=0,t=setInterval(function(){var done=apply();if(done&&++count>12)clearInterval(t);else if(++count>240)clearInterval(t);},250);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
