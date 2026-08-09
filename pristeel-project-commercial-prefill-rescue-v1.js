/* PRISTEEL project commercial prefill rescue v1
 * Narrow event/timing bridge for project -> commercial offer creation.
 * Does not save, generate or send anything.
 */
(function(){
'use strict';
if(window.__pstProjectCommercialPrefillRescueV1)return;
window.__pstProjectCommercialPrefillRescueV1=true;
var armed='';
function id(){var d=window.__pstIntegrityLastData;return String(d&&d.project&&d.project.id||window.__pstCurrentProjectId||window._curProjId||'');}
function val(x){var e=document.getElementById(x);return String(e&&e.value||'').trim();}
function num(x){var n=parseFloat(String(val(x)).replace(',','.'));return isFinite(n)?n:0;}
function blankSelect(x,label){var e=document.getElementById(x);if(!e)return;var has=[].some.call(e.options||[],function(o){return o.value==='';});if(!has){var o=document.createElement('option');o.value='';o.textContent=label||'— Zgjidh —';e.insertBefore(o,e.firstChild);}e.value='';}
function fresh(){return !val('of-proj')&&!val('of-cli')&&!val('of-con')&&!val('of-em')&&!(Array.isArray(window.oferPos)&&window.oferPos.length);}
function visible(page){if(!page)return false;if(page.classList.contains('active'))return true;var ds=String(page.style&&page.style.display||'').toLowerCase();if(ds==='block'||ds==='flex'||ds==='grid')return true;try{var cs=window.getComputedStyle&&window.getComputedStyle(page);return !!(cs&&cs.display!=='none'&&cs.visibility!=='hidden');}catch(e){return false;}}
function neutralizeFreshDefaults(){if(!fresh())return false;['of-pr','of-kg','of-zn','of-tr','pa-cost'].forEach(function(x){var e=document.getElementById(x);if(e&&num(x)<=0)e.value='';});blankSelect('pa-exc','— Zgjidh EXC —');blankSelect('of-inc','— Zgjidh Incoterm —');blankSelect('of-pay-preset','— Zgjidh kushtet e pagesës —');blankSelect('of-cer','— Zgjidh certifikatën —');var v=document.getElementById('of-val');if(v)v.value='';return true;}
function apply(){var page=document.getElementById('page-oferta');var p=armed||id();if(!p||!visible(page))return false;if(!fresh())return false;neutralizeFreshDefaults();var api=window.PSTProjectCommercialPrefillV1;if(api&&typeof api.prefill==='function'){try{return api.prefill(p)!==false;}catch(e){if(window.console)console.warn('Project commercial prefill rescue:',e);}}return false;}
function schedule(){if(!armed)armed=id();[90,220,500,900].forEach(function(ms){setTimeout(apply,ms);});}
function ensureAndSchedule(){armed=armed||id();var api=window.PSTProjectCommercialPrefillV1;if(api&&typeof api.prefill==='function'){schedule();return;}var old=document.querySelector('script[data-pst-project-commercial-prefill-rescue-load]');if(old){schedule();return;}var s=document.createElement('script');s.src='pristeel-project-commercial-prefill-v1.js?v='+Date.now();s.defer=true;s.setAttribute('data-pst-project-commercial-prefill-rescue-load','1');s.onload=schedule;s.onerror=schedule;document.head.appendChild(s);}
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-pf2-action="offer"]'):null;if(t){armed=id();return;}var choice=e.target&&e.target.closest?e.target.closest('#pst-cdb-choice [data-m]'):null;if(choice){armed=armed||id();ensureAndSchedule();return;}var mode=e.target&&e.target.closest?e.target.closest('#page-oferta [data-cdm]'):null;if(mode&&id()){armed=id();ensureAndSchedule();}},true);
window.PSTProjectCommercialPrefillRescueV1={apply:apply,schedule:schedule,neutralizeFreshDefaults:neutralizeFreshDefaults,visible:visible};
})();
