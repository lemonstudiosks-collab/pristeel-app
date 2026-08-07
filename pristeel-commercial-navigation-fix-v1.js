/* PRISTEEL commercial navigation fix v1
 * Routes general Offer/Commercial entry points to the existing offer register.
 * Creation remains explicit through "Ofertë e re" / Krijo.
 * No data writes.
 */
(function(){
'use strict';
if(window.__pstCommercialNavigationFixV1)return;
window.__pstCommercialNavigationFixV1=true;

function norm(v){return String(v||'').replace(/\s+/g,' ').trim().toLowerCase();}
function openOfferRegister(){
  if(typeof window.pstOpenDocumentCenter!=='function')return false;
  window.pstOpenDocumentCenter('offer');
  setTimeout(function(){
    var filter=document.getElementById('pst-dc-filter');
    if(filter){filter.value='offer';if(typeof window.pstRenderDocumentList==='function')window.pstRenderDocumentList();}
    var types=document.querySelectorAll('#pst-dc-types .pst-dc-type');
    types.forEach(function(b){b.classList.toggle('active',norm(b.textContent)==='ofertë'||norm(b.textContent)==='oferte');});
  },0);
  return true;
}

function isCommercialNav(el){
  return !!el&&el.matches&&el.matches('.pst-ws-navbtn[data-key="commercial"]');
}
function isHomeOfferShortcut(el){
  if(!el||!el.closest)return false;
  var quick=el.closest('#page-workspace-home .pst-ws-quick');
  if(!quick)return false;
  var button=el.closest('button');
  return !!button&&/^ofert[ëe]$/i.test(norm(button.textContent));
}

document.addEventListener('click',function(event){
  var target=event.target;
  var nav=target.closest&&target.closest('.pst-ws-navbtn[data-key="commercial"]');
  var quick=target.closest&&target.closest('#page-workspace-home .pst-ws-quick button');
  if(isCommercialNav(nav)||isHomeOfferShortcut(quick)){
    if(typeof window.pstOpenDocumentCenter!=='function')return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openOfferRegister();
  }
},true);

window.PSTCommercialNavigationFixV1={openOfferRegister:openOfferRegister};
})();
