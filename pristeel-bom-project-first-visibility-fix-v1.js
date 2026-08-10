/* PRISTEEL project-first BOM visibility fix v1
 * Narrow bridge: when the Dukley document-BOM preview opens the legacy BOM editor,
 * hide the project-first workspace page so the legacy BOM page is not covered.
 * No BOM data, persistence, offer, RFQ or invoice logic is changed here.
 */
(function(){
'use strict';
if(window.__pstBomProjectFirstVisibilityFixV1)return;
window.__pstBomProjectFirstVisibilityFixV1=true;

function hideProjectFirst(){
  var page=document.getElementById('page-workspace-project');
  if(!page)return false;
  page.classList.remove('active');
  page.style.display='none';
  return true;
}

document.addEventListener('click',function(e){
  if(!e.target||!e.target.closest)return;
  var btn=e.target.closest('#pst-doc-bom-pf2-open');
  if(!btn)return;
  // Capture phase runs before the button's existing onclick handler. This only removes
  // the stale inline display:block left by the project-first workspace.
  hideProjectFirst();
},true);

window.PSTBomProjectFirstVisibilityFixV1={hideProjectFirst:hideProjectFirst};
})();
