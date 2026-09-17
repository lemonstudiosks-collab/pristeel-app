/* PRISTEEL Production Surface Owner v1
 * Final presentation/navigation repair owner for the production shell.
 * Scope: full-width shell, Home return control, Opportunities field filtering,
 * and Finance mindmap presentation. No database writes or business decisions.
 */
(function(){
'use strict';
if(window.__pstProductionSurfaceOwnerV1)return;
window.__pstProductionSurfaceOwnerV1=true;

var VERSION='20260916-production-surface1';
var scheduled=false;
var observer=null;
var FIN_BRANCHES=[
  {id:'inv',label:'Faturat',sub:'Të gjitha faturat me statuse pagese',icon:'▤',action:'tab'},
  {id:'supp',label:'Faturat e Furnitorëve',sub:'Regjistrimi dhe krahasimi me furnitorët',icon:'▣',action:'tab'},
  {id:'exp',label:'Shpenzimet operative',sub:'Rryma, uji, nafta, qiraja, shërbimet',icon:'↘',action:'tab'},
  {id:'atk',label:'Tatimet (ATK)',sub:'TVSH, fitimi, pagat, kontributet',icon:'⌂',action:'tab'},
  {id:'tax',label:'Përmbledhja Tatimore',sub:'Vlerësim orientues i detyrimeve',icon:'↗',action:'tab'},
  {id:'aging',label:'Afatet e Pagesave',sub:'Çka duhet paguar dhe kur',icon:'◷',action:'tab'},
  {id:'bg',label:'Garanci Bankare',sub:'Garancitë aktive dhe skadimet',icon:'◇',action:'tab'},
  {id:'oc',label:'Kosto të tjera',sub:'Kosto operative të ndryshme',icon:'▦',action:'tab'},
  {id:'portal',label:'Portali ATK — EDI',sub:'Hap e-deklarimin në dritare të re',icon:'↗',action:'portal'},
  {id:'receipts',label:'Kuponët e shpenzimeve',sub:'Foto/PDF, lexim automatik dhe kontroll',icon:'▥',action:'receipts'}
];
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function installStyle(){
  if(document.getElementById('pst-production-surface-owner-v1-css'))return;
  var s=document.createElement('style');s.id='pst-production-surface-owner-v1-css';s.textContent=`
html body.pst-global-fullwidth-shell #app-shell-root>#app-sidebar,
html body.pst-global-fullwidth-shell #app-sidebar,
html body.pst-global-fullwidth-shell #pst-v2-sidebar,
html body.pst-global-fullwidth-shell #pst-ws-sidebar{display:none!important;width:0!important;min-width:0!important;max-width:0!important;border:0!important;padding:0!important;margin:0!important;overflow:hidden!important;visibility:hidden!important}
html body.pst-global-fullwidth-shell #app-shell-root{display:flex!important;grid-template-columns:minmax(0,1fr)!important}
html body.pst-global-fullwidth-shell #app-shell-root>.main,
html body.pst-global-fullwidth-shell .app-shell>.main{flex:1 1 auto!important;width:100%!important;max-width:none!important;min-width:0!important;margin:0!important}
html body.pst-global-fullwidth-shell .content{width:100%!important;max-width:none!important;margin-left:0!important;margin-right:0!important}
body.pst-global-fullwidth-shell #page-kek-tenders .pst-opp-v4-back,
body.pst-global-fullwidth-shell #page-workspace-projects [data-pmm-back],
body.pst-global-fullwidth-shell #page-finance [data-pst-fin-home]{display:none!important}
#page-finance #pst-finance-tools,#page-finance #fin-hub-grid{display:none!important}
#pst-finance-mindmap{position:relative;min-height:610px;margin:12px 0 22px;padding:66px 24px 26px;border:1px solid #dce9ed;border-radius:24px;background:radial-gradient(circle at center,rgba(79,151,175,.055) 0 86px,transparent 87px 165px,rgba(79,151,175,.045) 166px 167px,transparent 168px),linear-gradient(135deg,#fbfdfe,#f7fafb);overflow:hidden}
#pst-finance-mindmap .pst-fin-title{position:absolute;left:26px;top:22px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#71858d}
#pst-finance-mindmap .pst-fin-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#pst-finance-mindmap .pst-fin-lines line{stroke:#a9cdd8;stroke-width:1.15;vector-effect:non-scaling-stroke}
#pst-finance-mindmap .pst-fin-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(5,minmax(150px,1fr));grid-template-rows:minmax(110px,1fr) 130px minmax(110px,1fr);gap:26px 18px;align-items:center;min-height:500px}
#pst-finance-mindmap .pst-fin-center{grid-column:3;grid-row:2;justify-self:center;width:190px;min-height:104px;border:1px solid #8fc3d4;border-radius:22px;background:#f7fcfd;color:#294652;box-shadow:0 10px 28px rgba(42,77,91,.09);display:flex;align-items:center;justify-content:center;gap:12px;padding:13px;text-align:left}
#pst-finance-mindmap .pst-fin-center .ico,#pst-finance-mindmap .pst-fin-node .ico{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:#eaf5f8;color:#2f85a3;font-size:17px;flex:0 0 auto}
#pst-finance-mindmap .pst-fin-center b{display:block;font-size:18px}#pst-finance-mindmap .pst-fin-center small{display:block;margin-top:3px;color:#78909a;font-size:10px}
#pst-finance-mindmap .pst-fin-node{min-height:92px;border:1px solid #cfdee4;border-radius:16px;background:#fff;color:#294652;box-shadow:0 5px 16px rgba(42,77,91,.045);display:flex;align-items:center;gap:10px;padding:12px 13px;text-align:left;cursor:pointer;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease,background .15s ease}
#pst-finance-mindmap .pst-fin-node:hover,#pst-finance-mindmap .pst-fin-node:focus-visible{transform:translateY(-2px);border-color:#72b3c8;background:#f2fafc;box-shadow:0 10px 24px rgba(42,77,91,.10);outline:none}
#pst-finance-mindmap .pst-fin-node b{display:block;font-size:12px;line-height:1.25}#pst-finance-mindmap .pst-fin-node small{display:block;margin-top:4px;color:#7b8f97;font-size:9.5px;line-height:1.35}#pst-finance-mindmap .pst-fin-node em{margin-left:auto;color:#70a1b1;font-style:normal;font-size:17px}
#pst-finance-mindmap .pst-fin-node[data-fin-pos="0"]{grid-column:1;grid-row:1}#pst-finance-mindmap .pst-fin-node[data-fin-pos="1"]{grid-column:2;grid-row:1}#pst-finance-mindmap .pst-fin-node[data-fin-pos="2"]{grid-column:3;grid-row:1}#pst-finance-mindmap .pst-fin-node[data-fin-pos="3"]{grid-column:4;grid-row:1}#pst-finance-mindmap .pst-fin-node[data-fin-pos="4"]{grid-column:5;grid-row:1}#pst-finance-mindmap .pst-fin-node[data-fin-pos="5"]{grid-column:1;grid-row:3}#pst-finance-mindmap .pst-fin-node[data-fin-pos="6"]{grid-column:2;grid-row:3}#pst-finance-mindmap .pst-fin-node[data-fin-pos="7"]{grid-column:3;grid-row:3}#pst-finance-mindmap .pst-fin-node[data-fin-pos="8"]{grid-column:4;grid-row:3}#pst-finance-mindmap .pst-fin-node[data-fin-pos="9"]{grid-column:5;grid-row:3}
#pst-finance-map-return{display:none;align-items:center;gap:7px;height:38px;margin:0 0 12px;padding:0 13px;border:1px solid #c8dce4;border-radius:12px;background:#fff;color:#38768d;font-size:11px;font-weight:800;cursor:pointer}
@media(max-width:1100px){#pst-finance-mindmap{min-height:0;padding-top:58px}#pst-finance-mindmap .pst-fin-lines{display:none}#pst-finance-mindmap .pst-fin-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:auto;min-height:0;gap:10px}#pst-finance-mindmap .pst-fin-center{grid-column:1/-1;grid-row:auto;width:100%;min-height:82px;order:-1}#pst-finance-mindmap .pst-fin-node{grid-column:auto!important;grid-row:auto!important;min-height:76px}}
@media(max-width:680px){#pst-finance-mindmap .pst-fin-grid{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}
function hideSidebar(){
  document.body&&document.body.classList.add('pst-global-fullwidth-shell');
  ['app-sidebar','pst-v2-sidebar','pst-ws-sidebar'].forEach(function(id){var el=document.getElementById(id);if(!el)return;['display','width','min-width','max-width','padding','margin','border'].forEach(function(p){var value=p==='display'?'none':'0';if(el.style.getPropertyValue(p)!==value||el.style.getPropertyPriority(p)!=='important')el.style.setProperty(p,value,'important');});if(el.style.getPropertyValue('visibility')!=='hidden'||el.style.getPropertyPriority('visibility')!=='important')el.style.setProperty('visibility','hidden','important');});
  var main=document.querySelector('#app-shell-root>.main,.app-shell>.main');if(main){[['width','100%'],['max-width','none'],['min-width','0'],['margin','0']].forEach(function(pair){if(main.style.getPropertyValue(pair[0])!==pair[1]||main.style.getPropertyPriority(pair[0])!=='important')main.style.setProperty(pair[0],pair[1],'important');});}
}
function goHome(){try{var nav=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1;if(nav&&typeof nav.openHome==='function')return nav.openHome();if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('home');}catch(e){}return false;}
function financeMapHtml(){
  var nodes=FIN_BRANCHES.map(function(b,i){return '<button type="button" class="pst-fin-node" data-pst-finance-branch="'+E(b.id)+'" data-fin-pos="'+i+'"><span class="ico">'+E(b.icon)+'</span><span><b>'+E(b.label)+'</b><small>'+E(b.sub)+'</small></span><em>›</em></button>';}).join('');
  var ends=[[100,90],[300,90],[500,90],[700,90],[900,90],[100,510],[300,510],[500,510],[700,510],[900,510]];
  var lines=ends.map(function(p){return '<line x1="500" y1="305" x2="'+p[0]+'" y2="'+p[1]+'"/>';}).join('');
  return '<div class="pst-fin-title">Harta e Financave</div><svg class="pst-fin-lines" viewBox="0 0 1000 610" preserveAspectRatio="none" aria-hidden="true">'+lines+'</svg><div class="pst-fin-grid"><div class="pst-fin-center"><span class="ico">⌘</span><span><b>Financat</b><small>Zgjidh një degë për ta hapur</small></span></div>'+nodes+'</div>';
}
function ensureFinanceMap(){
  var page=document.getElementById('page-finance'),hub=document.getElementById('fin-hub');if(!page||!hub)return false;
  var tools=document.getElementById('pst-finance-tools');if(tools)tools.style.setProperty('display','none','important');var grid=document.getElementById('fin-hub-grid');if(grid)grid.style.setProperty('display','none','important');
  var map=document.getElementById('pst-finance-mindmap');if(!map){map=document.createElement('div');map.id='pst-finance-mindmap';map.setAttribute('aria-label','Harta e Financave');hub.insertBefore(map,hub.firstChild||null);}
  if(map.querySelectorAll('[data-pst-finance-branch]').length!==FIN_BRANCHES.length)map.innerHTML=financeMapHtml();
  ensureFinanceReturn();return true;
}
function ensureFinanceReturn(){
  var tabs=document.getElementById('fin-tabs');if(!tabs||!tabs.parentNode)return null;
  var ret=document.getElementById('pst-finance-map-return');if(!ret){ret=document.createElement('button');ret.type='button';ret.id='pst-finance-map-return';tabs.parentNode.insertBefore(ret,tabs);}
  if(ret.textContent!=='← Harta e Financave')ret.textContent='← Harta e Financave';syncFinanceReturn();return ret;
}
function syncFinanceReturn(){var hub=document.getElementById('fin-hub'),ret=document.getElementById('pst-finance-map-return');if(!hub||!ret)return;var display=hub.style.display==='none'?'inline-flex':'none';if(ret.style.display!==display)ret.style.display=display;}
function showFinanceMap(){
  try{if(typeof window.finShowHub==='function')window.finShowHub();}catch(e){}
  var hub=document.getElementById('fin-hub'),tabs=document.getElementById('fin-tabs');if(hub)hub.style.display='block';if(tabs)tabs.style.display='none';
  ['inv','supp','exp','atk','tax','aging','bg','oc'].forEach(function(id){var v=document.getElementById('fin-view-'+id);if(v)v.style.display='none';});var rv=document.getElementById('fin-view-receipts-v1');if(rv)rv.style.display='none';
  ensureFinanceMap();return true;
}
function openFinanceBranch(id){
  var branch=FIN_BRANCHES.filter(function(x){return x.id===id;})[0];if(!branch)return false;
  if(branch.action==='tab'&&typeof window.finSwitchTab==='function'){window.finSwitchTab(branch.id);syncFinanceReturn();return true;}
  if(branch.action==='receipts'){
    if(typeof window.finReceiptShow==='function'){window.finReceiptShow();syncFinanceReturn();return true;}
    var tile=document.getElementById('fin-receipts-v1-tile');if(tile){tile.click();return true;}return false;
  }
  if(branch.action==='portal'){try{window.open('https://edeklarimi.atk-ks.org/','_blank','noopener');return true;}catch(e){return false;}}
  return false;
}
function clickCapture(e){
  var t=e.target&&e.target.closest?e.target:null;if(!t)return;
  var finReturn=t.closest('#pst-finance-map-return');if(finReturn){e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();showFinanceMap();return;}
  var fin=t.closest('[data-pst-finance-branch]');if(fin){e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();openFinanceBranch(S(fin.getAttribute('data-pst-finance-branch')));return;}
}
function repair(){scheduled=false;installStyle();hideSidebar();ensureFinanceMap();}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(repair,0);}
function observe(){if(observer||typeof MutationObserver!=='function')return;var page=document.getElementById('page-finance');if(!page)return;observer=new MutationObserver(function(){if(!window.document)return;var map=document.getElementById('pst-finance-mindmap');if(!map||map.querySelectorAll('[data-pst-finance-branch]').length!==FIN_BRANCHES.length)schedule();syncFinanceReturn();});observer.observe(page,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});}
function boot(){repair();observe();}
window.addEventListener('click',clickCapture,true);
window.addEventListener('pst:page-opened',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.PSTProductionSurfaceOwnerV1={version:VERSION,repair:repair,goHome:goHome,hideSidebar:hideSidebar,ensureFinanceMap:ensureFinanceMap,showFinanceMap:showFinanceMap,openFinanceBranch:openFinanceBranch,_test:{financeBranches:FIN_BRANCHES}};
})();
