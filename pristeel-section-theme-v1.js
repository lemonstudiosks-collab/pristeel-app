/* PRISTEEL section theme v2
 * Visible, calm section identity for the top-level PPPP workspace.
 * Presentation-only. No data reads/writes, observers or polling.
 */
(function(){
'use strict';
if(window.__pstSectionThemeV2)return;
window.__pstSectionThemeV2=true;

var COLORS={
 home:['#4F97AF','#34758B','#E8F3F6','#BDD9E2','#F6FAFB'],
 projects:['#647FA6','#486482','#EDF1F7','#CBD6E4','#F7F9FB'],
 tenders:['#8473A8','#655786','#F2EFF7','#D7D0E5','#FAF9FC'],
 contacts:['#4F9686','#397366','#EAF5F2','#C4DFD8','#F7FBFA'],
 inbox:['#B18A4F','#856738','#F8F1E6','#E3D3B8','#FCFAF6'],
 commercial:['#6F79AD','#535D8C','#F0F1F8','#D1D5E7','#FAFAFC'],
 finance:['#5F936C','#477153','#EDF5EF','#C9DDCE','#F8FBF9'],
 apps:['#648A95','#496A73','#EEF4F5','#CFDEE2','#F8FAFB']
};
function keyFromNav(k){return k==='inbox'?'inbox':k==='commercial'?'commercial':k==='finance'?'finance':k==='apps'?'apps':k==='contacts'?'contacts':k==='tenders'?'tenders':k==='projects'?'projects':'home';}
function detect(){
 if(document.querySelector('#page-workspace-home.active'))return'home';
 if(document.querySelector('#page-workspace-projects.active,#page-workspace-project.active'))return'projects';
 if(document.querySelector('#page-kek-tenders.active'))return'tenders';
 if(document.querySelector('#page-workspace-contacts.active,#page-contacts.active'))return'contacts';
 if(document.querySelector('#page-workspace-inbox.active'))return'inbox';
 if(document.querySelector('#page-workspace-commercial.active,#page-document-center.active,#page-oferta.active,#page-invoices.active'))return'commercial';
 if(document.querySelector('#page-finance.active'))return'finance';
 if(document.querySelector('#page-workspace-apps.active,#module-hub.active,#page-home.active'))return'apps';
 return document.body&&document.body.dataset.pstSection||'home';
}
function setSection(k){
 k=keyFromNav(k);
 if(!COLORS[k])k='home';
 var c=COLORS[k],b=document.body;if(!b)return k;
 b.dataset.pstSection=k;
 b.style.setProperty('--pst-section-accent',c[0]);
 b.style.setProperty('--pst-section-deep',c[1]);
 b.style.setProperty('--pst-section-soft',c[2]);
 b.style.setProperty('--pst-section-line',c[3]);
 b.style.setProperty('--pst-section-wash',c[4]);
 return k;
}
function css(){
 if(document.getElementById('pst-section-theme-v2-css'))return;
 var old=document.getElementById('pst-section-theme-v1-css');if(old)old.remove();
 var s=document.createElement('style');s.id='pst-section-theme-v2-css';s.textContent=`
body{--pst-section-accent:#4F97AF;--pst-section-deep:#34758B;--pst-section-soft:#E8F3F6;--pst-section-line:#BDD9E2;--pst-section-wash:#F6FAFB}

/* The requested visible section strip: one calm color, always obvious. */
body[data-pst-section] .content{position:relative!important;background:var(--pst-section-wash)!important}
body[data-pst-section] .content:before{content:"";position:absolute!important;left:0!important;right:0!important;top:0!important;height:9px!important;background:var(--pst-section-accent)!important;z-index:4!important;pointer-events:none!important}
body[data-pst-section] .content>.page.active,
body[data-pst-section] .content>#module-hub.active{padding-top:14px!important}

/* Sidebar identity follows the active module. */
body[data-pst-section] #pst-ws-sidebar .pst-ws-create-main{background:var(--pst-section-accent)!important;color:#fff!important;box-shadow:none!important}
body[data-pst-section] #pst-ws-sidebar .pst-ws-create-main:hover{background:var(--pst-section-deep)!important}
body[data-pst-section] #pst-ws-canonical-nav .pst-ws-navbtn.active{background:var(--pst-section-soft)!important;color:var(--pst-section-deep)!important;box-shadow:inset 3px 0 0 var(--pst-section-accent)!important}
body[data-pst-section] #pst-ws-canonical-nav .pst-ws-navbtn.active .pst-ws-badge{background:#fff!important;color:var(--pst-section-deep)!important}

/* Normal page buttons use the section family. Semantic/destructive controls keep their own colors. */
body[data-pst-section] .content button:not(.danger):not(.btn-danger):not([data-danger="1"]):not(#pst-loss-top):not(.pst-ws-action-dismiss):not(.pst-gli-dismiss){
 border-color:var(--pst-section-line)!important;
 color:var(--pst-section-deep)!important;
}
body[data-pst-section] .content button:not(.danger):not(.btn-danger):not([data-danger="1"]):not(#pst-loss-top):not(.pst-ws-action-dismiss):not(.pst-gli-dismiss):hover{
 background:var(--pst-section-soft)!important;border-color:var(--pst-section-accent)!important;color:var(--pst-section-deep)!important;
}
body[data-pst-section] .content :is(button.primary,.btn-primary,.pst-ws-btn.primary,.pst-pm-btn.primary,.pst-pm-open,.pst-dc-new,.pst-gli-intake,.pst-kek-btn.primary):not(.danger):not(.btn-danger){
 background:var(--pst-section-accent)!important;border-color:var(--pst-section-accent)!important;color:#fff!important;box-shadow:0 6px 16px rgba(48,63,73,.10)!important;
}
body[data-pst-section] .content :is(button.primary,.btn-primary,.pst-ws-btn.primary,.pst-pm-btn.primary,.pst-pm-open,.pst-dc-new,.pst-gli-intake,.pst-kek-btn.primary):not(.danger):not(.btn-danger):hover{
 background:var(--pst-section-deep)!important;border-color:var(--pst-section-deep)!important;color:#fff!important;
}

/* Inputs and selected tabs echo the same family. */
body[data-pst-section] .content :is(input,select,textarea):focus{border-color:var(--pst-section-accent)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--pst-section-accent) 15%,transparent)!important}
body[data-pst-section] .content :is(.pst-pm-chip.on,.pst-pm-toggle button.on,.pst-dc-type.active,.seg-btn.active,.tab.active,.fin-tab.active){background:var(--pst-section-soft)!important;border-color:var(--pst-section-line)!important;color:var(--pst-section-deep)!important}

/* Tenders. */
body[data-pst-section="tenders"] .pst-kek-eye{color:var(--pst-section-deep)!important}
body[data-pst-section="tenders"] .pst-kek-btn:not(.danger){border-color:var(--pst-section-line)!important;color:var(--pst-section-deep)!important}

/* Contacts. */
body[data-pst-section="contacts"] :is(.pcm-head>div>span,.pcm-eyebrow){color:var(--pst-section-deep)!important}
body[data-pst-section="contacts"] .pcm-head-actions button{background:var(--pst-section-soft)!important;border-color:var(--pst-section-line)!important;color:var(--pst-section-deep)!important}

/* Gmail. */
body[data-pst-section="inbox"] .pst-gli-intake{background:var(--pst-section-accent)!important;border-color:var(--pst-section-accent)!important;color:#fff!important}

/* Commercial / Documents. */
body[data-pst-section="commercial"] .pst-dc-type.active{background:var(--pst-section-accent)!important;border-color:var(--pst-section-accent)!important;color:#fff!important}
body[data-pst-section="commercial"] .pst-dc-action:not(.credit):not(.debit){background:var(--pst-section-soft)!important;border-color:var(--pst-section-line)!important;color:var(--pst-section-deep)!important}

/* Finance: remove the rainbow at the top-level. One finance family only. */
body[data-pst-section="finance"] #fin-hub-grid>div{border-color:var(--pst-section-accent)!important}
body[data-pst-section="finance"] #fin-hub-grid>div>div:first-child{background:var(--pst-section-accent)!important}
body[data-pst-section="finance"] #fin-hub-grid>a{border-color:var(--pst-section-accent)!important;background:var(--pst-section-soft)!important}
body[data-pst-section="finance"] #fin-hub-grid>a>div:nth-child(2){color:var(--pst-section-deep)!important}

/* Modules & Integrations: neutral cards, clear module accent. */
body[data-pst-section="apps"] :is(.pst-ws-app-icon,.module-icon,.app-icon){background:var(--pst-section-soft)!important;color:var(--pst-section-deep)!important}
body[data-pst-section="apps"] :is(.pst-ws-app,.module-card,.app-card):hover{border-color:var(--pst-section-accent)!important;background:var(--pst-section-wash)!important}
`;
 document.head.appendChild(s);
}
function apply(){css();return setSection(detect());}
function install(){
 if(window.__pstSectionThemeEventsV2)return;window.__pstSectionThemeEventsV2=true;
 document.addEventListener('click',function(e){
   var b=e.target&&e.target.closest?e.target.closest('#pst-ws-sidebar .pst-ws-navbtn[data-key]'):null;
   if(!b)return;
   setSection(b.getAttribute('data-key'));
   [0,100,350].forEach(function(ms){setTimeout(apply,ms);});
 },true);
 document.addEventListener('pst:modules-ready',apply,{once:true});
 document.addEventListener('pst:home-canonical-rendered',apply);
 window.addEventListener('pageshow',apply,{once:true});
}
css();setSection(detect());install();
window.PSTSectionThemeV1={apply:apply,setSection:setSection,detect:detect};
window.PSTSectionThemeV2=window.PSTSectionThemeV1;
})();

