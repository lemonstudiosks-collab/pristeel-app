/* PRISTEEL Project Workspace Cleanup v1
 * Final presentation cleanup for the canonical Project Workspace.
 * Removes legacy module/page chrome while a project is open, keeps one next action,
 * and converts supplier detail toggles to native inline disclosures so closing details
 * cannot fall through to legacy navigation.
 * UI-only: no Supabase/Gmail writes and no outbound action.
 */
(function(){
'use strict';
if(window.__pstProjectWorkspaceCleanupV1)return;window.__pstProjectWorkspaceCleanupV1=true;
function projectPage(){return document.getElementById('page-workspace-project');}
function projectActive(){var p=projectPage();return !!(p&&p.classList.contains('active'));}
function commercialActive(){var p=projectPage();return !!(p&&p.classList.contains('active')&&p.classList.contains('pf2-on')&&p.querySelector('[data-pf2-tab="commercial"].on'));}
function syncProjectChrome(){var on=projectActive();document.body.classList.toggle('pst-project-clean-chrome',on);if(on)markLegacyFlowRibbon();return on;}
function markLegacyFlowRibbon(){var steps=[].slice.call(document.querySelectorAll('.flow-step'));if(!steps.length)return null;for(var i=0;i<steps.length;i++){var n=steps[i].parentElement,depth=0;while(n&&n!==document.body&&depth++<5){if(n.querySelectorAll&&n.querySelectorAll('.flow-step').length>=3){n.classList.add('pst-project-legacy-flow-ribbon');return n;}n=n.parentElement;}}return null;}
function makeSupplierDisclosure(card){if(!card||card.querySelector('.pst-csf-inline-detail'))return false;var btn=card.querySelector('[data-csf-detail]'),panel=card.querySelector('[data-csf-detail-panel]');if(!btn||!panel)return false;var details=document.createElement('details');details.className='pst-csf-inline-detail';var summary=document.createElement('summary');summary.innerHTML='<span class="pst-csf-detail-closed">Detaje</span><span class="pst-csf-detail-open">Mbyll detajet</span>';details.appendChild(summary);panel.hidden=false;panel.removeAttribute('hidden');panel.removeAttribute('data-csf-detail-panel');panel.classList.add('pst-csf-inline-detail-body');details.appendChild(panel);var footer=btn.parentElement;footer.insertBefore(details,btn);btn.remove();return true;}
function cleanCommercial(){if(!commercialActive())return false;var root=document.querySelector('[data-pst-csf="1"]');if(!root)return false;[].slice.call(root.querySelectorAll('.pst-csf-supplier')).forEach(makeSupplierDisclosure);[].slice.call(root.querySelectorAll('.pst-csf-client [data-csf-action]')).forEach(function(b){b.remove();});return true;}
function decorate(){syncProjectChrome();cleanCommercial();}
function schedule(){[0,40,120,320,700].forEach(function(ms){setTimeout(decorate,ms);});}
function wrapCommercialRender(){var C=window.PSTProjectCommercialSimplifiedV1;if(!C||typeof C.render!=='function'||C.render.__pstWorkspaceCleanup)return false;var base=C.render;function wrapped(){var out=base.apply(this,arguments);setTimeout(decorate,0);return out;}wrapped.__pstWorkspaceCleanup=true;wrapped.__base=base;C.render=wrapped;return true;}
function install(){css();wrapCommercialRender();schedule();return true;}
function css(){if(document.getElementById('pst-project-workspace-cleanup-css'))return;var s=document.createElement('style');s.id='pst-project-workspace-cleanup-css';s.textContent='\
body.pst-project-clean-chrome #modbar,body.pst-project-clean-chrome .topbar,body.pst-project-clean-chrome .pst-project-legacy-flow-ribbon{display:none!important}\
body.pst-project-clean-chrome #page-workspace-project.active{padding-top:0!important}\
.pst-csf-inline-detail{display:inline-block;position:relative}.pst-csf-inline-detail>summary{list-style:none;min-height:34px;padding:0 11px;border:1px solid #D2E0E5;border-radius:8px;background:#fff;color:#417D94;font-size:10.5px;font-weight:750;display:inline-flex;align-items:center;cursor:pointer}.pst-csf-inline-detail>summary::-webkit-details-marker{display:none}.pst-csf-inline-detail>summary:hover{background:#F3F8FA;border-color:#AFCBD5}.pst-csf-detail-open{display:none}.pst-csf-inline-detail[open] .pst-csf-detail-closed{display:none}.pst-csf-inline-detail[open] .pst-csf-detail-open{display:inline}.pst-csf-inline-detail[open]{display:block;width:100%}.pst-csf-inline-detail[open]>summary{margin-bottom:8px}.pst-csf-inline-detail-body{margin:0 -13px -11px;padding:12px 13px;border-top:1px solid #E5ECEF;background:#FBFCFD}\
';document.head.appendChild(s);}
window.addEventListener('click',function(){setTimeout(function(){wrapCommercialRender();decorate();},0);setTimeout(decorate,120);},true);
document.addEventListener('pst:modules-ready',function(){install();},{once:true});
document.addEventListener('pst:offer-saved',schedule);
window.addEventListener('pageshow',schedule,{once:true});
install();
window.PSTProjectWorkspaceCleanupV1={install:install,decorate:decorate,cleanCommercial:cleanCommercial,syncProjectChrome:syncProjectChrome,markLegacyFlowRibbon:markLegacyFlowRibbon,_test:{projectActive:projectActive,commercialActive:commercialActive,makeSupplierDisclosure:makeSupplierDisclosure}};
})();
