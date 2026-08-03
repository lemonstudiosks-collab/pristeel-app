/* PRISTEEL operational homepage v3 */
(function(){
'use strict';
if(window.__pstOperationalHomeLoaded)return;
window.__pstOperationalHomeLoaded=true;

var C={
  bronze:'#A65F2E',bronzeBg:'#F7EDE5',green:'#2F7657',greenBg:'#EAF5EF',
  blue:'#3D6F8E',blueBg:'#EAF2F7',violet:'#6B5B95',violetBg:'#F0EDF7',
  amber:'#9B6A22',amberBg:'#FAF2E3',red:'#A64B42',redBg:'#F9ECEA',slate:'#5D6872',slateBg:'#EDF1F3'
};
var I={
  doc:'<svg viewBox="0 0 24 24"><path d="M6 2h9l4 4v16H6z"/><path d="M15 2v5h4M9 12h7M9 16h7"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  inbox:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  refresh:'<svg viewBox="0 0 24 24"><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 1-2-5"/></svg>',
  project:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4h8v2"/></svg>',
  money:'<svg viewBox="0 0 24 24"><path d="M4 7h16v12H4z"/><path d="M4 10h16M8 15h3"/></svg>',
  clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  arrow:'<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  grid:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  procurement:'<svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.5a2 2 0 0 0 2 1.5h8.7a2 2 0 0 0 2-1.5L21 8H7"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>',
  contacts:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-7 6-7s6 3 6 7M16 8h5M18.5 5.5v5"/></svg>',
  calc:'<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/></svg>',
  settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.5 3.1h5l.5-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z"/></svg>'
};

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function arr(v){return Array.isArray(v)?v:[];}
function num(v){var n=parseFloat(v);return isFinite(n)?n:0;}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function dayStart(){var d=new Date();d.setHours(0,0,0,0);return d;}
function relDays(v){var d=safeDate(v);if(!d)return null;d.setHours(0,0,0,0);return Math.round((d-dayStart())/86400000);}
function dateLabel(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'}):'Pa afat';}
function fullDate(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'';}
function money(v){return num(v).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:0})+' €';}
function greet(){var h=new Date().getHours();return h<12?'Mirëmëngjes':h<18?'Mirëdita':'Mirëmbrëma';}
function activeProject(p){var s=String((p&&p.status)||'').toLowerCase();return ['mbyllur','fituar','humbur','arkivuar','closedwon','closedlost','cancelled'].indexOf(s)<0;}
function setBadge(id,v){var e=document.getElementById(id);if(!e)return;e.textContent=String(v||0);e.style.display=v?'inline-flex':'none';}
function stageName(id){var m={rfq_in:'Kërkesa e klientit',technical_review:'Verifikimi teknik',supplier_selection:'Zgjedhja e prodhuesit',pricing:'Përcaktimi i çmimit',client_offer:'Oferta & konfirmimi',commercial:'Përpunimi komercial',production_control:'Koordinimi i prodhimit',factory_audit:'Auditimi i uzinës',transport:'Transporti & dërgesa'};return m[id]||'Në pritje';}
function lastActivity(p){return safeDate(p.last_activity_at||p.last_email_at||p.updated_at||p.created_at);}
function daysSince(v){var d=safeDate(v);if(!d)return null;return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));}
function dueDateForInvoice(iv){var d=safeDate(iv.due_date);if(d)return d;d=safeDate(iv.date);if(!d)return null;var m=String(iv.payment_terms||'').match(/(\d{1,3})/);d.setDate(d.getDate()+(m?parseInt(m[1],10):30));return d;}
function invoiceDays(iv){var d=dueDateForInvoice(iv);if(!d)return null;d.setHours(0,0,0,0);return Math.round((d-dayStart())/86400000);}
function skeleton(){return '<div class="pst-op-skel"></div><div class="pst-op-skel short"></div><div class="pst-op-skel"></div>';}
function go(page){if(window.pstV2Go)window.pstV2Go(page);else if(window.showPage)window.showPage(page);}

