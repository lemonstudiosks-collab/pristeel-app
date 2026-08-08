/* PRISTEEL duplicate manager button visibility fix.
 * UI-only: exposes the existing duplicate manager from the Projects register.
 * If Projects was opened before the modern register finished loading, upgrade that page once.
 * Also exposes the duplicate manager directly inside each project's three-dot menu.
 * No database writes here.
 */
(function(){
'use strict';
if(window.__pstProjectDuplicateButtonFixV1)return;
window.__pstProjectDuplicateButtonFixV1=true;

var upgradeTried=false,upgrading=false;
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
function injectIntoActionMenu(){
  var menu=document.getElementById('pst-pm-menu');
  if(!menu||menu.querySelector('[data-pst-duplicates-menu]'))return false;
  var b=document.createElement('button');
  b.type='button';
  b.setAttribute('data-pst-duplicates-menu','1');
  b.textContent='Menaxho dublikatat';
  b.title='Kontrollo dhe bashko projekte të dyfishta';
  b.style.cssText='color:#3F7F98;font-weight:700;border-top:1px solid #EEF2F4;margin-top:3px;padding-top:2px';
  b.addEventListener('click',function(e){
    e.preventDefault();e.stopPropagation();
    var m=document.getElementById('pst-pm-menu');if(m)m.remove();
    openManager();
  });
  var danger=menu.querySelector('button.danger,[data-act="delete"]');
  if(danger)menu.insertBefore(b,danger);else menu.appendChild(b);
  return true;
}
function upgradeModernIfNeeded(){
  if(upgradeTried||upgrading||!isProjectsVisible()||typeof window.pstProjectsModernOpen!=='function')return false;
  var page=document.getElementById('page-workspace-projects');
  if(page&&page.querySelector('.pst-pm-head-actions'))return false;
  upgradeTried=true;upgrading=true;
  try{
    Promise.resolve(window.pstProjectsModernOpen()).then(function(){upgrading=false;setTimeout(install,0);},function(){upgrading=false;});
    return true;
  }catch(e){upgrading=false;return false;}
}
function install(){
  if(!isProjectsVisible())return false;
  var page=document.getElementById('page-workspace-projects');
  if(!page)return false;
  var existing=document.getElementById('pst-pdm-btn');
  if(existing){existing.onclick=openManager;return true;}
  var actions=page.querySelector('.pst-pm-head-actions');
  if(actions){actions.insertBefore(makeButton(),actions.firstChild);return true;}
  if(upgradeModernIfNeeded())return false;
  var head=page.querySelector('.pst-pm-head, .page-head, .page-header, header');
  if(head){
    var wrap=document.getElementById('pst-pdm-fallback-actions');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='pst-pdm-fallback-actions';
      wrap.style.cssText='display:flex;justify-content:flex-end;gap:8px;margin:0 0 12px';
      wrap.appendChild(makeButton());
      head.insertAdjacentElement('afterend',wrap);
    }
    return true;
  }
  return false;
}
function schedule(){[0,80,180,350,700,1200,2200,3500].forEach(function(ms){setTimeout(install,ms);});}

document.addEventListener('click',function(e){
  var more=e.target&&e.target.closest?e.target.closest('.pst-pm-more,[data-pm-more]'):null;
  if(more){setTimeout(injectIntoActionMenu,0);setTimeout(injectIntoActionMenu,40);}
  var el=e.target&&e.target.closest?e.target.closest('button,a,[data-key]'):null;
  if(!el)return;
  var key=String(el.getAttribute('data-key')||'').toLowerCase();
  var txt=String(el.textContent||'').toLowerCase().trim();
  if(key==='projects'||txt==='projektet'||txt.indexOf('projektet')===0){upgradeTried=false;schedule();}
},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
window.PSTProjectDuplicateButtonFix={install:install,schedule:schedule,injectIntoActionMenu:injectIntoActionMenu};
schedule();
})();
