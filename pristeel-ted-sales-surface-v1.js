/* PRISTEEL TED Sales Surface v1
 * Opportunities lifecycle bridge for Gmail outreach state.
 * It never sends external email; manual Gmail drafts are registered only after the human creates them.
 */
(function(){
'use strict';
if(window.__pstTedSalesSurfaceV1)return;
window.__pstTedSalesSurfaceV1=true;

var emailReadInstalled=false,sentStateRefreshed=false,sentStateRefreshing=false,draftRegisterBusy={};

function S(v){return String(v==null?'':v).trim();}
function css(){
 if(document.getElementById('pst-ted-sales-surface-css'))return;
 var s=document.createElement('style');s.id='pst-ted-sales-surface-css';s.textContent=`
#pst-pcw-opportunity-navrow{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:13px 0 10px}
#pst-pcw-opportunity-navrow #pst-pcw-opportunity-tabs{margin:0!important;flex:1;min-width:0}
#pst-pcw-ted-sales-link{min-height:44px;box-sizing:border-box;border:1px solid #D8C6A8;border-radius:12px;background:#FFF9EF;color:#76572B;padding:0 14px;text-decoration:none;display:inline-flex;align-items:center;gap:9px;font-size:12px;font-weight:850;white-space:nowrap;box-shadow:0 4px 12px rgba(122,86,35,.06)}
#pst-pcw-ted-sales-link:hover,#pst-pcw-ted-sales-link:focus-visible{border-color:#B18A4F;background:#FFF4DF;outline:none}
#pst-pcw-ted-sales-link small{font-size:9px;font-weight:700;color:#9A8666}
#pst-pcw-ted-sales-link b{font-size:17px;font-weight:700;color:#A65F2E}
@media(max-width:760px){#pst-pcw-opportunity-navrow{align-items:stretch}#pst-pcw-ted-sales-link{width:100%;justify-content:center}}
`;
 document.head.appendChild(s);
}
function installChunkedOpportunityEmailRead(){
 if(emailReadInstalled)return true;
 var base=window.supaFetch;if(typeof base!=='function')return false;
 if(base.__pstOpportunityEmailChunked){emailReadInstalled=true;return true;}
 function wrapped(path,method,body){
   var raw=String(path==null?'':path),m=raw.match(/^project_emails\?gmail_thread_id=in\.\(([^)]*)\)(&.*)$/);
   if(!m)return base.apply(this,arguments);
   var ids=m[1].split(',').map(function(x){return x.trim();}).filter(Boolean);
   if(ids.length<=40)return base.apply(this,arguments);
   var calls=[],ctx=this;
   for(var i=0;i<ids.length;i+=40){calls.push(base.call(ctx,'project_emails?gmail_thread_id=in.('+ids.slice(i,i+40).join(',')+')'+m[2],method,body));}
   return Promise.all(calls).then(function(groups){var out=[];groups.forEach(function(group){if(Array.isArray(group))out=out.concat(group);});return out;});
 }
 wrapped.__pstOpportunityEmailChunked=true;
 wrapped.__pstOpportunityEmailChunkedBase=base;
 window.supaFetch=wrapped;emailReadInstalled=true;return true;
}
function cleanOpportunityLifecycle(focus){
 if(!focus)return false;
 var life=focus.querySelector('#pst-pcw-lifecycle-tabs');if(!life)return false;
 var all=life.querySelector('[data-pcw-lifecycle="all"]');if(all)all.remove();
 var waiting=life.querySelector('[data-pcw-lifecycle="waiting"]');if(waiting){var ws=waiting.querySelector('span');if(ws)ws.textContent='Email i dërguar';}
 var draft=life.querySelector('[data-pcw-lifecycle="draft"]');if(draft){var count=Number((draft.querySelector('i')||{}).textContent||0),ds=draft.querySelector('span');if(count===0)draft.remove();else if(ds)ds.textContent='Draft i papërfunduar';}
 focus.querySelectorAll('.pst-pcw-life-badge.waiting').forEach(function(b){b.textContent='Email i dërguar';});
 focus.querySelectorAll('.pst-pcw-life-badge.draft').forEach(function(b){b.textContent='Draft i papërfunduar';});
 return true;
}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
async function edge(slug,payload){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 async function run(t){return fetch(base+'/functions/v1/'+slug,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
 var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}if(!res.ok||!data||data.ok===false)throw new Error(S(data&&(data.message||data.error)||('HTTP '+res.status)).slice(0,800));return data;
}
async function registerManualDraft(detail){
 detail=detail||{};var tenderId=S(detail.tender_id),email=S(detail.to).toLowerCase(),draftId=S(detail.gmail_draft_id),messageId=S(detail.gmail_message_id);if(!tenderId||!email||(!draftId&&!messageId))return false;
 var key=tenderId+'|'+email+'|'+(draftId||messageId);if(draftRegisterBusy[key])return draftRegisterBusy[key];
 draftRegisterBusy[key]=edge('pppp-opportunity-draft-register',{tender_id:tenderId,recipient_email:email,subject:S(detail.subject),gmail_draft_id:draftId||null,gmail_message_id:messageId||null,created_at:S(detail.created_at)||new Date().toISOString(),human_send_required:true}).then(function(out){sentStateRefreshed=false;var X=window.PSTProjectCentricWorkflowV1;if(X&&typeof X.loadOpportunities==='function')return Promise.resolve(X.loadOpportunities(true)).then(function(){schedule();return out;});schedule();return out;}).catch(function(err){console.warn('PPPP opportunity draft lifecycle register:',err);try{if(typeof window.pstToast==='function')window.pstToast('Drafti u krijua në Gmail, por statusi në PPPP nuk u regjistrua: '+S(err&&err.message||err),'warn');}catch(e){}return false;}).finally(function(){delete draftRegisterBusy[key];});
 return draftRegisterBusy[key];
}
function refreshSentState(){
 if(sentStateRefreshed||sentStateRefreshing||!installChunkedOpportunityEmailRead())return;
 var X=window.PSTProjectCentricWorkflowV1;if(!X||typeof X.loadOpportunities!=='function')return;
 sentStateRefreshing=true;
 Promise.resolve(X.loadOpportunities(true)).then(function(ok){sentStateRefreshing=false;if(ok){sentStateRefreshed=true;schedule();}else setTimeout(refreshSentState,220);}).catch(function(){sentStateRefreshing=false;});
}
function mount(){
 css();
 var page=document.getElementById('page-kek-tenders');if(!page)return false;
 var focus=page.querySelector('#pst-opportunities-focus');if(!focus)return false;
 var tabs=focus.querySelector('#pst-pcw-opportunity-tabs');if(!tabs)return false;
 var row=focus.querySelector('#pst-pcw-opportunity-navrow');
 if(!row){row=document.createElement('div');row.id='pst-pcw-opportunity-navrow';tabs.parentNode.insertBefore(row,tabs);row.appendChild(tabs);}
 var link=row.querySelector('#pst-pcw-ted-sales-link');
 if(!link){link=document.createElement('a');link.id='pst-pcw-ted-sales-link';link.href='ted-sales.html';link.title='Hap regjistrin TED Sales: outreach, Gmail, follow-up dhe projektet';link.innerHTML='<span>TED Sales</span><small>Outreach &amp; follow-up</small><b>→</b>';row.appendChild(link);}
 cleanOpportunityLifecycle(focus);
 refreshSentState();
 return true;
}
function schedule(){[0,80,240,700,1500].forEach(function(ms){setTimeout(mount,ms);});}
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
document.addEventListener('pst:tender-gmail-draft-created',function(ev){registerManualDraft(ev&&ev.detail||{});});
document.addEventListener('click',function(e){var n=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn[data-key="tenders"],.pst-ws-navbtn[data-pst-business-zone="opportunities"],#pst-pcw-lifecycle-tabs button,#pst-pcw-opportunity-tabs button'):null;if(n)schedule();},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.PSTTedSalesSurfaceV1={mount:mount,schedule:schedule,registerDraft:registerManualDraft};
})();