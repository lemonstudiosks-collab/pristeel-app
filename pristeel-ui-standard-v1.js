/* PPPP UI Standard v1 loader
 * Presentation-only handoff to the approved balanced platform layer.
 * Existing business, project, Gmail, finance, TED and automation engines remain authoritative.
 */
(function(){
'use strict';
if(window.__pstUIStandardV1){try{if(window.PSTUIStandardV1)window.PSTUIStandardV1.apply();}catch(e){}return;}
window.__pstUIStandardV1=true;
function balanced(){
  try{
    if(window.PSTUIBalancedV1&&typeof window.PSTUIBalancedV1.apply==='function'){window.PSTUIBalancedV1.apply();return true;}
    var old=document.querySelector('script[data-pst-ui-balanced-v1]');if(old)return old;
    var s=document.createElement('script');s.src='pristeel-ui-balanced-v1.js?v=20260831-2';s.defer=true;s.setAttribute('data-pst-ui-balanced-v1','1');
    s.onload=function(){try{if(window.PSTUIBalancedV1&&typeof window.PSTUIBalancedV1.apply==='function')window.PSTUIBalancedV1.apply();}catch(e){}};
    document.head.appendChild(s);return s;
  }catch(e){return false;}
}
function apply(){try{document.documentElement.classList.add('pst-ui-standard-v1','pst-ui-balanced');}catch(e){}balanced();return true;}
window.PSTUIStandardV1={apply:apply,version:'20260831-balanced2'};
apply();
})();