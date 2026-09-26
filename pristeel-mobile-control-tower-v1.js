/* PRISTEEL Mobile Control Tower v1
 * Mobile-only Home owner layered over the canonical PPPP Home snapshot.
 *
 * Principles:
 * - presentation/navigation only
 * - zero direct Supabase reads or writes
 * - no polling
 * - reuses canonical Home snapshot for business truth
 * - delegates Ask PPPP, weather, currency and steel market actions to the
 *   existing mobile Home owner so data and public-source behavior stay single-owner
 */
(function(){
'use strict';
if(window.__pstMobileControlTowerV1)return;
window.__pstMobileControlTowerV1=true;

var VERSION='20260926-control-tower1';
var ROOT_ID='pst-mobile-control-tower-v1';
var CSS_ID='pst-mobile-control-tower-v1-css';
var lastSignature='';

function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function A(v){return Array.isArray(v)?v:[];}
function compact(){var iw=Number(window.innerWidth||9999),sw=Number(window.screen&&window.screen.width||9999);return Math.min(iw,sw)<=900;}
function visible(el){
  if(!el)return false;
  try{var st=window.getComputedStyle?window.getComputedStyle(el):null;return(!st||st.display!=='none')&&(!st||st.visibility!=='hidden');}
  catch(e){return el.style.display!=='none';}
}
function authBlocking(){
  var pin=document.getElementById('pst-mobile-pin-gate');
  var auth=document.getElementById('auth-gate');
  var app=document.getElementById('app-shell-root');
  if(pin&&pin.classList.contains('on'))return true;
  if(auth&&visible(auth))return true;
  if(app&&!visible(app))return true;
  return false;
}
function homeActive(){
  var ws=document.getElementById('page-workspace-home');
  var legacy=document.getElementById('page-home');
  return !!((ws&&ws.classList.contains('active')&&visible(ws))||(legacy&&legacy.classList.contains('active')&&visible(legacy)));
}
function navHomeSelected(){
  var nav=document.getElementById('pst-mobile-nav-v1');
  var active=nav&&nav.querySelector('button.active[data-key]');
  if(active)return S(active.getAttribute('data-key')).toLowerCase()==='home';
  var zone=document.body&&document.body.dataset?S(document.body.dataset.pstBusinessZone).toLowerCase():'';
  return zone?zone==='home':homeActive();
}
function host(){
  return document.querySelector('#app-shell-root .content,.app-shell .content,.content')
    ||document.querySelector('#app-shell-root>.main,.app-shell>.main')
    ||document.body;
}
function snapshot(){
  try{
    var H=window.PSTHomeCanonicalV1;
    if(H&&typeof H.snapshot==='function'){
      var x=H.snapshot()||{};
      return{actions:A(x.actions),waiting:A(x.waiting),projects:A(x.projects)};
    }
  }catch(e){}
  return{actions:[],waiting:[],projects:[]};
}
function session(){
  try{if(typeof window.authGetSession==='function'){var s=window.authGetSession();if(s)return s;}}catch(e){}
  try{return JSON.parse(localStorage.getItem('pristeel_session')||'null')||{};}catch(e){return{};}
}
function jwtPayload(tok){
  try{var p=S(tok).split('.')[1].replace(/-/g,'+').replace(/_/g,'/');while(p.length%4)p+='=';return JSON.parse(atob(p));}
  catch(e){return{};}
}
function identity(){
  var s=session()||{},u=s.user||{},m=u.user_metadata||{},j=jwtPayload(s.access_token||'');
  var full=S(m.full_name||m.name||u.full_name||s.full_name).trim();
  var email=S(u.email||s.email||j.email).trim();
  var first=full.split(/\s+/)[0]||'';
  if(!first&&email){
    var local=email.split('@')[0].split(/[._-]/)[0].replace(/[0-9]+/g,'');
    if(/^arianit/i.test(local))first='Arianit';
    else if(local&&!/^(sales|info|office|admin|contact)$/i.test(local))first=local.charAt(0).toUpperCase()+local.slice(1);
  }
  var base=full||first||email||'P';
  var initials=base.split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x.charAt(0).toUpperCase();}).join('')||'P';
  return{first:first||'',initials:initials};
}
function greeting(){
  var h=new Date().getHours();
  return h<12?'Mirëmëngjes':h<18?'Mirëdita':'Mirëmbrëma';
}
function fmtDate(v){
  var d=v?new Date(v):null;if(!d||isNaN(d.getTime()))return'';
  return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'});
}
function todayLabel(){
  return new Date().toLocaleDateString('sq-AL',{weekday:'long',day:'2-digit',month:'long'});
}
function short(v,n){v=S(v).replace(/\s+/g,' ').trim();return v.length>(n||120)?v.slice(0,(n||120)-1)+'…':v;}
function icon(name){
  var p={
    search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    spark:'<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/>',
    arrow:'<path d="m9 6 6 6-6 6"/>',
    warning:'<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    folder:'<path d="M3.5 7.5h7l2 2h8v10h-17z"/><path d="M3.5 7.5V5h7l2 2"/>',
    inbox:'<path d="M4 5h16v14H4z"/><path d="M4 13h5l2 3h2l2-3h5"/>',
    sun:'<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    fx:'<path d="M5 7h12"/><path d="m14 4 3 3-3 3"/><path d="M19 17H7"/><path d="m10 14-3 3 3 3"/>',
    chart:'<path d="M4 18V10M10 18V6M16 18v-5M21 18V3"/><path d="m3 8 6-4 6 5 6-6"/>',
    bell:'<path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7"/><path d="M10 20h4"/>'
  }[name]||'';
  return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
}
function projectIdOf(item){
  return S(item&&item.project_id||(item&&item.row&&item.row.id)||(item&&item.context&&item.context.project&&item.context.project.id));
}
function projectNameOf(item){
  return S(item&&item.project||item&&item.name||(item&&item.row&&item.row.name)||(item&&item.context&&item.context.project&&item.context.project.name)||'Projekt');
}
function clientOf(item){
  return S(item&&item.client||(item&&item.row&&item.row.client)||(item&&item.context&&item.context.project&&item.context.project.client)||'');
}
function openProject(id){
  id=S(id);if(!id)return false;
  try{
    var H=window.PSTHomeCanonicalV1;
    if(H&&typeof H.openBrief==='function'){H.openBrief(id);return true;}
  }catch(e){}
  try{
    if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('projects');}
  }catch(e){}
  return false;
}
function legacyAction(selector){
  var old=document.getElementById('pst-mobile-home-v1');
  var b=old&&old.querySelector(selector);
  if(b&&typeof b.click==='function'){b.click();return true;}
  return false;
}
function utilityTemperature(){
  var old=document.getElementById('pst-mobile-home-v1');
  var t=old&&old.querySelector('.pmh-weather-temp');
  return t?short(t.textContent,8):'Moti';
}
function primary(data){
  var a=data.actions[0];
  if(a)return{
    kind:'action',
    eyebrow:a.tag||'PRIORITET',
    title:a.title||'Veprim i kërkuar',
    detail:a.why||a.meta||'Ky veprim kërkon vëmendjen tënde.',
    project:projectNameOf(a),
    id:projectIdOf(a)
  };
  var w=data.waiting[0];
  if(w)return{
    kind:'waiting',
    eyebrow:'NË PRITJE',
    title:w.name||'Projekt në pritje',
    detail:w.text||'Po presim përgjigje nga pala tjetër.',
    project:w.client||'',
    id:projectIdOf(w)
  };
  var p=data.projects[0];
  if(p)return{
    kind:'project',
    eyebrow:'AKTIV',
    title:projectNameOf(p),
    detail:p.next||'Projekt aktiv.',
    project:clientOf(p),
    id:projectIdOf(p)
  };
  return{
    kind:'empty',
    eyebrow:'GJENDJA',
    title:'Nuk ka veprime urgjente',
    detail:'PPPP nuk po raporton veprime të hapura në Home.',
    project:'',
    id:''
  };
}
function activity(data){
  var rows=[];
  data.actions.slice(0,3).forEach(function(a,i){rows.push({
    type:'action',score:300-i,title:a.title||'Veprim i kërkuar',sub:projectNameOf(a),meta:a.tag||'Veprim',id:projectIdOf(a),icon:'warning'
  });});
  data.waiting.slice(0,2).forEach(function(w,i){rows.push({
    type:'waiting',score:200-i,title:w.name||'Në pritje',sub:w.text||w.client||'Po presim përgjigje',meta:'Në pritje',id:projectIdOf(w),icon:'clock'
  });});
  data.projects.slice(0,4).forEach(function(p,i){rows.push({
    type:'project',score:100-i,title:projectNameOf(p),sub:p.next||clientOf(p)||'Projekt aktiv',meta:'Projekt',id:projectIdOf(p),icon:'folder'
  });});
  rows.sort(function(a,b){return b.score-a.score;});
  return rows.slice(0,6);
}
function markup(data){
  var me=identity(),p=primary(data),rows=activity(data);
  var attention=data.actions.length+data.waiting.length;
  var headline=attention?attention+' '+(attention===1?'çështje kërkon':'çështje kërkojnë')+' vëmendjen tënde.':'Nuk ka çështje urgjente në Home.';
  var tone=p.kind==='action'?'danger':p.kind==='waiting'?'wait':'calm';
  return ''
  +'<div class="pct-shell">'
    +'<header class="pct-top">'
      +'<div class="pct-brand"><b>PriSteel</b><span>'+E(todayLabel())+'</span></div>'
      +'<button class="pct-avatar" type="button" aria-label="Profili">'+E(me.initials)+'</button>'
    +'</header>'
    +'<section class="pct-greeting">'
      +'<span>'+E(greeting()+(me.first?', '+me.first:''))+'</span>'
      +'<h1>'+E(headline)+'</h1>'
    +'</section>'
    +'<button class="pct-ask" type="button" data-pct-search>'
      +'<span class="pct-ask-icon">'+icon('search')+'</span>'
      +'<span class="pct-ask-copy"><b>Pyet PPPP…</b><small>Projekt, email, supplier, tender, financë</small></span>'
      +'<span class="pct-ask-ai">'+icon('spark')+'</span>'
    +'</button>'
    +'<section class="pct-priority '+tone+'">'
      +'<div class="pct-priority-top"><span class="pct-kicker">'+E(p.eyebrow)+'</span><span class="pct-count">'+(data.actions.length?E(String(data.actions.length))+' veprime':'Live')+'</span></div>'
      +'<h2>'+E(p.title)+'</h2>'
      +(p.project?'<div class="pct-priority-project">'+E(p.project)+'</div>':'')
      +'<p>'+E(short(p.detail,190))+'</p>'
      +(p.id?'<button type="button" class="pct-open" data-pct-project="'+E(p.id)+'">Hap projektin '+icon('arrow')+'</button>':'')
    +'</section>'
    +'<section class="pct-stats" aria-label="Gjendja e Home">'
      +'<button type="button" data-pct-route="home"><strong>'+E(String(data.actions.length))+'</strong><span>Veprime</span></button>'
      +'<button type="button" data-pct-route="home"><strong>'+E(String(data.waiting.length))+'</strong><span>Në pritje</span></button>'
      +'<button type="button" data-pct-route="projects"><strong>'+E(String(data.projects.length))+'</strong><span>Në punë</span></button>'
    +'</section>'
    +'<section class="pct-feed">'
      +'<div class="pct-section-head"><div><span>AKTIVITETI</span><h3>Çfarë po ndodh</h3></div><button type="button" data-pct-refresh>Rifresko</button></div>'
      +'<div class="pct-feed-list">'
        +(rows.length?rows.map(function(r){return '<button type="button" class="pct-feed-row" '+(r.id?'data-pct-project="'+E(r.id)+'"':'')+'>'
          +'<span class="pct-feed-ic '+E(r.type)+'">'+icon(r.icon)+'</span>'
          +'<span class="pct-feed-copy"><b>'+E(r.title)+'</b><small>'+E(short(r.sub,105))+'</small></span>'
          +'<span class="pct-feed-meta">'+E(r.meta)+'</span>'
        +'</button>';}).join(''):'<div class="pct-empty">Nuk ka aktivitet për t’u shfaqur.</div>')
      +'</div>'
    +'</section>'
    +'<div class="pct-spacer" aria-hidden="true"></div>'
  +'</div>';
}
function installCss(){
  if(document.getElementById(CSS_ID))return;
  var s=document.createElement('style');s.id=CSS_ID;s.textContent=`
#${ROOT_ID}{display:none}
#pst-mobile-home-v1{transition:none!important}
@media(max-width:900px),(max-device-width:900px){
  body.pst-mobile-home-active #pst-mobile-home-v1{display:none!important}
  body.pst-mobile-home-active #${ROOT_ID}{display:block!important}
  body.pst-mobile-home-active .content{padding:0 0 calc(148px + env(safe-area-inset-bottom))!important;background:#F5F7F8!important}
  #${ROOT_ID}{width:100%;max-width:560px;min-height:100dvh;margin:0 auto;padding:calc(10px + env(safe-area-inset-top)) 14px 22px;background:#F5F7F8;color:#17242B;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Arial,sans-serif}
  #${ROOT_ID} *{box-sizing:border-box}
  #${ROOT_ID} button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
  .pct-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 2px 12px}
  .pct-brand b{display:block;font-size:21px;line-height:1;font-weight:800;letter-spacing:-.5px;color:#101A1F}
  .pct-brand span{display:block;margin-top:5px;font-size:10px;color:#7D8A90;text-transform:capitalize}
  .pct-avatar{width:38px;height:38px;border:1px solid #DCE4E7;border-radius:50%;background:#fff;color:#28404B;font-size:11px;font-weight:800;box-shadow:0 3px 10px rgba(31,48,57,.06)}
  .pct-greeting{padding:3px 2px 11px}
  .pct-greeting>span{font-size:12px;font-weight:650;color:#66767D}
  .pct-greeting h1{margin:4px 0 0;font-size:25px;line-height:1.08;letter-spacing:-.7px;font-weight:780;color:#17242B}
  .pct-ask{width:100%;min-height:58px;border:1px solid #DCE5E8;border-radius:17px;background:#fff;display:flex;align-items:center;gap:11px;padding:8px 9px 8px 12px;text-align:left;box-shadow:0 8px 20px rgba(28,49,59,.045);cursor:pointer}
  .pct-ask-icon{width:34px;height:34px;border-radius:11px;background:#F0F5F7;color:#506971;display:grid;place-items:center;flex:0 0 auto}.pct-ask-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .pct-ask-copy{min-width:0;flex:1}.pct-ask-copy b{display:block;font-size:14px;color:#22343C}.pct-ask-copy small{display:block;margin-top:2px;font-size:9.5px;color:#8B969B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pct-ask-ai{width:36px;height:36px;border-radius:12px;background:#E8F4F7;color:#2D879F;display:grid;place-items:center}.pct-ask-ai svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
  .pct-priority{margin-top:10px;border:1px solid #E0E7EA;border-radius:19px;background:#fff;padding:15px;box-shadow:0 10px 26px rgba(28,49,59,.055);position:relative;overflow:hidden}
  .pct-priority:after{content:"";position:absolute;width:140px;height:140px;border-radius:50%;right:-70px;top:-76px;pointer-events:none}
  .pct-priority.danger{border-color:#F0D3D3;background:linear-gradient(145deg,#FFFDFD,#FFF7F7)}.pct-priority.danger:after{background:rgba(215,75,75,.07)}
  .pct-priority.wait{border-color:#E9DEC5;background:linear-gradient(145deg,#FFFDF9,#FFF9ED)}.pct-priority.wait:after{background:rgba(190,137,39,.08)}
  .pct-priority.calm{border-color:#D7E7E4;background:linear-gradient(145deg,#FCFFFE,#F3FAF8)}.pct-priority.calm:after{background:rgba(50,137,117,.07)}
  .pct-priority-top{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px}.pct-kicker{font-size:9px;font-weight:850;letter-spacing:1.15px;color:#6F8087}.pct-count{font-size:9px;color:#8B969B;background:rgba(255,255,255,.7);border:1px solid rgba(90,112,121,.12);border-radius:999px;padding:4px 7px}
  .pct-priority h2{position:relative;z-index:1;margin:8px 42px 0 0;font-size:20px;line-height:1.14;letter-spacing:-.35px;color:#1D2E36}.pct-priority-project{position:relative;z-index:1;margin-top:5px;font-size:11px;font-weight:700;color:#58707A}.pct-priority p{position:relative;z-index:1;margin:8px 0 0;font-size:11px;line-height:1.5;color:#718087}
  .pct-open{position:relative;z-index:1;margin-top:12px;min-height:39px;border:0;border-radius:11px;background:#162B35;color:#fff;padding:0 13px;display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:760;cursor:pointer}.pct-open svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
  .pct-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}.pct-stats button{min-height:66px;border:1px solid #E0E7E9;border-radius:15px;background:#fff;padding:9px 8px;text-align:left;box-shadow:0 5px 14px rgba(30,48,57,.025)}.pct-stats strong{display:block;font-size:20px;line-height:1;color:#21343D;letter-spacing:-.4px}.pct-stats span{display:block;margin-top:5px;font-size:9px;color:#839096}
  .pct-feed{margin-top:10px;border:1px solid #E0E7E9;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 7px 18px rgba(30,48,57,.035)}.pct-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:13px 13px 10px;border-bottom:1px solid #EDF1F2}.pct-section-head span{display:block;font-size:8.5px;font-weight:800;letter-spacing:1px;color:#8B969A}.pct-section-head h3{margin:2px 0 0;font-size:15px;color:#263840}.pct-section-head button{border:0;background:transparent;color:#32829A;font-size:9.5px;font-weight:760;padding:4px}
  .pct-feed-list{padding:0 10px 7px}.pct-feed-row{width:100%;min-height:58px;border:0;border-top:1px solid #EEF2F3;background:#fff;padding:8px 2px;display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:9px;align-items:center;text-align:left;cursor:pointer}.pct-feed-row:first-child{border-top:0}.pct-feed-row:active{background:#F7FAFB}
  .pct-feed-ic{width:34px;height:34px;border-radius:11px;display:grid;place-items:center}.pct-feed-ic svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pct-feed-ic.action{background:#FFF0F0;color:#C84D4D}.pct-feed-ic.waiting{background:#FFF6E5;color:#B57C1D}.pct-feed-ic.project{background:#EAF4F7;color:#377F95}
  .pct-feed-copy{min-width:0}.pct-feed-copy b{display:block;font-size:11px;line-height:1.25;color:#25383F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pct-feed-copy small{display:block;margin-top:3px;font-size:9px;line-height:1.3;color:#859197;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pct-feed-meta{font-size:8px;font-weight:760;color:#87949A;white-space:nowrap}
  .pct-empty{padding:18px 4px;color:#8A969B;font-size:10px}
  .pct-spacer{height:6px}
  #pst-mobile-utility-dock-v1{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(66px + env(safe-area-inset-bottom));z-index:2147483100;width:min(330px,calc(100vw - 28px));display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:5px;border:1px solid rgba(43,65,74,.12);border-radius:17px;background:rgba(255,255,255,.94);box-shadow:0 10px 30px rgba(25,41,49,.14);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
  #pst-mobile-utility-dock-v1 button{min-height:43px;border:0;border-radius:12px;background:transparent;color:#586A72;display:flex;align-items:center;justify-content:center;gap:6px;font-size:9px;font-weight:730;white-space:nowrap;cursor:pointer}#pst-mobile-utility-dock-v1 button:active{background:#EEF5F7;color:#277E96}#pst-mobile-utility-dock-v1 svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
}
@media(max-width:370px){#${ROOT_ID}{padding-left:10px;padding-right:10px}.pct-greeting h1{font-size:23px}.pct-priority h2{font-size:18px}.pct-stats button{padding-left:7px}.pct-feed-row{grid-template-columns:32px minmax(0,1fr) auto}}
`;
  document.head.appendChild(s);
}
function ensureDock(){
  var dock=document.getElementById('pst-mobile-utility-dock-v1');
  if(!compact()){if(dock)dock.remove();return null;}
  if(!dock){
    dock=document.createElement('div');dock.id='pst-mobile-utility-dock-v1';dock.setAttribute('aria-label','Veglat e shpejta');
    dock.innerHTML='<button type="button" data-pct-util="weather">'+icon('sun')+'<span data-pct-temp>Moti</span></button>'
      +'<button type="button" data-pct-util="fx">'+icon('fx')+'<span>Konvertim</span></button>'
      +'<button type="button" data-pct-util="market">'+icon('chart')+'<span>Tregu</span></button>';
    dock.addEventListener('click',function(e){
      var b=e.target&&e.target.closest?e.target.closest('[data-pct-util]'):null;if(!b)return;
      var k=b.getAttribute('data-pct-util');
      if(k==='weather')legacyAction('[data-pmh-weather]');
      else if(k==='fx')legacyAction('[data-pmh-tool="currency"]');
      else if(k==='market')legacyAction('[data-pmh-market-all]');
    });
    document.body.appendChild(dock);
  }
  var t=dock.querySelector('[data-pct-temp]');if(t)t.textContent=utilityTemperature();
  dock.style.display=(homeActive()||!authBlocking())?'grid':'none';
  return dock;
}
function signature(data){
  return JSON.stringify([
    data.actions.map(function(x){return[x.key,x.title,x.project_id,x.tag];}),
    data.waiting.map(function(x){return[x.project_id,x.name,x.text];}),
    data.projects.slice(0,10).map(function(x){return[projectIdOf(x),projectNameOf(x),x.next];})
  ]);
}
function bind(root){
  if(root.dataset.pctBound==='1')return;root.dataset.pctBound='1';
  root.addEventListener('click',function(e){
    var x=e.target.closest('[data-pct-search]');if(x){legacyAction('[data-pmh-search]');return;}
    x=e.target.closest('[data-pct-project]');if(x){openProject(x.getAttribute('data-pct-project'));return;}
    x=e.target.closest('[data-pct-refresh]');if(x){
      try{var H=window.PSTHomeCanonicalV1;if(H&&typeof H.refresh==='function')H.refresh();}
      catch(err){}
      [100,420,900].forEach(function(ms){setTimeout(render,ms);});return;
    }
    x=e.target.closest('[data-pct-route]');if(x){
      var k=x.getAttribute('data-pct-route');
      try{if(window.PSTMobileResponsiveV1&&typeof window.PSTMobileResponsiveV1.route==='function')window.PSTMobileResponsiveV1.route(k);}
      catch(err){}
    }
  });
}
function render(){
  installCss();
  ensureDock();
  if(!compact()||authBlocking()||(!navHomeSelected()&&!homeActive())){
    document.body&&document.body.classList.remove('pst-mobile-control-tower-active');
    var old=document.getElementById(ROOT_ID);if(old)old.style.display='none';
    return false;
  }
  var h=host();if(!h)return false;
  var data=snapshot(),sig=signature(data);
  var root=document.getElementById(ROOT_ID);
  if(!root){
    root=document.createElement('section');root.id=ROOT_ID;root.setAttribute('aria-label','PriSteel Control Tower');
    h.insertBefore(root,h.firstChild||null);
  }else if(root.parentNode!==h){h.insertBefore(root,h.firstChild||null);}
  document.body&&document.body.classList.add('pst-mobile-control-tower-active');
  root.style.removeProperty('display');
  if(root.dataset.version!==VERSION||sig!==lastSignature){
    root.innerHTML=markup(data);root.dataset.version=VERSION;root.dataset.pctBound='';lastSignature=sig;
  }
  bind(root);ensureDock();return true;
}
function schedule(){
  [0,80,220,600,1200].forEach(function(ms){setTimeout(render,ms);});
}
function boot(){installCss();schedule();}
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:modules-ready',schedule);
document.addEventListener('pst:page-opened',schedule);
document.addEventListener('pst:mobile-pin-unlocked',schedule);
document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('#pst-mobile-nav-v1 button[data-key]'):null;
  if(b)[0,80,220,600].forEach(function(ms){setTimeout(render,ms);});
},true);
window.addEventListener('pageshow',schedule);
window.addEventListener('focus',schedule);
window.addEventListener('resize',function(){setTimeout(render,100);});
window.addEventListener('orientationchange',function(){setTimeout(render,140);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

window.PSTMobileControlTowerV1={
  version:VERSION,
  render:render,
  snapshot:snapshot,
  _test:{primary:primary,activity:activity,projectIdOf:projectIdOf,projectNameOf:projectNameOf,compact:compact,identity:identity}
};
})();