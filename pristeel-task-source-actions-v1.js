/* PRISTEEL task source actions v2
 * Keeps the safe task-source shortcut and applies a compact cosmetic polish to Workspace Home.
 * No project, offer, task, email or finance workflow writes are introduced here.
 */
(function(){
'use strict';
if(window.__pstTaskSourceActionsV1)return;
window.__pstTaskSourceActionsV1=true;

function sourceUrl(value){
  var text=String(value||'');
  var match=text.match(/https:\/\/[^\s<>"']+/i);
  if(!match)return'';
  var candidate=String(match[0]||'').replace(/[\]\)}>.,;]+$/g,'');
  try{
    var parsed=new URL(candidate,window.location&&window.location.href||undefined);
    return parsed.protocol==='https:'?parsed.href:'';
  }catch(e){return'';}
}
function metadataText(row){
  if(!row)return'';
  var original=String(row.dataset&&row.dataset.pstOriginalMeta||'').trim();
  if(original)return original;
  var meta=row.querySelector('.pst-ws-action-meta');
  if(!meta)return'';
  return String(meta.getAttribute('title')||meta.textContent||'').trim();
}
function sourceButton(url){
  var btn=document.createElement('button');
  btn.type='button';
  btn.className='pst-task-source-open';
  btn.textContent='Burimi';
  btn.title='Hap burimin zyrtar në tab të ri';
  btn.addEventListener('click',function(event){
    event.preventDefault();
    event.stopPropagation();
    window.open(url,'_blank','noopener,noreferrer');
  });
  return btn;
}
function enhanceRow(row){
  if(!row)return false;
  var controls=row.querySelector('.pst-ws-action-controls');
  if(!controls||controls.querySelector('.pst-task-source-open'))return false;
  var url=sourceUrl(metadataText(row));
  if(!url)return false;
  var btn=sourceButton(url);
  var menu=controls.querySelector('.pst-dash-task-menu');
  if(menu)controls.insertBefore(btn,menu);else controls.appendChild(btn);
  row.dataset.pstTaskSourceUrl=url;
  return true;
}
function isHome(){
  var page=document.getElementById('page-workspace-home');
  return !!(page&&page.classList.contains('active')&&page.style.display!=='none');
}
function tinyIcon(name){
  var p={
    project:'<rect x="3" y="6" width="18" height="14" rx="2.3"/><path d="M8 6V4h8v2M9 12h6"/>',
    offer:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7M9 16h5"/>',
    invoice:'<path d="M6 3h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    task:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16.5 8"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3 9h18M8 13h3M8 17h3"/>',
    badge:'<circle cx="12" cy="11" r="7"/><path d="m9 11 2 2 4-4M8 17l-1 4 5-2 5 2-1-4"/>',
    follow:'<path d="M5 5h7a7 7 0 0 1 7 7v1"/><path d="m16 10 3 3 3-3"/><circle cx="7" cy="18" r="2"/><path d="M10 18h5"/>',
    mail:'<rect x="3" y="5" width="15" height="13" rx="2"/><path d="m4 7 6.5 5 6.5-5"/><circle cx="18.5" cy="17" r="4"/><path d="M18.5 14.8v2.6M18.5 19.1h.01"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3C9.7 5.5 8.5 8.5 8.5 12s1.2 6.5 3.5 9"/>'
  }[name]||'';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><g>'+p+'</g></svg>';
}
function createKind(text){
  text=String(text||'').toLowerCase();
  if(/projekt/.test(text))return'project';
  if(/ofert/.test(text))return'offer';
  if(/fatur/.test(text))return'invoice';
  return'task';
}
function priorityKind(text){
  text=String(text||'').toLowerCase();
  if(/plan dinamik|afat/.test(text))return'calendar';
  if(/iso|certifikat|audit/.test(text))return'badge';
  if(/bounce|email/.test(text))return'mail';
  if(/ted|tender/.test(text))return'globe';
  return'follow';
}
function polishCreateMenu(){
  var root=document.querySelector('#pst-ws-sidebar .pst-ws-create');
  if(!root)return;
  var menu=root.querySelector('.pst-ws-create-menu');
  if(!menu)return;
  menu.querySelectorAll('.pst-ws-create-item').forEach(function(item){
    var label=String(item.textContent||'').replace(/\s+/g,' ').trim();
    var k=createKind(label);
    item.dataset.pstCreateKind=k;
    var old=item.querySelector('svg');
    if(old)old.remove();
    var existing=item.querySelector('.pst-create-clean-icon');
    if(!existing){
      existing=document.createElement('span');
      existing.className='pst-create-clean-icon';
      existing.innerHTML=tinyIcon(k);
      item.insertBefore(existing,item.firstChild);
    }
  });
}
function polishSidebar(){
  var nav=document.getElementById('pst-ws-sidebar');
  if(!nav)return;
  nav.querySelectorAll('.pst-ws-navbtn').forEach(function(btn){
    btn.classList.add('pst-sidebar-clean-item');
    var icon=btn.querySelector('.pst-nav-icon,.pst-nav-icon-shell');
    if(icon)icon.classList.add('pst-sidebar-clean-icon');
  });
}
function hideHomeTopProjectButton(){
  if(!isHome())return;
  document.querySelectorAll('button').forEach(function(btn){
    var text=String(btn.textContent||'').replace(/\s+/g,' ').trim();
    var r=btn.getBoundingClientRect();
    if(r.top<150&&/^Projekt i ri$/i.test(text))btn.classList.add('pst-hide-home-project-new');
  });
}
function polishPriorities(){
  if(!isHome())return;
  document.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(row,index){
    row.classList.add('pst-happy-priority');
    var text=String(row.textContent||'');
    var icon=row.querySelector('.pst-priority-icon');
    if(!icon){icon=document.createElement('span');icon.className='pst-priority-icon';row.insertBefore(icon,row.firstChild);}
    icon.innerHTML=tinyIcon(priorityKind(text));
    var stripe=row.querySelector('.pst-priority-stripe');
    if(!stripe){stripe=document.createElement('i');stripe.className='pst-priority-stripe';row.insertBefore(stripe,row.firstChild);}
    var title=row.querySelector('.pst-ws-action-title');
    if(title)title.style.fontSize='14px';
    var meta=row.querySelector('.pst-ws-action-meta');
    if(meta){meta.style.fontSize='11.5px';meta.style.lineHeight='1.55';meta.style.webkitLineClamp='2';}
  });
}
function polishProjects(){
  if(!isHome())return;
  document.querySelectorAll('#pst-ws-home-projects > .pst-ws-projectcard').forEach(function(card,index){
    card.classList.add('pst-happy-project');
    var top=card.querySelector('.pst-ws-projectcard-top');
    if(top&&!top.querySelector('.pst-project-orb')){
      var orb=document.createElement('span');
      orb.className='pst-project-orb';
      orb.innerHTML=tinyIcon('project');
      top.insertBefore(orb,top.firstChild);
    }
    var name=card.querySelector('.pst-ws-projectcard-name');
    if(name)name.style.fontSize='13.5px';
    var next=card.querySelector('.pst-ws-projectcard-next');
    if(next)next.classList.add('pst-project-next-chip');
  });
}
function decorate(){
  var page=document.getElementById('page-workspace-home');
  if(!page||page.style.display==='none')return 0;
  var count=0;
  page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(row){if(enhanceRow(row))count++;});
  polishSidebar();
  polishCreateMenu();
  hideHomeTopProjectButton();
  polishPriorities();
  polishProjects();
  return count;
}
function schedule(){[0,100,260,600,1200,2200].forEach(function(ms){setTimeout(decorate,ms);});}
function installStyle(){
  if(document.getElementById('pst-task-source-actions-v2-css'))return;
  var style=document.createElement('style');
  style.id='pst-task-source-actions-v2-css';
  style.textContent=`
#page-workspace-home .pst-task-source-open{height:31px;border:1px solid #CFE0E7;border-radius:9px;padding:0 11px;background:#F8FBFC;color:#3F7F98;font-size:9.5px;font-weight:760;line-height:1;cursor:pointer;white-space:nowrap;transition:background .13s,border-color .13s,color .13s}
#page-workspace-home .pst-task-source-open:hover{background:#EDF6F9;border-color:#B8D4DF;color:#2F6E86}

/* Sidebar: calm, aligned, readable */
#pst-ws-sidebar{overflow:visible!important;padding-left:14px!important;padding-right:14px!important}
#pst-ws-sidebar .pst-ws-brand{padding-left:4px!important;padding-right:4px!important}
#pst-ws-sidebar .pst-ws-nav{gap:5px!important}
#pst-ws-sidebar .pst-ws-navbtn{height:44px!important;min-height:44px!important;padding:0 10px!important;border-radius:11px!important;font-size:13px!important;font-weight:670!important;gap:11px!important;display:flex!important;align-items:center!important}
#pst-ws-sidebar .pst-ws-navbtn.active{background:#EAF5F8!important;color:#2F6E84!important;box-shadow:inset 3px 0 0 #4B95AD!important}
#pst-ws-sidebar .pst-ws-navbtn:hover{background:#F3F8FA!important}
#pst-ws-sidebar .pst-sidebar-clean-icon{width:23px!important;height:23px!important;min-width:23px!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;display:flex!important;align-items:center!important;justify-content:center!important;color:currentColor!important}
#pst-ws-sidebar .pst-sidebar-clean-icon svg{width:19px!important;height:19px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}
#pst-ws-sidebar .pst-ws-badge{margin-left:auto!important;font-size:9px!important}

/* Create button and compact popover */
#pst-ws-sidebar .pst-ws-create{position:relative!important;z-index:1600!important}
#pst-ws-sidebar .pst-ws-create-main{height:46px!important;border-radius:13px!important;font-size:14px!important;font-weight:760!important;box-shadow:0 8px 20px rgba(54,126,151,.16)!important}
#pst-ws-sidebar .pst-ws-create-menu{position:absolute!important;left:0!important;right:auto!important;top:54px!important;width:250px!important;display:none!important;padding:8px!important;border:1px solid #DCE6EA!important;border-radius:14px!important;background:#fff!important;box-shadow:0 18px 45px rgba(35,61,73,.18)!important;overflow:hidden!important;z-index:9999!important}
#pst-ws-sidebar .pst-ws-create.open .pst-ws-create-menu{display:block!important}
#pst-ws-sidebar .pst-ws-create-item{width:100%!important;height:48px!important;min-height:48px!important;display:flex!important;align-items:center!important;gap:11px!important;padding:0 10px!important;margin:0!important;border:0!important;border-radius:10px!important;background:#fff!important;color:#40535C!important;font-size:13px!important;font-weight:690!important;text-align:left!important;overflow:hidden!important}
#pst-ws-sidebar .pst-ws-create-item:hover{background:#F2F8FA!important;color:#2F7189!important}
#pst-ws-sidebar .pst-ws-create-item>svg{display:none!important}
#pst-ws-sidebar .pst-create-clean-icon{width:32px!important;height:32px!important;min-width:32px!important;border-radius:9px!important;background:#EDF6F8!important;color:#3F839B!important;display:flex!important;align-items:center!important;justify-content:center!important}
#pst-ws-sidebar .pst-create-clean-icon svg{width:17px!important;height:17px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}
#pst-ws-sidebar .pst-ws-create-item[data-pst-create-kind="offer"] .pst-create-clean-icon{background:#F8F0E6!important;color:#A66E34!important}
#pst-ws-sidebar .pst-ws-create-item[data-pst-create-kind="invoice"] .pst-create-clean-icon{background:#ECF5EF!important;color:#55816A!important}
#pst-ws-sidebar .pst-ws-create-item[data-pst-create-kind="task"] .pst-create-clean-icon{background:#F0EEF8!important;color:#71679B!important}

/* Home-specific top duplicate */
.pst-hide-home-project-new{display:none!important}

/* Priority cards: warmer and clearer */
#page-workspace-home #pst-ws-home-actions{padding:8px 10px 12px!important;background:linear-gradient(180deg,#FBFDFE,#F7FAFB)!important}
#page-workspace-home .pst-happy-priority{position:relative!important;display:grid!important;grid-template-columns:46px minmax(0,1fr) auto!important;align-items:center!important;gap:13px!important;margin:9px 0!important;padding:15px 14px 15px 17px!important;border:1px solid #DEE8EB!important;border-radius:16px!important;background:linear-gradient(100deg,#FFFFFF 0%,#FBFDFD 74%,#F3F8FA 100%)!important;box-shadow:0 8px 22px rgba(39,68,80,.055)!important;overflow:hidden!important}
#page-workspace-home .pst-happy-priority:hover{transform:translateY(-1px)!important;border-color:#C3DCE4!important;box-shadow:0 12px 28px rgba(39,68,80,.09)!important}
#page-workspace-home .pst-priority-stripe{position:absolute!important;left:0!important;top:0!important;bottom:0!important;width:5px!important;background:linear-gradient(180deg,#59A4BA,#3D8198)!important}
#page-workspace-home .pst-happy-priority.is-urgent .pst-priority-stripe{background:linear-gradient(180deg,#E1AC55,#C6842B)!important}
#page-workspace-home .pst-happy-priority.is-overdue:not(.is-urgent) .pst-priority-stripe{background:linear-gradient(180deg,#C9786E,#A8574E)!important}
#page-workspace-home .pst-happy-priority .pst-priority-icon{width:42px!important;height:42px!important;border-radius:12px!important;background:#EAF5F8!important;color:#3F849B!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:none!important}
#page-workspace-home .pst-happy-priority.is-urgent .pst-priority-icon{background:#FAF1DF!important;color:#A16C2C!important}
#page-workspace-home .pst-happy-priority .pst-priority-icon svg{width:21px!important;height:21px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}
#page-workspace-home .pst-happy-priority .pst-ws-action-main{min-width:0!important}
#page-workspace-home .pst-happy-priority .pst-ws-action-title{font-size:14px!important;line-height:1.3!important;color:#30464F!important;margin-bottom:4px!important}
#page-workspace-home .pst-happy-priority .pst-ws-action-meta{font-size:11.5px!important;line-height:1.5!important;color:#718188!important;max-height:3.1em!important;overflow:hidden!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important}
#page-workspace-home .pst-happy-priority .pst-ws-action-tag{font-size:8.5px!important;padding:5px 8px!important;border-radius:999px!important}
#page-workspace-home .pst-happy-priority .pst-ws-action-controls{display:flex!important;gap:6px!important;justify-content:flex-end!important;align-items:center!important}
#page-workspace-home .pst-happy-priority .pst-ws-action-controls button{height:30px!important;border-radius:9px!important;font-size:9.5px!important;padding:0 10px!important}

/* Projects: more visual, less spreadsheet-like */
#page-workspace-home #pst-ws-home-projects{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;padding:12px!important}
#page-workspace-home .pst-happy-project{position:relative!important;margin:0!important;padding:16px!important;border:1px solid #DEE8EA!important;border-radius:17px!important;background:linear-gradient(145deg,#FFFFFF 0%,#F8FBFC 100%)!important;box-shadow:0 8px 24px rgba(36,67,80,.055)!important;overflow:hidden!important;min-height:128px!important}
#page-workspace-home .pst-happy-project:after{content:"";position:absolute!important;width:110px!important;height:110px!important;border-radius:50%!important;right:-48px!important;top:-52px!important;background:rgba(74,151,175,.07)!important;pointer-events:none!important}
#page-workspace-home .pst-happy-project:hover{transform:translateY(-2px)!important;border-color:#C3DCE4!important;box-shadow:0 14px 30px rgba(36,67,80,.09)!important}
#page-workspace-home .pst-happy-project .pst-ws-projectcard-top{display:flex!important;align-items:center!important;gap:11px!important}
#page-workspace-home .pst-project-orb{width:42px!important;height:42px!important;min-width:42px!important;border-radius:13px!important;background:linear-gradient(145deg,#E8F4F7,#DDEFF4)!important;color:#3F849C!important;display:flex!important;align-items:center!important;justify-content:center!important}
#page-workspace-home .pst-project-orb svg{width:21px!important;height:21px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}
#page-workspace-home .pst-happy-project .pst-ws-projectcard-name{font-size:13.5px!important;line-height:1.35!important;color:#30464F!important;font-weight:760!important}
#page-workspace-home .pst-happy-project .pst-ws-projectcard-client{font-size:10.5px!important;color:#819097!important;margin-top:3px!important}
#page-workspace-home .pst-happy-project .pst-ws-status{font-size:8.5px!important;padding:5px 8px!important;border-radius:999px!important;margin-left:auto!important}
#page-workspace-home .pst-project-next-chip{margin-top:13px!important;padding:9px 10px!important;border-radius:10px!important;background:#F0F7F9!important;color:#61777F!important;font-size:10.5px!important;border:1px solid #E1ECEF!important}

/* Global Home readability */
#page-workspace-home .pst-ws-card-title{font-size:17px!important}
#page-workspace-home .pst-ws-card-sub{font-size:11.5px!important;line-height:1.45!important}
#page-workspace-home .pst-ws-link{font-size:10.5px!important}
@media(max-width:980px){#page-workspace-home #pst-ws-home-projects{grid-template-columns:1fr!important}.pst-happy-priority{grid-template-columns:42px minmax(0,1fr)!important}.pst-happy-priority .pst-ws-action-controls,.pst-happy-priority .pst-ws-action-tag{grid-column:2!important;justify-self:start!important}}
`;
  document.head.appendChild(style);
}
installStyle();
window.addEventListener('pst-dashboard-rendered',schedule);
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.pst-ws-create-main,.pst-ws-navbtn'))setTimeout(schedule,40);},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.PSTTaskSourceActionsV1={sourceUrl:sourceUrl,metadataText:metadataText,enhanceRow:enhanceRow,decorate:decorate};
})();
