/* PRISTEEL Our Offer Stability v2
 * Prevents accidental duplicate save clicks while preserving the existing document-number collision guard.
 * No automatic retries and no background writes.
 */
(function(){
'use strict';
if(window.__pstOurOfferStabilityV2)return;
window.__pstOurOfferStabilityV2=true;
var LOCK_MS=5000;
function isSaveButton(el){
  if(!el||!el.closest)return null;
  var b=el.closest('button');
  if(!b)return null;
  var code=String(b.getAttribute('onclick')||'');
  return /saveOfferState\s*\(/.test(code)?b:null;
}
function lockButton(b){
  if(!b||b.dataset.pstSaving==='1')return false;
  b.dataset.pstSaving='1';
  b.dataset.pstOldDisabled=b.disabled?'1':'0';
  b.disabled=true;
  var old=b.textContent;
  if(old)b.dataset.pstOldText=old;
  setTimeout(function(){
    b.dataset.pstSaving='0';
    if(b.dataset.pstOldDisabled!=='1')b.disabled=false;
    if(b.dataset.pstOldText)b.textContent=b.dataset.pstOldText;
  },LOCK_MS);
  return true;
}
document.addEventListener('click',function(e){
  var b=isSaveButton(e.target);if(!b)return;
  if(b.dataset.pstSaving==='1'){
    e.preventDefault();e.stopImmediatePropagation();return;
  }
  lockButton(b);
},true);
window.PSTOurOfferStabilityV2={lockButton:lockButton};
})();