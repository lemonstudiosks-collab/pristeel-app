/* PRISTEEL modern project register
 * Hybrid row-card list + board view. Uses existing project records and workspace open flow.
 */
(function(){
'use strict';
if(window.__pstProjectsModernV1)return;
window.__pstProjectsModernV1=true;

var BRAND='#5B9BB3',BRAND_DEEP='#3F7F98',BRAND_PALE='#EAF5F8';
var GREEN='#2F7657',GREEN_BG='#EAF5EF',GREEN_STRONG='#1E684A';
var AMBER='#9B6A22',AMBER_BG='#FAF2E3',RED='#A64B42',RED_BG='#F9ECEA',GREY='#68747B',GREY_BG='#EEF2F4';
var STAGES=[
  {id:'rfq_in',name:'Kërkesë'},
  {id:'technical_review',name:'Në analizë'},
  {id:'supplier_selection',name:'Prodhuesi'},
  {id:'pricing',name:'Çmimi'},
  {id:'client_offer',name:'Ofertë'},
  {id:'commercial',name:'Në pritje'},
  {id:'production_control',name:'Prodhim'},
  {id:'factory_audit',name:'Auditim'},
  {id:'transport',name:'Dorëzim'}
];
var state={rows:[],filter:'active',search:'',sort:'activity',view:'list',loading:false};
var baseGo=window.pstWorkspaceGo;

function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function dateText(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'Pa afat';}
function daysSince(v){var d=safeDate(v);return d===null?null:Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));}
function stageInfo(id){for(var i=0;i<STAGES.length;i++)if(STAGES[i].id===id)return STAGES[i];return STAGES[0];}
function setNav(){document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')==='projects');});}
function ensurePage(){
  var p=document.getElementById('page-workspace-projects');
  if(!p){var c=document.querySelector('.content');if(!c)return null;p=document.createElement('div');p.id='page-workspace-projects';p.className='page';c.appendChild(p);}
  document.querySelectorAll('.page').forEach(function(x){if(x!==p){x.classList.remove('active');x.style.display='none';}});
  p.classList.add('active');p.style.display='block';setNav();window.scrollTo({top:0,behavior:'auto'});return p;
}
function groupStatus(row){
  var s=norm(row&&row.status);
  if(/arkiv|archiv/.test(s))return'archived';
  if(/shtyr|postpon|paused|on hold|pezull/.test(s))return'postponed';
  if(/humb|lost|cancel|refuz/.test(s))return'lost';
  if(/fituar|won|realizuar/.test(s))return'won';
  if(/pritje|waiting|pending/.test(s))return'waiting';
  if(/mbyllur|closed/.test(s))return'closed';
  return'active';
}
function statusInfo(row){
  var g=groupStatus(row),label=String(row.status||'').trim();
  if(g==='won')return{group:g,label:/realizuar/.test(norm(label))?'Realizuar':'Fituar',c:GREEN_STRONG,bg:'#DDF1E6'};
  if(g==='lost')return{group:g,label:'Humbur',c:RED,bg:RED_BG};
  if(g==='postponed')return{group:g,label:'Shtyrë',c:AMBER,bg:AMBER_BG};
  if(g==='archived')return{group:g,label:'Arkivuar',c:GREY,bg:GREY_BG};
  if(g==='closed')return{group:g,label:'Mbyllur',c:GREY,bg:GREY_BG};
  if(g==='waiting')return{group:g,label:'Në pritje',c:BRAND_DEEP,bg:BRAND_PALE};
  return{group:g,label:label&&norm(label)!=='aktiv'?label:'Aktiv',c:GREEN,bg:GREEN_BG};
}
function urgency(row){
  var d=safeDate(row.deadline);if(!d)return{key:'normal',label:'Pa afat',c:'#AAB4B9'};
  var today=new Date();today.setHours(0,0,0,0);d.setHours(0,0,0,0);
  var n=Math.ceil((d.getTime()-today.getTime())/86400000);
  if(n<0)return{key:'overdue',label:'Vonuar '+Math.abs(n)+' ditë',c:RED};
  if(n===0)return{key:'urgent',label:'Afati sot',c:RED};
  if(n<=7)return{key:'soon',label:'Edhe '+n+' ditë',c:AMBER};
  return{key:'normal',label:dateText(row.deadline),c:BRAND};
}
function activity(row){
  var n=daysSince(row.last_activity_at||row.last_email_at||row.updated_at||row.created_at);
  return n===null?'Pa aktivitet':n===0?'Sot':n===1?'Dje':'Para '+n+' ditësh';
}
function description(row){return row.description||row.notes||row.summary||row.scope||'';}
function counts(){
  var c={all:state.rows.length,active:0,waiting:0,postponed:0,lost:0,won:0,archived:0};
  state.rows.forEach(function(r){var g=groupStatus(r);if(c[g]!==undefined)c[g]++;else if(g==='closed')c.archived++;});return c;
}
function visibleRows(){
  var q=norm(state.search),rows=state.rows.filter(function(r){
    var g=groupStatus(r),ok=state.filter==='all'||g===state.filter||(state.filter==='archived'&&g==='closed');
    if(!ok)return false;
    if(!q)return true;
    return norm([r.name,r.client,r.ref,r.reference,r.pipeline_stage,description(r)].join(' ')).indexOf(q)>-1;
  });
  rows.sort(function(a,b){
    if(state.sort==='deadline'){
      var ad=safeDate(a.deadline),bd=safeDate(b.deadline);if(!ad&&!bd)return 0;if(!ad)return 1;if(!bd)return-1;return ad-bd;
    }
    if(state.sort==='client')return String(a.client||'').localeCompare(String(b.client||''));
    return String(b.last_activity_at||b.last_email_at||b.updated_at||b.created_at||'').localeCompare(String(a.last_activity_at||a.last_email_at||a.updated_at||a.created_at||''));
  });
  return rows;
}
function css(){
  if(document.getElementById('pst-projects-modern-css'))return;
  var s=document.createElement('style');s.id='pst-projects-modern-css';s.textContent=`
.pst-pm-page{max-width:1450px;margin:0 auto;padding:23px 26px 45px}.pst-pm-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:17px;flex-wrap:wrap}.pst-pm-eyebrow{font-size:8px;letter-spacing:1.35px;text-transform:uppercase;color:#89959B;font-weight:760}.pst-pm-title{font-size:24px;line-height:1.12;font-weight:770;letter-spacing:-.45px;color:#20262A;margin-top:4px}.pst-pm-sub{font-size:10px;color:#7F8A90;margin-top:5px}.pst-pm-head-actions{display:flex;align-items:center;gap:8px}.pst-pm-btn{height:36px;border:1px solid #DCE6EA;border-radius:10px;background:#fff;color:#59666D;padding:0 12px;font-size:9px;font-weight:740;cursor:pointer}.pst-pm-btn:hover{background:${BRAND_PALE};border-color:#BFDDE8;color:${BRAND_DEEP}}.pst-pm-btn.primary{border:0;background:linear-gradient(135deg,#67A8C0,#3F7F98);color:#fff;box-shadow:0 8px 20px rgba(63,127,152,.16)}
.pst-pm-controls{background:#fff;border:1px solid #DEE8EC;border-radius:14px;padding:10px;margin-bottom:12px;box-shadow:0 1px 2px rgba(28,44,52,.025)}.pst-pm-control-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pst-pm-search{height:38px;min-width:260px;flex:1;border:1px solid #DDE7EB;border-radius:10px;padding:0 12px;font-size:10px;outline:0}.pst-pm-search:focus{border-color:${BRAND};box-shadow:0 0 0 3px rgba(91,155,179,.13)}.pst-pm-select{height:38px;border:1px solid #DDE7EB;border-radius:10px;background:#fff;padding:0 10px;font-size:9px;color:#657178;outline:0}.pst-pm-toggle{display:flex;border:1px solid #DDE7EB;border-radius:10px;padding:2px;background:#F6F8F9}.pst-pm-toggle button{height:32px;border:0;border-radius:8px;background:transparent;padding:0 10px;font-size:9px;font-weight:720;color:#77838A;cursor:pointer}.pst-pm-toggle button.on{background:#fff;color:${BRAND_DEEP};box-shadow:0 1px 4px rgba(30,50,60,.08)}
.pst-pm-filters{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:9px}.pst-pm-chip{height:30px;border:1px solid #E0E8EB;border-radius:999px;background:#fff;padding:0 10px;color:#6E7A81;font-size:8.5px;font-weight:730;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.pst-pm-chip i{font-style:normal;min-width:17px;height:17px;border-radius:9px;background:#F0F3F5;display:inline-flex;align-items:center;justify-content:center;font-size:7px}.pst-pm-chip:hover,.pst-pm-chip.on{background:${BRAND_PALE};border-color:#BFDDE8;color:${BRAND_DEEP}}.pst-pm-chip.on i{background:#fff;color:${BRAND_DEEP}}
.pst-pm-list{display:flex;flex-direction:column;gap:8px}.pst-pm-row{position:relative;display:grid;grid-template-columns:minmax(260px,1.9fr) minmax(390px,1.25fr) auto;gap:18px;align-items:center;background:#fff;border:1px solid #DEE7EA;border-radius:14px;padding:14px 14px 14px 17px;box-shadow:0 1px 2px rgba(27,43,50,.028);transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease;overflow:visible}.pst-pm-row:before{content:"";position:absolute;left:-1px;top:12px;bottom:12px;width:4px;border-radius:0 5px 5px 0;background:var(--urgency)}.pst-pm-row:hover{border-color:#C9DCE4;box-shadow:0 8px 24px rgba(40,75,90,.07);transform:translateY(-1px)}.pst-pm-main{min-width:0;cursor:pointer}.pst-pm-name{font-size:12.5px;font-weight:760;color:#252B2F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-pm-client{font-size:9.3px;color:#768289;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-pm-desc{font-size:8.5px;color:#98A1A6;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-pm-meta{display:grid;grid-template-columns:1.15fr .85fr .9fr 1fr;gap:12px;min-width:0}.pst-pm-meta-block{min-width:0}.pst-pm-meta-label{font-size:7px;letter-spacing:.65px;text-transform:uppercase;color:#A0A9AE;font-weight:750;margin-bottom:4px}.pst-pm-meta-value{font-size:9px;color:#4F5C63;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-pm-badge{display:inline-flex;align-items:center;max-width:100%;border-radius:999px;padding:3px 7px;font-size:7.7px;font-weight:770;color:var(--c);background:var(--bg);white-space:nowrap}.pst-pm-actions{display:flex;align-items:center;gap:6px;justify-content:flex-end}.pst-pm-open{height:33px;border:0;border-radius:9px;background:linear-gradient(135deg,#67A8C0,#3F7F98);color:#fff;padding:0 12px;font-size:8.5px;font-weight:750;cursor:pointer}.pst-pm-more{width:33px;height:33px;border:1px solid #DDE6EA;border-radius:9px;background:#fff;color:#657178;font-size:17px;line-height:1;cursor:pointer}.pst-pm-more:hover{background:${BRAND_PALE};color:${BRAND_DEEP}}
.pst-pm-menu{position:fixed;z-index:5500;width:196px;background:#fff;border:1px solid #DCE5E9;border-radius:12px;padding:5px;box-shadow:0 18px 46px rgba(24,39,47,.18)}.pst-pm-menu button{width:100%;height:33px;border:0;background:#fff;border-radius:8px;text-align:left;padding:0 10px;font-size:9px;color:#59666D;cursor:pointer}.pst-pm-menu button:hover{background:${BRAND_PALE};color:${BRAND_DEEP}}.pst-pm-menu button.danger{color:${RED}}.pst-pm-menu button.danger:hover{background:${RED_BG}}
.pst-pm-empty{background:#fff;border:1px solid #DEE7EA;border-radius:14px;padding:42px;text-align:center;color:#8A959A;font-size:10px}.pst-pm-loading{background:#fff;border:1px solid #DEE7EA;border-radius:14px;padding:30px;text-align:center;color:#8A959A;font-size:10px}
.pst-pm-board{display:flex;flex-direction:column;gap:14px}.pst-pm-phase{background:rgba(255,255,255,.72);border:1px solid #DEE7EA;border-radius:14px;padding:11px}.pst-pm-phase-head{display:flex;justify-content:space-between;align-items:center;padding:2px 2px 9px}.pst-pm-phase-head b{font-size:9px;text-transform:uppercase;letter-spacing:.7px;color:#69767D}.pst-pm-phase-head span{font-size:8px;color:#8D979C}.pst-pm-board-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.pst-pm-col{background:#F7F9FA;border:1px solid #E2EAED;border-radius:11px;min-width:0;overflow:hidden}.pst-pm-col-head{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:9px 10px;border-bottom:1px solid #E3EBEE;background:#fff}.pst-pm-col-head b{font-size:9px;color:#4F5C63}.pst-pm-col-head i{font-style:normal;min-width:20px;height:20px;border-radius:10px;background:${BRAND_PALE};color:${BRAND_DEEP};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:760}.pst-pm-col-body{display:flex;flex-direction:column;gap:6px;padding:7px;min-height:82px;max-height:345px;overflow:auto}.pst-pm-board-card{position:relative;background:#fff;border:1px solid #DEE7EA;border-radius:9px;padding:9px 9px 9px 12px;cursor:pointer;box-shadow:0 1px 2px rgba(25,42,50,.025)}.pst-pm-board-card:before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:0 4px 4px 0;background:var(--urgency)}.pst-pm-board-card:hover{border-color:#BED8E2;box-shadow:0 5px 15px rgba(45,80,95,.08)}.pst-pm-board-name{font-size:9.5px;font-weight:720;color:#31383C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-pm-board-client{font-size:8px;color:#849097;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-pm-board-foot{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-top:7px}.pst-pm-board-date{font-size:7.5px;color:#8A959A}.pst-pm-col-empty{padding:22px 8px;text-align:center;color:#9AA3A8;font-size:8.5px;font-style:italic}
#pst-pm-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:5600;background:#263036;color:#fff;border-radius:10px;padding:10px 14px;font-size:9.5px;box-shadow:0 10px 30px rgba(20,32,38,.24)}
@media(max-width:1180px){.pst-pm-row{grid-template-columns:minmax(240px,1.4fr) minmax(330px,1fr) auto}.pst-pm-meta{grid-template-columns:1fr 1fr}.pst-pm-board-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:820px){.pst-pm-page{padding:16px 13px 35px}.pst-pm-row{grid-template-columns:1fr;gap:11px}.pst-pm-meta{grid-template-columns:repeat(2,1fr)}.pst-pm-actions{justify-content:flex-start}.pst-pm-board-grid{grid-template-columns:1fr}.pst-pm-search{min-width:100%}}
`;
  document.head.appendChild(s);
}
function toast(text){var old=document.getElementById('pst-pm-toast');if(old)old.remove();var el=document.createElement('div');el.id='pst-pm-toast';el.textContent=text;document.body.appendChild(el);setTimeout(function(){if(el.parentNode)el.remove();},4200);}
async function fetchProjects(){
  var rows=[];
  if(typeof window.supaFetch==='function'){
    var paths=['projects?select=*&order=created_at.desc&limit=3000','projects?select=*&limit=3000'];
    for(var i=0;i<paths.length&&!rows.length;i++)try{rows=arr(await window.supaFetch(paths[i]));}catch(e){}
  }
  if(!rows.length){[window.projects,window._projects,window._allProjectsCache,window.PST_PROJECTS].some(function(x){if(Array.isArray(x)&&x.length){rows=x;return true;}return false;});}
  return rows;
}
function filtersHtml(){
  var c=counts(),labels={all:'Të gjitha',active:'Aktive',waiting:'Në pritje',postponed:'Shtyra',lost:'Të humbura',won:'Të fituara',archived:'Arkivuara'};
  return Object.keys(labels).map(function(k){return'<button class="pst-pm-chip'+(state.filter===k?' on':'')+'" data-pm-filter="'+k+'">'+labels[k]+' <i>'+c[k]+'</i></button>';}).join('');
}
function shell(){
  var p=ensurePage();if(!p)return null;
  p.innerHTML='<div class="pst-pm-page"><div class="pst-pm-head"><div><div class="pst-pm-eyebrow">Projektet</div><div class="pst-pm-title">Të gjitha projektet</div><div class="pst-pm-sub">Komunikimi, prokurimi, dokumentet dhe financat në një dosje operative.</div></div><div class="pst-pm-head-actions"><button class="pst-pm-btn" id="pst-pm-refresh">Rifresko</button><button class="pst-pm-btn primary" id="pst-pm-new">+ Projekt i ri</button></div></div><div class="pst-pm-controls"><div class="pst-pm-control-top"><input class="pst-pm-search" id="pst-pm-search" placeholder="Kërko projekt, klient, referencë ose përshkrim"><select class="pst-pm-select" id="pst-pm-sort"><option value="activity">Aktiviteti i fundit</option><option value="deadline">Afati</option><option value="client">Klienti</option></select><div class="pst-pm-toggle"><button data-pm-view="list" class="'+(state.view==='list'?'on':'')+'">Listë</button><button data-pm-view="board" class="'+(state.view==='board'?'on':'')+'">Board</button></div></div><div class="pst-pm-filters" id="pst-pm-filters">'+filtersHtml()+'</div></div><div id="pst-pm-content"><div class="pst-pm-loading">Duke ngarkuar projektet…</div></div></div>';
  bind(p);return p;
}
function rowHtml(r){
  var st=statusInfo(r),u=urgency(r),sg=stageInfo(r.pipeline_stage||'rfq_in');
  return'<article class="pst-pm-row" data-project-id="'+esc(r.id)+'" style="--urgency:'+u.c+'"><div class="pst-pm-main" data-pm-open="'+esc(r.id)+'"><div class="pst-pm-name">'+esc(r.name||'Pa emër')+'</div><div class="pst-pm-client">'+esc(r.client||'Pa klient')+(r.ref||r.reference?' · '+esc(r.ref||r.reference):'')+'</div>'+(description(r)?'<div class="pst-pm-desc">'+esc(description(r))+'</div>':'')+'</div><div class="pst-pm-meta"><div class="pst-pm-meta-block"><div class="pst-pm-meta-label">Faza</div><div class="pst-pm-meta-value">'+esc(sg.name)+'</div></div><div class="pst-pm-meta-block"><div class="pst-pm-meta-label">Statusi</div><span class="pst-pm-badge" style="--c:'+st.c+';--bg:'+st.bg+'">'+esc(st.label)+'</span></div><div class="pst-pm-meta-block"><div class="pst-pm-meta-label">Afati</div><div class="pst-pm-meta-value" style="color:'+u.c+'">'+esc(u.label)+'</div></div><div class="pst-pm-meta-block"><div class="pst-pm-meta-label">Aktiviteti</div><div class="pst-pm-meta-value">'+esc(activity(r))+'</div></div></div><div class="pst-pm-actions"><button class="pst-pm-open" data-pm-open="'+esc(r.id)+'">Hap</button><button class="pst-pm-more" data-pm-more="'+esc(r.id)+'" aria-label="Veprime">⋯</button></div></article>';
}
function renderList(rows){return rows.length?'<div class="pst-pm-list">'+rows.map(rowHtml).join('')+'</div>':'<div class="pst-pm-empty">Nuk ka projekte që përputhen me filtrin.</div>';}
function boardCard(r){var st=statusInfo(r),u=urgency(r);return'<div class="pst-pm-board-card" data-pm-open="'+esc(r.id)+'" style="--urgency:'+u.c+'"><div class="pst-pm-board-name">'+esc(r.name||'Pa emër')+'</div><div class="pst-pm-board-client">'+esc(r.client||'Pa klient')+'</div><div class="pst-pm-board-foot"><span class="pst-pm-badge" style="--c:'+st.c+';--bg:'+st.bg+'">'+esc(st.label)+'</span><span class="pst-pm-board-date">'+esc(u.label)+'</span></div></div>';}
function renderBoard(rows){
  var phases=[{title:'1 · Vlerësimi dhe burimi',from:0,to:3},{title:'2 · Oferta dhe marrëveshja',from:3,to:6},{title:'3 · Realizimi dhe dorëzimi',from:6,to:9}];
  return'<div class="pst-pm-board">'+phases.map(function(ph){var subset=STAGES.slice(ph.from,ph.to),total=rows.filter(function(r){return subset.some(function(s){return s.id===(r.pipeline_stage||'rfq_in');});}).length;return'<section class="pst-pm-phase"><div class="pst-pm-phase-head"><b>'+ph.title+'</b><span>'+total+' projekte</span></div><div class="pst-pm-board-grid">'+subset.map(function(s){var list=rows.filter(function(r){return(r.pipeline_stage||'rfq_in')===s.id;});return'<div class="pst-pm-col"><div class="pst-pm-col-head"><b>'+esc(s.name)+'</b><i>'+list.length+'</i></div><div class="pst-pm-col-body">'+(list.length?list.map(boardCard).join(''):'<div class="pst-pm-col-empty">Asnjë projekt</div>')+'</div></div>';}).join('')+'</div></section>';}).join('')+'</div>';
}
function render(){
  var host=document.getElementById('pst-pm-content');if(!host)return;
  var rows=visibleRows();host.innerHTML=state.view==='board'?renderBoard(rows):renderList(rows);
  var f=document.getElementById('pst-pm-filters');if(f)f.innerHTML=filtersHtml();
  document.querySelectorAll('[data-pm-view]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-pm-view')===state.view);});
}
function closeMenu(){var m=document.getElementById('pst-pm-menu');if(m)m.remove();}
function menuFor(id,button){
  closeMenu();var r=state.rows.filter(function(x){return String(x.id)===String(id);})[0];if(!r)return;
  var m=document.createElement('div');m.id='pst-pm-menu';m.className='pst-pm-menu';m.innerHTML='<button data-act="open">Hap projektin</button><button data-act="won">Shëno si të fituar</button><button data-act="postponed">Shtyje</button><button data-act="lost">Shëno si të humbur</button><button data-act="archived">Arkivo</button><button data-act="closed">Mbyll projektin</button><button class="danger" data-act="delete">Fshije</button>';
  document.body.appendChild(m);var rect=button.getBoundingClientRect(),left=Math.min(window.innerWidth-210,Math.max(8,rect.right-196)),top=Math.min(window.innerHeight-250,rect.bottom+5);m.style.left=left+'px';m.style.top=top+'px';
  m.addEventListener('click',function(e){var a=e.target.closest('[data-act]');if(!a)return;closeMenu();projectAction(id,a.getAttribute('data-act'));});
  setTimeout(function(){document.addEventListener('click',outside,{once:true});},0);
  function outside(e){if(!m.contains(e.target)&&e.target!==button)closeMenu();}
}
function selectGlobal(id){var s=document.getElementById('global-proj');if(s){s.value=String(id);try{s.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}}window.__pstCurrentProjectId=String(id);window._curProjId=String(id);}
function openProject(id){closeMenu();if(typeof window.pstOpenProjectWorkspace==='function')return window.pstOpenProjectWorkspace(id);if(typeof window.loadProject==='function')return window.loadProject(id);if(typeof window.openOverview==='function')return window.openOverview(id);}
async function patchStatus(id,status){
  if(typeof window.supaFetch!=='function')throw new Error('Databaza nuk është gati.');
  await window.supaFetch('projects?id=eq.'+enc(id),'PATCH',{status:status,updated_at:new Date().toISOString()});
  state.rows.forEach(function(r){if(String(r.id)===String(id)){r.status=status;r.updated_at=new Date().toISOString();}});render();toast('Statusi i projektit u ndryshua.');
}
async function preflightDelete(id){
  var tables=['project_email_links','project_emails','project_contacts','project_attachment_links','project_docs','bom_items','offers','rfq_log','documents_registry','tasks','invoices_out','invoices_in','commercial_adjustments'];
  var total=0,details=[];
  for(var i=0;i<tables.length;i++)try{var r=arr(await window.supaFetch(tables[i]+'?project_id=eq.'+enc(id)+'&select=id&limit=2'));if(r.length){total+=r.length;details.push(tables[i]);}}catch(e){}
  return{total:total,tables:details};
}
async function deleteProject(id){
  var check=await preflightDelete(id);
  if(check.total){alert('Projekti nuk u fshi. Ka të dhëna të lidhura në: '+check.tables.join(', ')+'. Përdor Arkivo që të mos humbet asgjë.');return;}
  if(!confirm('Ky projekt nuk ka të dhëna të lidhura. Ta fshijmë përfundimisht?'))return;
  if(!confirm('Konfirmimi i fundit: fshirja nuk mund të zhbëhet.'))return;
  await window.supaFetch('projects?id=eq.'+enc(id),'DELETE');state.rows=state.rows.filter(function(r){return String(r.id)!==String(id);});render();toast('Projekti u fshi.');
}
async function projectAction(id,act){
  try{
    if(act==='open')return openProject(id);
    if(act==='lost'){
      selectGlobal(id);
      if(typeof window.pstOpenProjectLoss==='function')return window.pstOpenProjectLoss();
      return patchStatus(id,'humbur');
    }
    if(act==='delete')return deleteProject(id);
    var map={won:'fituar',postponed:'shtyrë',archived:'arkivuar',closed:'mbyllur'};
    if(map[act])return patchStatus(id,map[act]);
  }catch(e){alert('Veprimi dështoi: '+(e.message||e));}
}
function bind(p){
  p.addEventListener('input',function(e){if(e.target.id==='pst-pm-search'){state.search=e.target.value;render();}});
  p.addEventListener('change',function(e){if(e.target.id==='pst-pm-sort'){state.sort=e.target.value;render();}});
  p.addEventListener('click',function(e){
    var filter=e.target.closest('[data-pm-filter]');if(filter){state.filter=filter.getAttribute('data-pm-filter');render();return;}
    var view=e.target.closest('[data-pm-view]');if(view){state.view=view.getAttribute('data-pm-view');try{localStorage.setItem('pristeel_projects_modern_view',state.view);}catch(x){}render();return;}
    var open=e.target.closest('[data-pm-open]');if(open){openProject(open.getAttribute('data-pm-open'));return;}
    var more=e.target.closest('[data-pm-more]');if(more){e.stopPropagation();menuFor(more.getAttribute('data-pm-more'),more);return;}
    if(e.target.id==='pst-pm-refresh'){load(true);return;}
    if(e.target.id==='pst-pm-new'){if(typeof window.pstWsCreate==='function')window.pstWsCreate('project');else if(typeof window.newProject==='function')window.newProject();return;}
  });
}
async function load(force){
  css();try{var saved=localStorage.getItem('pristeel_projects_modern_view');if(saved==='board'||saved==='list')state.view=saved;}catch(e){}
  shell();state.loading=true;
  try{state.rows=await fetchProjects();window.__pstWorkspaceProjectRows=state.rows;window._allProjectsCache=state.rows;state.loading=false;render();var b=document.getElementById('pst-ws-b-projects');if(b){var n=state.rows.filter(function(r){return['active','waiting','postponed'].indexOf(groupStatus(r))>-1;}).length;b.textContent=String(n);b.style.display=n?'inline-flex':'none';}}
  catch(e){state.loading=false;var h=document.getElementById('pst-pm-content');if(h)h.innerHTML='<div class="pst-pm-empty">Projektet nuk u ngarkuan: '+esc(e.message||e)+'</div>';}
}
window.pstProjectsModernOpen=function(){return load(false);};
window.pstProjectsModernRefresh=function(){return load(true);};
window.pstProjectsModernAction=projectAction;
window.pstWorkspaceGo=function(key){if(key==='projects')return load(false);return typeof baseGo==='function'?baseGo.apply(this,arguments):undefined;};
css();
})();
