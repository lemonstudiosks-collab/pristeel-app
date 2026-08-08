/* PRISTEEL Gmail intake auth bridge v1
 * Keeps direct Gmail -> platform intake usable when Google token expired.
 * No automatic popup: authorization starts only from an explicit user click.
 */
(function(){
'use strict';
if(window.__pstGmailIntakeAuthBridgeV1)return;
window.__pstGmailIntakeAuthBridgeV1=true;
function intakeActive(){try{return new URL(location.href).searchParams.get('gmail_intake')==='1';}catch(e){return false;}}
function hasToken(){var G=window.PSTGoogleWorkspaceAuth;return !!(G&&G.currentToken&&G.currentToken([G.gmailScope]));}
function remove(){var e=document.getElementById('pst-gmail-intake-auth-bridge');if(e)e.remove();}
function target(){return location.href;}
function render(){
  if(!intakeActive()||hasToken()){remove();return false;}
  if(document.getElementById('pst-gmail-intake-auth-bridge'))return true;
  var bg=document.createElement('div');bg.id='pst-gmail-intake-auth-bridge';bg.style.cssText='position:fixed;inset:0;z-index:1000001;background:rgba(20,31,37,.48);display:flex;align-items:center;justify-content:center;padding:18px';
  bg.innerHTML='<div style="width:min(470px,94vw);background:#fff;border-radius:13px;box-shadow:0 22px 65px rgba(0,0,0,.25);padding:20px"><div style="font-size:17px;font-weight:750;margin-bottom:6px">Lidhe Gmail me PRISTEEL</div><div style="font-size:11px;color:#6f7c83;line-height:1.5;margin-bottom:15px">Sesioni i Google ka skaduar ose nuk është i autorizuar. Autorizoje një herë dhe thread-i hapet menjëherë në platformë.</div><div id="pst-gia-status" style="font-size:10px;color:#6f7c83;margin-bottom:10px"></div><div style="display:flex;justify-content:flex-end;gap:8px"><button id="pst-gia-close" style="height:34px;padding:0 13px;border:1px solid #d6e0e4;background:#fff;border-radius:7px;cursor:pointer">Mbyll</button><button id="pst-gia-auth" style="height:34px;padding:0 15px;border:1px solid #3f7f98;background:#3f7f98;color:#fff;border-radius:7px;font-weight:700;cursor:pointer">Autorizo Gmail dhe Drive</button></div></div>';
  document.body.appendChild(bg);
  bg.querySelector('#pst-gia-close').onclick=remove;
  bg.querySelector('#pst-gia-auth').onclick=async function(){
    var b=this,s=bg.querySelector('#pst-gia-status'),G=window.PSTGoogleWorkspaceAuth;
    if(!G||!G.authorizeForIntake){s.textContent='Moduli Google nuk është gati. Rifresko faqen.';return;}
    b.disabled=true;s.textContent='Po hap autorizimin Google…';
    try{await G.authorizeForIntake();remove();var I=window.PSTGmailIntakeV3||window.PSTGmailIntakeV2;if(I&&typeof I.open==='function')I.open(target());else document.dispatchEvent(new CustomEvent('pst:gmail-intake-request',{detail:{target:target()}}));}
    catch(e){b.disabled=false;s.textContent=(e&&e.message)||String(e);}
  };
  return true;
}
function start(){setTimeout(render,0);setTimeout(render,250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
document.addEventListener('pst:modules-ready',render,{once:true});
window.PSTGmailIntakeAuthBridgeV1={render:render};
})();