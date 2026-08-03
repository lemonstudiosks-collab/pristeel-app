/* PRISTEEL calm operational homepage */
(function(){
'use strict';
if(window.__pstDashboardCalmLoaded)return;
window.__pstDashboardCalmLoaded=true;

var C={red:'#A64B42',redBg:'#F9ECEA',amber:'#9B6A22',amberBg:'#FAF2E3',green:'#2F7657',greenBg:'#EAF5EF',blue:'#3D6F8E',blueBg:'#EAF2F7',violet:'#6B5B95',violetBg:'#F0EDF7'};
var I={
  inbox:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  refresh:'<svg viewBox="0 0 24 24"><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 1-2-5"/></svg>',
  doc:'<svg viewBox="0 0 24 24"><path d="M6 2h9l4 4v16H6z"/><path d="M15 2v5h4M9 12h7M9 16h7"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  arrow:'<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  money:'<svg viewBox="0 0 24 24"><path d="M4 7h16v12H4z"/><path d="M4 10h16M8 15h3"/></svg>',
  project:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4h8v2"/></svg>',
  mail:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>'
};

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function arr(v){return Array.isArray(v)?v:[];}
function num(v){var n=parseFloat(v);return isFinite(n)?n:0;}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function today(){var d=new Date();d.setHours(0,0,0,0);return d;}
function relDays(v){var d=safeDate(v);if(!d)return null;d.setHours(0,0,0,0);return Math.round((d-today())/86400000);}
function since(v){var d=safeDate(v);return d?Math.max(0,Math.floor((Date.now()-d.getTime())/86400000)):null;}
function dateLabel(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'}):'Pa afat';}
function money(v){return num(v).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:0})+' €';}
function greet(){var h=new Date().getHours();return h<12?'Mirëmëngjes':h<18?'Mirëdita':'Mirëmbrëma';}
function activeProject(p){var s=String((p&&p.status)||'').toLowerCase();return ['mbyllur','fituar','humbur','arkivuar','closedwon','closedlost','cancelled'].indexOf(s)<0;}
function stageName(id){return({rfq_in:'Kërkesa e klientit',technical_review:'Verifikimi teknik',supplier_selection:'Zgjedhja e prodhuesit',pricing:'Përcaktimi i çmimit',client_offer:'Oferta & konfirmimi',commercial:'Përpunimi komercial',production_control:'Koordinimi i prodhimit',factory_audit:'Auditimi i uzinës',transport:'Transporti & dërgesa'})[id]||'Në pritje';}
function setBadge(id,v){var e=document.getElementById(id);if(!e)return;e.textContent=String(v||0);e.style.display=v?'inline-flex':'none';}
function go(page){if(window.pstV2Go)window.pstV2Go(page);else if(window.showPage)window.showPage(page);}
function skeleton(){return '<div class="pst-calm-skel"></div><div class="pst-calm-skel short"></div><div class="pst-calm-skel"></div>';}

function addStyle(){
  if(document.getElementById('pst-dashboard-calm-style'))return;
  var s=document.createElement('style');s.id='pst-dashboard-calm-style';s.textContent=`
#page-home #ppd-dash,#page-home #pst-focus-tabs,#page-home #pst-focus-summary{display:none!important}
.pst-calm{max-width:1260px;margin:0 auto}.pst-calm-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:18px}.pst-calm-eyebrow{font-size:9px;text-transform:uppercase;letter-spacing:1.35px;color:#92979c;font-weight:760;margin-bottom:5px}.pst-calm-title{font-size:25px;line-height:1.15;font-weight:750;letter-spacing:-.5px;color:#202326}.pst-calm-sub{font-size:11.5px;color:#777e84;margin-top:6px}.pst-calm-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.pst-calm-btn{height:36px;border:1px solid #e1e5e7;border-radius:9px;background:#fff;color:#535a60;padding:0 12px;display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:680;cursor:pointer}.pst-calm-btn:hover{background:#f7f8f8}.pst-calm-btn.primary{background:#2b67ad;border-color:#2b67ad;color:#fff}.pst-calm-btn.project{background:#a65f2e;border-color:#a65f2e;color:#fff}.pst-calm-btn:disabled{opacity:.55;cursor:wait}.pst-calm-btn svg,.pst-calm-signal-icon svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.pst-calm-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(330px,.75fr);gap:16px;align-items:start}.pst-calm-card{background:#fff;border:1px solid #e6e8ea;border-radius:14px;overflow:hidden}.pst-calm-card-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;border-bottom:1px solid #eceeef}.pst-calm-step{display:flex;align-items:center;gap:9px}.pst-calm-number{width:24px;height:24px;border-radius:8px;background:#f0f2f3;color:#626970;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800}.pst-calm-card-title{font-size:12px;font-weight:750;color:#303438}.pst-calm-card-sub{font-size:9.5px;color:#92979c;margin-top:2px}.pst-calm-link{border:0;background:transparent;color:#a65f2e;font-size:9.5px;font-weight:720;cursor:pointer}.pst-calm-body{padding:7px 9px 10px}.pst-calm-empty{padding:28px 14px;text-align:center;color:#92979c;font-size:10.5px}.pst-calm-skel{height:38px;border-radius:9px;margin:7px;background:linear-gradient(90deg,#f1f3f4 25%,#f8f9f9 50%,#f1f3f4 75%);background-size:200% 100%;animation:pstCalmPulse 1.2s infinite}.pst-calm-skel.short{width:72%}@keyframes pstCalmPulse{to{background-position:-200% 0}}
.pst-calm .pst-action{display:flex;align-items:center;gap:10px;padding:12px 9px;border-radius:10px;cursor:pointer}.pst-calm .pst-action:hover{background:#f7f8f8}.pst-calm .pst-action-dot{width:8px;height:8px;border-radius:50%;background:var(--ac);box-shadow:0 0 0 4px var(--acbg);margin-left:4px;flex-shrink:0}.pst-calm .pst-action-main{flex:1;min-width:0}.pst-calm .pst-action-title{font-size:11.5px;font-weight:680;color:#303438;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-calm .pst-action-meta{font-size:9.5px;color:#92979c;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-calm .pst-action-tag{font-size:8px;text-transform:uppercase;letter-spacing:.35px;font-weight:780;color:var(--ac);background:var(--acbg);padding:3px 7px;border-radius:12px;white-space:nowrap}
.pst-calm-project{display:grid;grid-template-columns:minmax(0,1fr) 105px 20px;gap:9px;align-items:center;padding:11px 9px;border-radius:10px;cursor:pointer}.pst-calm-project:hover{background:#f7f8f8}.pst-calm-project-name{font-size:11px;font-weight:690;color:#303438;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-calm-project-meta{font-size:9.3px;color:#92979c;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-calm-stage{font-size:8px;font-weight:740;color:#6b5b95;background:#f0edf7;border-radius:10px;padding:4px 7px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-calm-arrow{color:#a3a8ac}.pst-calm-arrow svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2}
.pst-calm-signals{margin-top:16px}.pst-calm-signal-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:11px}.pst-calm-signal{display:flex;align-items:center;gap:10px;border:1px solid #e7e9eb;border-radius:11px;padding:11px;cursor:pointer;min-width:0}.pst-calm-signal:hover{background:#f8f9f9}.pst-calm-signal-icon{width:34px;height:34px;border-radius:10px;background:var(--sbg);color:var(--sc);display:flex;align-items:center;justify-content:center;flex-shrink:0}.pst-calm-signal-main{min-width:0}.pst-calm-signal-value{font-size:13px;font-weight:760;color:#2c3135}.pst-calm-signal-label{font-size:9.3px;color:#858c91;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-calm-allgood{padding:20px;text-align:center;color:#2f7657;font-size:10.5px}
@media(max-width:980px){.pst-calm-grid{grid-template-columns:1fr}.pst-calm-signal-grid{grid-template-columns:1fr}.pst-calm-head{align-items:flex-start;flex-direction:column}.pst-calm-actions{justify-content:flex-start}}
`;
  document.head.appendChild(s);
}

function shell(){
  var page=document.getElementById('page-home');if(!page)return null;
  page.innerHTML='<div class="pst-calm">'
    +'<div class="pst-calm-head"><div><div class="pst-calm-eyebrow">Qendra operative</div><div class="pst-calm-title">'+greet()+', PRISTEEL</div><div class="pst-calm-sub">Fillo nga kutia 1. Pjesa tjetër është vetëm kontekst.</div></div>'
    +'<div class="pst-calm-actions"><button type="button" class="pst-calm-btn" onclick="pstV2Go(\'outreach\')">'+I.inbox+'Inbox</button><button type="button" class="pst-calm-btn" id="pst-calm-refresh" onclick="return pstCalmRefresh(event)">'+I.refresh+'Rifresko</button><button type="button" class="pst-calm-btn primary" onclick="pstOpenDocumentCenter()">'+I.doc+'Dokument i ri</button><button type="button" class="pst-calm-btn project" onclick="pstV2NewProject()">'+I.plus+'Projekt i ri</button></div></div>'
    +'<div class="pst-calm-grid"><section class="pst-calm-card"><div class="pst-calm-card-hd"><div class="pst-calm-step"><span class="pst-calm-number">1</span><div><div class="pst-calm-card-title">Vepro tani</div><div class="pst-calm-card-sub">Vetëm tri çështjet me përparësinë më të lartë</div></div></div><button type="button" class="pst-calm-link" onclick="pstV2Go(\'qendra\')">Shiko të gjitha</button></div><div class="pst-calm-body" id="pst-action-list">'+skeleton()+'</div></section>'
    +'<section class="pst-calm-card"><div class="pst-calm-card-hd"><div class="pst-calm-step"><span class="pst-calm-number">2</span><div><div class="pst-calm-card-title">Projektet në fokus</div><div class="pst-calm-card-sub">Katër projektet që meritojnë shikimin e radhës</div></div></div><button type="button" class="pst-calm-link" onclick="pstV2Go(\'import\')">Projektet</button></div><div class="pst-calm-body" id="pst-project-list">'+skeleton()+'</div></section></div>'
    +'<section class="pst-calm-card pst-calm-signals"><div class="pst-calm-card-hd"><div class="pst-calm-step"><span class="pst-calm-number">3</span><div><div class="pst-calm-card-title">Sinjalet e tjera</div><div class="pst-calm-card-sub">Kontrolloji vetëm pasi të kesh parë dy kutitë sipër</div></div></div></div><div id="pst-calm-signals">'+skeleton()+'</div></section></div>';
  return page;
}

function actionRows(tasks,rfqs,projects,invoices){
  var items=[];
  arr(tasks).forEach(function(t){var d=relDays(t.due_date);if(d!==null&&d<=3)items.push({score:d<0?130:105-d,title:t.title||'Detyrë',meta:d<0?Math.abs(d)+' ditë vonë':d===0?'Afati sot':'Afati pas '+d+' ditësh',tag:d<0?'Vonuar':'Detyrë',c:d<0?C.red:C.amber,bg:d<0?C.redBg:C.amberBg,go:"pstV2Go('qendra')"});});
  arr(invoices).forEach(function(iv){var d=relDays(iv.due_date);if(d!==null&&d<=5)items.push({score:d<0?125:92-d,title:'Fatura '+(iv.invoice_nr||'pa numër'),meta:(iv.client||'Pa klient')+' · '+(d<0?Math.abs(d)+' ditë vonë':'afati '+dateLabel(iv.due_date))+' · '+money(iv.gross_amount||iv.total_price),tag:'Financa',c:C.red,bg:C.redBg,go:"pstV2Go('finance')"});});
  arr(rfqs).forEach(function(r){if(['replied','won','lost','planned'].indexOf(String(r.status||'').toLowerCase())>-1)return;var sent=safeDate(r.last_followup_at||r.sent_at),age=sent?Math.floor((Date.now()-sent.getTime())/86400000):0;if(age>=5)items.push({score:88+Math.min(age,20),title:'Ndjekje: '+(r.supplier_name||r.supplier_email||'Furnitor'),meta:(r.project_name||'Pa projekt')+' · '+age+' ditë pa përgjigje',tag:'RFQ',c:C.blue,bg:C.blueBg,go:"pstV2Go('rfq')"});});
  arr(projects).forEach(function(p){var d=relDays(p.deadline);if(activeProject(p)&&d!==null&&d<=7)items.push({score:d<0?118:82-d,title:p.name||'Projekt',meta:(p.client||'Pa klient')+' · '+(d<0?Math.abs(d)+' ditë vonë':'afati '+dateLabel(p.deadline)),tag:'Afat',c:C.violet,bg:C.violetBg,go:"pstV2OpenProject('"+String(p.id).replace(/'/g,"\\'")+"')"});});
  items.sort(function(a,b){return b.score-a.score;});items=items.slice(0,3);
  var el=document.getElementById('pst-action-list');if(!el)return;
  el.innerHTML=items.length?items.map(function(x){return '<div class="pst-action" style="--ac:'+x.c+';--acbg:'+x.bg+'" onclick="'+x.go+'"><span class="pst-action-dot"></span><div class="pst-action-main"><div class="pst-action-title">'+esc(x.title)+'</div><div class="pst-action-meta">'+esc(x.meta)+'</div></div><span class="pst-action-tag">'+esc(x.tag)+'</span></div>';}).join(''):'<div class="pst-calm-empty">Nuk ka çështje urgjente tani.</div>';
}

function projectRows(projects){
  var list=arr(projects).filter(activeProject).sort(function(a,b){var da=relDays(a.deadline),db=relDays(b.deadline);if(da!==null&&db!==null)return da-db;if(da!==null)return-1;if(db!==null)return 1;return (since(b.updated_at||b.created_at)||0)-(since(a.updated_at||a.created_at)||0);}).slice(0,4);
  var el=document.getElementById('pst-project-list');if(!el)return;
  el.innerHTML=list.length?list.map(function(p){var age=since(p.last_activity_at||p.last_email_at||p.updated_at||p.created_at),meta=(p.client||'Pa klient')+' · '+(p.deadline?'afati '+dateLabel(p.deadline):(age===null?'pa aktivitet':age+' ditë pa aktivitet'));return '<div class="pst-calm-project" onclick="pstV2OpenProject(\''+esc(p.id)+'\')"><div><div class="pst-calm-project-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-calm-project-meta">'+esc(meta)+'</div></div><span class="pst-calm-stage">'+esc(stageName(p.pipeline_stage))+'</span><span class="pst-calm-arrow">'+I.arrow+'</span></div>';}).join(''):'<div class="pst-calm-empty">Nuk ka projekte aktive.</div>';
}

function signalRows(emails,rfqs,invoices){
  var waiting=arr(rfqs).filter(function(r){return ['replied','won','lost','planned'].indexOf(String(r.status||'').toLowerCase())<0;});
  var overdue=arr(invoices).filter(function(iv){var d=relDays(iv.due_date);return d!==null&&d<0;});
  var total=overdue.reduce(function(s,iv){return s+num(iv.gross_amount||iv.total_price);},0);
  var signals=[];
  if(overdue.length)signals.push({value:overdue.length+' · '+money(total),label:'fatura të vonuara',c:C.red,bg:C.redBg,icon:I.money,go:"pstV2Go('finance')"});
  if(emails.length)signals.push({value:String(emails.length),label:'emaila pa projekt',c:C.amber,bg:C.amberBg,icon:I.mail,go:"pstV2Go('outreach')"});
  if(waiting.length)signals.push({value:String(waiting.length),label:'RFQ pa përgjigje',c:C.blue,bg:C.blueBg,icon:I.inbox,go:"pstV2Go('rfq')"});
  var el=document.getElementById('pst-calm-signals');if(!el)return;
  el.innerHTML=signals.length?'<div class="pst-calm-signal-grid">'+signals.slice(0,3).map(function(x){return '<div class="pst-calm-signal" onclick="'+x.go+'"><span class="pst-calm-signal-icon" style="--sc:'+x.c+';--sbg:'+x.bg+'">'+x.icon+'</span><div class="pst-calm-signal-main"><div class="pst-calm-signal-value">'+esc(x.value)+'</div><div class="pst-calm-signal-label">'+esc(x.label)+'</div></div></div>';}).join('')+'</div>':'<div class="pst-calm-allgood">Nuk ka sinjale të tjera urgjente.</div>';
}

async function render(){
  addStyle();shell();
  if(typeof window.supaFetch!=='function'){setTimeout(render,600);return;}
  try{
    var out=await Promise.all([
      window.supaFetch('tasks?status=eq.hapur&select=*&order=due_date.asc&limit=80').catch(function(){return[];}),
      window.supaFetch('projects?select=*&order=created_at.desc&limit=160').catch(function(){return[];}),
      window.supaFetch('project_emails?project_id=is.null&select=*&order=sent_at.desc&limit=80').catch(function(){return[];}),
      window.supaFetch('rfq_log?select=*&order=sent_at.desc&limit=180').catch(function(){return[];}),
      window.supaFetch('invoices_out?paid=eq.false&select=*&order=due_date.asc&limit=100').catch(function(){return[];})
    ]);
    var tasks=arr(out[0]),projects=arr(out[1]),emails=arr(out[2]),rfqs=arr(out[3]),invoices=arr(out[4]);
    actionRows(tasks,rfqs,projects,invoices);projectRows(projects);signalRows(emails,rfqs,invoices);
    setBadge('pst-nav-inbox-count',emails.length);setBadge('pst-nav-project-count',projects.filter(activeProject).length);setBadge('pst-nav-task-count',tasks.filter(function(t){var d=relDays(t.due_date);return d!==null&&d<=0;}).length);
    window.dispatchEvent(new CustomEvent('pst-dashboard-rendered'));
  }catch(e){['pst-action-list','pst-project-list','pst-calm-signals'].forEach(function(id){var el=document.getElementById(id);if(el)el.innerHTML='<div class="pst-calm-empty">Të dhënat nuk u ngarkuan. Kliko Rifresko.</div>';});console.error('PRISTEEL calm dashboard:',e);}
}

window.pstCalmRefresh=function(event){
  if(event){event.preventDefault();event.stopPropagation();}
  var btn=document.getElementById('pst-calm-refresh');if(btn){btn.disabled=true;btn.innerHTML=I.refresh+'Duke rifreskuar…';}
  Promise.resolve(render()).finally(function(){setTimeout(function(){var b=document.getElementById('pst-calm-refresh');if(b){b.disabled=false;b.innerHTML=I.refresh+'Rifresko';}},350);});
  return false;
};
window.pstDashboardCalmRender=render;
window.pstOperationalHomeRender=render;
window.pstV2RenderDashboard=render;
window.pstV2Refresh=render;
window.renderHome=render;

function wrapHome(){
  if(typeof window.goHome==='function'&&!window.goHome.__pstCalm){var old=window.goHome;var w=function(){var r=old.apply(this,arguments);setTimeout(render,40);return r;};w.__pstCalm=true;window.goHome=w;}
}
function start(){addStyle();wrapHome();var active=document.querySelector('.page.active');if(active&&active.id==='page-home')render();var n=0,t=setInterval(function(){wrapHome();if(++n>100)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
