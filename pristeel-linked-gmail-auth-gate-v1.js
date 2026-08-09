/* PRISTEEL linked-Gmail recovery auth gate v1
 * Prevents automatic OAuth popups after async recovery work.
 * If Gmail+Drive auth is missing, require an explicit user click and then resume the same project.
 */
(function(){
'use strict';
if(window.__pstLinkedGmailAuthGateV1)return;window.__pstLinkedGmailAuthGateV1=true;

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function auth(){return window.PSTGoogleWorkspaceAuth||null;}
function required(){var a=auth();return a?[a.gmailScope,a.driveScope].filter(Boolean):[];}
function cached(){var a=auth();if(!a)return'';try{if(typeof a.cachedToken==='function')return a.cachedToken(required())||'';if(typeof a.currentToken==='function')return a.currentToken(required())||'';}catch(e){}return'';}
function projectId(id){if(id)return String(id);try{var d=window.__pstIntegrityLastData;if(d&&d.project&&d.project.id)return String(d.project.id);}catch(e){}return String(window.__pstCurrentProjectId||'');}
function remove(){var x=document.getElementById('pst-linked-gmail-auth-gate');if(x)x.remove();}
function setMsg(text,type){var e=document.getElementById('pst-linked-gmail-auth-msg');if(!e)return;e.textContent=text||'';e.className='pst-lgag-msg '+(type||'');}
function ensureCss(){if(document.getElementById('pst-linked-gmail-auth-gate-css'))return;var s=document.createElement('style');s.id='pst-linked-gmail-auth-gate-css';s.textContent='.pst-lgag-bg{position:fixed;inset:0;z-index:2600;background:rgba(25,42,50,.48);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px}.pst-lgag-card{width:min(560px,94vw);background:#fff;border-radius:20px;box-shadow:0 28px 80px rgba(20,42,53,.25);padding:24px}.pst-lgag-card h3{margin:0 0 8px;font-size:20px}.pst-lgag-card p{margin:0 0 18px;color:#65757d;line-height:1.45}.pst-lgag-msg{min-height:18px;margin:0 0 14px;font-size:13px;color:#65757d}.pst-lgag-msg.err{color:#b34b3d}.pst-lgag-actions{display:flex;justify-content:flex-end;gap:10px}.pst-lgag-btn{border:1px solid #d5e1e6;background:#fff;color:#24343c;border-radius:12px;padding:10px 15px;font-weight:700;cursor:pointer}.pst-lgag-btn.primary{background:#4f97b1;border-color:#4f97b1;color:#fff}.pst-lgag-btn:disabled{opacity:.6;cursor:wait}';document.head.appendChild(s);}
function authorize(){var a=auth();if(!a)return Promise.reject(new Error('Moduli i autorizimit Google nuk është ngarkuar. Rifresko faqen dhe provo përsëri.'));if(typeof a.authorizeForIntake==='function')return a.authorizeForIntake();if(typeof a.getToken==='function')return a.getToken(required(),{interactive:true});if(window.PSTEmail&&typeof window.PSTEmail.authInteractive==='function')return window.PSTEmail.authInteractive();return Promise.reject(new Error('Autorizimi Google nuk është gati.'));}
function show(id,target){
  ensureCss();remove();
  var pid=projectId(id);if(!pid){return Promise.reject(new Error('Nuk u gjet projekti aktiv.'));}
  var name='projekti';try{var d=window.__pstIntegrityLastData;if(d&&d.project&&d.project.name)name=d.project.name;}catch(e){}
  document.body.insertAdjacentHTML('beforeend','<div class="pst-lgag-bg" id="pst-linked-gmail-auth-gate"><div class="pst-lgag-card"><h3>Lidhe Gmail & Drive</h3><p>Ky browser nuk ka ende një autorizim aktiv për Gmail dhe Google Drive. Autorizoje një herë dhe PRISTEEL do të vazhdojë automatikisht me <b>'+esc(name)+'</b>.</p><div class="pst-lgag-msg" id="pst-linked-gmail-auth-msg"></div><div class="pst-lgag-actions"><button type="button" class="pst-lgag-btn" id="pst-linked-gmail-auth-cancel">Mbyll</button><button type="button" class="pst-lgag-btn primary" id="pst-linked-gmail-auth-run">Autorizo Gmail & Drive</button></div></div></div>');
  document.getElementById('pst-linked-gmail-auth-cancel').onclick=remove;
  document.getElementById('pst-linked-gmail-auth-run').onclick=async function(){var b=this;try{b.disabled=true;b.textContent='Duke autorizuar…';setMsg('Po hapet Google…','');await authorize();setMsg('Autorizimi përfundoi. Duke vazhduar…','');remove();target(pid);}catch(e){b.disabled=false;b.textContent='Autorizo Gmail & Drive';setMsg(String(e&&e.message||e),'err');}};
  return false;
}
function install(){
  var target=window.pstRecoverLinkedProjectGmail;
  if(typeof target!=='function'||target.__pstLinkedGmailAuthGate)return false;
  function gated(id){var pid=projectId(id);if(cached())return target(pid);return show(pid,target);}
  gated.__pstLinkedGmailAuthGate=true;gated.__base=target;
  window.pstRecoverLinkedProjectGmail=gated;
  if(window.pstCollectProjectGmail===target)window.pstCollectProjectGmail=gated;
  return true;
}

install();
document.addEventListener('pst:modules-ready',function(){install();},{once:true});
window.PSTLinkedGmailAuthGateV1={install:install,show:show,cached:cached};
})();