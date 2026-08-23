/* PRISTEEL Operating Experience v1
 * Final presentation-only simplification layer for daily PPPP work.
 * Keeps existing routes, engines and approval gates; it only changes orientation,
 * hierarchy, color identity and next-action presentation.
 * No Supabase reads/writes, outbound actions, observers or polling loops.
 */
(function(){
'use strict';
if(window.__pstOperatingExperienceV1)return;
window.__pstOperatingExperienceV1=true;

var PRIMARY=[
  {key:'home',label:'Home',zone:'home'},
  {key:'tenders',label:'Opportunities',zone:'opportunities'},
  {key:'projects',label:'Projects',zone:'projects'},
  {key:'contacts',label:'Partners',zone:'partners'},
  {key:'finance',label:'Finance',zone:'finance'},
  {key:'apps',label:'System',zone:'system'}
];
var ZONE_COLORS={
  home:['#4F97AF','#34758B','#E8F3F6','#BDD9E2','#F6FAFB'],
  opportunities:['#8473A8','#655786','#F2EFF7','#D7D0E5','#FAF9FC'],
  projects:['#647FA6','#486482','#EDF1F7','#CBD6E4','#F7F9FB'],
  partners:['#4F9686','#397366','#EAF5F2','#C4DFD8','#F7FBFA'],
  finance:['#B18A4F','#856738','#F8F1E6','#E3D3B8','#FCFAF6'],
  system:['#648A95','#496A73','#EEF4F5','#CFDEE2','#F8FAFB']
};
var PHASE_COLORS={
  preparation:['#647FA6','#486482','#EDF1F7','#CBD6E4','#F7F9FB'],
  procurement:['#B18A4F','#856738','#F8F1E6','#E3D3B8','#FCFAF6'],
  commercial:['#8473A8','#655786','#F2EFF7','#D7D0E5','#FAF9FC'],
  execution:['#5F936C','#477153','#EDF5EF','#C9DDCE','#F8FBF9'],
  finance:['#4F9686','#397366','#EAF5F2','#C4DFD8','#F7FBFA'],
  sources:['#648A95','#496A73','#EEF4F5','#CFDEE2','#F8FAFB']
};
var ZONE_THEME={home:'home',opportunities:'tenders',projects:'projects',partners:'contacts',finance:'finance',system:'apps'};

function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function norm(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function active(id){var e=document.getElementById(id);return !!(e&&e.classList.contains('active')&&e.style.display!=='none');}
function setText(el,text){if(el&&S(el.textContent).trim()!==text)el.textContent=text;}
function palette(c){
  if(!document.body||!c)return;
  document.body.style.setProperty('--pst-section-accent',c[0]);
  document.body.style.setProperty('--pst-section-deep',c[1]);
  document.body.style.setProperty('--pst-section-soft',c[2]);
  document.body.style.setProperty('--pst-section-line',c[3]);
  document.body.style.setProperty('--pst-section-wash',c[4]);
}
function currentZone(){
  if(active('page-workspace-home'))return'home';
  if(active('page-kek-tenders'))return'opportunities';
  if(active('page-workspace-projects')||active('page-workspace-project'))return'projects';
  if(active('page-workspace-contacts')||active('page-contacts'))return'partners';
  if(active('page-finance'))return'finance';
  if(document.getElementById('pwf-legacy-context')&&(active('page-oferta')||active('page-document-center')||active('page-invoices')))return'projects';
  if(active('page-workspace-apps')||active('module-hub')||active('page-home')||active('page-workspace-inbox')||active('page-workspace-commercial')||active('page-document-center')||active('page-oferta')||active('page-invoices'))return'system';
  return document.body&&document.body.dataset.pstBusinessZone||'home';
}
function navKeyForZone(zone){for(var i=0;i<PRIMARY.length;i++)if(PRIMARY[i].zone===zone)return PRIMARY[i].key;return'home';}
function applyZone(zone){
  zone=ZONE_COLORS[zone]?zone:'home';
  if(!document.body)return zone;
  document.body.dataset.pstBusinessZone=zone;
  try{var T=window.PSTSectionThemeV1;if(T&&typeof T.setSection==='function')T.setSection(ZONE_THEME[zone]||'home');}catch(e){}
  palette(ZONE_COLORS[zone]);
  var host=document.getElementById('pst-ws-canonical-nav'),key=navKeyForZone(zone);
  if(host)host.querySelectorAll('.pst-business-primary').forEach(function(b){b.classList.toggle('active',b.dataset.key===key);});
  return zone;
}
function normalizeNav(){
  var host=document.getElementById('pst-ws-canonical-nav');
  if(!host)return false;
  var work=host.querySelector('.pst-canon-work'),tools=host.querySelector('.pst-canon-tools');
  if(!work)return false;
  var title=host.querySelector('.pst-ws-navtitle');setText(title,'PPPP');
  PRIMARY.forEach(function(x){
    var b=host.querySelector('.pst-ws-navbtn[data-key="'+x.key+'"]');if(!b)return;
    b.classList.add('pst-business-primary');b.dataset.pstBusinessZone=x.zone;b.style.removeProperty('display');
    var l=b.querySelector('.pst-nav-label');setText(l,x.label);work.appendChild(b);
  });
  host.querySelectorAll('.pst-ws-navbtn').forEach(function(b){
    if(!b.classList.contains('pst-business-primary'))b.style.setProperty('display','none','important');
  });
  var toolsTitle=host.querySelector('.pst-canon-tools-title');if(toolsTitle)toolsTitle.style.setProperty('display','none','important');
  if(tools)tools.style.setProperty('display','none','important');
  applyZone(currentZone());
  return true;
}
function projectData(){return window.__pstIntegrityLastData||{};}
function latestOurOffer(d){
  var xs=A(d&&d.ourOffers).slice();
  if(d&&d.currentOurOffer&&xs.indexOf(d.currentOurOffer)<0)xs.unshift(d.currentOurOffer);
  xs.sort(function(a,b){return new Date((b&&b.sent_at)||(b&&b.updated_at)||(b&&b.created_at)||0)-new Date((a&&a.sent_at)||(a&&a.updated_at)||(a&&a.created_at)||0);});
  return xs[0]||null;
}
function offerSent(o){
  if(!o)return false;var st=o.offer_state||{};
  if(o.sent_at||st.sent_at||st.pst_sent_at)return true;
  return /\b(sent|derguar|submitted|issued)\b/.test(norm([o.status,o.state,o.sent_status,st.status,st.revision_status].join(' ')));
}
function procurementDefault(d,current){
  if(['bom','rfq','offers','comparison'].indexOf(current)>-1)return current;
  if(!A(d&&d.rfqs).length)return'rfq';
  if(!A(d&&d.supplierOffers).length)return'offers';
  return'comparison';
}
function commercialDefault(d,current){
  if(['pricing','client_offer'].indexOf(current)>-1)return current;
  return latestOurOffer(d)?'client_offer':'pricing';
}
function phaseFromView(page){
  if(!page)return'preparation';
  var area=S(page.getAttribute('data-pwf-area')),stage=S(page.getAttribute('data-pwf-stage'));
  if(area==='execution')return'execution';
  if(area==='finance')return'finance';
  if(area==='files'||area==='communication')return'sources';
  if(area==='procurement')return stage==='pricing'||stage==='client_offer'?'commercial':'procurement';
  return'preparation';
}
function phaseNavHtml(page,d){
  var current=S(page&&page.getAttribute('data-pwf-stage')),phase=phaseFromView(page),proc=procurementDefault(d,current),comm=commercialDefault(d,current);
  function b(phaseId,label,n,attr){return'<button type="button" class="pst-phase-btn '+(phase===phaseId?'on':'')+'" data-pst-phase="'+phaseId+'" '+attr+'><span>'+n+'</span><b>'+label+'</b></button>';}
  return '<div class="pst-business-phases">'+
    b('preparation','Përgatitja','1','data-pwf-area="overview"')+
    b('procurement','Prokurimi','2','data-pwf-stage="'+proc+'"')+
    b('commercial','Komerciale','3','data-pwf-stage="'+comm+'"')+
    b('execution','Ekzekutimi','4','data-pwf-area="execution"')+
    b('finance','Financa','5','data-pwf-area="finance"')+
    '</div><div class="pst-project-utilities"><button type="button" data-pwf-area="files">Skedarët</button><button type="button" data-pwf-area="communication">Komunikimi</button></div>';
}
function applyProjectPhase(page){
  var phase=phaseFromView(page),c=PHASE_COLORS[phase]||PHASE_COLORS.preparation;
  document.body.dataset.pstProjectPhase=phase;
  palette(c);
  return phase;
}
function decorateProjectNav(){
  var page=document.getElementById('page-workspace-project');if(!page||!page.classList.contains('active'))return false;
  var tabs=page.querySelector('.pst-pi-tabs');if(!tabs)return false;
  var html=phaseNavHtml(page,projectData());
  if(tabs.getAttribute('data-pst-operating-nav')!=='1'||tabs.innerHTML!==html){tabs.innerHTML=html;tabs.setAttribute('data-pst-operating-nav','1');}
  tabs.classList.add('pwf-area-nav','pst-operating-phase-nav');
  applyProjectPhase(page);
  return true;
}
function decorateProcurementFlow(){
  var page=document.getElementById('page-workspace-project');if(!page||!page.classList.contains('active'))return false;
  var head=page.querySelector('.pwf-procurement-head'),nav=head&&head.querySelector('.pwf-stage-nav');if(!head||!nav)return false;
  var title=head.querySelector('.pwf-procurement-title');if(title){
    var span=title.querySelector('span'),b=title.querySelector('b'),small=title.querySelector('small');
    setText(span,'RRJEDHA E PUNËS');setText(b,'Prokurimi → Komerciale');setText(small,'PPPP të orienton te hapi që kërkon veprimin tënd. Hapat e tjerë mbeten të hapur për kontroll.');
  }
  nav.querySelectorAll('[data-pwf-stage]').forEach(function(b){
    var st=b.getAttribute('data-pwf-stage');b.classList.toggle('pst-procurement-stage',['bom','rfq','offers','comparison'].indexOf(st)>-1);b.classList.toggle('pst-commercial-stage',['pricing','client_offer'].indexOf(st)>-1);
  });
  return true;
}
function rewriteNextAction(){
  var page=document.getElementById('page-workspace-project');if(!page||!page.classList.contains('active'))return false;
  var next=page.querySelector('.pwf-next');if(!next)return false;
  var d=projectData(),p=d.project||{},stage=norm(p.pipeline_stage),op=norm(p.operational_state),status=norm(p.status),q=latestOurOffer(d),cfg=null;
  if(op==='wait for client'||op==='wait_for_client')cfg={eyebrow:'NË PRITJE',title:'Nuk kërkohet veprim tani',copy:'PPPP do ta rikthejë projektin te radha jote kur të vijë përgjigjja ose kur follow-up-i të bëhet i nevojshëm.',area:'communication',wait:true};
  else if(op==='execution'||status==='fituar'||status==='closedwon'||/production|factory audit|transport|execution|ekzek/.test(stage))cfg={eyebrow:'HAPI I RADHËS',title:'Vazhdo ekzekutimin',copy:'Hap fazën e ekzekutimit. PPPP mban dokumentet, readiness dhe blocker-at në prapaskenë.',area:'execution'};
  else if(/technical review|technical_review|verifikim teknik/.test(stage))cfg={eyebrow:'HAPI I RADHËS',title:'Përfundo përgatitjen teknike',copy:'Kontrollo kërkesat, dokumentet dhe çështjet që kërkojnë konfirmim para prokurimit/ofertimit.',area:'overview'};
  else if(/rfq/.test(stage))cfg={eyebrow:'HAPI I RADHËS',title:'Përgatit ose kontrollo RFQ',copy:'Kalo direkt te kërkesa për furnitorët.',stage:'rfq'};
  else if(/supplier|furnitor/.test(stage))cfg={eyebrow:'HAPI I RADHËS',title:A(d.supplierOffers).length?'Krahaso ofertat':'Mblidh ofertat e furnitorëve',copy:'PPPP të çon direkt te vendimi i radhës në prokurim.',stage:A(d.supplierOffers).length?'comparison':'offers'};
  else if(/pricing|cmim|çmim/.test(stage))cfg={eyebrow:'HAPI I RADHËS',title:'Vendos çmimin e shitjes',copy:'Kostoja dhe scope-i duhet të jenë të qarta; marzhi dhe çmimi final mbeten human-gated.',stage:'pricing'};
  else if(/client offer|client_offer|ofert/.test(stage)){
    if(q&&!offerSent(q))cfg={eyebrow:'HAPI I RADHËS',title:'Kontrollo dhe finalizo ofertën',copy:'Drafti ekziston. Çmimi final dhe dërgimi kërkojnë aprovimin tënd.',stage:'client_offer'};
    else cfg={eyebrow:'HAPI I RADHËS',title:'Shqyrto komunikimin me klientin',copy:'Oferta është në fazën e klientit. Kontrollo përgjigjen ose follow-up-in.',area:'communication'};
  }
  if(!cfg)return false;
  next.removeAttribute('data-pwf-stage');next.removeAttribute('data-pwf-area');
  if(cfg.stage)next.setAttribute('data-pwf-stage',cfg.stage);if(cfg.area)next.setAttribute('data-pwf-area',cfg.area);
  next.classList.toggle('pst-next-wait',!!cfg.wait);
  var span=next.querySelector('span'),b=next.querySelector('b'),small=next.querySelector('small');setText(span,cfg.eyebrow);setText(b,cfg.title);setText(small,cfg.copy);
  return true;
}
function stabilizeHome(){
  var page=document.getElementById('page-workspace-home');if(!page||!page.classList.contains('active'))return false;
  var list=document.getElementById('pst-ws-home-actions'),card=list&&list.closest('.pst-ws-card');
  if(card){var title=card.querySelector('.pst-ws-card-title'),sub=card.querySelector('.pst-ws-card-sub');setText(title,'Duhet veprimi yt');setText(sub,'PPPP shfaq vetëm vendimet dhe veprimet që kërkojnë ndërhyrjen tënde.');card.setAttribute('data-pst-decision-queue','1');}
  var rows=list&&list.querySelectorAll(':scope > .pst-ws-action');if(rows&&rows.length){rows.forEach(function(r,i){r.classList.toggle('pst-decision-primary',i===0);});}
  return true;
}
function systemHost(){
  var ids=['page-workspace-apps','module-hub','page-home'];for(var i=0;i<ids.length;i++){var e=document.getElementById(ids[i]);if(e&&e.classList.contains('active'))return e;}return null;
}
function openTool(k){
  if(k==='gmail'){if(typeof window.pstWsGmail==='function')return window.pstWsGmail('inbox');if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('inbox');}
  if(k==='commercial'&&typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('commercial');
  if(k==='automation'){var e=document.getElementById('pst-automation-health');if(e&&typeof e.scrollIntoView==='function')e.scrollIntoView({behavior:'smooth',block:'start'});}
}
function decorateSystem(){
  if(currentZone()!=='system')return false;var h=systemHost();if(!h)return false;
  var box=document.getElementById('pst-system-operating-tools');
  if(!box){box=document.createElement('section');box.id='pst-system-operating-tools';box.innerHTML='<div><span>SYSTEM</span><b>Integrimet dhe automatizimet</b><small>Mjetet teknike që punojnë në prapaskenë janë këtu, jo në rrjedhën e përditshme.</small></div><nav><button type="button" data-pst-system-tool="gmail">Gmail</button><button type="button" data-pst-system-tool="commercial">Mjete komerciale</button><button type="button" data-pst-system-tool="automation">Automation Health</button></nav>';
    h.insertBefore(box,h.firstChild);box.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('[data-pst-system-tool]'):null;if(b)openTool(b.getAttribute('data-pst-system-tool'));});
  }
  return true;
}
function css(){
  if(document.getElementById('pst-operating-experience-v1-css'))return;
  var s=document.createElement('style');s.id='pst-operating-experience-v1-css';s.textContent=`
body[data-pst-business-zone] .content{background:var(--pst-section-wash)!important}
#pst-ws-canonical-nav .pst-canon-work{display:flex!important;flex-direction:column!important;gap:4px!important}
#pst-ws-canonical-nav .pst-business-primary{border-radius:11px!important;min-height:44px!important;padding:0 11px!important;transition:background .14s ease,color .14s ease,box-shadow .14s ease!important}
#pst-ws-canonical-nav .pst-business-primary.active{background:var(--pst-section-soft)!important;color:var(--pst-section-deep)!important;box-shadow:inset 3px 0 0 var(--pst-section-accent)!important}
#pst-ws-canonical-nav>.pst-ws-navtitle:first-child{color:#87959c!important;letter-spacing:.12em!important;font-size:9px!important}
body[data-pst-business-zone] .content>.page.active,body[data-pst-business-zone] .content>#module-hub.active{animation:pst-zone-in .12s ease-out both}
@keyframes pst-zone-in{from{opacity:.78;transform:translateY(2px)}to{opacity:1;transform:none}}
#page-workspace-home [data-pst-decision-queue="1"]{border-top:3px solid var(--pst-section-accent)!important}
#page-workspace-home #pst-ws-home-actions>.pst-decision-primary{border-left:4px solid var(--pst-section-accent)!important;box-shadow:0 7px 22px rgba(45,64,75,.10)!important}
#page-workspace-project .pst-operating-phase-nav{position:sticky!important;top:0!important;z-index:18!important;display:flex!important;align-items:stretch!important;gap:10px!important;padding:9px 10px!important;margin:-1px -1px 14px!important;background:rgba(255,255,255,.96)!important;border:1px solid var(--pst-section-line)!important;border-radius:13px!important;box-shadow:0 6px 20px rgba(47,62,72,.08)!important;backdrop-filter:blur(10px)!important}
#page-workspace-project .pst-business-phases{display:grid!important;grid-template-columns:repeat(5,minmax(104px,1fr))!important;gap:5px!important;flex:1 1 auto!important;min-width:0!important}
#page-workspace-project .pst-phase-btn{display:grid!important;grid-template-columns:22px minmax(0,1fr)!important;align-items:center!important;gap:7px!important;min-height:42px!important;padding:6px 9px!important;border:1px solid #E0E7EA!important;border-radius:10px!important;background:#fff!important;color:#5D6E75!important;text-align:left!important;box-shadow:none!important}
#page-workspace-project .pst-phase-btn>span{display:grid!important;place-items:center!important;width:21px!important;height:21px!important;border-radius:999px!important;background:#F1F4F5!important;color:#728087!important;font-size:8px!important;font-weight:850!important}
#page-workspace-project .pst-phase-btn>b{font-size:9px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
#page-workspace-project .pst-phase-btn.on{background:var(--pst-section-soft)!important;border-color:var(--pst-section-line)!important;color:var(--pst-section-deep)!important;box-shadow:inset 0 -2px 0 var(--pst-section-accent)!important}
#page-workspace-project .pst-phase-btn.on>span{background:var(--pst-section-accent)!important;color:#fff!important}
#page-workspace-project .pst-project-utilities{display:flex!important;gap:5px!important;align-items:stretch!important;padding-left:9px!important;border-left:1px solid #E3E9EB!important}
#page-workspace-project .pst-project-utilities button{min-height:42px!important;padding:0 10px!important;border:1px solid #E0E7EA!important;border-radius:10px!important;background:#fff!important;color:#687980!important;font-size:8px!important;font-weight:800!important;white-space:nowrap!important}
#page-workspace-project .pwf-project-context{border-top:4px solid var(--pst-section-accent)!important;background:linear-gradient(180deg,var(--pst-section-wash),#fff 58%)!important}
#page-workspace-project .pwf-next{border-color:var(--pst-section-line)!important;background:var(--pst-section-soft)!important;color:var(--pst-section-deep)!important;box-shadow:none!important}
#page-workspace-project .pwf-next:not(.pst-next-wait):hover{border-color:var(--pst-section-accent)!important;background:var(--pst-section-wash)!important}
#page-workspace-project .pwf-next.pst-next-wait{cursor:default!important;background:#F7F9FA!important;border-color:#DDE5E8!important;color:#617179!important}
#page-workspace-project .pwf-procurement-head{border-top:3px solid var(--pst-section-accent)!important}
#page-workspace-project .pwf-stage.pst-procurement-stage{box-shadow:inset 0 3px 0 #B18A4F!important}
#page-workspace-project .pwf-stage.pst-commercial-stage{box-shadow:inset 0 3px 0 #8473A8!important}
#page-workspace-project .pwf-stage[data-pwf-stage="bom"]{position:relative!important;margin-top:17px!important}
#page-workspace-project .pwf-stage[data-pwf-stage="pricing"]{position:relative!important;margin-top:17px!important}
#page-workspace-project .pwf-stage[data-pwf-stage="bom"]::before{content:"PROKURIMI";position:absolute;left:0;top:-16px;color:#856738;font-size:7px;font-weight:900;letter-spacing:.10em}
#page-workspace-project .pwf-stage[data-pwf-stage="pricing"]::before{content:"KOMERCIALE";position:absolute;left:0;top:-16px;color:#655786;font-size:7px;font-weight:900;letter-spacing:.10em}
#pst-system-operating-tools{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:0 0 14px;padding:14px 16px;border:1px solid var(--pst-section-line);border-top:4px solid var(--pst-section-accent);border-radius:14px;background:#fff;box-shadow:0 5px 18px rgba(48,63,73,.07)}
#pst-system-operating-tools>div>span{display:block;color:var(--pst-section-deep);font-size:8px;font-weight:900;letter-spacing:.12em}#pst-system-operating-tools>div>b{display:block;margin-top:3px;color:#31464f;font-size:13px}#pst-system-operating-tools>div>small{display:block;margin-top:3px;color:#77878e;font-size:8px}
#pst-system-operating-tools nav{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}#pst-system-operating-tools button{height:34px;padding:0 11px;border:1px solid var(--pst-section-line);border-radius:9px;background:var(--pst-section-soft);color:var(--pst-section-deep);font-size:8px;font-weight:850;cursor:pointer}
@media(max-width:1050px){#page-workspace-project .pst-operating-phase-nav{overflow-x:auto!important}#page-workspace-project .pst-business-phases{grid-template-columns:repeat(5,112px)!important}#pst-system-operating-tools{align-items:flex-start;flex-direction:column}}
`;
  document.head.appendChild(s);
}
function apply(){
  css();normalizeNav();var zone=applyZone(currentZone());
  if(zone==='home')stabilizeHome();
  if(zone==='projects'&&active('page-workspace-project')){decorateProjectNav();decorateProcurementFlow();rewriteNextAction();applyProjectPhase(document.getElementById('page-workspace-project'));}
  if(zone==='system')decorateSystem();
  return zone;
}
function schedule(){[0,70,180,420,900].forEach(function(ms){setTimeout(apply,ms);});}
function install(){
  if(window.__pstOperatingExperienceEventsV1)return;window.__pstOperatingExperienceEventsV1=true;
  document.addEventListener('pst:modules-ready',schedule,{once:true});
  document.addEventListener('pst:home-canonical-rendered',schedule);
  document.addEventListener('pst:project-opened',schedule);
  window.addEventListener('pageshow',schedule,{once:true});
  document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav .pst-ws-navbtn,[data-pwf-area],[data-pwf-stage],[data-pwf-action],[onclick*="pstWorkspaceGo"],[onclick*="showPage"],[onclick*="openModuleHub"]'):null;if(t)[0,80,260,650].forEach(function(ms){setTimeout(apply,ms);});},true);
}
css();install();if(document.readyState!=='loading')schedule();
window.PSTOperatingExperienceV1={apply:apply,schedule:schedule,normalizeNav:normalizeNav,currentZone:currentZone,applyZone:applyZone,decorateProjectNav:decorateProjectNav,rewriteNextAction:rewriteNextAction,_test:{phaseFromView:phaseFromView,procurementDefault:procurementDefault,commercialDefault:commercialDefault,offerSent:offerSent}};
})();
