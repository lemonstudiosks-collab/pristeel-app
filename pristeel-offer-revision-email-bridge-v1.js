/* PRISTEEL Offer Revision Email Bridge v1 */
(function(){
'use strict';
if(window.__pstOfferRevisionEmailBridgeV1)return;window.__pstOfferRevisionEmailBridgeV1=true;
function install(){var H=window.PSTOfferRevisionEmailDraftV1;if(!H||typeof H.createDraftFromCurrentOffer!=='function')return false;var W=window.PSTOfferPdfEmailWorkflowV1||(window.PSTOfferPdfEmailWorkflowV1={});W.createDraftFromCurrentOffer=function(options){return H.createDraftFromCurrentOffer(options);};return true;}
[0,120,400,900,1800].forEach(function(ms){setTimeout(install,ms);});
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#pst-ora-save-draft'))install();},true);
document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTOfferRevisionEmailBridgeV1={install:install};
})();
