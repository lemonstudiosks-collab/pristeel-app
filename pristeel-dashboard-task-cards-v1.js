/* PRISTEEL dashboard task cards v1
 * Visual-only refinement for the Workspace home action list.
 * Keeps existing action keys, onclick handlers and database state operations intact.
 * No MutationObserver, interval, queries or project/Gmail/auth function overrides.
 */
(function(){
'use strict';
if(window.__pstDashboardTaskCardsV1)return;
window.__pstDashboardTaskCardsV1=true;

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function cleanTitle(value){
  var text=String(value||'').replace(/^\s*\[AUTO\]\s*/i,'').trim();
  text=text.replace(/^Ndjekje\s+ofert[eë]\s*:\s*/i,'Ndjekje oferte — ');
  text=text.replace(/^Ndjekje\s+furnitor\s*:\s*/i,'Ndjekje furnitori — ');
  text=text.replace(/^Ndjekje\s*:\s*/i,'Ndjekje — ');
  return text||'Veprim';
}
function metadata(value){
  var original=String(value||'').replace(/\s+/g,' ').trim();
  var parts=original.split(/\s*·\s*/).map(function(x){return x.trim();}).filter(Boolean);
  var timing=[],context=[];
  parts.forEach(function(part){
    if(/(?:dit[eë]\s+von[eë]|afati|d[eë]rguar|pa p[eë]rgjigje|sot|nes[eë]r|para\s+\d+\s+dit)/i.test(part))timing.push(part);
    else context.push(part);
  });
  if(!context.length&&timing.length>1)context.push(timing.pop());
  return{original:original,context:context.join(' · '),timing:timing.join(' · ')};
}
function button(label,className,title){
  var b=document.createElement('button');
  b.type='button';b.className=className;b.textContent=label;b.title=title||label;
  return b;
}
function closeMenus(except){
  document.querySelectorAll('.pst-dash-task-menu.open').forEach(function(menu){if(menu!==except)menu.classList.remove('open');});
}
function enhanceRow(row){
  if(!row||row.dataset.pstDashCard==='1')return false;
  var main=row.querySelector('.pst-ws-action-main');
  var title=row.querySelector('.pst-ws-action-title');
  var meta=row.querySelector('.pst-ws-action-meta');
  var tag=row.querySelector('.pst-ws-action-tag');
  var controls=row.querySelector('.pst-ws-action-controls');
  if(!main||!title||!meta||!controls)return false;

  row.dataset.pstDashCard='1';
  row.classList.add('pst-dash-task-card');
  var originalTitle=String(title.textContent||'').trim();
  var originalMeta=String(meta.textContent||'').trim();
  row.dataset.pstOriginalTitle=originalTitle;
  row.dataset.pstOriginalMeta=originalMeta;
  title.textContent=cleanTitle(originalTitle);
  title.title=originalTitle;

  var info=metadata(originalMeta);
  meta.innerHTML=(info.context?'<span class="pst-dash-task-context">'+esc(info.context)+'</span>':'')
    +(info.timing?'<span class="pst-dash-task-timing">'+esc(info.timing)+'</span>':'');
  meta.title=info.original;
  if(!info.context&&!info.timing)meta.textContent=originalMeta;

  if(tag){
    var label=String(tag.textContent||'').trim();
    tag.textContent=/^vonuar$/i.test(label)?'Vonuar':label;
    if(/vonuar/i.test(label))row.classList.add('pst-dash-task-overdue');
    else if(/sot|urgjent/i.test(label))row.classList.add('pst-dash-task-today');
    else row.classList.add('pst-dash-task-normal');
  }

  var existing=Array.prototype.slice.call(controls.querySelectorAll('button'));
  var done=existing.filter(function(b){return /kryer/i.test(b.textContent||'');})[0]||existing[0]||null;
  var dismiss=existing.filter(function(b){return /hiq/i.test(b.textContent||'');})[0]||existing[1]||null;
  controls.classList.add('pst-dash-task-actions');

  var open=button('Hap','pst-dash-task-open','Hape veprimin përkatës');
  open.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();main.click();});
  controls.insertBefore(open,controls.firstChild);
  if(done){done.classList.add('pst-dash-task-done');done.title='Shënoje si të kryer';}

  var menu=document.createElement('span');menu.className='pst-dash-task-menu';
  var more=button('⋯','pst-dash-task-more','Veprime të tjera');
  var panel=document.createElement('span');panel.className='pst-dash-task-menu-panel';
  if(dismiss){dismiss.classList.add('pst-dash-task-dismiss');dismiss.textContent='Hiqe nga lista';panel.appendChild(dismiss);}
  menu.appendChild(more);menu.appendChild(panel);controls.appendChild(menu);
  more.addEventListener('click',function(event){
    event.preventDefault();event.stopPropagation();var opening=!menu.classList.contains('open');closeMenus(menu);menu.classList.toggle('open',opening);
  });
  panel.addEventListener('click',function(event){event.stopPropagation();});
  return true;
}
function improveEmptyState(){
  var host=document.getElementById('pst-ws-home-projects');
  if(!host||host.querySelector('.pst-ws-projectcard'))return;
  var empty=host.querySelector('.pst-ws-empty');
  if(!empty||empty.dataset.pstDashEmpty==='1')return;
  empty.dataset.pstDashEmpty='1';
  empty.classList.add('pst-dash-project-empty');
  empty.innerHTML='<b>Nuk u gjetën projekte aktive.</b><span>Kontrollo regjistrin e projekteve ose vazhdo nga një detyrë në panelin majtas.</span><button type="button" class="pst-dash-projects-open">Hap projektet</button>';
  var b=empty.querySelector('button');if(b)b.addEventListener('click',function(){if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('projects');});
}
function decorate(){
  var page=document.getElementById('page-workspace-home');
  if(!page||page.style.display==='none')return 0;
  var count=0;
  page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(row){if(enhanceRow(row))count++;});
  improveEmptyState();
  return count;
}
function schedule(){[0,120,350,800,1600,3200,6000].forEach(function(ms){setTimeout(decorate,ms);});}
function css(){
  if(document.getElementById('pst-dashboard-task-cards-v1-css'))return;
  var s=document.createElement('style');s.id='pst-dashboard-task-cards-v1-css';s.textContent=`
#page-workspace-home .pst-ws-homegrid{grid-template-columns:minmax(0,1.32fr) minmax(340px,.68fr);gap:18px}
#page-workspace-home .pst-ws-card{border-color:#DDE7EB;box-shadow:0 1px 2px rgba(31,55,66,.025)}
#page-workspace-home .pst-ws-card-hd{padding:16px 18px;background:linear-gradient(180deg,#fff,#FBFDFE)}
#page-workspace-home .pst-ws-card-title{font-size:13px;letter-spacing:-.12px}
#page-workspace-home .pst-ws-card-sub{font-size:10px;line-height:1.45;margin-top:3px}
#page-workspace-home #pst-ws-home-actions{display:flex;flex-direction:column;gap:8px;padding:11px 12px 13px}
#page-workspace-home .pst-ws-action.pst-dash-task-card{position:relative;display:grid!important;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;column-gap:15px;row-gap:8px;align-items:start;padding:14px 14px 13px 17px;border:1px solid #E2E9EC;border-left:4px solid var(--c,#5B9BB3);border-radius:12px;background:#fff;box-shadow:0 1px 2px rgba(31,55,66,.025);cursor:default;transition:border-color .14s ease,box-shadow .14s ease,transform .14s ease,background .14s ease}
#page-workspace-home .pst-ws-action.pst-dash-task-card:hover{background:#FCFEFF;border-color:#CADCE4;border-left-color:var(--c,#5B9BB3);box-shadow:0 7px 22px rgba(45,82,97,.065);transform:translateY(-1px)}
#page-workspace-home .pst-dash-task-card .pst-ws-action-dot{display:none}
#page-workspace-home .pst-dash-task-card .pst-ws-action-main{grid-column:1;grid-row:1 / span 2;min-width:0;padding:1px 0;cursor:pointer}
#page-workspace-home .pst-dash-task-card .pst-ws-action-title{font-size:12.7px;font-weight:750;line-height:1.35;color:#273238;white-space:normal;overflow:visible;text-overflow:clip;letter-spacing:-.08px}
#page-workspace-home .pst-dash-task-card .pst-ws-action-meta{display:flex;flex-direction:column;gap:4px;margin-top:6px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.45}
#page-workspace-home .pst-dash-task-context{font-size:10.2px;font-weight:560;color:#637178;overflow-wrap:anywhere}
#page-workspace-home .pst-dash-task-timing{font-size:9.5px;color:#8A969C;overflow-wrap:anywhere}
#page-workspace-home .pst-dash-task-overdue .pst-dash-task-timing{color:#A64B42;font-weight:680}
#page-workspace-home .pst-dash-task-card .pst-ws-action-tag{grid-column:2;grid-row:1;justify-self:end;align-self:start;font-size:8px;letter-spacing:.45px;padding:4px 8px;border-radius:999px;line-height:1;text-transform:uppercase}
#page-workspace-home .pst-dash-task-actions{grid-column:2;grid-row:2;display:flex;align-items:center;justify-content:flex-end;gap:6px;align-self:end;position:relative}
#page-workspace-home .pst-dash-task-actions>button,#page-workspace-home .pst-dash-task-menu>button{height:30px;border-radius:8px;padding:0 10px;font-size:9px;font-weight:760;line-height:1;border:1px solid #D9E4E8;background:#fff;color:#65747B;cursor:pointer;transition:background .13s ease,border-color .13s ease,color .13s ease,box-shadow .13s ease}
#page-workspace-home .pst-dash-task-open{background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;border-color:transparent!important;color:#fff!important;box-shadow:0 4px 11px rgba(63,127,152,.13)}
#page-workspace-home .pst-dash-task-open:hover{background:linear-gradient(135deg,#5F9FB7,#36758E)!important}
#page-workspace-home .pst-dash-task-done:hover{background:#ECF7F1!important;border-color:#CFE8D9!important;color:#2F7657!important}
#page-workspace-home .pst-dash-task-more{width:30px!important;padding:0!important;font-size:16px!important;letter-spacing:1px}
#page-workspace-home .pst-dash-task-more:hover{background:#F3F7F8!important;border-color:#C9DCE4!important;color:#3F7F98!important}
#page-workspace-home .pst-dash-task-menu{position:relative;display:inline-flex}
#page-workspace-home .pst-dash-task-menu-panel{display:none;position:absolute;right:0;top:35px;z-index:30;min-width:146px;padding:5px;background:#fff;border:1px solid #DDE7EB;border-radius:9px;box-shadow:0 12px 30px rgba(30,50,60,.16)}
#page-workspace-home .pst-dash-task-menu.open .pst-dash-task-menu-panel{display:block}
#page-workspace-home .pst-dash-task-dismiss{width:100%;height:31px!important;border:0!important;border-radius:7px!important;background:#fff!important;color:#8E4A43!important;text-align:left;padding:0 9px!important;font-size:9px!important;cursor:pointer}
#page-workspace-home .pst-dash-task-dismiss:hover{background:#FBEFEE!important;color:#96483F!important}
#page-workspace-home .pst-ws-recent{gap:10px}
#page-workspace-home .pst-ws-projectcard{border-color:#E0E8EB;border-radius:12px;padding:13px;box-shadow:0 1px 2px rgba(31,55,66,.02)}
#page-workspace-home .pst-ws-projectcard:hover{border-color:#BFD7E1;box-shadow:0 7px 20px rgba(45,82,97,.065)}
#page-workspace-home .pst-dash-project-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:31px 20px!important;color:#7C898F!important}
#page-workspace-home .pst-dash-project-empty b{font-size:11px;color:#4F5C62}
#page-workspace-home .pst-dash-project-empty span{max-width:290px;font-size:9.5px;line-height:1.5}
#page-workspace-home .pst-dash-projects-open{height:31px;margin-top:5px;border:1px solid #CFE0E7;border-radius:8px;background:#fff;color:#3F7F98;padding:0 11px;font-size:9px;font-weight:740;cursor:pointer}
#page-workspace-home .pst-dash-projects-open:hover{background:#EAF5F8}
@media(max-width:1050px){#page-workspace-home .pst-ws-homegrid{grid-template-columns:1fr}}
@media(max-width:680px){#page-workspace-home .pst-ws-action.pst-dash-task-card{grid-template-columns:1fr;grid-template-rows:auto auto auto}.pst-dash-task-card .pst-ws-action-main{grid-column:1!important;grid-row:1!important}#page-workspace-home .pst-dash-task-card .pst-ws-action-tag{grid-column:1;grid-row:2;justify-self:start}#page-workspace-home .pst-dash-task-actions{grid-column:1;grid-row:3;justify-content:flex-start}}
`;
  document.head.appendChild(s);
}
css();
document.addEventListener('click',function(event){
  var menu=event.target&&event.target.closest?event.target.closest('.pst-dash-task-menu'):null;
  if(!menu)closeMenus();
  var trigger=event.target&&event.target.closest?event.target.closest('#pst-ws-home-refresh,.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],[onclick*="pstWsRefreshHome"]'):null;
  if(trigger)schedule();
},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.PSTDashboardTaskCardsV1={decorate:decorate,enhanceRow:enhanceRow,cleanTitle:cleanTitle,metadata:metadata};
})();
