/* PPPP UI Standard v1 loader
 * Loads one Home presentation owner plus a presentation-only English UI guard.
 * Existing project, Gmail, finance, TED, auth and automation engines remain authoritative.
 */
(function(){
'use strict';
if(window.__pstUIStandardV1){try{if(window.PSTUIStandardV1)window.PSTUIStandardV1.apply();}catch(e){}return;}
window.__pstUIStandardV1=true;
function load(attr,src,ready){try{var old=document.querySelector('script['+attr+']');if(old){if(ready)ready();return old;}var s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute(attr,'1');s.onload=function(){if(ready)ready();};document.head.appendChild(s);return s;}catch(e){return false;}}
function englishGuard(){try{if(window.PSTUIEnglishGuardV1&&typeof window.PSTUIEnglishGuardV1.apply==='function'){window.PSTUIEnglishGuardV1.apply();return true;}return load('data-pst-ui-english-guard-v1','pristeel-ui-english-guard-v1.js?v=20260831-1',function(){try{if(window.PSTUIEnglishGuardV1&&typeof window.PSTUIEnglishGuardV1.apply==='function')window.PSTUIEnglishGuardV1.apply();}catch(e){}});}catch(e){return false;}}
function commandCenter(){try{if(window.PSTCommandCenterV2&&typeof window.PSTCommandCenterV2.apply==='function'){window.PSTCommandCenterV2.apply(false);englishGuard();return true;}return load('data-pst-command-center-v2','pristeel-command-center-v2.js?v=20260831-1',function(){try{if(window.PSTCommandCenterV2&&typeof window.PSTCommandCenterV2.apply==='function')window.PSTCommandCenterV2.apply(true);englishGuard();}catch(e){}});}catch(e){return false;}}
function apply(){try{document.documentElement.classList.add('pst-ui-standard-v1','pst-ui-command-center-v2');}catch(e){}commandCenter();englishGuard();return true;}
window.PSTUIStandardV1={apply:apply,version:'20260831-command-center-v2-en1'};
apply();
})();
