/* PRISTEEL Mobile Home v1
 * Mobile/tablet-only Home presentation matching the approved compact dashboard concept.
 * Reuses existing in-memory Home/Opportunities snapshots and canonical routes.
 * No Supabase reads/writes, polling, service workers or outbound actions.
 */
(function(){
'use strict';
if(window.__pstMobileHomeV1)return;
window.__pstMobileHomeV1=true;

function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function compact(){var iw=Number(window.innerWidth||9999),sw=Number(window.screen&&window.screen.width||9999);return Math.min(iw,sw)<=900;}
function home(){return document.getElementById('page-workspace-home');}
function homeActive(){var p=home();return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function api(){return window.PSTHomeMorningCommandCenterV1||null;}
function snap(){try{var x=api();return x&&typeof x.snapshot==='function'?x.snapshot():{actions:[],waiting:[],projects:[]};}catch(e){return{actions:[],waiting:[],projects:[]};}}
function opportunities(){try{var x=api(),t=x&&x._test;return t&&typeof t.opportunitySnapshot==='function'?t.opportunitySnapshot():{total:0,new:0,decision:0,draft:0};}catch(e){return{total:0,new:0,decision:0,draft:0};}}
function route(key){try{if(window.PSTMobileResponsiveV1&&typeof window.PSTMobileResponsiveV1.route==='function')return window.PSTMobileResponsiveV1.route(key);if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo(key);return true;}}catch(e){}return false;}
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
function projectId(p){return S(p&&(p.id||p.project_id));}
function projectActive(p){
  var st=N(p&&(p.status||p.operational_state||p.pipeline_stage||p.stage_label));
  return !/(closed|mbyll|won|lost|archiv|realized|realizuar|no bid|no_bid)/.test(st);
}
function counts(){
  var s=snap(),opp=opportunities(),actions=A(s.actions).filter(function(a){return S(a&&(a.key||a.title||a.action));});
  var projects=A(s.projects).filter(function(p){return projectId(p)&&projectActive(p);});
  return{priorities:actions.length,tenders:Number(opp.total||0),newTenders:Number(opp.new||0),projects:projects.length,actions:actions};
}
function svg(name){
  var p={
    search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    sparkle:'<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/>',
    check:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/>',
    tender:'<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    project:'<path d="M3.5 7.5h7l2 2h8v10h-17z"/><path d="M3.5 7.5V5h7l2 2"/>',
    arrow:'<path d="m9 6 6 6-6 6"/>',
    alert:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    person:'<circle cx="10" cy="8" r="3"/><path d="M4 19c.5-4 2.5-6 6-6s5.5 2 6 6M18 7v6M15 10h6"/>'
  }[name]||'';
  return'<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
}
function installCss(){
 if(document.getElementById('pst-mobile-home-v1-css'))return;
 var s=document.createElement('style');s.id='pst-mobile-home-v1-css';s.textContent=`
#pst-mobile-home-v1{display:none}
body.pst-mobile-home-active:has(#page-workspace-home.active) #app-shell-root{display:block!important;grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:100%!important}
body.pst-mobile-home-active:has(#page-workspace-home.active) #app-sidebar,
body.pst-mobile-home-active:has(#page-workspace-home.active) #pst-v2-sidebar,
body.pst-mobile-home-active:has(#page-workspace-home.active) #pst-ws-sidebar{display:none!important;visibility:hidden!important;width:0!important;min-width:0!important;max-width:0!important;flex:0 0 0!important}
body.pst-mobile-home-active:has(#page-workspace-home.active) #app-shell-root>.main{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important}
body.pst-mobile-home-active:has(#page-workspace-home.active) .content{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0 0 calc(82px + env(safe-area-inset-bottom))!important}
body.pst-mobile-home-active:has(#page-workspace-home.active) .topbar{display:none!important}
body.pst-mobile-home-active #page-workspace-home{background:#F7F9FA!important;min-height:100dvh!important;padding:0!important;margin:0!important}
body.pst-mobile-home-active #page-workspace-home #pst-native-home-v4{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;background:#F7F9FA!important}
body.pst-mobile-home-active #page-workspace-home #pst-native-home-v4>*:not(#pst-mobile-home-v1){display:none!important}
body.pst-mobile-home-active #pst-mobile-home-v1{display:block!important;width:100%!important;max-width:560px!important;margin:0 auto!important;padding:14px 14px 26px!important;color:#1F3138!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important}
#pst-mobile-home-v1 *{box-sizing:border-box}
.pmh-appbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 2px 14px}.pmh-brand{display:flex;align-items:center;gap:10px;min-width:0}.pmh-logo{width:42px;height:42px;border-radius:12px;background:linear-gradient(145deg,#5BA8C0,#2E7F9A);color:#fff;display:grid;place-items:center;font-size:19px;font-weight:800;box-shadow:0 8px 18px rgba(50,126,153,.18)}.pmh-brand-copy b{display:block;font-size:18px;line-height:1;color:#20323A;letter-spacing:.2px}.pmh-brand-copy span{display:block;margin-top:4px;color:#879399;font-size:11px}.pmh-avatar{width:38px;height:38px;border:1px solid #D8E5E8;border-radius:50%;background:#EEF6F8;color:#397E94;display:grid;place-items:center;font-size:11px;font-weight:800}
.pmh-welcome{position:relative;overflow:hidden;border:1px solid #DFEAED;border-radius:18px;background:linear-gradient(135deg,#F7FBFC 0%,#EEF7FA 100%);padding:20px 18px 19px;box-shadow:0 8px 22px rgba(46,83,95,.045)}.pmh-welcome:after{content:"";position:absolute;width:180px;height:180px;border-radius:50%;right:-75px;top:-85px;background:rgba(92,171,196,.08)}.pmh-welcome h1{position:relative;z-index:1;margin:0;font-size:27px;line-height:1.08;letter-spacing:-.65px;color:#1D2C33}.pmh-welcome p{position:relative;z-index:1;margin:10px 0 0;color:#748289;font-size:13px}
.pmh-search{width:100%;margin:10px 0 12px;border:1px solid #DDE6E8;border-radius:16px;background:#fff;min-height:58px;padding:0 9px 0 16px;display:flex;align-items:center;gap:12px;color:#68777E;box-shadow:0 8px 20px rgba(37,69,80,.05);cursor:pointer;text-align:left}.pmh-search>svg{width:22px;height:22px;fill:none;stroke:#52666F;stroke-width:1.8;flex:0 0 auto}.pmh-search>span{flex:1;font-size:16px;color:#7C888E}.pmh-search i{width:42px;height:42px;border-radius:13px;background:#EAF6FA;color:#2E91B0;display:grid;place-items:center;font-style:normal}.pmh-search i svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.7}
.pmh-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.pmh-stat{min-width:0;border:1px solid #E2E8EA;border-radius:16px;padding:13px 10px;background:#fff;display:flex;align-items:center;gap:8px;text-align:left;cursor:pointer}.pmh-stat.blue{background:#F1F8FB}.pmh-stat.green{background:#F2FAF6}.pmh-stat.purple{background:#F7F4FC}.pmh-stat-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:0 0 auto}.pmh-stat.blue .pmh-stat-icon{background:#DDF2FB;color:#238DB2}.pmh-stat.green .pmh-stat-icon{background:#E1F6EA;color:#27946D}.pmh-stat.purple .pmh-stat-icon{background:#ECE5FA;color:#6752C4}.pmh-stat-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8}.pmh-stat-copy{min-width:0}.pmh-stat-copy b{display:block;font-size:18px;line-height:1;color:#1F3037}.pmh-stat-copy span{display:block;margin-top:4px;color:#7D898E;font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pmh-card{border:1px solid #E0E7E9;border-radius:18px;background:#fff;overflow:hidden;margin-bottom:12px;box-shadow:0 6px 18px rgba(42,73,84,.035)}.pmh-card-head{display:flex;align-items:flex-start;gap:11px;padding:15px 15px 12px}.pmh-card-head-icon{width:38px;height:38px;border-radius:12px;background:#EAF6FA;color:#238DB2;display:grid;place-items:center;flex:0 0 auto}.pmh-card-head-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8}.pmh-card-head b{display:block;font-size:15px;color:#22343C}.pmh-card-head span{display:block;margin-top:4px;color:#879297;font-size:10px;line-height:1.4}.pmh-today-row{width:100%;min-height:64px;border:0;border-top:1px solid #E9EEEF;background:#fff;padding:9px 13px;display:grid;grid-template-columns:38px minmax(0,1fr) 18px;gap:10px;align-items:center;text-align:left;color:#263940;cursor:pointer}.pmh-today-row:active{background:#F6FAFB}.pmh-row-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center}.pmh-row-icon.red{background:#FCEBEC;color:#D95D65}.pmh-row-icon.blue{background:#EAF6FA;color:#258FB1}.pmh-row-icon.purple{background:#F0EAFB;color:#6A55C3}.pmh-row-icon svg,.pmh-row-arrow svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8}.pmh-row-copy{min-width:0}.pmh-row-copy b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmh-row-copy span{display:block;margin-top:3px;color:#879297;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmh-row-arrow{color:#75868D}
.pmh-quick{padding-bottom:13px}.pmh-quick-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0 11px}.pmh-quick-btn{min-width:0;min-height:92px;border:1px solid #E2E8EA;border-radius:15px;background:#fff;padding:11px 8px;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:9px;text-align:left;color:#22343C;cursor:pointer}.pmh-quick-btn:active{background:#F6FAFB}.pmh-quick-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center}.pmh-quick-btn:nth-child(1) .pmh-quick-icon{background:#2D98B9;color:#fff}.pmh-quick-btn:nth-child(2) .pmh-quick-icon{background:#E1F3FA;color:#238FB3}.pmh-quick-btn:nth-child(3) .pmh-quick-icon{background:#E2F7ED;color:#15916A}.pmh-quick-btn:nth-child(4) .pmh-quick-icon{background:#EEE8FB;color:#6650C0}.pmh-quick-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.9}.pmh-quick-btn b{font-size:11.5px;line-height:1.2}
@media(max-width:390px){body.pst-mobile-home-active #pst-mobile-home-v1{padding-left:10px!important;padding-right:10px!important}.pmh-stat{padding:11px 7px;gap:6px}.pmh-stat-icon{width:30px;height:30px}.pmh-stat-copy b{font-size:16px}.pmh-quick-grid{gap:6px;padding:0 9px}.pmh-quick-btn{padding:9px 6px}.pmh-quick-btn b{font-size:10.5px}}
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
function openFirstAction(){
 var s=snap(),a=A(s.actions).filter(function(x){return S(x&&(x.key||x.title||x.action));})[0],key=S(a&&a.key);
 try{var g=window.PSTHomeOperatingGridV1;if(key&&g&&g._test&&typeof g._test.proxyAction==='function'&&g._test.proxyAction(key))return true;}catch(e){}
 if(key){var q='[data-morning-action="'+key.replace(/"/g,'\\\"')+'"]',b=document.querySelector(q);if(b){b.click();return true;}}
 return false;
}
function quick(kind){
 if(kind==='project'){if(typeof window.pstWsCreate==='function')return window.pstWsCreate('project');return route('projects');}
 if(kind==='draft')return route('tenders');
 if(kind==='partner')return route('contacts');
 if(kind==='tender')return route('tenders');
}
function today(kind){
 if(kind==='priority'){if(!openFirstAction())return route('home');return true;}
 if(kind==='tender')return route('tenders');
 if(kind==='project')return route('projects');
}
function markup(){
 var id=userIdentity(),name=id.first?(', '+E(id.first)):'';
 return '<div class="pmh-appbar"><div class="pmh-brand"><span class="pmh-logo">P</span><span class="pmh-brand-copy"><b>PRISTEEL</b><span>Platforma</span></span></div><span class="pmh-avatar" aria-label="Përdoruesi">'+E(id.initials)+'</span></div>'
 +'<section class="pmh-welcome"><h1>'+E(greeting())+name+' 👋</h1><p>Ja çfarë ka rëndësi sot.</p></section>'
 +'<button type="button" class="pmh-search" data-pmh-search>'+svg('search')+'<span>Pyet PPPP…</span><i>'+svg('sparkle')+'</i></button>'
 +'<div class="pmh-stats"><button type="button" class="pmh-stat blue" data-pmh-today="priority"><span class="pmh-stat-icon">'+svg('check')+'</span><span class="pmh-stat-copy"><b data-pmh-count="priorities">0</b><span>Prioritete</span></span></button><button type="button" class="pmh-stat green" data-pmh-today="tender"><span class="pmh-stat-icon">'+svg('tender')+'</span><span class="pmh-stat-copy"><b data-pmh-count="tenders">0</b><span>Tenderë</span></span></button><button type="button" class="pmh-stat purple" data-pmh-today="project"><span class="pmh-stat-icon">'+svg('project')+'</span><span class="pmh-stat-copy"><b data-pmh-count="projects">0</b><span>Projekte</span></span></button></div>'
 +'<section class="pmh-card"><div class="pmh-card-head"><span class="pmh-card-head-icon">'+svg('tender')+'</span><div><b>Çfarë të shohësh sot</b><span>Vetëm gjërat më të rëndësishme për të vazhduar punën.</span></div></div><button type="button" class="pmh-today-row" data-pmh-today="priority"><span class="pmh-row-icon red">'+svg('alert')+'</span><span class="pmh-row-copy"><b data-pmh-title="priority">Prioritetet e sotme</b><span data-pmh-sub="priority">Shiko veprimet që kërkojnë vëmendje.</span></span><span class="pmh-row-arrow">'+svg('arrow')+'</span></button><button type="button" class="pmh-today-row" data-pmh-today="tender"><span class="pmh-row-icon blue">'+svg('tender')+'</span><span class="pmh-row-copy"><b data-pmh-title="tender">Tenderët aktivë</b><span data-pmh-sub="tender">Hap Mundësitë për shqyrtim.</span></span><span class="pmh-row-arrow">'+svg('arrow')+'</span></button><button type="button" class="pmh-today-row" data-pmh-today="project"><span class="pmh-row-icon purple">'+svg('project')+'</span><span class="pmh-row-copy"><b data-pmh-title="project">Projektet aktive</b><span data-pmh-sub="project">Vazhdo punën aty ku ka mbetur.</span></span><span class="pmh-row-arrow">'+svg('arrow')+'</span></button></section>'
 +'<section class="pmh-card pmh-quick"><div class="pmh-card-head"><span class="pmh-card-head-icon">'+svg('sparkle')+'</span><div><b>Veprime të shpejta</b><span>Fillo menjëherë me veprimet më të shpeshta.</span></div></div><div class="pmh-quick-grid"><button type="button" class="pmh-quick-btn" data-pmh-quick="project"><span class="pmh-quick-icon">'+svg('plus')+'</span><b>Krijo projekt</b></button><button type="button" class="pmh-quick-btn" data-pmh-quick="draft"><span class="pmh-quick-icon">'+svg('tender')+'</span><b>Krijo draft</b></button><button type="button" class="pmh-quick-btn" data-pmh-quick="partner"><span class="pmh-quick-icon">'+svg('person')+'</span><b>Shto partner</b></button><button type="button" class="pmh-quick-btn" data-pmh-quick="tender"><span class="pmh-quick-icon">'+svg('search')+'</span><b>Shiko tenderët</b></button></div></section>';
}
function update(root){
 var c=counts(),p=c.priorities,t=c.newTenders||c.tenders,projects=c.projects;
 function set(sel,val){var el=root.querySelector(sel);if(el)el.textContent=val;}
 set('[data-pmh-count="priorities"]',p);set('[data-pmh-count="tenders"]',c.tenders);set('[data-pmh-count="projects"]',projects);
 set('[data-pmh-title="priority"]',p?(p+' '+(p===1?'prioritet kërkon':'prioritete kërkojnë')+' vëmendje'):'Asnjë prioritet urgjent');
 var first=c.actions[0],desc=S(first&&(first.title||first.action||first.next_action));
 set('[data-pmh-sub="priority"]',p?(desc||'Shiko veprimet që kërkojnë vëmendje.'):'Nuk ka veprim urgjent në snapshot-in aktual.');
 set('[data-pmh-title="tender"]',t?(t+' '+(t===1?'tender i ri':'tenderë të rinj')):(c.tenders?c.tenders+' tenderë aktivë':'Asnjë tender i ri'));
 set('[data-pmh-sub="tender"]',c.tenders?'Hap Mundësitë për shqyrtim.':'Nuk ka tenderë në snapshot-in aktual.');
 set('[data-pmh-title="project"]',projects?(projects+' '+(projects===1?'projekt aktiv':'projekte aktive')):'Asnjë projekt aktiv');
 set('[data-pmh-sub="project"]',projects?'Vazhdo punën aty ku ka mbetur.':'Projektet aktive do të shfaqen këtu.');
}
function ensure(){
 installCss();
 var on=compact()&&homeActive();
 if(!on){document.body&&document.body.classList.remove('pst-mobile-home-active');if(!compact())clearShellFix();return false;}
 document.body&&document.body.classList.add('pst-mobile-home-active');shellFix();
 var native=document.getElementById('pst-native-home-v4');if(!native)return false;
 var root=document.getElementById('pst-mobile-home-v1');
 if(!root){root=document.createElement('section');root.id='pst-mobile-home-v1';root.setAttribute('aria-label','Ballina mobile e PRISTEEL');root.innerHTML=markup();root.addEventListener('click',function(e){var search=e.target.closest('[data-pmh-search]');if(search){if(typeof window.pstWsSearch==='function')window.pstWsSearch();else if(typeof window.openCmdK==='function')window.openCmdK();return;}var q=e.target.closest('[data-pmh-quick]');if(q){quick(q.getAttribute('data-pmh-quick'));return;}var t=e.target.closest('[data-pmh-today]');if(t)today(t.getAttribute('data-pmh-today'));});native.appendChild(root);}
 update(root);return true;
}
function schedule(){
 [0,90,260,720,1500].forEach(function(ms){setTimeout(ensure,ms);});
}
function boot(){installCss();schedule();}
document.addEventListener('pst:modules-ready',schedule);
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:native-home-ready',schedule);
document.addEventListener('pst:page-opened',schedule);
document.addEventListener('pst:tender-gmail-drafts-ready',schedule);
window.addEventListener('pageshow',schedule);
window.addEventListener('focus',schedule);
window.addEventListener('resize',function(){setTimeout(ensure,80);});
window.addEventListener('orientationchange',function(){setTimeout(ensure,120);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.PSTMobileHomeV1={render:ensure,refresh:function(){var r=document.getElementById('pst-mobile-home-v1');if(r)update(r);return !!r;},_test:{compact:compact,counts:counts,homeActive:homeActive,userIdentity:userIdentity}};
})();