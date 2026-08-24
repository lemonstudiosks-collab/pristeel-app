/* PRISTEEL Offer Revision Email Bridge v1 */
(function(){
'use strict';
if(window.__pstOfferRevisionEmailBridgeV1)return;window.__pstOfferRevisionEmailBridgeV1=true;
function install(){var H=window.PSTOfferRevisionEmailDraftV1;if(!H||typeof H.createDraftFromCurrentOffer!=='function')return false;var W=window.PSTOfferPdfEmailWorkflowV1||(window.PSTOfferPdfEmailWorkflowV1={});W.createDraftFromCurrentOffer=function(options){return H.createDraftFromCurrentOffer(options);};return true;}
function loadScriptOnce(flag,attr,src){if(window[flag]||document.querySelector('script['+attr+']'))return false;var s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute(attr,'1');document.head.appendChild(s);return true;}
function loadCommercialSimplified(){loadScriptOnce('PSTProjectCommercialSimplifiedV1','data-pst-project-commercial-simplified','pristeel-project-commercial-simplified-v1.js?v=20260824-2');setTimeout(loadWorkspaceCleanup,40);}
function loadWorkspaceCleanup(){loadScriptOnce('PSTProjectWorkspaceCleanupV1','data-pst-project-workspace-cleanup','pristeel-project-workspace-cleanup-v1.js?v=20260824-1');}
[0,120,400,900,1800].forEach(function(ms){setTimeout(function(){install();loadCommercialSimplified();loadWorkspaceCleanup();},ms);});
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#pst-ora-save-draft'))install();},true);
document.addEventListener('pst:modules-ready',function(){install();loadCommercialSimplified();loadWorkspaceCleanup();},{once:true});
loadCommercialSimplified();loadWorkspaceCleanup();
window.PSTOfferRevisionEmailBridgeV1={install:install,loadCommercialSimplified:loadCommercialSimplified,loadWorkspaceCleanup:loadWorkspaceCleanup};
})();
