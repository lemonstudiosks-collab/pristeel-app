/* PRISTEEL Finance Mindmap v1
 * Presentation/navigation owner only.
 * Reuses existing finSwitchTab(tab) and never performs finance calculations or writes.
 */
(function(){
'use strict';
if(window.__pstFinanceMindmapV1)return;
window.__pstFinanceMindmapV1=true;

var VERSION='20260916-finance-mindmap1';
var observer=null;
var TABS=[
  {id:'income',label:'Të hyrat',sub:'Faturat e shitjes',icon:'↑',pos:'nw'},
  {id:'expenses',label:'Shpenzimet',sub:'Faturat e blerjes',icon:'↓',pos:'ne'},
  {id:'receipts',label:'Kuitancat',sub:'Dokumentet dhe kuitancat',icon:'✓',pos:'sw'},
  {id:'reports',label:'Raportet',sub:'P&L dhe analiza',icon:'▦',pos:'se'}
];
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function installStyle(){
  if(document.getElementById('pst-finance-mindmap-v1-css'))return;
  var s=document.createElement('style');s.id='pst-finance-mindmap-v1-css';
  s.textContent=`
#page-finance #fin-hub>.fin-hub-grid{display:none!important}
#pst-finance-mindmap{position:relative;min-height:500px;margin:16px 0 22px;border:1px solid #e2ecef;border-radius:24px;background:radial-gradient(circle at center,rgba(79,151,175,.05) 0 88px,transparent 89px 158px,rgba(79,151,175,.045) 159px 160px,transparent 161px),linear-gradient(135deg,#fbfdfe,#f7fafb);overflow:hidden}
#pst-finance-mindmap .pst-fin-title{position:absolute;left:26px;top:22px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#71858d}
#pst-finance-mindmap svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#pst-finance-mindmap svg line{stroke:#9fc8d5;stroke-width:1.25;vector-effect:non-scaling-stroke}
.pst-fin-center,.pst-fin-node{position:absolute;border:1px solid #c7dde5;background:#fff;color:#294652;box-shadow:0 7px 22px rgba(42,77,91,.06)}
.pst-fin-center{left:50%;top:50%;transform:translate(-50%,-50%);width:190px;min-height:100px;border-radius:22px;border-color:#89bdd0;background:#f7fcfd;display:flex;align-items:center;justify-content:center;gap:12px;text-align:left}
.pst-fin-center .ico,.pst-fin-node .ico{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:#eaf5f8;color:#2f85a3;font-size:18px;flex:0 0 auto}
.pst-fin-center b{display:block;font-size:18px}.pst-fin-center small{display:block;margin-top:3px;color:#78909a;font-size:11px}
.pst-fin-node{width:220px;min-height:78px;border-radius:17px;display:flex;align-items:center;gap:11px;padding:11px 13px;text-align:left;cursor:pointer;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease,background .15s ease}
.pst-fin-node:hover,.pst-fin-node:focus-visible{transform:translateY(-2px);border-color:#74b2c7;background:#f3fafc;box-shadow:0 11px 25px rgba(42,77,91,.10);outline:none}
.pst-fin-node b{display:block;font-size:13px}.pst-fin-node small{display:block;margin-top:3px;color:#7f9198;font-size:10px}.pst-fin-node em{margin-left:auto;color:#70a1b1;font-style:normal;font-size:20px}
.pst-fin-node.nw{left:8%;top:17%}.pst-fin-node.ne{right:8%;top:17%}.pst-fin-node.sw{left:8%;bottom:17%}.pst-fin-node.se{right:8%;bottom:17%}
#pst-finance-map-return{display:none;align-items:center;gap:7px;height:38px;margin:0 0 12px;padding:0 13px;border:1px solid #c8dce4;border-radius:12px;background:#fff;color:#38768d;font-size:11px;font-weight:800;cursor:pointer}
#pst-finance-map-return:hover{background:#f1f8fa;border-color:#91bdcb}
@media(max-width:900px){#pst-finance-mindmap{min-height:460px}.pst-fin-node{width:190px}.pst-fin-node.nw,.pst-fin-node.sw{left:4%}.pst-fin-node.ne,.pst-fin-node.se{right:4%}}
@media(max-width:680px){#pst-finance-mindmap{min-height:0;padding:58px 14px 14px;display:grid;grid-template-columns:1fr 1fr;gap:10px}#pst-finance-mindmap svg{display:none}.pst-fin-center,.pst-fin-node{position:relative;inset:auto!important;transform:none!important;width:100%;min-height:72px}.pst-fin-center{grid-column:1/-1;min-height:82px}.pst-fin-node{padding:9px}.pst-fin-title{left:16px!important;top:17px!important}}
`;
  document.head.appendChild(s);
}
function mapHtml(){
  var nodes=TABS.map(function(t){return '<button type="button" class="pst-fin-node '+E(t.pos)+'" data-pst-finance-tab="'+E(t.id)+'"><span class="ico">'+E(t.icon)+'</span><span><b>'+E(t.label)+'</b><small>'+E(t.sub)+'</small></span><em>›</em></button>';}).join('');
  return '<div id="pst-finance-mindmap" aria-label="Harta e Financave"><div class="pst-fin-title">Harta e Financave</div><svg viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true"><line x1="500" y1="250" x2="190" y2="125"/><line x1="500" y1="250" x2="810" y2="125"/><line x1="500" y1="250" x2="190" y2="375"/><line x1="500" y1="250" x2="810" y2="375"/></svg><div class="pst-fin-center"><span class="ico">⌘</span><span><b>Financat</b><small>Zgjidh një degë për ta hapur</small></span></div>'+nodes+'</div>';
}
function hub(){return document.getElementById('fin-hub');}
function tabs(){return document.getElementById('fin-tabs');}
function ensureReturn(){
  var t=tabs();if(!t)return null;
  var b=document.getElementById('pst-finance-map-return');
  if(!b){b=document.createElement('button');b.type='button';b.id='pst-finance-map-return';b.textContent='← Harta e Financave';t.parentNode.insertBefore(b,t);b.addEventListener('click',function(e){e.preventDefault();showMap();});}
  return b;
}
function syncReturn(){
  var h=hub(),b=ensureReturn();if(!h||!b)return;
  var hidden=(h.style&&h.style.display==='none')||getComputedStyle(h).display==='none';
  b.style.display=hidden?'inline-flex':'none';
}
function render(){
  installStyle();
  var h=hub();if(!h)return false;
  if(!document.getElementById('pst-finance-mindmap'))h.insertAdjacentHTML('afterbegin',mapHtml());
  ensureReturn();syncReturn();return true;
}
function openTab(tab){
  if(!TABS.some(function(t){return t.id===tab;}))return false;
  if(typeof window.finSwitchTab!=='function')return false;
  window.finSwitchTab(tab);syncReturn();return true;
}
function showMap(){
  var h=hub(),t=tabs();if(!h)return false;
  h.style.display='block';if(t)t.style.display='none';
  TABS.forEach(function(x){var el=document.getElementById('fin-tab-'+x.id);if(el)el.style.display='none';});
  render();syncReturn();return true;
}
function onClick(e){
  var n=e.target&&e.target.closest&&e.target.closest('[data-pst-finance-tab]');
  if(n){e.preventDefault();e.stopPropagation();openTab(n.getAttribute('data-pst-finance-tab'));return;}
  if(e.target&&e.target.closest&&e.target.closest('#fin-tabs .fin-tab'))setTimeout(syncReturn,0);
}
function observe(){
  if(observer||!window.MutationObserver)return;
  var h=hub(),t=tabs();if(!h)return;
  observer=new MutationObserver(syncReturn);observer.observe(h,{attributes:true,attributeFilter:['style','class']});if(t)observer.observe(t,{attributes:true,attributeFilter:['style','class']});
}
function refresh(){render();observe();}
document.addEventListener('click',onClick,true);
window.addEventListener('pst:page-opened',function(){var p=document.getElementById('page-finance');if(p&&p.classList.contains('active'))refresh();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
window.PSTFinanceMindmapV1={version:VERSION,refresh:refresh,showMap:showMap,openTab:openTab,_test:{tabs:TABS}};
})();