function addStyle(){
  if(document.getElementById('pst-operational-home-style'))return;
  var old=document.getElementById('pst-dashboard-focus-style');if(old)old.remove();
  var s=document.createElement('style');s.id='pst-operational-home-style';s.textContent=`
#page-home #pst-focus-tabs,#page-home #pst-focus-summary{display:none!important}
#page-home #pst-new-offer-shortcut,#page-home #pst-new-invoice-shortcut{display:none!important}
.pst-op{max-width:1420px;margin:0 auto}.pst-op-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:14px}.pst-op-eyebrow{font-size:9px;text-transform:uppercase;letter-spacing:1.4px;color:#92979c;font-weight:760;margin-bottom:5px}.pst-op-title{font-size:25px;line-height:1.15;font-weight:750;letter-spacing:-.5px;color:#202326}.pst-op-sub{font-size:11.5px;color:#777e84;margin-top:6px}.pst-op-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.pst-op-btn{height:36px;border:1px solid #e2e5e7;border-radius:9px;background:#fff;color:#535a60;padding:0 12px;display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:670;cursor:pointer}.pst-op-btn:hover{background:#f8f9f9;border-color:#d4d9dc}.pst-op-btn.primary{background:#2b67ad;color:#fff;border-color:#2b67ad}.pst-op-btn.project{background:#a65f2e;color:#fff;border-color:#a65f2e}.pst-op-btn svg,.pst-op-module svg,.pst-op-icon svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.pst-op-summary{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 14px}.pst-op-chip{display:flex;align-items:center;gap:7px;border:1px solid #e6e8ea;background:#fff;border-radius:10px;padding:8px 11px;cursor:pointer;min-width:142px}.pst-op-chip:hover{background:#fafbfb}.pst-op-dot{width:8px;height:8px;border-radius:50%;background:var(--dot);box-shadow:0 0 0 4px var(--dotbg)}.pst-op-chip strong{font-size:14px;color:#24282b;line-height:1}.pst-op-chip span{font-size:9.5px;color:#777e84}.pst-op-total{margin-left:auto;font-size:9.5px;color:#8b9196;padding:0 4px}
.pst-op-main{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(330px,.85fr);gap:16px;align-items:start}.pst-op-lower{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}.pst-op-panel{background:#fff;border:1px solid #e6e8ea;border-radius:13px;overflow:hidden;margin-bottom:16px}.pst-op-panel-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 15px;border-bottom:1px solid #eceeef}.pst-op-panel-title{font-size:11.5px;font-weight:740;color:#303438}.pst-op-panel-sub{font-size:9.5px;color:#92979c;margin-top:2px}.pst-op-link{border:0;background:transparent;color:#a65f2e;font-size:10px;font-weight:700;cursor:pointer}.pst-op-body{padding:6px 8px 9px}.pst-op-empty{padding:24px 14px;text-align:center;color:#92979c;font-size:10.5px}.pst-op-skel{height:36px;border-radius:8px;background:linear-gradient(90deg,#f1f3f4 25%,#f7f8f8 50%,#f1f3f4 75%);background-size:200% 100%;animation:pstOpPulse 1.2s infinite;margin:7px}.pst-op-skel.short{width:72%}@keyframes pstOpPulse{to{background-position:-200% 0}}
.pst-op .pst-action{display:flex;align-items:center;gap:10px;padding:10px 8px;border-radius:9px;cursor:pointer}.pst-op .pst-action:hover{background:#f7f8f8}.pst-op .pst-action-dot{width:8px;height:8px;border-radius:50%;background:var(--ac);box-shadow:0 0 0 4px var(--acbg);flex-shrink:0;margin-left:4px}.pst-op .pst-action-main{flex:1;min-width:0}.pst-op .pst-action-title{font-size:11px;font-weight:660;color:#303438;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-op .pst-action-meta{font-size:9.5px;color:#92979c;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-op .pst-action-tag{font-size:8.5px;text-transform:uppercase;letter-spacing:.35px;font-weight:760;color:var(--ac);background:var(--acbg);padding:3px 7px;border-radius:12px;white-space:nowrap}
.pst-op-project{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(125px,.7fr) 95px 22px;align-items:center;gap:10px;padding:10px 9px;border-radius:9px;cursor:pointer}.pst-op-project:hover{background:#f7f8f8}.pst-op-project-name{font-size:11px;font-weight:690;color:#2e3235;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-op-project-meta{font-size:9.4px;color:#92979c;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-op-stage{font-size:8.5px;font-weight:720;color:#6b5b95;background:#f0edf7;padding:4px 7px;border-radius:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-op-stale{font-size:9px;color:#777e84;text-align:right}.pst-op-arrow{color:#a3a8ac}.pst-op-arrow svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2}
.pst-op-fin{display:flex;align-items:center;gap:10px;padding:10px 9px;border-radius:9px;cursor:pointer}.pst-op-fin:hover{background:#f7f8f8}.pst-op-icon{width:34px;height:34px;border-radius:10px;background:var(--ibg);color:var(--ic);display:flex;align-items:center;justify-content:center;flex-shrink:0}.pst-op-fin-main{flex:1;min-width:0}.pst-op-fin-title{font-size:10.8px;font-weight:680;color:#303438;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-op-fin-meta{font-size:9.3px;color:#92979c;margin-top:2px}.pst-op-fin-value{font-size:10.5px;font-weight:720;color:#303438;white-space:nowrap}
.pst-op-mail{display:flex;align-items:center;gap:9px;padding:9px;border-radius:9px}.pst-op-mail:hover{background:#f7f8f8}.pst-op-avatar{width:30px;height:30px;border-radius:9px;background:#eaf2f7;color:#3d6f8e;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:760;flex-shrink:0}.pst-op-mail-main{flex:1;min-width:0}.pst-op-mail-title{font-size:10.5px;font-weight:650;color:#303438;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-op-mail-meta{font-size:9.2px;color:#92979c;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-op-open{border:1px solid #dfe3e6;background:#fff;border-radius:7px;padding:4px 8px;font-size:9px;font-weight:680;color:#596067;cursor:pointer}
.pst-op-modules{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}.pst-op-module{border:1px solid #e4e7e9;background:#fff;border-radius:11px;padding:10px 9px;min-height:66px;display:flex;flex-direction:column;justify-content:center;gap:6px;cursor:pointer;color:#596067}.pst-op-module:hover{background:#f8f9f9;border-color:#d7dcdf}.pst-op-module b{font-size:9.5px;color:#303438}.pst-op-module span{font-size:8.5px;color:#92979c}.pst-op-module svg{color:var(--mc)}
#page-all-modules{max-width:1420px;margin:0 auto}.pst-mod-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:18px}.pst-mod-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.pst-mod-card{border:1px solid #e4e7e9;background:#fff;border-radius:15px;padding:24px 20px;min-height:145px;cursor:pointer;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:9px}.pst-mod-card:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(25,30,35,.06)}.pst-mod-card .pst-op-icon{width:44px;height:44px}.pst-mod-card b{font-size:14px;color:#292d30}.pst-mod-card span{font-size:10px;color:#8b9196}
@media(max-width:1100px){.pst-op-main{grid-template-columns:1fr}.pst-op-lower{grid-template-columns:1fr}.pst-op-modules{grid-template-columns:repeat(4,minmax(0,1fr))}.pst-mod-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:720px){.pst-op-head{align-items:flex-start;flex-direction:column}.pst-op-actions{justify-content:flex-start}.pst-op-summary{display:grid;grid-template-columns:1fr 1fr}.pst-op-total{grid-column:1/-1;margin-left:0}.pst-op-project{grid-template-columns:1fr 22px}.pst-op-stage,.pst-op-stale{display:none}.pst-op-modules{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-mod-grid{grid-template-columns:1fr}.pst-op .pst-action{align-items:flex-start}.pst-op .pst-action-tag{display:none}}
`;
  document.head.appendChild(s);
}

