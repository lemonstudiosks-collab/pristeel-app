/* PRISTEEL Platform Readability v1
 * UI-only typography normalization for comfortable daily use.
 * Final cosmetic pass also owns visible Albanian UI normalization, calm palette,
 * button contrast and bounded shell artifact cleanup.
 * No polling, no MutationObserver, no business-data writes.
 * Generated document/PDF preview areas are explicitly excluded.
 */
(function(){
'use strict';
if(window.__pstPlatformReadabilityV1)return;
window.__pstPlatformReadabilityV1=true;

var SKIP='svg,canvas,pre,code,#of-pre,#inv-pre,#in-pre,#oc-pre,#rfq-pre,#doc-preview,.pst-doc-preview,.pst-document-preview,.document-preview,[data-document-preview],[data-pst-document-preview],[data-pst-font-lock]';
var CANDIDATES='button,a,label,small,p,td,th,input,select,textarea,b,strong,span,h5,h6,li,summary';
var UI_SCOPES='#pst-ws-sidebar,#page-workspace-home,#page-workspace-projects,#page-workspace-project,#page-kek-tenders,#page-finance,#page-workspace-finance,#page-workspace-contacts,#page-contacts,#page-workspace-apps,#page-document-center,#page-settings,#pst-system-operating-tools,#pst-ui-recovery-clean';
var ALBANIAN={
  'Home':'Kryefaqja','Opportunities':'Mundësitë','Projects':'Projektet','Partners':'Partnerët','Finance':'Financat','System':'Sistemi','Workspace':'Platforma',
  'Create':'Krijo','+ Create':'+ Krijo','Refresh':'Rifresko','Search':'Kërko','Close':'Mbyll','Cancel':'Anulo','Save':'Ruaj','Add':'Shto','Delete':'Fshi','Review':'Shqyrto','Done':'Kryer','Open':'Hap','Open project':'Hap projektin',
  'All projects':'Të gjitha projektet','New project':'Projekt i ri','Duplicates':'Dublikatat','Latest activity':'Aktiviteti i fundit','Deadline':'Afati','Client':'Klienti','Reference':'Referenca','Description':'Përshkrimi','List':'Listë','Stage':'Faza','Status':'Statusi','Activity':'Aktiviteti','Actions':'Veprime','All':'Të gjitha','Source':'Burimi','Contacts':'Kontaktet','Clients':'Klientët','Suppliers':'Furnitorët','Manufacturers':'Prodhuesit','Company':'Kompania','Country':'Vendi','Value':'Vlera','Updated':'Përditësuar','Summary':'Përmbledhja','Communication':'Komunikimi','Files':'Skedarët','Procurement':'Prokurimi','Commercial':'Komerciale','Execution':'Ekzekutimi','Tasks':'Detyrat','Next step':'Hapi i radhës','Documents':'Dokumentet',
  'Active':'Aktiv','In execution':'Në realizim','Waiting':'Në pritje','Waiting for client':'Në pritje të klientit','Waiting for supplier':'Në pritje të furnitorit','Waiting internally':'Në pritje të brendshme','Action required':'Kërkon veprim','Needs attention':'Kërkon vëmendje','No action':'Pa veprim','Confirmed':'Konfirmuar','Won':'Fituar','Lost':'Humbur','Postponed':'Shtyrë','Archived':'Arkivuar','Completed':'Realizuar','Closed':'Mbyllur','Overdue':'Vonuar','Technical review':'Shqyrtim teknik','Manufacturer':'Prodhuesi','Pricing':'Përcaktimi i çmimit','Offer':'Ofertë','Offers':'Oferta','Production':'Prodhim','Audit':'Auditim','Delivery':'Dorëzim','No deadline':'Pa afat','No activity':'Pa aktivitet','Today':'Sot','Yesterday':'Dje','Tomorrow':'Nesër',
  'Project emails':'Emailat e projektit','Project files':'Skedarët e projektit','Emails with attachments':'Emaila me bashkëngjitje','Check Gmail':'Kontrollo Gmail','Open Drive':'Hap Drive','Import from Gmail':'Importo nga Gmail','Fixed manufacturers':'Prodhuesit fiks','Suppliers by capability':'Furnitorë sipas aftësisë','No BOM':'Nuk ka BOM','BOM positions':'Pozicionet BOM','Preliminary routing':'Drejtim paraprak','Prepare / open RFQ':'Përgatit / hap kërkesën për ofertë','Supplier offers':'Ofertat e furnitorëve','Our offers':'Ofertat tona','New offer':'Ofertë e re','Create / edit offer':'Krijo / ndrysho ofertën','Outgoing invoices':'Faturat dalëse','Supplier invoices':'Faturat e furnitorëve','Bank guarantees':'Garancitë bankare','Credit / debit notes':'Notat kreditore/debitore','Create draft invoice':'Krijo faturë paraprake','Invoices':'Faturat','Invoice':'Faturë','Operating expenses':'Shpenzimet operative','Taxes (ATK)':'Tatimet (ATK)','Tax summary':'Përmbledhja tatimore','Payment deadlines':'Afatet e pagesave','Other costs':'Kosto të tjera','Outgoing':'Dalëse','Incoming':'Hyrëse','Paid':'E paguar','Unpaid':'E papaguar','Loading…':'Duke ngarkuar…','Syncing…':'Duke sinkronizuar…','No data.':'Nuk ka të dhëna.','No registered data.':'Nuk ka të dhëna të regjistruara.','No email.':'Nuk ka email.','No projects':'Asnjë projekt','Unnamed':'Pa emër','No category':'Pa kategori',
  'PPPP COMMAND CENTER':'QENDRA E DREJTIMIT PPPP','OPERATIONS OVERVIEW':'PASQYRA OPERATIVE','Operations overview':'Pasqyra operative','Projects, commercial activity, finance and automation in one operational view.':'Projektet, aktiviteti komercial, financat dhe automatizimi në një pamje operative.','Live platform data':'Të dhëna aktuale të platformës','ASK PPPP':'PYET PPPP','Ask PPPP':'Pyet PPPP','Ask the platform about any project':'Pyet platformën për çdo projekt','PPPP reads live platform data and answers from the current project state.':'PPPP lexon të dhënat aktuale të platformës dhe përgjigjet sipas gjendjes së tanishme të projektit.','Ask PPPP will appear here as soon as the project command service is ready.':'Pyet PPPP do të shfaqet sapo shërbimi i projektit të jetë gati.',
  'Active projects':'Projekte aktive','Open opportunities':'Mundësi të hapura','Priority actions':'Veprime prioritare','Overdue receivables':'Arkëtime të vonuara','Payables due':'Pagesa për furnitorë','Automation alerts':'Sinjalizime automatizimi','Confirmed work for you':'Punë e konfirmuar për ty','Nothing urgent':'Asgjë urgjente','Systems healthy':'Sistemet në rregull','Needs review':'Kërkon shqyrtim',
  'FOR YOU NOW':'PËR TY TANI','View all →':'Shiko të gjitha →','OUTLOOK':'NË VIJIM','Next 7 days':'7 ditët e ardhshme','Upcoming deadlines and financial commitments.':'Afatet dhe detyrimet financiare që po afrohen.','Tender deadlines':'Afatet e tenderëve','Open tenders due within seven days':'Tenderë të hapur me afat brenda shtatë ditësh','Commercial follow-ups':'Ndjekje komerciale','Scheduled follow-ups due within seven days':'Ndjekje të planifikuara brenda shtatë ditësh','Receivables due':'Arkëtime që afrohen','Customer invoices approaching due date':'Fatura të klientëve pranë afatit','Supplier payments due':'Pagesa furnitorësh që afrohen','Supplier invoices approaching due date':'Fatura furnitorësh pranë afatit','No confirmed actions need your attention right now.':'Nuk ka veprime të konfirmuara që kërkojnë vëmendjen tënde tani.',
  'ANALYSIS':'ANALIZË','Client concentration':'Përqendrimi sipas klientëve','Active project load by client.':'Ngarkesa e projekteve aktive sipas klientëve.','Recent project movement':'Lëvizjet e fundit të projekteve','Latest activity, excluding projects already represented as priority work.':'Aktiviteti i fundit, pa projektet që tashmë paraqiten te veprimet prioritare.','No active client concentration data.':'Nuk ka të dhëna për përqendrimin e klientëve aktivë.','No additional project movement outside priority work.':'Nuk ka lëvizje të tjera të projekteve jashtë veprimeve prioritare.','Status distribution':'Shpërndarja sipas gjendjes','Active portfolio by operational state.':'Portofoli aktiv sipas gjendjes operative.','Opportunity pipeline':'Ecuria e mundësive','TED and outreach movement toward projects.':'Ecuria e TED-it dhe kontakteve drejt projekteve.','Follow-up due':'Ndjekje për t’u bërë','Promoted':'Kaluar në projekt','Other active':'Të tjera aktive','active':'aktive',
  'FINANCE':'FINANCA','Financial attention':'Çështje financiare për vëmendje','Exceptions only, not a duplicate ledger.':'Vetëm çështjet që kërkojnë vëmendje, pa përsëritur regjistrin financiar.','AUTOMATION':'AUTOMATIZIMI','System health':'Gjendja e sistemit','Automation signals that may need review.':'Sinjalizime të automatizimit që mund të kërkojnë shqyrtim.','WORK BALANCE':'BALANCA E PUNËS','Portfolio pressure':'Ngarkesa e portofolit','Where current work is concentrated.':'Ku është përqendruar puna aktuale.','Receivable overdue':'Arkëtim i vonuar','Supplier invoice overdue':'Faturë furnitori e vonuar','PROJECTS':'PROJEKTET','COMMERCIAL':'KOMERCIALE',
  'SYSTEM':'SISTEMI','Automation Health':'Gjendja e automatizimit','Integrimet dhe automatizimet':'Integrimet dhe automatizimet','Mjete komerciale':'Mjete komerciale',
  'Project active':'Projekti aktiv','Compare offers':'Krahaso ofertat','Customer offer':'Oferta për klientin','Sent':'Dërguar','Recent activity':'Aktiviteti i fundit','Project communication':'Komunikimi i projektit','Project Summary':'Përmbledhja e projektit'
};

function css(){
  if(document.getElementById('pst-platform-readability-v1-css'))return;
  var s=document.createElement('style');
  s.id='pst-platform-readability-v1-css';
  s.textContent=`
/* Normal desktop reading floor. Existing larger typography stays untouched. */
.pst-rd-xxs{font-size:12.5px!important;line-height:1.4!important}
.pst-rd-xs{font-size:13px!important;line-height:1.42!important}
.pst-rd-sm{font-size:14px!important;line-height:1.48!important}
.pst-rd-control{font-size:14px!important;line-height:1.4!important}
.pst-rd-heading{font-size:15.5px!important;line-height:1.35!important}

/* Everyday controls. */
.btn,.btn-sm{font-size:14px!important;line-height:1.35!important}
.form-label,.lbl{font-size:13px!important;line-height:1.4!important}
.seg-btn{font-size:14px!important}
.rl-badge{font-size:12px!important}.rl-bar{font-size:13.5px!important}.rl-un{font-size:14px!important}.rl-ue{font-size:13px!important}.rl-sel{font-size:14px!important}.rl-note{font-size:13.5px!important}

/* Home / command center. */
.hub-eyebrow,.hub-stat-l,.hub-sec{font-size:12.5px!important;line-height:1.4!important}
.hub-sub{font-size:14px!important}.hub-load,.hub-none{font-size:13.5px!important}
.src-sub{font-size:13.5px!important}.ct-name{font-size:14.5px!important}.ct-co{font-size:13.5px!important}.ct-meta{font-size:13px!important}.ct-tag{font-size:12px!important}
.tk-t{font-size:14.5px!important}.tk-s,.tk-p,.tk-d,.tk-act,.tk-legend{font-size:13.5px!important}.tk-auto{font-size:12px!important}
.ov-empty{font-size:13.5px!important}

/* Project register. */
.pst-pm-eyebrow{font-size:12.5px!important}
.pst-pm-sub{font-size:14px!important}
.pst-pm-btn,.pst-pm-search,.pst-pm-select,.pst-pm-toggle button{font-size:14px!important}
.pst-pm-chip{font-size:13px!important}.pst-pm-chip i{font-size:12px!important}
.pst-pm-client{font-size:14px!important}.pst-pm-desc{font-size:13.5px!important}
.pst-pm-meta-label{font-size:12.5px!important}.pst-pm-meta-value{font-size:14px!important}
.pst-pm-badge{font-size:12px!important}.pst-pm-open{font-size:14px!important}.pst-pm-menu button{font-size:14px!important}
.pst-pm-phase-head b,.pst-pm-col-head b{font-size:13.5px!important}.pst-pm-phase-head span,.pst-pm-col-head i{font-size:12.5px!important}
.pst-pm-board-name{font-size:14.5px!important}.pst-pm-board-client{font-size:13.5px!important}.pst-pm-board-date,.pst-pm-col-empty{font-size:13px!important}

/* Individual project workspace. */
#page-workspace-project.pf2-on .pst-pi-tab{font-size:14px!important}
#page-workspace-project.pf2-on .pf2-card>header span{font-size:13px!important}
#page-workspace-project.pf2-on .pf2-note,#page-workspace-project.pf2-on .pf2-line span,#page-workspace-project.pf2-on .pf2-mail p,#page-workspace-project.pf2-on .pf2-gate p{font-size:14px!important;line-height:1.5!important}
#page-workspace-project.pf2-on .pf2-mail span,#page-workspace-project.pf2-on .pf2-flow span,#page-workspace-project.pf2-on .pf2-time small{font-size:13px!important;line-height:1.45!important}

/* Project email-offer intake. */
.pst-eoi-card>header{padding:14px 16px!important}
.pst-eoi-card>header b{font-size:15px!important;line-height:1.35!important}
.pst-eoi-card>header span{font-size:13px!important;line-height:1.45!important;margin-top:3px!important}
.pst-eoi-btn{height:38px!important;padding:0 13px!important;font-size:14px!important}
.pst-eoi-row{gap:14px!important;padding:12px 14px!important}
.pst-eoi-row b{font-size:14.5px!important;line-height:1.4!important}
.pst-eoi-row span{font-size:13px!important;line-height:1.45!important;margin-top:3px!important}
.pst-eoi-row p{font-size:14px!important;line-height:1.55!important;margin-top:6px!important}
.pst-eoi-empty{font-size:14px!important;line-height:1.5!important;padding:17px 14px!important}
.pst-eoi-field span{font-size:12.5px!important}.pst-eoi-field b{font-size:14px!important}
.pst-eoi-source{font-size:14px!important;line-height:1.55!important}
.pst-eoi-modal footer button{font-size:14px!important;min-height:38px!important}

/* Commercial margin + normalized supplier comparison.
   Dense data is allowed to wrap so typography can remain readable without
   pushing the entire commercial workspace off-screen. */
.pf2-decision>div:first-child b,.pf2-margin-title b{font-size:15px!important}
.pf2-decision>div:first-child span,.pf2-margin-title span{font-size:12.5px!important;line-height:1.4!important;padding:4px 8px!important}
.pf2-decision>p,.pf2-margin>p{font-size:13.5px!important;line-height:1.55!important}
.pf2-decision-grid b{font-size:14px!important}.pf2-decision-grid strong{font-size:17px!important}.pf2-decision-grid small{font-size:13px!important}
.pf2-margin-grid span,.pf2-margin-grid small{font-size:13px!important;line-height:1.45!important}.pf2-margin-grid b{font-size:18px!important;line-height:1.3!important}

.pf2-compare-wrap{width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important}
.pf2-compare{width:100%!important;min-width:1480px!important;table-layout:fixed!important;font-size:14px!important}
.pf2-compare th{font-size:13px!important;padding:12px 9px!important;line-height:1.4!important;white-space:normal!important;overflow-wrap:anywhere!important;vertical-align:bottom!important}
.pf2-compare td{font-size:14px!important;padding:13px 9px!important;line-height:1.48!important;white-space:normal!important;overflow-wrap:anywhere!important;vertical-align:middle!important}
.pf2-compare th:nth-child(1),.pf2-compare td:nth-child(1){width:12%!important}
.pf2-compare th:nth-child(2),.pf2-compare td:nth-child(2){width:9%!important}
.pf2-compare th:nth-child(3),.pf2-compare td:nth-child(3){width:7%!important}
.pf2-compare th:nth-child(4),.pf2-compare td:nth-child(4){width:8%!important}
.pf2-compare th:nth-child(5),.pf2-compare td:nth-child(5){width:8%!important}
.pf2-compare th:nth-child(6),.pf2-compare td:nth-child(6){width:7%!important}
.pf2-compare th:nth-child(7),.pf2-compare td:nth-child(7){width:12%!important}
.pf2-compare th:nth-child(8),.pf2-compare td:nth-child(8){width:7%!important}
.pf2-compare th:nth-child(9),.pf2-compare td:nth-child(9){width:8%!important}
.pf2-compare th:nth-child(10),.pf2-compare td:nth-child(10){width:6%!important}
.pf2-compare th:nth-child(11),.pf2-compare td:nth-child(11){width:6%!important}
.pf2-compare th:nth-child(12),.pf2-compare td:nth-child(12){width:7%!important}
.pf2-compare th:nth-child(13),.pf2-compare td:nth-child(13){width:7%!important}
.pf2-compare th:nth-child(14),.pf2-compare td:nth-child(14){width:6%!important}
.pf2-compare td span{font-size:12.5px!important;line-height:1.4!important;padding:4px 7px!important}
.pf2-compare td em{font-size:13px!important;line-height:1.45!important}
.pf2-detail-btn{font-size:13px!important;line-height:1.35!important;padding:6px 10px!important}

/* The source breakdown used a two-column layout that clipped the terms panel.
   Keep the financial breakdown full-width and place terms underneath it. */
.pf2-break{grid-template-columns:minmax(0,1fr)!important;gap:12px!important;padding:16px!important}
.pf2-break-list,.pf2-break-terms{min-width:0!important;width:100%!important;max-width:100%!important}
.pf2-break-row,.pf2-break-total{grid-template-columns:minmax(260px,1.55fr) minmax(230px,1fr) minmax(150px,.55fr)!important;padding:12px 13px!important}
.pf2-break-row span{font-size:13.5px!important;line-height:1.5!important}
.pf2-break-row b{font-size:13.5px!important;line-height:1.5!important}
.pf2-break-row strong,.pf2-break-total strong{font-size:14.5px!important}
.pf2-break-total span{font-size:13.5px!important}
.pf2-break-terms p{font-size:13.5px!important;line-height:1.65!important}
.pf2-empty{font-size:13.5px!important;line-height:1.5!important}

/* On wide desktop screens there is enough room for a small extra lift. */
@media(min-width:1600px){
  .pf2-compare{font-size:14.5px!important}
  .pf2-compare td{font-size:14.5px!important;padding-top:14px!important;padding-bottom:14px!important}
  .pf2-break-row span,.pf2-break-row b,.pf2-break-total span,.pf2-break-terms p{font-size:14px!important}
  .pf2-break-row strong,.pf2-break-total strong{font-size:15px!important}
}
@media(max-width:1200px){
  .pf2-compare{min-width:1380px!important}
  .pf2-break-row,.pf2-break-total{grid-template-columns:minmax(220px,1.4fr) minmax(200px,1fr) minmax(130px,.55fr)!important}
}
@media(max-width:760px){
  .pf2-break-row,.pf2-break-total{grid-template-columns:1fr!important;gap:4px!important}
  .pf2-break-row strong,.pf2-break-total strong{text-align:left!important}
}

/* Collapsed utility rail stays compact, but legible. */
.rail-lbl{font-size:11px!important;line-height:1.1!important}
`;
  document.head.appendChild(s);
}

function finalCss(){
  var s=document.getElementById('pst-final-cosmetics-v1-css');
  if(!s){
    s=document.createElement('style');
    s.id='pst-final-cosmetics-v1-css';
    s.textContent=`
html.pst-final-cosmetics-ready{--bronze:#4F97AF!important;--bronze-light:#64A8BD!important;--bronze-dark:#3F7F98!important;--bronze-bg:rgba(79,151,175,.09)!important;--bronze-text:#3F7F98!important;--copper:#4F97AF!important;--copper-bg:rgba(79,151,175,.09)!important;--pst-final-blue:#4F97AF;--pst-final-blue-deep:#3F7F98;--pst-final-blue-soft:#EDF5F7;--pst-final-bg:#F7F6F3;--pst-final-card:#FCFCFA;--pst-final-line:#E6E3DE;--pst-final-text:#2F3437;--pst-final-muted:#7C8488}
html.pst-final-cosmetics-ready,html.pst-final-cosmetics-ready body,html.pst-final-cosmetics-ready .content,html.pst-final-cosmetics-ready .page,html.pst-final-cosmetics-ready [id^="page-workspace-"],html.pst-final-cosmetics-ready #page-finance,html.pst-final-cosmetics-ready #fin-hub,html.pst-final-cosmetics-ready #page-kek-tenders{background:#F7F6F3!important;color:#2F3437!important}
html.pst-final-cosmetics-ready #pst-ws-sidebar,html.pst-final-cosmetics-ready .sidebar{background:#FBFAF7!important;border-right-color:#E6E3DE!important;box-shadow:none!important}
html.pst-final-cosmetics-ready .card,html.pst-final-cosmetics-ready .pst-card,html.pst-final-cosmetics-ready #pst-native-home-v3 .pn-kpi,html.pst-final-cosmetics-ready #pst-native-home-v3 .pn-card,html.pst-final-cosmetics-ready #page-workspace-project .pf2-card,html.pst-final-cosmetics-ready #page-workspace-project .pf2-current,html.pst-final-cosmetics-ready #page-workspace-project .pf2-next,html.pst-final-cosmetics-ready #page-workspace-project .pf2-summary-tile,html.pst-final-cosmetics-ready #page-workspace-project .pf2-attention,html.pst-final-cosmetics-ready #page-workspace-project .pf2-gate,html.pst-final-cosmetics-ready #page-workspace-project .pf2-shortcut{background:#FCFCFA!important;border-color:#E6E3DE!important;box-shadow:0 4px 16px rgba(48,58,62,.025)!important}
html.pst-final-cosmetics-ready #pst-ws-sidebar .pst-ws-create,html.pst-final-cosmetics-ready #pst-ws-sidebar .pst-ws-create-main,html.pst-final-cosmetics-ready .btn-primary,html.pst-final-cosmetics-ready .pst-pm-btn.primary,html.pst-final-cosmetics-ready .pst-pm-open,html.pst-final-cosmetics-ready #page-workspace-project .pf2-btn.p,html.pst-final-cosmetics-ready #pst-native-home-v3 #pn-ask .pst-live-command-shell button,html.pst-final-cosmetics-ready #page-workspace-home .pst-ws-action-open[data-pst-direct-action="1"]{background:#4F97AF!important;border-color:#4F97AF!important;color:#fff!important;box-shadow:none!important;text-shadow:none!important}
html.pst-final-cosmetics-ready #pst-ws-sidebar .pst-ws-create:hover,html.pst-final-cosmetics-ready #pst-ws-sidebar .pst-ws-create-main:hover,html.pst-final-cosmetics-ready .btn-primary:hover,html.pst-final-cosmetics-ready .pst-pm-btn.primary:hover,html.pst-final-cosmetics-ready .pst-pm-open:hover,html.pst-final-cosmetics-ready #page-workspace-project .pf2-btn.p:hover{background:#3F7F98!important;border-color:#3F7F98!important;color:#fff!important}
html.pst-final-cosmetics-ready [data-pst-dark-button="1"],html.pst-final-cosmetics-ready [data-pst-dark-button="1"] *{color:#fff!important;text-shadow:none!important}
html.pst-final-cosmetics-ready #pst-ws-canonical-nav .pst-ws-navbtn:hover{background:#F1F4F3!important;border-color:#E4E8E7!important;color:#374247!important}
html.pst-final-cosmetics-ready #pst-ws-canonical-nav .pst-ws-navbtn.active{background:#EDF5F7!important;border-color:#D8E8ED!important;color:#3F7F98!important;box-shadow:inset 3px 0 0 #4F97AF!important}
html.pst-final-cosmetics-ready #pst-ws-canonical-nav .pst-ws-navbtn.active:before{background:#4F97AF!important}
html.pst-final-cosmetics-ready #pst-native-home-v3 #pn-ask .pst-live-command-shell{background:#FCFCFA!important;border-color:#E6E3DE!important;border-left-color:#4F97AF!important;box-shadow:none!important}
html.pst-final-cosmetics-ready #pst-native-home-v3 #pn-ask .pst-live-command-shell form{background:#F2F3F1!important;border-color:#E4E5E1!important}
html.pst-final-cosmetics-ready #pst-native-home-v3 .pn-kpi:nth-child(-n+2):after,html.pst-final-cosmetics-ready #fin-hub-grid>div[onclick*="finSwitchTab"]>div:first-child{background:#4F97AF!important;opacity:.45!important}
html.pst-final-cosmetics-ready #pst-native-home-v3 .pn-row>i,html.pst-final-cosmetics-ready #pst-native-home-v3 .pn-funnel i{background:#7F9AA3!important}
html.pst-final-cosmetics-ready #pst-native-home-v3 .pn-row.warn>i{background:#AA987C!important}html.pst-final-cosmetics-ready #pst-native-home-v3 .pn-row.danger>i{background:#A98782!important}html.pst-final-cosmetics-ready #pst-native-home-v3 .pn-row.good>i{background:#829482!important}
html.pst-final-cosmetics-ready #page-workspace-project .pst-operating-phase-nav{background:rgba(252,252,250,.98)!important;border-color:#E3E5E2!important;box-shadow:0 4px 14px rgba(45,58,64,.035)!important}
html.pst-final-cosmetics-ready #page-workspace-project .pst-phase-btn{background:#FCFCFA!important;border-color:#E6E7E4!important;color:#667177!important;box-shadow:none!important}
html.pst-final-cosmetics-ready #page-workspace-project .pst-phase-btn.on{background:#EDF5F7!important;border-color:#D4E5EA!important;color:#3F7F98!important;box-shadow:inset 0 -3px 0 #4F97AF!important}
html.pst-final-cosmetics-ready #page-workspace-project .pst-phase-btn.on>span{background:#4F97AF!important;color:#fff!important}
html.pst-final-cosmetics-ready #page-workspace-project .pst-project-utilities button{background:#FAFAF8!important;border-color:#E6E7E4!important;color:#69747A!important}
html.pst-final-cosmetics-ready #page-workspace-project .pwf-next,html.pst-final-cosmetics-ready #page-workspace-project .pf2-next{background:#EEF6F8!important;border-color:#D4E6EB!important;border-left:4px solid #4F97AF!important;color:#334B54!important;box-shadow:none!important}
html.pst-final-cosmetics-ready #page-workspace-project .pwf-next>b,html.pst-final-cosmetics-ready #page-workspace-project .pf2-next b{color:#2F454E!important;font-size:17px!important;line-height:1.25!important}
html.pst-final-cosmetics-ready #page-workspace-project .pwf-procurement-head{border-top-color:#9AB7C0!important}
html.pst-final-cosmetics-ready #page-workspace-project .pwf-stage.pst-procurement-stage{box-shadow:inset 0 2px 0 #D8C9AE!important}html.pst-final-cosmetics-ready #page-workspace-project .pwf-stage.pst-commercial-stage{box-shadow:inset 0 2px 0 #D9D2E3!important}
html.pst-final-cosmetics-ready .main::before,html.pst-final-cosmetics-ready .main::after,html.pst-final-cosmetics-ready .content::before,html.pst-final-cosmetics-ready .content::after,html.pst-final-cosmetics-ready #app-shell-root::before,html.pst-final-cosmetics-ready #app-shell-root::after{content:none!important;display:none!important}
html.pst-final-cosmetics-ready .pn-card>header,html.pst-final-cosmetics-ready .pn-row,html.pst-final-cosmetics-ready #page-workspace-project .pf2-line,html.pst-final-cosmetics-ready #page-workspace-project .pf2-mail,html.pst-final-cosmetics-ready #page-workspace-project .pf2-time{border-color:#ECEAE5!important}
`;
  }
  if(s.parentNode)document.head.appendChild(s);else document.head.appendChild(s);
}

function skip(el){
  if(!el||!el.closest)return true;
  if(el.closest(SKIP))return true;
  if(el.getAttribute&&el.getAttribute('aria-hidden')==='true')return true;
  return false;
}

function hasReadableContent(el){
  var tag=(el.tagName||'').toLowerCase();
  if(tag==='input'||tag==='select'||tag==='textarea')return true;
  return !!String(el.textContent||'').trim();
}

function mark(el){
  if(skip(el)||!hasReadableContent(el))return;
  if(el.classList.contains('pst-rd-xxs')||el.classList.contains('pst-rd-xs')||el.classList.contains('pst-rd-sm')||el.classList.contains('pst-rd-control')||el.classList.contains('pst-rd-heading'))return;
  var px=parseFloat(window.getComputedStyle(el).fontSize)||0;
  if(!(px>0))return;
  var tag=(el.tagName||'').toLowerCase();
  if(tag==='button'||tag==='input'||tag==='select'||tag==='textarea'){
    if(px<14)el.classList.add('pst-rd-control');
    return;
  }
  if(tag==='h5'||tag==='h6'){
    if(px<15.5)el.classList.add('pst-rd-heading');
    return;
  }
  if(tag==='th'){
    if(px<13)el.classList.add('pst-rd-xs');
    return;
  }
  if(tag==='small'){
    if(px<13)el.classList.add('pst-rd-xs');
    return;
  }
  if(tag==='label'){
    if(px<13)el.classList.add('pst-rd-xs');
    return;
  }
  if(tag==='td'||tag==='p'||tag==='li'||tag==='summary'){
    if(px<14)el.classList.add('pst-rd-sm');
    return;
  }
  if(px<10)el.classList.add('pst-rd-xxs');
  else if(px<12)el.classList.add('pst-rd-xs');
  else if(px<14)el.classList.add('pst-rd-sm');
}

function translateValue(text){
  var t=String(text||'').trim();
  if(!t)return t;
  if(ALBANIAN[t])return ALBANIAN[t];
  var m=t.match(/^(\d+) need attention$/i);if(m)return m[1]+(m[1]==='1'?' kërkon vëmendje':' kërkojnë vëmendje');
  m=t.match(/^(\d+) follow-ups due$/i);if(m)return m[1]+' ndjekje për t’u bërë';
  m=t.match(/^(\d+) overdue invoices$/i);if(m)return m[1]+' fatura të vonuara';
  m=t.match(/^(\d+) overdue supplier invoices$/i);if(m)return m[1]+' fatura furnitorësh të vonuara';
  if(t==='PPPP do ta rikthejë projektin te radha jote kur të vijë përgjigjja ose kur follow-up-i të bëhet i nevojshëm.')return'PPPP do ta rikthejë projektin te radha jote kur të vijë përgjigjja ose kur ndjekja të bëhet e nevojshme.';
  if(t==='Hap fazën e ekzekutimit. PPPP mban dokumentet, readiness dhe blocker-at në prapaskenë.')return'Hap fazën e ekzekutimit. PPPP mban dokumentet, gatishmërinë dhe pengesat në prapaskenë.';
  if(t==='Kostoja dhe scope-i duhet të jenë të qarta; marzhi dhe çmimi final mbeten human-gated.')return'Kostoja dhe përfshirja duhet të jenë të qarta; marzhi dhe çmimi final kërkojnë miratimin tënd.';
  if(t==='Drafti ekziston. Çmimi final dhe dërgimi kërkojnë aprovimin tënd.')return'Versioni paraprak ekziston. Çmimi final dhe dërgimi kërkojnë miratimin tënd.';
  return t;
}

function translateScope(scope){
  if(!scope)return;
  try{
    var w=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT),n;
    while((n=w.nextNode())){
      var p=n.parentElement;if(!p||/^(SCRIPT|STYLE|TEXTAREA|PRE|CODE)$/i.test(p.tagName)||skip(p))continue;
      var raw=n.nodeValue,t=String(raw||'').trim(),next=translateValue(t);
      if(t&&next!==t)n.nodeValue=raw.replace(t,next);
    }
    Array.prototype.forEach.call(scope.querySelectorAll('option'),function(o){var t=String(o.textContent||'').trim(),next=translateValue(t);if(next!==t)o.textContent=next;});
    Array.prototype.forEach.call(scope.querySelectorAll('input,textarea'),function(el){
      var ph=String(el.getAttribute('placeholder')||'').trim();if(!ph)return;
      if(/What is happening with STACON/i.test(ph))el.setAttribute('placeholder','p.sh. Çfarë po ndodh me STACON?');
      else if(/^Search project, client, reference or description$/i.test(ph))el.setAttribute('placeholder','Kërko projekt, klient, referencë ose përshkrim');
      else if(/^Search\b/i.test(ph))el.setAttribute('placeholder',ph.replace(/^Search\b/i,'Kërko'));
    });
  }catch(e){}
}

function translateUi(){
  Array.prototype.forEach.call(document.querySelectorAll(UI_SCOPES),translateScope);
  var nav={home:'Kryefaqja',tenders:'Mundësitë',projects:'Projektet',contacts:'Partnerët',finance:'Financat',apps:'Sistemi'};
  Object.keys(nav).forEach(function(k){var b=document.querySelector('#pst-ws-canonical-nav .pst-ws-navbtn[data-key="'+k+'"]');if(!b)return;var l=b.querySelector('.pst-nav-label')||b.querySelector('span');if(l)l.textContent=nav[k];});
  var sub=document.querySelector('#pst-ws-sidebar .pst-ws-brand small');if(sub&&/^Workspace$/i.test(String(sub.textContent||'').trim()))sub.textContent='Platforma';
}

function rgb(value){var m=String(value||'').match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*([\d.]+))?/i);return m?{r:Number(m[1]),g:Number(m[2]),b:Number(m[3]),a:m[4]==null?1:Number(m[4])}:null;}
function ensureButtonContrast(root){
  var scope=root&&root.querySelectorAll?root:document;
  Array.prototype.forEach.call(scope.querySelectorAll('button,.btn,[role="button"]'),function(b){
    if(skip(b))return;
    var c;try{c=rgb(window.getComputedStyle(b).backgroundColor);}catch(e){c=null;}
    var dark=!!(c&&c.a>.6&&((.2126*c.r+.7152*c.g+.0722*c.b)/255)<.53);
    if(dark){b.setAttribute('data-pst-dark-button','1');b.style.setProperty('color','#fff','important');}
    else if(b.getAttribute('data-pst-dark-button')==='1'){b.removeAttribute('data-pst-dark-button');b.style.removeProperty('color');}
  });
}

