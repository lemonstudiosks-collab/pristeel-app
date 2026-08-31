/* PPPP UI Standard v1 loader
 * Presentation-only handoff to the approved balanced platform layer.
 * Existing business, project, Gmail, finance, TED and automation engines remain authoritative.
 */
(function(){
'use strict';
if(window.__pstUIStandardV1){try{if(window.PSTUIStandardV1)window.PSTUIStandardV1.apply();}catch(e){}return;}
window.__pstUIStandardV1=true;
function load(attr,src,ready){
  try{
    var old=document.querySelector('script['+attr+']');if(old){if(ready)ready();return old;}
    var s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute(attr,'1');
    s.onload=function(){if(ready)ready();};document.head.appendChild(s);return s;
  }catch(e){return false;}
}
function insights(){
  try{
    if(window.PSTHomeInsightsV1&&typeof window.PSTHomeInsightsV1.apply==='function'){window.PSTHomeInsightsV1.apply(false);return true;}
    return load('data-pst-home-insights-v1','pristeel-home-insights-v1.js?v=20260831-1',function(){try{if(window.PSTHomeInsightsV1&&typeof window.PSTHomeInsightsV1.apply==='function')window.PSTHomeInsightsV1.apply(false);}catch(e){}});
  }catch(e){return false;}
}
function balanced(){
  try{
    if(window.PSTUIBalancedV1&&typeof window.PSTUIBalancedV1.apply==='function'){window.PSTUIBalancedV1.apply();insights();return true;}
    return load('data-pst-ui-balanced-v1','pristeel-ui-balanced-v1.js?v=20260831-2',function(){try{if(window.PSTUIBalancedV1&&typeof window.PSTUIBalancedV1.apply==='function')window.PSTUIBalancedV1.apply();}catch(e){}insights();});
  }catch(e){return false;}
}
function apply(){try{document.documentElement.classList.add('pst-ui-standard-v1','pst-ui-balanced');}catch(e){}balanced();return true;}
window.PSTUIStandardV1={apply:apply,version:'20260831-balanced3'};
apply();
})();