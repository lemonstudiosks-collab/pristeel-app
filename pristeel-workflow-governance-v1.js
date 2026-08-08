/* PRISTEEL workflow governance v1
 * Universal rule: drafts may be saved; official/outbound actions require explicit human approval.
 * Targeted wrappers only. No background writes, no automatic sends.
 */
(function(){
'use strict';
if(window.__pstWorkflowGovernanceV1)return;window.__pstWorkflowGovernanceV1=true;
var approvedClick=null;
function confirmAction(kind){var msg=kind==='invoice'?'Kjo do ta regjistrojë faturën dalëse si dokument zyrtar. Mirato ruajtjen?':kind==='adjustment'?'Kjo do ta regjistrojë notën kreditore/debitore si dokument zyrtar. Mirato ruajtjen?':kind==='followup'?'Ky veprim hap një follow-up zyrtar për dërgim nga email-i i kompanisë. Mirato draftin për dërgim?':kind==='close'?'Mbylle projektin vetëm nëse dërgesa dhe pagesa janë konfirmuar. A janë të dyja të përfunduara?':'Ky veprim hap komunikim zyrtar nga email-i i kompanisë. Mirato para se të vazhdosh?';return window.confirm(msg);}
function wrap(name,kind){var f=window[name];if(typeof f!=='function'||f.__pstGoverned)return false;function w(){if(!confirmAction(kind))return false;return f.apply(this,arguments);}w.__pstGoverned=true;w.__base=f;window[name]=w;return true;}
function wrapProjects(){var f=window.pstProjectsModernAction;if(typeof f!=='function'||f.__pstGoverned)return false;function w(id,act){if(act==='closed'&&!confirmAction('close'))return false;return f.apply(this,arguments);}w.__pstGoverned=true;w.__base=f;window.pstProjectsModernAction=w;return true;}
function install(){wrap('saveInvoiceOut','invoice');wrap('pstSaveAdjustment','adjustment');wrap('sendFollowup','followup');wrap('pstPiMail','outbound');wrapProjects();}
function isCompose(a){var href=String(a&&a.getAttribute&&a.getAttribute('href')||'');return /mail\.google\.com\/mail\/.+view=cm/i.test(href)||/mail\.google\.com\/mail\/\?view=cm/i.test(href);}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a||!isCompose(a))return;if(approvedClick===a){approvedClick=null;return;}if(!confirmAction('outbound')){e.preventDefault();e.stopImmediatePropagation();return;}approvedClick=a;setTimeout(function(){if(approvedClick===a)approvedClick=null;},1200);},true);
function loadRfqGovernance(){if(document.querySelector('script[data-pst-rfq-draft-governance]'))return;var s=document.createElement('script');s.src='pristeel-rfq-draft-governance-v1.js?v=20260808-2';s.defer=true;s.setAttribute('data-pst-rfq-draft-governance','1');document.head.appendChild(s);}
install();loadRfqGovernance();[100,400,1200,2500].forEach(function(ms){setTimeout(install,ms);});document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTWorkflowGovernanceV1={install:install};
})();