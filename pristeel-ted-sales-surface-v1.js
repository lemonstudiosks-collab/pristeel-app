/* PRISTEEL TED Sales Surface v1
 * Presentation/read-only bridge from the active Opportunities workspace to the
 * TED Sales outreach register. No Supabase writes or outbound actions.
 */
(function(){
'use strict';
if(window.__pstTedSalesSurfaceV1)return;
window.__pstTedSalesSurfaceV1=true;

var emailReadInstalled=false,sentStateRefreshed=false,sentStateRefreshing=false;

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
 return true;
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
document.addEventListener('click',function(e){var n=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn[data-key="tenders"],.pst-ws-navbtn[data-pst-business-zone="opportunities"],#pst-pcw-lifecycle-tabs button,#pst-pcw-opportunity-tabs button'):null;if(n)schedule();},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.PSTTedSalesSurfaceV1={mount:mount,schedule:schedule};
})();