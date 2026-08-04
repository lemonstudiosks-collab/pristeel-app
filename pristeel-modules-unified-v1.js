/* PRISTEEL unified module surface
 * Visual-only harmonisation for Commercial, Finance, Contacts, Inbox and Documents.
 * No handlers, routes, queries or form values are replaced.
 */
(function(){
'use strict';
if(window.__pstModulesUnifiedV1)return;
window.__pstModulesUnifiedV1=true;

var PAGE_IDS=[
  'page-workspace-commercial','page-finance','page-contacts','page-workspace-inbox',
  'page-workspace-files','page-library','page-qendra','page-outreach','page-invoices','page-oferta'
];
function css(){
  if(document.getElementById('pst-modules-unified-css'))return;
  var s=document.createElement('style');s.id='pst-modules-unified-css';s.textContent=`
:root{--pst-u-brand:#5B9BB3;--pst-u-brand-deep:#3F7F98;--pst-u-brand-pale:#EAF5F8;--pst-u-line:#DEE7EA;--pst-u-soft:#F6F8F9;--pst-u-text:#252B2F;--pst-u-muted:#7D898F}
.pst-unified-module{color:var(--pst-u-text)}
.pst-unified-module>.hub-top,.pst-unified-module>.page-head,.pst-unified-module>.fin-head,.pst-unified-module>.contacts-head{border-bottom-color:var(--pst-u-line)!important}
.pst-unified-module h1,.pst-unified-module h2,.pst-unified-module h3{letter-spacing:-.25px;color:var(--pst-u-text)}
.pst-unified-module .hub-headline,.pst-unified-module .page-title,.pst-unified-module .fin-title{font-weight:760!important}
.pst-unified-module .hub-sub,.pst-unified-module .page-sub,.pst-unified-module .fin-sub{color:var(--pst-u-muted)!important}

.pst-unified-module .card,.pst-unified-module .panel,.pst-unified-module .fin-card,.pst-unified-module .fin-panel,
.pst-unified-module .hub-card,.pst-unified-module .pst-panel,.pst-unified-module .pst-kpi,
.pst-unified-module .pst-dc-shell,.pst-unified-module .pst-dc-card,.pst-unified-module .pst-dc-register,
.pst-unified-module .oa-card,.pst-unified-module .inv-card{
  background:#fff!important;border:1px solid var(--pst-u-line)!important;border-radius:13px!important;
  box-shadow:0 1px 2px rgba(28,44,52,.028)!important
}
.pst-unified-module .card:hover,.pst-unified-module .panel:hover,.pst-unified-module .fin-card:hover,
.pst-unified-module .pst-panel:hover,.pst-unified-module .pst-kpi:hover{
  border-color:#C9DCE4!important;box-shadow:0 7px 22px rgba(40,75,90,.06)!important
}

.pst-unified-module .btn,.pst-unified-module button:not(.pst-ws-navbtn):not(.pst-ws-create-main):not(.pst-pm-open):not(.pst-pm-more){
  border-radius:9px
}
.pst-unified-module .btn-primary,.pst-unified-module button.primary,.pst-unified-module .pst-dc-new{
  background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;border-color:transparent!important;color:#fff!important;
  box-shadow:0 7px 18px rgba(63,127,152,.14)!important
}
.pst-unified-module .btn-primary:hover,.pst-unified-module button.primary:hover,.pst-unified-module .pst-dc-new:hover{
  background:linear-gradient(135deg,#5F9FB7,#36758E)!important
}
.pst-unified-module input,.pst-unified-module select,.pst-unified-module textarea{
  border-color:#DDE7EB!important;border-radius:9px!important;background:#fff!important
}
.pst-unified-module input:focus,.pst-unified-module select:focus,.pst-unified-module textarea:focus{
  border-color:var(--pst-u-brand)!important;box-shadow:0 0 0 3px rgba(91,155,179,.13)!important
}

.pst-unified-module table{border-collapse:separate!important;border-spacing:0!important;width:100%}
.pst-unified-module table thead th{
  background:#F8FAFB!important;color:#8B969C!important;font-size:8px!important;font-weight:760!important;
  letter-spacing:.55px!important;text-transform:uppercase!important;border-top:1px solid var(--pst-u-line)!important;
  border-bottom:1px solid var(--pst-u-line)!important;padding:9px 10px!important
}
.pst-unified-module table thead th:first-child{border-left:1px solid var(--pst-u-line)!important;border-radius:10px 0 0 10px}
.pst-unified-module table thead th:last-child{border-right:1px solid var(--pst-u-line)!important;border-radius:0 10px 10px 0}
.pst-unified-module table tbody td{border-bottom:1px solid #EDF1F3!important;padding:10px!important;color:#536067!important}
.pst-unified-module table tbody tr:hover td{background:#F9FBFC!important}

.pst-unified-module .tabs,.pst-unified-module .fin-tabs,.pst-unified-module .seg,.pst-unified-module .pst-dc-types{
  background:#F4F7F8!important;border-color:var(--pst-u-line)!important;border-radius:10px!important;padding:3px!important
}
.pst-unified-module .tab.active,.pst-unified-module .fin-tab.active,.pst-unified-module .seg-btn.active,
.pst-unified-module .pst-dc-type.active{
  background:#fff!important;color:var(--pst-u-brand-deep)!important;border-color:#C5DDE6!important;
  box-shadow:0 1px 4px rgba(35,60,72,.07)!important
}

#page-contacts.pst-unified-module .ct{border-color:var(--pst-u-line)!important;border-radius:12px!important;padding:12px 13px!important;box-shadow:0 1px 2px rgba(28,44,52,.025)!important}
#page-contacts.pst-unified-module .ct:hover{border-color:#C7DCE4!important;box-shadow:0 7px 20px rgba(40,75,90,.06)!important}
#page-contacts.pst-unified-module .ct-avatar{background:var(--pst-u-brand-pale)!important;color:var(--pst-u-brand-deep)!important;border-radius:10px!important}
#page-contacts.pst-unified-module .ct-tag.client{background:var(--pst-u-brand-pale)!important;color:var(--pst-u-brand-deep)!important}
#page-contacts.pst-unified-module .ct-ic:hover{background:var(--pst-u-brand-pale)!important;border-color:#BFDDE8!important;color:var(--pst-u-brand-deep)!important}

#page-finance.pst-unified-module .fin-kpi,#page-finance.pst-unified-module .kpi{
  border:1px solid var(--pst-u-line)!important;border-radius:12px!important;background:#fff!important;
  box-shadow:0 1px 2px rgba(28,44,52,.025)!important
}
#page-finance.pst-unified-module .fin-kpi-value,#page-finance.pst-unified-module .kpi-value{color:var(--pst-u-text)!important;font-weight:760!important}

#page-workspace-inbox.pst-unified-module .pst-ws-action,#page-qendra.pst-unified-module .tk{
  border-radius:10px!important;transition:background .14s ease,box-shadow .14s ease,border-color .14s ease
}
#page-workspace-inbox.pst-unified-module .pst-ws-action:hover,#page-qendra.pst-unified-module .tk:hover{
  background:#FAFCFD!important;box-shadow:0 4px 14px rgba(40,75,90,.05)!important
}

#page-workspace-commercial.pst-unified-module .pst-ws-table,#page-workspace-inbox.pst-unified-module .pst-ws-table{
  background:#fff;border-radius:13px;overflow:hidden
}
#page-workspace-files.pst-unified-module .pst-ws-card,#page-library.pst-unified-module .card{
  border-color:var(--pst-u-line)!important
}
#page-workspace-files.pst-unified-module .src-box,#page-library.pst-unified-module .src-box{
  border-color:#D7E3E7!important;background:#FAFCFD!important;border-radius:12px!important
}
#page-workspace-files.pst-unified-module .src-box:hover,#page-library.pst-unified-module .src-box:hover{
  border-color:var(--pst-u-brand)!important;background:var(--pst-u-brand-pale)!important
}

#page-outreach.pst-unified-module .oa-row,#page-outreach.pst-unified-module .outreach-row,
#page-invoices.pst-unified-module .inv-row,#page-oferta.pst-unified-module .oa-row{
  border-color:var(--pst-u-line)!important;border-radius:11px!important;background:#fff!important
}

@media(max-width:760px){
  .pst-unified-module table{display:block;overflow-x:auto}.pst-unified-module table thead th{white-space:nowrap}
}
`;
  document.head.appendChild(s);
}
function apply(root){
  var scope=root&&root.querySelectorAll?root:document;
  PAGE_IDS.forEach(function(id){var p=(scope.id===id?scope:null)||scope.querySelector&&scope.querySelector('#'+id)||document.getElementById(id);if(p)p.classList.add('pst-unified-module');});
}
css();apply(document);
var observer=new MutationObserver(function(records){records.forEach(function(r){r.addedNodes.forEach(function(n){if(n.nodeType===1)apply(n);});});});
function start(){if(document.body)observer.observe(document.body,{childList:true,subtree:true});apply(document);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
