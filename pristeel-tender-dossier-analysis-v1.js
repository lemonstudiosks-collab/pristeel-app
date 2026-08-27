/* PRISTEEL Tender Dossier Analysis v2
 * Extends the project-centric Opportunities surface with authenticated, server-side
 * reading of official KRPP/APP dossier documents. TED awards keep the existing winner workflow.
 * No external communication, commercial approval or parallel tender store.
 */
(function(){
'use strict';
if(window.__pstTenderDossierAnalysisV2&&window.PSTTenderDossierAnalysisV1)return;
window.__pstTenderDossierAnalysisV1=true;
window.__pstTenderDossierAnalysisV2=true;
var busy={};
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function safeUrl(v){v=S(v).trim();return /^https:\/\//i.test(v)?v:'';}
function db(path){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path);}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
async function edge(payload){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 async function run(t){return fetch(base+'/functions/v1/pppp-tender-dossier-analysis',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
 var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}if(!res.ok||!data||data.ok===false)throw new Error(S(data&&(data.message||data.error)||('HTTP '+res.status)).slice(0,900));return data;
}
async function tenderRow(id){var rows=A(await db('kek_tender_watch?id=eq.'+encodeURIComponent(id)+'&select=id,title,authority,procurement_no,publication_no,detail_url,source_url,payload&limit=1'));return rows[0]||null;}
function source(row){var p=row&&row.payload&&typeof row.payload==='object'?row.payload:{},x=S(p.source||'KRPP').toUpperCase();return x==='APP'||x==='APP_AL'?'APP_AL':x==='TED'?'TED':'KRPP';}
function waitBody(){return new Promise(function(resolve){var waits=[0,80,180,360,700,1200,1900],i=0;function next(){var b=document.getElementById('pst-ti-body');if(b)return resolve(b);if(i>=waits.length)return resolve(null);setTimeout(next,waits[i++]);}next();});}
function ensurePanel(body){var p=body.querySelector('#pst-tda-analysis');if(p)return p;p=document.createElement('section');p.id='pst-tda-analysis';p.innerHTML='<div class="pst-tda-loading">PPPP po merr dosjen zyrtare dhe po lexon dokumentet…</div>';var generic=body.querySelector('#pst-pcw-server-analysis');if(generic)generic.insertAdjacentElement('afterend',p);else body.appendChild(p);return p;}
function rating(v){v=S(v).toLowerCase();return['strong','possible','weak','unknown'].indexOf(v)>-1?v:'unknown';}
function ratingLabel(v){return v==='strong'?'Përshtatje e fortë':v==='possible'?'Për shqyrtim':v==='weak'?'Përshtatje e dobët':'Pa prova të mjaftueshme';}
function recommendationLabel(v){v=S(v).toUpperCase();return v==='GO'?'REKOMANDOHET':v==='NO_GO'||v==='NO-GO'?'MOS VAZHDO':v==='REVIEW'?'PËR SHQYRTIM':v||'PËR SHQYRTIM';}
function list(title,rows,limit){rows=A(rows).filter(Boolean).slice(0,limit||10);if(!rows.length)return'';return'<div class="pst-tda-list"><b>'+E(title)+'</b><ul>'+rows.map(function(x){return'<li>'+E(x)+'</li>';}).join('')+'</ul></div>';}
function docsHtml(docs,analyzed){var used={};A(analyzed).forEach(function(n){used[S(n).toLowerCase()]=1;});if(!A(docs).length)return'<p class="pst-tda-muted">Burimi nuk ekspozoi dokumente të shkarkueshme në këtë lexim.</p>';return'<div class="pst-tda-docs">'+A(docs).slice(0,16).map(function(d){var u=safeUrl(d.url),name=S(d.name||'Dokument'),tag=used[name.toLowerCase()]?'<i>lexuar nga AI</i>':'';return u?'<a href="'+E(u)+'" target="_blank" rel="noopener"><span>'+E(name)+'</span>'+tag+'</a>':'<span>'+E(name)+'</span>';}).join('')+'</div>';}
function partnerHtml(rows){rows=A(rows);if(!rows.length)return'';return'<div class="pst-tda-partners"><b>Partnerë potencialë nga PPPP</b>'+rows.map(function(x){return'<div><span>'+E(x.name)+'</span><small>'+E(ratingLabel(rating(x.fit)))+' · '+E(x.reason)+'</small></div>';}).join('')+'</div>';}
function render(panel,out,row){
 var x=out&&out.analysis||{},cap=x.capability_fit||{},eu=x.eurosteel_fit||{},docs=A(out&&out.documents),warnings=A(out&&out.warnings),rec=S(x.recommendation||'REVIEW'),recText=recommendationLabel(rec);
 panel.innerHTML='<div class="pst-tda-head"><div><span>DOSJA E TENDERIT</span><h3>'+E(out&&out.cached?'Analiza e fundit e dosjes':'Dosja u lexua nga PPPP')+'</h3></div><div class="pst-tda-badges"><b class="rec '+E(rec.toLowerCase())+'">'+E(recText)+'</b><span>'+docs.length+' dokumente</span></div></div>'
  +'<p class="pst-tda-summary">'+E(x.summary||'Analiza nuk ktheu përmbledhje.').replace(/\n/g,'<br>')+'</p>'
  +'<div class="pst-tda-fit"><div><span>PRISTEEL</span><b class="'+rating(cap.rating)+'">'+E(ratingLabel(rating(cap.rating)))+'</b><small>'+E(cap.reason||'')+'</small></div><div><span>EUROSTEEL</span><b class="'+rating(eu.rating)+'">'+E(ratingLabel(rating(eu.rating)))+'</b><small>'+E(eu.reason||'')+'</small></div></div>'
  +(x.scope?'<div class="pst-tda-scope"><b>Fusha e punës</b><p>'+E(x.scope)+'</p></div>':'')
  +'<div class="pst-tda-core-grid"><section>'+list('Kushtet teknike',x.technical_requirements,16)+'</section><section>'+list('Kushtet komerciale',x.commercial_requirements,14)+'</section></div>'
  +'<div class="pst-tda-core-grid secondary"><section>'+list('Çfarë çeliku / pune metalike kërkohet',x.steel_scope,10)+'</section><section>'+list('Sasi dhe specifika të konfirmuara',x.known_quantities_specs,10)+'</section></div>'
  +partnerHtml(x.suggested_partners)
  +'<div class="pst-tda-next"><span>HAPI I RADHËS</span><b>'+E(x.next_step||'Verifiko dosjen dhe vendos nëse kjo mundësi duhet të bëhet projekt.')+'</b><small>Rekomandimi është ndihmës. Vendimi komercial mbetet te ti.</small></div>'
  +'<details class="pst-tda-more" open><summary>Afatet, dokumentet dhe verifikimet</summary><div class="pst-tda-more-grid">'
    +list('Kërkesa për dorëzim / ofertë',x.submission_requirements,14)+list('Afate',x.deadlines,12)+list('Rreziqe',x.risks,12)+list('Çfarë mungon',x.missing_information,12)
    +'<div class="pst-tda-list wide"><b>Dokumentet zyrtare</b>'+docsHtml(docs,out&&out.files_analyzed)+'</div>'
    +(warnings.length?'<div class="pst-tda-list wide warn"><b>Kufizime të leximit</b><ul>'+warnings.map(function(w){return'<li>'+E(w)+'</li>';}).join('')+'</ul></div>':'')
  +'</div></details>'
  +'<button type="button" class="pst-tda-refresh" data-tda-force="'+E(row.id)+'">Rilexo dosjen zyrtare</button>';
 panel.setAttribute('data-tender-id',S(row.id));panel.setAttribute('data-analysis-ready','1');
 var generic=panel.parentNode&&panel.parentNode.querySelector('#pst-pcw-server-analysis');if(generic)generic.classList.add('pst-tda-generic-hidden');
 var create=panel.parentNode&&panel.parentNode.querySelector('[data-pcw-ti="go"][data-id="'+CSS.escape(S(row.id))+'"]');if(create){create.disabled=false;create.removeAttribute('title');}
 try{document.dispatchEvent(new CustomEvent('pst:tender-dossier-ready',{detail:{tender_id:S(row.id),analysis:x,documents:docs.length,cached:!!(out&&out.cached)}}));}catch(e){}
}
async function analyze(id,force){id=S(id);if(!id||busy[id])return false;busy[id]=true;var panel=null;try{var row=await tenderRow(id);if(!row||source(row)==='TED')return false;var body=await waitBody();if(!body)return false;panel=ensurePanel(body);panel.setAttribute('data-tender-id',id);panel.setAttribute('data-analysis-ready','0');panel.innerHTML='<div class="pst-tda-loading">PPPP po merr dosjen zyrtare'+(source(row)==='APP_AL'?' nga APP':' nga KRPP')+', po gjen dokumentet dhe po nxjerr kushtet e tenderit…</div>';var out=await edge({tender_id:id,force:!!force});render(panel,out,row);return true;}catch(err){if(panel){panel.setAttribute('data-analysis-ready','0');panel.innerHTML='<div class="pst-tda-error"><b>Dosja nuk u lexua plotësisht.</b><span>'+E(err&&err.message||err)+'</span><button type="button" data-tda-force="'+E(id)+'">Provo përsëri</button></div>';}console.warn('PPPP tender dossier analysis:',err);return false;}finally{delete busy[id];}}
function scheduleFromTarget(target){return target&&target.closest?target.closest('[data-pcw-tender]'):null;}
function click(e){var force=e.target&&e.target.closest?e.target.closest('[data-tda-force]'):null;if(force){e.preventDefault();e.stopPropagation();analyze(force.getAttribute('data-tda-force'),true);}}
function keydown(e){return;}
function css(){
 var old=document.getElementById('pst-tender-dossier-analysis-css');if(old)old.remove();
 var s=document.createElement('style');s.id='pst-tender-dossier-analysis-v2-css';s.textContent=`
#pst-tda-analysis{margin-top:18px;padding:20px 0 2px;border-top:1px solid #dde8eb;color:#344b55}.pst-tda-generic-hidden{display:none!important}
.pst-tda-loading,.pst-tda-error{padding:18px 19px;border:1px solid #dbe7ea;border-radius:14px;background:#f7fbfc;font-size:13px;line-height:1.55;color:#5d747e}.pst-tda-error b,.pst-tda-error span{display:block}.pst-tda-error span{margin-top:5px}.pst-tda-error button{margin-top:11px;border:1px solid #bfd5dc;background:#fff;border-radius:10px;padding:9px 12px;color:#397f98;font-weight:800;cursor:pointer}
.pst-tda-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.pst-tda-head>div>span{font-size:10px;font-weight:900;letter-spacing:.1em;color:#397f98}.pst-tda-head h3{margin:4px 0 0;font-size:20px;letter-spacing:-.2px;color:#2e4650}
.pst-tda-badges{display:flex;gap:7px;align-items:center}.pst-tda-badges>*{border-radius:999px;padding:7px 10px;font-size:10px;font-weight:850}.pst-tda-badges span{background:#f0f4f5;color:#667b84}.pst-tda-badges .rec{background:#eaf3f6;color:#397f98}.pst-tda-badges .rec.go{background:#e9f5ed;color:#35734a}.pst-tda-badges .rec.no_go{background:#f8eded;color:#9b4d4d}
.pst-tda-summary{font-size:14px;line-height:1.65;color:#435b65;margin:14px 0 16px}
.pst-tda-fit{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pst-tda-fit>div{padding:14px 15px;border:1px solid #dce7ea;border-radius:13px;background:#fbfdfd}.pst-tda-fit span,.pst-tda-fit b,.pst-tda-fit small{display:block}.pst-tda-fit span{font-size:10px;font-weight:900;letter-spacing:.08em;color:#7a8e96}.pst-tda-fit b{font-size:14px;margin-top:4px;color:#536970}.pst-tda-fit b.strong{color:#35734a}.pst-tda-fit b.possible{color:#397f98}.pst-tda-fit b.weak{color:#9b5f4d}.pst-tda-fit small{font-size:12px;line-height:1.45;color:#74878f;margin-top:4px}
.pst-tda-scope{margin:13px 0;padding:14px 15px;border-left:4px solid #6f9eaf;background:#f6fafb;border-radius:0 11px 11px 0}.pst-tda-scope b,.pst-tda-scope p{display:block}.pst-tda-scope b{font-size:10px;color:#397f98;text-transform:uppercase;letter-spacing:.08em}.pst-tda-scope p{font-size:13px;line-height:1.55;margin:5px 0 0}
.pst-tda-core-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:13px}.pst-tda-core-grid>section{padding:14px 15px;border:1px solid #dde7ea;border-radius:13px;background:#fff}.pst-tda-core-grid.secondary>section{background:#fafcfc}
.pst-tda-list{margin:0}.pst-tda-list>b{display:block;font-size:12px;color:#344f59;margin-bottom:7px}.pst-tda-list ul{margin:0;padding-left:18px}.pst-tda-list li{font-size:12.5px;line-height:1.5;color:#5c727b;margin:5px 0}
.pst-tda-partners{margin-top:13px;padding:13px 14px;border:1px solid #e0e8ea;border-radius:12px;background:#fafcfc}.pst-tda-partners>b{font-size:12px;color:#445e67}.pst-tda-partners>div{padding:8px 0;border-bottom:1px solid #eef1f2}.pst-tda-partners>div:last-child{border-bottom:0}.pst-tda-partners span,.pst-tda-partners small{display:block}.pst-tda-partners span{font-size:12px;font-weight:800;color:#40545d}.pst-tda-partners small{font-size:11px;color:#77868c;margin-top:3px}
.pst-tda-next{margin-top:14px;padding:14px 15px;border-radius:12px;background:#eaf4f7}.pst-tda-next span,.pst-tda-next b,.pst-tda-next small{display:block}.pst-tda-next span{font-size:10px;font-weight:900;letter-spacing:.1em;color:#397f98}.pst-tda-next b{font-size:13px;line-height:1.45;color:#30464f;margin-top:4px}.pst-tda-next small{font-size:11px;color:#70838b;margin-top:4px}
.pst-tda-more{margin-top:14px;border:1px solid #e0e8ea;border-radius:12px;padding:0 14px 12px;background:#fff}.pst-tda-more summary{padding:12px 0;font-size:12px;font-weight:850;color:#4f6973;cursor:pointer}.pst-tda-more-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px}.pst-tda-more-grid .wide{grid-column:1/-1}.pst-tda-more-grid>.pst-tda-list{padding:11px 12px;border-radius:10px;background:#f9fbfc}
.pst-tda-docs{display:grid;gap:6px;margin-top:7px}.pst-tda-docs a,.pst-tda-docs>span{display:flex;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid #dfe7ea;border-radius:9px;background:#fff;color:#48636e;text-decoration:none;font-size:11.5px}.pst-tda-docs a:hover{border-color:#bcd0d7;background:#f7fbfc}.pst-tda-docs i{font-style:normal;color:#397f98;font-size:10px}.pst-tda-muted{font-size:11px;color:#819096}.pst-tda-list.warn{padding:11px 12px!important;background:#faf7f2!important}.pst-tda-refresh{margin-top:12px;border:0;background:transparent;color:#557b89;font-size:11px;font-weight:800;text-decoration:underline;cursor:pointer;padding:4px 0}
@media(max-width:760px){.pst-tda-head{flex-direction:column}.pst-tda-fit,.pst-tda-core-grid,.pst-tda-more-grid{grid-template-columns:1fr}.pst-tda-more-grid .wide{grid-column:auto}}
`;document.head.appendChild(s);
}
function apply(){css();return true;}
document.addEventListener('click',click,true);document.addEventListener('keydown',keydown,true);if(document.readyState!=='loading')apply();else document.addEventListener('DOMContentLoaded',apply,{once:true});
window.PSTTenderDossierAnalysisV1={version:'2',apply:apply,analyze:analyze,isReady:function(id){var p=document.getElementById('pst-tda-analysis');return !!(p&&p.getAttribute('data-analysis-ready')==='1'&&S(p.getAttribute('data-tender-id'))===S(id));},_test:{source:source,rating:rating,recommendationLabel:recommendationLabel,scheduleFromTarget:scheduleFromTarget}};
})();
