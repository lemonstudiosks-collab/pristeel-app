/* PRISTEEL Home Happy v1
 * Final cosmetic layer for Workspace Home.
 * Adds visual identity, contextual icons, soft colour, hierarchy and micro-interactions.
 * Read-only presentation layer: no project/task/offer/email/finance writes.
 */
(function(){
'use strict';
if(window.__pstHomeHappyV1)return;window.__pstHomeHappyV1=true;

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
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
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  handshake:'<path d="m8 12 3 3c1 1 2.5 1 3.5 0l4-4M3 11l4-4 3 2 2-2c1-1 2.6-1 3.6 0L21 12"/><path d="m5 13 2 2M7 15l2 2M9 17l1.5 1.5"/>',
  blueprint:'<path d="M5 3h10l4 4v14H5zM15 3v5h4"/><path d="M8 12h8M8 16h5"/>',
  project:'<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M8 6V4h8v2M9 12h6"/>'
 }[name]||'';
 return '<svg viewBox="0 0 24 24" aria-hidden="true"><g>'+p+'</g></svg>';
}
function isHome(){var p=document.getElementById('page-workspace-home');return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function priorityType(row){var t=norm(row&&row.textContent);if(/plan dinamik|afat/.test(t))return'calendar';if(/iso|certifikat|audit/.test(t))return'certificate';if(/bounce|email/.test(t))return'mail';if(/ted|tender/.test(t))return'globe';if(/follow|pergjigje|ndjekje|rfq/.test(t))return'reply';return'bolt';}
function projectType(card){var t=norm(card&&card.textContent);if(/dukley|restaurant|restoran/.test(t))return'restaurant';if(/stacon|lagerhalle|warehouse|hala/.test(t)&&!/sportska/.test(t))return'warehouse';if(/jola|heavy plate|ah36|plate/.test(t))return'layers';if(/sportska|sport|hall/.test(t))return'hall';return'building';}
function projectTone(card,index){var t=norm(card&&card.textContent);if(/dukley|restaurant/.test(t))return'coral';if(/stacon|lagerhalle/.test(t))return'mint';if(/jola|plate/.test(t))return'blue';if(/sportska|andrijevica/.test(t))return'violet';return['blue','mint','amber','violet'][index%4];}
function nextType(text){var t=norm(text);if(/plan|afat|dinamik/.test(t))return'calendar';if(/komercial|cmim|ofer/.test(t))return'chart';if(/dokument|teknik|specifik/.test(t))return'blueprint';if(/kusht|kontrat|dakord/.test(t))return'handshake';return'arrow';}
function statusTone(text){var t=norm(text);if(/fituar|won/.test(t))return'won';if(/aktiv|pune/.test(t))return'active';if(/ofert|pricing/.test(t))return'offer';if(/vonuar|late/.test(t))return'late';return'waiting';}
function ensureHeroStats(page){
 var head=page.querySelector('.pst-ws-head');if(!head)return;
 var old=head.querySelector('.pst-happy-stats');if(old)old.remove();
 var actions=page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').length;
 var projects=page.querySelectorAll('#pst-ws-home-projects > .pst-ws-projectcard').length;
 var follow=0;page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(r){if(/follow|pergjigje|ndjekje|rfq/i.test(norm(r.textContent)))follow++;});
 var stats=document.createElement('div');stats.className='pst-happy-stats';
 stats.innerHTML='<span class="pst-happy-stat priority">'+icon('bolt')+'<b>'+actions+'</b><em>prioritete aktive</em></span>'+
                 '<span class="pst-happy-stat projects">'+icon('folder')+'<b>'+projects+'</b><em>projekte në punë</em></span>'+
                 '<span class="pst-happy-stat follow">'+icon('reply')+'<b>'+follow+'</b><em>follow-up aktiv</em></span>';
 var sub=head.querySelector('.pst-ws-sub');if(sub)sub.insertAdjacentElement('afterend',stats);else head.appendChild(stats);
}
function decorateSectionHeaders(page){
 var cards=page.querySelectorAll('.pst-ws-card');
 cards.forEach(function(card,index){
   var hd=card.querySelector('.pst-ws-card-hd'),title=card.querySelector('.pst-ws-card-title');if(!hd||!title)return;
   var ico=hd.querySelector('.pst-happy-section-icon');if(!ico){ico=document.createElement('span');ico.className='pst-happy-section-icon '+(index===0?'priority':'project');ico.innerHTML=icon(index===0?'spark':'building');title.insertAdjacentElement('beforebegin',ico);}
 });
}
function decorateQuick(page){
 var tones=['blue','amber','mint','violet'];
 page.querySelectorAll('.pst-ws-quick button').forEach(function(btn,index){btn.classList.add('pst-happy-quick');btn.dataset.happyTone=tones[index%tones.length];if(!btn.querySelector('.pst-happy-quick-arrow')){var a=document.createElement('span');a.className='pst-happy-quick-arrow';a.innerHTML=icon('arrow');btn.appendChild(a);}});
}
function decoratePriorities(page){
 var rows=page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action');
 rows.forEach(function(row,index){
   row.classList.add('pst-happy-priority');row.dataset.happyType=priorityType(row);
   var main=row.querySelector('.pst-ws-action-main');if(!main)return;
   var kind=row.querySelector('.pst-happy-kind');if(!kind){kind=document.createElement('span');kind.className='pst-happy-kind';main.insertBefore(kind,main.firstChild);}
   var labels={calendar:'Afat / plan',certificate:'Certifikatë',mail:'Email',globe:'Tender',reply:'Follow-up',bolt:'Veprim'};kind.textContent=labels[row.dataset.happyType]||'Veprim';
   var ico=row.querySelector('.pst-priority-icon');if(ico)ico.innerHTML=icon(row.dataset.happyType);
   var side=row.querySelector('.pst-ws-action-side');if(side){side.classList.add('pst-happy-priority-side');}
 });
}
function decorateProjects(page){
 var cards=page.querySelectorAll('#pst-ws-home-projects > .pst-ws-projectcard');
 cards.forEach(function(card,index){
   var type=projectType(card),tone=projectTone(card,index);card.classList.add('pst-happy-project');card.dataset.happyProjectType=type;card.dataset.happyTone=tone;
   var art=card.querySelector('.pst-happy-project-art');if(!art){art=document.createElement('span');art.className='pst-happy-project-art';card.appendChild(art);}art.innerHTML=icon(type);
   var topIcon=card.querySelector('.pst-project-line-icon');if(topIcon)topIcon.innerHTML=icon(type);
   var status=card.querySelector('.pst-ws-status');if(status){status.dataset.happyStatus=statusTone(status.textContent);}
   var next=card.querySelector('.pst-ws-projectcard-next');if(next){var ni=next.querySelector('.pst-happy-next-icon');if(!ni){ni=document.createElement('span');ni.className='pst-happy-next-icon';next.insertBefore(ni,next.firstChild);}ni.innerHTML=icon(nextType(next.textContent));}
   var btn=card.querySelector('button');if(btn&&/hap projekt/i.test(btn.textContent||''))btn.classList.add('pst-happy-open-project');
 });
}
function decorateSidebar(){
 var nav=document.getElementById('pst-ws-sidebar');if(!nav)return;
 nav.querySelectorAll('.pst-ws-navbtn').forEach(function(btn,index){btn.classList.add('pst-happy-nav');btn.dataset.happyNav=String(btn.getAttribute('data-key')||index);});
 var create=nav.querySelector('.pst-ws-create-main');if(create)create.classList.add('pst-happy-create');
}
function decorate(){
 if(!isHome())return false;var page=document.getElementById('page-workspace-home');
 ensureHeroStats(page);decorateSectionHeaders(page);decorateQuick(page);decoratePriorities(page);decorateProjects(page);decorateSidebar();return true;
}
function schedule(){[0,90,260,650,1300].forEach(function(ms){setTimeout(decorate,ms);});}
function installCss(){
 if(document.getElementById('pst-home-happy-v1-css'))return;
 var s=document.createElement('style');s.id='pst-home-happy-v1-css';s.textContent=`
:root{--happy-blue:#4C95AE;--happy-blue-soft:#EAF6FA;--happy-mint:#62A884;--happy-mint-soft:#ECF7F1;--happy-amber:#C99448;--happy-amber-soft:#FBF3E5;--happy-violet:#8171B1;--happy-violet-soft:#F1EEF9;--happy-coral:#C77A6E;--happy-coral-soft:#FAEFED;--happy-ink:#2D444D;--happy-muted:#72858D}
#page-workspace-home .pst-ws-page{position:relative}
#page-workspace-home .pst-ws-head{overflow:hidden!important;position:relative!important;padding:18px 22px 17px!important;background:linear-gradient(115deg,#FFFFFF 0%,#F8FCFD 60%,#EFF8FA 100%)!important}
#page-workspace-home .pst-ws-head:after{content:"";position:absolute;right:-48px;top:-76px;width:210px;height:210px;border-radius:50%;background:radial-gradient(circle at 40% 40%,rgba(77,151,174,.13),rgba(77,151,174,0) 68%);pointer-events:none}
#page-workspace-home .pst-happy-stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px;position:relative;z-index:1}
#page-workspace-home .pst-happy-stat{height:34px;display:inline-flex;align-items:center;gap:7px;padding:0 11px;border-radius:999px;border:1px solid #DDE8EB;background:rgba(255,255,255,.84);backdrop-filter:blur(4px);font-style:normal;box-shadow:0 3px 10px rgba(41,73,84,.035)}
#page-workspace-home .pst-happy-stat svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#page-workspace-home .pst-happy-stat b{font-size:12px;color:#30464F}.pst-happy-stat em{font-size:10.5px;color:#71848C;font-style:normal}
#page-workspace-home .pst-happy-stat.priority{color:#B27B2C;background:#FFF9EE;border-color:#F0DFC0}.pst-happy-stat.projects{color:#3F879E;background:#F1FAFC;border-color:#D2E9F0}.pst-happy-stat.follow{color:#7568A2;background:#F7F4FC;border-color:#E1DAF1}
#page-workspace-home .pst-ws-card-hd{display:grid!important;grid-template-columns:42px minmax(0,1fr) auto!important;column-gap:10px!important;align-items:center!important}
#page-workspace-home .pst-happy-section-icon{grid-row:1/3;width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#E7F5F9,#DDF0F5);color:#3F849B}
#page-workspace-home .pst-happy-section-icon.priority{background:linear-gradient(145deg,#FFF3DA,#FAE7BD);color:#A26B24}.pst-happy-section-icon.project{background:linear-gradient(145deg,#E8F4FA,#DBECF5);color:#477F9A}
#page-workspace-home .pst-happy-section-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#page-workspace-home .pst-ws-card-title{grid-column:2!important;align-self:end!important}.pst-ws-card-sub{grid-column:2!important;align-self:start!important}.pst-ws-card-hd .pst-ws-link{grid-column:3!important;grid-row:1/3!important}
#page-workspace-home .pst-ws-quick{gap:12px!important}
#page-workspace-home .pst-happy-quick{position:relative!important;overflow:hidden!important;height:70px!important;border:0!important;box-shadow:0 7px 18px rgba(40,68,80,.045)!important;padding:11px 42px 11px 14px!important}
#page-workspace-home .pst-happy-quick:before{content:"";position:absolute;width:78px;height:78px;border-radius:50%;right:-30px;top:-36px;opacity:.75;pointer-events:none}
#page-workspace-home .pst-happy-quick[data-happy-tone="blue"]{background:linear-gradient(135deg,#F8FCFE,#EDF8FB)!important}.pst-happy-quick[data-happy-tone="blue"]:before{background:#D9F0F6}.pst-happy-quick[data-happy-tone="blue"] .pst-quick-icon{color:#3F879E!important}
#page-workspace-home .pst-happy-quick[data-happy-tone="amber"]{background:linear-gradient(135deg,#FFFDF8,#FBF3E7)!important}.pst-happy-quick[data-happy-tone="amber"]:before{background:#F5E5C7}.pst-happy-quick[data-happy-tone="amber"] .pst-quick-icon{color:#A97231!important}
#page-workspace-home .pst-happy-quick[data-happy-tone="mint"]{background:linear-gradient(135deg,#FBFEFC,#EDF8F2)!important}.pst-happy-quick[data-happy-tone="mint"]:before{background:#DCEFE4}.pst-happy-quick[data-happy-tone="mint"] .pst-quick-icon{color:#56876B!important}
#page-workspace-home .pst-happy-quick[data-happy-tone="violet"]{background:linear-gradient(135deg,#FDFCFF,#F3EFFA)!important}.pst-happy-quick[data-happy-tone="violet"]:before{background:#E7E0F4}.pst-happy-quick[data-happy-tone="violet"] .pst-quick-icon{color:#74669B!important}
#page-workspace-home .pst-happy-quick-arrow{position:absolute;right:13px;top:50%;transform:translateY(-50%);width:23px;height:23px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.82);color:#7B8C92;transition:transform .15s ease,background .15s ease}.pst-happy-quick-arrow svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pst-happy-quick:hover .pst-happy-quick-arrow{transform:translate(2px,-50%);background:#fff}
#page-workspace-home #pst-ws-home-actions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important}
#page-workspace-home .pst-happy-priority{display:grid!important;grid-template-columns:46px minmax(0,1fr)!important;grid-template-areas:"icon main" "side side"!important;gap:10px 12px!important;min-height:190px!important;margin:0!important;padding:17px!important;border:0!important;border-radius:20px!important;background:linear-gradient(145deg,#FFFFFF 0%,#F7FBFC 100%)!important;box-shadow:0 8px 23px rgba(37,65,77,.055)!important;position:relative!important;overflow:hidden!important}
#page-workspace-home .pst-happy-priority:after{content:"";position:absolute;width:115px;height:115px;border-radius:50%;right:-55px;bottom:-58px;background:rgba(79,151,174,.06);pointer-events:none}
#page-workspace-home .pst-happy-priority[data-happy-type="calendar"]{background:linear-gradient(145deg,#FFFDF8,#FBF4E8)!important}.pst-happy-priority[data-happy-type="calendar"]:after{background:rgba(206,151,67,.09)}
#page-workspace-home .pst-happy-priority[data-happy-type="certificate"]{background:linear-gradient(145deg,#FBFEFC,#EEF8F2)!important}.pst-happy-priority[data-happy-type="certificate"]:after{background:rgba(90,157,119,.08)}
#page-workspace-home .pst-happy-priority[data-happy-type="mail"]{background:linear-gradient(145deg,#FFFCFC,#FAEFED)!important}.pst-happy-priority[data-happy-type="mail"]:after{background:rgba(190,102,90,.08)}
#page-workspace-home .pst-happy-priority[data-happy-type="globe"]{background:linear-gradient(145deg,#FDFCFF,#F2EFF9)!important}.pst-happy-priority[data-happy-type="globe"]:after{background:rgba(127,107,177,.08)}
#page-workspace-home .pst-happy-priority .pst-priority-icon{grid-area:icon!important;width:44px!important;height:44px!important;border-radius:14px!important;background:rgba(255,255,255,.84)!important;box-shadow:0 5px 14px rgba(42,68,79,.07)!important;color:#45879D!important}.pst-happy-priority[data-happy-type="calendar"] .pst-priority-icon{color:#A66F2D!important}.pst-happy-priority[data-happy-type="certificate"] .pst-priority-icon{color:#56866B!important}.pst-happy-priority[data-happy-type="mail"] .pst-priority-icon{color:#A85F57!important}.pst-happy-priority[data-happy-type="globe"] .pst-priority-icon{color:#74669B!important}
#page-workspace-home .pst-happy-priority .pst-priority-icon svg{width:22px!important;height:22px!important;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#page-workspace-home .pst-happy-priority .pst-ws-action-main{grid-area:main!important;min-width:0!important}.pst-happy-kind{display:inline-flex;margin:0 0 5px;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.72);color:#7A898F;font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.45px}.pst-happy-priority .pst-ws-action-title{font-size:15px!important;line-height:1.28!important;font-weight:790!important;margin:0 0 5px!important;color:#2E454E!important}.pst-happy-priority .pst-ws-action-meta{font-size:11px!important;line-height:1.48!important;color:#71828A!important;-webkit-line-clamp:2!important}
#page-workspace-home .pst-happy-priority .pst-ws-action-side{grid-area:side!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important;min-width:0!important;max-width:none!important;width:100%!important;margin-top:auto!important;gap:8px!important}.pst-happy-priority .pst-ws-action-controls{display:flex!important;gap:5px!important}.pst-happy-priority .pst-ws-action-controls button{height:31px!important;border-radius:10px!important}.pst-happy-priority .pst-ws-action-tag{font-size:8.5px!important;padding:0 8px!important;min-height:23px!important}
#page-workspace-home #pst-ws-home-projects{gap:16px!important}
#page-workspace-home .pst-happy-project{position:relative!important;padding:19px 20px 18px!important;min-height:218px!important;border:0!important;border-radius:21px!important;background:linear-gradient(145deg,#FFFFFF,#F7FBFC)!important;box-shadow:0 9px 25px rgba(37,65,77,.055)!important;overflow:hidden!important}
#page-workspace-home .pst-happy-project[data-happy-tone="coral"]{background:linear-gradient(145deg,#FFFDFC,#FAF1EF)!important}.pst-happy-project[data-happy-tone="mint"]{background:linear-gradient(145deg,#FCFFFD,#EFF8F3)!important}.pst-happy-project[data-happy-tone="blue"]{background:linear-gradient(145deg,#FCFEFF,#EEF7FB)!important}.pst-happy-project[data-happy-tone="violet"]{background:linear-gradient(145deg,#FEFDFF,#F3F0FA)!important}
#page-workspace-home .pst-happy-project:before{content:"";position:absolute;left:0;top:0;right:0;height:4px;background:linear-gradient(90deg,#63A6BB,#8CC1D0)}.pst-happy-project[data-happy-tone="coral"]:before{background:linear-gradient(90deg,#C9786D,#E4A69E)}.pst-happy-project[data-happy-tone="mint"]:before{background:linear-gradient(90deg,#68A986,#98C8AC)}.pst-happy-project[data-happy-tone="violet"]:before{background:linear-gradient(90deg,#8172AF,#B2A5D3)}
#page-workspace-home .pst-happy-project-art{position:absolute;right:-7px;top:30px;width:115px;height:115px;display:flex;align-items:center;justify-content:center;opacity:.065;color:#315766;pointer-events:none}.pst-happy-project-art svg{width:100px;height:100px;fill:none;stroke:currentColor;stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round}
#page-workspace-home .pst-happy-project .pst-project-line-icon{width:34px!important;height:34px!important;border-radius:11px!important;background:rgba(255,255,255,.8)!important;box-shadow:0 4px 12px rgba(42,68,79,.06)!important;z-index:1}.pst-happy-project .pst-project-line-icon svg{width:20px!important;height:20px!important;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#page-workspace-home .pst-happy-project .pst-ws-status{font-size:9px!important;font-weight:800!important;padding:6px 9px!important;border:0!important;background:#F1F4F5!important;color:#6D7B81!important}.pst-happy-project .pst-ws-status[data-happy-status="won"]{background:#DFF2E7!important;color:#3E7958!important}.pst-happy-project .pst-ws-status[data-happy-status="active"]{background:#E1F1F6!important;color:#39758B!important}.pst-happy-project .pst-ws-status[data-happy-status="offer"]{background:#EEE9F8!important;color:#6D5E98!important}.pst-happy-project .pst-ws-status[data-happy-status="waiting"]{background:#FAEDCF!important;color:#8C6424!important}.pst-happy-project .pst-ws-status[data-happy-status="late"]{background:#F7E3E0!important;color:#98564E!important}
#page-workspace-home .pst-happy-project .pst-ws-projectcard-name{font-size:15px!important;line-height:1.28!important;position:relative;z-index:1}.pst-happy-project .pst-ws-projectcard-client{font-size:11px!important;position:relative;z-index:1}
#page-workspace-home .pst-happy-project .pst-ws-projectcard-next{position:relative!important;z-index:1!important;display:grid!important;grid-template-columns:32px minmax(0,1fr)!important;align-items:center!important;gap:9px!important;margin-top:16px!important;padding:11px 12px!important;border:1px solid rgba(116,164,179,.18)!important;background:rgba(255,255,255,.67)!important;backdrop-filter:blur(3px);border-radius:13px!important;font-size:11px!important;line-height:1.45!important}.pst-happy-next-icon{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:#EAF5F8;color:#448198}.pst-happy-next-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#page-workspace-home .pst-happy-open-project{border:0!important;border-radius:11px!important;background:#4A94AD!important;color:#fff!important;height:36px!important;padding:0 15px!important;font-size:10.5px!important;font-weight:760!important;box-shadow:0 6px 14px rgba(59,126,151,.17)!important}.pst-happy-open-project:hover{transform:translateY(-1px);background:#397F98!important}
#pst-ws-sidebar .pst-happy-nav{position:relative!important}.pst-happy-nav.active:before{content:"";position:absolute;left:-7px;width:4px;height:18px;border-radius:0 5px 5px 0;background:linear-gradient(180deg,#69AFC3,#3F8199)}
#pst-ws-sidebar .pst-happy-create{background:linear-gradient(135deg,#58A6BE,#3C849D)!important;box-shadow:0 8px 18px rgba(62,139,165,.18)!important}
@media(max-width:1180px){#page-workspace-home #pst-ws-home-actions{grid-template-columns:1fr!important}.pst-happy-priority{min-height:0!important;grid-template-columns:44px minmax(0,1fr) auto!important;grid-template-areas:"icon main side"!important}.pst-happy-priority .pst-ws-action-side{grid-area:side!important;flex-direction:column!important;width:auto!important;align-items:flex-end!important}}
@media(max-width:850px){#page-workspace-home .pst-happy-stats{gap:6px}.pst-happy-stat em{display:none}#page-workspace-home .pst-happy-priority{grid-template-columns:42px minmax(0,1fr)!important;grid-template-areas:"icon main" "side side"!important}.pst-happy-priority .pst-ws-action-side{width:100%!important;flex-direction:row!important;align-items:center!important}}
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
