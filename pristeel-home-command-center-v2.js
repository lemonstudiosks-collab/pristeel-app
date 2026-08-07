/* PRISTEEL Home Command Center v2
 * Read-only business pulse and progressive disclosure for the home page.
 * Existing task/project handlers remain untouched.
 */
(function(){
'use strict';
if(window.__pstHomeCommandCenterV2)return;
window.__pstHomeCommandCenterV2=true;

var cache={at:0,data:null,loading:null};
var currentView='today';

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function safe(path){if(typeof window.supaFetch!=='function')return Promise.resolve([]);return window.supaFetch(path).then(arr).catch(function(){return[];});}
function closed(status){return /mbyllur|fituar|humbur|arkiv|closedwon|closedlost|cancelled|realizuar/i.test(String(status||''));}
function pending(status){return !/sent|dërguar|derguar|answered|përgjigjur|pergjigjur|closed|done|completed|cancel/i.test(String(status||''));}
function inSeven(v){var d=v?new Date(v):null;if(!d||isNaN(d.getTime()))return false;var now=new Date();now.setHours(0,0,0,0);d.setHours(0,0,0,0);var days=(d-now)/86400000;return days>=0&&days<=7;}

function load(force){
  if(!force&&cache.data&&Date.now()-cache.at<300000)return Promise.resolve(cache.data);
  if(cache.loading)return cache.loading;
  cache.loading=Promise.all([
    safe('projects?select=id,status,deadline,pipeline_stage,updated_at&limit=2000'),
    safe('project_emails?project_id=is.null&select=id,needs_review,sent_at&limit=2000'),
    safe('rfq_log?select=id,status,sent_at,created_at,project_id&limit=3000'),
    safe('offers?select=id,status,created_at,project_id&limit=3000')
  ]).then(function(out){
    var projects=out[0];
    var data={
      active:projects.filter(function(p){return!closed(p.status);}).length,
      unassigned:out[1].length,
      rfq:out[2].filter(function(x){return pending(x.status);}).length,
      deadlines:projects.filter(function(p){return!closed(p.status)&&inSeven(p.deadline);}).length,
      offers:out[3].filter(function(x){return pending(x.status);}).length
    };
    cache={at:Date.now(),data:data,loading:null};
    return data;
  }).catch(function(){
    cache.loading=null;
    return{active:0,unassigned:0,rfq:0,deadlines:0,offers:0};
  });
  return cache.loading;
}

function pulse(label,value,sub,action,tone){
  return'<button type="button" class="pst-hcc-pulse '+(tone||'')+'" data-action="'+esc(action)+'"><span>'+esc(label)+'</span><b>'+Number(value||0)+'</b><small>'+esc(sub)+'</small></button>';
}

function pulseSet(data,view){
  if(view==='week')return[
    pulse('Afate këtë javë',data.deadlines,'projekte me afat','deadline',data.deadlines?'danger':''),
    pulse('RFQ të hapura',data.rfq,'kërkojnë ndjekje','rfq',data.rfq?'purple':''),
    pulse('Projekte aktive',data.active,'punë në vazhdim','projects','blue')
  ];
  if(view==='overview')return[
    pulse('Projekte aktive',data.active,'punë në vazhdim','projects','blue'),
    pulse('Emaila pa projekt',data.unassigned,'duhet të klasifikohen','inbox',data.unassigned?'warn':''),
    pulse('Oferta në proces',data.offers,'ende të pambyllura','offer',data.offers?'amber':'')
  ];
  return[
    pulse('Emaila pa projekt',data.unassigned,'për klasifikim','inbox',data.unassigned?'warn':''),
    pulse('RFQ të hapura',data.rfq,'për ndjekje','rfq',data.rfq?'purple':''),
    pulse('Afate ≤ 7 ditë',data.deadlines,'duhen parë tani','deadline',data.deadlines?'danger':'')
  ];
}

function renderPulse(data){
  var search=document.getElementById('pst-bcc-home-search');
  if(!search)return false;
  var old=document.getElementById('pst-home-pulse');if(old)old.remove();
  var tabs=document.getElementById('pst-home-view-tabs');
  var el=document.createElement('section');
  el.id='pst-home-pulse';el.className='pst-hcc-pulses';el.innerHTML=pulseSet(data,currentView).join('');
  (tabs||search).insertAdjacentElement('afterend',el);
  el.addEventListener('click',function(event){
    var b=event.target.closest&&event.target.closest('[data-action]');if(!b)return;
    var a=b.getAttribute('data-action');
    if(a==='projects'&&typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('projects');
    else if(a==='inbox'&&typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('inbox');
    else if(typeof window.openCmdK==='function')window.openCmdK(a==='rfq'?'RFQ':a==='deadline'?'afat':a==='offer'?'ofertë':'');
  });
  return true;
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
      load(false).then(renderPulse);
    });
  }
  return tabs;
}

function decorate(force){
  var page=document.getElementById('page-workspace-home');
  if(!page||page.style.display==='none')return false;
  ensureTabs(page);
  applyView(page);
  load(force).then(renderPulse);
  return true;
}

function schedule(force){[0,150,700,1800].forEach(function(ms){setTimeout(function(){decorate(force);},ms);});}

function css(){
  if(document.getElementById('pst-hcc-css'))return;
  var s=document.createElement('style');s.id='pst-hcc-css';s.textContent=`
.pst-hcc-tabs{display:inline-flex;gap:3px;margin:2px 0 10px;padding:3px;background:#F2F6F7;border:1px solid #E0E8EB;border-radius:10px}.pst-hcc-tabs button{height:29px;border:0;border-radius:7px;background:transparent;padding:0 12px;font-size:8.5px;font-weight:740;color:#77858B;cursor:pointer}.pst-hcc-tabs button:hover{color:#3F7F98}.pst-hcc-tabs button.active{background:#fff;color:#355F70;box-shadow:0 1px 4px rgba(43,72,84,.09)}
.pst-hcc-pulses{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 18px}.pst-hcc-pulse{min-height:62px;border:1px solid #DDE7EA;border-radius:11px;background:#fff;padding:9px 11px;text-align:left;cursor:pointer}.pst-hcc-pulse:hover{border-color:#BFD7E0;box-shadow:0 7px 22px rgba(42,76,90,.055)}.pst-hcc-pulse span{display:block;font-size:7.5px;text-transform:uppercase;letter-spacing:.65px;color:#849197;font-weight:760}.pst-hcc-pulse b{display:block;font-size:18px;color:#34454D;margin-top:3px}.pst-hcc-pulse small{display:block;font-size:7.8px;color:#8A969B;margin-top:1px}.pst-hcc-pulse.blue{border-top:3px solid #5B9BB3}.pst-hcc-pulse.warn{border-top:3px solid #B07A28}.pst-hcc-pulse.purple{border-top:3px solid #7655A0}.pst-hcc-pulse.danger{border-top:3px solid #A64B42}.pst-hcc-pulse.amber{border-top:3px solid #C29345}
.pst-hcc-quick-label{font-size:7.5px;text-transform:uppercase;letter-spacing:.8px;color:#8A969B;font-weight:780;margin:0 0 7px 2px}#page-workspace-home .pst-ws-quick{margin-bottom:19px!important}#page-workspace-home .pst-ws-quick button{min-width:0!important;height:34px!important;padding:0 10px!important;font-size:8.5px!important}#page-workspace-home .pst-ws-quick button:nth-child(n+5){display:none!important}.pst-hcc-hidden{display:none!important}.pst-hcc-more{width:100%;border:1px dashed #CDDDE3;border-radius:10px;background:#F9FCFD;padding:9px 12px;text-align:center;cursor:pointer;color:#527587}.pst-hcc-more:hover{background:#F1F8FA;border-color:#AFCBD6}.pst-hcc-more b{display:block;font-size:9px}.pst-hcc-more span{display:block;font-size:7.5px;color:#89959A;margin-top:2px}#page-workspace-home .pst-ws-card-title{font-size:13.5px!important}#page-workspace-home .pst-ws-card-sub{max-width:620px}
@media(max-width:800px){.pst-hcc-pulses{grid-template-columns:1fr}.pst-hcc-tabs{display:flex;width:max-content;max-width:100%;overflow-x:auto}}
`;
  document.head.appendChild(s);
}

css();
document.addEventListener('click',function(event){if(event.target.closest&&event.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],#pst-ws-home-refresh'))schedule(false);},true);
document.addEventListener('pst:modules-ready',function(){schedule(false);},{once:true});
window.addEventListener('pageshow',function(){schedule(false);},{once:true});
window.PSTHomeCommandCenterV2={decorate:decorate,load:load,refresh:function(){schedule(true);},setView:function(view){if(/^(today|week|overview)$/.test(view)){currentView=view;decorate(false);}},getView:function(){return currentView;}};
})();