function shell(){
  var page=document.getElementById('page-home');if(!page)return null;
  page.innerHTML='<div class="pst-op pst-dash">'
    +'<div class="pst-op-head"><div><div class="pst-op-eyebrow">Qendra operative</div><div class="pst-op-title">'+greet()+', PRISTEEL</div><div class="pst-op-sub">'+new Date().toLocaleDateString('sq-AL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · gjërat që kërkojnë vendim ose veprim</div></div>'
    +'<div class="pst-op-actions pst-dash-actions"><button class="pst-op-btn" onclick="pstV2Go(\'outreach\')">'+I.inbox+'Inbox</button><button class="pst-op-btn" onclick="pstOperationalHomeRender()">'+I.refresh+'Rifresko</button><button class="pst-op-btn primary" id="pst-document-center-shortcut" onclick="pstOpenDocumentCenter()">'+I.doc+'Dokument i ri</button><button class="pst-op-btn project" onclick="pstV2NewProject()">'+I.plus+'Projekt i ri</button></div></div>'
    +'<div class="pst-op-summary"><div class="pst-op-chip" onclick="pstV2Go(\'import\')"><i class="pst-op-dot" style="--dot:'+C.green+';--dotbg:'+C.greenBg+'"></i><strong id="pst-kpi-projects">…</strong><span>projekte aktive</span></div><div class="pst-op-chip" onclick="pstV2Go(\'outreach\')"><i class="pst-op-dot" style="--dot:'+C.amber+';--dotbg:'+C.amberBg+'"></i><strong id="pst-kpi-unmatched">…</strong><span>emaila pa projekt</span></div><div class="pst-op-chip" onclick="pstV2Go(\'qendra\')"><i class="pst-op-dot" style="--dot:'+C.red+';--dotbg:'+C.redBg+'"></i><strong id="pst-kpi-tasks">…</strong><span>detyrat sot/vonë</span></div><div class="pst-op-chip" onclick="pstV2Go(\'rfq\')"><i class="pst-op-dot" style="--dot:'+C.blue+';--dotbg:'+C.blueBg+'"></i><strong id="pst-kpi-rfqs">…</strong><span>RFQ pa përgjigje</span></div><div class="pst-op-total"><span id="pst-op-unpaid-count">…</span> fatura të papaguara</div></div>'
    +'<div class="pst-op-main"><div><section class="pst-op-panel"><div class="pst-op-panel-hd"><div><div class="pst-op-panel-title">Çfarë kërkon veprim tani</div><div class="pst-op-panel-sub">Maksimumi shtatë veprime, të renditura sipas urgjencës</div></div><button class="pst-op-link" onclick="pstV2Go(\'qendra\')">Të gjitha</button></div><div class="pst-op-body" id="pst-action-list">'+skeleton()+'</div></section><section class="pst-op-panel"><div class="pst-op-panel-hd"><div><div class="pst-op-panel-title">Projektet në lëvizje</div><div class="pst-op-panel-sub">Faza aktuale, afati dhe koha nga aktiviteti i fundit</div></div><button class="pst-op-link" onclick="pstV2Go(\'import\')">Hap projektet</button></div><div class="pst-op-body" id="pst-project-list">'+skeleton()+'</div></section></div>'
    +'<div><section class="pst-op-panel"><div class="pst-op-panel-hd"><div><div class="pst-op-panel-title">Financat për vëmendje</div><div class="pst-op-panel-sub">Vetëm faturat dhe garancitë që kërkojnë reagim</div></div><button class="pst-op-link" onclick="pstV2Go(\'finance\')">Hap financat</button></div><div class="pst-op-body" id="pst-op-finance">'+skeleton()+'</div></section><section class="pst-op-panel"><div class="pst-op-panel-hd"><div><div class="pst-op-panel-title">Inbox & mundësitë</div><div class="pst-op-panel-sub">Komunikime të palidhura dhe kërkesa të reja</div></div><button class="pst-op-link" onclick="pstV2Go(\'outreach\')">Analizo</button></div><div class="pst-op-body" id="pst-email-list">'+skeleton()+'</div></section></div></div>'
    +'<section class="pst-op-panel"><div class="pst-op-panel-hd"><div><div class="pst-op-panel-title">Shkurtoret</div><div class="pst-op-panel-sub">Hyrje e shpejtë në modulet e përdorura më shpesh</div></div><button class="pst-op-link" onclick="pstOpenAllModules()">Të gjitha modulet</button></div><div class="pst-op-body"><div class="pst-op-modules" id="pst-op-modules"></div></div></section></div>';
  return page;
}

function moduleCards(){
  var host=document.getElementById('pst-op-modules');if(!host)return;
  var list=[
    ['Projektet','Pipeline & dosjet','import',I.project,C.green],
    ['Prokurimi','BOM, RFQ, çmime','bom',I.procurement,C.bronze],
    ['Dokumentet','Oferta, fatura, nota','documents',I.doc,C.blue],
    ['Financat','Fatura & garanci','finance',I.money,C.green],
    ['Kontaktet','Klientë & furnitorë','contacts',I.contacts,C.violet],
    ['Kalkulatori','Çmimi €/kg','kalkulator',I.calc,C.violet],
    ['Të gjitha','Pamja e moduleve','all',I.grid,C.slate]
  ];
  host.innerHTML=list.map(function(x){var click=x[2]==='documents'?"pstOpenDocumentCenter()":x[2]==='all'?"pstOpenAllModules()":"pstV2Go('"+x[2]+"')";return '<button class="pst-op-module" style="--mc:'+x[4]+'" onclick="'+click+'">'+x[3]+'<b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span></button>';}).join('');
}

function actionRows(tasks,emails,rfqs,projects,invoices){
  var now=new Date(),items=[];
  arr(tasks).forEach(function(t){var d=relDays(t.due_date);if(d!==null&&d<=3)items.push({score:d<0?120:100-d,title:t.title||'Detyrë',meta:(d<0?Math.abs(d)+' ditë vonë':d===0?'Afati sot':'Afati pas '+d+' ditësh')+(t.detail?' · '+t.detail:''),tag:d<0?'Vonuar':'Detyrë',c:d<0?C.red:C.amber,bg:d<0?C.redBg:C.amberBg,go:"pstV2Go('qendra')"});});
  arr(invoices).forEach(function(iv){var d=invoiceDays(iv);if(d!==null&&d<0)items.push({score:115+Math.min(Math.abs(d),20),title:'Faturë e papaguar: '+(iv.invoice_nr||iv.client||'Faturë'),meta:(iv.client||'Pa klient')+' · '+Math.abs(d)+' ditë vonë · '+money(iv.gross_amount||iv.total_price),tag:'Financa',c:C.red,bg:C.redBg,go:"pstV2Go('invoices')"});});
  arr(emails).slice(0,3).forEach(function(e){items.push({score:82,title:e.subject||'(pa subjekt)',meta:(e.from_name||e.from_email||'Dërgues i panjohur')+' · email pa projekt',tag:'Inbox',c:C.blue,bg:C.blueBg,go:e.gmail_url?"pstV2OpenMail('"+String(e.gmail_url).replace(/'/g,"\\'")+"')":"pstV2Go('outreach')"});});
  arr(rfqs).forEach(function(r){if(['replied','won','lost','planned'].indexOf(String(r.status||'').toLowerCase())>-1)return;var sent=safeDate(r.last_followup_at||r.sent_at),age=sent?Math.floor((now-sent)/86400000):0;if(age>=5)items.push({score:75+Math.min(age,20),title:'Ndjekje RFQ: '+(r.supplier_name||r.supplier_email||'Furnitor'),meta:(r.project_name||'Pa projekt')+' · '+age+' ditë pa përgjigje',tag:'RFQ',c:C.bronze,bg:C.bronzeBg,go:"pstV2Go('rfq')"});});
  arr(projects).forEach(function(p){var d=relDays(p.deadline);if(activeProject(p)&&d!==null&&d>=0&&d<=10)items.push({score:70-d,title:p.name||'Projekt',meta:(p.client||'Pa klient')+' · afati '+dateLabel(p.deadline),tag:'Afat',c:C.violet,bg:C.violetBg,go:"pstV2OpenProject('"+String(p.id).replace(/'/g,"\\'")+"')"});});
  items.sort(function(a,b){return b.score-a.score;});items=items.slice(0,7);
  var el=document.getElementById('pst-action-list');if(!el)return;
  el.innerHTML=items.length?items.map(function(x){return '<div class="pst-action" style="--ac:'+x.c+';--acbg:'+x.bg+'" onclick="'+x.go+'"><span class="pst-action-dot"></span><div class="pst-action-main"><div class="pst-action-title">'+esc(x.title)+'</div><div class="pst-action-meta">'+esc(x.meta)+'</div></div><span class="pst-action-tag">'+esc(x.tag)+'</span></div>';}).join(''):'<div class="pst-op-empty">Nuk ka veprime urgjente për momentin.</div>';
}

function projectRows(projects){
  var list=arr(projects).filter(activeProject).sort(function(a,b){var da=relDays(a.deadline),db=relDays(b.deadline);var sa=daysSince(lastActivity(a)),sb=daysSince(lastActivity(b));var pa=(da!==null&&da<15?100-da:0)+(sa||0),pb=(db!==null&&db<15?100-db:0)+(sb||0);return pb-pa;}).slice(0,6);
  var el=document.getElementById('pst-project-list');if(!el)return;
  el.innerHTML=list.length?list.map(function(p){var d=relDays(p.deadline),stale=daysSince(lastActivity(p)),when=p.deadline?(d<0?Math.abs(d)+'d vonë':dateLabel(p.deadline)):'Pa afat',activity=stale===null?'Pa aktivitet':stale===0?'Sot':stale===1?'1 ditë':'Për '+stale+' ditë';return '<div class="pst-op-project" onclick="pstV2OpenProject(\''+esc(p.id)+'\')"><div><div class="pst-op-project-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-op-project-meta">'+esc(p.client||'Pa klient')+(p.ref?' · '+esc(p.ref):'')+' · '+esc(when)+'</div></div><span class="pst-op-stage">'+esc(stageName(p.pipeline_stage||'rfq_in'))+'</span><div class="pst-op-stale">'+esc(activity)+'</div><span class="pst-op-arrow">'+I.arrow+'</span></div>';}).join(''):'<div class="pst-op-empty">Nuk ka projekte aktive.</div>';
}

function financeRows(invoices,guarantees){
  var issues=[];
  arr(invoices).forEach(function(iv){var d=invoiceDays(iv);if(d===null||d<=7){issues.push({score:d===null?10:d<0?100+Math.abs(d):60-d,title:iv.client||iv.invoice_nr||'Faturë',meta:d===null?'Pa afat pagese':d<0?Math.abs(d)+' ditë vonë':'Afati pas '+d+' ditësh',value:money(iv.gross_amount||iv.total_price),c:d!==null&&d<0?C.red:C.amber,bg:d!==null&&d<0?C.redBg:C.amberBg,icon:I.money,go:"pstV2Go('invoices')"});}});
  arr(guarantees).forEach(function(g){var d=relDays(g.expiry_date);if(d!==null&&d<=30)issues.push({score:d<0?110:55-d,title:g.project||g.bank_name||'Garanci bankare',meta:d<0?'Ka skaduar para '+Math.abs(d)+' ditësh':'Skadon pas '+d+' ditësh',value:g.amount_guaranteed?money(g.amount_guaranteed):'',c:C.violet,bg:C.violetBg,icon:I.clock,go:"pstV2Go('finance')"});});
  issues.sort(function(a,b){return b.score-a.score;});issues=issues.slice(0,5);
  var el=document.getElementById('pst-op-finance');if(!el)return;
  el.innerHTML=issues.length?issues.map(function(x){return '<div class="pst-op-fin" onclick="'+x.go+'"><div class="pst-op-icon" style="--ic:'+x.c+';--ibg:'+x.bg+'">'+x.icon+'</div><div class="pst-op-fin-main"><div class="pst-op-fin-title">'+esc(x.title)+'</div><div class="pst-op-fin-meta">'+esc(x.meta)+'</div></div><div class="pst-op-fin-value">'+esc(x.value)+'</div></div>';}).join(''):'<div class="pst-op-empty" style="color:'+C.green+'">Nuk ka çështje financiare urgjente.</div>';
}

function initials(v){var p=String(v||'?').trim().split(/\s+/);return ((p[0]||'?')[0]+(p[1]?p[1][0]:'')).toUpperCase();}
function emailRows(emails,discoveryCount){
  var list=arr(emails).slice(0,5),el=document.getElementById('pst-email-list');if(!el)return;
  var intro='<div class="pst-op-fin" onclick="pstV2Go(\'outreach\')"><div class="pst-op-icon" style="--ic:'+C.amber+';--ibg:'+C.amberBg+'">'+I.search+'</div><div class="pst-op-fin-main"><div class="pst-op-fin-title">'+arr(emails).length+' emaila pa projekt</div><div class="pst-op-fin-meta">'+(discoveryCount?discoveryCount+' kërkesa presin analizë':'Kërkojnë klasifikim ose lidhje')+'</div></div><span class="pst-op-arrow">'+I.arrow+'</span></div>';
  el.innerHTML=intro+(list.length?list.map(function(e){var who=e.from_name||e.from_email||'?',url=String(e.gmail_url||'').replace(/'/g,"\\'");return '<div class="pst-op-mail"><div class="pst-op-avatar">'+esc(initials(who))+'</div><div class="pst-op-mail-main"><div class="pst-op-mail-title">'+esc(e.subject||'(pa subjekt)')+'</div><div class="pst-op-mail-meta">'+esc(who)+' · '+esc(fullDate(e.sent_at))+'</div></div><button class="pst-op-open" onclick="event.stopPropagation();'+(url?"pstV2OpenMail('"+url+"')":"pstV2Go('outreach')")+'">Hap</button></div>';}).join(''):'');
}

async function render(){
  addStyle();shell();moduleCards();
  if(typeof window.supaFetch!=='function'){setTimeout(render,700);return;}
  try{
    var in30=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
    var out=await Promise.all([
      supaFetch('tasks?status=eq.hapur&select=*&order=due_date.asc&limit=100').catch(function(){return[];}),
      supaFetch('projects?select=*&order=created_at.desc&limit=180').catch(function(){return[];}),
      supaFetch('project_emails?project_id=is.null&select=*&order=sent_at.desc&limit=50').catch(function(){return[];}),
      supaFetch('rfq_log?select=*&order=sent_at.desc&limit=180').catch(function(){return[];}),
      supaFetch('invoices_out?paid=eq.false&select=*&order=due_date.asc&limit=60').catch(function(){return[];}),
      supaFetch('bank_guarantees?status=eq.aktive&expiry_date=lte.'+in30+'&select=*&order=expiry_date.asc&limit=30').catch(function(){return[];}),
      supaFetch('offers_inbox?processed=eq.false&select=id&limit=300').catch(function(){return[];})
    ]);
    var tasks=arr(out[0]),projects=arr(out[1]),emails=arr(out[2]),rfqs=arr(out[3]),invoices=arr(out[4]),guarantees=arr(out[5]),discovery=arr(out[6]);
    var due=tasks.filter(function(t){var d=relDays(t.due_date);return d!==null&&d<=0;}).length;
    var active=projects.filter(activeProject).length;
    var waiting=rfqs.filter(function(r){return ['replied','won','lost','planned'].indexOf(String(r.status||'').toLowerCase())<0;}).length;
    document.getElementById('pst-kpi-projects').textContent=active;document.getElementById('pst-kpi-unmatched').textContent=emails.length;document.getElementById('pst-kpi-tasks').textContent=due;document.getElementById('pst-kpi-rfqs').textContent=waiting;document.getElementById('pst-op-unpaid-count').textContent=invoices.length;
    setBadge('pst-nav-inbox-count',emails.length);setBadge('pst-nav-project-count',active);setBadge('pst-nav-task-count',due);
    actionRows(tasks,emails,rfqs,projects,invoices);projectRows(projects);financeRows(invoices,guarantees);emailRows(emails,discovery.length);
    window.dispatchEvent(new CustomEvent('pst-dashboard-rendered'));
  }catch(err){['pst-action-list','pst-project-list','pst-op-finance','pst-email-list'].forEach(function(id){var e=document.getElementById(id);if(e)e.innerHTML='<div class="pst-op-empty">Nuk u ngarkuan të dhënat. Provo Rifresko.</div>';});console.error('PRISTEEL operational home:',err);}
}
window.pstOperationalHomeRender=render;
window.pstV2RenderDashboard=render;
window.pstV2Refresh=render;

function ensureAllModules(){
  var page=document.getElementById('page-all-modules');if(page)return page;
  var content=document.querySelector('.content');if(!content)return null;
  page=document.createElement('div');page.id='page-all-modules';page.className='page';page.style.display='none';
  var mods=[
    ['Detyrat','Veprimet, afatet dhe kalendari','qendra',I.clock,C.red,C.redBg],['Projektet','Projektet aktive dhe pipeline','import',I.project,C.green,C.greenBg],['Prokurimi','BOM, RFQ, oferta furnitorësh','bom',I.procurement,C.bronze,C.bronzeBg],['Dokumentet','Oferta, fatura, nota kreditore/debitore','documents',I.doc,C.blue,C.blueBg],['Financat','Faturat, garancitë dhe kostot','finance',I.money,C.green,C.greenBg],['Inbox & mundësitë','Emailat dhe kërkesat e reja','outreach',I.inbox,C.amber,C.amberBg],['Kontaktet','Klientët dhe furnitorët','contacts',I.contacts,C.violet,C.violetBg],['Kalkulatori','Llogaritja e çmimit për kilogram','kalkulator',I.calc,C.violet,C.violetBg],['Cilësimet','Firma, integrimet dhe backup','settings',I.settings,C.slate,C.slateBg]
  ];
  page.innerHTML='<div class="pst-mod-head"><div><div class="pst-op-eyebrow">Navigimi</div><div class="pst-op-title">Të gjitha modulet</div><div class="pst-op-sub">Pamje e qetë për të zgjedhur zonën e punës</div></div><button class="pst-op-btn" onclick="pstV2Go(\'home\')">Mbyll</button></div><div class="pst-mod-grid">'+mods.map(function(x){var click=x[2]==='documents'?"pstOpenDocumentCenter()":"pstV2Go('"+x[2]+"')";return '<button class="pst-mod-card" onclick="'+click+'"><div class="pst-op-icon" style="--ic:'+x[4]+';--ibg:'+x[5]+'">'+x[3]+'</div><b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span></button>';}).join('')+'</div>';
  content.appendChild(page);return page;
}
window.pstOpenAllModules=function(){var p=ensureAllModules();if(!p)return;document.querySelectorAll('.page').forEach(function(x){x.classList.remove('active');x.style.display='none';});p.style.display='block';p.classList.add('active');var a=document.getElementById('page-title'),b=document.getElementById('page-sub');if(a)a.textContent='Të gjitha modulet';if(b)b.textContent='Zgjidh zonën e punës';window.scrollTo({top:0,behavior:'smooth'});};

function wrapHome(){
  if(typeof window.goHome==='function'&&!window.goHome.__pstOperational){var old=window.goHome;var w=function(){var r=old.apply(this,arguments);setTimeout(render,0);return r;};w.__pstOperational=true;window.goHome=w;}
  window.renderHome=render;
}
function start(){addStyle();ensureAllModules();wrapHome();var a=document.querySelector('.page.active');if(a&&a.id==='page-home')render();var tries=0,t=setInterval(function(){wrapHome();if(++tries>80)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
