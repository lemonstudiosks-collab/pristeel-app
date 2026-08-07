/* PRISTEEL Modal / Navigation Safety v2
 * One synchronous Escape path for known overlays. No observers, polling, reads or writes.
 */
(function(){
'use strict';
if(window.__pstModalNavigationSafetyV2)return;
window.__pstModalNavigationSafetyV2=true;
function click(sel){var e=document.querySelector(sel);if(e&&typeof e.click==='function'){e.click();return true;}return false;}
function closeTop(){
  if(click('#pst-bcc .pst-bcc-close'))return true;
  if(click('#pgi2-close'))return true;
  if(click('#pst-flow-stage-bg .pst-flow-stage-x'))return true;
  var oe=document.getElementById('oe-bg');
  if(oe&&oe.classList.contains('on')){if(typeof window.pstCloseOffer==='function')window.pstCloseOffer();else oe.classList.remove('on');return true;}
  if(click('.pst-modal-bg .pst-modal-x'))return true;
  return false;
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeTop();},true);
window.PSTModalNavigationSafetyV2={closeTop:closeTop};
})();