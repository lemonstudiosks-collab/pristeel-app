/* PRISTEEL Finance Daily v1
 * Action-first presentation over the existing Finance engine and task automation.
 * Reuses canonical tasks as the human-needed queue and existing Finance routes.
 * Read-only: no financial writes, no task completion, no polling or observers.
 */
(function(){
'use strict';
if(window.__pstFinanceDailyV1)return;
window.__pstFinanceDailyV1=true;

var state={rows:[],loadedAt:0,loading:null};
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function page(){return document.getElementById('page-finance');}
function active(){var p=page();return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function isOpen(r){return !/(done|closed|complete|completed|kryer|resolved|cancel|arkiv)/i.test(S(r&&r.status));}
function financeTask(r){
  var src=N(r&&r.source),cat=N(r&&r.category),txt=N([r&&r.title,r&&r.detail,r&&r.source_ref].join(' '));
  return /invoice|payment|finance|swift/.test(src)||/finance|invoice|payment/.test(cat)||/fatur|invoice|pages|payment|swift/.test(txt);
}
function urgency(r){
  var p=N(r&&r.priority),due=S(r&&r.due_date),today=new Date().toISOString().slice(0,10);
  if(due&&due<today)return'urgent';
  if(/urgjent|urgent/.test(p))return'urgent';
  if(/larte|high/.test(p))return'high';
  return'normal';
}
function dueText(v){if(!v)return'Pa afat';var d=new Date(v+'T00:00:00');if(isNaN(d.getTime()))return E(v);var t=new Date();t.setHours(0,0,0,0);var days=Math.round((d-t)/86400000);if(days<0)return Math.abs(days)+' ditë vonë';if(days===0)return'Sot';if(days===1)return'Nesër';return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'});}
function actionLabel(r){var s=N(r&&r.source),ref=N(r&&r.source_ref);if(s==='invoice_receivable')return'Hap arkëtimet';if(s==='invoice_due_date_missing')return'Hap faturën';if(s==='commercial_intake_review'&&/invoice/.test(ref))return'Shqyrto faturën';if(r&&r.project_id)return'Hap projektin';return'Hap financat';}
function rowHtml(r){var u=urgency(r);return '<article class="pst-fin-work '+u+'" data-fin-task="'+E(r.id)+'"><div class="pst-fin-work-main"><span>'+E(u==='urgent'?'URGJENT':u==='high'?'PËR SHQYRTIM':'FINANCA')+'</span><b>'+E(r.title||'Veprim financiar')+'</b><small>'+E(r.detail||'')+'</small></div><div class="pst-fin-work-side"><span>'+E(dueText(r.due_date))+'</span><button type="button" data-pst-fin-open="'+E(r.id)+'">'+E(actionLabel(r))+'</button></div></article>';}
function ensureStructure(){
  var p=page(),hub=p&&p.querySelector('#fin-hub'),grid=hub&&hub.querySelector('#fin-hub-grid');if(!hub||!grid)return null;
  var focus=hub.querySelector('#pst-finance-focus');
  if(!focus){focus=document.createElement('section');focus.id='pst-finance-focus';focus.innerHTML='<header><div><span>FINANCA</span><h1>Kërkon vëmendje</h1><p>Vetëm pagesat, faturat dhe verifikimet që kërkojnë ndërhyrje njerëzore.</p></div></header><div id="pst-finance-work-list"><div class="pst-fin-loading">Duke lexuar punën financiare…</div></div>';hub.insertBefore(focus,grid);}
  var tools=hub.querySelector('#pst-finance-tools');
  if(!tools){tools=document.createElement('details');tools.id='pst-finance-tools';tools.innerHTML='<summary><div><b>Mjete financiare</b><span>Faturat, shpenzimet, tatimet, afatet dhe regjistrat e tjerë</span></div><i>Hap</i></summary><div class="pst-fin-tools-body"></div>';var body=tools.querySelector('.pst-fin-tools-body');hub.insertBefore(tools,grid);body.appendChild(grid);}
  return focus;
}
function render(rows){
  ensureStructure();var h=document.getElementById('pst-finance-work-list');if(!h)return false;
  rows=A(rows).slice(0,5);
  h.innerHTML=rows.length?rows.map(rowHtml).join(''):'<div class="pst-fin-clear"><b>Nuk ka veprim financiar që kërkon ndërhyrje tani.</b><span>Regjistrat dhe raportet mbeten te “Mjete financiare”.</span></div>';
  return true;
}
async function load(force){
  if(!active())return false;
  ensureStructure();
  if(!force&&state.loadedAt&&Date.now()-state.loadedAt<30000){render(state.rows);return true;}
  if(state.loading)return state.loading;
  if(typeof window.supaFetch!=='function'){render([]);return false;}
  state.loading=window.supaFetch('tasks?select=id,project_id,title,detail,due_date,priority,status,source,category,source_ref,created_at&order=due_date.asc.nullsfirst,created_at.desc&limit=500').then(function(rows){state.rows=A(rows).filter(isOpen).filter(financeTask).sort(function(a,b){var ua=urgency(a),ub=urgency(b),rank={urgent:0,high:1,normal:2};return rank[ua]-rank[ub]||S(a.due_date||'9999').localeCompare(S(b.due_date||'9999'));});state.loadedAt=Date.now();render(state.rows);return true;}).catch(function(e){var h=document.getElementById('pst-finance-work-list');if(h)h.innerHTML='<div class="pst-fin-clear"><b>Puna financiare nuk u ngarkua.</b><span>Regjistrat ekzistues mbeten të përdorshëm te “Mjete financiare”.</span></div>';try{console.warn('PPPP Finance Daily:',e);}catch(x){}return false;}).finally(function(){state.loading=null;});
  return state.loading;
}
function openRow(r){
  if(!r)return false;var src=N(r.source),ref=N(r.source_ref);
  if(src==='invoice_receivable'&&typeof window.finSwitchTab==='function'){window.finSwitchTab('inv');setTimeout(function(){if(typeof window.finInvFilter==='function')window.finInvFilter('overdue');},0);return true;}
  if(src==='invoice_due_date_missing'&&typeof window.finSwitchTab==='function'){window.finSwitchTab('supp');return true;}
  if(src==='commercial_intake_review'&&/invoice/.test(ref)&&typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('commercial');return true;}
  if(r.project_id&&typeof window.pstOpenProjectWorkspace==='function'){window.pstOpenProjectWorkspace(r.project_id);return true;}
  if(typeof window.finSwitchTab==='function'){window.finSwitchTab('inv');return true;}
  return false;
}
function click(e){var b=e.target&&e.target.closest?e.target.closest('[data-pst-fin-open]'):null;if(!b||!active())return;var id=b.getAttribute('data-pst-fin-open'),r=state.rows.filter(function(x){return S(x.id)===S(id);})[0];if(!r)return;e.preventDefault();e.stopPropagation();openRow(r);}
function css(){if(document.getElementById('pst-finance-daily-css'))return;var s=document.createElement('style');s.id='pst-finance-daily-css';s.textContent=`
#page-finance.active #fin-hub{padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
#page-finance.active #pst-finance-focus{padding:18px 20px;background:#fff;border:1px solid #DDE7EA;border-top:4px solid #5B9BB3;border-radius:14px;box-shadow:0 4px 16px rgba(38,63,74,.05)}
#page-finance.active #pst-finance-focus>header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:13px}
#page-finance.active #pst-finance-focus>header span{font-size:8px;font-weight:900;letter-spacing:.13em;color:#4B8195}#page-finance.active #pst-finance-focus h1{margin:3px 0 0;font-size:19px;color:#2E4149}#page-finance.active #pst-finance-focus p{margin:4px 0 0;font-size:10px;color:#7B8A90}
#page-finance.active #pst-finance-work-list{display:grid;gap:7px}.pst-fin-work{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:14px;padding:11px 12px;border:1px solid #E2E9EC;border-left:4px solid #A8BBC3;border-radius:10px;background:#fff}.pst-fin-work.urgent{border-left-color:#B75B4E;background:#FFF9F7}.pst-fin-work.high{border-left-color:#C69746;background:#FFFCF5}.pst-fin-work-main{min-width:0}.pst-fin-work-main>span{display:block;font-size:7px;font-weight:900;letter-spacing:.11em;color:#88969C}.pst-fin-work.urgent .pst-fin-work-main>span{color:#A5483E}.pst-fin-work.high .pst-fin-work-main>span{color:#8E6727}.pst-fin-work-main>b{display:block;margin-top:2px;font-size:11px;color:#344950}.pst-fin-work-main>small{display:block;margin-top:3px;font-size:9px;line-height:1.4;color:#78898F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-fin-work-side{display:flex;align-items:center;gap:9px}.pst-fin-work-side>span{font-size:8px;font-weight:750;color:#75868D;white-space:nowrap}.pst-fin-work-side button{height:32px;padding:0 10px;border:1px solid #BFD5DD;border-radius:8px;background:#EEF7FA;color:#356D82;font-size:8px;font-weight:850;cursor:pointer}.pst-fin-work-side button:hover{background:#E1F1F6;border-color:#9EC6D4}
#page-finance.active #pst-finance-tools{margin-top:12px;border:1px solid #E1E8EB;border-radius:12px;background:#fff;overflow:hidden}#page-finance.active #pst-finance-tools>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 15px}#page-finance.active #pst-finance-tools>summary::-webkit-details-marker{display:none}#page-finance.active #pst-finance-tools>summary b{display:block;font-size:10px;color:#475D66}#page-finance.active #pst-finance-tools>summary span{display:block;margin-top:2px;font-size:8px;color:#88979D}#page-finance.active #pst-finance-tools>summary i{font-style:normal;font-size:8px;font-weight:850;color:#4B8195}#page-finance.active #pst-finance-tools[open]>summary{border-bottom:1px solid #E5ECEE}#page-finance.active .pst-fin-tools-body{padding:14px}#page-finance.active #fin-hub-grid{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))!important;gap:10px!important}
.pst-fin-clear{padding:15px 4px;color:#667980}.pst-fin-clear b{display:block;font-size:10px}.pst-fin-clear span{display:block;margin-top:3px;font-size:8px;color:#8A989D}.pst-fin-loading{padding:12px 4px;font-size:9px;color:#87969C}
@media(max-width:760px){.pst-fin-work{grid-template-columns:1fr}.pst-fin-work-side{justify-content:space-between}.pst-fin-work-main>small{white-space:normal}}
`;document.head.appendChild(s);}
function apply(force){css();if(!active())return false;ensureStructure();load(!!force);return true;}
document.addEventListener('click',click,true);
document.addEventListener('pst:modules-ready',function(){apply(false);},{once:true});
window.addEventListener('pageshow',function(){apply(false);},{once:true});
css();if(document.readyState!=='loading')apply(false);
window.PSTFinanceDailyV1={apply:apply,load:load,render:render,openRow:openRow,_test:{isOpen:isOpen,financeTask:financeTask,urgency:urgency,actionLabel:actionLabel}};
})();