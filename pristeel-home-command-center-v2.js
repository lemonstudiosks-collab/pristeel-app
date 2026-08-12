/* PRISTEEL Home Command Center v2
 * Progressive disclosure for the home page.
 * No KPI/pulse strip: Home should show decisions and work, not vanity counts.
 * Existing task/project handlers remain untouched.
 */
(function(){
'use strict';
if(window.__pstHomeCommandCenterV2)return;
window.__pstHomeCommandCenterV2=true;

var currentView='today';
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

function removePulse(){
  var old=document.getElementById('pst-home-pulse');
  if(old)old.remove();
}

function toggleList(hostId,limit,label){
  var host=document.getElementById(hostId);if(!host)return;
  var selector=hostId==='pst-ws-home-actions'?':scope > .pst-ws-action':':scope > .pst-ws-projectcard';
  var items=Array.prototype.slice.call(host.querySelectorAll(selector));
  var old=host.querySelector('.pst-hcc-more');if(old)old.remove();
  items.forEach(function(x,i){x.classList.toggle('pst-hcc-hidden',i>=limit);});
  if(items.length<=limit)return;
  var more=document.createElement('button');more.type='button';more.className='pst-hcc-more';
  more.innerHTML='<b>Shiko edhe '+(items.length-limit)+'</b><span>'+esc(label)+'</span>';
  var open=false;
  more.onclick=function(){
    open=!open;
    items.forEach(function(x,i){x.classList.toggle('pst-hcc-hidden',!open&&i>=limit);});
    more.innerHTML=open?'<b>Shfaq më pak</b><span>Mbyll listën e zgjeruar</span>':'<b>Shiko edhe '+(items.length-limit)+'</b><span>'+esc(label)+'</span>';
  };
  host.appendChild(more);
}

function limits(view){
  if(view==='week')return{actions:5,projects:4};
  if(view==='overview')return{actions:7,projects:6};
  return{actions:3,projects:3};
}

function decorateText(page){
  var titles=page.querySelectorAll('.pst-ws-card-title'),subs=page.querySelectorAll('.pst-ws-card-sub');
  if(titles[0])titles[0].textContent='Prioritetet';
  if(subs[0])subs[0].textContent=currentView==='today'?'Tre veprimet që kërkojnë vëmendje tani.':currentView==='week'?'Veprimet për t’u mbyllur ose ndjekur këtë javë.':'Lista më e gjerë e veprimeve aktive.';
  if(titles[1])titles[1].textContent='Projektet në punë';
  if(subs[1])subs[1].textContent=currentView==='today'?'Projektet që duhen mbajtur në sy sot.':currentView==='week'?'Projektet kryesore për javën aktuale.':'Pasqyrë e projekteve aktive.';
  var quick=page.querySelector('.pst-ws-quick');
  if(quick&&!quick.previousElementSibling?.classList.contains('pst-hcc-quick-label')){
    var l=document.createElement('div');l.className='pst-hcc-quick-label';l.textContent='Krijo shpejt';quick.insertAdjacentElement('beforebegin',l);
  }
}

function applyView(page){
  removePulse();
  var l=limits(currentView);
  decorateText(page);
  toggleList('pst-ws-home-actions',l.actions,currentView==='today'?'Hap prioritetet e tjera':currentView==='week'?'Hap veprimet e tjera të javës':'Hap listën e plotë');
  toggleList('pst-ws-home-projects',l.projects,currentView==='today'?'Hap projektet e tjera':currentView==='week'?'Hap projektet e tjera të javës':'Hap listën e plotë');
  page.querySelectorAll('#pst-home-view-tabs button').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-view')===currentView);});
}

function ensureTabs(page){
  var search=document.getElementById('pst-bcc-home-search');if(!search)return null;
  var tabs=document.getElementById('pst-home-view-tabs');
  if(!tabs){
    tabs=document.createElement('nav');tabs.id='pst-home-view-tabs';tabs.className='pst-hcc-tabs';
    tabs.setAttribute('aria-label','Pamja e dashboard-it');
    tabs.innerHTML='<button type="button" data-view="today">Sot</button><button type="button" data-view="week">Këtë javë</button><button type="button" data-view="overview">Pasqyrë</button>';
    search.insertAdjacentElement('afterend',tabs);
    tabs.addEventListener('click',function(event){
      var b=event.target.closest&&event.target.closest('button[data-view]');if(!b)return;
      currentView=b.getAttribute('data-view')||'today';
      applyView(page);
    });
  }
  return tabs;
}

function decorate(){
  var page=document.getElementById('page-workspace-home');
  if(!page||page.style.display==='none')return false;
  removePulse();
  ensureTabs(page);
  applyView(page);
  return true;
}
function schedule(){[0,120,500,1200].forEach(function(ms){setTimeout(decorate,ms);});}

function css(){
  if(document.getElementById('pst-hcc-css'))return;
  var s=document.createElement('style');s.id='pst-hcc-css';s.textContent=`
#pst-home-pulse{display:none!important}
.pst-hcc-tabs{display:inline-flex;gap:3px;margin:2px 0 18px;padding:3px;background:#F2F6F7;border:1px solid #E0E8EB;border-radius:10px}.pst-hcc-tabs button{height:29px;border:0;border-radius:7px;background:transparent;padding:0 12px;font-size:8.5px;font-weight:740;color:#77858B;cursor:pointer}.pst-hcc-tabs button:hover{color:#3F7F98}.pst-hcc-tabs button.active{background:#fff;color:#355F70;box-shadow:0 1px 4px rgba(43,72,84,.09)}
.pst-hcc-quick-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.8px;color:#7D898F;font-weight:780;margin:0 0 9px 2px}#page-workspace-home .pst-ws-quick{margin-bottom:21px!important;gap:10px!important}#page-workspace-home .pst-ws-quick button{min-width:0!important;height:42px!important;padding:0 15px!important;font-size:13px!important;font-weight:720!important;gap:9px!important}#page-workspace-home .pst-ws-quick svg{width:18px!important;height:18px!important}#page-workspace-home .pst-ws-quick button:nth-child(n+5){display:none!important}.pst-hcc-hidden{display:none!important}.pst-hcc-more{width:100%;border:1px dashed #CDDDE3;border-radius:10px;background:#F9FCFD;padding:9px 12px;text-align:center;cursor:pointer;color:#527587}.pst-hcc-more:hover{background:#F1F8FA;border-color:#AFCBD6}.pst-hcc-more b{display:block;font-size:9px}.pst-hcc-more span{display:block;font-size:7.5px;color:#89959A;margin-top:2px}#page-workspace-home .pst-ws-card-title{font-size:13.5px!important}#page-workspace-home .pst-ws-card-sub{max-width:620px}
@media(max-width:800px){.pst-hcc-tabs{display:flex;width:max-content;max-width:100%;overflow-x:auto}#page-workspace-home .pst-ws-quick button{height:40px!important;padding:0 11px!important;font-size:12px!important}}
`;
  document.head.appendChild(s);
}

css();
document.addEventListener('click',function(event){if(event.target.closest&&event.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],#pst-ws-home-refresh'))schedule();},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
window.PSTHomeCommandCenterV2={decorate:decorate,load:function(){return Promise.resolve({});},refresh:schedule,setView:function(view){if(/^(today|week|overview)$/.test(view)){currentView=view;decorate();}},getView:function(){return currentView;}};
})();
