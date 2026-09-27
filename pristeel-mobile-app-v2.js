/* PRISTEEL Mobile App v2
 * Dedicated mobile presentation shell for PPPP.
 * Reuses canonical data/action owners; does not introduce a second business engine.
 */
(function(){
'use strict';
if(window.__pstMobileAppV2)return;
window.__pstMobileAppV2=true;

var VERSION='20260926-mobile-app9-inbox-links1';
var ROOT='pst-mobile-app-v2';
var NAV='pst-mobile-app-v2-nav';
var UTIL='pst-mobile-app-v2-util';
var BACK='pst-mobile-app-v2-back';
var CSS='pst-mobile-app-v2-css';
var TAB_ORDER=['home','projects','discover','inbox'];
var scheduleTimer=0,homeRenderTimer=0;
var state={
  tab:'home',detail:false,projectQuery:'',discover:'tenders',
  opportunities:[],opportunityIndex:0,oppLoading:false,
  inboxLoading:false,materialLoading:false,repLoading:false,
  homeCache:null,homeCacheAt:0,scrollByTab:{home:0,projects:0,discover:0,inbox:0},
  plusOpen:false,moreOpen:false,
  nativeProjectId:'',projectReturnTab:'projects',
  nativeCompanyMode:'',nativeCompanyKey:'',companySearch:'',companyFilter:'all',companyBusy:false,companyReturnTab:'home'
};

function S(v){return String(v==null?'':v);}
function A(v){return Array.isArray(v)?v:[];}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function compact(){var iw=Number(innerWidth||9999),sw=Number(screen&&screen.width||9999);return Math.min(iw,sw)<=900;}
function visible(el){if(!el)return false;try{var s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden';}catch(e){return el.style.display!=='none';}}
function authBlocking(){
  var pin=document.getElementById('pst-mobile-pin-gate'),auth=document.getElementById('auth-gate'),app=document.getElementById('app-shell-root');
  var shellActive=!!(document.body&&document.body.classList.contains('pst-mobile-v2-active'));
  return !!((pin&&pin.classList.contains('on'))||(auth&&visible(auth))||(app&&!visible(app)&&!shellActive));
}
function host(){return document.querySelector('#app-shell-root .content,.app-shell .content,.content')||document.body;}
function icon(name){
  var p={
    home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/>',
    folder:'<path d="M3.5 7.5h7l2 2h8v10h-17z"/><path d="M3.5 7.5V5h7l2 2"/>',
    discover:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/>',
    inbox:'<path d="M4 5h16v14H4z"/><path d="M4 13h5l2 3h2l2-3h5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    spark:'<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/>',
    arrow:'<path d="m9 6 6 6-6 6"/>',
    warning:'<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sun:'<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    fx:'<path d="M5 7h12"/><path d="m14 4 3 3-3 3"/><path d="M19 17H7"/><path d="m10 14-3 3 3 3"/>',
    chart:'<path d="M4 18V10M10 18V6M16 18v-5M21 18V3"/><path d="m3 8 6-4 6 5 6-6"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    building:'<path d="M5 21V4h10v17M15 9h4v12M8 8h3M8 12h3M8 16h3"/>',
    finance:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M16 14h2"/>',
    system:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
    doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
    people:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-4 2.5-6 5.5-6s5 2 5.5 6M16 8h4M18 6v4"/>',
    back:'<path d="m15 5-7 7 7 7"/>',
    chevron:'<path d="m9 6 6 6-6 6"/>',
    refresh:'<path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.5 8a7 7 0 0 1 11.2-1.2L20 9M4 15l2.3 2.2A7 7 0 0 0 17.5 16"/>'
  }[name]||'';
  return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
}
function session(){try{if(typeof window.authGetSession==='function'){var s=window.authGetSession();if(s)return s;}}catch(e){}try{return JSON.parse(localStorage.getItem('pristeel_session')||'null')||{};}catch(e){return{};}}
function jwt(tok){try{var p=S(tok).split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(p.length%4)p+='=';return JSON.parse(atob(p));}catch(e){return{};}}
function identity(){
  var s=session()||{},u=s.user||{},m=u.user_metadata||{},j=jwt(s.access_token||''),full=S(m.full_name||m.name||u.full_name||s.full_name).trim(),email=S(u.email||s.email||j.email),first=full.split(/\s+/)[0]||'';
  if(!first&&/^arianit/i.test(email))first='Arianit';
  var base=full||first||email||'P',initials=base.split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x[0].toUpperCase();}).join('')||'P';
  return{first:first||'',initials:initials};
}
function greeting(){var h=new Date().getHours();return h<12?'Mirëmëngjes':h<18?'Mirëdita':'Mirëmbrëma';}
function today(){return new Date().toLocaleDateString('sq-AL',{weekday:'long',day:'2-digit',month:'long'});}
function short(v,n){v=S(v).replace(/\s+/g,' ').trim();return v.length>(n||100)?v.slice(0,(n||100)-1)+'…':v;}
function projectDate(v){
  if(!v)return'';var d=new Date(v);if(isNaN(d.getTime()))return S(v);
  return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'});
}
function homeSnapshot(){
  try{
    var H=window.PSTHomeCanonicalV1;
    if(H&&typeof H.snapshot==='function'){
      var x=H.snapshot()||{},snap={actions:A(x.actions),waiting:A(x.waiting),projects:A(x.projects)};
      if(snap.actions.length||snap.waiting.length||snap.projects.length){state.homeCache=snap;state.homeCacheAt=Date.now();return snap;}
      if(state.homeCache&&Date.now()-state.homeCacheAt<30000)return state.homeCache;
      return snap;
    }
  }catch(e){}
  if(state.homeCache&&Date.now()-state.homeCacheAt<30000)return state.homeCache;
  return{actions:[],waiting:[],projects:[]};
}
function projectId(r){return S(r&&r.project_id||(r&&r.row&&r.row.id)||(r&&r.context&&r.context.project&&r.context.project.id)||r&&r.id);}
function projectName(r){return S(r&&r.project||r&&r.name||(r&&r.row&&r.row.name)||(r&&r.context&&r.context.project&&r.context.project.name)||'Projekt');}
function projectClient(r){return S(r&&r.client||(r&&r.row&&r.row.client)||(r&&r.context&&r.context.project&&r.context.project.client)||'');}
function projectRows(){
  var all=A(window._allProjectsCache||window.__pstWorkspaceProjectRows||(window.PSTProjectsModernV2&&window.PSTProjectsModernV2.state&&window.PSTProjectsModernV2.state.rows));
  if(!all.length)all=homeSnapshot().projects;
  var seen={};return all.filter(function(r){var id=projectId(r);if(!id||seen[id])return false;seen[id]=1;return true;});
}
function projectBucket(r){
  var op=N(r&&r.operational_state),st=N(r&&r.status),ps=N(r&&r.pipeline_stage);
  if(/closed|mbyllur|lost|humbur|archiv|cancel/.test(op+' '+st))return'closed';
  if(/action|required|attention|urgent/.test(op))return'action';
  if(/^wait_|waiting|pending|pritje/.test(op+' '+st))return'waiting';
  if(/execution|production|transport|factory_audit|fituar|won/.test(op+' '+st+' '+ps))return'execution';
  return'work';
}
function bucketLabel(k){return({action:'Kërkon veprim',waiting:'Në pritje',execution:'Në realizim',work:'Në punë',closed:'Mbyllur'})[k]||'Projekt';}
function legacyAction(selector){var old=document.getElementById('pst-mobile-home-v1'),b=old&&old.querySelector(selector);if(b&&typeof b.click==='function'){b.click();return true;}return false;}
function temp(){var old=document.getElementById('pst-mobile-home-v1'),t=old&&old.querySelector('.pmh-weather-temp');return t?short(t.textContent,6).replace('C','°'):'Moti';}
function ensureLegacyBack(){
  var b=document.getElementById(BACK);
  if(!b){b=document.createElement('button');b.id=BACK;b.setAttribute('type','button');b.setAttribute('data-pma-return-app','1');b.innerHTML=icon('back')+'<span>Kthehu në app</span>';document.body.appendChild(b);}
  b.style.display='flex';return b;
}
function hideLegacyBack(){var b=document.getElementById(BACK);if(b)b.style.display='none';}
function enterDetail(fn){
  state.detail=true;document.body&&document.body.classList.remove('pst-mobile-v2-active');
  var r=document.getElementById(ROOT);if(r)r.style.display='none';
  ensureLegacyBack();
  try{if(typeof fn==='function')fn();}catch(e){try{console.warn(e);}catch(x){}}
  syncNav();
}
function showShell(tab){
  state.detail=false;hideLegacyBack();state.tab=TAB_ORDER.indexOf(tab)>=0?tab:(state.tab||'home');document.body&&document.body.classList.add('pst-mobile-v2-active');
  render();
  requestAnimationFrame(function(){syncPager(true);});
}
function contactMaster(){return window.PSTContactMasterV4||window.PSTContactMasterV3||window.PSTContactMasterV2||window.PSTContactMasterV1||null;}
function contactRows(){var M=contactMaster();if(!M)return[];try{if(typeof M.snapshot==='function')return A(M.snapshot());}catch(e){}return A(M.state&&M.state.rows);}
function partnerForContact(r){
  var M=contactMaster(),st=M&&M.state,name=N(r&&r.company);
  if(!st||!name||!st.partnerByName||typeof st.partnerByName.get!=='function')return null;
  return st.partnerByName.get(name)||null;
}
function companyKeyFor(r){
  var p=partnerForContact(r);if(p&&p.id)return'partner:'+S(p.id);
  var n=N(r&&r.company);return n?'company:'+n:'contact:'+S(r&&r.contact_id||r&&r.id||'');
}
function companyGroups(){
  var rows=contactRows(),map={},out=[];
  rows.forEach(function(r){
    var key=companyKeyFor(r),p=partnerForContact(r),g=map[key];
    if(!g){g={key:key,name:S(p&&p.name||r.company||r.person||r.email||'Pa kompani'),partner:p||null,rows:[],projects:[],relations:[]};map[key]=g;out.push(g);}
    g.rows.push(r);
    A(r.projects).forEach(function(x){var id=S(x&&x.project_id||x&&x.id);if(id&&!g.projects.some(function(y){return S(y&&y.project_id||y&&y.id)===id;}))g.projects.push(x);});
    var k=N(r.kind);if(/client|klient/.test(k))g.relations.push('Klient');if(/supplier|furnitor/.test(k))g.relations.push('Furnitor');if(/partner/.test(k))g.relations.push('Partner');
  });
  var M=contactMaster(),st=M&&M.state;
  out.forEach(function(g){
    A(g.partner&&g.partner.relation).forEach(function(x){var n=N(x),label=n==='manufacturer'?'Prodhues':n==='supplier'?'Furnitor':n==='client'?'Klient':n==='partner'?'Partner':S(x);if(label)g.relations.push(label);});
    if(st&&st.manufacturerNames&&typeof st.manufacturerNames.has==='function'&&st.manufacturerNames.has(N(g.name)))g.relations.push('Prodhues');
    g.relations=Array.from(new Set(g.relations.filter(Boolean)));
  });
  return out.sort(function(a,b){return a.name.localeCompare(b.name,'sq');});
}
function companyGroup(key){return companyGroups().find(function(g){return g.key===key;})||null;}
function companyPeople(g){
  var seen={},out=[];A(g&&g.rows).forEach(function(r){var name=S(r.person||r.email||'Kontakt'),key=N(r.person||r.email||r.phone||r.contact_id||r.id);if(!key||seen[key])return;seen[key]=1;out.push({name:name,role:S(r.role),email:S(r.email),phone:S(r.phone),country:S(r.country),raw:r});});return out;
}
function companyCapabilities(g){
  var M=contactMaster(),st=M&&M.state,p=g&&g.partner;if(!st||!p||!p.id||!st.capabilitiesByPartner||typeof st.capabilitiesByPartner.get!=='function')return[];
  return A(st.capabilitiesByPartner.get(S(p.id)));
}
function companyLocation(g){var p=g&&g.partner,first=g&&g.rows&&g.rows[0];return [S(p&&p.city),S(p&&p.country||first&&first.country)].filter(Boolean).join(', ');}
function companyMatchesFilter(g){
  var f=state.companyFilter;if(f==='all')return true;var rel=A(g.relations).map(N);
  if(f==='client')return rel.indexOf('klient')>-1;
  if(f==='supplier')return rel.indexOf('furnitor')>-1;
  if(f==='manufacturer')return rel.indexOf('prodhues')>-1;
  return true;
}
async function loadCompanyData(force){
  var M=contactMaster();if(!M)return;
  state.companyBusy=true;render();
  try{
    if(typeof M.refresh==='function'&&(force||!contactRows().length||!(M.state&&M.state.profilesLoaded)))await M.refresh();
    else if(typeof M.load==='function'&&!contactRows().length)await M.load(false);
  }catch(e){try{console.warn('Mobile company data:',e);}catch(x){}}
  state.companyBusy=false;render();
}
function openCompanies(key){
  state.projectReturnTab=state.tab||'home';state.companyReturnTab=state.tab||'home';state.nativeCompanyMode=key?'detail':'list';state.nativeCompanyKey=key||'';state.nativeProjectId='';state.plusOpen=false;state.moreOpen=false;state.detail=false;hideLegacyBack();render();
  var M=contactMaster();if(M&&(!contactRows().length||!(M.state&&M.state.profilesLoaded)))loadCompanyData(false);
}
function companyListView(){
  var q=N(state.companySearch),groups=companyGroups().filter(companyMatchesFilter);
  if(q)groups=groups.filter(function(g){return N([g.name,companyLocation(g),A(g.relations).join(' '),companyPeople(g).map(function(p){return[p.name,p.email,p.role].join(' ');}).join(' ')].join(' ')).indexOf(q)>-1;});
  return '<div class="pma-native-company"><div class="pma-native-scroll"><div class="pma-co-head"><button type="button" data-pma-company-back>'+icon('back')+'</button><div><span>PARTNERËT</span><h1>Kompanitë</h1><p>Klientë, furnitorë, prodhues dhe partnerë.</p></div><button type="button" data-pma-company-refresh>'+icon('refresh')+'</button></div>'+
    '<label class="pma-co-search">'+icon('search')+'<input data-pma-company-search value="'+E(state.companySearch)+'" placeholder="Kërko kompani, person ose email"></label>'+
    '<div class="pma-co-filters">'+[['all','Të gjitha'],['client','Klientë'],['supplier','Furnitorë'],['manufacturer','Prodhues']].map(function(x){return'<button class="'+(state.companyFilter===x[0]?'on':'')+'" data-pma-company-filter="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>'+
    '<div class="pma-co-count">'+(state.companyBusy?'Duke rifreskuar…':E(groups.length+' kompani'))+'</div>'+
    '<div class="pma-co-list">'+(groups.length?groups.map(function(g){var people=companyPeople(g),loc=companyLocation(g),rel=A(g.relations).slice(0,3);return'<button type="button" class="pma-co-card" data-pma-company="'+E(g.key)+'"><span class="pma-co-logo">'+E((g.name||'P').charAt(0).toUpperCase())+'</span><span class="pma-co-copy"><b>'+E(g.name)+'</b><small>'+E([loc,g.partner&&g.partner.business_type].filter(Boolean).join(' · ')||'Partner PriSteel')+'</small><em>'+rel.map(function(x){return'<i>'+E(x)+'</i>';}).join('')+'</em></span><span class="pma-co-meta"><b>'+people.length+'</b><small>kontakte</small><b>'+g.projects.length+'</b><small>projekte</small></span>'+icon('chevron')+'</button>';}).join(''):'<div class="pma-empty large">'+(state.companyBusy?'Duke ngarkuar kompanitë…':'Nuk u gjet kompani me këto filtra.')+'</div>')+'</div></div></div>';
}
function companyDetailView(key){
  var g=companyGroup(key);if(!g)return companyListView();
  var p=g.partner||{},people=companyPeople(g),caps=companyCapabilities(g),loc=companyLocation(g),emails=g.rows.reduce(function(n,r){return n+(Number(r.project_email_count)||0);},0),last=g.rows.map(function(r){return r.last_seen_at||r.last_contact;}).filter(Boolean).sort().pop(),rel=A(g.relations),projects=A(g.projects);
  var capBits=[];caps.forEach(function(x){if(x.family)capBits.push(x.family);if(x.product_type)capBits.push(x.product_type);A(x.product_tags).forEach(function(v){capBits.push(v);});});capBits=Array.from(new Set(capBits.filter(Boolean))).slice(0,8);
  return '<div class="pma-native-company"><div class="pma-native-scroll"><div class="pma-co-head detail"><button type="button" data-pma-company-back>'+icon('back')+'</button><div><span>KOMPANI</span><h1>'+E(g.name)+'</h1><p>'+E([loc,p.business_type].filter(Boolean).join(' · ')||'Partner PriSteel')+'</p></div></div>'+
    '<div class="pma-co-rel">'+rel.map(function(x){return'<span>'+E(x)+'</span>';}).join('')+(p.stage?'<span>'+E(p.stage)+'</span>':'')+'</div>'+
    '<div class="pma-co-stats"><section><span>Kontaktet</span><b>'+people.length+'</b></section><section><span>Projektet</span><b>'+projects.length+'</b></section><section><span>Emaila projekti</span><b>'+emails+'</b></section><section><span>Kontakti i fundit</span><b>'+E(last?projectDate(last):'—')+'</b></section></div>'+
    (p.industry_note||capBits.length?'<section class="pma-co-section"><span>PROFILI</span><h3>Çfarë bën / furnizon</h3>'+(p.industry_note?'<p>'+E(p.industry_note)+'</p>':'')+(capBits.length?'<div class="pma-co-tags">'+capBits.map(function(x){return'<i>'+E(S(x).replace(/_/g,' '))+'</i>';}).join('')+'</div>':'')+'</section>':'')+
    '<section class="pma-co-section"><span>PERSONAT</span><h3>Kontaktet</h3><div class="pma-co-people">'+(people.length?people.map(function(x){return'<div class="pma-co-person"><i>'+E((x.name||'K').charAt(0).toUpperCase())+'</i><span><b>'+E(x.name)+'</b><small>'+E([x.role,x.email,x.phone].filter(Boolean).join(' · ')||'Kontakt')+'</small></span>'+(x.email?'<a href="mailto:'+E(x.email)+'">'+icon('mail')+'</a>':'')+'</div>';}).join(''):'<div class="pma-empty">Nuk ka persona kontakti.</div>')+'</div></section>'+
    '<section class="pma-co-section"><span>PROJEKTET</span><h3>Projektet e lidhura</h3><div class="pma-co-projects">'+(projects.length?projects.map(function(x){var id=S(x.project_id||x.id);return'<button type="button" data-pma-company-project="'+E(id)+'"><span><b>'+E(x.name||'Projekt')+'</b><small>'+E([x.role,x.email_count?x.email_count+' emaila':''].filter(Boolean).join(' · ')||'Projekt i lidhur')+'</small></span>'+icon('chevron')+'</button>';}).join(''):'<div class="pma-empty">Nuk ka projekte të lidhura.</div>')+'</div></section>'+
    (p.website?'<a class="pma-co-website" target="_blank" rel="noopener" href="'+E(p.website)+'">Hap website-in e kompanisë '+icon('arrow')+'</a>':'')+
    '</div></div>';
}

function projectRecord(id){
  id=S(id);var rows=projectRows(),i;
  for(i=0;i<rows.length;i++)if(projectId(rows[i])===id)return rows[i];
  var h=homeSnapshot(),all=h.projects.concat(h.actions,h.waiting);
  for(i=0;i<all.length;i++)if(projectId(all[i])===id)return all[i];
  return{id:id,name:'Projekt'};
}
function projectAction(id,r){
  var h=homeSnapshot(),i,x;
  for(i=0;i<h.actions.length;i++){x=h.actions[i];if(projectId(x)===id)return{kind:'action',title:S(x.title||'Veprim i kërkuar'),text:S(x.why||x.meta||'')};}
  for(i=0;i<h.waiting.length;i++){x=h.waiting[i];if(projectId(x)===id)return{kind:'waiting',title:'Në pritje',text:S(x.text||'Po presim përgjigje nga pala tjetër.')};}
  return{kind:'project',title:'Veprimi i radhës',text:S(r&&r.next||r&&r.operational_state||'Hap dosjen e projektit për të vazhduar.')};
}
function projectStageInfo(r){
  var full=[
    ['rfq_in','RFQ e klientit'],
    ['technical_review','Analiza teknike'],
    ['supplier_selection','Ofertat e furnitorëve'],
    ['pricing','Përcaktimi i çmimit'],
    ['client_offer','Oferta PriSteel'],
    ['commercial','Komerciale / kontrata'],
    ['production_control','Prodhimi'],
    ['factory_audit','Auditimi'],
    ['transport','Transporti / dorëzimi']
  ];
  var trading=[
    ['rfq_in','RFQ e klientit'],
    ['supplier_selection','Zgjedhja e furnitorit'],
    ['pricing','Përcaktimi i çmimit'],
    ['client_offer','Oferta PriSteel'],
    ['commercial','Komerciale / kontrata'],
    ['transport','Transporti / dorëzimi']
  ];
  var steps=/trading/.test(N(S(r&&r.deal_type||r&&r.business_type||r&&r.project_type)))?trading:full;
  var stage=S(r&&r.pipeline_stage||'rfq_in'),idx=0;
  for(var i=0;i<steps.length;i++)if(steps[i][0]===stage){idx=i;break;}
  return{steps:steps,index:idx,stage:stage};
}
function projectDetailView(id){
  var r=projectRecord(id),a=projectAction(id,r),st=projectStageInfo(r),bucket=projectBucket(r);
  var ref=S(r.ref||r.reference),deadline=projectDate(r.deadline),cl=projectClient(r),stageName=st.steps[st.index]&&st.steps[st.index][1]||'Projekt aktiv';
  var timeline=st.steps.map(function(step,i){var cls=i<st.index?'done':i===st.index?'current':'future';return '<div class="pma-pd-step '+cls+'"><i>'+(i<st.index?'✓':i===st.index?'•':'')+'</i><span><b>'+E(step[1])+'</b><small>'+E(i<st.index?'Përfunduar':i===st.index?'Aktuale':'Në vijim')+'</small></span></div>';}).join('');
  return '<div class="pma-native-project"><div class="pma-native-scroll"><div class="pma-pd-head"><button type="button" data-pma-project-back>'+icon('back')+'</button><div><span>PROJEKT</span><h1>'+E(projectName(r))+'</h1><p>'+E([cl,ref].filter(Boolean).join(' · ')||'PriSteel')+'</p></div></div>'+
    '<div class="pma-pd-status"><span class="'+E(bucket)+'">'+E(bucketLabel(bucket))+'</span><b>'+E(stageName)+'</b>'+(deadline?'<small>Afati · '+E(deadline)+'</small>':'')+'</div>'+
    '<div class="pma-pd-tabs"><button class="on">Overview</button><button data-pma-project-legacy="files">Files</button><button data-pma-project-legacy="emails">Emails</button><button data-pma-project-legacy="suppliers">Suppliers</button></div>'+
    '<section class="pma-pd-next '+E(a.kind)+'"><span>NEXT ACTION</span><h2>'+E(a.title)+'</h2><p>'+E(short(a.text,180))+'</p><button type="button" data-pma-project-legacy="full">Hap dosjen e plotë '+icon('arrow')+'</button></section>'+
    '<section class="pma-pd-timeline"><div class="pma-pd-section-title"><span>RRJEDHA</span><h3>Timeline i projektit</h3></div>'+timeline+'</section>'+
    '<section class="pma-pd-actions"><button type="button" data-pma-project-legacy="files">'+icon('folder')+'<span><b>Files</b><small>Drive & dokumente</small></span></button><button type="button" data-pma-project-legacy="emails">'+icon('mail')+'<span><b>Emails</b><small>Komunikimet</small></span></button><button type="button" data-pma-project-legacy="suppliers">'+icon('people')+'<span><b>Suppliers</b><small>Oferta & burime</small></span></button></section>'+
    '</div></div>';
}
function openProject(id){
  id=S(id);if(!id)return;
  state.projectReturnTab=state.tab||'projects';state.nativeProjectId=id;state.tab='projects';state.plusOpen=false;state.moreOpen=false;
  window.__pstCurrentProjectId=id;window._curProjId=id;try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  render();
}
function mobileRoute(key){enterDetail(function(){var M=window.PSTMobileResponsiveV1;if(M&&typeof M.route==='function')return M.route(key);if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo(key);});}
function openTender(id){enterDetail(function(){var X=window.PSTProjectCentricWorkflowV1;if(X&&typeof X.openTender==='function')return X.openTender(id);if(typeof window.pstTenderIntelligence==='function')return window.pstTenderIntelligence(id);});}
function openMaterial(){enterDetail(function(){var D=window.PSTDachSteelSalesV3||window.PSTDachSteelSalesV2||window.PSTDachSteelSalesV1;if(D&&typeof D.open==='function')D.open();});}
function openRepresentations(){enterDetail(function(){var R=window.PSTRepresentationsV1;if(R&&typeof R.open==='function')R.open();});}
function priorityItems(){
  var h=homeSnapshot(),out=[];
  h.actions.forEach(function(a){out.push({kind:'action',tag:a.tag||'VEPRO TANI',title:a.title||'Veprim i kërkuar',sub:projectName(a),text:a.why||a.meta||'',id:projectId(a)});});
  h.waiting.forEach(function(w){out.push({kind:'waiting',tag:'NË PRITJE',title:w.name||'Në pritje',sub:w.client||'',text:w.text||'Po presim palën tjetër.',id:projectId(w)});});
  if(!out.length)h.projects.slice(0,3).forEach(function(p){out.push({kind:'project',tag:'AKTIV',title:projectName(p),sub:projectClient(p),text:p.next||'Projekt aktiv.',id:projectId(p)});});
  return out.slice(0,8);
}
function header(title,sub){
  var me=identity();
  return '<header class="pma-top"><div class="pma-brand"><span>PRISTEEL</span><b>'+E(title||'')+'</b>'+(sub?'<small>'+E(sub)+'</small>':'')+'</div><button class="pma-avatar" type="button" data-pma-more>'+E(me.initials)+'</button></header>';
}
function homeView(){
  var me=identity(),h=homeSnapshot(),prior=priorityItems(),attention=h.actions.length+h.waiting.length;
  var activities=[];
  h.actions.slice(0,3).forEach(function(a){activities.push({k:'action',i:'warning',t:a.title||'Veprim',s:projectName(a),id:projectId(a)});});
  h.waiting.slice(0,2).forEach(function(a){activities.push({k:'waiting',i:'clock',t:a.name||'Në pritje',s:a.text||a.client||'',id:projectId(a)});});
  h.projects.slice(0,3).forEach(function(a){activities.push({k:'project',i:'folder',t:projectName(a),s:a.next||projectClient(a)||'',id:projectId(a)});});
  var p=prior[0]||null,oppCount=state.opportunities.length||'—';
  return '<div class="pma-screen pma-home">'+
    header('PriSteel',today())+
    '<section class="pma-hello"><span>'+E(greeting()+(me.first?', '+me.first:''))+'</span><h1>'+E(attention?attention+' çështje kërkojnë vëmendjen tënde sot.':'Gjendja e PriSteel është e qetë tani.')+'</h1></section>'+
    '<button type="button" class="pma-ask" data-pma-ask><span class="pma-ask-ic">'+icon('search')+'</span><span class="pma-ask-copy"><b>Pyet PPPP…</b><small>Projekt, email, supplier, tender, financë</small></span><i>'+icon('spark')+'</i></button>'+
    '<div class="pma-section-label"><span>PRIORITETI KRYESOR</span><small>Swipe ndërron faqen</small></div>'+
    '<div class="pma-priority-strip" data-pma-priority-strip>'+
      (p?'<article class="pma-priority '+E(p.kind)+'" data-pma-project="'+E(p.id)+'"><div class="pma-priority-top"><span>'+E(p.tag)+'</span><i>'+E('1 / '+prior.length)+'</i></div><h2>'+E(p.title)+'</h2>'+(p.sub?'<b>'+E(p.sub)+'</b>':'')+'<p>'+E(short(p.text,170))+'</p>'+(p.id?'<button type="button">Hap projektin '+icon('arrow')+'</button>':'')+'</article>':'<article class="pma-priority calm"><div class="pma-priority-top"><span>GJENDJA</span><i>Live</i></div><h2>Nuk ka prioritet urgjent</h2><p>PPPP nuk po raporton veprime të hapura tani.</p></article>')+
    '</div>'+
    '<div class="pma-today">'+
      '<button data-pma-tab="projects"><i>'+icon('folder')+'</i><strong>'+h.projects.length+'</strong><span>Në punë</span></button>'+
      '<button data-pma-tab="home"><i>'+icon('clock')+'</i><strong>'+h.waiting.length+'</strong><span>Në pritje</span></button>'+
      '<button data-pma-tab="discover"><i>'+icon('discover')+'</i><strong>'+E(oppCount)+'</strong><span>Mundësi</span></button>'+
      '<button data-pma-tab="inbox"><i>'+icon('inbox')+'</i><strong>✉</strong><span>Inbox</span></button>'+
    '</div>'+
    '<section class="pma-card pma-activity"><div class="pma-card-head"><div><span>AKTIVITETI</span><h3>Çfarë po ndodh</h3></div><button type="button" data-pma-home-refresh>Rifresko</button></div>'+
      '<div>'+activities.slice(0,6).map(function(r){return '<button type="button" class="pma-activity-row" '+(r.id?'data-pma-project="'+E(r.id)+'"':'')+'><i class="'+E(r.k)+'">'+icon(r.i)+'</i><span><b>'+E(r.t)+'</b><small>'+E(short(r.s,100))+'</small></span><em>›</em></button>';}).join('')+'</div>'+
    '</section>'+
  '</div>';
}
function projectsView(){
  var rows=projectRows(),q=N(state.projectQuery);
  if(q)rows=rows.filter(function(r){return N([projectName(r),projectClient(r),r.reference,r.ref,r.pipeline_stage,r.operational_state].join(' ')).indexOf(q)>-1;});
  rows.sort(function(a,b){var order={action:0,work:1,execution:2,waiting:3,closed:4};return order[projectBucket(a)]-order[projectBucket(b)];});
  var open=rows.filter(function(r){return projectBucket(r)!=='closed';});
  return '<div class="pma-screen">'+header('Projektet','Puna aktive e PriSteel')+
    '<label class="pma-search">'+icon('search')+'<input data-pma-project-search value="'+E(state.projectQuery)+'" placeholder="Kërko projekt, klient ose referencë"></label>'+
    '<div class="pma-project-summary"><span><b>'+open.length+'</b> aktive</span><span><b>'+rows.filter(function(x){return projectBucket(x)==='action';}).length+'</b> kërkojnë veprim</span><span><b>'+rows.filter(function(x){return projectBucket(x)==='waiting';}).length+'</b> në pritje</span></div>'+
    '<div class="pma-work-feed">'+(rows.length?rows.slice(0,80).map(function(r){
      var k=projectBucket(r),ref=S(r.ref||r.reference||''),next=S(r.next||r.pipeline_stage||'Hap projektin');
      return '<button type="button" class="pma-work-card '+E(k)+'" data-pma-project="'+E(projectId(r))+'"><div class="pma-work-top"><span class="pma-project-state '+E(k)+'">'+E(bucketLabel(k))+'</span>'+(ref?'<small>'+E(ref)+'</small>':'')+'</div><h3>'+E(projectName(r))+'</h3><p>'+E(projectClient(r)||'Projekt PriSteel')+'</p><div class="pma-work-next"><span>TANI</span><b>'+E(short(next,90))+'</b><i>'+icon('chevron')+'</i></div></button>';
    }).join(''):'<div class="pma-empty">Nuk ka projekte për këtë kërkim.</div>')+'</div>'+
  '</div>';
}
function oppApi(){return window.PSTTenderPriorityActionsV2||window.PSTTenderPriorityActionsV1||null;}
function discoverTenders(){
  var P=oppApi(),rows=state.opportunities;
  if(state.oppLoading&&!rows.length)return '<div class="pma-empty large">Duke lexuar mundësitë…</div>';
  if(!rows.length)return '<div class="pma-empty large">Nuk ka mundësi prioritare tani.<button type="button" data-pma-opp-refresh>Rifresko</button></div>';
  return '<div class="pma-discover-summary"><b>'+E(rows.length)+'</b><span>mundësi prioritare</span></div><div class="pma-discover-feed">'+rows.map(function(r,idx){
    var phase=P&&P.phase?P.phase(r):'opportunity',fit=P&&P.fit?P.fit(r):'possible',source=P&&P.sourceLabel?P.sourceLabel(r):'Tender',why=P&&P.reason?P.reason(r):'Kërkon shqyrtim.',score=Math.round(Number(r.relevance_score)||0),winner=P&&P.winner?P.winner(r):{};
    return '<article class="pma-opportunity-card '+E(fit)+'"><div class="pma-opp-top"><span>'+E(phase==='award'?'FITUES I PUBLIKUAR':'TENDER AKTIV')+'</span><span>'+E(source)+'</span><b>'+E(score?score+'%':'REVIEW')+'</b></div><h2>'+E(r.title||'Mundësi pa titull')+'</h2><p>'+E(short(why,180))+'</p><div class="pma-opp-facts">'+(r.authority?'<span>Autoriteti<b>'+E(r.authority)+'</b></span>':'')+(r.deadline?'<span>Afati<b>'+E(P&&P.dateText?P.dateText(r.deadline):r.deadline)+'</b></span>':'')+(phase==='award'&&winner&&winner.name?'<span>Fituesi<b>'+E(winner.name)+'</b></span>':'')+'</div><div class="pma-opp-actions"><button type="button" data-pma-opp-action="review" data-id="'+E(r.id)+'">Ruaj</button><button type="button" data-pma-opp-action="open" data-id="'+E(r.id)+'">Hulumto</button><button type="button" class="danger" data-pma-opp-action="nogo" data-id="'+E(r.id)+'">Jo relevante</button><button type="button" class="primary" data-pma-opp-action="'+E(phase==='award'?'draft':'go')+'" data-id="'+E(r.id)+'">'+E(phase==='award'?'Përgatit kontakt':'GO · Krijo projekt')+'</button></div><div class="pma-card-index">'+E((idx+1)+' / '+rows.length)+'</div></article>';
  }).join('')+'</div>';
}
function discoverMaterial(){
  var D=window.PSTDachSteelSalesV3||window.PSTDachSteelSalesV2||window.PSTDachSteelSalesV1,s=D&&typeof D.snapshot==='function'?D.snapshot():{},rows=A(s.targets).filter(function(r){return !r.archived_at;}).slice(0,40);
  if(state.materialLoading&&!rows.length)return '<div class="pma-empty large">Duke lexuar Material Trade…</div>';
  return '<div class="pma-discover-summary"><b>'+E(rows.length)+'</b><span>targete Material Trade</span></div><div class="pma-target-feed">'+(rows.length?rows.map(function(r){
    var meta=[r.country,r.buyer_type,r.score_band].filter(Boolean).join(' · '),why=r.why_now||r.next_action||r.steel_scope||'Target i kualifikuar për material çeliku.';
    return '<button type="button" class="pma-target-card material" data-pma-open-material><div class="pma-target-top"><span>MATERIAL</span><em>'+E(r.score_band||'')+'</em></div><h3>'+E(r.company_name||'Kompani')+'</h3><small>'+E(meta)+'</small><p>'+E(short(why,150))+'</p><div><b>'+E(r.quote_readiness||'')+'</b><i>'+icon('chevron')+'</i></div></button>';
  }).join(''):'<div class="pma-empty large">Nuk ka targete aktive Material Trade.<button type="button" data-pma-material-refresh>Rifresko</button></div>')+'</div>';
}
function discoverRep(){
  var R=window.PSTRepresentationsV1,s=R&&typeof R.snapshot==='function'?R.snapshot():{},targets=A(s.rows).filter(function(r){return !r.archived_at;}).slice(0,30),opps=A(s.opportunities);
  var open=opps.filter(function(r){return S(r.status)==='tender_open';}),review=opps.filter(function(r){return S(r.status)!=='tender_open';}),feed=open.concat(review).slice(0,30);
  if(state.repLoading&&!targets.length&&!feed.length)return '<div class="pma-empty large">Duke lexuar Përfaqësimet…</div>';
  var targetHtml=targets.length?'<div class="pma-target-feed">'+targets.map(function(r){
    var why=r.priority_reason||r.why_kosovo||r.next_action||'Target për zhvillim përfaqësimi.';
    return '<button type="button" class="pma-target-card rep" data-pma-open-rep><div class="pma-target-top"><span>TARGET</span><em>'+E(r.priority_score!=null?r.priority_score:'')+'</em></div><h3>'+E(r.company_name||'Kompani')+'</h3><small>'+E([r.country,r.sector,r.product_category].filter(Boolean).join(' · '))+'</small><p>'+E(short(why,150))+'</p><div><b>'+E(r.stage||'found')+'</b><i>'+icon('chevron')+'</i></div></button>';
  }).join('')+'</div>':'';
  var oppHtml=feed.length?'<div class="pma-rep-review-head"><b>'+E(open.length)+'</b><span>të hapura · '+E(feed.length)+' për screening</span></div><div class="pma-target-feed">'+feed.map(function(r){
    var live=S(r.status)==='tender_open',meta=[r.funding_institution,r.tender_reference,r.procurement_stage].filter(Boolean).join(' · ');
    return '<button type="button" class="pma-target-card rep '+(live?'live':'review')+'" '+(r.official_source?'data-pma-rep-opportunity-url="'+E(r.official_source)+'"':'data-pma-open-rep')+'><div class="pma-target-top"><span>'+(live?'TENDER I HAPUR':'SCREENING')+'</span><em>'+E(r.verification_status||'review')+'</em></div><h3>'+E(r.project_name||'Mundësi partneriteti')+'</h3><small>'+E(meta)+'</small><p>'+E(short(r.scope||'Kandidat për JV / partner lokal / përfaqësim.',150))+'</p><div><b>'+E(live?'Shqyrto tani':'Për review')+'</b><i>'+icon('chevron')+'</i></div></button>';
  }).join('')+'</div>':'';
  return '<div class="pma-discover-summary"><b>'+E(targets.length)+'</b><span>targete të aprovuara · '+E(opps.length)+' mundësi për screening</span></div>'+targetHtml+oppHtml+
    ((!targets.length&&!feed.length)?'<div class="pma-empty large"><b>Nuk ka të dhëna Përfaqësime.</b><button type="button" data-pma-open-rep>Hap modulin Përfaqësime</button></div>':'');
}
function discoverView(){
  return '<div class="pma-screen">'+header('Discover','Mundësi të reja për PriSteel')+
    '<div class="pma-discover-tabs"><button data-pma-discover="tenders" class="'+(state.discover==='tenders'?'on':'')+'">Tenderë</button><button data-pma-discover="material" class="'+(state.discover==='material'?'on':'')+'">Material</button><button data-pma-discover="represent" class="'+(state.discover==='represent'?'on':'')+'">Përfaqësime</button></div>'+
    '<div class="pma-discover-body">'+(state.discover==='material'?discoverMaterial():state.discover==='represent'?discoverRep():discoverTenders())+'</div>'+
  '</div>';
}
function inboxView(){
  var I=window.PSTGmailLiveInboxV2,s=I&&typeof I.snapshot==='function'?I.snapshot():{},live=A(s.liveRows),canonical=A(s.canonicalRows),byThread={},byMessage={};
  canonical.forEach(function(r){var tid=S(r.gmail_thread_id),mid=S(r.gmail_message_id);if(tid&&!byThread[tid])byThread[tid]=r;if(mid&&!byMessage[mid])byMessage[mid]=r;});
  var rows=live.length?live.map(function(r){
    var c=byThread[S(r.gmail_thread_id)]||byMessage[S(r.gmail_message_id)]||null;
    if(!c)return r;
    var x=Object.assign({},c,r);
    x.project_id=r.project_id||c.project_id||null;
    x.suggested_project_id=r.suggested_project_id||c.suggested_project_id||null;
    x.gmail_url=r.gmail_url||c.gmail_url||'';
    return x;
  }):canonical,connected=!!s.connected,source=live.length?'Gmail live':'PPPP email sync';
  return '<div class="pma-screen">'+header('Inbox','Email & komunikim')+
    '<div class="pma-inbox-status"><span class="'+(connected?'on':'')+'">'+(connected?'● Gmail i lidhur':'○ Gmail jo i lidhur')+'</span><small>'+E(source)+(rows.length?' · '+rows.length+' thread-e':'')+'</small></div>'+
    '<div class="pma-inbox-tools"><button type="button" data-pma-inbox-refresh>'+icon('mail')+'<span><b>'+E(state.inboxLoading?'Duke ngarkuar…':connected?'Rifresko Gmail':'Lidhu me Gmail')+'</b><small>'+E(connected?'Thread-et live + PPPP':'Email-et e sinkronizuara janë poshtë')+'</small></span></button><button type="button" data-pma-classic-inbox>Hap Inbox-in e plotë</button></div>'+
    (s.error?'<div class="pma-inline-error">'+E(s.error)+'</div>':'')+
    '<div class="pma-inbox-list">'+(rows.length?rows.slice(0,30).map(function(r){
      var gu=S(r.gmail_url)||(r.gmail_thread_id?'https://mail.google.com/mail/#all/'+encodeURIComponent(S(r.gmail_thread_id)):'');
      var main='<span class="pma-inbox-ic">'+icon('mail')+'</span><span class="pma-inbox-copy"><b>'+E(r.subject||'(pa subjekt)')+'</b><small>'+E([r.from_name||r.from_email,r.sent_at?new Date(r.sent_at).toLocaleDateString('sq-AL',{day:'2-digit',month:'short'}):''].filter(Boolean).join(' · '))+'</small><em>'+E(short(r.snippet,145))+'</em></span>';
      return '<article class="pma-inbox-row">'+(gu?'<a class="pma-inbox-main" href="'+E(gu)+'" target="_blank" rel="noopener" aria-label="Hap emailin në Gmail">'+main+'</a>':'<span class="pma-inbox-main">'+main+'</span>')+'<span class="pma-inbox-actions">'+(gu?'<a href="'+E(gu)+'" target="_blank" rel="noopener">Hap Gmail</a>':'')+(r.project_id?'<button type="button" class="primary" data-pma-project="'+E(r.project_id)+'">Hap projektin</button>':r.gmail_message_id?'<button type="button" class="primary" data-pma-intake="'+E(r.gmail_message_id)+'" data-tid="'+E(r.gmail_thread_id||'')+'">Lidhe me projekt</button>':'')+'</span></article>';
    }).join(''):'<div class="pma-empty large">'+E(state.inboxLoading?'Duke lexuar email-et…':'Nuk ka thread-e të disponueshme.')+'<button type="button" data-pma-inbox-refresh>'+E(connected?'Rifresko':'Lidhu me Gmail')+'</button></div>')+'</div>'+
  '</div>';
}
function tabIndex(){var i=TAB_ORDER.indexOf(state.tab);return i<0?0:i;}
function pageView(tab){return tab==='projects'?projectsView():tab==='discover'?discoverView():tab==='inbox'?inboxView():homeView();}
function rootMarkup(){
  if(state.nativeProjectId)return '<div class="pma-shell pma-native-shell">'+projectDetailView(state.nativeProjectId)+'</div>';
  if(state.nativeCompanyMode==='detail')return '<div class="pma-shell pma-native-shell">'+companyDetailView(state.nativeCompanyKey)+'</div>';
  if(state.nativeCompanyMode==='list')return '<div class="pma-shell pma-native-shell">'+companyListView()+'</div>';
  return '<div class="pma-shell" data-pma-pager><div class="pma-page-track" data-pma-page-track>'+
    TAB_ORDER.map(function(tab){return '<section class="pma-page" data-pma-page="'+tab+'"><div class="pma-page-scroll">'+pageView(tab)+'</div></section>';}).join('')+
  '</div></div>';
}
function syncPager(animate){
  var root=document.getElementById(ROOT),track=root&&root.querySelector('[data-pma-page-track]');
  if(!root||!track)return;
  var pager=root.querySelector('[data-pma-pager]');var w=(pager&&pager.clientWidth)||root.clientWidth||window.innerWidth||390;
  track.style.transition=animate===false?'none':'transform .28s cubic-bezier(.2,.8,.2,1)';
  track.style.transform='translate3d('+(-tabIndex()*w)+'px,0,0)';
  root.querySelectorAll('[data-pma-page]').forEach(function(p){p.setAttribute('aria-hidden',p.getAttribute('data-pma-page')===state.tab?'false':'true');});
}
function plusSheet(){
  return '<div class="pma-sheetback" data-pma-sheet-close><section class="pma-sheet" onclick="event.stopPropagation()"><div class="pma-sheetbar"></div><h2>Krijo / Hape</h2><div class="pma-create-grid">'+
    '<button data-pma-create="project">'+icon('folder')+'<span>Projekt</span></button>'+
    '<button data-pma-create="company">'+icon('building')+'<span>Kompani</span></button>'+
    '<button data-pma-create="rfq">'+icon('doc')+'<span>RFQ</span></button>'+
    '<button data-pma-create="offer">'+icon('doc')+'<span>Ofertë</span></button>'+
    '<button data-pma-create="task">'+icon('warning')+'<span>Task</span></button>'+
    '<button data-pma-create="scan">'+icon('doc')+'<span>Skano dokument</span></button>'+
    '</div></section></div>';
}
function moreSheet(){
  return '<div class="pma-sheetback" data-pma-sheet-close><section class="pma-sheet" onclick="event.stopPropagation()"><div class="pma-sheetbar"></div><h2>Më shumë</h2><div class="pma-more-list">'+
    '<button data-pma-secondary="contacts">'+icon('people')+'<span><b>Partnerët</b><small>Kompanitë dhe kontaktet</small></span><i>›</i></button>'+
    '<button data-pma-secondary="finance">'+icon('finance')+'<span><b>Financat</b><small>Fatura, garanci, arkëtim</small></span><i>›</i></button>'+
    '<button data-pma-open-material>'+icon('chart')+'<span><b>Material Trade</b><small>Blerësit e materialit</small></span><i>›</i></button>'+
    '<button data-pma-open-rep>'+icon('building')+'<span><b>Përfaqësime</b><small>Prodhuesit & marrëdhëniet</small></span><i>›</i></button>'+
    '<button data-pma-secondary="apps">'+icon('system')+'<span><b>Sistemi</b><small>Integrime & mjete teknike</small></span><i>›</i></button>'+
    '</div></section></div>';
}
function render(){
  if(!compact()||authBlocking()){
    if(document.body)document.body.classList.remove('pst-mobile-v2-active');
    var blockedRoot=document.getElementById(ROOT);if(blockedRoot)blockedRoot.style.display='none';
    var blockedNav=document.getElementById(NAV);if(blockedNav)blockedNav.style.display='none';
    var blockedUtil=document.getElementById(UTIL);if(blockedUtil)blockedUtil.style.display='none';
    return false;
  }
  var r=document.getElementById(ROOT);
  if(!r){r=document.createElement('main');r.id=ROOT;r.setAttribute('aria-label','PriSteel Mobile');document.body.appendChild(r);}
  if(!state.detail){
    r.querySelectorAll('[data-pma-page]').forEach(function(p){var k=p.getAttribute('data-pma-page'),sc=p.querySelector('.pma-page-scroll');if(k&&sc)state.scrollByTab[k]=sc.scrollTop||0;});
    hideLegacyBack();document.body&&document.body.classList.add('pst-mobile-v2-active');r.style.display='block';r.innerHTML=rootMarkup();
  }else r.style.display='none';
  var old=document.querySelectorAll('.pma-sheetback');old.forEach(function(x){x.remove();});
  if(state.plusOpen)document.body.insertAdjacentHTML('beforeend',plusSheet());
  if(state.moreOpen)document.body.insertAdjacentHTML('beforeend',moreSheet());
  ensureChrome();syncNav();bindPageSwipe();requestAnimationFrame(function(){
    syncPager(false);
    r.querySelectorAll('[data-pma-page]').forEach(function(p){var k=p.getAttribute('data-pma-page'),sc=p.querySelector('.pma-page-scroll');if(k&&sc&&state.scrollByTab[k]!=null)sc.scrollTop=state.scrollByTab[k];});
  });return true;
}
function ensureChrome(){
  if(!compact())return;
  var nav=document.getElementById(NAV);
  if(!nav){
    nav=document.createElement('nav');nav.id=NAV;nav.setAttribute('aria-label','Navigimi PPPP Mobile');
    nav.innerHTML='<button data-pma-tab="home">'+icon('home')+'<span>Home</span></button><button data-pma-tab="projects">'+icon('folder')+'<span>Projects</span></button><button class="pma-plus" data-pma-plus aria-label="Krijo">'+icon('plus')+'</button><button data-pma-tab="discover">'+icon('discover')+'<span>Discover</span></button><button data-pma-tab="inbox">'+icon('inbox')+'<span>Inbox</span></button>';
    document.body.appendChild(nav);
  }
  var u=document.getElementById(UTIL);
  if(!u){
    u=document.createElement('div');u.id=UTIL;u.innerHTML='<button data-pma-util="weather">'+icon('sun')+'<span data-pma-temp>Moti</span></button><button data-pma-util="fx">'+icon('fx')+'<span>€ ↔</span></button><button data-pma-util="market">'+icon('chart')+'<span>Steel</span></button>';document.body.appendChild(u);
  }
  u.style.display=(state.nativeProjectId||state.nativeCompanyMode)?'none':'grid';
  var t=u.querySelector('[data-pma-temp]');if(t)t.textContent=temp();
}
function syncNav(){
  var n=document.getElementById(NAV);if(!n)return;
  var active=state.nativeProjectId?'projects':(state.nativeCompanyMode?'':state.tab);
  n.querySelectorAll('[data-pma-tab]').forEach(function(b){b.classList.toggle('on',!state.detail&&b.getAttribute('data-pma-tab')===active);});
}
async function loadOpportunities(force){
  var P=oppApi();if(!P||typeof P.refresh!=='function')return;
  state.oppLoading=true;if(state.tab==='discover')render();
  try{
    var all=A(await P.refresh(!!force)),primary=typeof P.priorityRows==='function'?A(P.priorityRows(all)):[],seen={},rest=all.filter(function(r){return ['new','review','watch'].indexOf(S(r.status))>-1&&(P.fit(r)!=='weak'||Number(r.relevance_score)>=92);}).sort(function(a,b){return Number(P.score(b))-Number(P.score(a));}),out=[];
    primary.concat(rest).forEach(function(r){var id=S(r&&r.id);if(id&&!seen[id]&&out.length<18){seen[id]=1;out.push(r);}});
    state.opportunities=out;state.opportunityIndex=0;
  }catch(e){try{console.warn('Mobile opportunities',e);}catch(x){}}
  finally{state.oppLoading=false;if(state.tab==='discover')render();}
}
async function loadInbox(force,interactive){
  var I=window.PSTGmailLiveInboxV2;
  if(!I){
    // The mobile shell can become usable before the ordered email bootstrap finishes.
    // Do not poll or touch other pages; pst:modules-ready retries Inbox once the Gmail owner exists.
    return;
  }
  state.inboxLoading=true;if(state.tab==='inbox')render();
  try{
    var connected=typeof I.connected==='function'?I.connected():false,authorizedNow=false;
    // IMPORTANT for iPhone/PWA: start Google OAuth directly from the user's tap.
    // Any awaited Supabase fetch before this point can lose the browser user-gesture
    // and cause the Google authorization popup to be blocked.
    if(interactive&&!connected&&typeof I.authorize==='function'){
      authorizedNow=true;
      await I.authorize();
      connected=typeof I.connected==='function'?I.connected():false;
    }
    if(typeof I.loadCanonical==='function')await I.loadCanonical(!!force);
    // authorize() already loads Gmail once after a successful token grant.
    if(connected&&!authorizedNow&&typeof I.load==='function')await I.load(!!force);
  }catch(e){try{console.warn('Mobile inbox',e);}catch(x){}}
  finally{state.inboxLoading=false;if(state.tab==='inbox')render();}
}
async function loadMaterial(){
  var D=window.PSTDachSteelSalesV3||window.PSTDachSteelSalesV2||window.PSTDachSteelSalesV1;if(!D)return;
  state.materialLoading=true;if(state.tab==='discover')render();
  try{if(typeof D.loadTargets==='function')await D.loadTargets(true);else if(typeof D.refresh==='function')await D.refresh();}catch(e){try{console.warn('Mobile Material Trade',e);}catch(x){}}
  finally{state.materialLoading=false;if(state.tab==='discover')render();}
}
async function loadRep(){
  var R=window.PSTRepresentationsV1;if(!R)return;
  state.repLoading=true;if(state.tab==='discover')render();
  try{
    var jobs=[];
    if(typeof R.refresh==='function')jobs.push(Promise.resolve(R.refresh()));
    if(typeof R.loadOpportunities==='function')jobs.push(Promise.resolve(R.loadOpportunities(true)));
    if(jobs.length)await Promise.all(jobs);
  }catch(e){try{console.warn('Mobile Representations',e);}catch(x){}}
  finally{state.repLoading=false;if(state.tab==='discover')render();}
}
function bindPageSwipe(){
  var root=document.getElementById(ROOT),pager=root&&root.querySelector('[data-pma-pager]');
  if(!pager||pager.dataset.swipeBound==='1')return;
  pager.dataset.swipeBound='1';
  var sx=0,sy=0,startIndex=0,tracking=false;
  pager.addEventListener('touchstart',function(e){
    if(state.detail||state.plusOpen||state.moreOpen)return;
    var target=e.target&&e.target.closest?e.target.closest('input,textarea,select'):null;
    if(target)return;
    var t=e.touches&&e.touches[0];if(!t)return;
    sx=t.clientX;sy=t.clientY;startIndex=tabIndex();tracking=true;
  },{passive:true});
  pager.addEventListener('touchend',function(e){
    if(!tracking)return;tracking=false;
    var t=e.changedTouches&&e.changedTouches[0];if(!t)return;
    var dx=t.clientX-sx,dy=t.clientY-sy,ax=Math.abs(dx),ay=Math.abs(dy);
    if(ax<72||ax<ay*1.35)return;
    var next=Math.max(0,Math.min(TAB_ORDER.length-1,startIndex+(dx<0?1:-1)));
    if(next===startIndex)return;
    state.tab=TAB_ORDER[next];state.plusOpen=false;state.moreOpen=false;
    if(state.tab==='discover'&&!state.opportunities.length)loadOpportunities(false);
    if(state.tab==='inbox'&&!state.inboxLoading)loadInbox(false);
    syncPager(true);syncNav();
    var page=root.querySelector('[data-pma-page="'+state.tab+'"] .pma-page-scroll');if(page)page.scrollTop=0;
  },{passive:true});
  pager.addEventListener('touchcancel',function(){tracking=false;},{passive:true});
}
function click(e){
  var t=e.target&&e.target.closest?e.target:null;if(!t)return;
  var b=t.closest('[data-pma-tab]');if(b){e.preventDefault();state.plusOpen=false;state.moreOpen=false;state.nativeProjectId='';state.nativeCompanyMode='';state.nativeCompanyKey='';state.tab=b.getAttribute('data-pma-tab');if(state.tab==='discover'&&!state.opportunities.length)loadOpportunities(false);if(state.tab==='inbox')loadInbox(false,false);render();requestAnimationFrame(function(){syncPager(true);});return;}
  if(t.closest('[data-pma-plus]')){e.preventDefault();state.plusOpen=!state.plusOpen;state.moreOpen=false;render();return;}
  if(t.closest('[data-pma-more]')){e.preventDefault();state.moreOpen=!state.moreOpen;state.plusOpen=false;render();return;}
  if(t.closest('[data-pma-sheet-close]')){state.plusOpen=false;state.moreOpen=false;render();return;}
  if(t.closest('[data-pma-return-app]')){state.detail=false;hideLegacyBack();document.body&&document.body.classList.add('pst-mobile-v2-active');render();return;}
  if(t.closest('[data-pma-ask]')){legacyAction('[data-pmh-search]');return;}
  if(t.closest('[data-pma-project-back]')){state.nativeProjectId='';state.tab=state.projectReturnTab||'projects';render();requestAnimationFrame(function(){syncPager(false);});return;}
  if(t.closest('[data-pma-company-back]')){if(state.nativeCompanyMode==='detail'){state.nativeCompanyMode='list';state.nativeCompanyKey='';render();}else{state.nativeCompanyMode='';state.nativeCompanyKey='';state.tab=state.companyReturnTab||'home';render();requestAnimationFrame(function(){syncPager(false);});}return;}
  var co=t.closest('[data-pma-company]');if(co){state.nativeCompanyMode='detail';state.nativeCompanyKey=co.getAttribute('data-pma-company');render();return;}
  var cf=t.closest('[data-pma-company-filter]');if(cf){state.companyFilter=cf.getAttribute('data-pma-company-filter')||'all';render();return;}
  if(t.closest('[data-pma-company-refresh]')){loadCompanyData(true);return;}
  var cp=t.closest('[data-pma-company-project]');if(cp){openProject(cp.getAttribute('data-pma-company-project'));return;}
  b=t.closest('[data-pma-project-legacy]');if(b){var pid=state.nativeProjectId;enterDetail(function(){if(typeof window.pstOpenProjectWorkspace==='function')return window.pstOpenProjectWorkspace(pid);if(typeof window.openOverview==='function')return window.openOverview(pid);var H=window.PSTHomeCanonicalV1;if(H&&typeof H.openBrief==='function')return H.openBrief(pid);});return;}
  b=t.closest('[data-pma-project]');if(b){openProject(b.getAttribute('data-pma-project'));return;}
  b=t.closest('[data-pma-home-refresh]');if(b){try{var H=window.PSTHomeCanonicalV1;if(H&&H.refresh)H.refresh();}catch(x){}setTimeout(render,400);return;}
  b=t.closest('[data-pma-discover]');if(b){state.discover=b.getAttribute('data-pma-discover');render();if(state.discover==='tenders'&&!state.opportunities.length)loadOpportunities(false);if(state.discover==='material')loadMaterial();if(state.discover==='represent')loadRep();return;}
  b=t.closest('[data-pma-opp-refresh]');if(b){loadOpportunities(true);return;}
  b=t.closest('[data-pma-opp-action]');if(b){oppAction(b.getAttribute('data-pma-opp-action'),b.getAttribute('data-id'));return;}
  if(t.closest('[data-pma-material-refresh]')){loadMaterial();return;}
  if(t.closest('[data-pma-rep-refresh]')){loadRep();return;}
  if(t.closest('[data-pma-open-material]')){state.moreOpen=false;openMaterial();return;}
  b=t.closest('[data-pma-rep-opportunity-url]');if(b){var ru=b.getAttribute('data-pma-rep-opportunity-url');if(ru)window.open(ru,'PRISTEEL_REP_OPPORTUNITY');return;}
  if(t.closest('[data-pma-open-rep]')){state.moreOpen=false;openRepresentations();return;}
  b=t.closest('[data-pma-inbox-refresh]');if(b){loadInbox(true,true);return;}
  if(t.closest('[data-pma-classic-inbox]')){mobileRoute('inbox');return;}
  b=t.closest('[data-pma-gmail]');if(b){var u=b.getAttribute('data-pma-gmail');if(u)window.open(u,'PRISTEEL_GMAIL');return;}
  b=t.closest('[data-pma-intake]');if(b){var I=window.PSTGmailLiveInboxV2;if(I&&I.intake)I.intake(b.getAttribute('data-pma-intake'),b.getAttribute('data-tid'));return;}
  b=t.closest('[data-pma-secondary]');if(b){state.moreOpen=false;var sk=b.getAttribute('data-pma-secondary');if(sk==='contacts'){openCompanies('');return;}mobileRoute(sk);return;}
  b=t.closest('[data-pma-create]');if(b){createAction(b.getAttribute('data-pma-create'));return;}
  b=t.closest('[data-pma-util]');if(b){var k=b.getAttribute('data-pma-util');if(k==='weather')legacyAction('[data-pmh-weather]');else if(k==='fx')legacyAction('[data-pmh-tool="currency"]');else if(k==='market')legacyAction('[data-pmh-market-all]');return;}
}
function input(e){
  if(e.target&&e.target.hasAttribute('data-pma-project-search')){state.projectQuery=e.target.value;render();var x=document.querySelector('[data-pma-project-search]');if(x){x.focus();try{x.setSelectionRange(x.value.length,x.value.length);}catch(z){}}return;}
  if(e.target&&e.target.hasAttribute('data-pma-company-search')){state.companySearch=e.target.value;render();var y=document.querySelector('[data-pma-company-search]');if(y){y.focus();try{y.setSelectionRange(y.value.length,y.value.length);}catch(z){}}}
}
async function oppAction(kind,id){
  var P=oppApi();if(!P)return;
  if(kind==='open'){openTender(id);return;}
  try{
    if(kind==='review'){await P.review(id);}
    else if(kind==='nogo'){if(!confirm('Ta shënojmë këtë mundësi si jo relevante?'))return;await P.noGo(id);}
    else if(kind==='draft'){await P.prepareDraft(id);}
    else if(kind==='go'){await P.go(id);return;}
    if(kind==='review'||kind==='nogo'){await loadOpportunities(true);}
  }catch(e){alert(e&&e.message||e);}
}
function createAction(kind){
  state.plusOpen=false;render();
  if(kind==='project'){
    return enterDetail(function(){
      if(typeof window.newProject==='function')return window.newProject();
      if(typeof window.showPage==='function')return window.showPage('newproject');
      if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('projects');
    });
  }
  if(kind==='company')return openCompanies('');
  if(kind==='rfq'){
    return enterDetail(function(){
      if(typeof window.showPage==='function')return window.showPage('rfq');
      if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('projects');
    });
  }
  if(kind==='offer'){
    return enterDetail(function(){
      if(typeof window.goToClientOffer==='function')return window.goToClientOffer();
      if(typeof window.showPage==='function')return window.showPage('oferta');
    });
  }
  if(kind==='task'){
    if(typeof window.addTask==='function')return window.addTask();
    return mobileRoute('home');
  }
  if(kind==='scan'){
    return enterDetail(function(){
      if(typeof window.showPage==='function')window.showPage('newproject');
      setTimeout(function(){
        var input=document.getElementById('f-input');
        if(input&&typeof input.click==='function')input.click();
      },220);
    });
  }
}
function installCss(){
  if(document.getElementById(CSS))return;
  var s=document.createElement('style');s.id=CSS;s.textContent=`
#${ROOT},#${NAV},#${UTIL},#${BACK}{display:none}
@media(max-width:900px),(max-device-width:900px){
  #pst-mobile-nav-v1,#pst-mobile-utility-dock-v1{display:none!important}
  body.pst-mobile-v2-active #pst-mobile-control-tower-v1,body.pst-mobile-v2-active #pst-mobile-home-v1{display:none!important}
  body.pst-mobile-v2-active{overflow:hidden!important;background:#F4F6F7!important}
  body.pst-mobile-v2-active #app-shell-root{visibility:hidden!important;pointer-events:none!important}
  body.pst-mobile-v2-active .topbar,body.pst-mobile-v2-active #pst-global-page-backbar,body.pst-mobile-v2-active #util-fab,body.pst-mobile-v2-active div[onclick="openCmdK()"][title^="Kërko"]{display:none!important}
  #${ROOT}{display:block;position:fixed;inset:0;z-index:2147483000;width:100%;height:100dvh;background:#F4F6F7;color:#182A31;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Arial,sans-serif;overflow:hidden}
  #${BACK}{position:fixed;left:12px;top:calc(10px + env(safe-area-inset-top));z-index:2147483900;min-height:40px;border:1px solid #D9E5E8;border-radius:13px;background:rgba(255,255,255,.96);color:#347F96;padding:0 11px 0 8px;align-items:center;gap:5px;font-size:9px;font-weight:800;box-shadow:0 7px 20px rgba(26,49,58,.14);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}#${BACK} svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2}
  .pma-shell{width:min(100%,600px);height:100%;margin:0 auto;overflow:hidden;position:relative;touch-action:pan-y}
  .pma-page-track{display:flex;width:400%;height:100%;will-change:transform}
  .pma-page{flex:0 0 25%;width:25%;height:100%;overflow:hidden;position:relative;min-width:0}
  .pma-page-scroll{position:absolute;inset:0;overflow-x:hidden;overflow-y:scroll;-webkit-overflow-scrolling:touch;overscroll-behavior-y:auto;touch-action:pan-y;padding-bottom:calc(178px + env(safe-area-inset-bottom));scroll-padding-bottom:calc(178px + env(safe-area-inset-bottom))}
  #${ROOT} *{box-sizing:border-box}#${ROOT} button{font:inherit;-webkit-tap-highlight-color:transparent;touch-action:pan-y}
  .pma-screen{padding:calc(10px + env(safe-area-inset-top)) 14px 24px}
  .pma-top{display:flex;justify-content:space-between;align-items:center;padding:2px 2px 13px}.pma-brand>span{display:block;font-size:8px;font-weight:850;letter-spacing:.15em;color:#7F9097}.pma-brand>b{display:block;margin-top:3px;font-size:22px;line-height:1;font-weight:820;letter-spacing:-.55px;color:#14252D}.pma-brand>small{display:block;margin-top:5px;font-size:9.5px;color:#89979D;text-transform:capitalize}.pma-avatar{width:39px;height:39px;border:1px solid #D8E3E6;border-radius:50%;background:#fff;color:#2F7F98;font-size:11px;font-weight:850;box-shadow:0 5px 16px rgba(27,50,59,.05)}
  .pma-hello{padding:5px 2px 11px}.pma-hello>span{font-size:12px;font-weight:700;color:#65777F}.pma-hello h1{margin:5px 0 0;font-size:26px;line-height:1.05;letter-spacing:-.75px;color:#14262E}
  .pma-ask{width:100%;min-height:58px;border:1px solid #D9E6E9;border-radius:17px;background:#fff;display:grid;grid-template-columns:34px minmax(0,1fr) 34px;align-items:center;gap:10px;padding:9px 10px;text-align:left;box-shadow:0 8px 22px rgba(29,54,64,.04)}.pma-ask>span,.pma-ask>i{width:34px;height:34px;border-radius:11px;background:#EEF5F7;color:#52717B;display:grid;place-items:center}.pma-ask>i{background:#E8F6F9;color:#2B8CA6}.pma-ask svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pma-ask b{display:block;font-size:14px}.pma-ask small{display:block;font-size:9.5px;color:#8A969B;margin-top:2px}
  .pma-section-label{display:flex;justify-content:space-between;align-items:center;margin:13px 2px 7px}.pma-section-label span{font-size:8.5px;font-weight:850;letter-spacing:.13em;color:#7F8F95}.pma-section-label small{font-size:8.5px;color:#97A2A6}
  .pma-priority-strip{display:block;overflow:hidden;padding:1px 1px 5px}.pma-priority{width:100%;min-height:215px;border:1px solid #E2E8EA;border-radius:21px;background:#fff;padding:16px;box-shadow:0 10px 28px rgba(27,47,56,.055)}.pma-priority.action{background:linear-gradient(145deg,#FFFDFD,#FFF5F5);border-color:#F0D2D2}.pma-priority.waiting{background:linear-gradient(145deg,#FFFDF9,#FFF8EC);border-color:#E9DCC2}.pma-priority.project,.pma-priority.calm{background:linear-gradient(145deg,#FCFFFE,#F1F9F7);border-color:#D5E5E1}.pma-priority-top{display:flex;justify-content:space-between;gap:12px}.pma-priority-top span{font-size:9px;font-weight:900;letter-spacing:.13em;color:#73858C}.pma-priority-top i{font-style:normal;font-size:9px;color:#94A0A4}.pma-priority h2{margin:12px 0 0;font-size:21px;line-height:1.12;letter-spacing:-.45px}.pma-priority>b{display:block;margin-top:6px;font-size:11px;color:#55707A}.pma-priority p{margin:9px 0 0;font-size:11px;line-height:1.48;color:#74838A}.pma-priority>button{margin-top:13px;min-height:39px;border:0;border-radius:11px;background:#16313C;color:#fff;padding:0 13px;display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:800}.pma-priority>button svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2}
  .pma-today{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:7px}.pma-today button{min-height:62px;border:1px solid #DFE7E9;border-radius:15px;background:#fff;padding:8px;text-align:left}.pma-today strong{font-size:18px;display:block}.pma-today span{font-size:8.5px;color:#879399;display:block;margin-top:4px}
  .pma-card{margin-top:10px;border:1px solid #DFE7E9;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 7px 20px rgba(30,50,59,.035)}.pma-card-head{display:flex;justify-content:space-between;align-items:end;padding:13px 14px 10px;border-bottom:1px solid #EDF1F2}.pma-card-head span{font-size:8px;font-weight:850;letter-spacing:.13em;color:#8A969B}.pma-card-head h3{margin:3px 0 0;font-size:16px}.pma-card-head button{border:0;background:transparent;color:#2F829B;font-size:10px;font-weight:800}.pma-activity-row{width:100%;min-height:60px;border:0;border-top:1px solid #EEF2F3;background:#fff;display:grid;grid-template-columns:35px minmax(0,1fr) 12px;gap:10px;align-items:center;padding:8px 12px;text-align:left}.pma-activity-row:first-child{border-top:0}.pma-activity-row>i{width:35px;height:35px;border-radius:11px;display:grid;place-items:center;background:#EAF4F7;color:#38829A}.pma-activity-row>i.action{background:#FFF0F0;color:#C65050}.pma-activity-row>i.waiting{background:#FFF5E1;color:#B27D26}.pma-activity-row svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.pma-activity-row span b{display:block;font-size:11px}.pma-activity-row span small{display:block;margin-top:3px;font-size:9px;color:#879399;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pma-activity-row em{font-style:normal;color:#8DA0A7}
  .pma-search{height:47px;border:1px solid #DCE6E9;border-radius:14px;background:#fff;display:flex;align-items:center;gap:8px;padding:0 12px;margin-bottom:9px}.pma-search svg{width:17px;height:17px;fill:none;stroke:#68808A;stroke-width:1.8}.pma-search input{border:0;outline:0;background:transparent;min-width:0;flex:1;font-size:11px;color:#294049}
  .pma-project-summary{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;margin-bottom:9px}.pma-project-summary span{white-space:nowrap;padding:7px 10px;border-radius:999px;background:#fff;border:1px solid #E0E8EA;font-size:9px;color:#7A898F}.pma-project-summary b{color:#31596A}.pma-project-list{display:grid;gap:7px}.pma-project-card{width:100%;min-height:72px;border:1px solid #DFE7E9;border-radius:16px;background:#fff;display:grid;grid-template-columns:8px minmax(0,1fr) auto 12px;gap:9px;align-items:center;padding:10px 11px;text-align:left}.pma-project-dot{width:7px;height:7px;border-radius:50%;background:#5B98AE}.pma-project-dot.action{background:#C37743}.pma-project-dot.waiting{background:#C39A52}.pma-project-dot.execution{background:#5E9470}.pma-project-copy{min-width:0}.pma-project-copy>b{font-size:11.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pma-project-copy small{display:block;margin-top:3px;font-size:8.8px;color:#88949A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pma-project-copy em{display:block;margin-top:4px;font-style:normal;font-size:8.7px;color:#4B7281}.pma-project-state{font-size:8px;font-weight:800;padding:5px 7px;border-radius:999px;background:#EDF4F6;color:#557784;white-space:nowrap}.pma-project-state.action{background:#FFF0E8;color:#A66234}.pma-project-state.waiting{background:#FFF5E3;color:#9C732B}.pma-project-state.execution{background:#ECF6EF;color:#4F7D5E}
  .pma-native-shell{overflow:hidden}.pma-native-project{height:100%;background:#F4F7F8}.pma-native-scroll{height:100%;overflow-y:scroll;-webkit-overflow-scrolling:touch;overscroll-behavior-y:auto;touch-action:pan-y;padding:calc(12px + env(safe-area-inset-top)) 14px calc(112px + env(safe-area-inset-bottom))}
  .pma-pd-head{display:grid;grid-template-columns:40px minmax(0,1fr);gap:10px;align-items:start}.pma-pd-head>button{width:40px;height:40px;border:1px solid #D9E5E8;border-radius:13px;background:#fff;color:#355A68;display:grid;place-items:center}.pma-pd-head>button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.pma-pd-head span{font-size:8px;font-weight:900;letter-spacing:1.15px;color:#87959B}.pma-pd-head h1{margin:3px 0 0;font-size:26px;line-height:1.08;letter-spacing:-.65px;color:#172D36}.pma-pd-head p{margin:5px 0 0;font-size:10px;color:#819096}
  .pma-pd-status{margin-top:13px;border:1px solid #DCE6E9;border-radius:18px;background:#fff;padding:13px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 10px;align-items:center}.pma-pd-status>span{font-size:9px;font-weight:850;padding:6px 8px;border-radius:999px;background:#EDF5F6;color:#52747F}.pma-pd-status>span.action{background:#FFF0E7;color:#A75D2E}.pma-pd-status>span.waiting{background:#FFF6E5;color:#9B722C}.pma-pd-status>span.execution{background:#ECF6EF;color:#527B60}.pma-pd-status>b{font-size:12px;color:#324E59}.pma-pd-status>small{grid-column:2;font-size:9px;color:#8A969B}
  .pma-pd-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:10px}.pma-pd-tabs button{height:38px;border:1px solid #DDE6E8;border-radius:11px;background:#fff;color:#718188;font-size:9px;font-weight:800}.pma-pd-tabs button.on{background:#17343F;border-color:#17343F;color:#fff}
  .pma-pd-next{margin-top:10px;border:1px solid #DFE7E9;border-radius:20px;background:#fff;padding:16px;box-shadow:0 8px 22px rgba(27,51,61,.04)}.pma-pd-next.action{background:linear-gradient(145deg,#FFFDFD,#FFF6F6);border-color:#EFD1D1}.pma-pd-next.waiting{background:linear-gradient(145deg,#FFFEFB,#FFF8EC);border-color:#E9DCC2}.pma-pd-next>span{font-size:8.5px;font-weight:900;letter-spacing:1.15px;color:#849198}.pma-pd-next h2{margin:7px 0 0;font-size:19px;line-height:1.18;color:#1D3540}.pma-pd-next p{margin:7px 0 0;font-size:10.5px;line-height:1.5;color:#75868D}.pma-pd-next button{margin-top:12px;min-height:41px;border:0;border-radius:12px;background:#17343F;color:#fff;padding:0 13px;display:inline-flex;align-items:center;gap:7px;font-size:10px;font-weight:800}.pma-pd-next button svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2}
  .pma-pd-timeline{margin-top:10px;border:1px solid #DFE7E9;border-radius:20px;background:#fff;padding:15px}.pma-pd-section-title span{font-size:8px;font-weight:900;letter-spacing:1px;color:#8A979C}.pma-pd-section-title h3{margin:3px 0 10px;font-size:15px;color:#29414B}.pma-pd-step{position:relative;display:grid;grid-template-columns:28px minmax(0,1fr);gap:8px;min-height:50px}.pma-pd-step:after{content:"";position:absolute;left:13px;top:28px;bottom:-2px;width:1.5px;background:#E2E9EB}.pma-pd-step:last-child:after{display:none}.pma-pd-step>i{width:28px;height:28px;border-radius:50%;background:#F0F4F5;color:#9AA5A9;display:grid;place-items:center;font-size:11px;font-style:normal;z-index:1}.pma-pd-step.done>i{background:#E8F5EC;color:#4D8A61}.pma-pd-step.current>i{background:#17343F;color:#fff}.pma-pd-step span b{display:block;font-size:10.5px;color:#344E58}.pma-pd-step.current span b{color:#17343F}.pma-pd-step span small{display:block;margin-top:3px;font-size:8.5px;color:#939FA3}
  .pma-pd-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.pma-pd-actions button{min-height:78px;border:1px solid #DFE7E9;border-radius:16px;background:#fff;color:#3B5A65;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:10px;text-align:left}.pma-pd-actions button>svg{width:19px;height:19px;fill:none;stroke:#3A8398;stroke-width:1.8}.pma-pd-actions b{display:block;margin-top:6px;font-size:10px}.pma-pd-actions small{display:block;margin-top:2px;font-size:8px;color:#8B989D}
  .pma-native-company{height:100%;background:#F4F7F8}
  .pma-co-head{display:grid;grid-template-columns:40px minmax(0,1fr) 40px;gap:10px;align-items:start}.pma-co-head.detail{grid-template-columns:40px minmax(0,1fr)}.pma-co-head>button{width:40px;height:40px;border:1px solid #D9E5E8;border-radius:13px;background:#fff;color:#397B72;display:grid;place-items:center}.pma-co-head>button svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.pma-co-head span{font-size:8px;font-weight:900;letter-spacing:1.15px;color:#72958D}.pma-co-head h1{margin:3px 0 0;font-size:26px;line-height:1.08;letter-spacing:-.65px;color:#18332F}.pma-co-head p{margin:5px 0 0;font-size:10px;color:#81918D}
  .pma-co-search{height:50px;margin-top:13px;border:1px solid #D6E5E1;border-radius:16px;background:#fff;display:flex;align-items:center;gap:9px;padding:0 13px}.pma-co-search svg{width:19px;height:19px;fill:none;stroke:#66847D;stroke-width:1.8}.pma-co-search input{border:0;outline:0;background:transparent;width:100%;font-size:12px;color:#28443E}
  .pma-co-filters{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:9px 0 2px}.pma-co-filters::-webkit-scrollbar{display:none}.pma-co-filters button{min-height:34px;border:1px solid #D8E5E2;border-radius:999px;background:#fff;padding:0 11px;color:#687C77;font-size:9px;font-weight:800;white-space:nowrap}.pma-co-filters button.on{background:#397B70;border-color:#397B70;color:#fff}.pma-co-count{padding:8px 2px 6px;font-size:9px;font-weight:800;color:#83928E}
  .pma-co-list{display:grid;gap:8px}.pma-co-card{width:100%;min-height:84px;border:1px solid #DBE7E4;border-radius:18px;background:#fff;display:grid;grid-template-columns:42px minmax(0,1fr) auto 14px;gap:10px;align-items:center;padding:11px;text-align:left;box-shadow:0 5px 16px rgba(36,70,65,.03)}.pma-co-logo{width:42px;height:42px;border-radius:14px;background:#E6F3EF;color:#397B70;display:grid;place-items:center;font-size:15px;font-weight:850}.pma-co-copy{min-width:0}.pma-co-copy>b{display:block;font-size:12px;color:#29453F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pma-co-copy>small{display:block;margin-top:3px;font-size:8.8px;color:#879590;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pma-co-copy>em{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;font-style:normal}.pma-co-copy>em i,.pma-co-rel span,.pma-co-tags i{font-style:normal;font-size:7.5px;font-weight:800;padding:4px 6px;border-radius:999px;background:#EDF6F3;color:#47766D}.pma-co-meta{display:grid;grid-template-columns:auto auto;gap:1px 4px;text-align:right}.pma-co-meta>b{font-size:10px;color:#335E56}.pma-co-meta>small{font-size:7.5px;color:#95A19D}.pma-co-card>svg{width:15px;height:15px;fill:none;stroke:#80A099;stroke-width:2}
  .pma-co-rel{display:flex;gap:5px;flex-wrap:wrap;margin-top:13px}.pma-co-stats{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.pma-co-stats section{min-height:64px;border:1px solid #DCE7E4;border-radius:15px;background:#fff;padding:10px}.pma-co-stats span{display:block;font-size:7.5px;text-transform:uppercase;letter-spacing:.45px;color:#8B9995}.pma-co-stats b{display:block;margin-top:5px;font-size:14px;color:#345C54;overflow-wrap:anywhere}
  .pma-co-section{margin-top:10px;border:1px solid #DCE7E4;border-radius:19px;background:#fff;padding:14px}.pma-co-section>span{font-size:8px;font-weight:900;letter-spacing:1px;color:#6F9189}.pma-co-section h3{margin:3px 0 9px;font-size:15px;color:#29463F}.pma-co-section>p{font-size:10px;line-height:1.5;color:#73847F;margin:0}.pma-co-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.pma-co-people,.pma-co-projects{display:grid;gap:6px}.pma-co-person{min-height:56px;border-top:1px solid #EDF2F0;display:grid;grid-template-columns:34px minmax(0,1fr) 32px;gap:8px;align-items:center}.pma-co-person:first-child{border-top:0}.pma-co-person>i{width:34px;height:34px;border-radius:11px;background:#EAF4F1;color:#39766C;display:grid;place-items:center;font-size:11px;font-weight:850;font-style:normal}.pma-co-person span{min-width:0}.pma-co-person b{display:block;font-size:10.5px;color:#354F49}.pma-co-person small{display:block;margin-top:3px;font-size:8.5px;color:#8B9793;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pma-co-person>a{width:32px;height:32px;border-radius:10px;background:#EDF6F3;color:#397B70;display:grid;place-items:center}.pma-co-person>a svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8}.pma-co-projects>button{width:100%;min-height:54px;border:0;border-top:1px solid #EDF2F0;background:#fff;display:grid;grid-template-columns:minmax(0,1fr) 16px;gap:8px;align-items:center;text-align:left;padding:7px 0}.pma-co-projects>button:first-child{border-top:0}.pma-co-projects b{display:block;font-size:10.5px;color:#354F49}.pma-co-projects small{display:block;margin-top:3px;font-size:8.5px;color:#8B9793}.pma-co-projects svg{width:15px;height:15px;fill:none;stroke:#6E968D;stroke-width:2}.pma-co-website{margin-top:10px;min-height:43px;border:1px solid #CFE1DC;border-radius:13px;background:#EAF5F1;color:#39776D;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:7px;font-size:9.5px;font-weight:800}.pma-co-website svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2}

  .pma-discover-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:11px}.pma-discover-tabs button{height:38px;border:1px solid #DDE6E8;border-radius:11px;background:#fff;color:#6C7D84;font-size:9.5px;font-weight:800}.pma-discover-tabs button.on{background:#183540;border-color:#183540;color:#fff}
  .pma-deck-counter{display:flex;justify-content:space-between;align-items:center;margin:2px 2px 8px}.pma-deck-counter span{font-size:9px;font-weight:800;color:#59717A}.pma-deck-counter small{font-size:8.5px;color:#98A2A6}.pma-deck{transform-origin:center bottom;will-change:transform}.pma-opp-card{min-height:465px;border:1px solid #E0E7E9;border-radius:23px;background:#fff;padding:17px;box-shadow:0 15px 34px rgba(25,47,57,.075);display:flex;flex-direction:column}.pma-opp-card.strong{border-top:4px solid #5D9470}.pma-opp-card.possible{border-top:4px solid #C39A54}.pma-opp-top{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.pma-opp-top span{font-size:7.5px;font-weight:850;letter-spacing:.08em;color:#7D8C92;padding:5px 7px;background:#F2F6F7;border-radius:999px}.pma-opp-top b{margin-left:auto;font-size:11px;color:#2A7188}.pma-opp-card h2{margin:17px 0 0;font-size:24px;line-height:1.08;letter-spacing:-.6px}.pma-opp-card>p{margin:12px 0 0;font-size:11.5px;line-height:1.55;color:#6F8087}.pma-opp-facts{display:grid;gap:7px;margin-top:16px}.pma-opp-facts span{display:grid;grid-template-columns:90px 1fr;gap:9px;font-size:9px;color:#8A969A}.pma-opp-facts b{font-size:10px;color:#3B535D}.pma-opp-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:auto;padding-top:18px}.pma-opp-actions button{min-height:42px;border:1px solid #DCE5E8;border-radius:11px;background:#fff;color:#53666E;font-size:9.5px;font-weight:820}.pma-opp-actions .danger{color:#A35252;border-color:#ECD6D6}.pma-opp-actions .primary{background:#173743;border-color:#173743;color:#fff}.pma-swipe-hint{display:flex;justify-content:space-between;margin-top:12px;font-size:8px;color:#9BA5A8}
  .pma-stack{display:grid;gap:8px}.pma-discovery-row{min-height:69px;border:1px solid #DDE6E8;border-radius:15px;background:#fff;display:grid;grid-template-columns:minmax(0,1fr) auto 12px;gap:9px;align-items:center;padding:10px 12px;text-align:left}.pma-discovery-row span b{display:block;font-size:11.5px}.pma-discovery-row span small{display:block;margin-top:3px;font-size:9px;color:#89969B}.pma-discovery-row em{font-style:normal;font-size:9px;font-weight:850;color:#3B8095}.pma-discovery-row.rep em{color:#557C68}
  .pma-inbox-tools{display:flex;gap:7px;margin-bottom:10px}.pma-inbox-tools>button{border:1px solid #DDE6E8;border-radius:14px;background:#fff;min-height:52px;padding:8px 10px;color:#3D5964}.pma-inbox-tools>button:first-child{display:flex;align-items:center;gap:8px;flex:1;text-align:left}.pma-inbox-tools svg{width:18px;height:18px;fill:none;stroke:#3C8197;stroke-width:1.8}.pma-inbox-tools b{display:block;font-size:10px}.pma-inbox-tools small{display:block;font-size:8.5px;color:#8A969B}.pma-inbox-tools>button:last-child{font-size:9px;font-weight:800}.pma-inbox-list{display:grid;gap:7px}.pma-inbox-row{border:1px solid #DFE7E9;border-radius:16px;background:#fff;padding:11px;display:grid;grid-template-columns:minmax(0,1fr) 88px;gap:9px;align-items:center}.pma-inbox-main{min-width:0;display:grid;grid-template-columns:35px minmax(0,1fr);gap:9px;align-items:center;text-decoration:none;color:inherit}.pma-inbox-ic{width:35px;height:35px;border-radius:11px;background:#EAF4F7;color:#327E96;display:grid;place-items:center}.pma-inbox-ic svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.pma-inbox-copy{min-width:0}.pma-inbox-copy b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pma-inbox-copy small{display:block;margin-top:2px;font-size:8.8px;color:#74858C}.pma-inbox-copy em{display:block;margin-top:4px;font-style:normal;font-size:8.8px;line-height:1.35;color:#919CA0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pma-inbox-actions{display:grid;gap:4px}.pma-inbox-actions button,.pma-inbox-actions a{min-height:30px;border:1px solid #DCE5E8;border-radius:8px;background:#fff;padding:5px 6px;font-size:7.8px;font-weight:800;line-height:1.15;color:#55727D;text-decoration:none;display:flex;align-items:center;justify-content:center;text-align:center}.pma-inbox-actions .primary{background:#2D8098;color:#fff;border-color:#2D8098}
  .pma-empty{border:1px dashed #D9E4E7;border-radius:16px;background:#fff;padding:24px 14px;text-align:center;color:#849198;font-size:10px}.pma-empty.large{padding:50px 16px}.pma-empty button{display:block;margin:10px auto 0;border:1px solid #CFE0E5;border-radius:9px;background:#fff;padding:8px 10px;color:#337A91;font-size:9px;font-weight:800}
  #${NAV}{position:fixed;left:10px;right:10px;bottom:calc(6px + env(safe-area-inset-bottom));z-index:2147483600;display:grid!important;grid-template-columns:1fr 1fr 58px 1fr 1fr;gap:2px;align-items:end;padding:6px;border:1px solid rgba(31,53,62,.12);border-radius:22px;background:rgba(255,255,255,.96);box-shadow:0 14px 34px rgba(22,39,47,.14);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
  #${NAV}>button{min-height:50px;border:0;border-radius:14px;background:transparent;color:#6D7A80;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:8px;font-weight:760}#${NAV}>button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}#${NAV}>button.on{background:#EAF5F8;color:#2B7F99}#${NAV}>button.pma-plus{width:54px;height:54px;min-height:54px;border-radius:50%;background:#173743;color:#fff;transform:translateY(-12px);box-shadow:0 9px 20px rgba(23,55,67,.24)}#${NAV}>button.pma-plus svg{width:24px;height:24px}
  #${UTIL}{position:fixed;right:14px;bottom:calc(75px + env(safe-area-inset-bottom));z-index:2147483550;display:flex!important;gap:5px;padding:4px;border:1px solid rgba(31,53,62,.11);border-radius:16px;background:rgba(255,255,255,.95);box-shadow:0 8px 22px rgba(23,42,50,.11);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}#${UTIL} button{height:37px;min-width:42px;border:0;border-radius:11px;background:transparent;color:#5E727A;display:flex;align-items:center;justify-content:center;gap:4px;padding:0 8px;font-size:8.5px;font-weight:800}#${UTIL} button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8}
  .pma-sheetback{position:fixed;inset:0;z-index:2147483700;background:rgba(22,41,49,.34);display:flex;align-items:flex-end;justify-content:center;padding:12px 12px calc(12px + env(safe-area-inset-bottom));backdrop-filter:blur(3px)}.pma-sheet{width:min(540px,100%);border-radius:22px;background:#fff;padding:8px 14px 18px;box-shadow:0 26px 60px rgba(20,38,46,.25)}.pma-sheetbar{width:42px;height:4px;border-radius:2px;background:#D7DEDF;margin:1px auto 12px}.pma-sheet h2{margin:0 0 12px;font-size:18px}.pma-create-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.pma-create-grid button{min-height:88px;border:1px solid #DFE7E9;border-radius:15px;background:#F9FBFB;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#35545F;font-size:10px;font-weight:800}.pma-create-grid svg{width:24px;height:24px;fill:none;stroke:#2F829B;stroke-width:1.8}.pma-more-list{display:grid;gap:5px}.pma-more-list button{min-height:58px;border:0;border-top:1px solid #EDF1F2;background:#fff;display:grid;grid-template-columns:34px minmax(0,1fr) 12px;gap:9px;align-items:center;text-align:left;color:#35515B}.pma-more-list button:first-child{border-top:0}.pma-more-list svg{width:20px;height:20px;fill:none;stroke:#3A8399;stroke-width:1.8}.pma-more-list b{display:block;font-size:11px}.pma-more-list small{display:block;margin-top:2px;font-size:8.8px;color:#89969B}.pma-more-list i{font-style:normal;color:#8C9DA3}
  .pma-ask{grid-template-columns:34px minmax(0,1fr) 34px!important}
  .pma-ask>.pma-ask-ic{width:34px;height:34px;border-radius:11px;background:#EEF5F7;color:#52717B;display:grid;place-items:center}
  .pma-ask>.pma-ask-copy{min-width:0;width:auto;height:auto;background:transparent;color:inherit;display:block}
  .pma-ask>.pma-ask-copy b{display:block;font-size:14px;color:#22343C}.pma-ask>.pma-ask-copy small{display:block;margin-top:3px;font-size:9.5px;color:#8A969B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pma-today button{position:relative;padding:9px 9px 8px}.pma-today button>i{position:absolute;right:8px;top:8px;width:24px;height:24px;border-radius:8px;background:#EEF6F8;color:#3B8298;display:grid;place-items:center}.pma-today button>i svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8}.pma-today strong{padding-top:3px}
  .pma-work-feed{display:grid;gap:10px;margin-top:10px}.pma-work-card{width:100%;border:1px solid #DDE7E9;border-radius:20px;background:#fff;padding:15px;text-align:left;box-shadow:0 7px 20px rgba(28,51,60,.035)}.pma-work-card.action{border-top:3px solid #C97B43}.pma-work-card.waiting{border-top:3px solid #C79A48}.pma-work-card.execution{border-top:3px solid #5A9470}.pma-work-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.pma-work-top small{font-size:8.5px;color:#95A0A4}.pma-work-card h3{margin:10px 0 0;font-size:16px;line-height:1.2;color:#203A45}.pma-work-card>p{margin:5px 0 0;font-size:10px;color:#869399}.pma-work-next{margin-top:12px;padding-top:10px;border-top:1px solid #EDF2F3;display:grid;grid-template-columns:auto minmax(0,1fr) 18px;gap:8px;align-items:center}.pma-work-next span{font-size:7.5px;font-weight:900;letter-spacing:.08em;color:#93A0A5}.pma-work-next b{font-size:10px;line-height:1.35;color:#46636E}.pma-work-next i{color:#3F879C}.pma-work-next svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2}
  .pma-discover-summary{display:flex;align-items:baseline;gap:6px;margin:9px 2px}.pma-discover-summary b{font-size:16px;color:#2E6678}.pma-discover-summary span{font-size:9px;color:#8A969B}
  .pma-discover-feed,.pma-target-feed{display:grid;gap:11px}.pma-opportunity-card{position:relative;border:1px solid #DDE7E9;border-radius:21px;background:#fff;padding:16px;box-shadow:0 8px 22px rgba(29,51,60,.04)}.pma-opportunity-card.strong{border-top:4px solid #5D9470}.pma-opportunity-card.possible{border-top:4px solid #C39A54}.pma-opportunity-card h2{margin:12px 0 0;font-size:18px;line-height:1.15;letter-spacing:-.25px;color:#1F3741}.pma-opportunity-card>p{margin:8px 0 0;font-size:10.5px;line-height:1.45;color:#74858C}.pma-opportunity-card .pma-opp-facts{margin-top:11px}.pma-opportunity-card .pma-opp-actions{margin-top:13px;padding-top:0}.pma-card-index{margin-top:9px;text-align:right;font-size:8px;color:#A0A9AC}
  .pma-target-card{width:100%;border:1px solid #DDE7E9;border-radius:19px;background:#fff;padding:15px;text-align:left;box-shadow:0 7px 20px rgba(29,51,60,.035)}.pma-target-card.material{border-top:3px solid #4F9173}.pma-target-card.rep{border-top:3px solid #A88B52}.pma-target-top{display:flex;align-items:center;justify-content:space-between}.pma-target-top span{font-size:8px;font-weight:900;letter-spacing:.09em;color:#7E8D93}.pma-target-top em{font-style:normal;font-size:9px;font-weight:850;color:#397E93}.pma-target-card h3{margin:9px 0 0;font-size:16px;color:#243E48}.pma-target-card>small{display:block;margin-top:4px;font-size:9px;color:#87949A}.pma-target-card>p{margin:8px 0 0;font-size:10px;line-height:1.45;color:#74858C}.pma-target-card>div:last-child{margin-top:11px;display:flex;align-items:center;justify-content:space-between}.pma-target-card>div:last-child b{font-size:9px;color:#496873}.pma-target-card>div:last-child i{color:#3C8499}.pma-target-card svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2}
  .pma-inbox-status{display:flex;align-items:center;justify-content:space-between;margin:-2px 1px 9px;padding:8px 10px;border-radius:12px;background:#EEF4F6}.pma-inbox-status span{font-size:9px;font-weight:800;color:#7C898F}.pma-inbox-status span.on{color:#3D7C5C}.pma-inbox-status small{font-size:8.5px;color:#8D999D}.pma-inline-error{margin:0 0 9px;padding:9px 11px;border:1px solid #EBD2D2;border-radius:12px;background:#FFF7F7;color:#9B5555;font-size:9px}
  .pma-inbox-row{align-items:start;padding:13px}.pma-inbox-copy b{font-size:11.5px}.pma-inbox-copy em{font-size:9px;-webkit-line-clamp:3}
  .pma-rep-review-head{display:flex;align-items:baseline;gap:6px;margin:14px 2px 8px}.pma-rep-review-head b{font-size:15px;color:#7D6840}.pma-rep-review-head span{font-size:9px;color:#8D979A}.pma-target-card.rep.live{border-top-color:#5D9470}.pma-target-card.rep.review{border-top-color:#B9A06A}

}
`;document.head.appendChild(s);
}
function schedule(){clearTimeout(scheduleTimer);scheduleTimer=setTimeout(function(){if(!compact()||authBlocking())return;installCss();ensureChrome();if(!state.detail)showShell(state.tab);},90);}
function boot(){
  installCss();document.addEventListener('click',click,true);document.addEventListener('input',input,true);
  schedule();
}
document.addEventListener('pst:modules-ready',function(){schedule();if(state.tab==='inbox')setTimeout(function(){loadInbox(false,false);},120);});
document.addEventListener('pst:home-canonical-rendered',function(){if(state.detail||state.tab!=='home')return;clearTimeout(homeRenderTimer);homeRenderTimer=setTimeout(render,140);});
document.addEventListener('pst:mobile-pin-unlocked',schedule);
window.addEventListener('pageshow',schedule);window.addEventListener('focus',function(){ensureChrome();if(!state.detail)render();});window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

window.PSTMobileAppV2={version:VERSION,show:showShell,render:render,state:state,openProject:openProject,loadOpportunities:loadOpportunities,loadInbox:loadInbox,_test:{projectBucket:projectBucket,projectRows:projectRows,priorityItems:priorityItems}};
})();