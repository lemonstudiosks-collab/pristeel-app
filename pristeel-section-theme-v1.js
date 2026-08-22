/* PRISTEEL section theme v1
 * Calm, page-specific color families for the top-level PPPP surfaces.
 * Presentation/routing only: no data reads/writes, observers, polling, or business-state changes.
 */
(function(){
'use strict';
if(window.__pstSectionThemeV1)return;
window.__pstSectionThemeV1=true;

function css(){
  if(document.getElementById('pst-section-theme-v1-css'))return;
  var s=document.createElement('style');
  s.id='pst-section-theme-v1-css';
  s.textContent=`
/* Default workspace blue. Each active top-level surface overrides these variables. */
body{--pst-section-accent:#5E94A8;--pst-section-deep:#3F6F81;--pst-section-soft:#EFF6F8;--pst-section-line:#C9DEE5;--pst-section-wash:#F7FAFB}
body:has(#page-workspace-home.active){--pst-section-accent:#5E94A8;--pst-section-deep:#3F6F81;--pst-section-soft:#EFF6F8;--pst-section-line:#C9DEE5;--pst-section-wash:#F7FAFB}
body:has(#page-workspace-projects.active,#page-workspace-project.active){--pst-section-accent:#6888A7;--pst-section-deep:#496983;--pst-section-soft:#F0F4F8;--pst-section-line:#CFDBE6;--pst-section-wash:#F7F9FB}
body:has(#page-kek-tenders.active){--pst-section-accent:#8177A6;--pst-section-deep:#625A84;--pst-section-soft:#F4F1F8;--pst-section-line:#D9D3E7;--pst-section-wash:#FAF9FC}
body:has(#page-workspace-contacts.active,#page-contacts.active){--pst-section-accent:#609489;--pst-section-deep:#447167;--pst-section-soft:#EFF6F4;--pst-section-line:#CCE0DB;--pst-section-wash:#F8FBFA}
body:has(#page-workspace-inbox.active){--pst-section-accent:#A98558;--pst-section-deep:#7F623E;--pst-section-soft:#F9F4ED;--pst-section-line:#E4D7C7;--pst-section-wash:#FCFAF7}
body:has(#page-workspace-commercial.active,#page-document-center.active,#page-oferta.active,#page-invoices.active){--pst-section-accent:#7580A7;--pst-section-deep:#565F83;--pst-section-soft:#F2F3F8;--pst-section-line:#D5D9E6;--pst-section-wash:#FAFAFC}
body:has(#page-finance.active){--pst-section-accent:#6F9678;--pst-section-deep:#506F58;--pst-section-soft:#F1F6F2;--pst-section-line:#D0DFD3;--pst-section-wash:#F9FBF9}
body:has(#page-workspace-apps.active,#module-hub.active,#page-home.active){--pst-section-accent:#7A8D98;--pst-section-deep:#5A6D77;--pst-section-soft:#F2F5F6;--pst-section-line:#D6E0E4;--pst-section-wash:#F9FAFB}

/* A small, stable section ribbon. It gives every top-level area an immediate identity. */
:is(#page-workspace-home,#page-workspace-projects,#page-workspace-project,#page-kek-tenders,#page-workspace-contacts,#page-contacts,#page-workspace-inbox,#page-workspace-commercial,#page-document-center,#page-oferta,#page-invoices,#page-finance,#page-workspace-apps,#module-hub,#page-home).active{
  border-top:6px solid var(--pst-section-accent)!important;
  background-color:var(--pst-section-wash)!important;
}

/* Legacy/module bars use the same calm family instead of alternating green/blue. */
body:has(:is(#page-kek-tenders,#page-workspace-contacts,#page-contacts,#page-workspace-inbox,#page-workspace-commercial,#page-document-center,#page-oferta,#page-invoices,#page-finance,#page-workspace-apps,#module-hub,#page-home).active) #modbar{
  background:var(--pst-section-accent)!important;
  border-bottom:1px solid var(--pst-section-deep)!important;
}
body:has(:is(#page-kek-tenders,#page-workspace-contacts,#page-contacts,#page-workspace-inbox,#page-workspace-commercial,#page-document-center,#page-oferta,#page-invoices,#page-finance,#page-workspace-apps,#module-hub,#page-home).active) .topbar{
  border-top:6px solid var(--pst-section-accent)!important;
  background:var(--pst-section-soft)!important;
  border-bottom-color:var(--pst-section-line)!important;
}

/* Sidebar follows the section currently being viewed. */
body:has(:is(#page-workspace-home,#page-workspace-projects,#page-workspace-project,#page-kek-tenders,#page-workspace-contacts,#page-contacts,#page-workspace-inbox,#page-workspace-commercial,#page-document-center,#page-oferta,#page-invoices,#page-finance,#page-workspace-apps,#module-hub,#page-home).active) #pst-ws-sidebar .pst-ws-create-main{
  background:var(--pst-section-accent)!important;color:#fff!important;
}
body:has(:is(#page-workspace-home,#page-workspace-projects,#page-workspace-project,#page-kek-tenders,#page-workspace-contacts,#page-contacts,#page-workspace-inbox,#page-workspace-commercial,#page-document-center,#page-oferta,#page-invoices,#page-finance,#page-workspace-apps,#module-hub,#page-home).active) #pst-ws-canonical-nav .pst-ws-navbtn.active{
  background:var(--pst-section-soft)!important;color:var(--pst-section-deep)!important;
}
body:has(:is(#page-workspace-home,#page-workspace-projects,#page-workspace-project,#page-kek-tenders,#page-workspace-contacts,#page-contacts,#page-workspace-inbox,#page-workspace-commercial,#page-document-center,#page-oferta,#page-invoices,#page-finance,#page-workspace-apps,#module-hub,#page-home).active) #pst-ws-canonical-nav .pst-ws-navbtn.active .pst-ws-badge{
  color:var(--pst-section-deep)!important;
}

/* Normal controls stay light; the primary action uses the section accent.
   Danger/destructive controls and semantic status chips are deliberately excluded. */
:is(#page-workspace-home,#page-workspace-projects,#page-workspace-project,#page-kek-tenders,#page-workspace-contacts,#page-contacts,#page-workspace-inbox,#page-workspace-commercial,#page-document-center,#page-oferta,#page-invoices,#page-finance,#page-workspace-apps,#module-hub,#page-home).active button:not(.danger):not(.btn-danger):not([data-danger="1"]):not(#pst-loss-top):not(.pst-ws-action-dismiss):not(.pst-gli-dismiss){
  border-color:var(--pst-section-line)!important;
  color:var(--pst-section-deep)!important;
}
:is(#page-workspace-home,#page-workspace-projects,#page-workspace-project,#page-kek-tenders,#page-workspace-contacts,#page-contacts,#page-workspace-inbox,#page-workspace-commercial,#page-document-center,#page-oferta,#page-invoices,#page-finance,#page-workspace-apps,#module-hub,#page-home).active button:not(.danger):not(.btn-danger):not([data-danger="1"]):not(#pst-loss-top):not(.pst-ws-action-dismiss):not(.pst-gli-dismiss):hover{
  background:var(--pst-section-soft)!important;
  border-color:var(--pst-section-accent)!important;
  color:var(--pst-section-deep)!important;
}
:is(#page-workspace-home,#page-workspace-projects,#page-workspace-project,#page-kek-tenders,#page-workspace-contacts,#page-contacts,#page-workspace-inbox,#page-workspace-commercial,#page-document-center,#page-oferta,#page-invoices,#page-finance,#page-workspace-apps,#module-hub,#page-home).active :is(button.primary,.btn-primary,.pst-ws-btn.primary,.pst-pm-btn.primary,.pst-pm-open,.pst-dc-new,.pst-gli-intake):not(.danger):not(.btn-danger){
  background:var(--pst-section-accent)!important;
  border-color:var(--pst-section-accent)!important;
  color:#fff!important;
  box-shadow:0 6px 16px rgba(50,65,75,.10)!important;
}
:is(#page-workspace-home,#page-workspace-projects,#page-workspace-project,#page-kek-tenders,#page-workspace-contacts,#page-contacts,#page-workspace-inbox,#page-workspace-commercial,#page-document-center,#page-oferta,#page-invoices,#page-finance,#page-workspace-apps,#module-hub,#page-home).active :is(button.primary,.btn-primary,.pst-ws-btn.primary,.pst-pm-btn.primary,.pst-pm-open,.pst-dc-new,.pst-gli-intake):not(.danger):not(.btn-danger):hover{
  background:var(--pst-section-deep)!important;
  border-color:var(--pst-section-deep)!important;
  color:#fff!important;
}

/* Modern Projects */
#page-workspace-projects.active :is(.pst-pm-chip.on,.pst-pm-toggle button.on){background:var(--pst-section-soft)!important;color:var(--pst-section-deep)!important;border-color:var(--pst-section-line)!important}
#page-workspace-projects.active .pst-pm-more:hover{background:var(--pst-section-soft)!important;color:var(--pst-section-deep)!important}

/* Tenders */
#page-kek-tenders.active .pst-kek-btn.primary{background:var(--pst-section-accent)!important;border-color:var(--pst-section-accent)!important;color:#fff!important}
#page-kek-tenders.active .pst-kek-btn:not(.danger):hover{background:var(--pst-section-soft)!important;border-color:var(--pst-section-accent)!important;color:var(--pst-section-deep)!important}

/* Contact Master */
#page-workspace-contacts.active .pcm-head>div>span,
#page-workspace-contacts.active .pcm-eyebrow{color:var(--pst-section-deep)!important}
#page-workspace-contacts.active .pcm-head-actions button:hover{background:var(--pst-section-soft)!important;border-color:var(--pst-section-accent)!important}

/* Internal Gmail: intentional external Gmail buttons remain normal controls; intake is the primary action. */
#page-workspace-inbox.active .pst-gli-intake{background:var(--pst-section-accent)!important;border-color:var(--pst-section-accent)!important;color:#fff!important}
#page-workspace-inbox.active #pst-gli-query:focus{border-color:var(--pst-section-accent)!important;box-shadow:0 0 0 3px rgba(169,133,88,.12)!important}

/* Commercial / Document Center */
#page-document-center.active .pst-dc-type.active{background:var(--pst-section-soft)!important;border-color:var(--pst-section-line)!important;color:var(--pst-section-deep)!important}
#page-document-center.active .pst-dc-action:not(.credit):not(.debit){border-color:var(--pst-section-line)!important;color:var(--pst-section-deep)!important}

/* Finance top-level tiles use one family instead of eight competing colors. */
#page-finance.active #fin-hub-grid>div{border-color:var(--pst-section-accent)!important}
#page-finance.active #fin-hub-grid>div>div:first-child{background:var(--pst-section-accent)!important}
#page-finance.active #fin-hub-grid>a{border-color:var(--pst-section-accent)!important;background:var(--pst-section-soft)!important}
#page-finance.active #fin-hub-grid>a>div:nth-child(2){color:var(--pst-section-deep)!important}

/* Modules / integrations */
#page-workspace-apps.active .pst-ws-app-icon{background:var(--pst-section-soft)!important;color:var(--pst-section-deep)!important}
#page-workspace-apps.active .pst-ws-app:hover{border-color:var(--pst-section-accent)!important;background:var(--pst-section-wash)!important}

/* Inputs should echo the current section without becoming visually loud. */
:is(#page-workspace-home,#page-workspace-projects,#page-workspace-project,#page-kek-tenders,#page-workspace-contacts,#page-contacts,#page-workspace-inbox,#page-workspace-commercial,#page-document-center,#page-oferta,#page-invoices,#page-finance,#page-workspace-apps,#module-hub,#page-home).active :is(input,select,textarea):focus{
  border-color:var(--pst-section-accent)!important;
  box-shadow:0 0 0 3px color-mix(in srgb,var(--pst-section-accent) 14%,transparent)!important;
}
`;
  document.head.appendChild(s);
}

function routeSidebarGmail(event){
  var target=event&&event.target&&event.target.closest?event.target.closest('#pst-ws-sidebar .pst-ws-navbtn[data-key="inbox"]'):null;
  if(!target||typeof window.pstWorkspaceGo!=='function')return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.pstWorkspaceGo('inbox');
  setTimeout(function(){
    var G=window.PSTGmailLiveInboxV2;
    if(G&&typeof G.decorate==='function')G.decorate();
  },0);
}

function installRouting(){
  if(window.__pstSectionThemeRoutingV1)return;
  window.__pstSectionThemeRoutingV1=true;
  document.addEventListener('click',routeSidebarGmail,true);
}

css();
installRouting();
window.PSTSectionThemeV1={apply:css,routeSidebarGmail:routeSidebarGmail};
})();
