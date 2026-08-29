/* PRISTEEL post-award execution surface v1
 * Presentation-only simplifier for won / execution projects.
 * Keeps the daily surface focused on Execution + Finance while preserving
 * Files/Communication as utilities and all pre-award data as read-only history.
 * No Supabase writes. No outbound actions. No polling or persistent observers.
 */
(function(){
'use strict';
if(window.__pstProjectExecutionSurfaceV1)return;
window.__pstProjectExecutionSurfaceV1=true;

function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_]+/g,' ').replace(/\s+/g,' ').trim();}
function page(){return document.getElementById('page-workspace-project');}
function project(){var d=window.__pstIntegrityLastData||null;return d&&d.project||null;}
function postAward(){
  try{var G=window.PSTProjectExecutionGuardV1;if(G&&typeof G.locked==='function')return !!G.locked();}catch(e){}
  var p=project();if(!p)return false;
  var st=N(p.status),op=N(p.operational_state),stage=N(p.pipeline_stage);
  return op==='execution'||/\b(fituar|won|realizuar|completed)\b/.test(st)||!!p.execution_bootstrapped_at||/\b(production|production_control|execution|ekzekutim|transport|delivery|installation|montim|handover|commissioning)\b/.test(stage);
}
function hide(node){if(!node)return;node.hidden=true;node.style.setProperty('display','none','important');node.setAttribute('aria-hidden','true');node.setAttribute('data-pst-postaward-hidden','1');}
function ensureCss(){
  if(document.getElementById('pxs-post-award-css'))return;
  var s=document.createElement('style');s.id='pxs-post-award-css';s.textContent=`
#page-workspace-project.pxs-post-award [data-pwf-area="procurement"],
#page-workspace-project.pxs-post-award [data-pf2-tab="bom"],
#page-workspace-project.pxs-post-award [data-pf2-tab="procurement"],
#page-workspace-project.pxs-post-award [data-pf2-tab="commercial"],
#page-workspace-project.pxs-post-award .pst-pi-tab[data-tab="bom"],
#page-workspace-project.pxs-post-award .pst-pi-tab[data-tab="procurement"],
#page-workspace-project.pxs-post-award .pst-pi-tab[data-tab="commercial"],
#page-workspace-project.pxs-post-award .pwf-procurement-head,
#page-workspace-project.pxs-post-award .pwf-stage-nav,
#page-workspace-project.pxs-post-award #pst-pipeline-consistency-card,
#page-workspace-project.pxs-post-award .pst-pipeline-advisory,
#page-workspace-project.pxs-post-award [data-pwf-stage],
#page-workspace-project.pxs-post-award [data-flow-stage],
#page-workspace-project.pxs-post-award [data-pwf-action="open-bom"],
#page-workspace-project.pxs-post-award [data-pwf-action="open-rfq"],
#page-workspace-project.pxs-post-award [data-pwf-action="open-pricing"],
#page-workspace-project.pxs-post-award [data-pwf-action="open-client-offer"],
#page-workspace-project.pxs-post-award [data-pf2-action="legacy-bom"],
#page-workspace-project.pxs-post-award [data-pf2-action="rfq"],
#page-workspace-project.pxs-post-award [data-pf2-action="offer"]{display:none!important}
#page-workspace-project.pxs-post-award .pwf-project-kpis{display:none!important}
#page-workspace-project.pxs-post-award .pwf-project-context{grid-template-columns:minmax(0,1fr) minmax(260px,.8fr)!important}
#page-workspace-project.pxs-post-award .pwf-next{min-width:0!important;width:100%!important}
#page-workspace-project.pxs-post-award .pxg-lock>div:last-child button[data-pxg-go="files"],
#page-workspace-project.pxs-post-award .pxg-lock>div:last-child button[data-pxg-go="communication"]{display:none!important}
#page-workspace-project.pxs-post-award .pxs-focus-note{margin:0 0 12px;padding:12px 14px;border:1px solid #d8e5dd;border-radius:12px;background:#f7fbf8}
#page-workspace-project.pxs-post-award .pxs-focus-note span{display:block;font-size:8px;font-weight:800;letter-spacing:.65px;color:#3d7b5a}
#page-workspace-project.pxs-post-award .pxs-focus-note b{display:block;margin-top:2px;font-size:13px;color:#2f4238}
#page-workspace-project.pxs-post-award .pxs-focus-note small{display:block;margin-top:3px;font-size:10px;line-height:1.45;color:#738078}
@media(max-width:760px){#page-workspace-project.pxs-post-award .pwf-project-context{grid-template-columns:1fr!important}}
`;
  document.head.appendChild(s);
}
function simplifyHeader(root){
  var actions=root&&root.querySelector('.pst-pi-actions');if(!actions)return;
  [].slice.call(actions.querySelectorAll('button')).forEach(function(b){
    var text=N(b.textContent),id=N(b.id),action=N(b.getAttribute('data-pf2-action')||b.getAttribute('data-pwf-action'));
    var hay=[text,id,action].join(' ');
    if(/mblidh nga gmail|permbledh projektin|puno me projektin|\bbom\b|\brfq\b|ofert|cmim|pricing|kalkulator|furnitor|supplier|commercial/.test(hay))hide(b);
  });
}
function simplifyHero(root){
  var hero=root&&root.querySelector('.pf2-hero');if(!hero)return;
  [].slice.call(hero.querySelectorAll('.pf2-shortcut')).forEach(function(s){
    var text=N(s.textContent);
    if(/\bbom\b|\brfq\b|ofert|cmim|pricing|kalkulator|furnitor|supplier|commercial/.test(text))hide(s);
  });
}
function simplifyLegacy(root){
  var bar=document.getElementById('flow-bar');if(!bar)return;
  var flow=bar.querySelector('.pxg-legacy-flow');if(!flow)return;
  [].slice.call(flow.querySelectorAll('button')).forEach(function(b){var go=b.getAttribute('data-pxg-go');if(go!=='execution'&&go!=='finance')hide(b);});
  [].slice.call(flow.querySelectorAll('span')).forEach(function(x){if(!x.previousElementSibling||!x.nextElementSibling||x.previousElementSibling.hidden||x.nextElementSibling.hidden)hide(x);});
}
function focusNote(root){
  var body=root&&root.querySelector('#pst-pi-body');if(!body)return;
  var old=body.querySelector('.pxs-focus-note');if(old)old.remove();
  var lock=body.querySelector('#pxg-execution-lock');
  if(lock){
    var title=lock.querySelector('b'),copy=lock.querySelector('small');
    if(title)title.textContent='Fokusi: realizimi dhe financat';
    if(copy)copy.textContent='Ndiq prodhimin/realizimin, afatet, kostot, faturat dhe pagesat. BOM, RFQ, çmimi dhe oferta mbeten vetëm histori.';
    return;
  }
  var ctx=body.querySelector('.pwf-project-context'),sec=document.createElement('section');sec.className='pxs-focus-note';
  sec.innerHTML='<span>PROJEKT NË EKZEKUTIM</span><b>Fokusi: realizimi dhe financat</b><small>Ndiq prodhimin/realizimin, afatet, kostot, faturat dhe pagesat. Të dhënat para fitimit mbeten vetëm histori.</small>';
  if(ctx)ctx.insertAdjacentElement('afterend',sec);else body.insertAdjacentElement('afterbegin',sec);
}
function clean(){
  ensureCss();var root=page();if(!root)return false;
  if(!postAward()){root.classList.remove('pxs-post-award');return false;}
  root.classList.add('pxs-post-award');
  [].slice.call(root.querySelectorAll('[data-pwf-area="procurement"],[data-pf2-tab="bom"],[data-pf2-tab="procurement"],[data-pf2-tab="commercial"],.pst-pi-tab[data-tab="bom"],.pst-pi-tab[data-tab="procurement"],.pst-pi-tab[data-tab="commercial"],.pwf-procurement-head,.pwf-stage-nav,#pst-pipeline-consistency-card,.pst-pipeline-advisory')).forEach(hide);
  [].slice.call(root.querySelectorAll('[data-pwf-stage],[data-flow-stage]')).forEach(hide);
  [].slice.call(root.querySelectorAll('[data-pwf-action],[data-pf2-action]')).forEach(function(x){var a=N(x.getAttribute('data-pwf-action')||x.getAttribute('data-pf2-action'));if(/^(open_bom|open_rfq|open_pricing|open_client_offer|legacy_bom|rfq|offer)$/.test(a.replace(/-/g,'_')))hide(x);});
  simplifyHeader(root);simplifyHero(root);simplifyLegacy(root);focusNote(root);
  return true;
}
function schedule(){[0,70,180,420,900].forEach(function(ms){setTimeout(clean,ms);});}

document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-pm-open],[data-pwf-area],[data-pf2-tab],[data-pxg-go],.pst-ws-navbtn'):null;if(t)schedule();},true);
document.addEventListener('change',function(e){if(e.target&&e.target.id==='global-proj')schedule();},true);
if(document.readyState!=='loading')schedule();else document.addEventListener('DOMContentLoaded',schedule,{once:true});
window.PSTProjectExecutionSurfaceV1={clean:clean,schedule:schedule,postAward:postAward};
})();
