/* PRISTEEL Tender Supplier Sourcing v1
 * Additive Action Console surface over pppp-tender-supplier-sourcing-v1.
 * Read-only supplier discovery; human-controlled RFQ compose is allowed only after Supplier Gate approval and planned-RFQ registration.
 * No supplier selection, Supplier Master mutation, RFQ send or project decision.
 */
(function(){
'use strict';
if(window.__pstTenderSupplierSourcingV1)return;
window.__pstTenderSupplierSourcingV1=true;
var state={byTender:{},busy:{}};
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function uniq(rows,key){var seen={},out=[];A(rows).forEach(function(r){var k=key(r);if(!k||seen[k])return;seen[k]=1;out.push(r);});return out;}
function db(path){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path);}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
async function edge(payload){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 async function run(t){return fetch(base+'/functions/v1/pppp-tender-supplier-sourcing-v1',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
 var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}
 var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}
 if(!res.ok||!data||data.ok===false)throw new Error(S(data&&data.message||data&&data.error||'Supplier sourcing nuk u përfundua.').slice(0,500));
 return data;
}
async function supplierGate(tenderId,name,email,mode){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 var payload={p_project_id:null,p_tender_watch_id:tenderId,p_supplier_name:name||'',p_supplier_email:email||'',p_rfq_mode:mode||'firm'};
 async function run(t){return fetch(base+'/rest/v1/rpc/pppp_supplier_rfq_gate_v2',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
 var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}
 var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}
 if(!res.ok)throw new Error('Supplier Gate HTTP '+res.status+': '+raw.slice(0,450));
 return data||{allowed:false,reason:'empty_supplier_gate'};
}
async function registerTenderRfq(tid,email,name,subject,body,gate){
 if(typeof window.supaFetch!=='function')throw new Error('Databaza nuk është gati.');
 return window.supaFetch('rfq_log','POST',{tender_watch_id:tid,project_id:null,project_name:gate&&gate.tender_title||null,supplier_name:name||email,supplier_email:email,lang:'en',subject:subject,body:body,status:'planned',rfq_mode:gate&&gate.rfq_mode||'firm',supplier_relationship_state:gate&&gate.relationship_state||null,supplier_gate_snapshot:gate||{},human_send_required:true});
}
function host(){
 var body=document.getElementById('pst-ti-body');if(!body)return null;
 var panel=body.querySelector('#pst-tender-supplier-sourcing');if(panel)return panel;
 panel=document.createElement('section');panel.id='pst-tender-supplier-sourcing';panel.innerHTML='<div class="pst-tss-loading">PPPP po kontrollon Supplier Master dhe evidencën teknike…</div>';
 var actions=body.querySelector('#pst-pcw-ti-actions'),dossier=body.querySelector('#pst-tda-analysis'),generic=body.querySelector('#pst-pcw-server-analysis');
 if(actions)body.insertBefore(panel,actions);else if(dossier&&dossier.nextSibling)body.insertBefore(panel,dossier.nextSibling);else if(generic&&generic.nextSibling)body.insertBefore(panel,generic.nextSibling);else body.appendChild(panel);
 css();return panel;
}
function candidateKey(x){
 var u=S(x&&x.website||x&&x.website_url),d=S(x&&x.domain||x&&x.company_domain);
 try{if(u)d=new URL(u).hostname.replace(/^www\./,'');}catch(e){}
 return N(d||x&&x.name||x&&x.company_name||x&&x.email);
}
function internalReady(req){return A(req&&req.internal&&req.internal.candidates).filter(function(x){return x&&x.strict_fit===true&&!x.explicit_conflict;});}
function catalogReady(req){return A(req&&req.catalog&&req.catalog.candidates).filter(function(x){return x&&x.rfq_ready_candidate===true;});}
function readyRows(req){return uniq(internalReady(req).concat(catalogReady(req)),candidateKey);}
function reviewRows(req){
 var rows=[];
 A(req&&req.internal&&req.internal.candidates).forEach(function(x){if(x&&!x.explicit_conflict&&x.strict_fit!==true&&(x.review_fit===true||x.evidence_gap===true))rows.push(Object.assign({source:'supplier_master'},x));});
 A(req&&req.catalog&&req.catalog.candidates).forEach(function(x){if(x&&x.rfq_ready_candidate!==true)rows.push(Object.assign({source:'verified_public_catalog'},x));});
 A(req&&req.external&&req.external.candidates).forEach(function(x){if(x)rows.push(Object.assign({source:'external_discovery'},x));});
 return uniq(rows,candidateKey);
}
function conflictRows(req){
 var rows=A(req&&req.internal&&req.internal.conflicts).concat(A(req&&req.catalog&&req.catalog.conflicts));
 return uniq(rows,candidateKey);
}
function sourceLabel(x){
 var s=S(x&&x.source||x&&x.source_tier);
 if(s==='supplier_master')return'Supplier Master';
 if(s==='verified_public_catalog')return'Evidencë publike';
 if(s==='external_discovery')return'Discovery · '+E(x.source_tier||'web');
 return s==='local'?'Kosovë':s==='regional'?'Rajon':s==='turkey'?'Turqi':s==='greece'?'Greqi':s==='eu'?'BE':'Supplier Master';
}
function evidenceBits(x){
 var bits=[];
 if(x&&x.grade_evidence===true)bits.push('gradë ✓');else if(x&&x.grade_evidence===false)bits.push('gradë ?');
 if(x&&x.standard_evidence===true)bits.push('standard ✓');else if(x&&x.standard_evidence===false)bits.push('standard ?');
 if(x&&x.certificate_evidence===true)bits.push('cert. ✓');else if(x&&x.certificate_evidence===false)bits.push('cert. ?');
 var dim=x&&x.dimension_evidence;
 if(dim&&typeof dim==='object')bits.push(dim.verified?'dimension ✓':dim.conflict?'dimension ✕':'dimension ?');
 else if(dim===true)bits.push('dimension ✓');else if(dim===false)bits.push('dimension ?');
 if(x&&x.contact_ready===true||x&&x.email)bits.push('kontakt ✓');
 if(x&&x.evidence_gap===true)bits.push('evidencë e paplotë');
 if(x&&x.explicit_conflict===true)bits.push('konflikt');
 return bits;
}
function personName(x){return S(x&&x.name||x&&x.company_name||'Furnitor');}
function candidateHtml(x,kind,req,projectId){
 var mail=S(x&&x.email||x&&x.contact_email),site=S(x&&x.website||x&&x.website_url),bits=evidenceBits(x),why=S(x&&x.dimension_evidence&&x.dimension_evidence.reason||x&&x.duplicate_reason||'');
 var draft=kind==='ready'&&mail?'<button type="button" data-tss-draft="1" data-email="'+E(mail)+'" data-name="'+E(personName(x))+'" data-req="'+E(req.id)+'" data-project="'+E(projectId||'')+'">Përgatit RFQ</button>':'';
 return '<div class="pst-tss-candidate '+E(kind)+'"><div><b>'+E(personName(x))+'</b><small>'+E(sourceLabel(x))+(x&&x.country?' · '+E(x.country):'')+'</small></div><div class="pst-tss-evidence">'+(bits.length?bits.map(function(b){return'<span>'+E(b)+'</span>';}).join(''):'<span>kërkon verifikim</span>')+(why?'<em>'+E(why)+'</em>':'')+'</div><div class="pst-tss-c-actions">'+(site&&/^https:\/\//i.test(site)?'<a href="'+E(site)+'" target="_blank" rel="noopener">Website ↗</a>':'')+(mail?'<a href="mailto:'+E(mail)+'">'+E(mail)+'</a>':'')+draft+'</div></div>';
}
function listBlock(title,cls,rows,req,projectId,empty){
 return '<details class="pst-tss-list '+cls+'" '+(cls==='ready'?'open':'')+'><summary><span>'+E(title)+'</span><b>'+rows.length+'</b></summary><div>'+(rows.length?rows.slice(0,8).map(function(x){return candidateHtml(x,cls,req,projectId);}).join(''):'<p>'+E(empty)+'</p>')+(rows.length>8?'<small class="pst-tss-more">+'+(rows.length-8)+' kandidatë të tjerë</small>':'')+'</div></details>';
}
function reqBadges(r){
 var bits=[];
 A(r.grades).forEach(function(x){bits.push(x);});
 A(r.standards).forEach(function(x){bits.push(x);});
 A(r.certifications).forEach(function(x){bits.push(x);});
 if(r.delivery_terms)bits.push(r.delivery_terms+(N(r.delivery_terms)==='ddp'?' Kosovo':''));
 return uniq(bits,function(x){return N(x);}).map(function(x){return'<span>'+E(x)+'</span>';}).join('');
}
function requirementHtml(r,data){
 var ready=readyRows(r),review=reviewRows(r),bad=conflictRows(r),count=Number(r.strict_rfq_ready_combined!=null?r.strict_rfq_ready_combined:ready.length)||0,min=Number(r.minimum_rfq_ready||3),need=count<min;
 var ext=A(r.external&&r.external.candidates),discoveryNote=r.external?'<small class="pst-tss-discovery-note">Discovery kontrolloi burime publike · '+ext.length+' kandidatë u kthyen vetëm për verifikim.</small>':'';
 return '<article class="pst-tss-req '+(need?'needs':'covered')+'" data-tss-req="'+E(r.id)+'"><header><div><span>'+E(r.family==='tubes'?'GYP / TUB':'SHUFËR / PROFIL')+'</span><h4>'+E(r.label||r.description||r.id)+'</h4><p>'+E(r.description||'')+'</p></div><div class="pst-tss-coverage"><b>'+count+'/'+min+'</b><small>RFQ-ready</small></div></header><div class="pst-tss-badges">'+reqBadges(r)+'</div><div class="pst-tss-statusline"><span class="'+(need?'warn':'ok')+'">'+(need?'Mbulimi nuk mjafton — duhet discovery / verifikim':'Mbulimi minimal është arritur')+'</span>'+(need?'<button type="button" data-tss-discover="'+E(r.id)+'">Gjej furnitorë</button>':'')+'</div>'+discoveryNote+'<div class="pst-tss-categories">'+listBlock('RFQ-ready','ready',ready,r,data.project_id,'Asnjë furnitor nuk ka evidencën e plotë për këtë kërkesë.')+listBlock('Për verifikim','review',review,r,data.project_id,'Nuk ka kandidatë për verifikim.')+listBlock('Jo i përshtatshëm','conflict',bad,r,data.project_id,'Nuk ka konflikte të dokumentuara.')+'</div></article>';
}
function workflowHtml(w){
 w=w||{};return '<div class="pst-tss-workflow"><div><b>'+Number(w.rfq_prepared||0)+'</b><span>RFQ të përgatitura</span></div><div><b>'+Number(w.rfq_sent||0)+'</b><span>të dërguara</span></div><div><b>'+Number(w.replies||0)+'</b><span>përgjigje</span></div><div><b>'+Number(w.offers_received||0)+'</b><span>oferta të lidhura</span></div></div>';
}
function render(data){
 var p=host();if(!p)return false;state.byTender[S(data.tender_id)]=data;
 var req=A(data.requirements),source=data.requirement_source==='canonical_bom'?'BOM kanonik + kërkesat e tenderit':'Analiza e dosjes';
 p.setAttribute('data-tender-id',S(data.tender_id));
 p.innerHTML='<div class="pst-tss-head"><div><span>FURNIZIMI / RFQ</span><h3>Supplier Intelligence</h3><p>'+E(source)+' · discovery vetëm kur RFQ-ready &lt; 3</p></div><b class="pst-tss-policy">ANALIZË · PA DËRGIM</b></div>'+workflowHtml(data.workflow)+'<div class="pst-tss-global"><span>EN 10204 dhe certifikatat verifikohen si evidencë</span><span>Supplier selection mbetet vendim njerëzor</span><span>Discovery: Kosovë → rajon → Turqi → Greqi → BE</span></div><div class="pst-tss-reqs">'+(req.length?req.map(function(r){return requirementHtml(r,data);}).join(''):'<div class="pst-tss-empty">Nuk u gjetën ende kërkesa furnizimi të strukturuara.</div>')+'</div><div class="pst-tss-foot">PPPP nuk e zgjedh furnitorin, nuk dërgon RFQ dhe nuk krijon angazhim. Kandidatët e discovery mbeten “Për verifikim” derisa evidenca të jetë e plotë.</div>';
 return true;
}
function mergeOne(oldData,newData,id){
 if(!oldData||!newData)return newData||oldData;
 var incoming=A(newData.requirements)[0];if(!incoming)return oldData;
 var req=A(oldData.requirements).map(function(r){return S(r.id)===S(id)?incoming:r;});
 return Object.assign({},oldData,newData,{requirements:req,summary:Object.assign({},oldData.summary,newData.summary,{requirements:req.length,external_search_executed:true})});
}
async function load(id,discover,only){
 id=S(id);if(!id||state.busy[id])return false;state.busy[id]=true;var p=host();if(p)p.classList.add('busy');
 try{
   var data=await edge({tender_id:id,discover:discover===true,requirement_id:only||undefined});
   if(only&&state.byTender[id])data=mergeOne(state.byTender[id],data,only);
   render(data);return data;
 }catch(e){
   if(p)p.innerHTML='<div class="pst-tss-error"><b>Supplier Intelligence nuk u ngarkua.</b><span>'+E(e&&e.message||e)+'</span><button type="button" data-tss-retry="'+E(id)+'">Provo përsëri</button></div>';
   return false;
 }finally{state.busy[id]=false;if(p)p.classList.remove('busy');}
}
async function maybeMount(id){
 id=S(id);if(!id)return false;
 try{
   var rows=A(await db('kek_tender_watch?id=eq.'+encodeURIComponent(id)+'&select=id,payload&limit=1')),r=rows[0],p=r&&r.payload||{},d=p.dossier_analysis||{},ready=S(p.dossier_analysis_status)==='ready'||!!(d.analysis&&d.analysis.coverage&&d.analysis.coverage.complete===true)||d.dossier_complete===true;
   if(!ready)return false;
   return await load(id,false,'');
 }catch(e){return false;}
}
function reqById(tenderId,reqId){return A(state.byTender[tenderId]&&state.byTender[tenderId].requirements).find(function(r){return S(r.id)===S(reqId);})||null;}
function draftBody(data,req,name){
 var lines=['Dear '+(name||'Sales Team')+',','','PriSteel is requesting a quotation for the following material for an active tender in Kosovo:','',req.label||req.description||'Steel material'];
 if(req.description&&req.description!==req.label)lines.push(req.description);
 if(A(req.grades).length)lines.push('Grade: '+A(req.grades).join(', '));
 if(A(req.standards).length)lines.push('Standards / material certificates: '+A(req.standards).join(', '));
 if(A(req.certifications).length)lines.push('Manufacturer certification: '+A(req.certifications).join(', '));
 if(req.delivery_terms)lines.push('Delivery: '+req.delivery_terms+' Kosovo');
 lines.push('','Please confirm:','- unit / total price and Incoterm','- availability and lead time','- exact dimensional capability','- material certificate / test report compliance','- manufacturer ISO certification','- country of origin','- payment terms','', 'Please quote only if the requested technical requirements can be met.','', 'Kind regards,','PriSteel');
 return lines.join('\n');
}
async function gmailDraft(email,name,reqId){
 var panel=document.getElementById('pst-tender-supplier-sourcing'),tid=S(panel&&panel.getAttribute('data-tender-id')),data=state.byTender[tid],req=reqById(tid,reqId);if(!data||!req||!email)return false;
 var subject='RFQ – '+S(req.label||'Steel material')+' | PriSteel',body=draftBody(data,req,name),mode='firm';
 try{
   var gate=await supplierGate(tid,name||email,email,mode);
   if(!gate||gate.allowed!==true){alert('RFQ u bllokua nga Supplier Gate: '+S(gate&&gate.reason||'nuk lejohet')+'\n\n'+S(gate&&gate.relationship_guidance||''));return false;}
   if(gate.warning&&!window.confirm('Supplier Gate paralajmëron: '+S(gate.warning)+'\n\n'+S(gate.relationship_guidance||'')+'\n\nTë vazhdojmë me këtë RFQ?'))return false;
   await registerTenderRfq(tid,email,name,subject,body,gate);
   var url='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(email)+'&su='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
   window.open(url,'_blank','noopener');return true;
 }catch(err){alert('Supplier Gate / RFQ registration dështoi: '+S(err&&err.message||err));return false;}
}
function click(e){
 var d=e.target&&e.target.closest?e.target.closest('[data-tss-discover]'):null;if(d){e.preventDefault();var panel=document.getElementById('pst-tender-supplier-sourcing'),tid=S(panel&&panel.getAttribute('data-tender-id'));load(tid,true,d.getAttribute('data-tss-discover'));return;}
 var retry=e.target&&e.target.closest?e.target.closest('[data-tss-retry]'):null;if(retry){e.preventDefault();load(retry.getAttribute('data-tss-retry'),false,'');return;}
 var draft=e.target&&e.target.closest?e.target.closest('[data-tss-draft]'):null;if(draft){e.preventDefault();draft.disabled=true;Promise.resolve(gmailDraft(draft.getAttribute('data-email'),draft.getAttribute('data-name'),draft.getAttribute('data-req'))).finally(function(){draft.disabled=false;});return;}
 var tender=e.target&&e.target.closest?e.target.closest('[data-pcw-tender]'):null;if(tender){var id=tender.getAttribute('data-pcw-tender');setTimeout(function(){maybeMount(id);},140);}
}
function css(){
 if(document.getElementById('pst-tss-css'))return;var s=document.createElement('style');s.id='pst-tss-css';s.textContent=`
#pst-tender-supplier-sourcing{margin:14px 0;padding:16px;border:1px solid #d8e2e6;border-radius:16px;background:#fbfdfd;color:#29434c}
.pst-tss-loading,.pst-tss-error,.pst-tss-empty{padding:16px;border:1px dashed #b8cbd2;border-radius:12px;background:#fff;font-size:11px}
.pst-tss-error{display:grid;gap:7px}.pst-tss-error button{justify-self:start}
.pst-tss-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}.pst-tss-head span{font-size:9px;font-weight:900;letter-spacing:.14em;color:#4c8294}.pst-tss-head h3{margin:3px 0 2px;font-size:16px}.pst-tss-head p{margin:0;font-size:10px;color:#70868e}.pst-tss-policy{font-size:9px;border:1px solid #b8cbd2;border-radius:999px;padding:7px 9px;background:#fff;color:#54717b;white-space:nowrap}
.pst-tss-workflow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}.pst-tss-workflow>div{padding:10px;border:1px solid #e1e8eb;border-radius:11px;background:#fff}.pst-tss-workflow b{display:block;font-size:15px}.pst-tss-workflow span{font-size:9px;color:#6d8189}
.pst-tss-global{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.pst-tss-global span,.pst-tss-badges span{font-size:9px;border:1px solid #d6e1e5;background:#fff;border-radius:999px;padding:5px 7px;color:#56727c}
.pst-tss-reqs{display:grid;gap:12px}.pst-tss-req{border:1px solid #dbe5e8;border-radius:14px;background:#fff;padding:13px}.pst-tss-req.needs{border-left:4px solid #c99a3e}.pst-tss-req.covered{border-left:4px solid #6f9f85}.pst-tss-req>header{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.pst-tss-req>header span{font-size:8px;letter-spacing:.12em;font-weight:900;color:#79909a}.pst-tss-req h4{margin:3px 0;font-size:13px}.pst-tss-req p{margin:0;font-size:9px;line-height:1.45;color:#71858d;max-width:680px}
.pst-tss-coverage{min-width:70px;text-align:center;border:1px solid #dce5e8;border-radius:12px;padding:8px;background:#f9fbfb}.pst-tss-coverage b{display:block;font-size:17px}.pst-tss-coverage small{font-size:8px;color:#71858d}
.pst-tss-badges{display:flex;gap:5px;flex-wrap:wrap;margin:9px 0}.pst-tss-statusline{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 9px;border-radius:10px;background:#f7fafb}.pst-tss-statusline span{font-size:9px;font-weight:800}.pst-tss-statusline .warn{color:#8b6424}.pst-tss-statusline .ok{color:#47765e}.pst-tss-statusline button,.pst-tss-c-actions button,.pst-tss-error button{border:1px solid #7ca8b7;background:#edf6f8;color:#356f82;border-radius:9px;padding:7px 9px;font-size:9px;font-weight:850;cursor:pointer}.pst-tss-statusline button:disabled{opacity:.6;cursor:wait}.pst-tss-discovery-note{display:block;margin:7px 2px;color:#71858d;font-size:9px}
.pst-tss-categories{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:9px}.pst-tss-list{border:1px solid #e0e7ea;border-radius:10px;background:#fcfdfd;overflow:hidden}.pst-tss-list summary{display:flex;justify-content:space-between;gap:8px;padding:9px 10px;cursor:pointer;font-size:9px;font-weight:850}.pst-tss-list summary b{border-radius:999px;padding:2px 6px;background:#edf3f5}.pst-tss-list>div{padding:0 8px 8px}.pst-tss-list>div>p{padding:8px;margin:0;font-size:9px;color:#87969b}.pst-tss-list.ready summary{color:#47765e}.pst-tss-list.review summary{color:#8b6424}.pst-tss-list.conflict summary{color:#8a5555}
.pst-tss-candidate{padding:8px 6px;border-top:1px solid #edf1f2;display:grid;gap:5px}.pst-tss-candidate:first-child{border-top:0}.pst-tss-candidate b{font-size:9px}.pst-tss-candidate small{display:block;font-size:8px;color:#758990;margin-top:2px}.pst-tss-evidence{display:flex;gap:4px;flex-wrap:wrap}.pst-tss-evidence span{font-size:7px;border-radius:999px;padding:3px 5px;background:#f0f4f5;color:#63777e}.pst-tss-evidence em{width:100%;font-size:7px;color:#8a6767;font-style:normal}.pst-tss-c-actions{display:flex;gap:5px;flex-wrap:wrap}.pst-tss-c-actions a,.pst-tss-c-actions button{font-size:7px;text-decoration:none}.pst-tss-c-actions a{color:#39788e;border-bottom:1px dotted #7ca8b7}.pst-tss-more{display:block;padding:6px;font-size:8px;color:#7b8c92}.pst-tss-foot{margin-top:11px;padding-top:9px;border-top:1px solid #e0e8ea;font-size:8px;color:#72858c;line-height:1.5}
#pst-tender-supplier-sourcing.busy{opacity:.72;pointer-events:none}
@media(max-width:900px){.pst-tss-categories{grid-template-columns:1fr}.pst-tss-workflow{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;document.head.appendChild(s);
}
document.addEventListener('pst:tender-dossier-ready',function(e){var d=e&&e.detail||{};if(d.analysis_ready===true&&d.dossier_complete!==false&&d.tender_id)load(d.tender_id,false,'');});
document.addEventListener('click',click);
window.PSTTenderSupplierSourcingV1={load:load,maybeMount:maybeMount,render:render,_state:state};
})();
