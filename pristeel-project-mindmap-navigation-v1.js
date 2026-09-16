/* PRISTEEL Project Mindmap Navigation v1
 * Navigation-only bridge for the Projects mindmap "Kthehu" action.
 * It delegates Home activation to the current primary navigation owner and
 * intercepts at window-capture level before older document-level handlers.
 * No data access, writes, polling or business decisions.
 */
(function(){
'use strict';
if(window.__pstProjectMindmapNavigationV1)return;
window.__pstProjectMindmapNavigationV1=true;

function primaryOwner(){
  return window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV9||window.PSTPrimaryNavResilienceV8||window.PSTPrimaryNavResilienceV7||window.PSTPrimaryNavResilienceV6||window.PSTPrimaryNavResilienceV5||window.PSTPrimaryNavResilienceV4||window.PSTPrimaryNavResilienceV3||window.PSTPrimaryNavResilienceV2||window.PSTPrimaryNavResilienceV1||null;
}
function openHome(){
  var P=primaryOwner();
  try{if(P&&typeof P.openHome==='function')return P.openHome()!==false;}catch(e){console.warn('PPPP Projects back final route:',e);}
  var H=window.PSTHomeCanonicalV1;
  try{
    if(H&&typeof H.activateHome==='function'){
      H.activateHome();
      if(typeof H.render==='function')Promise.resolve(H.render(true)).catch(function(){});
      return true;
    }
  }catch(e){console.warn('PPPP Projects back canonical fallback:',e);}
  try{if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('home');return true;}}catch(e){}
  try{if(typeof window.goHome==='function'){window.goHome();return true;}}catch(e){}
  return false;
}
function intercept(e){
  var back=e.target&&e.target.closest?e.target.closest('[data-pmm-back]'):null;
  if(!back)return;
  e.preventDefault();
  e.stopPropagation();
  if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
  openHome();
}
window.addEventListener('click',intercept,true);
window.PSTProjectMindmapNavigationV1={openHome:openHome,primaryOwner:primaryOwner};
})();
