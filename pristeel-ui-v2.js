/* PRISTEEL UI V2: navigim i thjeshtuar dhe dashboard operacional */
(function(){
'use strict';

if(window.__pstUiV2Loaded)return;
window.__pstUiV2Loaded=true;

var COLORS={
  bronze:'#A65F2E', bronzeBg:'#F7EDE5',
  green:'#2F7657', greenBg:'#EAF5EF',
  blue:'#3D6F8E', blueBg:'#EAF2F7',
  violet:'#6B5B95', violetBg:'#F0EDF7',
  amber:'#9B6A22', amberBg:'#FAF2E3',
  red:'#A64B42', redBg:'#F9ECEA',
  slate:'#5D6872', slateBg:'#EDF1F3'
};

var ICONS={
  home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>',
  inbox:'<svg viewBox="0 0 24 24"><path d="M4 4h16v14H4z"/><path d="M4 13h4l2 3h4l2-3h4"/></svg>',
  projects:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4h8v2"/></svg>',
  procurement:'<svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.5a2 2 0 0 0 2 1.5h8.7a2 2 0 0 0 2-1.5L21 8H7"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>',
  sales:'<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 15l3-3 2 2 4-5"/><path d="M16 9h1v1"/></svg>',
  finance:'<svg viewBox="0 0 24 24"><path d="M4 7h16v12H4z"/><path d="M4 10h16"/><path d="M8 15h3"/></svg>',
  contacts:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-7 6-7s6 3 6 7"/><path d="M16 8h5M18.5 5.5v5"/></svg>',
  calculator:'<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/></svg>',
  settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.5 3.1h5l.5-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  refresh:'<svg viewBox="0 0 24 24"><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 1-2-5"/></svg>',
  arrow:'<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  mail:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  warning:'<svg viewBox="0 0 24 24"><path d="M12 3 2.8 20h18.4L12 3z"/><path d="M12 9v5M12 17h.01"/></svg>'
};

var style=document.createElement('style');
style.id='pst-ui-v2-style';
style.textContent=`
body.pst-ui-v2{--pst-shell:#F6F7F8;--pst-card:#FFFFFF;--pst-line:#E6E8EA;--pst-muted:#7A8086;--pst-soft:#F0F2F3;background:var(--pst-shell)}
body.pst-ui-v2 .app-shell{background:var(--pst-shell);align-items:stretch}
body.pst-ui-v2 .sidebar{width:224px!important;min-width:224px!important;height:100vh;position:sticky;top:0;background:#fff;border-right:1px solid var(--pst-line);overflow:hidden!important;transition:none!important;box-shadow:none!important}
body.pst-ui-v2 .sidebar.open{width:224px!important}
body.pst-ui-v2 .sidebar>*:not(#pst-v2-sidebar){display:none!important}
body.pst-ui-v2 #right-rail{display:none!important}
body.pst-ui-v2 #modbar{display:none!important}
body.pst-ui-v2 #util-fab{display:none!important}
body.pst-ui-v2 .main{min-width:0;background:var(--pst-shell)}
body.pst-ui-v2 .topbar{position:sticky;top:0;z-index:80;background:rgba(255,255,255,.94)!important;backdrop-filter:blur(14px);padding:13px 24px!important;border-bottom:1px solid var(--pst-line)!important}
body.pst-ui-v2 .content{padding:24px 28px 40px;max-width:1600px;margin:0 auto;width:100%}
body.pst-ui-v2 #page-home.active{display:block!important;min-height:auto!important}
body.pst-ui-v2 .btn-primary{animation:none!important;box-shadow:none!important}
body.pst-ui-v2 .card{border:1px solid var(--pst-line);box-shadow:0 1px 2px rgba(24,30,36,.035)}
body.pst-ui-v2 .card:hover{box-shadow:0 5px 18px rgba(24,30,36,.06)}
body.pst-ui-v2 .page.active{animation:none}
#pst-v2-sidebar{height:100%;display:flex;flex-direction:column;padding:18px 14px 14px}
.pst-v2-brand{display:flex;align-items:center;gap:10px;padding:2px 6px 18px;cursor:pointer}
.pst-v2-brandmark{width:34px;height:34px;border-radius:10px;background:#A65F2E;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:750;font-size:15px;letter-spacing:.4px}
.pst-v2-brandtext{min-width:0}.pst-v2-brandname{font-size:14px;font-weight:750;letter-spacing:.4px;color:#202326}.pst-v2-brandsub{font-size:9.5px;color:#8C9196;margin-top:1px;letter-spacing:.4px}
.pst-v2-new{width:100%;height:38px;border:0;border-radius:9px;background:#A65F2E;color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font-size:11.5px;font-weight:700;cursor:pointer;margin-bottom:16px}
.pst-v2-new:hover{background:#8A4E24}.pst-v2-new svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2}
.pst-v2-group{font-size:8.5px;text-transform:uppercase;letter-spacing:1.2px;color:#A0A4A8;font-weight:750;padding:9px 9px 5px}
.pst-v2-nav{display:flex;flex-direction:column;gap:3px}
.pst-v2-navitem{position:relative;display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:#596067;border-radius:9px;padding:9px 10px;cursor:pointer;text-align:left;font-size:11.5px;font-weight:620;transition:background .13s,color .13s}
.pst-v2-navitem:hover{background:#F3F4F5;color:#222629}.pst-v2-navitem.active{background:var(--nav-bg,#F7EDE5);color:var(--nav-color,#8A4E24)}
.pst-v2-navitem svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
.pst-v2-navlabel{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pst-v2-badge{min-width:19px;height:19px;border-radius:10px;padding:0 5px;background:#ECEFF1;color:#616970;display:none;align-items:center;justify-content:center;font-size:9px;font-weight:750}
.pst-v2-navitem.active .pst-v2-badge{background:rgba(255,255,255,.72);color:inherit}
.pst-v2-spacer{flex:1}
.pst-v2-search{display:flex;align-items:center;gap:9px;border:1px solid var(--pst-line);background:#FAFBFB;border-radius:9px;padding:8px 10px;color:#747B81;font-size:10.5px;cursor:pointer;margin:12px 0 9px}
.pst-v2-search:hover{background:#F3F5F5}.pst-v2-search svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2}
.pst-v2-key{margin-left:auto;border:1px solid #DDE1E3;border-radius:5px;padding:1px 5px;font-size:8.5px;background:#fff}
.pst-v2-foot{font-size:9px;color:#A0A4A8;padding:0 4px;line-height:1.5}
.pst-dash{max-width:1380px;margin:0 auto}
.pst-dash-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:20px}
.pst-dash-eyebrow{font-size:9px;text-transform:uppercase;letter-spacing:1.4px;color:#92979C;font-weight:750;margin-bottom:5px}
.pst-dash-title{font-size:25px;line-height:1.15;font-weight:740;letter-spacing:-.5px;color:#202326}
.pst-dash-sub{font-size:11.5px;color:#777E84;margin-top:6px}
.pst-dash-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.pst-dash-btn{height:36px;border:1px solid var(--pst-line);border-radius:9px;background:#fff;color:#535A60;padding:0 12px;display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:650;cursor:pointer}
.pst-dash-btn:hover{background:#F8F9F9;border-color:#D8DCDE}.pst-dash-btn.primary{background:#A65F2E;color:#fff;border-color:#A65F2E}.pst-dash-btn.primary:hover{background:#8A4E24}
.pst-dash-btn svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.pst-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.pst-kpi{border:1px solid var(--pst-line);border-radius:13px;background:#fff;padding:14px 15px;display:flex;align-items:center;gap:12px;min-height:82px;cursor:pointer;transition:transform .14s,box-shadow .14s}
.pst-kpi:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(25,30,35,.06)}
.pst-kpi-icon{width:40px;height:40px;border-radius:11px;background:var(--kpi-bg);color:var(--kpi-color);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pst-kpi-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.pst-kpi-value{font-size:22px;font-weight:760;line-height:1;color:#24282B}.pst-kpi-label{font-size:10.5px;color:#6E757B;margin-top:4px}.pst-kpi-hint{font-size:9px;color:#A0A5A9;margin-top:1px}
.pst-dash-grid{display:grid;grid-template-columns:minmax(0,1.58fr) minmax(310px,.82fr);gap:16px;align-items:start}
.pst-panel{background:#fff;border:1px solid var(--pst-line);border-radius:13px;overflow:hidden;margin-bottom:16px}
.pst-panel-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 15px;border-bottom:1px solid #ECEEEF}
.pst-panel-title{font-size:11.5px;font-weight:730;color:#303438}.pst-panel-sub{font-size:9.5px;color:#92979C;margin-top:2px}
.pst-panel-link{border:0;background:transparent;color:#A65F2E;font-size:10px;font-weight:700;cursor:pointer}.pst-panel-link:hover{text-decoration:underline}
.pst-panel-body{padding:6px 8px 9px}
.pst-empty{padding:24px 14px;text-align:center;color:#92979C;font-size:10.5px}
.pst-action{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:9px;cursor:pointer}.pst-action:hover{background:#F7F8F8}
.pst-action-dot{width:8px;height:8px;border-radius:50%;background:var(--ac);box-shadow:0 0 0 4px var(--acbg);flex-shrink:0;margin-left:4px}
.pst-action-main{flex:1;min-width:0}.pst-action-title{font-size:11px;font-weight:650;color:#303438;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-action-meta{font-size:9.5px;color:#92979C;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pst-action-tag{font-size:8.5px;text-transform:uppercase;letter-spacing:.35px;font-weight:750;color:var(--ac);background:var(--acbg);padding:3px 7px;border-radius:12px;white-space:nowrap}
.pst-project{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(110px,.65fr) 85px 26px;align-items:center;gap:10px;padding:10px 9px;border-radius:9px;cursor:pointer}.pst-project:hover{background:#F7F8F8}
.pst-project-name{font-size:11px;font-weight:680;color:#2E3235;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-project-client{font-size:9.5px;color:#92979C;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pst-status{display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:700;color:var(--st-color);background:var(--st-bg);padding:4px 7px;border-radius:12px;white-space:nowrap}.pst-status:before{content:'';width:5px;height:5px;border-radius:50%;background:currentColor}
.pst-deadline{font-size:9.5px;color:#747B81;text-align:right;white-space:nowrap}.pst-project-arrow{color:#A8ADB1}.pst-project-arrow svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2}
.pst-mailrow{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:9px}.pst-mailrow:hover{background:#F7F8F8}
.pst-mail-avatar{width:30px;height:30px;border-radius:9px;background:#EAF2F7;color:#3D6F8E;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:750;flex-shrink:0}.pst-mail-main{flex:1;min-width:0}.pst-mail-subject{font-size:10.5px;font-weight:650;color:#303438;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-mail-meta{font-size:9px;color:#969CA1;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-mail-open{border:0;background:#F1F3F4;color:#636A70;border-radius:7px;padding:5px 7px;font-size:9px;font-weight:650;cursor:pointer;white-space:nowrap}.pst-mail-open:hover{background:#E7EAEC}
.pst-deadline-row{display:flex;align-items:center;gap:10px;padding:9px 8px}.pst-datebox{width:39px;border-radius:9px;background:#FAF2E3;color:#8B641F;text-align:center;padding:5px 3px;flex-shrink:0}.pst-date-day{font-size:14px;font-weight:760;line-height:1}.pst-date-mon{font-size:7.5px;text-transform:uppercase;margin-top:2px}.pst-deadline-main{flex:1;min-width:0}.pst-deadline-title{font-size:10.5px;font-weight:650;color:#303438;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-deadline-meta{font-size:9px;color:#969CA1;margin-top:2px}
.pst-skeleton{height:10px;border-radius:5px;background:linear-gradient(90deg,#F0F2F3,#E7EAEC,#F0F2F3);background-size:200% 100%;animation:pstShimmer 1.2s infinite;margin:10px}
@keyframes pstShimmer{to{background-position:-200% 0}}
@media(max-width:1100px){.pst-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-dash-grid{grid-template-columns:1fr}}
@media(max-width:980px){body.pst-ui-v2 .sidebar,body.pst-ui-v2 .sidebar.open{width:72px!important;min-width:72px!important}#pst-v2-sidebar{padding:15px 10px}.pst-v2-brand{justify-content:center;padding-left:0;padding-right:0}.pst-v2-brandtext,.pst-v2-navlabel,.pst-v2-group,.pst-v2-foot,.pst-v2-search span,.pst-v2-key{display:none}.pst-v2-new{width:42px;margin-left:auto;margin-right:auto}.pst-v2-navitem{justify-content:center;padding:10px}.pst-v2-badge{position:absolute;right:2px;top:1px}.pst-v2-search{justify-content:center;padding:9px}body.pst-ui-v2 .content{padding:20px}}
@media(max-width:700px){.pst-kpis{grid-template-columns:1fr}.pst-dash-head{align-items:flex-start;flex-direction:column}.pst-dash-actions{justify-content:flex-start}.pst-project{grid-template-columns:minmax(0,1fr) 75px 20px}.pst-project .pst-status{display:none}.pst-dash-title{font-size:21px}}
`;
document.head.appendChild(style);

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function arr(v){return Array.isArray(v)?v:[];}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function dateLabel(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'}):'Pa afat';}
function fullDate(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'';}
function relDays(v){var d=safeDate(v);if(!d)return null;var a=new Date();a.setHours(0,0,0,0);d.setHours(0,0,0,0);return Math.round((d-a)/86400000);}
function initials(v){var p=String(v||'?').trim().split(/\s+/);return ((p[0]||'?')[0]+(p[1]?p[1][0]:'')).toUpperCase();}
function activeProject(p){var s=String((p&&p.status)||'').toLowerCase();return ['mbyllur','fituar','humbur','arkivuar','closedwon','closedlost','cancelled'].indexOf(s)<0;}
function statusInfo(s){s=String(s||'pritje').toLowerCase();if(['fituar','closedwon','aktiv','ne pune','në punë'].indexOf(s)>-1)return{label:s==='fituar'||s==='closedwon'?'Fituar':'Aktiv',c:COLORS.green,bg:COLORS.greenBg};if(['humbur','closedlost','cancelled'].indexOf(s)>-1)return{label:'Humbur',c:COLORS.red,bg:COLORS.redBg};if(['ofertim','oferte','ofertë','negociata'].indexOf(s)>-1)return{label:s.charAt(0).toUpperCase()+s.slice(1),c:COLORS.amber,bg:COLORS.amberBg};return{label:s&&s!=='pritje'?s.charAt(0).toUpperCase()+s.slice(1):'Në pritje',c:COLORS.blue,bg:COLORS.blueBg};}
function greet(){var h=new Date().getHours();return h<12?'Mirëmëngjes':h<18?'Mirëdita':'Mirëmbrëma';}
function setText(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
function setBadge(id,v){var e=document.getElementById(id);if(!e)return;e.textContent=String(v||0);e.style.display=v?'inline-flex':'none';}
function navHtml(id,label,icon,page,color,bg,badge){return '<button class="pst-v2-navitem" data-nav="'+id+'" data-page="'+page+'" style="--nav-color:'+color+';--nav-bg:'+bg+'" onclick="pstV2Go(\''+page+'\')">'+icon+'<span class="pst-v2-navlabel">'+label+'</span>'+(badge?'<span class="pst-v2-badge" id="'+badge+'"></span>':'')+'</button>';}

function buildSidebar(){
  var sidebar=document.getElementById('app-sidebar');if(!sidebar||document.getElementById('pst-v2-sidebar'))return !!sidebar;
  var root=document.createElement('div');root.id='pst-v2-sidebar';
  root.innerHTML=''
    +'<div class="pst-v2-brand" onclick="pstV2Go(\'home\')"><div class="pst-v2-brandmark">P</div><div class="pst-v2-brandtext"><div class="pst-v2-brandname">PRISTEEL</div><div class="pst-v2-brandsub">Procurement Platform</div></div></div>'
    +'<button class="pst-v2-new" onclick="pstV2NewProject()">'+ICONS.plus+'<span class="pst-v2-navlabel">Projekt i ri</span></button>'
    +'<div class="pst-v2-group">Puna</div><div class="pst-v2-nav">'
      +navHtml('home','Dashboard',ICONS.home,'home',COLORS.bronze,COLORS.bronzeBg,'pst-nav-task-count')
      +navHtml('inbox','Inbox & Mundësitë',ICONS.inbox,'outreach',COLORS.amber,COLORS.amberBg,'pst-nav-inbox-count')
      +navHtml('projects','Projektet',ICONS.projects,'import',COLORS.green,COLORS.greenBg,'pst-nav-project-count')
      +navHtml('procurement','Prokurimi',ICONS.procurement,'bom',COLORS.bronze,COLORS.bronzeBg,'')
      +navHtml('sales','Oferta & Shitje',ICONS.sales,'offer-archive',COLORS.violet,COLORS.violetBg,'')
      +navHtml('finance','Financat',ICONS.finance,'finance',COLORS.blue,COLORS.blueBg,'')
      +navHtml('contacts','Kontaktet',ICONS.contacts,'contacts',COLORS.violet,COLORS.violetBg,'')
    +'</div><div class="pst-v2-group">Vegla</div><div class="pst-v2-nav">'
      +navHtml('calculator','Kalkulatori',ICONS.calculator,'kalkulator',COLORS.slate,COLORS.slateBg,'')
      +navHtml('settings','Cilësimet',ICONS.settings,'settings',COLORS.slate,COLORS.slateBg,'')
    +'</div><div class="pst-v2-spacer"></div><div class="pst-v2-search" onclick="pstV2Search()">'+ICONS.search+'<span>Kërko në platformë</span><span class="pst-v2-key">⌘K</span></div><div class="pst-v2-foot">PRISTEEL Sh.p.k.<br>sales@prissteel.com</div>';
  sidebar.insertBefore(root,sidebar.firstChild);return true;
}

function navKey(page){page=String(page||'home');if(page==='home'||page==='qendra')return'home';if(page==='outreach')return'inbox';if(['import','newproject'].indexOf(page)>-1)return'projects';if(['bom','rfq','offers','ranking'].indexOf(page)>-1)return'procurement';if(['oferta','offer-archive','invoices'].indexOf(page)>-1)return'sales';if(['finance','contracts','library'].indexOf(page)>-1)return'finance';if(page==='contacts')return'contacts';if(page==='kalkulator')return'calculator';if(page==='settings')return'settings';return'';}
function updateNav(page){var key=navKey(page);document.querySelectorAll('.pst-v2-navitem').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-nav')===key);});}
window.pstV2Go=function(page){if(page==='home'){if(typeof window.goHome==='function')window.goHome();else{document.querySelectorAll('.page').forEach(function(x){x.classList.remove('active');});var h=document.getElementById('page-home');if(h)h.classList.add('active');renderDashboard();}updateNav('home');return;}if(typeof window.showPage==='function')window.showPage(page);updateNav(page);};
window.pstV2NewProject=function(){if(typeof window.newProject==='function')window.newProject();else window.pstV2Go('newproject');};
window.pstV2Search=function(){if(typeof window.openCmdK==='function')window.openCmdK();};
window.pstV2Refresh=function(){renderDashboard(true);};
window.pstV2OpenProject=function(id){if(typeof window.openOverview==='function')window.openOverview(id);else window.pstV2Go('import');};
window.pstV2OpenMail=function(url){if(url)window.open(url,'_blank');else window.pstV2Go('outreach');};

function skeleton(){return '<div class="pst-skeleton"></div><div class="pst-skeleton" style="width:76%"></div><div class="pst-skeleton" style="width:88%"></div>';}
function dashboardShell(){
  var page=document.getElementById('page-home');if(!page)return null;
  page.innerHTML='<div class="pst-dash"><div class="pst-dash-head"><div><div class="pst-dash-eyebrow">Qendra operative</div><div class="pst-dash-title">'+greet()+', PRISTEEL</div><div class="pst-dash-sub">'+new Date().toLocaleDateString('sq-AL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · puna që kërkon vëmendje sot</div></div><div class="pst-dash-actions"><button class="pst-dash-btn" onclick="pstV2Search()">'+ICONS.search+'Kërko</button><button class="pst-dash-btn" onclick="pstV2Refresh()">'+ICONS.refresh+'Rifresko</button><button class="pst-dash-btn primary" onclick="pstV2NewProject()">'+ICONS.plus+'Projekt i ri</button></div></div>'
    +'<div class="pst-kpis"><div class="pst-kpi" onclick="pstV2Go(\'outreach\')"><div class="pst-kpi-icon" style="--kpi-color:'+COLORS.amber+';--kpi-bg:'+COLORS.amberBg+'">'+ICONS.inbox+'</div><div><div class="pst-kpi-value" id="pst-kpi-unmatched">…</div><div class="pst-kpi-label">Emaila pa projekt</div><div class="pst-kpi-hint">Kërkojnë klasifikim</div></div></div><div class="pst-kpi" onclick="pstV2Go(\'import\')"><div class="pst-kpi-icon" style="--kpi-color:'+COLORS.green+';--kpi-bg:'+COLORS.greenBg+'">'+ICONS.projects+'</div><div><div class="pst-kpi-value" id="pst-kpi-projects">…</div><div class="pst-kpi-label">Projekte aktive</div><div class="pst-kpi-hint">Në punë ose në ofertim</div></div></div><div class="pst-kpi" onclick="pstV2Go(\'qendra\')"><div class="pst-kpi-icon" style="--kpi-color:'+COLORS.red+';--kpi-bg:'+COLORS.redBg+'">'+ICONS.warning+'</div><div><div class="pst-kpi-value" id="pst-kpi-tasks">…</div><div class="pst-kpi-label">Detyra sot ose vonuar</div><div class="pst-kpi-hint">Veprime prioritare</div></div></div><div class="pst-kpi" onclick="pstV2Go(\'rfq\')"><div class="pst-kpi-icon" style="--kpi-color:'+COLORS.blue+';--kpi-bg:'+COLORS.blueBg+'">'+ICONS.mail+'</div><div><div class="pst-kpi-value" id="pst-kpi-rfqs">…</div><div class="pst-kpi-label">RFQ pa përgjigje</div><div class="pst-kpi-hint">Furnitorë për ndjekje</div></div></div></div>'
    +'<div class="pst-dash-grid"><div><section class="pst-panel"><div class="pst-panel-hd"><div><div class="pst-panel-title">Veprimet prioritare</div><div class="pst-panel-sub">Detyra, emaila dhe ndjekje që nuk duhet të presin</div></div><button class="pst-panel-link" onclick="pstV2Go(\'qendra\')">Të gjitha</button></div><div class="pst-panel-body" id="pst-action-list">'+skeleton()+'</div></section><section class="pst-panel"><div class="pst-panel-hd"><div><div class="pst-panel-title">Projektet aktive</div><div class="pst-panel-sub">Projektet më të fundit dhe afatet e tyre</div></div><button class="pst-panel-link" onclick="pstV2Go(\'import\')">Hap projektet</button></div><div class="pst-panel-body" id="pst-project-list">'+skeleton()+'</div></section></div><div><section class="pst-panel"><div class="pst-panel-hd"><div><div class="pst-panel-title">Inbox pa projekt</div><div class="pst-panel-sub">Kërkesa dhe komunikime që duhen klasifikuar</div></div><button class="pst-panel-link" onclick="pstV2Go(\'outreach\')">Klasifiko</button></div><div class="pst-panel-body" id="pst-email-list">'+skeleton()+'</div></section><section class="pst-panel"><div class="pst-panel-hd"><div><div class="pst-panel-title">Afatet e ardhshme</div><div class="pst-panel-sub">Projektet me afat më të afërt</div></div></div><div class="pst-panel-body" id="pst-deadline-list">'+skeleton()+'</div></section></div></div></div>';
  return page;
}

function renderActions(tasks,emails,rfqs,projects){var now=new Date(),items=[];arr(tasks).forEach(function(t){var d=relDays(t.due_date);if(d!==null&&d<=3){items.push({score:d<0?100:80-d,title:t.title||'Detyrë',meta:(d<0?Math.abs(d)+' ditë vonë':d===0?'Afati sot':'Afati pas '+d+' ditësh')+(t.detail?' · '+t.detail:''),tag:d<0?'Vonuar':'Detyrë',c:d<0?COLORS.red:COLORS.amber,bg:d<0?COLORS.redBg:COLORS.amberBg,go:"pstV2Go('qendra')"});}});arr(emails).slice(0,4).forEach(function(e){items.push({score:75,title:e.subject||'(pa subjekt)',meta:(e.from_name||e.from_email||'Dërgues i panjohur')+' · email pa projekt',tag:'Inbox',c:COLORS.blue,bg:COLORS.blueBg,go:e.gmail_url?"pstV2OpenMail('"+String(e.gmail_url).replace(/'/g,"\\'")+"')":"pstV2Go('outreach')"});});arr(rfqs).forEach(function(r){if(['replied','won','lost','planned'].indexOf(String(r.status||'').toLowerCase())>-1)return;var sent=safeDate(r.last_followup_at||r.sent_at),age=sent?Math.floor((now-sent)/86400000):0;if(age>=5)items.push({score:70+Math.min(age,20),title:'Ndjekje RFQ: '+(r.supplier_name||r.supplier_email||'Furnitor'),meta:(r.project_name||'Pa projekt')+' · '+age+' ditë pa përgjigje',tag:'RFQ',c:COLORS.bronze,bg:COLORS.bronzeBg,go:"pstV2Go('rfq')"});});arr(projects).forEach(function(p){var d=relDays(p.deadline);if(activeProject(p)&&d!==null&&d>=0&&d<=10)items.push({score:65-d,title:p.name||'Projekt',meta:(p.client||'Pa klient')+' · afati '+dateLabel(p.deadline),tag:'Afat',c:COLORS.violet,bg:COLORS.violetBg,go:"pstV2OpenProject('"+String(p.id).replace(/'/g,"\\'")+"')"});});items.sort(function(a,b){return b.score-a.score;});items=items.slice(0,8);var el=document.getElementById('pst-action-list');if(!el)return;el.innerHTML=items.length?items.map(function(x){return '<div class="pst-action" style="--ac:'+x.c+';--acbg:'+x.bg+'" onclick="'+x.go+'"><span class="pst-action-dot"></span><div class="pst-action-main"><div class="pst-action-title">'+esc(x.title)+'</div><div class="pst-action-meta">'+esc(x.meta)+'</div></div><span class="pst-action-tag">'+esc(x.tag)+'</span></div>';}).join(''):'<div class="pst-empty">Nuk ka veprime urgjente për momentin.</div>';}
function renderProjects(projects){var list=arr(projects).filter(activeProject).sort(function(a,b){var da=safeDate(a.deadline),db=safeDate(b.deadline);if(da&&db)return da-db;if(da)return-1;if(db)return 1;return String(b.created_at||'').localeCompare(String(a.created_at||''));}).slice(0,7);var el=document.getElementById('pst-project-list');if(!el)return;el.innerHTML=list.length?list.map(function(p){var st=statusInfo(p.status),d=relDays(p.deadline),dl=p.deadline?(d<0?Math.abs(d)+'d vonë':dateLabel(p.deadline)):'Pa afat';return '<div class="pst-project" onclick="pstV2OpenProject(\''+esc(p.id)+'\')"><div><div class="pst-project-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-project-client">'+esc(p.client||'Pa klient')+(p.ref?' · '+esc(p.ref):'')+'</div></div><span class="pst-status" style="--st-color:'+st.c+';--st-bg:'+st.bg+'">'+esc(st.label)+'</span><div class="pst-deadline">'+esc(dl)+'</div><span class="pst-project-arrow">'+ICONS.arrow+'</span></div>';}).join(''):'<div class="pst-empty">Nuk ka projekte aktive.</div>';}
function renderEmails(emails){var list=arr(emails).slice(0,6),el=document.getElementById('pst-email-list');if(!el)return;el.innerHTML=list.length?list.map(function(e){var who=e.from_name||e.from_email||'?',url=String(e.gmail_url||'').replace(/'/g,"\\'");return '<div class="pst-mailrow"><div class="pst-mail-avatar">'+esc(initials(who))+'</div><div class="pst-mail-main"><div class="pst-mail-subject">'+esc(e.subject||'(pa subjekt)')+'</div><div class="pst-mail-meta">'+esc(who)+' · '+esc(fullDate(e.sent_at))+'</div></div><button class="pst-mail-open" onclick="event.stopPropagation();pstV2OpenMail(\''+url+'\')">Hap</button></div>';}).join(''):'<div class="pst-empty">Të gjithë emailat janë lidhur me projekte.</div>';}
function renderDeadlines(projects){var list=arr(projects).filter(function(p){return activeProject(p)&&safeDate(p.deadline);}).sort(function(a,b){return safeDate(a.deadline)-safeDate(b.deadline);}).slice(0,6),el=document.getElementById('pst-deadline-list');if(!el)return;var months=['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nën','Dhj'];el.innerHTML=list.length?list.map(function(p){var d=safeDate(p.deadline),n=relDays(p.deadline),meta=n<0?Math.abs(n)+' ditë vonë':n===0?'Sot':n===1?'Nesër':'Pas '+n+' ditësh';return '<div class="pst-deadline-row" onclick="pstV2OpenProject(\''+esc(p.id)+'\')" style="cursor:pointer"><div class="pst-datebox"><div class="pst-date-day">'+d.getDate()+'</div><div class="pst-date-mon">'+months[d.getMonth()]+'</div></div><div class="pst-deadline-main"><div class="pst-deadline-title">'+esc(p.name||'Projekt')+'</div><div class="pst-deadline-meta">'+esc(p.client||'Pa klient')+' · '+esc(meta)+'</div></div></div>';}).join(''):'<div class="pst-empty">Nuk ka afate të regjistruara.</div>';}

async function renderDashboard(){dashboardShell();updateNav('home');if(typeof window.supaFetch!=='function'){setTimeout(renderDashboard,700);return;}try{var out=await Promise.all([window.supaFetch('tasks?status=eq.hapur&select=*&order=due_date.asc&limit=80').catch(function(){return[];}),window.supaFetch('projects?select=*&order=created_at.desc&limit=150').catch(function(){return[];}),window.supaFetch('project_emails?project_id=is.null&select=*&order=sent_at.desc&limit=40').catch(function(){return[];}),window.supaFetch('rfq_log?select=*&order=sent_at.desc&limit=150').catch(function(){return[];})]);var tasks=arr(out[0]),projects=arr(out[1]),emails=arr(out[2]),rfqs=arr(out[3]);var due=tasks.filter(function(t){var d=relDays(t.due_date);return d!==null&&d<=0;}).length,active=projects.filter(activeProject).length,waiting=rfqs.filter(function(r){return ['replied','won','lost','planned'].indexOf(String(r.status||'').toLowerCase())<0;}).length;setText('pst-kpi-unmatched',emails.length);setText('pst-kpi-projects',active);setText('pst-kpi-tasks',due);setText('pst-kpi-rfqs',waiting);setBadge('pst-nav-inbox-count',emails.length);setBadge('pst-nav-project-count',active);setBadge('pst-nav-task-count',due);renderActions(tasks,emails,rfqs,projects);renderProjects(projects);renderEmails(emails);renderDeadlines(projects);}catch(err){['pst-action-list','pst-project-list','pst-email-list','pst-deadline-list'].forEach(function(id){var e=document.getElementById(id);if(e)e.innerHTML='<div class="pst-empty">Nuk u ngarkuan të dhënat. Provo Rifresko.</div>';});console.error('PRISTEEL dashboard:',err);}}
window.pstV2RenderDashboard=renderDashboard;

function wrapNavigation(){if(typeof window.showPage==='function'&&!window.showPage.__pstV2){var originalShow=window.showPage;window.showPage=function(page){var r=originalShow.apply(this,arguments);setTimeout(function(){updateNav(page);},0);return r;};window.showPage.__pstV2=true;}if(typeof window.goHome==='function'&&!window.goHome.__pstV2){var originalHome=window.goHome;window.goHome=function(){var r=originalHome.apply(this,arguments);setTimeout(renderDashboard,0);return r;};window.goHome.__pstV2=true;}if(typeof window.renderHome==='function'&&!window.renderHome.__pstV2){window.renderHome=renderDashboard;window.renderHome.__pstV2=true;}}
function init(){document.body.classList.add('pst-ui-v2');buildSidebar();wrapNavigation();var active=document.querySelector('.page.active');if(active&&active.id==='page-home')renderDashboard();else if(active)updateNav(active.id.replace(/^page-/,''));}
var tries=0,timer=setInterval(function(){var shell=document.getElementById('app-shell-root');if(shell&&document.getElementById('app-sidebar')){clearInterval(timer);init();}else if(++tries>120)clearInterval(timer);},250);

})();
