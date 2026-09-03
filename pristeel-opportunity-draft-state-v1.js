/* PRISTEEL Opportunity draft-state persistence v1
 * Persists successful human-created Gmail draft/scheduled state on the canonical tender row,
 * decorates Opportunities after reload, and prevents an accidental duplicate draft.
 * Never sends email; protected send approval remains human-only in Gmail.
 */
(function(){
'use strict';
if(window.__pstOpportunityDraftStateV1)return;
window.__pstOpportunityDraftStateV1=true;
var cache={rows:{},loadedAt:0,loading:null};
var wrappedPrepare=null;
var listObserver=null;
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function db(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path,method,body);}
function payload(r){return r&&r.payload&&typeof r.payload==='object'?r.payload:{};}
function draftState(r){var p=payload(r),d=p.outreach_draft||p.gmail_draft||null,s=d&&typeof d==='object'?S(d.status).toLowerCase():'';return d&&(s==='created'||s==='scheduled')?d:null;}
function isScheduled(d){return !!(d&&S(d.status).toLowerCase()==='scheduled');}
function tenderApi(){return window.PSTTenderPriorityActionsV2||window.PSTTenderPriorityActionsV1||null;}
function row(id){return cache.rows[S(id)]||null;}
function activeOpportunities(){var p=document.getElementById('page-kek-tenders');if(!p)return false;if(p.style&&p.style.display==='none')return false;try{var cs=window.getComputedStyle&&window.getComputedStyle(p);if(cs&&cs.display==='none')return false;}catch(e){}return true;}
function ensureCss(){
  if(document.getElementById('pst-opportunity-draft-state-css'))return;
  var s=document.createElement('style');s.id='pst-opportunity-draft-state-css';s.textContent=`
.pst-pcw-tender.pst-pcw-has-draft{border-color:#C8DED0!important;border-left-color:#6D9A78!important;background:#F3F8F4!important;box-shadow:0 3px 14px rgba(70,118,82,.05)!important}
.pst-pcw-tender.pst-pcw-has-draft:hover,.pst-pcw-tender.pst-pcw-has-draft:focus-visible{border-color:#AFCDB8!important;border-left-color:#547D60!important;background:#EEF6F0!important}
.pst-pcw-tender-meta .pst-pcw-draft-badge{background:#E1F0E5!important;color:#477153!important;font-weight:900!important}
.pst-pcw-tender.pst-pcw-has-draft .pst-pcw-tender-open{background:#E5F1E8!important;color:#477153!important}
.pst-pcw-draft-note{margin:14px 0 4px;padding:12px 13px;border:1px solid #CFE2D4;border-left:4px solid #6D9A78;border-radius:11px;background:#F2F8F4;color:#45624E}
.pst-pcw-draft-note b{display:block;font-size:11px}.pst-pcw-draft-note span{display:block;margin-top:3px;font-size:9.5px;line-height:1.45;color:#68806E}
#pst-pcw-ti-actions [data-pcw-ti="draft"].pst-pcw-draft-existing{background:#5E8A69!important;border-color:#5E8A69!important;color:#fff!important}
`;
  document.head.appendChild(s);
}
async function refresh(force){
  if(!force&&cache.loadedAt&&Date.now()-cache.loadedAt<20000)return cache.rows;
  if(cache.loading)return cache.loading;
  cache.loading=db('kek_tender_watch?select=id,payload,status&status=in.(new,review,watch)&limit=2000').then(function(rows){var m={};A(rows).forEach(function(r){m[S(r.id)]=r;});cache.rows=m;cache.loadedAt=Date.now();return m;}).catch(function(){return cache.rows;}).finally(function(){cache.loading=null;});
  return cache.loading;
}
function formatWhen(v){try{var d=new Date(v);if(isNaN(d.getTime()))return'';return d.toLocaleString('sq-AL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){return'';}}
function decorateCard(card,r){
  if(!card||!r)return false;var d=draftState(r),meta=card.querySelector('.pst-pcw-tender-meta'),open=card.querySelector('.pst-pcw-tender-open b'),badge=card.querySelector('.pst-pcw-draft-badge');
  if(!d){card.classList.remove('pst-pcw-has-draft');if(badge)badge.remove();return false;}
  var scheduled=isScheduled(d);
  card.classList.add('pst-pcw-has-draft');
  if(meta&&!badge){badge=document.createElement('span');badge.className='pst-pcw-draft-badge';meta.appendChild(badge);}
  if(badge)badge.textContent=scheduled?'EMAIL I PLANIFIKUAR':'DRAFT EMAILI U KRIJUA';
  if(open)open.textContent=scheduled?'Email i planifikuar':'Draft i krijuar';
  card.title=scheduled?'Emaili është planifikuar në Gmail. Kliko për ta parë gjendjen dhe opsionet.':'Draft emaili është krijuar. Kliko për ta parë gjendjen dhe opsionet.';
  return true;
}
function decorateModal(id,r){
  var modal=document.getElementById('pst-ti-backdrop');if(!modal||modal.hidden||modal.style.display==='none'||!r)return false;
  var body=modal.querySelector('#pst-ti-body'),actions=modal.querySelector('#pst-pcw-ti-actions'),d=draftState(r);if(!body||!actions)return false;
  var note=body.querySelector('.pst-pcw-draft-note');
  if(d){
    var scheduled=isScheduled(d),when=scheduled?formatWhen(d.scheduled_at||d.created_at):formatWhen(d.created_at);
    if(!note){note=document.createElement('div');note.className='pst-pcw-draft-note';body.insertBefore(note,body.firstChild);}
    if(scheduled){
      note.innerHTML='<b>Emaili është planifikuar në Gmail ✓</b><span>'+(d.to?'Për: '+E(d.to)+(when?' · ':''):'')+(when?'Dërgimi: '+E(when):'')+'. Kjo Opportunity konsiderohet e trajtuar dhe PPPP nuk do të krijojë draft të dytë.</span>';
    }else{
      note.innerHTML='<b>Draft emaili është krijuar në Gmail ✓</b><span>'+(d.to?'Për: '+E(d.to)+(d.created_at?' · ':''):'')+(d.created_at?'Regjistruar '+E(formatWhen(d.created_at)):'')+'. PPPP nuk do të krijojë një draft të dytë pa e hapur më parë këtë gjendje.</span>';
    }
    var b=actions.querySelector('[data-pcw-ti="draft"]');if(b){b.textContent=scheduled?'Emaili është planifikuar · Hap Gmail':'Drafti ekziston · Hap Gmail';b.classList.add('pst-pcw-draft-existing');b.disabled=false;}
  }else{
    if(note)note.remove();var c=actions.querySelector('[data-pcw-ti="draft"]');if(c){c.textContent='Përgatit emailin';c.classList.remove('pst-pcw-draft-existing');}
  }
  return true;
}
async function decorate(force){
  if(!activeOpportunities())return false;ensureCss();await refresh(!!force);
  document.querySelectorAll('#pst-opportunities-list .pst-pcw-tender[data-pcw-tender]').forEach(function(card){decorateCard(card,row(card.getAttribute('data-pcw-tender')));});
  var modal=document.getElementById('pst-ti-backdrop'),id=modal&&modal.getAttribute('data-pst-opportunity-id');if(id)decorateModal(id,row(id));
  watchList();return true;
}
function watchList(){
  var list=document.getElementById('pst-opportunities-list');if(!list||list.__pstDraftStateObserved)return false;list.__pstDraftStateObserved=true;
  listObserver=new MutationObserver(function(){setTimeout(function(){decorate(false);},0);});listObserver.observe(list,{childList:true});return true;
}
async function persistCreated(id,edited){
  id=S(id);if(!id)return false;
  var rows=A(await db('kek_tender_watch?id=eq.'+encodeURIComponent(id)+'&select=id,payload&limit=1')),r=rows[0];if(!r)return false;
  var p=Object.assign({},payload(r)),existing=p.outreach_draft&&typeof p.outreach_draft==='object'?p.outreach_draft:{};
  if(S(existing.status).toLowerCase()==='scheduled')return true;
  p.outreach_draft=Object.assign({},existing,{status:'created',created_at:existing.created_at||new Date().toISOString(),recorded_at:new Date().toISOString(),to:S(edited&&edited.to),subject:S(edited&&edited.subject),source:'gmail_ui',human_send_required:true});
  await db('kek_tender_watch?id=eq.'+encodeURIComponent(id),'PATCH',{payload:p,updated_at:new Date().toISOString()});
  cache.loadedAt=0;await refresh(true);decorate(false);try{document.dispatchEvent(new CustomEvent('pst:opportunity-draft-state-changed',{detail:{tender_id:id,status:'created'}}));}catch(e){}return true;
}
function openExisting(id,d){
  var modal=document.getElementById('pst-tender-draft-modal');if(modal)modal.classList.remove('open');
  var scheduled=isScheduled(d),when=scheduled?formatWhen(d&&d.scheduled_at||d&&d.created_at):formatWhen(d&&d.created_at);
  if(typeof window.pstToast==='function')window.pstToast((scheduled?'Emaili është planifikuar':'Draft emaili ekziston')+(when?' · '+when:'')+'. Po hap Gmail.','ok');
  window.open(scheduled?'https://mail.google.com/mail/u/0/#scheduled':'https://mail.google.com/mail/u/0/#drafts','_blank','noopener');return {existing:true,draft:d||{}};
}
function wrapPrepareDraft(){
  var P=tenderApi();if(!P||typeof P.prepareDraft!=='function')return false;if(P.prepareDraft.__pstDraftStateWrapped)return true;
  var original=P.prepareDraft;wrappedPrepare=original;
  var wrapped=async function(id){
    await refresh(true);var r=row(id),d=draftState(r);if(d)return openExisting(id,d);
    var promise=original.apply(this,arguments),modal=document.getElementById('pst-tender-draft-modal');if(modal)modal.setAttribute('data-pst-tender-id',S(id));
    var out=await Promise.resolve(promise);modal=document.getElementById('pst-tender-draft-modal');if(modal)modal.setAttribute('data-pst-tender-id',S(id));return out;
  };
  wrapped.__pstDraftStateWrapped=true;wrapped.__base=original;P.prepareDraft=wrapped;
  if(window.PSTTenderPriorityActionsV1&&window.PSTTenderPriorityActionsV1!==P)window.PSTTenderPriorityActionsV1.prepareDraft=wrapped;
  if(window.PSTTenderPriorityActionsV2&&window.PSTTenderPriorityActionsV2!==P)window.PSTTenderPriorityActionsV2.prepareDraft=wrapped;
  return true;
}
function bindGmailSuccessCapture(){
  if(window.__pstOpportunityDraftGmailCapture)return;window.__pstOpportunityDraftGmailCapture=true;
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest?e.target.closest('#pst-tender-draft-modal [data-td-gmail]'):null;if(!b)return;
    var modal=document.getElementById('pst-tender-draft-modal'),id=modal&&modal.getAttribute('data-pst-tender-id');if(!id)return;
    var edited={to:S(document.getElementById('pst-td-to')&&document.getElementById('pst-td-to').value),subject:S(document.getElementById('pst-td-subject')&&document.getElementById('pst-td-subject').value)};
    var done=false;[250,700,1400,2800,5500,9000,15000,22000].forEach(function(ms){setTimeout(function(){if(done)return;var btn=document.querySelector('#pst-tender-draft-modal [data-td-gmail]');if(btn&&/Drafti u krijua/i.test(S(btn.textContent))){done=true;persistCreated(id,edited).catch(function(err){console.warn('PPPP draft state persist:',err);});}},ms);});
  },true);
}
function bindOpportunityClicks(){
  if(window.__pstOpportunityDraftClickBridge)return;window.__pstOpportunityDraftClickBridge=true;
  document.addEventListener('click',function(e){
    var card=e.target&&e.target.closest?e.target.closest('.pst-pcw-tender[data-pcw-tender]'):null;if(card){var id=S(card.getAttribute('data-pcw-tender'));[0,80,250,700].forEach(function(ms){setTimeout(function(){var m=document.getElementById('pst-ti-backdrop');if(m){m.setAttribute('data-pst-opportunity-id',id);decorateModal(id,row(id));}},ms);});}
    var nav=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[data-key="tenders"],[data-key="opportunities"]'):null;if(nav)[100,450,1000,2200].forEach(function(ms){setTimeout(function(){decorate(ms>500);},ms);});
  },true);
}
function install(){ensureCss();wrapPrepareDraft();bindGmailSuccessCapture();bindOpportunityClicks();if(activeOpportunities())decorate(false);}
[0,250,700,1500,3500,7000,15000,30000,60000].forEach(function(ms){setTimeout(install,ms);});
document.addEventListener('pst:modules-ready',function(){[0,300,1000,3000].forEach(function(ms){setTimeout(install,ms);});},{once:true});
document.addEventListener('pst:opportunity-draft-state-changed',function(){decorate(true);});
window.addEventListener('pageshow',function(){setTimeout(install,150);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.PSTOpportunityDraftStateV1={apply:install,decorate:decorate,refresh:refresh,persistCreated:persistCreated,draftState:draftState,_cache:cache};
})();
