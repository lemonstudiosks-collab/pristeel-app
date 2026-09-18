/* PRISTEEL Tender Supplier Sourcing v1
 * Read-only supplier matching + explicit on-demand external discovery + RFQ draft compose.
 * No supplier selection, supplier-master write or email send.
 */
(function(){
'use strict';
if(window.__pstTenderSupplierSourcingV1)return;
window.__pstTenderSupplierSourcingV1=true;
var cache={},busy={};
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(S(v));}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
async function edge(payload){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 async function run(t){return fetch(base+'/functions/v1/pppp-tender-supplier-sourcing-v1',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
 var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}
 if(!res.ok||!data||data.ok===false)throw new Error(S(data&&data.message||'Supplier sourcing nuk u përfundua.').slice(0,500));return data;
}
function css(){
 if(document.getElementById('pst-tender-supplier-sourcing-css'))return;
 var s=document.createElement('style');s.id='pst-tender-supplier-sourcing-css';
 s.textContent=[
 '#pst-tda-sourcing{margin:18px 0;border:1px solid #d5e4e8;border-radius:14px;background:#fff;overflow:hidden}',
 '.pts-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:15px 17px;background:#f7fafb;border-bottom:1px solid #e4ecef}',
 '.pts-head span{display:block;font-size:10px;font-weight:900;letter-spacing:.09em;color:#397f98}.pts-head b{display:block;margin-top:3px;font-size:16px;color:#304a55}.pts-head small{display:block;margin-top:4px;font-size:10px;line-height:1.45;color:#73868e}',
 '.pts-summary{display:flex;gap:8px;flex-wrap:wrap}.pts-summary i{font-style:normal;border:1px solid #d9e5e8;border-radius:999px;background:#fff;padding:6px 9px;font-size:9px;font-weight:800;color:#607781}',
 '.pts-list{padding:0 15px}.pts-req{padding:15px 2px;border-bottom:1px solid #edf2f3}.pts-req:last-child{border-bottom:0}',
 '.pts-req-top{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.pts-req h4{margin:0;font-size:13px;color:#324b55}.pts-req p{margin:4px 0 0;font-size:10px;line-height:1.45;color:#71838b;max-width:760px}',
 '.pts-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.pts-tags span{border-radius:999px;background:#f0f5f6;padding:4px 7px;font-size:8px;font-weight:800;color:#607781}',
 '.pts-state{font-size:9px;font-weight:900;white-space:nowrap}.pts-state.ready{color:#35734a}.pts-state.review{color:#85631d}.pts-state.find{color:#397f98}',
 '.pts-suppliers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.pts-supplier{border:1px solid #e1eaed;border-radius:10px;padding:10px;background:#fbfcfc;min-width:0}',
 '.pts-supplier b{display:block;font-size:10px;color:#334b55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pts-supplier small{display:block;margin-top:3px;font-size:8.5px;color:#768990;line-height:1.4}.pts-badge{display:inline-block;margin-top:6px;border-radius:999px;padding:3px 6px;background:#edf5f7;color:#397f98;font-size:7.5px;font-weight:900}.pts-badge.ready{background:#eaf5ed;color:#35734a}.pts-badge.review{background:#fff3d6;color:#85631d}',
 '.pts-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.pts-actions button,.pts-actions a{height:29px;display:inline-flex;align-items:center;padding:0 8px;border:1px solid #d2e0e4;border-radius:8px;background:#fff;color:#397f98;font-size:8px;font-weight:850;text-decoration:none;cursor:pointer}.pts-actions button.primary{background:#397f98;color:#fff;border-color:#397f98}.pts-actions button:disabled{opacity:.55;cursor:wait}',
 '.pts-empty{margin-top:10px;padding:10px;border:1px dashed #d8e3e6;border-radius:9px;font-size:9px;line-height:1.45;color:#6d8088}.pts-foot{padding:10px 16px;background:#f8fbfc;border-top:1px solid #e8eef0;font-size:8.5px;line-height:1.45;color:#71848c}',
 '@media(max-width:780px){.pts-req-top{display:block}.pts-state{display:block;margin-top:7px}.pts-suppliers{grid-template-columns:1fr}.pts-summary{margin-top:7px}}'
 ].join('');
 document.head.appendChild(s);
}
function dims(r){
 return A(r&&r.dimensions).slice(0,4).map(function(x){if(x.diameter_mm)return'Ø'+x.diameter_mm+' × '+(x.length_mm||'?')+' mm';if(x.outer_diameter_mm)return'D '+x.outer_diameter_mm+' / d '+(x.inner_diameter_mm||'?')+' / S '+(x.wall_mm||'?')+' mm';return'';}).filter(Boolean);
}
function tags(r){return dims(r).concat(A(r.standards)).concat(A(r.certifications)).concat(A(r.grades)).concat(r.delivery_terms?[r.delivery_terms]:[]).slice(0,10);}
function state(c,source){
 if(source==='catalog'){if(c.rfq_ready_candidate)return{label:'RFQ-READY · EVIDENCË ZYRTARE',cls:'ready'};return c.contact_ready?{label:'KONTAKT GATI · VERIFIKO',cls:'review'}:{label:'VERIFIKO',cls:'review'};}
 if(source==='web')return c.contact_ready?{label:'KONTAKT GATI · WEB',cls:'review'}:{label:'VERIFIKO WEB',cls:'review'};
 if(c.strict_fit&&c.rfq_ready)return{label:'RFQ-READY',cls:'ready'};
 if(c.review_fit||c.evidence_gap)return{label:'PËR VERIFIKIM',cls:'review'};
 return{label:'KANDIDAT',cls:''};
}
function draftBody(title,r,name){
 var req=[r.label].concat(dims(r)).concat(A(r.standards)).concat(A(r.certifications)).concat(A(r.grades)).filter(Boolean).join(' · ');
 return[
  'Dear '+(name||'Sales Team')+',','','PRISTEEL is preparing a quotation for a steel supply tender in Kosovo and we would like to request your quotation for:',req,'',
  'Please confirm:','- unit price and total price','- material grade / quality','- manufacturer and country of origin','- EN 10204 material certificate / test report where applicable','- ISO 9001 manufacturer certification where required','- lead time','- transport and Incoterm to Kosovo'+(r.delivery_terms?' (target: '+r.delivery_terms+')':''),'- payment terms','- quotation validity','',
  'Please identify any technical deviation clearly in your quotation.','','Tender / project: '+title,'','Kind regards,','Arianit Vllahiu','PRISTEEL Sh.p.k.','sales@prissteel.com','+383 44 244 699'
 ].join('\n');
}
function gmail(title,r,c){
 var to=S(c&&c.email),sub='RFQ | '+S(r.label||title),body=draftBody(title,r,S(c&&c.name).split(/\s+/)[0]||'');
 return'https://mail.google.com/mail/?view=cm&authuser=sales%40prissteel.com&to='+enc(to)+'&su='+enc(sub)+'&body='+enc(body);
}
function supplierCard(title,r,c,source){
 var st=state(c,source),meta=[];if(c.country)meta.push(c.country);if(c.source_tier)meta.push(c.source_tier);if(source==='internal'&&c.match_score!=null)meta.push('match '+c.match_score);if(source==='catalog')meta.push('burim zyrtar');if((source==='catalog'||source==='web')&&c.standard_evidence)meta.push('standard ✓');if((source==='catalog'||source==='web')&&c.certificate_evidence)meta.push('certifikim ✓');if(source==='catalog'&&c.dimension_evidence&&c.dimension_evidence.verified)meta.push('dimension ✓');
 var actions='';if(c.evidence_url)actions+='<a target="_blank" rel="noopener" href="'+E(c.evidence_url)+'">Evidenca ↗</a>';else if(c.website)actions+='<a target="_blank" rel="noopener" href="'+E(c.website)+'">Website ↗</a>';if(c.email)actions+='<a target="_blank" rel="noopener" href="'+E(gmail(title,r,c))+'">RFQ draft</a>';
 return'<div class="pts-supplier"><b>'+E(c.name||c.domain||'Furnitor')+'</b><small>'+E(meta.join(' · ')||'Kandidat për verifikim')+(c.email?'<br>'+E(c.email):'')+'</small><span class="pts-badge '+st.cls+'">'+E(st.label)+'</span>'+(actions?'<div class="pts-actions">'+actions+'</div>':'')+'</div>';
}
function reqHtml(title,r){
 var i=r.internal||{},cat=r.catalog||{},strict=Number(i.strict_rfq_ready_existing||0),review=Number(i.review_rfq_ready_existing||0),catalogReady=Number(cat.rfq_ready_count||0),catalogReview=Number(cat.review_count||0),ext=r.external||null,external=A(ext&&ext.candidates),internal=A(i.candidates).filter(function(c){return c.strict_fit||c.review_fit||c.evidence_gap;}).slice(0,4),catalog=A(cat.candidates).slice(0,6),cards=internal.map(function(c){return supplierCard(title,r,c,'internal');}).join('')+catalog.map(function(c){return supplierCard(title,r,c,'catalog');}).join('')+external.slice(0,6).map(function(c){return supplierCard(title,r,c,'web');}).join('');
 var ready=strict+catalogReady,totalReview=review+catalogReview,st=ready>=3?{t:ready+'/3 RFQ-ready',c:'ready'}:(ready+totalReview?{t:ready+'/3 gati · '+totalReview+' për verifikim',c:'review'}:{t:'0/3 RFQ-ready',c:'find'});
 var tagHtml=tags(r).map(function(x){return'<span>'+E(x)+'</span>';}).join(''),catalogNote=catalog.length?'<div class="pts-empty">Katalog i verifikuar: '+catalog.length+' kandidat(e) nga burime zyrtare; '+catalogReady+' plotësojnë evidencën e strukturuar për RFQ candidate.</div>':'',externalNote=ext?'<div class="pts-empty">Kërkimi web u bë vetëm për këtë artikull. U gjetën '+Number(ext.contact_ready_count||0)+' kontakte me email që kërkojnë verifikim teknik.</div>':'';
 return'<article class="pts-req" data-pts-req="'+E(r.id)+'"><div class="pts-req-top"><div><h4>'+E(r.label)+'</h4><p>'+E(r.description||'')+'</p><div class="pts-tags">'+tagHtml+'</div></div><span class="pts-state '+st.c+'">'+E(st.t)+'</span></div>'
 +(cards?'<div class="pts-suppliers">'+cards+'</div>':'<div class="pts-empty">PPPP nuk ka ende furnitor të verifikuar për këtë kërkesë.</div>')
 +catalogNote+externalNote+'<div class="pts-actions"><button type="button" class="primary" data-pts-discover="'+E(r.id)+'">'+E(ext?'Kërko përsëri në web':'Gjej furnitorë në web')+'</button></div></article>';
}
function render(data){
 css();var panel=document.getElementById('pst-tda-analysis');if(!panel)return false;var old=document.getElementById('pst-tda-sourcing');if(old)old.remove();
 var rows=A(data&&data.requirements),sum=data&&data.summary||{},section=document.createElement('section');section.id='pst-tda-sourcing';section.setAttribute('data-tender-id',S(data&&data.tender_id));
 section.innerHTML='<div class="pts-head"><div><span>FURNIZIMI / RFQ</span><b>BOQ → furnitorë → RFQ draft</b><small>PPPP kontrollon Supplier Master fillimisht. Kërkimi në web bëhet vetëm kur e kërkon ti dhe vetëm për artikullin që mungon.</small></div><div class="pts-summary"><i>'+Number(sum.requirements||rows.length)+' kërkesa</i><i>'+(Number(sum.strict_ready||0)+Number(sum.catalog_rfq_ready||0))+' RFQ-ready</i><i>'+Number(sum.catalog_review_ready||0)+' katalog për verifikim</i></div></div>'
 +(rows.length?'<div class="pts-list">'+rows.map(function(r){return reqHtml(S(data.title),r);}).join('')+'</div>':'<div class="pts-list"><div class="pts-empty">Nuk u nxor ende një BOQ furnizimi i mjaftueshëm nga dosja.</div></div>')
 +'<div class="pts-foot">Furnitorët janë kandidatë, jo përzgjedhje automatike. “RFQ draft” hap vetëm Gmail compose; PPPP nuk dërgon email pa veprimin tënd.</div>';
 var anchor=panel.querySelector('.pst-tda-next')||panel.querySelector('.pst-tda-more');if(anchor)anchor.insertAdjacentElement('afterend',section);else panel.appendChild(section);wire(section,data);return true;
}
function merge(base,fresh,id){
 var next=JSON.parse(JSON.stringify(base||{})),rows=A(next.requirements),incoming=A(fresh&&fresh.requirements)[0];if(!incoming)return fresh||base;var idx=rows.findIndex(function(x){return S(x.id)===S(id);});if(idx>=0)rows[idx]=incoming;else rows.push(incoming);next.requirements=rows;next.title=fresh.title||next.title;next.tender_id=fresh.tender_id||next.tender_id;var strict=0,review=0,catalogReady=0,catalogReview=0,needs=false;rows.forEach(function(x){var i=x.internal||{},cat=x.catalog||{};strict+=Number(i.strict_rfq_ready_existing||0);review+=Number(i.review_rfq_ready_existing||0);catalogReady+=Number(cat.rfq_ready_count||0);catalogReview+=Number(cat.review_count||0);needs=needs||x.discovery_needed===true;});next.summary={requirements:rows.length,strict_ready:strict,review_ready:review,catalog_rfq_ready:catalogReady,catalog_review_ready:catalogReview,external_discovery_needed:needs,external_search_executed:true};return next;
}
function wire(box,data){
 box.addEventListener('click',async function(e){var b=e.target&&e.target.closest?e.target.closest('[data-pts-discover]'):null;if(!b)return;e.preventDefault();var id=S(b.getAttribute('data-pts-discover')),tid=S(data&&data.tender_id),key=tid+':'+id;if(!id||!tid||busy[key])return;busy[key]=true;var old=b.textContent;b.disabled=true;b.textContent='Duke kërkuar…';try{var fresh=await edge({tender_id:tid,discover:true,requirement_id:id}),merged=merge(cache[tid]||data,fresh,id);cache[tid]=merged;render(merged);}catch(err){alert('Kërkimi i furnitorëve dështoi: '+S(err&&err.message||err));b.disabled=false;b.textContent=old;}finally{delete busy[key];}});
}
async function load(tid,force){tid=S(tid);if(!tid)return false;if(cache[tid]&&!force)return render(cache[tid]);if(busy[tid])return false;busy[tid]=true;try{var data=await edge({tender_id:tid,discover:false});cache[tid]=data;return render(data);}catch(err){console.warn('PPPP tender supplier sourcing:',err);return false;}finally{delete busy[tid];}}
function onReady(ev){var d=ev&&ev.detail||{};if(!d.tender_id||d.dossier_complete!==true||d.analysis_ready!==true)return;setTimeout(function(){load(d.tender_id,false);},80);}
document.addEventListener('pst:tender-dossier-ready',onReady);
document.addEventListener('pst:modules-ready',function(){var p=document.getElementById('pst-tda-analysis');if(p&&p.getAttribute('data-analysis-ready')==='1')load(p.getAttribute('data-tender-id'),false);},{once:true});
window.PSTTenderSupplierSourcingV1={version:'1',load:load,render:render,_cache:cache};
})();