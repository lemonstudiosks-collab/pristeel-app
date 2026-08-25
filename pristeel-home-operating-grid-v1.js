/* PRISTEEL Home Operating Grid v2
 * Final Home presentation: action-only work surface.
 * Canonical Home remains the sole data/state/click owner.
 * This module performs no Supabase reads/writes and no outbound actions.
 */
(function(){
'use strict';
if(window.__pstHomeOperatingGridV1)return;
window.__pstHomeOperatingGridV1=true;

var VERSION='20260825-action-only-1';
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function snapshot(){
  try{
    var H=window.PSTHomeCanonicalV1;
    return H&&typeof H.snapshot==='function'?H.snapshot():{actions:[],waiting:[],projects:[]};
  }catch(e){return{actions:[],waiting:[],projects:[]};}
}
function page(){return document.getElementById('page-workspace-home');}
function active(){var p=page();return !!(p&&p.classList.contains('active'));}
function nativeRow(key){
  var rows=document.querySelectorAll('#pst-ws-home-actions .pst-canonical-action[data-ws-action]');
  for(var i=0;i<rows.length;i++)if(S(rows[i].getAttribute('data-ws-action'))===S(key))return rows[i];
  return null;
}
function proxyAction(key){
  var row=nativeRow(key);
  if(!row)return false;
  var b=row.querySelector('.pst-ws-action-open,[data-pst-action="open"],[data-action="open"]');
  if(b){b.click();return true;}
  row.click();
  return true;
}
function actionProject(a){return S(a&&((a.project_name||a.name||a.project_title||a.project)||''));}
function actionTitle(a){return S(a&&((a.title||a.text||a.action)||'Hap veprimin'));}
function actionWhy(a){return S(a&&((a.why||a.reason||a.meta)||''));}
function actionTag(a){return S(a&&((a.tag||a.label)||'VEPRIM'));}
function card(a){
  var project=actionProject(a),why=actionWhy(a),key=S(a&&a.key);
  return '<article class="pst-hao-card" data-pst-home-action="'+E(key)+'">'
    +'<div class="pst-hao-copy">'
      +'<div class="pst-hao-top"><span class="pst-hao-tag">'+E(actionTag(a))+'</span>'+(project?'<span class="pst-hao-project">'+E(project)+'</span>':'')+'</div>'
      +'<h2>'+E(actionTitle(a))+'</h2>'
      +(why?'<p><b>Pse tani?</b> '+E(why)+'</p>':'')
    +'</div>'
    +'<button type="button" class="pst-hao-go" data-pst-home-go="'+E(key)+'">Vepro</button>'
  +'</article>';
}
function installStyle(){
  if(document.getElementById('pst-home-action-only-css'))return;
  var s=document.createElement('style');
  s.id='pst-home-action-only-css';
  s.textContent='\
#page-workspace-home.pst-home-action-only> :not(#pst-home-operating-grid-v1){display:none!important}\
#page-workspace-home.pst-home-action-only{padding-top:0!important}\
#pst-home-operating-grid-v1{display:block!important;max-width:1120px;margin:0 auto;padding:34px 28px 64px}\
.pst-hao-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid #e5e8ea}\
.pst-hao-head span{display:block;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#7a838b;margin-bottom:6px}\
.pst-hao-head h1{font-size:28px;line-height:1.15;letter-spacing:-.025em;color:#17263d;margin:0}\
.pst-hao-head p{max-width:520px;margin:7px 0 0;color:#65707a;font-size:13px;line-height:1.5}\
.pst-hao-count{flex:0 0 auto;font-size:12px;font-weight:800;color:#49616f;background:#eef3f5;border:1px solid #d8e0e4;border-radius:999px;padding:7px 11px}\
.pst-hao-list{display:grid;grid-template-columns:1fr;gap:12px}\
.pst-hao-card{display:flex;align-items:center;justify-content:space-between;gap:22px;background:#fff;border:1px solid #dfe4e7;border-radius:14px;padding:18px 18px 18px 20px;box-shadow:0 1px 2px rgba(23,38,61,.035)}\
.pst-hao-card:hover{border-color:#bfcbd1;box-shadow:0 8px 22px rgba(23,38,61,.065)}\
.pst-hao-copy{min-width:0;flex:1}\
.pst-hao-top{display:flex;align-items:center;gap:9px;min-width:0;margin-bottom:7px}\
.pst-hao-tag{font-size:9.5px;font-weight:850;letter-spacing:.075em;text-transform:uppercase;color:#8a4e24;background:#f7eee8;border-radius:999px;padding:4px 7px;white-space:nowrap}\
.pst-hao-project{font-size:11px;font-weight:700;color:#77818a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.pst-hao-card h2{font-size:16px;line-height:1.3;color:#17263d;margin:0;font-weight:750}\
.pst-hao-card p{font-size:12px;line-height:1.5;color:#6a747c;margin:7px 0 0}\
.pst-hao-card p b{color:#49545d}\
.pst-hao-go{flex:0 0 auto;border:0;border-radius:10px;background:#17263d;color:#fff;font-weight:800;font-size:12px;padding:11px 17px;cursor:pointer}\
.pst-hao-go:hover{background:#243d5c}\
.pst-hao-empty{background:#fff;border:1px solid #dfe4e7;border-radius:14px;padding:34px 24px;text-align:center;color:#65707a}\
.pst-hao-empty b{display:block;color:#17263d;font-size:17px;margin-bottom:5px}\
.pst-hao-empty span{font-size:12px}\
@media(max-width:720px){#pst-home-operating-grid-v1{padding:24px 16px 48px}.pst-hao-head{align-items:flex-start;flex-direction:column}.pst-hao-card{align-items:flex-start;flex-direction:column}.pst-hao-go{width:100%}}\
';
  document.head.appendChild(s);
}
function host(){
  var p=page();if(!p)return null;
  p.classList.add('pst-home-action-only','pst-home-grid-final');
  var h=document.getElementById('pst-home-operating-grid-v1');
  if(!h){h=document.createElement('main');h.id='pst-home-operating-grid-v1';h.setAttribute('data-pst-home-final-presentation','action-only');p.appendChild(h);}
  return h;
}
function bind(h){
  h.querySelectorAll('[data-pst-home-go]').forEach(function(b){
    b.onclick=function(){var key=b.getAttribute('data-pst-home-go');if(!proxyAction(key)){console.warn('PPPP Home: canonical action target missing',key);}};
  });
}
function renderLoaded(data){
  var p=page();if(!p||!p.classList.contains('active'))return false;
  installStyle();
  var h=host();if(!h)return false;
  var snap=data&&data.snap?data.snap:snapshot();
  var actions=A(snap.actions).slice(0,5);
  h.innerHTML='<header class="pst-hao-head"><div><span>HOME</span><h1>Duhet veprimi yt</h1><p>Vetëm puna që kërkon ndërhyrjen tënde tani. Gjithçka tjetër që PPPP di ose monitoron qëndron në prapaskenë.</p></div>'
    +(actions.length?'<div class="pst-hao-count">'+actions.length+' për tani</div>':'')+'</header>'
    +(actions.length?'<section class="pst-hao-list">'+actions.map(card).join('')+'</section>':'<section class="pst-hao-empty"><b>Asgjë nuk kërkon ndërhyrjen tënde tani.</b><span>PPPP vazhdon të monitorojë projektet dhe do të nxjerrë këtu vetëm veprimin e radhës kur nevojitet.</span></section>');
  bind(h);
  return true;
}
function render(){if(!active())return false;return renderLoaded({snap:snapshot()});}
function schedule(){if(typeof queueMicrotask==='function')queueMicrotask(render);else Promise.resolve().then(render);}
function homeIntent(el){
  if(!el||!el.closest)return false;
  var n=el.closest('[data-ws-go="home"],[data-nav="home"],[data-pst-nav="home"],a[href="#home"],button');
  if(!n)return false;
  var t=S(n.textContent).toLowerCase().trim();
  return n.matches('[data-ws-go="home"],[data-nav="home"],[data-pst-nav="home"],a[href="#home"]')||t==='home';
}
function boot(){installStyle();if(active())render();}
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:modules-ready',schedule);
document.addEventListener('click',function(e){if(homeIntent(e.target))schedule();},true);
window.addEventListener('focus',function(){if(active())schedule();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

window.PSTHomeOperatingGridV1={version:VERSION,render:render,refresh:render,renderLoaded:renderLoaded,snapshot:snapshot,_test:{proxyAction:proxyAction,nativeRow:nativeRow,actionProject:actionProject,actionTitle:actionTitle,actionWhy:actionWhy,actionTag:actionTag,active:active,homeIntent:homeIntent}};
})();
