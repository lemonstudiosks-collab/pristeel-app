/* PRISTEEL Projects modern card-row list
 * Visual-only layer. Reuses the existing renderer and status actions.
 * No MutationObserver and no database writes.
 */
(function(){
'use strict';
if(window.__pstProjectsModernListLoaded)return;
window.__pstProjectsModernListLoaded=true;

var BLUE='#5B9BB3';
var BLUE_DARK='#326F87';
var BLUE_PALE='#EAF5F8';
var GREEN='#2F7657';
var RED='#A64B42';
var AMBER='#9B6A22';
var wrapped=false;

function text(el){return String((el&&el.textContent)||'').replace(/\s+/g,' ').trim();}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function projectId(row){var v=row.getAttribute('onclick')||'',m=v.match(/pstReleaseOpenProject\(['\"]([^'\"]+)/);return m?m[1]:'';}

function addCss(){
 if(document.getElementById('pst-projects-modern-list-css'))return;
 var s=document.createElement('style');
 s.id='pst-projects-modern-list-css';
 s.textContent=`
#page-workspace-projects .pst-ws-page{max-width:1420px!important}
#page-workspace-projects .pst-ws-head{align-items:flex-end!important;margin-bottom:18px!important}
#page-workspace-projects .pst-ws-title{font-size:30px!important;letter-spacing:-.7px!important;line-height:1.08!important}
#page-workspace-projects .pst-ws-sub{font-size:12.5px!important;margin-top:7px!important;color:#728087!important}
#page-workspace-projects .pst-ws-toolbar.pst-project-modern-toolbar{display:flex!important;align-items:center!important;gap:12px!important;padding:11px!important;margin-bottom:15px!important;background:rgba(255,255,255,.72)!important;border:1px solid #DDE8EC!important;border-radius:15px!important;box-shadow:0 7px 24px rgba(42,72,84,.055)!important;backdrop-filter:blur(10px)}
#page-workspace-projects .pst-project-modern-toolbar .pst-ws-input{height:42px!important;min-width:270px!important;max-width:390px!important;border-radius:11px!important;background:#fff!important;border:1px solid #D8E3E7!important;padding-left:38px!important;box-shadow:none!important;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2378878e' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.5-3.5'/%3E%3C/svg%3E")!important;background-repeat:no-repeat!important;background-position:13px center!important}
#page-workspace-projects .pst-project-modern-toolbar .pst-ws-select{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
.pst-project-filter-chips{display:flex;align-items:center;gap:5px;flex:1;min-width:0;overflow-x:auto;padding:1px 2px;scrollbar-width:none}.pst-project-filter-chips::-webkit-scrollbar{display:none}
.pst-project-filter-chip{height:36px;border:0;border-radius:9px;background:transparent;color:#68757B;padding:0 12px;font-size:10.5px;font-weight:720;white-space:nowrap;cursor:pointer;transition:background .14s,color .14s,box-shadow .14s}
.pst-project-filter-chip:hover{background:#F1F7F9;color:${BLUE_DARK}}
.pst-project-filter-chip.active{background:${BLUE_PALE};color:${BLUE_DARK};box-shadow:inset 0 0 0 1px #C8E2EB}
.pst-project-result-count{height:34px;display:inline-flex;align-items:center;gap:6px;border-radius:9px;background:#F3F6F7;color:#69767C;padding:0 11px;font-size:10px;font-weight:690;white-space:nowrap}.pst-project-result-count b{color:#263238;font-size:11px}
#page-workspace-projects .pst-ws-card{background:transparent!important;border:0!important;box-shadow:none!important;overflow:visible!important}
#page-workspace-projects .pst-ws-card-body{padding:0!important;overflow:visible!important}
.pst-project-modern-table,.pst-project-modern-table tbody{display:block!important;width:100%!important;background:transparent!important;border:0!important}
.pst-project-modern-table thead{display:none!important}
.pst-project-modern-table tbody{display:grid!important;gap:10px!important}
.pst-project-modern-table tr.pst-project-modern-card{position:relative;display:grid!important;grid-template-columns:minmax(310px,1.75fr) minmax(150px,.78fr) minmax(105px,.55fr) minmax(105px,.52fr) minmax(118px,.62fr) auto;align-items:center;gap:18px;min-height:88px;padding:16px 16px 16px 20px;background:#fff;border:1px solid #E1E9EC;border-radius:15px;box-shadow:0 3px 12px rgba(39,61,70,.045);overflow:visible;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease,background .16s ease}
.pst-project-modern-table tr.pst-project-modern-card:before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:#BDDCE7}
.pst-project-modern-table tr.pst-project-modern-card:hover{transform:translateY(-1px);border-color:#C5DDE5;box-shadow:0 11px 30px rgba(39,69,81,.09);background:#FEFFFF}
.pst-project-modern-table tr.pst-project-modern-card.status-won:before,.pst-project-modern-table tr.pst-project-modern-card.status-active:before{background:#78B59B}
.pst-project-modern-table tr.pst-project-modern-card.status-lost:before{background:#D68E86}
.pst-project-modern-table tr.pst-project-modern-card.status-delayed:before{background:#D7AD64}
.pst-project-modern-table tr.pst-project-modern-card.status-archived:before{background:#AAB5BA}
.pst-project-modern-table tr.pst-project-modern-card>td{display:flex!important;min-width:0!important;padding:0!important;border:0!important;background:transparent!important;vertical-align:middle!important}
.pst-project-modern-table td.pst-project-cell-identity{flex-direction:column;align-items:flex-start;gap:5px}
.pst-project-modern-table .pst-ws-name{font-size:13.5px!important;font-weight:770!important;color:#263137!important;line-height:1.3!important;letter-spacing:-.12px!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
.pst-project-modern-table .pst-ws-meta{font-size:10.5px!important;color:#849097!important;line-height:1.4!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
.pst-project-cell-phase,.pst-project-cell-status,.pst-project-cell-deadline,.pst-project-cell-activity{flex-direction:column;align-items:flex-start!important;gap:6px}
.pst-project-cell-phase:before,.pst-project-cell-status:before,.pst-project-cell-deadline:before,.pst-project-cell-activity:before{display:block;font-size:8.3px;font-weight:760;letter-spacing:.65px;text-transform:uppercase;color:#9AA5AA;line-height:1}
.pst-project-cell-phase:before{content:'Faza'}.pst-project-cell-status:before{content:'Statusi'}.pst-project-cell-deadline:before{content:'Afati'}.pst-project-cell-activity:before{content:'Aktiviteti'}
.pst-project-phase-chip{display:inline-flex;align-items:center;min-height:27px;max-width:100%;border-radius:8px;background:#F2F0FA;color:#655A87;padding:5px 9px;font-size:9.5px;font-weight:710;line-height:1.25}
.pst-project-cell-status .pst-ws-status{min-height:27px!important;display:inline-flex!important;align-items:center!important;border-radius:8px!important;padding:4px 9px!important;font-size:9.5px!important;font-weight:730!important}
.pst-project-cell-deadline,.pst-project-cell-activity{font-size:10.5px;color:#526067;font-weight:650;line-height:1.3}
.pst-project-cell-actions{justify-content:flex-end!important;overflow:visible!important}
.pst-project-modern-table .pst-status-actions{gap:7px!important;overflow:visible!important}
.pst-project-modern-table .pst-status-btn{height:36px!important;border-radius:10px!important;font-size:10px!important;padding:0 13px!important;transition:transform .13s ease,background .13s,border-color .13s,color .13s!important}
.pst-project-modern-table .pst-status-btn[data-act='open']{background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;border-color:transparent!important;color:#fff!important;box-shadow:0 7px 16px rgba(62,126,150,.18)!important}
.pst-project-modern-table .pst-status-btn[data-act='open']:hover{transform:translateY(-1px)!important;background:linear-gradient(135deg,#5F9FB7,#36758E)!important}
.pst-project-modern-table .pst-status-btn.lost,.pst-project-modern-table .pst-status-btn.delay{display:none!important}
.pst-project-modern-table .pst-status-btn.more{width:36px!important;padding:0!important;background:#F7F9FA!important;border-color:#DCE4E7!important;color:#526067!important;font-size:17px!important;box-shadow:none!important}
.pst-project-modern-table .pst-status-btn.more:hover{background:${BLUE_PALE}!important;border-color:#C5DEE7!important;color:${BLUE_DARK}!important}
.pst-project-modern-table .pst-status-menu{top:43px!important;right:0!important;width:188px!important;border-radius:12px!important;padding:6px!important;border-color:#DDE7EA!important;box-shadow:0 18px 48px rgba(29,48,57,.18)!important}
.pst-project-modern-table .pst-status-menu button{height:36px!important;border-radius:8px!important;font-size:10px!important;padding:0 11px!important}
.pst-project-modern-table .pst-status-menu button.menu-lost{color:${RED}!important}.pst-project-modern-table .pst-status-menu button.menu-delay{color:${AMBER}!important}
.pst-project-empty-modern{padding:55px 20px;text-align:center;background:#fff;border:1px solid #E1E9EC;border-radius:15px;color:#7C888E;font-size:11px}
@media(max-width:1180px){.pst-project-modern-table tr.pst-project-modern-card{grid-template-columns:minmax(260px,1.6fr) minmax(140px,.75fr) minmax(100px,.55fr) minmax(110px,.6fr) auto}.pst-project-cell-deadline{display:none!important}.pst-project-modern-toolbar{flex-wrap:wrap!important}.pst-project-filter-chips{order:3;flex-basis:100%}}
@media(max-width:850px){.pst-project-modern-table tr.pst-project-modern-card{grid-template-columns:1fr auto;gap:13px;padding:16px 14px 16px 18px}.pst-project-cell-phase,.pst-project-cell-status,.pst-project-cell-deadline,.pst-project-cell-activity{display:none!important}.pst-project-cell-actions{grid-column:2;grid-row:1}.pst-project-cell-identity{grid-column:1;grid-row:1}.pst-project-modern-toolbar .pst-ws-input{max-width:none!important;min-width:0!important;flex:1}.pst-project-result-count{display:none}}
@media(max-width:560px){#page-workspace-projects .pst-ws-toolbar.pst-project-modern-toolbar{padding:8px!important}.pst-project-filter-chip{padding:0 9px}.pst-project-modern-table tr.pst-project-modern-card{min-height:78px}.pst-project-modern-table .pst-status-btn[data-act='open']{padding:0 10px!important}.pst-project-modern-table .pst-status-btn.more{width:34px!important}}
`;
 document.head.appendChild(s);
}

function actionHtml(id){
 return '<div class="pst-status-actions">'
  +'<button type="button" class="pst-status-btn" data-act="open" data-id="'+esc(id)+'">Hap</button>'
  +'<button type="button" class="pst-status-btn more" data-act="menu" aria-label="Më shumë veprime">⋯</button>'
  +'<div class="pst-status-menu">'
   +'<button type="button" class="won" data-act="status" data-status="fituar" data-label="Fituar" data-id="'+esc(id)+'">Shëno si të fituar</button>'
   +'<button type="button" class="menu-delay" data-act="delay" data-id="'+esc(id)+'">Shtyje projektin</button>'
   +'<button type="button" class="menu-lost" data-act="lost" data-id="'+esc(id)+'">Shëno si të humbur</button>'
   +'<button type="button" data-act="status" data-status="aktiv" data-label="Aktiv" data-id="'+esc(id)+'">Ktheje si aktiv</button>'
   +'<button type="button" data-act="status" data-status="pritje" data-label="Në pritje" data-id="'+esc(id)+'">Vendose në pritje</button>'
   +'<button type="button" class="archive" data-act="status" data-status="arkivuar" data-label="Arkivuar" data-id="'+esc(id)+'">Arkivo</button>'
  +'</div></div>';
}

function statusClass(row){
 var value=text(row.querySelector('.pst-ws-status')).toLowerCase();
 if(value.indexOf('fitu')>-1||value.indexOf('aktiv')>-1)return value.indexOf('fitu')>-1?'status-won':'status-active';
 if(value.indexOf('humb')>-1)return'status-lost';
 if(value.indexOf('shtyr')>-1)return'status-delayed';
 if(value.indexOf('arkiv')>-1)return'status-archived';
 return'status-waiting';
}

function ensureFilters(){
 var toolbar=document.querySelector('#page-workspace-projects .pst-ws-toolbar');
 if(!toolbar)return;
 toolbar.classList.add('pst-project-modern-toolbar');
 var select=document.getElementById('pst-release-project-filter');
 if(!select)return;
 var chips=toolbar.querySelector('.pst-project-filter-chips');
 if(!chips){
  chips=document.createElement('div');chips.className='pst-project-filter-chips';
  chips.innerHTML=''
   +'<button type="button" class="pst-project-filter-chip" data-project-filter="active">Aktive</button>'
   +'<button type="button" class="pst-project-filter-chip" data-project-filter="all">Të gjitha</button>'
   +'<button type="button" class="pst-project-filter-chip" data-project-filter="won">Të fituara</button>'
   +'<button type="button" class="pst-project-filter-chip" data-project-filter="delayed">Të shtyra</button>'
   +'<button type="button" class="pst-project-filter-chip" data-project-filter="lost">Të humbura</button>'
   +'<button type="button" class="pst-project-filter-chip" data-project-filter="archived">Arkivuara</button>';
  select.insertAdjacentElement('afterend',chips);
 }
 if(!toolbar.querySelector('.pst-project-result-count')){
  var count=document.createElement('div');count.className='pst-project-result-count';count.innerHTML='<b>0</b> projekte';toolbar.appendChild(count);
 }
 chips.querySelectorAll('[data-project-filter]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-project-filter')===select.value);});
}

function transform(){
 addCss();ensureFilters();
 var host=document.getElementById('pst-release-project-list');if(!host)return false;
 var table=host.querySelector('table');
 if(!table){
  var empty=host.querySelector('.pst-ws-empty');if(empty)empty.classList.add('pst-project-empty-modern');
  var count0=document.querySelector('.pst-project-result-count b');if(count0)count0.textContent='0';
  return false;
 }
 table.classList.add('pst-project-modern-table');
 var visible=0;
 table.querySelectorAll('tbody tr').forEach(function(row){
  row.classList.add('pst-project-modern-card');
  row.classList.remove('status-won','status-active','status-lost','status-delayed','status-archived','status-waiting');
  row.classList.add(statusClass(row));
  var cells=row.querySelectorAll(':scope > td');if(cells.length<6)return;
  cells[0].classList.add('pst-project-cell-identity');
  cells[1].classList.add('pst-project-cell-phase');
  cells[2].classList.add('pst-project-cell-status');
  cells[3].classList.add('pst-project-cell-deadline');
  cells[4].classList.add('pst-project-cell-activity');
  cells[5].classList.add('pst-project-cell-actions');
  if(!cells[1].querySelector('.pst-project-phase-chip'))cells[1].innerHTML='<span class="pst-project-phase-chip">'+esc(text(cells[1])||'Në pritje')+'</span>';
  var id=projectId(row);
  if(id&&!cells[5].querySelector('.pst-status-actions'))cells[5].innerHTML=actionHtml(id);
  if(getComputedStyle(row).display!=='none')visible++;
 });
 var count=document.querySelector('.pst-project-result-count b');if(count)count.textContent=String(visible);
 var select=document.getElementById('pst-release-project-filter');
 if(select)document.querySelectorAll('.pst-project-filter-chip').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-project-filter')===select.value);});
 return true;
}

function wrapRenderer(){
 var base=window.pstReleaseRenderProjects;
 if(typeof base!=='function'||base.__pstModernCards)return false;
 window.pstReleaseRenderProjects=function(){var result=base.apply(this,arguments);setTimeout(transform,20);return result;};
 window.pstReleaseRenderProjects.__pstModernCards=true;
 wrapped=true;
 return true;
}

document.addEventListener('click',function(e){
 var chip=e.target.closest('[data-project-filter]');if(!chip)return;
 var select=document.getElementById('pst-release-project-filter');if(!select)return;
 e.preventDefault();e.stopPropagation();
 select.value=chip.getAttribute('data-project-filter');
 if(typeof window.pstReleaseRenderProjects==='function')window.pstReleaseRenderProjects();
},true);

addCss();
var attempts=0;
var timer=setInterval(function(){
 attempts++;
 wrapRenderer();
 transform();
 if(wrapped&&document.querySelector('#pst-release-project-list table')){clearInterval(timer);return;}
 if(attempts>=160)clearInterval(timer);
},100);
})();