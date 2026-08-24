/* PRISTEEL Offer Revision Email Bridge v1 */
(function(){
'use strict';
if(window.__pstOfferRevisionEmailBridgeV1)return;window.__pstOfferRevisionEmailBridgeV1=true;
function install(){var H=window.PSTOfferRevisionEmailDraftV1;if(!H||typeof H.createDraftFromCurrentOffer!=='function')return false;var W=window.PSTOfferPdfEmailWorkflowV1||(window.PSTOfferPdfEmailWorkflowV1={});W.createDraftFromCurrentOffer=function(options){return H.createDraftFromCurrentOffer(options);};return true;}
function loadCommercialSimplified(){if(window.PSTProjectCommercialSimplifiedV1||document.querySelector('script[data-pst-project-commercial-simplified]'))return;var s=document.createElement('script');s.src='pristeel-project-commercial-simplified-v1.js?v=20260823-1';s.defer=true;s.setAttribute('data-pst-project-commercial-simplified','1');document.head.appendChild(s);}
[0,120,400,900,1800].forEach(function(ms){setTimeout(function(){install();loadCommercialSimplified();},ms);});
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#pst-ora-save-draft'))install();},true);
document.addEventListener('pst:modules-ready',function(){install();loadCommercialSimplified();},{once:true});
loadCommercialSimplified();
window.PSTOfferRevisionEmailBridgeV1={install:install,loadCommercialSimplified:loadCommercialSimplified};
})();
