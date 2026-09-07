/* PRISTEEL daily zones cleanup v3
 * UX/UI simplification layer for the canonical PPPP workspaces.
 * Presentation only: no database writes, no outbound communication, no polling,
 * no MutationObserver, no route ownership and no approval-gate bypasses.
 * Existing business engines stay authoritative; this module only reduces visual
 * noise, consolidates navigation and promotes the next action.
 */
(function(){
'use strict';
if(window.__pstDailyZonesCleanupV3)return;
window.__pstDailyZonesCleanupV3=true;
window.__pstDailyZonesCleanupV2=true;
window.__pstDailyZonesCleanupV1=true;

function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function active(id){var p=document.getElementById(id);return p&&p.classList.contains('active')?p:null;}
function text(el){return N(el&&el.textContent);}
function closestSurface(el,root){
  if(!el)return null;
  var x=el.closest&&el.closest('section,article,.pn-card,.pst-ws-card,.card,.pf2-card,.pst-home-card,.pn-panel,.pn-section');
  return x&&(!root||root.contains(x))?x:el.parentElement;
}
function todayText(v){
  if(!v)return'Pa afat';var d=new Date(v);if(isNaN(d.getTime()))return S(v);
  var t=new Date();t.setHours(0,0,0,0);var x=new Date(d);x.setHours(0,0,0,0);var n=Math.round((x-t)/86400000);
  if(n<0)return'Vonuar '+Math.abs(n)+' ditë';if(n===0)return'Sot';if(n===1)return'Nesër';
  return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'});
}
function nextActionForProject(r){
  r=r||{};
  var explicit=S(r.next_action||r.next_step||r.next_action_text||r.action_required||r.current_action||'').trim();
  if(explicit)return explicit;
  var op=N(r.operational_state),stage=N(r.pipeline_stage),st=N(r.status);
  if(/wait for client|waiting client|pritje.*klient/.test(op+' '+st))return'Prit përgjigjen e klientit; bëj rikujtim në afat';
  if(/wait for supplier|waiting supplier|pritje.*furnitor/.test(op+' '+st))return'Prit ofertën e furnitorit; bëj rikujtim në afat';
  if(/action|required|attention|active work/.test(op)){
    if(/pricing|cmim/.test(stage))return'Kontrollo koston, çmimin dhe marzhin';
    if(/client offer|offer/.test(stage))return'Finalizo ofertën për klientin';
    if(/supplier|rfq/.test(stage))return'Vazhdo me kërkesat/ofertat e furnitorëve';
    if(/production|execution/.test(stage))return'Kontrollo hapin e ekzekutimit';
    return'Kontrollo çështjen që kërkon veprim';
  }
  if(/pricing|cmim/.test(stage))return'Kontrollo çmimin dhe marzhin';
  if(/client offer/.test(stage))return'Kontrollo ofertën për klientin';
  if(/commercial/.test(stage))return'Kontrollo përgjigjen ose rikujtimin';
  if(/production|execution/.test(stage))return'Vazhdo ekzekutimin';
  return'Kontrollo gjendjen dhe përcakto hapin tjetër';
}

function cleanPartners(){
  var p=active('page-workspace-contacts');if(!p)return false;
  var h=p.querySelector('.pcm-head h1');if(h)h.textContent='Partnerët';
  var sub=p.querySelector('.pcm-head p');if(sub)sub.textContent='Klientë, furnitorë dhe partnerë — një identitet për komunikimin dhe projektet.';
  var cardTitle=p.querySelector('.pcm-card-head b');if(cardTitle)cardTitle.textContent='Marrëdhëniet';
  p.querySelectorAll('[data-pcm-refresh],[data-pcm-classic]').forEach(function(x){x.classList.add('pst-daily-system-only');});
  p.querySelectorAll('[data-pcm-business-count],#pcm-count').forEach(function(x){x.classList.add('pst-daily-passive-count');});
  return true;
}
function systemHealth(){
  var p=active('page-workspace-apps');if(!p)return false;
  var X=window.PSTAutomationHealthV1;if(X&&typeof X.load==='function'){X.load(false);return true;}
  if(document.querySelector('script[data-pst-automation-health]'))return true;
  var s=document.createElement('script');s.src='pristeel-automation-health-v1.js?v=20260825-system2';s.defer=true;s.setAttribute('data-pst-automation-health','1');s.onload=function(){var H=window.PSTAutomationHealthV1;if(H&&typeof H.load==='function')H.load(false);};document.head.appendChild(s);return true;
}
function ensureSystemTools(p,grid){
  if(!p||!grid)return null;var details=p.querySelector('#pst-system-advanced-tools');
  if(!details){details=document.createElement('details');details.id='pst-system-advanced-tools';details.innerHTML='<summary><div><b>Mjete teknike</b><span>Diagnostika, integrimet dhe modulet rezervë</span></div><i>Hap vetëm kur duhet</i></summary><div class="pst-system-advanced-body"></div>';grid.parentNode.insertBefore(details,grid);details.querySelector('.pst-system-advanced-body').appendChild(grid);}else if(!details.contains(grid)){var body=details.querySelector('.pst-system-advanced-body');if(body)body.appendChild(grid);}return details;
}
function cleanSystemLabels(){
  var p=active('page-workspace-apps');if(!p)return false;
  var eyebrow=p.querySelector('.pst-ws-eyebrow'),title=p.querySelector('.pst-ws-title'),sub=p.querySelector('.pst-ws-sub');
  if(eyebrow)eyebrow.textContent='SISTEMI';if(title)title.textContent='Sistemi dhe automatizimet';if(sub)sub.textContent='Kur gjithçka punon normalisht, kjo zonë qëndron e qetë. Shfaqen vetëm përjashtimet që kërkojnë ndërhyrje.';
  var duplicate=p.querySelector('#pst-system-operating-tools');if(duplicate)duplicate.classList.add('pst-daily-system-duplicate');
  var grid=p.querySelector('.pst-ws-appgrid,[data-pst-system-tools="1"]');if(grid){grid.setAttribute('data-pst-system-tools','1');var details=ensureSystemTools(p,grid),health=p.querySelector('#pst-auto-health');if(details&&health&&health.parentNode)details.parentNode.insertBefore(health,details);}systemHealth();return true;
}
function financeDaily(){var p=active('page-finance');if(!p)return false;var X=window.PSTFinanceDailyV1;if(X&&typeof X.apply==='function'){X.apply(false);return true;}if(document.querySelector('script[data-pst-finance-daily]'))return true;var s=document.createElement('script');s.src='pristeel-finance-daily-v1.js?v=20260825-1';s.defer=true;s.setAttribute('data-pst-finance-daily','1');s.onload=function(){var F=window.PSTFinanceDailyV1;if(F&&typeof F.apply==='function')F.apply(false);};document.head.appendChild(s);return true;}
function opportunitiesDaily(){var p=active('page-kek-tenders');if(!p)return false;var X=window.PSTOpportunitiesDailyV1;if(X&&typeof X.apply==='function'){X.apply(false);return true;}if(document.querySelector('script[data-pst-opportunities-daily]'))return true;var s=document.createElement('script');s.src='pristeel-opportunities-daily-v1.js?v=20260825-1';s.defer=true;s.setAttribute('data-pst-opportunities-daily','1');s.onload=function(){var O=window.PSTOpportunitiesDailyV1;if(O&&typeof O.apply==='function')O.apply(false);};document.head.appendChild(s);return true;}

function homeRoot(){var p=active('page-workspace-home');if(!p)return null;return p.querySelector('#pst-native-home-v4,#pst-native-home-v3')||p;}
function isZeroOrHealthy(card){
  var t=text(card),b=card&&card.querySelector&&card.querySelector('b,strong,.pn-kpi-value,.pn-value'),v=N(b&&b.textContent);
  if(/error|gabim|vonuar|overdue|attention|vemendje|veprim|required|block|bllok|afati|deadline/.test(t))return false;
  if(/systems healthy|sistemet ne rregull|automation healthy|automatizimi ne rregull|ocr ok|queue ok|0 errors|0 gabime|0 alerts|0 sinjaliz/.test(t))return true;
  if((v==='0'||v==='0 00'||v==='0 eur'||v==='0 00 eur')&&/alert|sinjaliz|gabim|error|overdue|vonuar|problem/.test(t))return true;
  return false;
}
function cleanHome(){
  var p=active('page-workspace-home'),root=homeRoot();if(!p||!root)return false;p.classList.add('pst-ux-home');
  var input=root.querySelector('.pst-live-input,#pst-bcc-home-search,input[placeholder*="PPPP"],textarea[placeholder*="PPPP"]');if(input)input.setAttribute('placeholder','Pyet PPPP ose kërko…');
  root.querySelectorAll('.pn-kpi,.pst-home-kpi,.pst-live-kpi,[data-pst-kpi]').forEach(function(c){c.classList.toggle('pst-ux-quiet-kpi',isZeroOrHealthy(c));});
  root.querySelectorAll('h2,h3,h4,b,strong,span').forEach(function(h){
    var t=text(h),surface=closestSurface(h,root);if(!surface)return;
    if(/analysis|analize|work balance|balanca e punes|client concentration|perqendrimi sipas klienteve|status distribution|shperndarja sipas gjendjes/.test(t))surface.classList.add('pst-ux-home-secondary');
    if(t==='per ty tani'||t==='for you now')surface.classList.add('pst-ux-home-now');
    if(/ne vijim|outlook|pritje|follow up|rikujtim/.test(t))surface.classList.add('pst-ux-home-waiting');
  });
  ['wx-card','weather-card','radio-card','game-card','hub-radio','hub-weather','hub-game'].forEach(function(id){var el=document.getElementById(id);if(el&&root.contains(el)){var s=closestSurface(el,root);if(s)s.classList.add('pst-ux-home-secondary');}});
  root.querySelectorAll('[id*="automation"],[class*="automation"]').forEach(function(el){if(/0|ok|healthy|ne rregull/.test(text(el))&&!/gabim|error|alert|sinjaliz|problem/.test(text(el))){var s=closestSurface(el,root);if(s)s.classList.add('pst-ux-home-secondary');}});
  return true;
}

function rowData(id){return A(window.__pstWorkspaceProjectRows).filter(function(r){return S(r&&r.id)===S(id);})[0]||null;}
function decorateProjectRow(row){
  if(!row||row.dataset.pstUxRow==='1')return;var id=row.getAttribute('data-project-id'),r=rowData(id);row.dataset.pstUxRow='1';row.setAttribute('tabindex','0');row.setAttribute('role','link');row.title='Hap projektin';
  var main=row.querySelector('.pst-pm-main'),meta=row.querySelector('.pst-pm-meta');if(main){var d=main.querySelector('.pst-pm-desc');if(d)d.classList.add('pst-ux-project-description');}
  var next=document.createElement('div');next.className='pst-ux-next-cell';next.innerHTML='<span>Hapi tjetër</span><b>'+S(nextActionForProject(r)).replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</b>'+(r&&r.deadline?'<small>'+todayText(r.deadline)+'</small>':'');if(meta)row.insertBefore(next,meta.nextSibling);else row.appendChild(next);
}
function cleanProjectsList(){
  var p=active('page-workspace-projects');if(!p)return false;p.classList.add('pst-ux-projects');
  var title=p.querySelector('.pst-pm-title');if(title)title.textContent='Projektet';var sub=p.querySelector('.pst-pm-sub');if(sub)sub.textContent='Gjendja reale, hapi tjetër dhe afati — pa zhurmë të panevojshme.';
  p.querySelectorAll('#pst-pdm-btn,#pst-pm-refresh').forEach(function(x){x.classList.add('pst-daily-project-tool');});
  p.querySelectorAll('.pst-pm-row').forEach(decorateProjectRow);return true;
}
function openProjectRow(row){if(!row)return;var main=row.querySelector('.pst-pm-main[data-pm-open]');if(main){try{main.click();}catch(e){}}}

var PHASE_LABELS={overview:'1 Përgatitja',procurement:'2 Prokurimi',execution:'4 Ekzekutimi',finance:'5 Financa'};
function projectState(){var d=window.__pstIntegrityLastData||{},p=d.project||{};return p;}
function projectCommercial(){
  var C=window.PSTCanonicalProjectWorkflowV1;if(C&&typeof C.render==='function'){try{C.render('procurement','pricing');return true;}catch(e){}}
  var P=window.PSTProjectFirstV2;if(P&&typeof P.render==='function'){try{P.render('commercial');return true;}catch(e){}}return false;
}
function ensureProjectNav(p){
  var nav=p.querySelector('.pst-pi-tabs.pwf-area-nav,.pst-pi-tabs');if(!nav)return false;nav.classList.add('pst-ux-phase-nav');
  Object.keys(PHASE_LABELS).forEach(function(k){var b=nav.querySelector('[data-pwf-area="'+k+'"]');if(b)b.textContent=PHASE_LABELS[k];});
  var proc=nav.querySelector('[data-pwf-area="procurement"]'),commercial=nav.querySelector('[data-pst-ux-commercial]');
  if(proc&&!commercial){commercial=document.createElement('button');commercial.type='button';commercial.className='pwf-area-btn pst-ux-commercial-btn';commercial.setAttribute('data-pst-ux-commercial','1');commercial.textContent='3 Komerciale';proc.insertAdjacentElement('afterend',commercial);}
  var utils=p.querySelector('.pst-ux-project-utils');if(!utils){utils=document.createElement('div');utils.className='pst-ux-project-utils';nav.insertAdjacentElement('afterend',utils);}
  [['files','Skedarët'],['communication','Komunikimi']].forEach(function(x){var b=nav.querySelector('[data-pwf-area="'+x[0]+'"]')||p.querySelector('.pst-ux-project-utils [data-pwf-area="'+x[0]+'"]');if(b){b.textContent=x[1];b.classList.add('pst-ux-utility-btn');utils.appendChild(b);}});
  var area=p.getAttribute('data-pwf-area')||'',stage=p.getAttribute('data-pwf-stage')||'';p.classList.toggle('pst-ux-commercial-active',area==='procurement'&&(stage==='pricing'||stage==='client_offer'));p.classList.toggle('pst-ux-procurement-active',area==='procurement'&&stage!=='pricing'&&stage!=='client_offer');
  if(commercial)commercial.classList.toggle('on',p.classList.contains('pst-ux-commercial-active'));if(proc&&p.classList.contains('pst-ux-commercial-active'))proc.classList.remove('on');
  return true;
}
function compactProjectHeader(p){
  var ctx=p.querySelector('.pwf-project-context');if(!ctx)return false;ctx.classList.add('pst-ux-project-context');p.querySelectorAll('.pwf-project-kpis').forEach(function(x){x.classList.add('pst-daily-passive-count');});
  var pr=projectState(),main=ctx.querySelector('.pwf-project-main'),small=main&&main.querySelector('small');if(small&&pr){var bits=[pr.client,pr.ref||pr.reference,pr.status||pr.operational_state,pr.deadline?('Afati '+todayText(pr.deadline)):''].filter(Boolean);if(bits.length)small.textContent=bits.join(' · ');}
  var next=ctx.querySelector('.pwf-next');if(next){var s=next.querySelector('span');if(s)s.textContent='HAPI TJETËR';next.setAttribute('aria-label','Hapi tjetër i projektit');}
  return true;
}
function humanizeProject(p){
  if(!p)return;var replacements={'HUMAN GATE':'KËRKON MIRATIMIN TËND','Review BOM para RFQ':'Kontrollo BOM-in para kërkesës për ofertë','RFQ krijohet si draft':'Kërkesa për ofertë përgatitet paraprakisht','Krahasim + marzh + aprovim':'Kontrollo krahasimin, çmimin dhe marzhin','Financat finalizohen vetëm me miratim':'Kontrollo dhe mirato dokumentin financiar','Dokumenti mbetet human-gated':'Kërkon miratimin tënd','Draft':'Paraprak','draft':'paraprak','follow-up':'rikujtim','Follow-up':'Rikujtim','Statusi':'Gjendja','Status':'Gjendja','pricing':'çmimi','Pricing':'Çmimi'};
  p.querySelectorAll('span,b,strong,p,small,button').forEach(function(el){if(el.children.length)return;var raw=el.textContent,trim=S(raw).trim();if(replacements[trim]){el.textContent=replacements[trim];return;}var out=S(raw).replace(/\bHuman Gate\b/gi,'Kërkon miratimin tënd').replace(/\bhuman-gated\b/gi,'me miratim njerëzor').replace(/\bfollow-up\b/gi,'rikujtim').replace(/\bdraft\b/gi,'paraprak');if(out!==raw)el.textContent=out;});
}
function compactStageStrip(p){
  var head=p.querySelector('.pwf-procurement-head');if(!head)return false;head.classList.add('pst-ux-progress');var title=head.querySelector('.pwf-procurement-title b'),sub=head.querySelector('.pwf-procurement-title small');
  if(p.classList.contains('pst-ux-commercial-active')){if(title)title.textContent='Çmimi dhe oferta për klientin';if(sub)sub.textContent='Kosto → çmim → miratim → ofertë për klientin.';}else{if(title)title.textContent='Prokurimi';if(sub)sub.textContent='BOM → kërkesë për ofertë → oferta furnitorësh → krahasim.';}return true;
}
function cleanProjectSummary(){var p=active('page-workspace-project');if(!p)return false;p.classList.add('pst-ux-project');ensureProjectNav(p);compactProjectHeader(p);compactStageStrip(p);humanizeProject(p);return true;}

function cleanFilesAndCommunication(){
  var p=active('page-workspace-project');if(!p)return false;var area=p.getAttribute('data-pwf-area');
  if(area==='files'){p.classList.add('pst-ux-files');p.querySelectorAll('.pf2-file-line,.pf2-line').forEach(function(r){r.classList.add('pst-ux-file-row');var b=r.querySelector('b');if(b&&/^(dokument|document)$/i.test(S(b.textContent).trim()))b.textContent='Skedar pa emër';});}else p.classList.remove('pst-ux-files');
  if(area==='communication'){p.classList.add('pst-ux-communication');p.querySelectorAll('.pf2-mail').forEach(function(m){m.classList.add('pst-ux-thread');var body=m.querySelector('p');if(body)body.title=S(body.textContent).trim();var op=m.querySelector('.pf2-mail-open');if(op)op.textContent='Hap thread-in ↗';});}else p.classList.remove('pst-ux-communication');return true;
}
function cleanVisibleEnglish(){
  var p=document.querySelector('.page.active');if(!p)return;var exact={Home:'Kryefaqja',Projects:'Projektet',Partners:'Partnerët',Finance:'Financat',System:'Sistemi',Files:'Skedarët',Communication:'Komunikimi',Procurement:'Prokurimi',Commercial:'Komerciale',Execution:'Ekzekutimi',Status:'Gjendja','Next step':'Hapi tjetër',Refresh:'Rifresko',Search:'Kërko',Close:'Mbyll',Cancel:'Anulo',Save:'Ruaj',Open:'Hap',Draft:'Paraprak',Waiting:'Në pritje'};
  p.querySelectorAll('button,label,small,span,b,strong,h1,h2,h3,h4,h5,h6').forEach(function(el){if(el.children.length)return;var t=S(el.textContent).trim();if(exact[t])el.textContent=exact[t];});
}
function apply(){cleanPartners();cleanHome();cleanProjectsList();cleanProjectSummary();cleanFilesAndCommunication();cleanSystemLabels();financeDaily();opportunitiesDaily();cleanVisibleEnglish();}

function css(){
  if(document.getElementById('pst-daily-zones-cleanup-css'))document.getElementById('pst-daily-zones-cleanup-css').remove();
  var s=document.createElement('style');s.id='pst-daily-zones-cleanup-css';s.textContent=`
:root{--pst-ux-accent:#4F8FA6;--pst-ux-accent-deep:#36758D;--pst-ux-accent-soft:#EDF6F8;--pst-ux-warm:#F7F6F3;--pst-ux-surface:#FCFCFA;--pst-ux-line:#E7E5E0;--pst-ux-text:#292D2F;--pst-ux-muted:#737B7F;--pst-ux-shadow:0 8px 28px rgba(35,45,49,.055)}
body{background:var(--pst-ux-warm)!important;color:var(--pst-ux-text)!important}.page.active{animation:pstUxPageIn .16s ease both}@keyframes pstUxPageIn{from{opacity:.55;transform:translateY(2px)}to{opacity:1;transform:none}}button,a,[role="button"],.pst-pm-row,.pf2-line,.pf2-mail{transition:background-color .17s ease,border-color .17s ease,box-shadow .17s ease,color .17s ease,transform .17s ease!important}@media(prefers-reduced-motion:reduce){.page.active,button,a,[role="button"],.pst-pm-row,.pf2-line,.pf2-mail{animation:none!important;transition:none!important}}
#page-workspace-home.active.pst-ux-home .pst-ux-quiet-kpi,#page-workspace-home.active.pst-ux-home .pst-ux-home-secondary{display:none!important}#page-workspace-home.active.pst-ux-home #pst-native-home-v4,#page-workspace-home.active.pst-ux-home #pst-native-home-v3{max-width:1320px!important;margin:0 auto!important;padding:20px 26px 42px!important}#page-workspace-home.active.pst-ux-home .pn-head{margin-bottom:10px!important}#page-workspace-home.active.pst-ux-home .pn-head h1,#page-workspace-home.active.pst-ux-home .pn-head b{letter-spacing:-.03em!important}#page-workspace-home.active.pst-ux-home .pn-ask-slot{margin-bottom:18px!important;min-height:54px!important}#page-workspace-home.active.pst-ux-home .pst-live-command-shell{border:1px solid var(--pst-ux-line)!important;border-left:0!important;border-radius:12px!important;background:var(--pst-ux-surface)!important;box-shadow:0 1px 2px rgba(30,40,44,.025)!important}#page-workspace-home.active.pst-ux-home .pst-live-command{background:transparent!important}#page-workspace-home.active.pst-ux-home .pn-kpis{display:flex!important;gap:8px!important;flex-wrap:wrap!important;margin:0 0 18px!important}#page-workspace-home.active.pst-ux-home .pn-kpi{flex:0 1 180px!important;min-height:68px!important;padding:10px 12px!important;border:0!important;border-radius:10px!important;background:rgba(255,255,255,.62)!important;box-shadow:none!important}#page-workspace-home.active.pst-ux-home .pn-kpi b{font-size:20px!important}#page-workspace-home.active.pst-ux-home section,#page-workspace-home.active.pst-ux-home .pn-panel{border-color:transparent!important;box-shadow:none!important}#page-workspace-home.active.pst-ux-home .pst-ws-action,#page-workspace-home.active.pst-ux-home [class*="action-row"]{border-left:0!important;border-right:0!important;border-top:0!important;border-radius:0!important;background:transparent!important}#page-workspace-home.active.pst-ux-home .pst-ws-action:hover,#page-workspace-home.active.pst-ux-home [class*="action-row"]:hover{background:#F1F4F3!important;transform:none!important}
#page-workspace-contacts.active .pst-daily-system-only,#page-workspace-contacts.active .pst-daily-passive-count{display:none!important}#page-workspace-contacts.active .pcm-head-actions:empty{display:none!important}#page-workspace-apps.active .pst-daily-system-duplicate{display:none!important}#page-workspace-apps.active #pst-system-advanced-tools{margin-top:12px;border:1px solid var(--pst-ux-line);border-radius:12px;background:var(--pst-ux-surface);overflow:hidden}#page-workspace-apps.active #pst-system-advanced-tools>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 15px}#page-workspace-apps.active #pst-system-advanced-tools>summary::-webkit-details-marker{display:none}#page-workspace-apps.active #pst-system-advanced-tools>summary b{display:block;font-size:12px;color:#475D66}#page-workspace-apps.active #pst-system-advanced-tools>summary span{display:block;margin-top:2px;font-size:11px;color:#88979D}#page-workspace-apps.active #pst-system-advanced-tools>summary i{font-style:normal;font-size:11px;font-weight:750;color:var(--pst-ux-accent-deep)}#page-workspace-apps.active #pst-system-advanced-tools[open]>summary{border-bottom:1px solid var(--pst-ux-line)}#page-workspace-apps.active .pst-system-advanced-body{padding:12px}
#page-workspace-projects.active.pst-ux-projects .pst-pm-page{max-width:1500px!important;padding:18px 24px 34px!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-head{margin-bottom:10px!important;align-items:center!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-title{font-size:22px!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-sub{font-size:12px!important;margin-top:3px!important}#page-workspace-projects.active.pst-ux-projects .pst-daily-project-tool{display:none!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-controls{padding:7px!important;margin-bottom:8px!important;border:0!important;border-radius:10px!important;box-shadow:none!important;background:rgba(255,255,255,.64)!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-control-top{gap:6px!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-search,#page-workspace-projects.active.pst-ux-projects .pst-pm-select{height:34px!important;border-radius:8px!important;font-size:12px!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-filters{margin-top:6px!important;gap:4px!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-chip{height:26px!important;font-size:11px!important;padding:0 9px!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-list{gap:2px!important;border-top:1px solid var(--pst-ux-line)!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-row{grid-template-columns:minmax(245px,1.6fr) minmax(330px,1.45fr) minmax(235px,1.15fr) auto!important;gap:16px!important;min-height:53px!important;padding:7px 8px 7px 12px!important;border:0!important;border-bottom:1px solid var(--pst-ux-line)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;transform:none!important;cursor:pointer!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-row:before{top:10px!important;bottom:10px!important;width:2px!important;left:0!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-row:hover{background:#F0F2EF!important;box-shadow:none!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-name{font-size:13px!important}.pst-ux-project-description{display:none!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-client{font-size:11.5px!important;margin-top:1px!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-meta{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;order:2!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-meta-label{font-size:9px!important;margin-bottom:1px!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-meta-value,#page-workspace-projects.active.pst-ux-projects .pst-pm-badge{font-size:11px!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-badge{padding:2px 6px!important}#page-workspace-projects.active.pst-ux-projects .pst-ux-next-cell{min-width:0;order:3!important}#page-workspace-projects.active.pst-ux-projects .pst-ux-next-cell>span{display:block;font-size:9px;letter-spacing:.55px;text-transform:uppercase;color:#9A9D9C;font-weight:750}#page-workspace-projects.active.pst-ux-projects .pst-ux-next-cell>b{display:block;margin-top:2px;font-size:11.5px;line-height:1.25;color:#34393B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#page-workspace-projects.active.pst-ux-projects .pst-ux-next-cell>small{display:none}#page-workspace-projects.active.pst-ux-projects .pst-pm-main{order:1!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-actions{order:4!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-open{display:none!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-more{width:30px!important;height:30px!important;border-color:transparent!important;background:transparent!important}
#page-workspace-project.active.pst-ux-project .pst-pi-tabs.pwf-area-nav.pst-ux-phase-nav{display:flex!important;gap:2px!important;padding:3px!important;margin:0 0 6px!important;border:0!important;border-radius:10px!important;background:#ECEDE9!important;overflow:auto!important}#page-workspace-project.active.pst-ux-project .pst-ux-phase-nav .pwf-area-btn{min-height:34px!important;padding:0 12px!important;border-radius:8px!important;font-size:12px!important;color:#62696C!important}#page-workspace-project.active.pst-ux-project .pst-ux-phase-nav .pwf-area-btn.on,#page-workspace-project.active.pst-ux-project .pst-ux-phase-nav .pst-ux-commercial-btn.on{background:#fff!important;color:#2F3538!important;box-shadow:0 1px 4px rgba(30,40,44,.08)!important}#page-workspace-project.active.pst-ux-project .pst-ux-project-utils{display:flex;justify-content:flex-end;gap:6px;margin:0 0 10px!important}#page-workspace-project.active.pst-ux-project .pst-ux-project-utils .pst-ux-utility-btn{min-height:30px!important;padding:0 9px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:#6F777A!important;font-size:11.5px!important;font-weight:650!important;cursor:pointer!important}#page-workspace-project.active.pst-ux-project .pst-ux-project-utils .pst-ux-utility-btn:hover,#page-workspace-project.active.pst-ux-project .pst-ux-project-utils .pst-ux-utility-btn.on{background:#EAEEED!important;color:#2E606F!important}#page-workspace-project.active.pst-ux-project .pst-ux-project-context{grid-template-columns:minmax(300px,1.15fr) minmax(340px,.85fr)!important;gap:8px!important;margin-bottom:9px!important}#page-workspace-project.active.pst-ux-project .pst-ux-project-context .pwf-project-kpis{display:none!important}#page-workspace-project.active.pst-ux-project .pst-ux-project-context .pwf-project-main,#page-workspace-project.active.pst-ux-project .pst-ux-project-context .pwf-next{border:0!important;border-radius:10px!important;background:rgba(255,255,255,.62)!important;box-shadow:none!important;padding:10px 12px!important}#page-workspace-project.active.pst-ux-project .pwf-project-main b{font-size:15px!important}#page-workspace-project.active.pst-ux-project .pwf-project-main small{font-size:11px!important}#page-workspace-project.active.pst-ux-project .pwf-next{border-left:2px solid var(--pst-ux-accent)!important}#page-workspace-project.active.pst-ux-project .pst-ux-progress{border:0!important;border-radius:10px!important;padding:10px 12px!important;margin-bottom:8px!important;background:rgba(255,255,255,.55)!important;box-shadow:none!important}#page-workspace-project.active.pst-ux-project .pwf-procurement-title span{display:none!important}#page-workspace-project.active.pst-ux-project .pwf-procurement-title b{font-size:12.5px!important}#page-workspace-project.active.pst-ux-project .pwf-procurement-title small{font-size:10.5px!important}#page-workspace-project.active.pst-ux-project .pwf-stage-nav{display:flex!important;gap:3px!important;margin-top:8px!important;padding:0!important}#page-workspace-project.active.pst-ux-project .pwf-stage{min-width:0!important;flex:1!important;padding:6px 7px!important;border:0!important;border-radius:8px!important;background:transparent!important}#page-workspace-project.active.pst-ux-project .pwf-stage:hover{background:#EFF2F0!important}#page-workspace-project.active.pst-ux-project .pwf-stage.on{background:#fff!important;box-shadow:0 1px 4px rgba(30,40,44,.07)!important}#page-workspace-project.active.pst-ux-project .pwf-stage-index{width:20px!important;height:20px!important;font-size:9px!important}#page-workspace-project.active.pst-ux-project .pwf-stage-copy b{font-size:10.5px!important}#page-workspace-project.active.pst-ux-project .pwf-stage-copy small{font-size:9px!important}#page-workspace-project.active.pst-ux-project.pst-ux-procurement-active .pwf-stage[data-pwf-stage="pricing"],#page-workspace-project.active.pst-ux-project.pst-ux-procurement-active .pwf-stage[data-pwf-stage="client_offer"]{display:none!important}#page-workspace-project.active.pst-ux-project.pst-ux-commercial-active .pwf-stage:not([data-pwf-stage="pricing"]):not([data-pwf-stage="client_offer"]){display:none!important}#page-workspace-project.active.pst-ux-project .pf2-card,#page-workspace-project.active.pst-ux-project .pwf-focus-card,#page-workspace-project.active.pst-ux-project .pwf-list-card{border:0!important;border-radius:10px!important;background:rgba(255,255,255,.68)!important;box-shadow:none!important}#page-workspace-project.active.pst-ux-project .pf2-gate{border:0!important;border-left:2px solid #C89043!important;border-radius:8px!important;background:#FBF7EE!important;box-shadow:none!important}#page-workspace-project.active.pst-ux-project .pf2-gate.ok{border-left-color:#5C8B68!important;background:#F1F6F0!important}
#page-workspace-project.active.pst-ux-files .pf2-note{border:0!important;background:transparent!important;color:var(--pst-ux-muted)!important;padding:2px 0 10px!important}#page-workspace-project.active.pst-ux-files .pf2-card{padding-bottom:4px!important}#page-workspace-project.active.pst-ux-files .pst-ux-file-row{min-height:46px!important;margin:0!important;padding:7px 8px!important;border:0!important;border-bottom:1px solid var(--pst-ux-line)!important;border-radius:0!important;background:transparent!important}#page-workspace-project.active.pst-ux-files .pst-ux-file-row:hover{background:#F0F2EF!important}#page-workspace-project.active.pst-ux-files .pst-ux-file-row b{font-size:12.5px!important}#page-workspace-project.active.pst-ux-files .pst-ux-file-row span{font-size:11px!important}
#page-workspace-project.active.pst-ux-communication .pf2-card{background:transparent!important}#page-workspace-project.active.pst-ux-communication .pst-ux-thread{margin:0!important;padding:10px 8px!important;border:0!important;border-bottom:1px solid var(--pst-ux-line)!important;border-radius:0!important;background:transparent!important}#page-workspace-project.active.pst-ux-communication .pst-ux-thread:hover{background:#F0F2EF!important}#page-workspace-project.active.pst-ux-communication .pst-ux-thread>b{font-size:12.5px!important}#page-workspace-project.active.pst-ux-communication .pst-ux-thread>span{font-size:10.5px!important}#page-workspace-project.active.pst-ux-communication .pst-ux-thread>p{display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;margin:5px 0!important;font-size:11.5px!important;line-height:1.45!important;color:#727A7E!important}#page-workspace-project.active.pst-ux-communication .pf2-mail-open{font-size:10.5px!important;color:var(--pst-ux-accent-deep)!important}
@media(max-width:1180px){#page-workspace-projects.active.pst-ux-projects .pst-pm-row{grid-template-columns:minmax(220px,1.3fr) minmax(320px,1.4fr) minmax(190px,1fr) auto!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-meta-block:nth-child(4){display:none!important}}@media(max-width:860px){#page-workspace-projects.active.pst-ux-projects .pst-pm-row{grid-template-columns:1fr auto!important;gap:6px 10px!important;padding:10px!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-main{grid-column:1!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-meta,#page-workspace-projects.active.pst-ux-projects .pst-ux-next-cell{grid-column:1 / -1!important}#page-workspace-projects.active.pst-ux-projects .pst-pm-actions{grid-column:2!important;grid-row:1!important}#page-workspace-project.active.pst-ux-project .pst-ux-project-context{grid-template-columns:1fr!important}#page-workspace-project.active.pst-ux-project .pst-ux-project-utils{justify-content:flex-start!important}}
`;
  document.head.appendChild(s);
}

var scheduleTimer=null;
function schedule(){if(scheduleTimer)clearTimeout(scheduleTimer);[0,80,220,650].forEach(function(ms){setTimeout(apply,ms);});scheduleTimer=setTimeout(function(){scheduleTimer=null;},700);}
css();document.addEventListener('pst:modules-ready',schedule,{once:true});document.addEventListener('pst:visual-ready',schedule,{once:true});
document.addEventListener('click',function(e){
  var commercial=e.target&&e.target.closest?e.target.closest('[data-pst-ux-commercial]'):null;if(commercial){e.preventDefault();e.stopImmediatePropagation();projectCommercial();setTimeout(schedule,0);return;}
  var row=e.target&&e.target.closest?e.target.closest('#page-workspace-projects.active .pst-pm-row'):null;if(row&&!e.target.closest('button,a,input,select,textarea,[role="button"]')&&!e.target.closest('.pst-pm-main')){e.preventDefault();openProjectRow(row);return;}
  var t=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[data-pm-filter],[data-pm-view],[data-pm-open],[data-pm-more],[data-pws-work],[data-pcm-business],[data-pcm-refresh],[data-pcm-classic],[data-pwf-area],[data-pwf-stage],[data-pwf-action],[data-pf2-tab],[data-pf2-action],[onclick*="finSwitchTab"],[onclick*="finShowHub"],.pst-kek-btn,.pst-kek-filter'):null;if(t)setTimeout(schedule,0);
},true);
document.addEventListener('keydown',function(e){var row=e.target&&e.target.closest?e.target.closest('#page-workspace-projects.active .pst-pm-row'):null;if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openProjectRow(row);}},true);
if(document.readyState!=='loading')schedule();
window.PSTDailyZonesCleanupV1=window.PSTDailyZonesCleanupV2=window.PSTDailyZonesCleanupV3={apply:apply,schedule:schedule,cleanPartners:cleanPartners,cleanHome:cleanHome,cleanProjectsList:cleanProjectsList,cleanProjectSummary:cleanProjectSummary,cleanFilesAndCommunication:cleanFilesAndCommunication,cleanSystemLabels:cleanSystemLabels,systemHealth:systemHealth,financeDaily:financeDaily,opportunitiesDaily:opportunitiesDaily};
})();