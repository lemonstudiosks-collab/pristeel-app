/* PRISTEEL Home route precision v1
 * Makes Home cards open the exact work subset they represent instead of a generic page.
 * Read-only routing/presentation only; no automation or business-state writes.
 */
(function(){
'use strict';
if(window.__pstHomeRoutePrecisionV1)return;
window.__pstHomeRoutePrecisionV1=true;

var routeState={area:'',filter:'',label:'',ids:[],kind:'',installed:false};
function S(v){return String(v==null?'':v);}
function A(v){return Array.isArray(v)?v:[];}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function money(v){var n=Number(v||0);if(!isFinite(n))n=0;return new Intl.NumberFormat('sq-AL',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);}
function duePast(v){if(!v)return false;var d=new Date(S(v).slice(0,10)+'T23:59:59');return !isNaN(d.getTime())&&d.getTime()<Date.now();}
function dueSoon(v){if(!v)return false;var d=new Date(S(v).slice(0,10)+'T23:59:59'),now=Date.now();return !isNaN(d.getTime())&&d.getTime()>=now&&d.getTime()<=now+7*86400000;}
function paid(r){return !!(r&&(r.paid===true||r.paid_date||/paid|paguar/.test(N(r.status))));}
function homeData(){var x=window.PSTNativeUiV4||window.PSTNativeUiV3;return x&&x._state&&x._state.data||null;}
function statusGroup(p){var n=N(p&&p.operational_state)+' '+N(p&&p.status)+' '+N(p&&p.pipeline_stage);if(/execution|realiz|production|prodhim/.test(n))return'execution';if(/action required|attention|urgent|kerkon/.test(n))return'action';if(/wait|pending|prit/.test(n))return'waiting';return'other';}
function uniq(xs){var m={};return A(xs).map(S).filter(function(x){if(!x||m[x])return false;m[x]=1;return true;});}
function installCss(){if(document.getElementById('pst-route-precision-css'))return;var s=document.createElement('style');s.id='pst-route-precision-css';s.textContent=`
.pst-route-focus{margin:0 0 12px;padding:13px 15px;border:1px solid #CFE1E7;border-left:4px solid #4F97AF;border-radius:12px;background:#FCFCFA;color:#2F3437;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 3px 12px rgba(48,58,62,.03)}
.pst-route-focus-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.pst-route-focus-head span{display:block;font-size:9px;font-weight:800;letter-spacing:.11em;color:#8B8170}.pst-route-focus-head b{display:block;margin-top:3px;font-size:14px;color:#2F3437}.pst-route-focus-head small{display:block;margin-top:3px;font-size:10px;line-height:1.4;color:#7C8488}.pst-route-focus-head button{height:31px;padding:0 10px;border:1px solid #D9E2E5;border-radius:8px;background:#fff;color:#59666B;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap}.pst-route-focus-list{display:grid;gap:5px;margin-top:10px}.pst-route-focus-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 9px;border:1px solid #E6E3DE;border-radius:8px;background:#fff}.pst-route-focus-row b{font-size:10.5px;color:#374247}.pst-route-focus-row span{display:block;margin-top:2px;font-size:9px;color:#7C8488}.pst-route-focus-row strong{font-size:10px;color:#3F7F98;white-space:nowrap}
.pst-route-hidden{display:none!important}
`;
 document.head.appendChild(s);}
function clearFocus(){document.querySelectorAll('.pst-route-focus').forEach(function(x){x.remove();});document.querySelectorAll('.pst-route-hidden').forEach(function(x){x.classList.remove('pst-route-hidden');});routeState={area:'',filter:'',label:'',ids:[],kind:'',installed:true};}
function focusHeader(title,sub){return'<div class="pst-route-focus-head"><div><span>NGA KRYEFAQJA</span><b>'+E(title)+'</b><small>'+E(sub||'Kjo pamje tregon vetëm elementet që përfaqëson karta e zgjedhur.')+'</small></div><button type="button" data-pst-route-clear>Shiko të gjitha</button></div>';}
function projectIdsFor(filter,label){var d=homeData();if(!d)return[];var f=N(filter),rows=A(d.projects);if(f==='action')return uniq(A(d.actions).map(function(a){return a.project_id;}));if(f==='execution'||f==='waiting')return uniq(rows.filter(function(p){return statusGroup(p)===f;}).map(function(p){return p.id;}));var client=N(label||filter);if(client)return uniq(rows.filter(function(p){return N(p.client)===client;}).map(function(p){return p.id;}));return[];}
function projectTitle(filter,label,count){var f=N(filter);if(f==='action')return'Projektet që kërkojnë veprim ('+count+')';if(f==='execution')return'Projektet në realizim ('+count+')';if(f==='waiting')return'Projektet në pritje ('+count+')';return'Projektet për '+S(label||filter)+' ('+count+')';}
function openProjectsExact(filter,label){
  var ids=projectIdsFor(filter,label);routeState={area:'projects',filter:S(filter),label:S(label),ids:ids,kind:'projects',installed:true};
  try{var P=window.PSTPrimaryNavResilienceV1;if(P&&typeof P.openProjects==='function')P.openProjects();else if(typeof window.pstProjectsModernOpen==='function')window.pstProjectsModernOpen();else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('projects');}catch(e){}
  [80,220,500,1000].forEach(function(ms){setTimeout(applyProjectsFocus,ms);});return true;
}
function applyProjectsFocus(){
  if(routeState.area!=='projects')return false;var page=document.getElementById('page-workspace-projects');if(!page||!page.classList.contains('active'))return false;
  var ids={};routeState.ids.forEach(function(x){ids[S(x)]=1;});var candidates=page.querySelectorAll('[data-project-id],.pst-pm-board-card[data-pm-open]'),seen={};
  candidates.forEach(function(el){var id=S(el.getAttribute('data-project-id')||el.getAttribute('data-pm-open'));if(!id||seen[id])return;seen[id]=1;var host=el.matches('.pst-pm-board-card')?el:el.closest('.pst-pm-row')||el;host.classList.toggle('pst-route-hidden',!ids[id]);});
  var container=page.querySelector('.pst-pm-page');if(!container)return true;var old=container.querySelector('.pst-route-focus');if(old)old.remove();var box=document.createElement('section');box.className='pst-route-focus';box.innerHTML=focusHeader(projectTitle(routeState.filter,routeState.label,routeState.ids.length),'Filtri vjen drejtpërdrejt nga gjendja aktuale e Kryefaqes.');var head=container.querySelector('.pst-pm-controls')||container.firstChild;if(head)head.insertAdjacentElement('afterend',box);else container.prepend(box);return true;
}
function financeRows(mode,label){var d=homeData();if(!d)return[];var text=N(label),rows=[];if(mode==='overdue'){rows=A(d.out).filter(function(x){return !paid(x)&&duePast(x.due_date);});}else if(mode==='due'){rows=A(d.out).filter(function(x){return !paid(x)&&dueSoon(x.due_date);});}else if(mode==='unpaid'){var soon=/prane afatit|ardhshme|7 dite/.test(text);rows=A(d.inn).filter(function(x){return !paid(x)&&(soon?dueSoon(x.due_date):duePast(x.due_date));});}return rows;}
function financeTitle(mode,label,count){var t=N(label);if(mode==='overdue')return'Arkëtime të vonuara ('+count+')';if(mode==='due')return'Arkëtime pranë afatit ('+count+')';if(mode==='unpaid'&&/prane afatit|ardhshme|7 dite/.test(t))return'Pagesa furnitorësh pranë afatit ('+count+')';return'Pagesa furnitorësh të vonuara ('+count+')';}
function financeName(r){return r.client||r.supplier||r.project||r.invoice_nr||r.supplier_invoice_nr||'Faturë';}
function financeAmount(r){return r.gross_amount||r.total_price||r.amount||0;}
function openFinanceExact(mode,label){routeState={area:'finance',filter:S(mode),label:S(label),ids:[],kind:'finance',installed:true};try{if(window.PSTUiOwnershipCleanupV1&&typeof window.PSTUiOwnershipCleanupV1.recoverFinance==='function')window.PSTUiOwnershipCleanupV1.recoverFinance();else if(window.PSTPrimaryNavResilienceV1&&typeof window.PSTPrimaryNavResilienceV1.openFinance==='function')window.PSTPrimaryNavResilienceV1.openFinance();}catch(e){}[80,220,500,1000].forEach(function(ms){setTimeout(applyFinanceFocus,ms);});return true;}
function applyFinanceFocus(){
  if(routeState.area!=='finance')return false;var page=document.getElementById('page-finance');if(!page||!page.classList.contains('active'))return false;var rows=financeRows(routeState.filter,routeState.label),host=page.querySelector('#fin-hub')||page;var old=page.querySelector('.pst-route-focus');if(old)old.remove();var box=document.createElement('section');box.className='pst-route-focus';box.innerHTML=focusHeader(financeTitle(routeState.filter,routeState.label,rows.length),'Të dhënat janë të njëjtat që formojnë kartën në Kryefaqe.')+'<div class="pst-route-focus-list">'+(rows.length?rows.slice(0,20).map(function(r){return'<div class="pst-route-focus-row"><div><b>'+E(financeName(r))+'</b><span>'+E((r.invoice_nr||r.supplier_invoice_nr||'')+(r.due_date?' · Afati '+r.due_date:''))+'</span></div><strong>'+E(money(financeAmount(r)))+'</strong></div>';}).join(''):'<div class="pst-route-focus-row"><div><b>Nuk ka elemente në këtë kategori.</b><span>Gjendja e Kryefaqes është rifreskuar pa përjashtime për këtë filtër.</span></div></div>')+'</div>';host.prepend(box);return true;
}
function clickLabel(el){var t=S(el&&el.textContent).replace(/\s+/g,' ').trim();return t.length>180?t.slice(0,180):t;}
function handleHomeClick(e){
  var root=e.target&&e.target.closest?e.target.closest('#pst-native-home-v4 [data-pn-area]'):null;if(!root)return;if(root.closest('[data-pn-action-id]'))return;var area=S(root.getAttribute('data-pn-area')),filter=S(root.getAttribute('data-pn-filter')),label=clickLabel(root);if(area==='projects'&&filter){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();openProjectsExact(filter,label);return;}if(area==='finance'&&filter){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();openFinanceExact(filter,label);return;}
}
function handleClear(e){var b=e.target&&e.target.closest?e.target.closest('[data-pst-route-clear]'):null;if(!b)return;e.preventDefault();clearFocus();if(routeState.area==='projects'&&typeof window.pstProjectsModernOpen==='function')window.pstProjectsModernOpen();}
function routeReapply(e){if(!routeState.area)return;var v=e.target&&e.target.closest?e.target.closest('[data-pm-view],[data-pm-sort],#pst-pm-refresh'):null;if(v)setTimeout(applyProjectsFocus,60);}
function install(){if(routeState.installed)return true;routeState.installed=true;installCss();window.addEventListener('click',handleHomeClick,true);document.addEventListener('click',handleClear,true);document.addEventListener('click',routeReapply,true);return true;}
install();
window.PSTHomeRoutePrecisionV1={install:install,openProjectsExact:openProjectsExact,openFinanceExact:openFinanceExact,applyProjectsFocus:applyProjectsFocus,applyFinanceFocus:applyFinanceFocus,clear:clearFocus,_state:routeState};
})();