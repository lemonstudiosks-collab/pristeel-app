/* PRISTEEL Mobile Home v2
 * Phone/tablet-only Home presentation approved for the PriSteel mobile experience.
 * Keeps canonical PPPP navigation in the fixed bottom bar and makes Home an
 * information surface: Ask PPPP, weather/date, steel-market references and
 * compact business utilities.
 *
 * Safety:
 * - no Supabase reads/writes
 * - no PPPP business-state ownership
 * - no polling, DOM ownership observer or service worker
 * - one cached public weather request (Open-Meteo) only
 * - steel prices shown are clearly dated public sample values; source opens on tap
 */
(function(){
'use strict';
if(window.__pstMobileHomeV2)return;
window.__pstMobileHomeV2=true;
window.__pstMobileHomeV1=true;

var VERSION='20260926-market-home1';
var weatherPromise=null;
var WEATHER_CACHE='pst_mobile_weather_cache_v1';
var WEATHER_TTL=30*60*1000;

var MARKET=[
  {label:'Hot Rolled Coil (HRC)',value:'$504.5/t',delta:'+0.40%',tone:'up',date:'25.08.2026',url:'https://www.steelorbis.com/steel-market/hot-rolled-coil.htm'},
  {label:'Rebar',value:'$592.5/t',delta:'+1.72%',tone:'up',date:'26.08.2026',url:'https://www.steelorbis.com/steel-market/rebar.htm'},
  {label:'Scrap (HMS I/II)',value:'$372/t',delta:'0.00%',tone:'flat',date:'25.08.2026',url:'https://www.steelorbis.com/steel-market/scrap.htm'},
  {label:'EU Steel',value:'€730/t',delta:'0.00%',tone:'flat',date:'25.08.2026',url:'https://www.steelorbis.com/steel-market/eu.htm'}
];

var SOURCES={
  steelbenchmarker:'https://steelbenchmarker.com/',
  news:'https://www.steelorbis.com/steel-news/latest-news/',
  weather:'https://www.meteoblue.com/en/weather/week/pristina_kosovo_786714',
  transport:'https://fbx.freightos.com/'
};

function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function compact(){var iw=Number(window.innerWidth||9999),sw=Number(window.screen&&window.screen.width||9999);return Math.min(iw,sw)<=900;}
function home(){return document.getElementById('page-workspace-home');}
function homeActive(){var p=home();return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function greeting(){var h=new Date().getHours();return h<12?'Mirëmëngjes':h<18?'Mirëdita':'Mirëmbrëma';}
function session(){
  try{if(typeof window.authGetSession==='function'){var s=window.authGetSession();if(s)return s;}}catch(e){}
  try{return JSON.parse(localStorage.getItem('pristeel_session')||'null')||{};}catch(e){return{};}
}
function jwtPayload(tok){try{var p=S(tok).split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(p.length%4)p+='=';return JSON.parse(atob(p));}catch(e){return{};}}
function userIdentity(){
  var s=session()||{},u=s.user||{},meta=u.user_metadata||{},jp=jwtPayload(s.access_token||'');
  var full=S(meta.full_name||meta.name||u.full_name||s.full_name).trim();
  var email=S(u.email||s.email||jp.email).trim();
  var first=full.split(/\s+/)[0]||'';
  if(!first&&email){
    var local=email.split('@')[0].split(/[._-]/)[0].replace(/[0-9]+/g,'');
    if(/^arianit/i.test(local))first='Arianit';
    else if(local&&!/^(sales|info|office|admin|contact)$/i.test(local))first=local.charAt(0).toUpperCase()+local.slice(1);
  }
  var base=full||first||email||'P';
  var initials=base.split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x.charAt(0).toUpperCase();}).join('')||'P';
  return{first:first,initials:initials};
}
function svg(name){
  var p={
    search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    sparkle:'<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/>',
    pin:'<path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/>',
    calendar:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chart:'<path d="M5 19V11M10 19V6M15 19V9M20 19V4"/>',
    tool:'<path d="M14 6a4 4 0 0 0-5.3 5.3L3 17l4 4 5.7-5.7A4 4 0 0 0 18 10l-3 3-4-4 3-3Z"/>',
    scale:'<path d="M6 7h12l2 13H4L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/><path d="M12 10v4"/>',
    ruler:'<path d="M4 7h16v10H4z"/><path d="M7 7v4M10 7v2M13 7v4M16 7v2"/>',
    doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
    edit:'<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    cloud:'<path d="M6 18h11a4 4 0 0 0 .4-8A6 6 0 0 0 6 12a3 3 0 0 0 0 6Z"/><path d="M8 4v2M3.5 7.5 5 9M12.5 7.5 14 6"/>',
    truck:'<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    arrow:'<path d="m9 6 6 6-6 6"/>',
    external:'<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
    close:'<path d="M6 6l12 12M18 6 6 18"/>'
  }[name]||'';
  return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
}

function installCss(){
  if(document.getElementById('pst-mobile-home-v2-css'))return;
  var s=document.createElement('style');s.id='pst-mobile-home-v2-css';s.textContent=`
#pst-mobile-home-v1{display:none}
body.pst-mobile-home-active:has(#page-workspace-home.active) #app-shell-root{display:block!important;grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:100%!important}
body.pst-mobile-home-active:has(#page-workspace-home.active) #app-sidebar,
body.pst-mobile-home-active:has(#page-workspace-home.active) #pst-v2-sidebar,
body.pst-mobile-home-active:has(#page-workspace-home.active) #pst-ws-sidebar{display:none!important;visibility:hidden!important;width:0!important;min-width:0!important;max-width:0!important;flex:0 0 0!important}
body.pst-mobile-home-active:has(#page-workspace-home.active) #app-shell-root>.main{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important}
body.pst-mobile-home-active:has(#page-workspace-home.active) .content{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0 0 calc(78px + env(safe-area-inset-bottom))!important}
body.pst-mobile-home-active:has(#page-workspace-home.active) .topbar{display:none!important}
body.pst-mobile-home-active #page-workspace-home{display:block!important;width:100%!important;max-width:none!important;min-height:100dvh!important;margin:0!important;padding:0!important;background:#F8FAFA!important}
body.pst-mobile-home-active #page-workspace-home>*:not(#pst-mobile-home-v1){display:none!important}
body.pst-mobile-home-active #pst-mobile-home-v1{display:block!important;width:100%!important;max-width:560px!important;margin:0 auto!important;padding:12px 12px 16px!important;color:#172A34!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important}
#pst-mobile-home-v1 *{box-sizing:border-box}
.pmh-appbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 2px 10px}.pmh-brand{display:flex;align-items:center;gap:10px;min-width:0}.pmh-logo{width:42px;height:42px;border-radius:12px;background:linear-gradient(145deg,#50B0C7,#2586A4);color:#fff;display:grid;place-items:center;font-size:19px;font-weight:800;box-shadow:0 7px 18px rgba(43,132,161,.2)}.pmh-brand-copy b{display:block;font-size:18px;line-height:1;color:#1E323A;letter-spacing:.2px}.pmh-brand-copy span{display:block;margin-top:4px;color:#879399;font-size:11px}.pmh-avatar{width:38px;height:38px;border:1px solid #CEE4EA;border-radius:50%;background:#F1F9FB;color:#397F96;display:grid;place-items:center;font-size:11px;font-weight:800}
.pmh-welcome{position:relative;overflow:hidden;border:1px solid #E0ECEF;border-radius:17px;background:linear-gradient(135deg,#F5FBFC 0%,#EAF7FA 100%);padding:17px 16px 16px}.pmh-welcome:after{content:"";position:absolute;width:150px;height:150px;border-radius:50%;right:-58px;top:-80px;background:rgba(80,176,199,.08)}.pmh-welcome h1{position:relative;z-index:1;margin:0;font-size:25px;line-height:1.08;letter-spacing:-.55px;color:#1B2D35}.pmh-welcome p{position:relative;z-index:1;margin:8px 0 0;color:#76858C;font-size:12.5px}
.pmh-search{width:100%;margin:9px 0;border:1px solid #CFE3E9;border-radius:15px;background:#fff;min-height:56px;padding:0 9px 0 15px;display:flex;align-items:center;gap:12px;color:#667980;box-shadow:0 8px 18px rgba(37,69,80,.05);cursor:pointer;text-align:left}.pmh-search>svg{width:22px;height:22px;fill:none;stroke:#4D6670;stroke-width:1.8;flex:0 0 auto}.pmh-search>span{flex:1;font-size:16px;color:#7C888E}.pmh-search i{width:40px;height:40px;border-radius:12px;background:#E7F5F9;color:#218CAA;display:grid;place-items:center;font-style:normal}.pmh-search i svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.7}
.pmh-info-grid{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(0,.82fr);gap:8px;margin-bottom:8px}.pmh-info{min-width:0;border:1px solid #E1E9EB;border-radius:16px;background:#fff;padding:12px;box-shadow:0 5px 15px rgba(42,73,84,.025)}.pmh-info-title{display:flex;align-items:center;gap:7px;color:#23363E;font-size:11px;font-weight:750}.pmh-info-title span:first-child{width:28px;height:28px;border-radius:9px;background:#E7F5FA;color:#218FB0;display:grid;place-items:center}.pmh-info-title svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8}.pmh-weather{cursor:pointer;text-align:left}.pmh-weather-main{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:7px}.pmh-weather-temp{font-size:31px;font-weight:780;line-height:1;color:#17303A;letter-spacing:-.8px}.pmh-weather-icon{font-size:39px;line-height:1}.pmh-weather-desc{margin-top:6px;color:#596E77;font-size:11px}.pmh-weather-range{margin-top:7px;color:#89959A;font-size:10px}.pmh-date-day{margin-top:7px;font-size:13px;font-weight:750;color:#21353D}.pmh-date-full{margin-top:3px;color:#7E8B90;font-size:10px}.pmh-time-pill{display:flex;align-items:center;gap:6px;margin-top:9px;background:#EAF6FA;color:#277E99;border-radius:10px;padding:7px 9px;font-size:13px;font-weight:760}.pmh-time-pill svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.pmh-dayline{margin-top:9px;color:#5F737B;font-size:10px;line-height:1.35}
.pmh-card{border:1px solid #E0E8EA;border-radius:16px;background:#fff;overflow:hidden;margin-bottom:8px;box-shadow:0 5px 16px rgba(42,73,84,.03)}.pmh-card-head{display:flex;align-items:center;gap:8px;padding:10px 11px 8px}.pmh-card-head-icon{width:30px;height:30px;border-radius:9px;background:#E7F5FA;color:#238DB0;display:grid;place-items:center;flex:0 0 auto}.pmh-card-head-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9}.pmh-card-head b{font-size:13px;color:#1F343C}.pmh-card-link{margin-left:auto;border:0;background:transparent;color:#2385A1;font-size:10px;font-weight:760;cursor:pointer;padding:3px}
.pmh-market-list{padding:0 11px 7px}.pmh-market-row{width:100%;border:0;border-top:1px solid #EDF1F2;background:#fff;min-height:39px;padding:5px 0;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;text-align:left;cursor:pointer}.pmh-market-row:first-child{border-top:0}.pmh-market-name{font-size:10.5px;color:#283D45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmh-market-value{font-size:11px;font-weight:760;color:#243841}.pmh-market-delta{min-width:54px;text-align:right;font-size:10px;font-weight:750}.pmh-market-delta.up{color:#159860}.pmh-market-delta.down{color:#D95757}.pmh-market-delta.flat{color:#819096}.pmh-market-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #EDF1F2;padding:7px 11px 9px;color:#8A969B;font-size:8.7px}.pmh-market-foot b{color:#607982;font-weight:650}
.pmh-lower-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pmh-mini{border:1px solid #E0E8EA;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 5px 16px rgba(42,73,84,.025)}.pmh-mini-head{display:flex;align-items:center;gap:7px;padding:10px 10px 7px;border-bottom:1px solid #EDF1F2}.pmh-mini-icon{width:29px;height:29px;border-radius:9px;background:#EAF5FF;color:#237EBD;display:grid;place-items:center}.pmh-mini-icon.blue2{background:#E9F4FF;color:#2A78B6}.pmh-mini-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9}.pmh-mini-head b{min-width:0;font-size:11px;color:#233840;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmh-mini-head .pmh-chevron{margin-left:auto;color:#2583A0}.pmh-mini-head .pmh-chevron svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.9}.pmh-mini-list{padding:0 9px 6px}.pmh-mini-row{width:100%;min-height:35px;border:0;border-top:1px solid #EEF2F3;background:#fff;padding:4px 0;display:grid;grid-template-columns:23px minmax(0,1fr);gap:7px;align-items:center;text-align:left;color:#2A3E46;cursor:pointer}.pmh-mini-row:first-child{border-top:0}.pmh-mini-row:active{background:#F6FAFB}.pmh-mini-row span:first-child{color:#2681A0;display:grid;place-items:center}.pmh-mini-row svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}.pmh-mini-row em{font-style:normal;font-size:9.5px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pmh-sheet-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(17,34,41,.35);display:flex;align-items:flex-end;justify-content:center;padding:12px}.pmh-sheet{width:min(520px,100%);background:#fff;border-radius:20px 20px 16px 16px;box-shadow:0 20px 50px rgba(20,45,55,.22);padding:14px}.pmh-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.pmh-sheet-head b{font-size:16px;color:#1E333B}.pmh-sheet-close{width:34px;height:34px;border:0;border-radius:10px;background:#F0F5F6;color:#50666F;display:grid;place-items:center}.pmh-sheet-close svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2}.pmh-form{display:grid;gap:10px;margin-top:12px}.pmh-form label{display:grid;gap:5px;color:#6A7C83;font-size:10px}.pmh-form input,.pmh-form textarea{width:100%;border:1px solid #DCE7EA;border-radius:11px;background:#FBFCFC;padding:10px 11px;color:#20343C;font:inherit;font-size:13px;outline:none}.pmh-form textarea{min-height:120px;resize:vertical}.pmh-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pmh-result{border-radius:12px;background:#EEF7FA;padding:12px;color:#256E86;font-size:13px;font-weight:750}.pmh-primary{height:42px;border:0;border-radius:11px;background:#2E8EAA;color:#fff;font-size:12px;font-weight:760}.pmh-note{margin-top:7px;color:#8A969B;font-size:9px;line-height:1.4}
@media(max-width:390px){body.pst-mobile-home-active #pst-mobile-home-v1{padding-left:9px!important;padding-right:9px!important}.pmh-welcome h1{font-size:23px}.pmh-weather-temp{font-size:28px}.pmh-info{padding:10px}.pmh-mini-head b{font-size:10.5px}.pmh-mini-row em{font-size:9px}.pmh-market-name{font-size:10px}}
`;document.head.appendChild(s);
}

function shellFix(){
  var app=document.getElementById('app-shell-root'),side=document.getElementById('app-sidebar'),main=document.querySelector('#app-shell-root>.main,.app-shell>.main');
  if(app){app.style.setProperty('display','block','important');app.style.setProperty('grid-template-columns','minmax(0,1fr)','important');app.style.setProperty('width','100%','important');app.style.setProperty('max-width','100%','important');}
  if(side){side.style.setProperty('display','none','important');side.style.setProperty('visibility','hidden','important');side.style.setProperty('width','0','important');side.style.setProperty('min-width','0','important');side.style.setProperty('max-width','0','important');}
  ['pst-v2-sidebar','pst-ws-sidebar'].forEach(function(id){var el=document.getElementById(id);if(el){el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important');}});
  if(main){main.style.setProperty('width','100%','important');main.style.setProperty('max-width','100%','important');main.style.setProperty('min-width','0','important');main.style.setProperty('margin','0','important');}
}
function clearShellFix(){
  var app=document.getElementById('app-shell-root'),side=document.getElementById('app-sidebar'),main=document.querySelector('#app-shell-root>.main,.app-shell>.main');
  if(app)['display','grid-template-columns','width','max-width'].forEach(function(p){app.style.removeProperty(p);});
  if(side)['display','visibility','width','min-width','max-width'].forEach(function(p){side.style.removeProperty(p);});
  ['pst-v2-sidebar','pst-ws-sidebar'].forEach(function(id){var el=document.getElementById(id);if(el){el.style.removeProperty('display');el.style.removeProperty('visibility');}});
  if(main)['width','max-width','min-width','margin'].forEach(function(p){main.style.removeProperty(p);});
}

function marketRows(){
  return MARKET.map(function(x,i){
    return '<button type="button" class="pmh-market-row" data-pmh-market="'+i+'"><span class="pmh-market-name">'+E(x.label)+'</span><span class="pmh-market-value">'+E(x.value)+'</span><span class="pmh-market-delta '+E(x.tone)+'">'+(x.tone==='up'?'▲ ':x.tone==='down'?'▼ ':'')+E(x.delta)+'</span></button>';
  }).join('');
}
function markup(){
  var id=userIdentity(),name=id.first?(', '+E(id.first)):'';
  return '<div class="pmh-appbar"><div class="pmh-brand"><span class="pmh-logo">P</span><span class="pmh-brand-copy"><b>PRISTEEL</b><span>Platforma</span></span></div><span class="pmh-avatar" aria-label="Përdoruesi">'+E(id.initials)+'</span></div>'
  +'<section class="pmh-welcome"><h1>'+E(greeting())+name+' 👋</h1><p>Ja çfarë po ndodh sot në treg.</p></section>'
  +'<button type="button" class="pmh-search" data-pmh-search>'+svg('search')+'<span>Pyet PPPP…</span><i>'+svg('sparkle')+'</i></button>'
  +'<div class="pmh-info-grid">'
    +'<button type="button" class="pmh-info pmh-weather" data-pmh-weather><div class="pmh-info-title"><span>'+svg('pin')+'</span><b>Prishtinë</b></div><div class="pmh-weather-main"><span class="pmh-weather-temp" data-pmh-weather-temp>--°C</span><span class="pmh-weather-icon" data-pmh-weather-icon>🌤️</span></div><div class="pmh-weather-desc" data-pmh-weather-desc>Duke marrë motin…</div><div class="pmh-weather-range" data-pmh-weather-range>H: --° · L: --°</div></button>'
    +'<section class="pmh-info"><div class="pmh-info-title"><span>'+svg('calendar')+'</span><b data-pmh-weekday>Sot</b></div><div class="pmh-date-full" data-pmh-date></div><div class="pmh-time-pill">'+svg('clock')+'<span data-pmh-time>--:--</span></div><div class="pmh-dayline">Një ditë e mbarë<br>për punë të mëdha.</div></section>'
  +'</div>'
  +'<section class="pmh-card"><div class="pmh-card-head"><span class="pmh-card-head-icon">'+svg('chart')+'</span><b>Tregu i Çelikut</b><button type="button" class="pmh-card-link" data-pmh-market-all>Shiko më shumë →</button></div><div class="pmh-market-list">'+marketRows()+'</div><div class="pmh-market-foot"><span>Mostra publike e fundit</span><b>SteelOrbis · 25–26.08.2026</b></div></section>'
  +'<div class="pmh-lower-grid">'
    +'<section class="pmh-mini"><div class="pmh-mini-head"><span class="pmh-mini-icon">'+svg('tool')+'</span><b>Mjete të dobishme</b><span class="pmh-chevron">'+svg('arrow')+'</span></div><div class="pmh-mini-list">'
      +'<button type="button" class="pmh-mini-row" data-pmh-tool="weight"><span>'+svg('scale')+'</span><em>Kalkulator peshe</em></button>'
      +'<button type="button" class="pmh-mini-row" data-pmh-tool="convert"><span>'+svg('ruler')+'</span><em>Konvertues mm ↔ inch</em></button>'
      +'<button type="button" class="pmh-mini-row" data-pmh-tool="incoterms"><span>'+svg('doc')+'</span><em>Incoterms</em></button>'
      +'<button type="button" class="pmh-mini-row" data-pmh-tool="note"><span>'+svg('edit')+'</span><em>Shënim i shpejtë</em></button>'
    +'</div></section>'
    +'<section class="pmh-mini"><div class="pmh-mini-head"><span class="pmh-mini-icon blue2">'+svg('doc')+'</span><b>Burime të tregut</b><span class="pmh-chevron">'+svg('arrow')+'</span></div><div class="pmh-mini-list">'
      +'<button type="button" class="pmh-mini-row" data-pmh-source="steelbenchmarker"><span>'+svg('chart')+'</span><em>SteelBenchmarker</em></button>'
      +'<button type="button" class="pmh-mini-row" data-pmh-source="news"><span>'+svg('doc')+'</span><em>Lajmet e industrisë</em></button>'
      +'<button type="button" class="pmh-mini-row" data-pmh-source="weather"><span>'+svg('cloud')+'</span><em>Moti</em></button>'
      +'<button type="button" class="pmh-mini-row" data-pmh-source="transport"><span>'+svg('truck')+'</span><em>Transporti</em></button>'
    +'</div></section>'
  +'</div>';
}

function updateClock(root){
  var d=new Date(),days=['E Diel','E Hënë','E Martë','E Mërkurë','E Enjte','E Premte','E Shtunë'],months=['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor'];
  var w=root.querySelector('[data-pmh-weekday]'),date=root.querySelector('[data-pmh-date]'),time=root.querySelector('[data-pmh-time]');
  if(w)w.textContent=days[d.getDay()];
  if(date)date.textContent=d.getDate()+' '+months[d.getMonth()]+' '+d.getFullYear();
  if(time)time.textContent=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function weatherText(code){
  code=Number(code);
  if(code===0)return{label:'Me diell',icon:'☀️'};
  if(code===1||code===2)return{label:'Pjesërisht me re',icon:'🌤️'};
  if(code===3)return{label:'Me re',icon:'☁️'};
  if(code===45||code===48)return{label:'Mjegull',icon:'🌫️'};
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].indexOf(code)>=0)return{label:'Shi',icon:'🌧️'};
  if([71,73,75,77,85,86].indexOf(code)>=0)return{label:'Borë',icon:'🌨️'};
  if([95,96,99].indexOf(code)>=0)return{label:'Stuhi',icon:'⛈️'};
  return{label:'Moti i sotëm',icon:'🌤️'};
}
function renderWeather(root,data){
  if(!root||!data)return;
  var current=data.current||{},daily=data.daily||{},meta=weatherText(current.weather_code);
  var t=root.querySelector('[data-pmh-weather-temp]'),i=root.querySelector('[data-pmh-weather-icon]'),d=root.querySelector('[data-pmh-weather-desc]'),r=root.querySelector('[data-pmh-weather-range]');
  if(t&&Number.isFinite(Number(current.temperature_2m)))t.textContent=Math.round(Number(current.temperature_2m))+'°C';
  if(i)i.textContent=meta.icon;
  if(d)d.textContent=meta.label;
  var hi=Array.isArray(daily.temperature_2m_max)?Number(daily.temperature_2m_max[0]):NaN,lo=Array.isArray(daily.temperature_2m_min)?Number(daily.temperature_2m_min[0]):NaN;
  if(r&&Number.isFinite(hi)&&Number.isFinite(lo))r.textContent='H: '+Math.round(hi)+'° · L: '+Math.round(lo)+'°';
}
function cachedWeather(){
  try{var x=JSON.parse(localStorage.getItem(WEATHER_CACHE)||'null');if(x&&x.at&&x.data&&Date.now()-Number(x.at)<WEATHER_TTL)return x.data;}catch(e){}
  return null;
}
function saveWeather(data){try{localStorage.setItem(WEATHER_CACHE,JSON.stringify({at:Date.now(),data:data}));}catch(e){}}
function loadWeather(root){
  var c=cachedWeather();if(c){renderWeather(root,c);return Promise.resolve(c);}
  if(weatherPromise)return weatherPromise.then(function(x){renderWeather(root,x);return x;});
  var url='https://api.open-meteo.com/v1/forecast?latitude=42.6629&longitude=21.1655&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto';
  weatherPromise=fetch(url,{cache:'no-store'}).then(function(res){if(!res.ok)throw new Error('weather '+res.status);return res.json();}).then(function(data){saveWeather(data);renderWeather(root,data);return data;}).catch(function(){
    var d=root&&root.querySelector('[data-pmh-weather-desc]');if(d)d.textContent='Moti nuk u ngarkua';
    return null;
  }).finally(function(){weatherPromise=null;});
  return weatherPromise;
}
function openExternal(url){if(!url)return false;try{window.open(url,'_blank','noopener');return true;}catch(e){window.location.href=url;return true;}}
function openSearch(){try{if(typeof window.pstWsSearch==='function')return window.pstWsSearch();if(typeof window.openCmdK==='function')return window.openCmdK();}catch(e){}return false;}

function closeSheet(node){if(node&&node.parentNode)node.parentNode.removeChild(node);}
function openSheet(title,body){
  var old=document.querySelector('.pmh-sheet-backdrop');if(old)closeSheet(old);
  var back=document.createElement('div');back.className='pmh-sheet-backdrop';
  back.innerHTML='<section class="pmh-sheet" role="dialog" aria-modal="true"><div class="pmh-sheet-head"><b>'+E(title)+'</b><button type="button" class="pmh-sheet-close" data-pmh-sheet-close>'+svg('close')+'</button></div>'+body+'</section>';
  back.addEventListener('click',function(e){if(e.target===back||e.target.closest('[data-pmh-sheet-close]'))closeSheet(back);});
  document.body.appendChild(back);return back;
}
function weightTool(){
  var back=openSheet('Kalkulator peshe','<div class="pmh-form"><div class="pmh-form-grid"><label>Gjatësia (mm)<input type="number" inputmode="decimal" data-w-l placeholder="6000"></label><label>Gjerësia (mm)<input type="number" inputmode="decimal" data-w-w placeholder="2000"></label><label>Trashësia (mm)<input type="number" inputmode="decimal" data-w-t placeholder="10"></label><label>Sasia<input type="number" inputmode="numeric" min="1" value="1" data-w-q></label></div><div class="pmh-result" data-w-result>Fut dimensionet për të llogaritur peshën.</div><div class="pmh-note">Llogaritje për pllakë çeliku me dendësi 7,850 kg/m³.</div></div>');
  function calc(){var l=Number(back.querySelector('[data-w-l]').value),w=Number(back.querySelector('[data-w-w]').value),t=Number(back.querySelector('[data-w-t]').value),q=Number(back.querySelector('[data-w-q]').value||1),out=back.querySelector('[data-w-result]');if(!(l>0&&w>0&&t>0&&q>0)){out.textContent='Fut dimensionet për të llogaritur peshën.';return;}var kg=l*w*t*0.00000785*q;out.textContent='Pesha: '+kg.toLocaleString('sq-AL',{maximumFractionDigits:2})+' kg';}
  back.querySelectorAll('input').forEach(function(x){x.addEventListener('input',calc);});
}
function converterTool(){
  var back=openSheet('Konvertues mm ↔ inch','<div class="pmh-form"><label>Milimetra<input type="number" inputmode="decimal" data-c-mm placeholder="25.4"></label><label>Inch<input type="number" inputmode="decimal" data-c-in placeholder="1"></label><div class="pmh-note">1 inch = 25.4 mm</div></div>');
  var mm=back.querySelector('[data-c-mm]'),inch=back.querySelector('[data-c-in]'),busy=false;
  mm.addEventListener('input',function(){if(busy)return;busy=true;var v=Number(mm.value);inch.value=Number.isFinite(v)?String(Math.round((v/25.4)*10000)/10000):'';busy=false;});
  inch.addEventListener('input',function(){if(busy)return;busy=true;var v=Number(inch.value);mm.value=Number.isFinite(v)?String(Math.round((v*25.4)*10000)/10000):'';busy=false;});
}
function noteTool(){
  var saved='';try{saved=localStorage.getItem('pst_quick_note_v1')||'';}catch(e){}
  var back=openSheet('Shënim i shpejtë','<div class="pmh-form"><label>Shënimi<textarea data-pmh-note>'+E(saved)+'</textarea></label><button type="button" class="pmh-primary" data-pmh-note-save>Ruaje në këtë pajisje</button><div class="pmh-note" data-pmh-note-status>Ky shënim është lokal dhe nuk regjistrohet në PPPP.</div></div>');
  back.querySelector('[data-pmh-note-save]').addEventListener('click',function(){var v=back.querySelector('[data-pmh-note]').value;try{localStorage.setItem('pst_quick_note_v1',v);back.querySelector('[data-pmh-note-status]').textContent='U ruajt në këtë pajisje.';}catch(e){back.querySelector('[data-pmh-note-status]').textContent='Nuk u ruajt në pajisje.';}});
}
function tool(kind){
  if(kind==='weight')return weightTool();
  if(kind==='convert')return converterTool();
  if(kind==='incoterms')return openExternal('https://iccwbo.org/business-solutions/incoterms-rules/');
  if(kind==='note')return noteTool();
  return false;
}
function bind(root){
  if(root.dataset.pmhBound==='1')return;root.dataset.pmhBound='1';
  root.addEventListener('click',function(e){
    var x=e.target.closest('[data-pmh-search]');if(x){openSearch();return;}
    x=e.target.closest('[data-pmh-weather]');if(x){openExternal(SOURCES.weather);return;}
    x=e.target.closest('[data-pmh-market-all]');if(x){openExternal('https://www.steelorbis.com/steel-prices/daily-prices/');return;}
    x=e.target.closest('[data-pmh-market]');if(x){var m=MARKET[Number(x.getAttribute('data-pmh-market'))];if(m)openExternal(m.url);return;}
    x=e.target.closest('[data-pmh-tool]');if(x){tool(x.getAttribute('data-pmh-tool'));return;}
    x=e.target.closest('[data-pmh-source]');if(x){openExternal(SOURCES[x.getAttribute('data-pmh-source')]);return;}
  });
}
function ensure(){
  installCss();
  var on=compact()&&homeActive();
  if(!on){document.body&&document.body.classList.remove('pst-mobile-home-active');if(!compact())clearShellFix();return false;}
  document.body&&document.body.classList.add('pst-mobile-home-active');shellFix();
  var host=home();if(!host)return false;
  var root=document.getElementById('pst-mobile-home-v1');
  if(!root){root=document.createElement('section');root.id='pst-mobile-home-v1';root.setAttribute('aria-label','Ballina mobile e PRISTEEL');host.insertBefore(root,host.firstChild||null);}
  else if(root.parentNode!==host){host.insertBefore(root,host.firstChild||null);}
  if(root.dataset.pmhVersion!==VERSION){root.innerHTML=markup();root.dataset.pmhVersion=VERSION;root.dataset.pmhBound='';}
  bind(root);updateClock(root);loadWeather(root);return true;
}
function schedule(){[0,90,260,720,1500].forEach(function(ms){setTimeout(ensure,ms);});}
function boot(){installCss();schedule();}
document.addEventListener('pst:modules-ready',schedule);
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:native-home-ready',schedule);
document.addEventListener('pst:page-opened',schedule);
window.addEventListener('pageshow',schedule);
window.addEventListener('focus',schedule);
window.addEventListener('resize',function(){setTimeout(ensure,80);});
window.addEventListener('orientationchange',function(){setTimeout(ensure,120);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.PSTMobileHomeV1={version:VERSION,render:ensure,refresh:function(){var r=document.getElementById('pst-mobile-home-v1');if(r){updateClock(r);loadWeather(r);}return !!r;},_test:{compact:compact,homeActive:homeActive,userIdentity:userIdentity,market:MARKET,weatherText:weatherText}};
})();
