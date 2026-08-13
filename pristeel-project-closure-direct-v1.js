/* PRISTEEL direct closed-project rendering. No observers, no intervals. */
(function(){
'use strict';
if(window.__pstProjectClosureDirectV1)return;
window.__pstProjectClosureDirectV1=true;
var RED='#A64B42',RED_BG='#F9ECEA',wrapped=false;
function arr(v){return Array.isArray(v)?v:[];}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function group(v){var s=norm(v);if(/arkiv|archiv/.test(s))return'archived';if(s==='fituar'||s==='won'||s==='closedwon'||/\bfituar\b/.test(s))return'won';if(/realizuar|humb|lost|cancel|refuz|mbyllur|closed/.test(s))return'closed';return'open';}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
var style=document.createElement('style');style.id='pst-project-closure-direct-style';style.textContent=`
.pst-pm-list{display:flex!important;flex-direction:column!important}.pst-pm-row.pst-project-closed{border-color:#E6C8C4!important;background:linear-gradient(90deg,#FFF8F7,#FFF)!important}.pst-pm-row.pst-project-closed:before{background:${RED}!important;width:5px!important}.pst-pm-row.pst-project-closed .pst-pm-name{color:#6F302A}.pst-pm-row.pst-project-closed .pst-pm-open{background:${RED}!important;box-shadow:none!important}.pst-project-closure-note{margin-top:6px;padding:5px 8px;border-radius:7px;background:${RED_BG};color:#8E3A32;font-size:8.5px;font-weight:650;line-height:1.35;white-space:normal}.pst-pm-row.pst-project-archived{opacity:.82}
`;
document.head.appendChild(style);
async function metadata(){
  if(typeof window.supaFetch!=='function')return{projects:{},reasons:{}};
  var data=await Promise.all([
    window.supaFetch('projects?select=id,status,updated_at&limit=3000').catch(function(){return[];}),
    window.supaFetch('dismissed_items?item_type=eq.project_loss&select=project_id,reason,created_at&order=created_at.desc&limit=3000').catch(function(){return[];})
  ]),projects={},reasons={};
  arr(data[0]).forEach(function(p){projects[String(p.id)]=p;});
  arr(data[1]).forEach(function(r){var id=String(r.project_id||'');if(id&&!reasons[id])reasons[id]=r.reason||'';});
  return{projects:projects,reasons:reasons};
}
function decorate(meta){
  var list=document.querySelector('.pst-pm-list');if(!list)return;
  var rows=Array.from(list.querySelectorAll('.pst-pm-row[data-project-id]'));
  rows.forEach(function(row){
    var id=String(row.getAttribute('data-project-id')||''),p=meta.projects[id]||{},g=group(p.status),main=row.querySelector('.pst-pm-main'),old=main&&main.querySelector('.pst-project-closure-note');
    row.classList.toggle('pst-project-closed',g==='closed');row.classList.toggle('pst-project-archived',g==='archived');
    if(g==='closed'){
      row.style.setProperty('--urgency',RED);
      var badge=row.querySelector('.pst-pm-badge');if(badge){badge.textContent='Mbyllur';badge.style.setProperty('--c',RED);badge.style.setProperty('--bg',RED_BG);}
      if(main&&!old){old=document.createElement('div');old.className='pst-project-closure-note';main.appendChild(old);}
      if(old)old.innerHTML='<strong>Mbyllur</strong>'+(meta.reasons[id]?' · '+esc(meta.reasons[id]):'');
    }else if(old)old.remove();
  });
  rows.sort(function(a,b){
    var ga=group((meta.projects[String(a.getAttribute('data-project-id')||'')]||{}).status),gb=group((meta.projects[String(b.getAttribute('data-project-id')||'')]||{}).status);
    var rank=function(g){return g==='closed'?3:g==='archived'?2:g==='won'?1:0;};return rank(ga)-rank(gb);
  });
  rows.forEach(function(row){list.appendChild(row);});
}
async function refresh(){var meta=await metadata();decorate(meta);return meta;}
function wrap(){
  if(wrapped||typeof window.pstProjectsModernOpen!=='function'||typeof window.pstProjectsModernRefresh!=='function')return;
  wrapped=true;
  var open=window.pstProjectsModernOpen,ref=window.pstProjectsModernRefresh;
  window.pstProjectsModernOpen=function(){var result=open.apply(this,arguments);return Promise.resolve(result).then(function(value){return refresh().then(function(){return value;});});};
  window.pstProjectsModernRefresh=function(){var result=ref.apply(this,arguments);return Promise.resolve(result).then(function(value){return refresh().then(function(){return value;});});};
}
function afterClose(){
  setTimeout(function(){
    if(typeof window.pstProjectsModernOpen==='function')Promise.resolve(window.pstProjectsModernOpen()).then(function(){var all=document.querySelector('[data-pm-filter="all"]');if(all&&!all.classList.contains('on'))all.click();return refresh();}).catch(function(e){console.warn('PRISTEEL closure refresh',e);});
  },1600);
}
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#pst-loss-save'))afterClose();},true);
wrap();
window.PSTProjectClosureDirect={refresh:refresh,decorate:decorate,group:group};
})();