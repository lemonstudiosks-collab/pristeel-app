/* PRISTEEL targeted UI corrections from staging review */
(function(){
'use strict';
if(window.__pstUiCorrectionsV2)return;
window.__pstUiCorrectionsV2=true;

function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function date(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function css(){
  if(document.getElementById('pst-ui-corrections-v2-css'))return;
  var s=document.createElement('style');s.id='pst-ui-corrections-v2-css';s.textContent=`
/* Oferta: veprimi kryesor nuk duhet të jetë një pistë aeroporti */
.pst-offer-action-row{display:flex!important;align-items:center!important;gap:9px!important;justify-content:flex-end!important;flex-wrap:wrap!important}
.pst-offer-generate-compact{flex:0 0 auto!important;width:auto!important;min-width:190px!important;max-width:260px!important;height:42px!important;padding:0 24px!important;margin-left:auto!important;border-radius:10px!important;font-size:12px!important;font-weight:760!important}
.pst-offer-save-compact{flex:0 0 auto!important;width:auto!important;min-width:118px!important;height:42px!important;padding:0 16px!important}
.pst-position-primary{background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;color:#fff!important;border-color:transparent!important;font-weight:760!important;box-shadow:0 5px 14px rgba(63,127,152,.16)!important}
.pst-position-primary:hover{background:linear-gradient(135deg,#5F9FB7,#35748D)!important;color:#fff!important}

/* Qendra e emailave: kartat janë kontrolle reale, jo dekor */
.pec-kpi.pst-kpi-action,.pga-stat.pst-kpi-action{cursor:pointer!important;transition:border-color .14s ease,box-shadow .14s ease,transform .14s ease,background .14s ease}
.pec-kpi.pst-kpi-action:hover,.pec-kpi.pst-kpi-action:focus-visible{border-color:#8FBCCC!important;background:#F3FAFC!important;box-shadow:0 7px 20px rgba(57,112,134,.09)!important;transform:translateY(-1px)}
.pec-kpi.pst-kpi-action:after{content:'Hap';display:block;margin-top:7px;font-size:8.5px;font-weight:760;color:#3F7F98;opacity:.78}
.pga-stat.pst-kpi-action:hover{border-color:#8FBCCC!important;background:#F3FAFC!important;color:#3F7F98!important}
.pst-kpi-modal-bg{position:fixed;inset:0;z-index:5100;background:rgba(25,35,40,.45);display:flex;align-items:center;justify-content:center;padding:20px}
.pst-kpi-modal{width:min(920px,97vw);max-height:88vh;overflow:auto;background:#fff;border-radius:15px;box-shadow:0 24px 70px rgba(20,30,35,.25)}
.pst-kpi-modal-hd{position:sticky;top:0;z-index:2;background:#fff;display:flex;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #E3EAED}
.pst-kpi-modal-title{font-size:16px;font-weight:770}.pst-kpi-modal-sub{font-size:10px;color:#7D898F;margin-top:3px}.pst-kpi-modal-x{border:0;background:none;font-size:22px;color:#7D898F;cursor:pointer}
.pst-kpi-modal-body{padding:12px 18px 18px}.pst-kpi-email{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:11px 8px;border-bottom:1px solid #EDF1F3}.pst-kpi-email:last-child{border-bottom:0}
.pst-kpi-email b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-kpi-email span{display:block;font-size:10px;color:#7D898F;margin-top:3px}.pst-kpi-email button{align-self:center;height:30px;border:1px solid #CFE0E7;border-radius:8px;background:#fff;color:#3F7F98;padding:0 10px;cursor:pointer}.pst-kpi-empty{padding:24px;text-align:center;color:#7D898F;font-size:11px}

/* Dosja e projektit: teksti që lexohet çdo ditë nuk mund të jetë mikroskopik */
.pst-pi-title{font-size:25px!important;line-height:1.2!important}.pst-pi-sub{font-size:11.5px!important;line-height:1.5!important}
.pst-pi-tab{font-size:11.5px!important;padding:12px 14px!important}.pst-pi-hd b{font-size:12.5px!important}.pst-pi-hd small{font-size:9.5px!important}
.pst-pi-name{font-size:11.5px!important;line-height:1.4!important}.pst-pi-meta{font-size:9.8px!important;line-height:1.45!important}.pst-pi-link{font-size:9.5px!important}
.pst-pi-flow{gap:5px!important;padding:12px 4px 7px!important}.pst-pi-step{font-size:9.5px!important;line-height:1.35!important;color:#68777E!important;min-width:96px!important}.pst-pi-step i{width:29px!important;height:29px!important;font-size:9.5px!important;margin-bottom:7px!important}.pst-pi-step.on{font-weight:780!important;color:#3F7F98!important}
.pst-pi-stat span{font-size:9.5px!important}.pst-pi-stat b{font-size:18px!important}.pst-pi-contactmain b{font-size:11.5px!important}.pst-pi-contactmain div{font-size:9.5px!important}
.pst-ws-stage-label{font-size:9.5px!important;line-height:1.35!important}.pst-ws-stage-dot{width:26px!important;height:26px!important;font-size:9px!important}.pst-ws-stage:after{top:12px!important}
@media(max-width:760px){.pst-offer-generate-compact{margin-left:0!important;min-width:160px!important}.pst-pi-step{min-width:105px!important}}
`;
  document.head.appendChild(s);
}
function decorateButtons(root){
  var scope=root&&root.querySelectorAll?root:document;
  Array.prototype.forEach.call(scope.querySelectorAll('button'),function(button){
    var t=norm(button.textContent);
    if(/gjenero ofert/.test(t)){
      button.classList.add('pst-offer-generate-compact');
      if(button.parentElement)button.parentElement.classList.add('pst-offer-action-row');
    }
    if(/ruaj ofert/.test(t)){
      button.classList.add('pst-offer-save-compact');
      if(button.parentElement)button.parentElement.classList.add('pst-offer-action-row');
    }
    if(/^\+\s*pozicion/.test(t)||/^shto pozicion/.test(t))button.classList.add('pst-position-primary');
  });
}
function projectName(pid){
  var A=window.PSTEmail&&window.PSTEmail.projects||[];
  var p=A.filter(function(x){return String(x.id)===String(pid);})[0];
  return p?p.name||p.client||pid:pid||'Pa projekt';
}
function closeModal(){var e=document.getElementById('pst-kpi-modal-bg');if(e)e.remove();}
function modal(title,sub,body){
  closeModal();var bg=document.createElement('div');bg.id='pst-kpi-modal-bg';bg.className='pst-kpi-modal-bg';
  bg.innerHTML='<div class="pst-kpi-modal"><div class="pst-kpi-modal-hd"><div><div class="pst-kpi-modal-title">'+esc(title)+'</div><div class="pst-kpi-modal-sub">'+esc(sub||'')+'</div></div><button class="pst-kpi-modal-x" type="button">×</button></div><div class="pst-kpi-modal-body">'+body+'</div></div>';
  bg.onclick=function(e){if(e.target===bg)closeModal();};bg.querySelector('.pst-kpi-modal-x').onclick=closeModal;document.body.appendChild(bg);
}
function emailRows(rows){
  if(!rows||!rows.length)return'<div class="pst-kpi-empty">Nuk u gjetën emaila për këtë pamje.</div>';
  return rows.map(function(x){
    var who=x.direction==='outgoing'?(Array.isArray(x.to_emails)?x.to_emails.join(', '):x.to_emails||''):(x.from_name||x.from_email||'');
    var meta=[who,date(x.sent_at),x.project_id?projectName(x.project_id):'Pa projekt'].filter(Boolean).join(' · '),url=x.gmail_url||(window.PSTEmail&&window.PSTEmail.gmailUrl?window.PSTEmail.gmailUrl(x.gmail_thread_id):'');
    return'<div class="pst-kpi-email"><div><b>'+esc(x.subject||'(pa subjekt)')+'</b><span>'+esc(meta)+'</span></div>'+(url?'<button type="button" data-url="'+esc(url)+'">Hap</button>':'')+'</div>';
  }).join('');
}
window.pstEmailCenterKpi=async function(kind){
  if(kind==='unmatched'){
    var target=document.querySelector('#pst-email-center .pec-toolbar')||document.getElementById('pec-list');if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    var input=document.querySelector('#pst-email-center .pec-search');if(input)setTimeout(function(){input.focus();},350);return;
  }
  var title='Emailat e indeksuar',sub='Emailat më të fundit të ruajtur në platformë',query='project_emails?select=*&order=sent_at.desc&limit=300';
  if(kind==='linked'){title='Emailat e lidhur me projekte';sub='Lidhjet aktive, me projektin përkatës';query='project_emails?project_id=not.is.null&select=*&order=sent_at.desc&limit=300';}
  if(kind==='processed'){title='Emailat e kontrolluar';sub='Emailat që kanë kaluar në klasifikim ose audit';query='project_emails?match_method=not.is.null&select=*&order=updated_at.desc&limit=300';}
  modal(title,sub,'<div class="pst-kpi-empty">Duke ngarkuar…</div>');
  try{
    var rows=await window.supaFetch(query),body=document.querySelector('#pst-kpi-modal-bg .pst-kpi-modal-body');if(body)body.innerHTML=emailRows(rows||[]);
  }catch(e){var b=document.querySelector('#pst-kpi-modal-bg .pst-kpi-modal-body');if(b)b.innerHTML='<div class="pst-kpi-empty">'+esc(e.message||e)+'</div>';}
};
function activateKpis(root){
  var scope=root&&root.querySelectorAll?root:document;
  var map={'pec-kpi-total':'total','pec-kpi-linked':'linked','pec-kpi-unmatched':'unmatched','pec-kpi-processed':'processed'};
  Object.keys(map).forEach(function(id){
    var value=document.getElementById(id);if(!value)return;var card=value.closest('.pec-kpi');if(!card||card.__pstKpi)return;
    card.__pstKpi=true;card.classList.add('pst-kpi-action');card.tabIndex=0;card.setAttribute('role','button');
    var run=function(){window.pstEmailCenterKpi(map[id]);};card.addEventListener('click',run);card.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}});
  });
  Array.prototype.forEach.call(scope.querySelectorAll('.pga-stat'),function(card){
    if(card.__pstKpi)return;card.__pstKpi=true;card.classList.add('pst-kpi-action');card.tabIndex=0;card.setAttribute('role','button');
    card.addEventListener('click',function(){var strip=document.getElementById('pga-strip');if(strip)strip.scrollIntoView({behavior:'smooth',block:'center'});if(/per kontroll/.test(norm(card.textContent))&&typeof window.pstGmailAuditReview==='function')window.pstGmailAuditReview();});
  });
}
function installModalClicks(){
  if(document.__pstKpiModalClick)return;document.__pstKpiModalClick=true;
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.pst-kpi-email button[data-url]');if(!b)return;var w=window.open(b.getAttribute('data-url'),'PRISTEEL_GMAIL');if(w&&w.focus)w.focus();});
}
function apply(root){decorateButtons(root||document);activateKpis(root||document);}
css();installModalClicks();apply(document);
var observer=new MutationObserver(function(records){records.forEach(function(r){Array.prototype.forEach.call(r.addedNodes,function(n){if(n.nodeType===1)apply(n);});});activateKpis(document);});
function start(){if(document.body)observer.observe(document.body,{childList:true,subtree:true});apply(document);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
