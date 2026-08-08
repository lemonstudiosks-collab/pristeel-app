/* PRISTEEL duplicate manager button visibility fix.
 * UI-only: exposes the existing duplicate manager from the Projects register.
 * No database writes here.
 */
(function(){
'use strict';
if(window.__pstProjectDuplicateButtonFixV1)return;
window.__pstProjectDuplicateButtonFixV1=true;

function isProjectsVisible(){
  var p=document.getElementById('page-workspace-projects');
  if(!p)return false;
  var cs=window.getComputedStyle?getComputedStyle(p):null;
  return p.classList.contains('active') || p.style.display==='block' || !cs || cs.display!=='none';
}
function openManager(){
  var api=window.PSTProjectDuplicateManager;
  if(api&&typeof api.open==='function')return api.open();
  alert('Menaxheri i dublikatave ende nuk është ngarkuar. Rifresko faqen dhe provo përsëri.');
}
function makeButton(){
  var b=document.createElement('button');
  b.type='button';
  b.id='pst-pdm-btn';
  b.className='pst-pm-btn';
  b.textContent='Dublikatat';
  b.title='Gjej, fshij ose bashko projekte të dyfishta';
  b.onclick=openManager;
  b.style.cssText='height:36px;border:1px solid #BFD8E1;border-radius:10px;background:#F4FAFC;color:#3F7F98;padding:0 13px;font-size:9px;font-weight:760;cursor:pointer;white-space:nowrap';
  return b;
}
function install(){
  if(!isProjectsVisible())return false;
  var page=document.getElementById('page-workspace-projects');
  if(!page)return false;
  var existing=document.getElementById('pst-pdm-btn');
  if(existing){existing.onclick=openManager;return true;}
  var actions=page.querySelector('.pst-pm-head-actions');
  if(actions){actions.insertBefore(makeButton(),actions.firstChild);return true;}
  var head=page.querySelector('.pst-pm-head, .page-head, .page-header, header');
  if(head){
    var wrap=document.createElement('div');
    wrap.id='pst-pdm-fallback-actions';
    wrap.style.cssText='display:flex;justify-content:flex-end;gap:8px;margin:0 0 12px';
    wrap.appendChild(makeButton());
    head.insertAdjacentElement('afterend',wrap);
    return true;
  }
  return false;
}
function schedule(){[0,80,180,350,700,1200,2200,3500].forEach(function(ms){setTimeout(install,ms);});}

document.addEventListener('click',function(e){
  var el=e.target&&e.target.closest?e.target.closest('button,a,[data-key]'):null;
  if(!el)return;
  var key=String(el.getAttribute('data-key')||'').toLowerCase();
  var txt=String(el.textContent||'').toLowerCase().trim();
  if(key==='projects'||txt==='projektet'||txt.indexOf('projektet')===0)schedule();
},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
window.PSTProjectDuplicateButtonFix={install:install,schedule:schedule};
schedule();
})();
