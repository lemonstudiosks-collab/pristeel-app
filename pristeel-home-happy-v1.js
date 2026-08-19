/* PRISTEEL Home Happy v2
 * Final cosmetic layer for Workspace Home.
 * One visual language: compact sections, uniform action cards, subtle object silhouettes.
 * Presentation only: no project/task/offer/email/finance writes.
 */
(function(){
'use strict';
if(window.__pstHomeHappyV1)return;
window.__pstHomeHappyV1=true;

function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function icon(name){
 var p={
  spark:'<path d="M12 2.7 14.1 8l5.2 2.1-5.2 2.1L12 17.5l-2.1-5.3-5.2-2.1L9.9 8z"/><path d="m18.2 16 .9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z"/>',
  bolt:'<path d="m13.2 2-7 11h5l-.4 9 7-12h-5.2z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3 9h18M8 13h3M8 17h3"/>',
  certificate:'<circle cx="12" cy="10" r="6"/><path d="m9 10 2 2 4-4M8.5 15.2 7 21l5-2 5 2-1.5-5.8"/>',
  mail:'<rect x="3" y="5" width="15" height="13" rx="2.3"/><path d="m4 7 6.5 5 6.5-5"/><circle cx="18.5" cy="17" r="4"/><path d="M18.5 14.8v2.6M18.5 19.1h.01"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3C9.7 5.5 8.5 8.5 8.5 12s1.2 6.5 3.5 9"/>',
  reply:'<path d="M9 8 4 12l5 4"/><path d="M5 12h8a6 6 0 0 1 6 6v1"/>',
  building:'<path d="M4 21V8l8-4 8 4v13M8 10h2M14 10h2M8 14h2M14 14h2M10 21v-4h4v4"/>',
  restaurant:'<path d="M6 3v8M4 3v5c0 2 4 2 4 0V3M6 11v10M15 3c3 2 4 5 4 8h-4V3zM17 11v10"/>',
  warehouse:'<path d="M3 10 12 4l9 6v11H3z"/><path d="M7 21v-7h10v7M7 17h10M9 10h6"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  hall:'<path d="M3 21V9l9-6 9 6v12M6 21v-8h12v8M6 13h12M9 21v-4h6v4"/>',
  folder:'<path d="M3 6h7l2 2h9v11H3z"/>',
  arrow:'<path d="m9 6 6 6-6 6"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  handshake:'<path d="m8 12 3 3c1 1 2.5 1 3.5 0l4-4M3 11l4-4 3 2 2-2c1-1 2.6-1 3.6 0L21 12"/><path d="m5 13 2 2M7 15l2 2M9 17l1.5 1.5"/>',
  blueprint:'<path d="M5 3h10l4 4v14H5zM15 3v5h4"/><path d="M8 12h8M8 16h5"/>'
 }[name]||'';
 return '<svg viewBox="0 0 24 24" aria-hidden="true"><g>'+p+'</g></svg>';
}
function isHome(){var p=document.getElementById('page-workspace-home');return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function priorityType(row){var t=norm(row&&row.textContent);if(/plan dinamik|afat/.test(t))return'calendar';if(/iso|certifikat|audit/.test(t))return'certificate';if(/bounce|email/.test(t))return'mail';if(/ted|tender/.test(t))return'globe';if(/follow|pergjigje|ndjekje|rfq/.test(t))return'reply';return'bolt';}
function projectType(card){var t=norm(card&&card.textContent);if(/dukley|restaurant|restoran/.test(t))return'restaurant';if(/jola|heavy plate|ah36|plate/.test(t))return'layers';if(/sportska|sport|hall/.test(t))return'hall';if(/stacon|lagerhalle|warehouse|hala|ssip|smart city/.test(t))return'warehouse';return'building';}
function nextType(text){var t=norm(text);if(/plan|afat|dinamik/.test(t))return'calendar';if(/komercial|cmim|ofer/.test(t))return'chart';if(/dokument|teknik|specifik/.test(t))return'blueprint';if(/kusht|kontrat|dakord/.test(t))return'handshake';return'arrow';}
function statusTone(text){var t=norm(text);if(/fituar|won/.test(t))return'won';if(/aktiv|pune/.test(t))return'active';if(/ofert|pricing/.test(t))return'offer';if(/vonuar|late/.test(t))return'late';return'waiting';}

function hideTopChrome(){
 if(!isHome())return;
 var selectors='header,section,div,button,span,label';
 var nodes=Array.prototype.slice.call(document.querySelectorAll(selectors));
 function rectOk(el){var r=el.getBoundingClientRect();return r.top>=-5&&r.top<165&&r.width>30&&r.height>12&&r.height<145;}
 function smallest(match,maxWidth){
   var best=null,area=Infinity;
   nodes.forEach(function(el){if(!rectOk(el))return;var r=el.getBoundingClientRect();if(maxWidth&&r.width>maxWidth)return;var t=norm(el.textContent);if(!match(t))return;var a=r.width*r.height;if(a<area){best=el;area=a;}});
   return best;
 }
 var importBlock=smallest(function(t){return t.indexOf('import dokument')>-1&&t.indexOf('ngarko ose ngjit dokumentin e bleresit')>-1;},850);
 if(!importBlock)importBlock=smallest(function(t){return t==='import dokument';},550);
 if(importBlock){var parent=importBlock.closest('section,header,.topbar-left,.top-left,.toolbar-left')||importBlock;parent.classList.add('pst-home-hide-top');}
 var proj=smallest(function(t){return /italian style.*dukley.*seafront.*(?:restoran|restaurant).*budva/.test(t);},760);
 if(proj){var pbox=proj.closest('button,.chip,.pill,.topbar-project,.project-context')||proj;pbox.classList.add('pst-home-hide-top');}
 ['administrator','ruaj','eksporto','projekt i ri','mbyll projektin'].forEach(function(label){var el=smallest(function(t){return t===label;},360);if(el)el.classList.add('pst-home-hide-top');});
 var gp=document.getElementById('global-proj');if(gp){var gpbox=gp.closest('.form-group,.field,.select-wrap,.topbar-project,.flex')||gp;gpbox.classList.add('pst-home-hide-top');}
}

function ensureHeroStats(page){
 var head=page.querySelector('.pst-ws-head');if(!head)return;
 var old=head.querySelector('.pst-happy-stats');if(old)old.remove();
 var actions=page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').length;
 var projects=page.querySelectorAll('#pst-ws-home-projects > .pst-ws-projectcard').length;
 var follow=0;page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(r){if(/follow|pergjigje|ndjekje|rfq/i.test(norm(r.textContent)))follow++;});
 var stats=document.createElement('div');stats.className='pst-happy-stats';
 stats.innerHTML='<span class="pst-happy-stat">'+icon('bolt')+'<b>'+actions+'</b><em>prioritete aktive</em></span>'+
                 '<span class="pst-happy-stat">'+icon('folder')+'<b>'+projects+'</b><em>projekte në punë</em></span>'+
                 '<span class="pst-happy-stat">'+icon('reply')+'<b>'+follow+'</b><em>follow-up aktiv</em></span>';
 var sub=head.querySelector('.pst-ws-sub');if(sub)sub.insertAdjacentElement('afterend',stats);else head.appendChild(stats);
}

function decorateSectionHeaders(page){
 page.querySelectorAll('.pst-ws-card').forEach(function(card,index){
   var hd=card.querySelector('.pst-ws-card-hd'),title=card.querySelector('.pst-ws-card-title');if(!hd||!title)return;
   var copy=title.parentElement;
   if(copy&&copy!==hd)copy.classList.add('pst-happy-section-copy');
   var old=hd.querySelector('.pst-happy-section-icon');
   if(old&&old.parentElement!==hd)old.remove();
   var ico=hd.querySelector(':scope > .pst-happy-section-icon');
   if(!ico){ico=document.createElement('span');ico.className='pst-happy-section-icon '+(index===0?'priority':'project');ico.innerHTML=icon(index===0?'spark':'building');hd.insertBefore(ico,copy&&copy!==hd?copy:title);}
 });
}

function decorateQuick(page){
 page.querySelectorAll('.pst-ws-quick button').forEach(function(btn){btn.classList.add('pst-happy-quick');if(!btn.querySelector('.pst-happy-quick-arrow')){var a=document.createElement('span');a.className='pst-happy-quick-arrow';a.innerHTML=icon('arrow');btn.appendChild(a);}});
}

function decoratePriorities(page){
 page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(row){
   var type=priorityType(row);row.classList.add('pst-happy-priority');row.dataset.happyType=type;
   var main=row.querySelector('.pst-ws-action-main');if(!main)return;
   var kind=row.querySelector('.pst-happy-kind');if(!kind){kind=document.createElement('span');kind.className='pst-happy-kind';main.insertBefore(kind,main.firstChild);}
   var labels={calendar:'Afat / plan',certificate:'Certifikatë',mail:'Email',globe:'Tender',reply:'Follow-up',bolt:'Veprim'};kind.textContent=labels[type]||'Veprim';
   var ico=row.querySelector('.pst-priority-icon');if(ico)ico.innerHTML=icon(type);
   var art=row.querySelector('.pst-happy-priority-art');if(!art){art=document.createElement('span');art.className='pst-happy-priority-art';row.appendChild(art);}art.innerHTML=icon(type);
 });
}

function decorateProjects(page){
 page.querySelectorAll('#pst-ws-home-projects > .pst-ws-projectcard').forEach(function(card){
   var type=projectType(card);card.classList.add('pst-happy-project');card.dataset.happyProjectType=type;
   var art=card.querySelector('.pst-happy-project-art');if(!art){art=document.createElement('span');art.className='pst-happy-project-art';card.appendChild(art);}art.innerHTML=icon(type);
   var topIcon=card.querySelector('.pst-project-line-icon');if(topIcon)topIcon.innerHTML=icon(type);
   var status=card.querySelector('.pst-ws-status');if(status)status.dataset.happyStatus=statusTone(status.textContent);
   var next=card.querySelector('.pst-ws-projectcard-next');if(next){var ni=next.querySelector('.pst-happy-next-icon');if(!ni){ni=document.createElement('span');ni.className='pst-happy-next-icon';next.insertBefore(ni,next.firstChild);}ni.innerHTML=icon(nextType(next.textContent));}
   var btn=card.querySelector('button');if(btn&&/hap projekt/i.test(btn.textContent||''))btn.classList.add('pst-happy-open-project');
 });
}

function decorateSidebar(){var nav=document.getElementById('pst-ws-sidebar');if(!nav)return;nav.querySelectorAll('.pst-ws-navbtn').forEach(function(btn){btn.classList.add('pst-happy-nav');});var create=nav.querySelector('.pst-ws-create-main');if(create)create.classList.add('pst-happy-create');}
function decorate(){if(!isHome())return false;var page=document.getElementById('page-workspace-home');hideTopChrome();ensureHeroStats(page);decorateSectionHeaders(page);decorateQuick(page);decoratePriorities(page);decorateProjects(page);decorateSidebar();return true;}
function schedule(){[0,100,320,900,1800,3500].forEach(function(ms){setTimeout(decorate,ms);});}

function installCss(){
 if(document.getElementById('pst-home-happy-v1-css'))document.getElementById('pst-home-happy-v1-css').remove();
 var s=document.createElement('style');s.id='pst-home-happy-v1-css';s.textContent=`
:root{--happy-teal:#4C95AE;--happy-ink:#2D444D;--happy-muted:#72858D;--happy-warm:#F8F4EC;--happy-warm-border:#E8DDC9}
body:has(#page-workspace-home.active) .pst-home-hide-top{display:none!important}
#page-workspace-home .pst-ws-page{position:relative}
#page-workspace-home .pst-ws-head{overflow:hidden!important;position:relative!important;padding:18px 22px 17px!important;background:linear-gradient(115deg,#FFFFFF 0%,#F8FCFD 65%,#EEF7F9 100%)!important}
#page-workspace-home .pst-ws-head:after{content:"";position:absolute;right:-48px;top:-76px;width:210px;height:210px;border-radius:50%;background:radial-gradient(circle at 40% 40%,rgba(77,151,174,.12),rgba(77,151,174,0) 68%);pointer-events:none}
#page-workspace-home .pst-happy-stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px;position:relative;z-index:1}
#page-workspace-home .pst-happy-stat{height:34px;display:inline-flex;align-items:center;gap:7px;padding:0 11px;border-radius:999px;border:1px solid #D8E6EA;background:#F8FCFD;font-style:normal;box-shadow:0 3px 10px rgba(41,73,84,.035);color:#4A879C}
#page-workspace-home .pst-happy-stat svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pst-happy-stat b{font-size:12px;color:#30464F}.pst-happy-stat em{font-size:10.5px;color:#71848C;font-style:normal}

#page-workspace-home .pst-ws-card{display:block!important;min-height:0!important;height:auto!important;grid-template-rows:none!important}
#page-workspace-home .pst-ws-card-hd{display:grid!important;grid-template-columns:42px minmax(0,1fr) auto!important;grid-template-rows:auto auto!important;column-gap:11px!important;row-gap:1px!important;align-items:center!important;min-height:0!important;height:auto!important;padding:8px 4px 14px!important;margin:0!important}
#page-workspace-home .pst-happy-section-icon{grid-column:1!important;grid-row:1/3!important;width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#E7F4F8;color:#3F849B}
#page-workspace-home .pst-happy-section-icon.priority{background:#F8ECCD;color:#A6742F}.pst-happy-section-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#page-workspace-home .pst-happy-section-copy{grid-column:2!important;grid-row:1/3!important;min-width:0!important;display:block!important}.pst-happy-section-copy .pst-ws-card-title,.pst-happy-section-copy .pst-ws-card-sub{display:block!important;width:auto!important;max-width:none!important;white-space:normal!important}
#page-workspace-home .pst-ws-card-hd>.pst-ws-card-title{grid-column:2!important;grid-row:1!important}.pst-ws-card-hd>.pst-ws-card-sub{grid-column:2!important;grid-row:2!important}.pst-ws-card-hd>.pst-ws-link,.pst-ws-card-hd .pst-ws-link{grid-column:3!important;grid-row:1/3!important;align-self:center!important}
#page-workspace-home .pst-ws-card-title{font-size:20px!important;line-height:1.2!important}.pst-ws-card-sub{font-size:12px!important;line-height:1.45!important;margin-top:3px!important}

#page-workspace-home .pst-ws-quick{gap:12px!important}
#page-workspace-home .pst-happy-quick{position:relative!important;overflow:hidden!important;height:68px!important;border:1px solid #D6E5E9!important;background:linear-gradient(135deg,#FBFEFF,#EFF8FA)!important;box-shadow:0 7px 18px rgba(40,68,80,.04)!important;padding:11px 42px 11px 14px!important}
#page-workspace-home .pst-happy-quick:before{content:"";position:absolute;width:78px;height:78px;border-radius:50%;right:-30px;top:-36px;background:#DCEFF4;opacity:.7;pointer-events:none}.pst-happy-quick .pst-quick-icon{color:#3F879E!important}.pst-happy-quick-arrow{position:absolute;right:13px;top:50%;transform:translateY(-50%);width:23px;height:23px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.88);color:#6F878F}.pst-happy-quick-arrow svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

#page-workspace-home #pst-ws-home-actions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;padding:0!important;margin:0!important}
#page-workspace-home .pst-priority-card.pst-happy-priority{display:grid!important;grid-template-columns:46px minmax(0,1fr)!important;grid-template-areas:"icon main" "side side"!important;gap:10px 12px!important;min-height:188px!important;margin:0!important;padding:17px!important;border:1px solid var(--happy-warm-border)!important;border-left:4px solid #C9A86A!important;border-radius:20px!important;background:linear-gradient(145deg,#FFFDF9 0%,var(--happy-warm) 100%)!important;box-shadow:0 9px 24px rgba(55,67,68,.055)!important;position:relative!important;overflow:hidden!important}
#page-workspace-home .pst-priority-card.pst-happy-priority[data-pst-priority-kind],#page-workspace-home .pst-priority-card.pst-happy-priority.is-urgent,#page-workspace-home .pst-priority-card.pst-happy-priority.is-overdue{background:linear-gradient(145deg,#FFFDF9 0%,var(--happy-warm) 100%)!important;border-left-color:#C9A86A!important}
#page-workspace-home .pst-happy-priority-art{position:absolute;right:-8px;top:25px;width:120px;height:120px;display:flex;align-items:center;justify-content:center;color:#826D48;opacity:.065;pointer-events:none}.pst-happy-priority-art svg{width:104px;height:104px;fill:none;stroke:currentColor;stroke-width:1.15;stroke-linecap:round;stroke-linejoin:round}
#page-workspace-home .pst-happy-priority .pst-priority-icon{grid-area:icon!important;width:44px!important;height:44px!important;border-radius:14px!important;background:rgba(255,255,255,.78)!important;color:#9A7334!important;box-shadow:0 5px 14px rgba(65,64,53,.06)!important;z-index:1}.pst-happy-priority .pst-priority-icon svg{width:22px!important;height:22px!important;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#page-workspace-home .pst-happy-priority .pst-ws-action-main{grid-area:main!important;min-width:0!important;z-index:1}.pst-happy-kind{display:inline-flex;margin:0 0 5px;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.7);color:#827867;font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.45px}.pst-happy-priority .pst-ws-action-title{font-size:15px!important;line-height:1.3!important;font-weight:790!important;margin:0 0 5px!important;color:#31464D!important}.pst-happy-priority .pst-ws-action-meta{font-size:11.2px!important;line-height:1.48!important;color:#6F7F83!important;-webkit-line-clamp:2!important}
#page-workspace-home .pst-happy-priority .pst-ws-action-side{grid-area:side!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important;width:100%!important;max-width:none!important;margin-top:auto!important;gap:8px!important;z-index:1}.pst-happy-priority .pst-ws-action-controls{display:flex!important;gap:5px!important}.pst-happy-priority .pst-ws-action-controls button{height:31px!important;border-radius:10px!important}.pst-happy-priority .pst-ws-action-tag{font-size:8.5px!important;padding:0 8px!important;min-height:23px!important}

#page-workspace-home #pst-ws-home-projects{gap:16px!important;padding:0!important;margin:0!important}
#page-workspace-home .pst-happy-project{position:relative!important;padding:19px 20px 18px!important;min-height:218px!important;border:0!important;border-radius:21px!important;background:linear-gradient(145deg,#FFFFFF,#F7FBFC)!important;box-shadow:0 9px 25px rgba(37,65,77,.055)!important;overflow:hidden!important}
#page-workspace-home .pst-happy-project:before{content:"";position:absolute;left:0;top:0;right:0;height:4px;background:linear-gradient(90deg,#63A6BB,#8CC1D0)}
#page-workspace-home .pst-happy-project-art{position:absolute;right:-7px;top:30px;width:115px;height:115px;display:flex;align-items:center;justify-content:center;opacity:.065;color:#315766;pointer-events:none}.pst-happy-project-art svg{width:100px;height:100px;fill:none;stroke:currentColor;stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round}
#page-workspace-home .pst-happy-project .pst-ws-projectcard-next{position:relative!important;z-index:1!important;margin-top:16px!important;padding:11px 12px!important;border:1px solid rgba(116,164,179,.18)!important;background:rgba(255,255,255,.67)!important;border-radius:13px!important;font-size:11px!important;line-height:1.45!important}.pst-happy-next-icon{width:30px;height:30px;border-radius:9px;display:inline-flex;vertical-align:middle;margin-right:8px;align-items:center;justify-content:center;background:#EAF5F8;color:#448198}.pst-happy-next-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#page-workspace-home .pst-happy-open-project{border:0!important;border-radius:11px!important;background:#4A94AD!important;color:#fff!important;height:36px!important;padding:0 15px!important;font-size:10.5px!important;font-weight:760!important;box-shadow:0 6px 14px rgba(59,126,151,.17)!important}
#pst-ws-sidebar .pst-happy-nav{position:relative!important}.pst-happy-nav.active:before{content:"";position:absolute;left:-7px;width:4px;height:18px;border-radius:0 5px 5px 0;background:#4A94AD}.pst-happy-create{background:linear-gradient(135deg,#58A6BE,#3C849D)!important;box-shadow:0 8px 18px rgba(62,139,165,.18)!important}
@media(max-width:1180px){#page-workspace-home #pst-ws-home-actions{grid-template-columns:1fr!important}.pst-happy-priority{min-height:0!important}}
@media(max-width:850px){#page-workspace-home .pst-happy-stats{gap:6px}.pst-happy-stat em{display:none}#page-workspace-home .pst-ws-card-hd{grid-template-columns:38px minmax(0,1fr)!important}.pst-ws-card-hd .pst-ws-link{grid-column:2!important;grid-row:3!important;justify-self:start!important;margin-top:6px!important}}
`;
 document.head.appendChild(s);
}

installCss();
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule);
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.pst-ws-navbtn,.pst-ws-create-main,[onclick*="pstWorkspaceGo"]'))setTimeout(schedule,80);},true);
schedule();
window.PSTHomeHappyV1={decorate:decorate,schedule:schedule};
})();