/* Automation Health is a read-only dynamic child of the current top-level section layer. */
(function(){
'use strict';
if(window.__pstAutomationHealthLoaderV1)return;window.__pstAutomationHealthLoaderV1=true;
function ensure(){
 if(window.PSTAutomationHealthV1)return true;
 if(document.querySelector('script[data-pst-automation-health]'))return false;
 var s=document.createElement('script');s.src='pristeel-automation-health-v1.js?v='+Date.now();s.defer=true;s.setAttribute('data-pst-automation-health','1');document.head.appendChild(s);return false;
}
ensure();document.addEventListener('pst:modules-ready',ensure,{once:true});
})();

/* Commercial Intake Review is an independent human-gated runtime child. */
(function(){
'use strict';
if(window.__pstCommercialIntakeReviewLoaderV1)return;window.__pstCommercialIntakeReviewLoaderV1=true;
function ensure(){
 if(window.PSTCommercialIntakeReviewV1)return true;
 if(document.querySelector('script[data-pst-commercial-intake-review]'))return false;
 var s=document.createElement('script');s.src='pristeel-commercial-intake-review-v1.js?v=20260830-unitprice2';s.defer=true;s.setAttribute('data-pst-commercial-intake-review','1');document.head.appendChild(s);return false;
}
ensure();document.addEventListener('pst:modules-ready',ensure,{once:true});
})();