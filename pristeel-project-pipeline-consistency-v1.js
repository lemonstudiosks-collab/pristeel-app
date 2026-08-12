/* PRISTEEL project pipeline consistency v1
 * Read-only advisory. Never changes pipeline_stage automatically.
 * Uses project evidence only to flag a stage that appears to lag behind.
 */
(function(){
'use strict';
if(window.__pstProjectPipelineConsistencyV1)return;window.__pstProjectPipelineConsistencyV1=true;
var STAGES=[
 {id:'rfq_in',label:'Kërkesa e klientit'},
 {id:'technical_review',label:'Verifikimi teknik'},
 {id:'supplier_selection',label:'Zgjedhja e prodhuesit'},
 {id:'pricing',label:'Përcaktimi i çmimit'},
 {id:'client_offer',label:'Oferta & konfirmimi'},
 {id:'commercial',label:'Përpunimi komercial'},
 {id:'production_control',label:'Koordinimi i prodhimit'},
 {id:'factory_audit',label:'Auditimi i uzinës'},
 {id:'transport',label:'Transporti & dërgesa'}
];
function A(v){return Array.isArray(v)?v:[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function idx(id){for(var i=0;i<STAGES.length;i++)if(STAGES[i].id===id)return i;return 0;}
function label(id){return(STAGES[idx(id)]||STAGES[0]).label;}
function closed(v){return /humb|lost|closed|mbyll|arkiv|cancel|fituar|won|realizuar/i.test(String(v||''));}
function recommended(d){
 d=d||{};var p=d.project||{};
 if(closed(p.status))return null;
 if(d.currentOurOffer||A(d.ourOffers).length)return'client_offer';
 if(A(d.supplierOffers).length||A(d.rfqs).length)return'supplier_selection';
 if(A(d.bom).length)return'technical_review';
 return'rfq_in';
}
function drift(d){
 d=d||{};var p=d.project||{},cur=String(p.pipeline_stage||'rfq_in'),rec=recommended(d);
 if(!rec||idx(cur)>=idx(rec))return null;
 return{current:cur,recommended:rec,currentLabel:label(cur),recommendedLabel:label(rec)};
}
function remove(){var x=document.getElementById('pst-pipeline-consistency-card');if(x)x.remove();}
function render(){
 remove();var d=window.__pstIntegrityLastData,page=document.getElementById('page-workspace-project');if(!d||!page||!page.classList.contains('pf2-on'))return false;
 var grid=page.querySelector('#pst-pi-body .pf2-grid');if(!grid)return false;
 var x=drift(d);if(!x)return false;
 var sec=document.createElement('section');sec.id='pst-pipeline-consistency-card';sec.className='pf2-card wide pst-pipeline-advisory';
 sec.innerHTML='<header><div><b>Kontroll pipeline</b><span>Të dhënat e projektit kanë avancuar më tej se faza e regjistruar.</span></div></header><div class="pst-pipeline-advisory-body"><div><small>FAZA E REGJISTRUAR</small><b>'+E(x.currentLabel)+'</b></div><i>→</i><div><small>SUGJERIM NGA EVIDENCA</small><b>'+E(x.recommendedLabel)+'</b></div><button type="button" data-pst-pipeline-review="'+E(x.recommended)+'">Rishiko fazën</button></div><p>Ky është vetëm sinjal konsistence. Platforma nuk e ndryshon fazën automatikisht.</p>';
 grid.insertBefore(sec,grid.firstChild);return true;
}
function schedule(){setTimeout(render,0);setTimeout(render,100);setTimeout(render,260);}
function wrapOpen(){var f=window.pstOpenProjectWorkspace;if(typeof f!=='function'||f.__pstPipelineConsistency)return false;var w=async function(){var out=await f.apply(this,arguments);schedule();return out;};w.__pstPipelineConsistency=true;w.__base=f;window.pstOpenProjectWorkspace=w;return true;}
document.addEventListener('click',function(e){
 var review=e.target&&e.target.closest&&e.target.closest('[data-pst-pipeline-review]');if(review){var id=review.getAttribute('data-pst-pipeline-review'),node=document.querySelector('.pst-ws-stage[data-flow-stage="'+id+'"]');if(node)node.click();return;}
 var tab=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="overview"],[data-pf2-action="tab:overview"]');if(tab)schedule();
},true);
document.addEventListener('pst:modules-ready',function(){wrapOpen();schedule();},{once:true});
var s=document.createElement('style');s.textContent='.pst-pipeline-advisory{border-color:#eadfbd!important;background:#fffdf7}.pst-pipeline-advisory-body{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 13px}.pst-pipeline-advisory-body>div{border:1px solid #ece5d1;border-radius:9px;padding:8px 9px;background:#fff}.pst-pipeline-advisory-body small{display:block;font-size:6.6px;letter-spacing:.55px;color:#9a8d68}.pst-pipeline-advisory-body b{display:block;font-size:9px;color:#5c5543;margin-top:3px}.pst-pipeline-advisory-body i{font-style:normal;color:#b19545}.pst-pipeline-advisory-body button{height:31px;border:1px solid #d8c984;border-radius:8px;background:#fff8db;color:#755f1c;padding:0 9px;font-size:8px;font-weight:740;cursor:pointer}.pst-pipeline-advisory>p{margin:0;padding:0 13px 11px;font-size:7.5px;color:#918667}@media(max-width:720px){.pst-pipeline-advisory-body{grid-template-columns:1fr}.pst-pipeline-advisory-body i{display:none}}';document.head.appendChild(s);
wrapOpen();
window.PSTProjectPipelineConsistencyV1={recommended:recommended,drift:drift,render:render,schedule:schedule,wrapOpen:wrapOpen,stages:STAGES};
})();