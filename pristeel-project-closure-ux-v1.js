/* PRISTEEL closed-project UX
 * Refreshes the modern register after loss/closure and marks final projects clearly.
 */
(function(){
'use strict';
if(window.__pstProjectClosureUxV1)return;
window.__pstProjectClosureUxV1=true;

var RED='#A64B42',RED_BG='#F9ECEA',GREY='#68747B';
var meta={},reasons={},refreshing=false,applyTimer=null,observer=null,wrapped={};
function arr(v){return Array.isArray(v)?v:[];}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function group(status){var s=norm(status);if(/humb|lost|cancel|refuz/.test(s))return'lost';if(/mbyllur|closed/.test(s))return'closed';if(/arkiv|archiv/.test(s))return'archived';if(/fituar|won|realizuar/.test(s))return'won';return'open';}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

var style=document.createElement('style');style.id='pst-project-closure-ux-style';style.textContent=`
.pst-pm-row.pst-project-closed{border-color:#E6C8C4!important;background:linear-gradient(90deg,#FFF9F8,#FFF)!important;order:1200!important}
.pst-pm-row.pst-project-closed:before{background:${RED}!important;width:5px!important}.pst-pm-row.pst-project-closed .pst-pm-name{color:#6F302A}.pst-pm-row.pst-project-closed .pst-pm-open{background:#A64B42!important;box-shadow:none!important}
.pst-project-closure-note{margin-top:6px;padding:5px 8px;border-radius:7px;background:${RED_BG};color:#8E3A32;font-size:8.5px;font-weight:650;line-height:1.35;white-space:normal;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.pst-pm-row.pst-project-won{order:900!important}.pst-pm-row.pst-project-archived{order:1100!important;opacity:.82}
.pst-pm-board-card.pst-project-closed{border-color:#E6C8C4!important;background:#FFF9F8!important;order:1200!important}.pst-pm-board-card.pst-project-closed:before{background:${RED}!important}
`;
document.head.appendChild(style);

async function loadMeta(){
  if(refreshing||typeof window.supaFetch!=='function')return;refreshing=true;
  try{
    var data=await Promise.all([
      window.supaFetch('projects?select=id,status,updated_at&limit=3000').catch(function(){return[];}),
      window.supaFetch('dismissed_items?item_type=eq.project_loss&select=project_id,reason,created_at&order=created_at.desc&limit=3000').catch(function(){return[];})
    ]);
    meta={};arr(data[0]).forEach(function(p){meta[String(p.id)]=p;});
    reasons={};arr(data[1]).forEach(function(r){var id=String(r.project_id||'');if(id&&!reasons[id])reasons[id]=r.reason||'';});
  }finally{refreshing=false;}
}
function decorateRow(row){
  var id=String(row.getAttribute('data-project-id')||row.getAttribute('data-pm-open')||''),p=meta[id];if(!id||!p)return;
  var g=group(p.status),closed=g==='lost'||g==='closed';
  row.classList.toggle('pst-project-closed',closed);row.classList.toggle('pst-project-won',g==='won');row.classList.toggle('pst-project-archived',g==='archived');
  if(closed){
    row.style.setProperty('--urgency',RED);
    var badge=row.querySelector('.pst-pm-badge');if(badge){badge.textContent='Mbyllur';badge.style.setProperty('--c',RED);badge.style.setProperty('--bg',RED_BG);}
    var main=row.querySelector('.pst-pm-main'),note=main&&main.querySelector('.pst-project-closure-note');
    if(main&&!note){note=document.createElement('div');note.className='pst-project-closure-note';main.appendChild(note);}
    if(note)note.innerHTML='<strong>Mbyllur</strong>'+(reasons[id]?' · '+esc(reasons[id]):'');
  }else{
    var old=row.querySelector('.pst-project-closure-note');if(old)old.remove();
  }
}
function apply(){
  clearTimeout(applyTimer);applyTimer=setTimeout(function(){
    document.querySelectorAll('.pst-pm-row[data-project-id]').forEach(decorateRow);
    document.querySelectorAll('.pst-pm-board-card[data-pm-open]').forEach(decorateRow);
  },40);
}
async function refreshAndApply(){await loadMeta();apply();}
function wrap(name){
  var fn=window[name];if(typeof fn!=='function'||wrapped[name]||fn.__pstClosureWrapped)return;
  wrapped[name]=true;window[name]=function(){var result=fn.apply(this,arguments);return Promise.resolve(result).then(function(){return refreshAndApply();});};window[name].__pstClosureWrapped=true;
}
function ensureHooks(){wrap('pstProjectsModernOpen');wrap('pstProjectsModernRefresh');}
function openAllFilter(){var all=document.querySelector('[data-pm-filter="all"]');if(all&&!all.classList.contains('on'))all.click();}
function afterSuccessfulClose(){
  setTimeout(async function(){
    try{
      ensureHooks();
      if(typeof window.pstProjectsModernOpen==='function')await window.pstProjectsModernOpen();
      else if(typeof window.pstWorkspaceGo==='function')await window.pstWorkspaceGo('projects');
      openAllFilter();await refreshAndApply();
    }catch(e){console.warn('PRISTEEL closure refresh:',e);}
  },180);
}
function watchCloseSave(event){
  var button=event.target&&event.target.closest&&event.target.closest('#pst-loss-save');if(!button)return;
  var modal=document.getElementById('pst-loss-bg'),tries=0,timer=setInterval(function(){
    tries++;
    if(!document.getElementById('pst-loss-bg')){clearInterval(timer);afterSuccessfulClose();}
    else if(tries>160){clearInterval(timer);}
  },100);
}
function observe(){
  if(observer||!document.body)return;
  observer=new MutationObserver(function(){ensureHooks();apply();});
  observer.observe(document.body,{subtree:true,childList:true});
}
document.addEventListener('click',watchCloseSave,true);
function start(){ensureHooks();observe();refreshAndApply();setInterval(ensureHooks,700);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.PSTProjectClosureUX={refresh:refreshAndApply,apply:apply,group:group};
})();