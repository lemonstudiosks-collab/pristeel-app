/* PRISTEEL Creative UI v1 — final presentation layer.
 * Presentation-only: no business-data reads or writes, polling, or DOM observers.
 */
(function(){
'use strict';
if(window.__pstCreativeUiV1)return;
window.__pstCreativeUiV1=true;

var ICONS=[
 '<svg viewBox="0 0 24 24"><path d="M7 3.5h10v17l-2.5-1.6L12 20.5l-2.5-1.6L7 20.5z"/><path d="M9.5 8h5M9.5 11.5h5M9.5 15h3"/></svg>',
 '<svg viewBox="0 0 24 24"><path d="M4 5.5h16v13H4z"/><path d="m4 13 4-4h8l4 4M8 13v2h8v-2"/></svg>',
 '<svg viewBox="0 0 24 24"><path d="M5 19V9M12 19V5M19 19v-7M3.5 19.5h17"/></svg>',
 '<svg viewBox="0 0 24 24"><path d="m3.5 9 8.5-5 8.5 5M5 9.5h14M6.5 10v7.5M10 10v7.5M14 10v7.5M17.5 10v7.5M4 19.5h16"/></svg>',
 '<svg viewBox="0 0 24 24"><path d="M4 18 10 12l4 3 6-8M15 7h5v5"/></svg>',
 '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/></svg>',
 '<svg viewBox="0 0 24 24"><path d="M12 3.5 19 6v5.5c0 4.2-2.7 7.3-7 9-4.3-1.7-7-4.8-7-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
 '<svg viewBox="0 0 24 24"><rect x="3.5" y="7" width="17" height="12" rx="2"/><path d="M8.5 7V4.5h7V7M3.5 12h17M10 12v2h4v-2"/></svg>',
 '<svg viewBox="0 0 24 24"><path d="m9.5 14.5 5-5M7.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0M16.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0"/></svg>'
];
var STATUS={wait_for_client:'Në pritje të klientit',technical_review:'Shqyrtim teknik',execution:'Në realizim',supplier_selection:'Zgjedhje furnitori',pricing:'Përgatitje çmimi',client_offer:'Oferta për klientin',commercial:'Përpunim komercial',production_control:'Kontroll prodhimi',transport:'Transport',rfq_in:'Kërkesë e pranuar',active:'Aktiv',pending:'Në pritje'};

var CSS=`
:root{--pst-ink:#21333B;--pst-muted:#6F7E83;--pst-line:#DEE5E3;--pst-canvas:#F5F4F0;--pst-paper:#FFF;--pst-teal:#327F91;--pst-teal-deep:#25697A;--pst-teal-soft:#E8F3F4;--pst-coral:#EE7569;--pst-coral-soft:#FCEDEA;--pst-mint:#DFF1E9;--pst-lilac:#EEEAF8;--pst-sun:#F5C96F;--pst-shadow:0 12px 34px rgba(39,55,61,.07)}
html.pst-native-ui-v4-ready,html.pst-native-ui-v4-ready body,#app-shell-root,.content,.content>.page.active,.content>#module-hub.active{background:var(--pst-canvas)!important;color:var(--pst-ink)!important}
body{letter-spacing:-.005em}
#pst-ws-sidebar{width:246px!important;background:rgba(255,255,255,.9)!important;border-right:1px solid var(--pst-line)!important;box-shadow:none!important;backdrop-filter:blur(18px)}
#pst-ws-sidebar .pst-ws-brand{padding:21px 17px 12px!important}
#pst-ws-sidebar .pst-ws-logo{border-radius:15px!important;background:linear-gradient(145deg,#59A2B4,#327F91)!important;box-shadow:0 9px 24px rgba(50,127,145,.21)!important}
#pst-ws-sidebar .pst-ws-brand-name{color:var(--pst-ink)!important;letter-spacing:.01em!important}
#pst-ws-create{margin:4px 13px 19px!important;border:0!important;border-radius:13px!important;background:linear-gradient(135deg,var(--pst-coral),#E5645B)!important;color:#fff!important;box-shadow:0 9px 22px rgba(238,117,105,.22)!important;font-weight:800!important}
#pst-ws-create:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(238,117,105,.28)!important}
#pst-ws-canonical-nav>.pst-ws-navtitle:first-child{padding:0 17px!important;color:#99A3A3!important;font-size:9px!important;letter-spacing:.16em!important}
#pst-ws-canonical-nav .pst-canon-work{gap:5px!important;padding:7px 10px!important}
#pst-ws-canonical-nav .pst-ws-navbtn{min-height:46px!important;border:0!important;border-radius:13px!important;color:#526269!important;background:transparent!important;padding:0 12px!important;font-size:13px!important;font-weight:720!important;transition:.18s ease!important}
#pst-ws-canonical-nav .pst-ws-navbtn:hover{background:#F1F5F4!important;color:var(--pst-ink)!important;transform:translateX(2px)}
#pst-ws-canonical-nav .pst-ws-navbtn.active{background:var(--pst-teal-soft)!important;color:var(--pst-teal-deep)!important;box-shadow:none!important}
#pst-ws-canonical-nav .pst-ws-navbtn.active:after{content:"";width:7px;height:7px;border-radius:50%;margin-left:auto;background:var(--pst-coral);box-shadow:0 0 0 4px var(--pst-coral-soft)}
#pst-ws-canonical-nav .pst-ws-navbtn svg{width:19px!important;height:19px!important;stroke-width:1.7!important}
#pst-ws-canonical-nav .pst-ws-badge{background:#F0F3F2!important;color:#718085!important;border:0!important}
#pst-ws-canonical-nav .pst-ws-navbtn.active .pst-ws-badge{background:#fff!important;color:var(--pst-teal-deep)!important}
#pst-ws-sidebar .pst-search-compact,.pst-ws-search-compact{border-color:#D8E3E4!important;border-radius:14px!important;background:#F7FAF9!important;box-shadow:none!important}

/* Compact asymmetric cockpit: the waiting lane spans the width, removing the empty canyon. */
#pst-native-home-v4{max-width:1460px!important;padding:24px 28px 42px!important}
#pst-native-home-v4 .pn-head{position:relative;overflow:hidden;align-items:center!important;margin:0 0 16px!important;padding:24px 26px!important;border:1px solid #DCE6E5;border-radius:22px;background:linear-gradient(120deg,#FFF 0%,#F4F8F6 62%,#EAF4F5 100%);box-shadow:var(--pst-shadow)}
#pst-native-home-v4 .pn-head:before{content:"";position:absolute;width:170px;height:170px;right:110px;top:-116px;border-radius:50%;border:28px solid rgba(238,117,105,.12)}
#pst-native-home-v4 .pn-head:after{content:"✦";position:absolute;right:26px;bottom:14px;color:var(--pst-coral);font-size:19px;transform:rotate(12deg)}
#pst-native-home-v4 .pn-head>div{position:relative;z-index:1}
#pst-native-home-v4 .pn-kicker{color:var(--pst-teal-deep)!important;font-size:10px!important;letter-spacing:.16em!important}
#pst-native-home-v4 .pn-head h1{margin:5px 0 0!important;color:var(--pst-ink)!important;font-size:31px!important;letter-spacing:-1px!important}
#pst-native-home-v4 .pn-head p{color:var(--pst-muted)!important;font-size:13px!important}
#pst-native-home-v4 .pn-live{position:relative;z-index:1;border:1px solid #D7E5E3!important;background:rgba(255,255,255,.76)!important;color:#60777A!important;box-shadow:0 5px 16px rgba(45,72,77,.05)}
#pst-native-home-v4 .pn-live:before{background:#53A47B!important;box-shadow:0 0 0 4px rgba(83,164,123,.13)!important}
#pst-native-home-v4 .pn-cockpit{grid-template-columns:minmax(0,1fr) 348px!important;gap:15px!important}
#pst-native-home-v4 .pn-flow,#pst-native-home-v4 .pn-side-card,#pst-native-home-v4 .pn-bottom-grid>.pn-panel{border:1px solid var(--pst-line)!important;border-radius:19px!important;background:rgba(255,255,255,.92)!important;box-shadow:var(--pst-shadow)!important}
#pst-native-home-v4 .pn-panel>header,#pst-native-home-v4 .pn-side-card>header{padding:16px 18px!important;border-bottom:1px solid #E9EEEC!important;background:transparent!important}
#pst-native-home-v4 :is(.pn-panel,.pn-side-card)>header>div>span{color:#8D8171!important;font-size:9px!important;letter-spacing:.15em!important}
#pst-native-home-v4 :is(.pn-panel,.pn-side-card)>header h2{font-size:16px!important;color:var(--pst-ink)!important}
#pst-native-home-v4 :is(.pn-panel,.pn-side-card)>header p{font-size:10.5px!important;color:#829095!important}
#pst-native-home-v4 .pn-panel>header button{padding:7px 10px!important;border-radius:9px!important;background:var(--pst-teal-soft)!important;color:var(--pst-teal-deep)!important}
#pst-native-home-v4 .pn-flow>.pn-work-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:0!important;background:#FBFCFA}
#pst-native-home-v4 .pn-lane{padding:13px!important;border:0!important;border-right:1px solid #E8EDEB!important;background:transparent!important}
#pst-native-home-v4 .pn-lane-later{border-right:0!important}
#pst-native-home-v4 .pn-lane-wait{grid-column:1/-1;border-top:1px solid #E8EDEB!important;border-right:0!important;background:linear-gradient(180deg,#F8FBF9,#FBFCFA)!important}
#pst-native-home-v4 .pn-lane-head{padding:0 2px 10px!important}
#pst-native-home-v4 .pn-lane-head b{font-size:10px!important;letter-spacing:.13em!important;color:#607076!important}
#pst-native-home-v4 .pn-lane-head i{min-width:23px!important;height:23px!important;border-radius:8px!important}
#pst-native-home-v4 .pn-lane-now .pn-lane-head i{background:var(--pst-coral-soft)!important;color:#B85149!important}
#pst-native-home-v4 .pn-lane-wait .pn-lane-head i{background:var(--pst-mint)!important;color:#477C68!important}
#pst-native-home-v4 .pn-lane .pn-work-list{display:grid!important;gap:8px!important}
#pst-native-home-v4 .pn-lane-wait .pn-work-list{grid-template-columns:repeat(2,minmax(0,1fr))!important}
#pst-native-home-v4 .pn-lane .pn-work-row{min-height:75px!important;border:1px solid #E2E9E7!important;border-radius:14px!important;background:#fff!important;padding:10px 11px!important;box-shadow:0 3px 12px rgba(38,56,63,.035)!important}
#pst-native-home-v4 .pn-lane .pn-work-row:hover{transform:translateY(-2px)!important;border-color:#BFD7D9!important;box-shadow:0 10px 24px rgba(45,77,84,.09)!important}
#pst-native-home-v4 .pn-lane .pn-row-icon{border-radius:10px!important;background:var(--pst-teal-soft)!important;color:var(--pst-teal-deep)!important}
#pst-native-home-v4 .pn-lane-now .pn-row-icon{background:var(--pst-coral-soft)!important;color:#B85149!important}
#pst-native-home-v4 .pn-lane-wait .pn-row-icon{background:var(--pst-mint)!important;color:#477C68!important}
#pst-native-home-v4 .pn-row-title{color:var(--pst-ink)!important;font-size:11px!important}
#pst-native-home-v4 .pn-row-project{font-size:9.5px!important}
#pst-native-home-v4 .pn-row-reason{font-size:9.5px!important;-webkit-line-clamp:1!important}
#pst-native-home-v4 .pn-due{border-radius:8px!important;background:#F2F4F2!important;font-size:9px!important}
#pst-native-home-v4 .pn-side{gap:15px!important;top:10px!important}
#pst-native-home-v4 .pn-side .pn-pulse{gap:7px!important;padding:9px!important}
#pst-native-home-v4 .pn-side .pn-pulse-item{min-height:72px!important;border-radius:13px!important;background:#F7F9F7!important;padding:10px!important}
#pst-native-home-v4 .pn-side .pn-pulse-item:nth-child(2){background:#FBF4EC!important}
#pst-native-home-v4 .pn-side .pn-pulse-item:nth-child(3){background:var(--pst-lilac)!important}
#pst-native-home-v4 .pn-side .pn-pulse-item:nth-child(4){background:var(--pst-mint)!important}
#pst-native-home-v4 .pn-side .pn-pulse-item:hover{transform:translateY(-1px);filter:saturate(1.08)}
#pst-native-home-v4 .pn-side .pn-ask-slot{padding:10px!important}
#pst-native-home-v4 .pn-side .pst-live-command-shell{border:1px solid #DDE7E5!important;background:#F7F9F7!important}
#pst-native-home-v4 .pst-live-command-shell button{background:var(--pst-coral)!important;border-color:var(--pst-coral)!important;border-radius:11px!important}
#pst-native-home-v4 .pn-bottom-grid{gap:15px!important;margin-top:15px!important}
#pst-native-home-v4 .pn-timeline-item,#pst-native-home-v4 .pn-project-row{border-radius:10px!important;padding:10px 8px!important}
#pst-native-home-v4 .pn-timeline-item:hover,#pst-native-home-v4 .pn-project-row:hover{background:#F4F8F6!important}
#pst-native-home-v4 .pn-timeline-dot{background:var(--pst-coral)!important;box-shadow:0 0 0 4px var(--pst-coral-soft)!important}
#pst-native-home-v4 .pn-project-status{background:var(--pst-teal-soft)!important;color:var(--pst-teal-deep)!important}
#pst-native-home-v4 .pn-project-open{color:var(--pst-teal-deep)!important}
#pst-native-home-v4 .pn-exceptions{margin-top:14px!important;padding:11px 13px!important;border:1px dashed #E2D3C8!important;border-radius:14px!important;background:#FAF7F2!important}
#pst-native-home-v4 .pn-ex-item{border:0!important;border-radius:10px!important;background:#fff!important}

/* One visual language for Opportunities, Projects, Partners, Finance and Project detail. */
#page-kek-tenders,#page-workspace-projects,#page-workspace-contacts,#page-finance,#page-workspace-apps,#page-workspace-project{background:var(--pst-canvas)!important}
#page-kek-tenders .pst-kek-layout,#page-workspace-projects .pst-pm-page,#page-workspace-contacts .pcm-page,#page-finance .pst-finance-shell,#page-workspace-apps .pst-ws-apps,#page-workspace-project .pst-project-first{max-width:1460px!important;padding:24px 28px 44px!important;margin:auto!important}
#page-kek-tenders .pst-kek-head,#page-workspace-projects .pst-pm-head,#page-workspace-contacts .pcm-head{padding:21px 23px!important;border:1px solid var(--pst-line)!important;border-radius:19px!important;background:linear-gradient(125deg,#FFF 0%,#F3F8F6 100%)!important;box-shadow:var(--pst-shadow)!important;margin-bottom:13px!important}
#page-kek-tenders :is(.pst-kek-title,.pst-opp-main h3),#page-workspace-projects :is(.pst-pm-title,.pst-pm-name),#page-workspace-contacts :is(.pcm-head h1,.pcm-table td b),#page-finance :is(h1,h2,h3){color:var(--pst-ink)!important}
#page-kek-tenders :is(.pst-kek-btn,.pst-kek-filter input,.pst-kek-filter select),#page-workspace-projects :is(.pst-pm-btn,.pst-pm-search,.pst-pm-select,.pst-pm-chip),#page-workspace-contacts :is(.pcm-head-actions button,.pcm-toolbar label,.pcm-business-card),#page-finance :is(button,input,select){border-radius:11px!important}
#page-kek-tenders .pst-kek-btn.primary,#page-workspace-projects .pst-pm-btn.primary,#page-workspace-contacts .pcm-business-card.active,#page-finance .btn-primary{background:var(--pst-teal)!important;border-color:var(--pst-teal)!important;color:#fff!important;box-shadow:0 7px 18px rgba(50,127,145,.16)!important}
#page-workspace-projects .pst-pm-controls,#page-workspace-contacts .pcm-toolbar{padding:10px!important;border:1px solid var(--pst-line)!important;border-radius:15px!important;background:rgba(255,255,255,.84)!important}
#page-workspace-projects .pst-pm-row{border-color:var(--pst-line)!important;border-radius:15px!important;box-shadow:0 3px 12px rgba(38,56,63,.035)!important}
#page-workspace-projects .pst-pm-row:hover{border-color:#BAD4D7!important;box-shadow:0 11px 28px rgba(45,77,84,.08)!important}
#page-workspace-projects .pst-pm-open{background:var(--pst-teal-soft)!important;color:var(--pst-teal-deep)!important;border:0!important;box-shadow:none!important}
#page-workspace-projects .pst-pm-more{border-radius:50%!important}
#page-workspace-contacts .pcm-page{border-top:0!important}
#page-workspace-contacts .pcm-business-card{box-shadow:none!important;background:#FFF!important;border-color:var(--pst-line)!important}
#page-workspace-contacts .pcm-card{border-radius:18px!important;border-color:var(--pst-line)!important;box-shadow:var(--pst-shadow)!important}
#page-workspace-contacts .pcm-table th{background:#F4F7F5!important;color:#71817F!important}
#page-workspace-contacts .pcm-table tbody tr:hover{background:#F3F8F6!important}
#page-workspace-contacts .pcm-source{border-radius:8px!important}
#page-kek-tenders #pst-opportunities-focus{border:1px solid var(--pst-line)!important;border-top:0!important;border-radius:18px!important;background:#FFF!important;box-shadow:var(--pst-shadow)!important}
#page-kek-tenders .pst-opp-decision{border:1px solid var(--pst-line)!important;border-radius:16px!important;background:#FFF!important;box-shadow:0 4px 16px rgba(39,55,61,.045)!important}
#page-kek-tenders .pst-opp-decision.strong{border-left:5px solid #65A783!important}
#page-kek-tenders .pst-opp-decision.possible{border-left:5px solid var(--pst-sun)!important}
#page-kek-tenders .pst-opp-open{border-radius:11px!important;background:var(--pst-teal-soft)!important;color:var(--pst-teal-deep)!important}
#page-finance #fin-hub{border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important}
#page-finance #fin-hub-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important}
#page-finance #fin-hub-grid>.pst-creative-fin-tile{min-height:154px!important;border:1px solid var(--pst-line)!important;border-radius:18px!important;background:#FFF!important;padding:18px!important;box-shadow:0 6px 20px rgba(39,55,61,.05)!important;transition:.18s ease!important}
#page-finance #fin-hub-grid>.pst-creative-fin-tile:hover{transform:translateY(-3px)!important;border-color:#B9D2D4!important;box-shadow:0 14px 30px rgba(39,74,81,.1)!important}
#page-finance #fin-hub-grid>.pst-creative-fin-tile>[style*="position:absolute"]{display:none!important}
#page-finance .pst-creative-fin-icon{display:grid!important;place-items:center!important;width:39px!important;height:39px!important;margin:0 0 15px!important;border-radius:12px!important;background:var(--tile-soft,var(--pst-teal-soft))!important;color:var(--tile-accent,var(--pst-teal-deep))!important;font-size:0!important}
#page-finance .pst-creative-fin-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
#page-finance #fin-hub-grid>.pst-creative-fin-tile:nth-child(2n){--tile-soft:#FBF0EA;--tile-accent:#A66D4C}
#page-finance #fin-hub-grid>.pst-creative-fin-tile:nth-child(3n){--tile-soft:var(--pst-lilac);--tile-accent:#746597}
#page-finance #fin-hub-grid>.pst-creative-fin-tile:nth-child(4n){--tile-soft:var(--pst-mint);--tile-accent:#477C68}
#page-finance #pst-finance-tools{border-radius:17px!important;background:#FFF!important}
#page-finance #pst-finance-focus{border-top:0!important;border-radius:18px!important;box-shadow:var(--pst-shadow)!important}
#page-workspace-project .pst-operating-phase-nav{border-radius:16px!important;border-color:var(--pst-line)!important;box-shadow:0 8px 24px rgba(39,55,61,.07)!important}
#page-workspace-project .pst-phase-btn{border-radius:11px!important;border-color:var(--pst-line)!important}
#page-workspace-project .pst-phase-btn.on{background:var(--pst-teal-soft)!important;color:var(--pst-teal-deep)!important;border-color:#BCD7DA!important}
#page-workspace-project .pst-phase-btn.on>span{background:var(--pst-coral)!important}
@media(max-width:1180px){#pst-native-home-v4 .pn-cockpit{grid-template-columns:1fr!important}#pst-native-home-v4 .pn-side{position:static!important;grid-template-columns:1fr 1fr!important}#page-finance #fin-hub-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:820px){#pst-ws-sidebar{width:100%!important}#pst-native-home-v4{padding:15px!important}#pst-native-home-v4 .pn-head{padding:19px!important}#pst-native-home-v4 .pn-head:before,#pst-native-home-v4 .pn-head:after{display:none}#pst-native-home-v4 .pn-flow>.pn-work-grid{grid-template-columns:1fr!important}#pst-native-home-v4 .pn-lane{border-right:0!important;border-bottom:1px solid #E8EDEB!important}#pst-native-home-v4 .pn-lane-wait{grid-column:auto!important}#pst-native-home-v4 .pn-lane-wait .pn-work-list{grid-template-columns:1fr!important}#pst-native-home-v4 .pn-side{grid-template-columns:1fr!important}#page-finance #fin-hub-grid{grid-template-columns:1fr!important}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
`;

function installCss(){var s=document.getElementById('pst-creative-ui-v1-css');if(!s){s=document.createElement('style');s.id='pst-creative-ui-v1-css';document.head.appendChild(s);}if(s.textContent!==CSS)s.textContent=CSS;document.documentElement.classList.add('pst-creative-ui-v1-ready');}
function translateStatuses(root){(root||document).querySelectorAll('.pn-project-status,.pn-timeline-item span span,.pst-pm-badge,.pst-pm-meta-value').forEach(function(el){var raw=String(el.textContent||'').trim(),key=raw.toLowerCase().replace(/[\s-]+/g,'_');if(STATUS[key])el.textContent=STATUS[key];});}
function decorateFinance(){var grid=document.getElementById('fin-hub-grid');if(!grid)return false;Array.prototype.slice.call(grid.children).forEach(function(tile,i){tile.classList.add('pst-creative-fin-tile');var icon=Array.prototype.slice.call(tile.children).filter(function(n){return n.tagName==='DIV'&&/font-size:\s*22px/i.test(n.getAttribute('style')||'');})[0];if(icon){icon.classList.add('pst-creative-fin-icon');icon.innerHTML=ICONS[i]||ICONS[0];}});return true;}
function wrapFinance(){var old=window.finShowHub;if(typeof old!=='function'||old.__pstCreativeWrapped)return;var wrapped=function(){var out=old.apply(this,arguments);decorateFinance();return out;};wrapped.__pstCreativeWrapped=true;wrapped.__pstCreativeOriginal=old;window.finShowHub=wrapped;}
function trimChrome(){var h=document.querySelector('#page-workspace-projects .pst-pm-head');if(h){var e=h.querySelector('.pst-pm-eyebrow'),t=h.querySelector('.pst-pm-title'),s=h.querySelector('.pst-pm-sub');if(e)e.textContent='PORTOFOLI';if(t)t.textContent='Projektet';if(s)s.textContent='Një pamje e qartë e punës, afateve dhe hapit të ardhshëm.';}var c=document.querySelector('#page-workspace-contacts .pcm-head p');if(c)c.textContent='Klientët, furnitorët dhe kontaktet — të lidhur me punën reale.';}
function apply(){installCss();wrapFinance();decorateFinance();translateStatuses(document);trimChrome();return true;}
apply();
document.addEventListener('pst:modules-ready',function(){apply();setTimeout(apply,250);},{once:true});
document.addEventListener('pst:visual-ready',apply,{once:true});
document.addEventListener('pst:native-home-ready',apply,{once:true});
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#pst-ws-canonical-nav,#fin-hub-grid,[data-pn-area],[data-pn-project-id],[data-pn-action-id]'))[0,180,650,1600,3500].forEach(function(ms){setTimeout(apply,ms);});},true);
window.addEventListener('pageshow',apply,{once:true});
window.PSTCreativeUiV1={apply:apply,installCss:installCss,decorateFinance:decorateFinance,translateStatuses:translateStatuses};
})();