function removeTopOval(){
  var nodes=document.querySelectorAll('#app-shell-root > *,.main > *,.content > *');
  Array.prototype.forEach.call(nodes,function(el){
    if(!el||el.id==='pst-startup-shell'||String(el.textContent||'').trim())return;
    var r;try{r=el.getBoundingClientRect();}catch(e){return;}
    if(!r||r.width<220||r.width>700||r.height<=0||r.height>34||r.top<-5||r.top>95)return;
    var cs;try{cs=window.getComputedStyle(el);}catch(e){return;}
    var rad=parseFloat(cs.borderTopLeftRadius)||0,c=rgb(cs.backgroundColor);
    if(rad<15||!c||c.a<.25)return;
    if(c.b>c.r+8||c.g>c.r+14){el.style.setProperty('display','none','important');el.setAttribute('data-pst-cosmetic-oval-hidden','1');}
  });
}

var cosmeticSignaled=false;
function signalCosmeticsReady(){
  if(cosmeticSignaled)return;cosmeticSignaled=true;
  document.documentElement.classList.add('pst-final-cosmetics-ready');
  finalCss();
  var fire=function(){try{document.dispatchEvent(new CustomEvent('pst:cosmetics-ready'));}catch(e){}};
  var raf=window.requestAnimationFrame||function(cb){return setTimeout(cb,16);};raf(function(){raf(fire);});
}

function finalApply(root){
  document.documentElement.classList.add('pst-final-cosmetics-ready');
  finalCss();translateUi();ensureButtonContrast(root||document);removeTopOval();
}

function apply(root){
  root=root&&root.querySelectorAll?root:document;
  Array.prototype.forEach.call(root.querySelectorAll(CANDIDATES),mark);
  finalApply(root);
  return true;
}

function schedule(){
  [0,150,500,1000,1700,2400,3200].forEach(function(ms){setTimeout(function(){apply(document);},ms);});
  setTimeout(signalCosmeticsReady,1850);
}

css();finalCss();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:project-opened',schedule);
window.addEventListener('pageshow',schedule,{once:true});
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],#pst-ws-home-refresh,.pst-pi-tab,[data-pf2-tab],.pec-tab,[data-pm-open],button[data-page],button,[role="button"]'):null;
  if(t)[0,160,520,1050,1700,2450].forEach(function(ms){setTimeout(function(){apply(document);},ms);});
},true);

window.PSTPlatformReadabilityV1={apply:apply,schedule:schedule,translateUi:translateUi,finalApply:finalApply,_test:{mark:mark,skip:skip,translateValue:translateValue,rgb:rgb}};
})();