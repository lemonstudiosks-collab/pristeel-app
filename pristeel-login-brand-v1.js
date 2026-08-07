/* PRISTEEL login brand v1
 * Presentation-only branding for the existing auth gate.
 * Does not submit, intercept or replace authentication logic.
 */
(function(){
'use strict';
if(window.__pstLoginBrandV1)return;
window.__pstLoginBrandV1=true;

function mark(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8c.7 5.45 4.75 9.5 10.2 10.2-5.45.7-9.5 4.75-10.2 10.2C11.3 16.75 7.25 12.7 1.8 12 7.25 11.3 11.3 7.25 12 1.8Z"/></svg>';}
function apply(){
  var gate=document.getElementById('auth-gate');
  var form=document.getElementById('auth-form');
  if(!gate||!form)return false;
  gate.classList.add('pst-auth-branded');
  if(!form.querySelector('.pst-auth-brand')){
    var brand=document.createElement('div');
    brand.className='pst-auth-brand';
    brand.innerHTML='<div class="pst-auth-mark">'+mark()+'</div><div class="pst-auth-name">PRISTEEL</div><div class="pst-auth-sub">Procurement Projects Platform</div>';
    form.insertBefore(brand,form.firstChild);
  }
  return true;
}
function css(){
  if(document.getElementById('pst-login-brand-v1-style'))return;
  var s=document.createElement('style');
  s.id='pst-login-brand-v1-style';
  s.textContent=`
#auth-gate.pst-auth-branded{background:radial-gradient(circle at 72% 14%,rgba(103,168,192,.14),transparent 34%),linear-gradient(145deg,#F8FBFC,#EEF6F8)!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
#auth-gate.pst-auth-branded #auth-form{background:#fff!important;border:1px solid #DCE8EC!important;border-radius:18px!important;box-shadow:0 22px 60px rgba(45,82,97,.12)!important;padding:30px 32px!important;max-width:390px!important;width:calc(100% - 32px)!important}
#auth-gate.pst-auth-branded .pst-auth-brand{text-align:center;margin-bottom:24px;color:#253239}
#auth-gate.pst-auth-branded .pst-auth-mark{width:52px;height:52px;margin:0 auto 12px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(145deg,#67A8C0,#3F7F98);box-shadow:0 13px 30px rgba(63,127,152,.2);color:#fff}
#auth-gate.pst-auth-branded .pst-auth-mark svg{width:27px;height:27px;fill:currentColor}
#auth-gate.pst-auth-branded .pst-auth-name{font-size:20px;font-weight:800;letter-spacing:.45px}
#auth-gate.pst-auth-branded .pst-auth-sub{font-size:10.5px;color:#7D8B91;margin-top:3px}
#auth-gate.pst-auth-branded input{border:1px solid #D8E3E7!important;border-radius:10px!important;background:#FBFDFE!important;box-shadow:none!important}
#auth-gate.pst-auth-branded input:focus{border-color:#67A8C0!important;box-shadow:0 0 0 3px rgba(91,155,179,.11)!important}
#auth-gate.pst-auth-branded button[type="submit"]{border:0!important;border-radius:10px!important;background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;color:#fff!important;font-weight:760!important;box-shadow:0 8px 20px rgba(63,127,152,.16)!important}
#auth-gate.pst-auth-branded button[type="submit"]:hover{background:linear-gradient(135deg,#5F9FB7,#36758E)!important}
`;
  document.head.appendChild(s);
}
css();
function schedule(){[0,80,250,700,1500].forEach(function(ms){setTimeout(apply,ms);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.PSTLoginBrandV1={apply:apply};
})();
