/* PRISTEEL stable universal search v2
 * Supersedes the legacy command-center modal entry points without changing data.
 * Key stability properties:
 * - no preload on modal open
 * - every optional Supabase source has a bounded wait
 * - partial results are allowed when a source is unavailable
 * - close / Escape stay synchronous and independent of network work
 * - no observers, polling, writes, auth overrides or project-open overrides
 */
(function(){
'use strict';
if(window.__pstSearchStableV2)return;
window.__pstSearchStableV2=true;

var CACHE_MS=5*60*1000;
var WAIT_MS=2800;
var state={loadedAt:0,loading:null,data:null,projects:{},links:{},contactProjects:{},query:'',scope:'all',results:[],debounce:null,timedOut:0,failed:0};
var ICON={
 search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>',
 close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
 project:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="2"></rect><path d="M8 6V4h8v2"></path></svg>',
 mail:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>',
 file:'<svg viewBox="0 0 24 24"><path d="M6 2h9l4 4v16H6z"></path><path d="M15 2v5h4"></path></svg>',
 contact:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3 20c0-4 2.5-7 6-7s6 3 6 7M16 8h5M18.5 5.5v5"></path></svg>',
 arrow:'<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>'
};
var FALLBACK_SYN={
 rfq:['rfq','request for quotation','request for quote','quotation request','kerkese per oferte','angebotsanfrage','preisanfrage'],
 offer:['offer','quotation','quote','proposal','oferte','oferta','angebot','angebote','preisangebot'],
 request:['request','requirement','inquiry','enquiry','kerkese','anfrage'],
 bom:['bom','bill of materials','stuckliste','stueckliste','materialliste','liste materialesh'],
 transport:['transport','freight','shipping','delivery','lieferung','versand','fracht','logistics'],
 assembly:['montim','montage','installation','erection','assembly'],
 contract:['kontrate','contract','agreement','vertrag'],
 invoice:['fature','invoice','rechnung'],
 price:['cmim','price','preis','cost','kosten','pricing'],
 deadline:['afat','deadline','lieferzeit','lead time','termin']
};
function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function norm(v){return String(v==null?'':v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9@._+\-]+/g,' ').replace(/\s+/g,' ').trim();}
function one(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==null&&v!==undefined&&String(v).trim()!=='')return v;}return'';}
function list(v){if(Array.isArray(v))return v.join(' ');if(v&&typeof v==='object')try{return JSON.stringify(v);}catch(e){return'';}return String(v||'');}
function flat(row){if(!row||typeof row!=='object')return norm(row);return norm(Object.keys(row).map(function(k){return list(row[k]);}).join(' '));}
function email(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function short(v,n){var s=String(v||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).trim()+'…':s;}
function date(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'';}
function addMap(map,key,val){key=String(key||'');val=String(val||'');if(!key||!val)return;if(!map[key])map[key]=[];if(map[key].indexOf(val)<0)map[key].push(val);}
function projectName(id){var p=state.projects[String(id||'')];return p?one(p.name,p.client,p.ref,'Projekt'):'';}
function keys(row){return[row&&row.gmail_message_id,row&&row.gmail_thread_id].filter(Boolean).map(String);}
function deepDecorate(){setTimeout(function(){try{if(window.PSTBusinessCommandCenterDeepGmail&&typeof window.PSTBusinessCommandCenterDeepGmail.decorate==='function')window.PSTBusinessCommandCenterDeepGmail.decorate();}catch(e){}},0);}

function timed(path){
 if(typeof window.supaFetch!=='function')return Promise.resolve([]);
 var finished=false;
 return new Promise(function(resolve){
   var timer=setTimeout(function(){if(finished)return;finished=true;state.timedOut++;resolve([]);},WAIT_MS);
   Promise.resolve().then(function(){return window.supaFetch(path);}).then(function(rows){if(finished)return;finished=true;clearTimeout(timer);resolve(arr(rows));}).catch(function(){if(finished)return;finished=true;clearTimeout(timer);state.failed++;resolve([]);});
 });
}
function sources(){return[
 ['projects','projects?select=*&limit=1200'],
 ['emails','project_emails?select=*&limit=2200'],
 ['links','project_email_links?select=gmail_message_id,gmail_thread_id,project_id&limit=3500'],
 ['contacts','contacts?select=*&limit=1500'],
 ['projectContacts','project_contacts?select=*&limit=2500'],
 ['documents_registry','documents_registry?select=*&limit=1800'],
 ['project_docs','project_docs?select=*&limit=1500'],
 ['project_attachment_links','project_attachment_links?select=*&limit=1600'],
 ['offers_inbox','offers_inbox?select=*&limit=1200'],
 ['rfq_log','rfq_log?select=*&limit=1500'],
 ['offers','offers?select=*&limit=1500'],
 ['invoices_out','invoices_out?select=*&limit=1200'],
 ['invoices_in','invoices_in?select=*&limit=1200'],
 ['bom_items','bom_items?select=*&limit=2000'],
 ['commercial_adjustments','commercial_adjustments?select=*&limit=1000']
 ];}
function loadIndex(force){
 if(!force&&state.data&&Date.now()-state.loadedAt<CACHE_MS)return Promise.resolve(state.data);
 if(state.loading)return state.loading;
 state.timedOut=0;state.failed=0;
 var defs=sources();
 state.loading=Promise.all(defs.map(function(def){return timed(def[1]).then(function(rows){return{name:def[0],rows:rows};});})).then(function(parts){
   var data={projects:[],emails:[],links:[],contacts:[],projectContacts:[],documents:[]};
   var docs=[];
   parts.forEach(function(part){
     if(part.name==='projects'||part.name==='emails'||part.name==='links'||part.name==='contacts'||part.name==='projectContacts')data[part.name]=part.rows;
     else part.rows.forEach(function(row){docs.push(Object.assign({},row,{__search_source:part.name}));});
   });
   data.documents=docs;
   state.projects={};data.projects.forEach(function(p){if(p&&p.id!=null)state.projects[String(p.id)]=p;});
   state.links={};data.links.forEach(function(x){keys(x).forEach(function(k){addMap(state.links,k,x.project_id);});});
   state.contactProjects={};data.projectContacts.forEach(function(c){var e=email(c&&c.email);if(e)addMap(state.contactProjects,e,c.project_id);});
   state.data=data;state.loadedAt=Date.now();state.loading=null;return data;
 }).catch(function(){state.loading=null;state.data={projects:[],emails:[],links:[],contacts:[],projectContacts:[],documents:[]};return state.data;});
 return state.loading;
}
function groups(query){
 try{if(window.PSTBusinessCommandCenterV1&&typeof window.PSTBusinessCommandCenterV1.tokenGroups==='function')return window.PSTBusinessCommandCenterV1.tokenGroups(query);}catch(e){}
 var tokens=norm(query).split(' ').filter(function(x){return x.length>1;});
 return tokens.map(function(t){if(FALLBACK_SYN[t])return FALLBACK_SYN[t];var ks=Object.keys(FALLBACK_SYN);for(var i=0;i<ks.length;i++)if(FALLBACK_SYN[ks[i]].some(function(v){return norm(v)===t;}))return FALLBACK_SYN[ks[i]];return[t];});
}
function score(query,row,extra){var q=norm(query),text=flat(row)+' '+norm(extra||''),gs=groups(query);if(!q||!gs.length)return 0;var matched=0;gs.forEach(function(g){if(g.some(function(term){return text.indexOf(norm(term))>-1;}))matched++;});var min=gs.length<=2?gs.length:Math.ceil(gs.length*.6);if(matched<min)return 0;var s=matched*20;if(text.indexOf(q)>-1)s+=70;return s;}
function result(type,row,s,opt){opt=opt||{};return{type:type,row:row,score:s,title:opt.title||'Pa titull',meta:opt.meta||'',excerpt:opt.excerpt||'',projectId:String(opt.projectId||''),url:opt.url||'',email:opt.email||'',date:opt.date||''};}
function projectResults(q){return state.data.projects.map(function(p){var s=score(q,p);if(!s)return null;return result('project',p,s,{title:one(p.name,p.ref,'Projekt'),meta:[one(p.client,p.customer),p.ref].filter(Boolean).join(' · '),excerpt:[one(p.pipeline_stage,p.status),p.deadline?'Afati '+date(p.deadline):''].filter(Boolean).join(' · '),projectId:p.id,date:one(p.updated_at,p.created_at)});}).filter(Boolean);}
function emailPids(m){var out=[];if(m&&m.project_id)out.push(String(m.project_id));keys(m).forEach(function(k){arr(state.links[k]).forEach(function(id){id=String(id);if(out.indexOf(id)<0)out.push(id);});});return out;}
function emailResults(q){return state.data.emails.map(function(m){var pids=emailPids(m),pnames=pids.map(projectName).filter(Boolean).join(' '),s=score(q,m,pnames);if(!s)return null;var url=one(m.gmail_url,m.gmail_thread_id?'https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(m.gmail_thread_id):'');return result('email',m,s,{title:one(m.subject,'(pa subjekt)'),meta:[one(m.from_name,m.from_email),date(m.sent_at),pnames||'Pa projekt'].filter(Boolean).join(' · '),excerpt:short(one(m.snippet,m.body_text,m.body,m.text),220),projectId:pids[0]||'',url:url,date:m.sent_at});}).filter(Boolean);}
function contactRows(){var map={};state.data.contacts.concat(state.data.projectContacts).forEach(function(c){var e=email(c&&c.email),k=e||String(one(c&&c.id,c&&c.name,c&&c.person,c&&c.company));if(!k)return;if(!map[k])map[k]={};Object.keys(c||{}).forEach(function(f){if(c[f]!=null&&String(c[f]).trim()!=='')map[k][f]=c[f];});if(e)map[k].email=e;});return Object.keys(map).map(function(k){return map[k];});}
function contactResults(q){return contactRows().map(function(c){var e=email(c.email),pids=arr(state.contactProjects[e]),pnames=pids.map(projectName).filter(Boolean).join(' '),s=score(q,c,pnames);if(!s)return null;return result('contact',c,s,{title:one(c.person,c.name,c.full_name,[c.first_name,c.last_name].filter(Boolean).join(' '),e,'Kontakt'),meta:[one(c.company,c.company_name,c.organization),one(c.role,c.job_title,c.position)].filter(Boolean).join(' · '),excerpt:[e,one(c.phone,c.mobile,c.telephone),pnames].filter(Boolean).join(' · '),projectId:pids[0]||'',email:e,date:one(c.updated_at,c.created_at)});}).filter(Boolean);}
function docPid(d){return String(one(d&&d.project_id,d&&d.source_project_id,d&&d.linked_project_id,''));}
function docUrl(d){return one(d&&d.drive_url,d&&d.webViewLink,d&&d.web_view_link,d&&d.file_url,d&&d.url,d&&d.download_url,d&&d.view_url,'');}
function kind(d){return({documents_registry:'Dokument',project_docs:'Skedar projekti',project_attachment_links:'Bashkëngjitje',offers_inbox:'Ofertë furnitori',rfq_log:'RFQ',offers:'Ofertë',invoices_out:'Faturë dalje',invoices_in:'Faturë hyrje',bom_items:'BOM',commercial_adjustments:'Rregullim komercial'})[d.__search_source]||'Dokument';}
function documentResults(q){return state.data.documents.map(function(d){var pid=docPid(d),pn=projectName(pid),k=kind(d),s=score(q,d,pn+' '+k);if(!s)return null;return result('document',d,s,{title:one(d.title,d.name,d.file_name,d.filename,d.document_name,d.subject,d.doc_nr,d.document_nr,d.invoice_nr,d.rfq_ref,d.request_ref,d.reference,d.supplier,d.supplier_name,k),meta:[k,one(d.doc_nr,d.document_nr,d.invoice_nr,d.rfq_ref,d.request_ref,d.ref,d.reference),pn||one(d.project,d.project_name),one(d.client,d.customer,d.supplier,d.supplier_name)].filter(Boolean).join(' · '),excerpt:short(one(d.description,d.notes,d.subject,d.snippet,d.item_description,d.item_name,d.position),200),projectId:pid,url:docUrl(d),date:one(d.created_at,d.updated_at,d.date,d.sent_at)});}).filter(Boolean);}
function searchNow(q,scope){if(!state.data)return[];var out=[];if(scope==='all'||scope==='project')out=out.concat(projectResults(q));if(scope==='all'||scope==='email')out=out.concat(emailResults(q));if(scope==='all'||scope==='document')out=out.concat(documentResults(q));if(scope==='all'||scope==='contact')out=out.concat(contactResults(q));out.sort(function(a,b){return b.score-a.score||String(b.date||'').localeCompare(String(a.date||''));});return out.slice(0,60);}
function label(t){return t==='project'?'Projekt':t==='email'?'Email':t==='document'?'Dokument':'Kontakt';}
function icon(t){return t==='project'?ICON.project:t==='email'?ICON.mail:t==='document'?ICON.file:ICON.contact;}
function projectButton(r,i){return r.projectId&&r.type!=='project'?'<button type="button" class="pst-bcc-result-secondary" data-action="project" data-index="'+i+'">Projekti</button>':'';}
function resultHtml(r,i){var action=r.type==='project'?'Hap projektin':r.type==='email'?'Hap emailin':r.type==='document'?(r.url?'Hap dokumentin':r.projectId?'Hap projektin':'Shiko'):(r.projectId?'Hap projektin':'Kontaktet');return'<article class="pst-bcc-result" data-index="'+i+'"><div class="pst-bcc-result-icon '+esc(r.type)+'">'+icon(r.type)+'</div><div class="pst-bcc-result-main"><div class="pst-bcc-result-top"><span class="pst-bcc-result-type">'+label(r.type)+'</span>'+(r.projectId?'<span class="pst-bcc-result-project">'+esc(projectName(r.projectId))+'</span>':'')+'</div><h3>'+esc(r.title)+'</h3>'+(r.meta?'<p>'+esc(r.meta)+'</p>':'')+(r.excerpt?'<div class="pst-bcc-result-excerpt">'+esc(r.excerpt)+'</div>':'')+'</div><div class="pst-bcc-result-actions"><button type="button" class="pst-bcc-result-open" data-action="open" data-index="'+i+'">'+action+ICON.arrow+'</button>'+projectButton(r,i)+'</div></article>';}
function host(){return document.getElementById('pst-bcc-results');}
function intro(){var h=host();if(h)h.innerHTML='<div class="pst-bcc-intro"><div class="pst-bcc-intro-icon">'+ICON.search+'</div><h3>Kërko në gjithë biznesin</h3><p>Shkruaj të paktën dy karaktere. Të dhënat ngarkohen vetëm pasi fillon kërkimin.</p><div class="pst-bcc-examples"><button type="button" data-example="RFQ Geiger">RFQ Geiger</button><button type="button" data-example="kerkese per oferte">kërkesë për ofertë</button><button type="button" data-example="bank guarantee">bank guarantee</button><button type="button" data-example="transporti ne cmim">transporti në çmim</button></div></div>';}
function loading(){var h=host();if(h)h.innerHTML='<div class="pst-bcc-state"><span class="pst-bcc-spinner"></span><b>Po ngarkohen burimet e kërkimit…</b><span style="margin-top:6px;font-size:9px">Kjo pritje është e kufizuar. Mund ta mbyllësh dritaren në çdo moment.</span></div>';}
function render(){var h=host();if(!h)return;if(!state.query.trim()){intro();return;}state.results=searchNow(state.query,state.scope);if(!state.results.length){h.innerHTML='<div class="pst-bcc-empty"><b>Nuk u gjet rezultat për “'+esc(state.query)+'”.</b><span>Provo një formulim më të shkurtër ose kërkimin e thellë në Gmail.</span></div>';return;}var warning=(state.timedOut||state.failed)?'<span>Disa burime nuk u përgjigjën · rezultatet janë parciale</span>':'';h.innerHTML='<div class="pst-bcc-counts"><span><b>'+state.results.length+'</b> rezultate</span>'+warning+'</div>'+state.results.map(resultHtml).join('');}
function runSearch(){clearTimeout(state.debounce);state.debounce=setTimeout(function(){var input=document.getElementById('pst-bcc-input');state.query=String(input&&input.value||'').trim();if(state.query.length<2){intro();return;}loading();loadIndex(false).then(function(){if(document.getElementById('pst-bcc'))render();});},180);}
function close(){var m=document.getElementById('pst-bcc');if(m)m.remove();document.body.classList.remove('pst-bcc-open');}
function perform(r,action){if(!r)return;if(action==='project'||(action==='open'&&r.type==='project')||(action==='open'&&r.type==='document'&&!r.url&&r.projectId)||(action==='open'&&r.type==='contact'&&r.projectId)){close();if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(r.projectId);else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('projects');return;}if(action==='open'&&r.type==='email'&&r.url){window.open(r.url,'PRISTEEL_GMAIL');return;}if(action==='open'&&r.type==='document'&&r.url){window.open(r.url,'_blank','noopener');return;}if(r.projectId){close();if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(r.projectId);}}
function open(initial){
 close();var el=document.createElement('div');el.id='pst-bcc';el.className='pst-bcc-bg';
 el.innerHTML='<section class="pst-bcc-modal" role="dialog" aria-modal="true" aria-labelledby="pst-bcc-title"><header class="pst-bcc-head"><div><span class="pst-bcc-eyebrow">PRISTEEL Search</span><h2 id="pst-bcc-title">Kërko në gjithë biznesin</h2><p>Kërkimi nuk bllokon platformën dhe nuk ndryshon të dhëna.</p></div><button type="button" class="pst-bcc-close" aria-label="Mbyll">'+ICON.close+'</button></header><div class="pst-bcc-searchbox">'+ICON.search+'<input id="pst-bcc-input" autocomplete="off" spellcheck="false" placeholder="Kërko projekt, email, RFQ, ofertë, kërkesë ose referencë…"><kbd>Esc</kbd></div><nav class="pst-bcc-scopes"><button class="pst-bcc-scope active" data-scope="all">Të gjitha</button><button class="pst-bcc-scope" data-scope="email">Emaila</button><button class="pst-bcc-scope" data-scope="project">Projekte</button><button class="pst-bcc-scope" data-scope="document">Dokumente</button><button class="pst-bcc-scope" data-scope="contact">Kontakte</button></nav><main id="pst-bcc-results" class="pst-bcc-results"></main><footer class="pst-bcc-foot"><span>Vetëm lexim · burimet kanë timeout</span><span><kbd>Ctrl</kbd> + <kbd>K</kbd></span></footer></section>';
 document.body.appendChild(el);document.body.classList.add('pst-bcc-open');var input=document.getElementById('pst-bcc-input');input.value=typeof initial==='string'?initial:'';state.query=input.value;state.scope='all';intro();
 el.querySelector('.pst-bcc-close').onclick=close;input.oninput=runSearch;input.onkeydown=function(e){if(e.key==='Enter'&&state.results[0]){e.preventDefault();perform(state.results[0],'open');}};
 el.addEventListener('click',function(e){if(e.target===el){close();return;}var sc=e.target.closest&&e.target.closest('.pst-bcc-scope');if(sc){state.scope=sc.getAttribute('data-scope')||'all';el.querySelectorAll('.pst-bcc-scope').forEach(function(b){b.classList.toggle('active',b===sc);});runSearch();return;}var ex=e.target.closest&&e.target.closest('[data-example]');if(ex){input.value=ex.getAttribute('data-example')||'';runSearch();input.focus();return;}var a=e.target.closest&&e.target.closest('[data-action]');if(a){e.preventDefault();e.stopPropagation();perform(state.results[Number(a.getAttribute('data-index'))],a.getAttribute('data-action'));return;}var row=e.target.closest&&e.target.closest('.pst-bcc-result');if(row)perform(state.results[Number(row.getAttribute('data-index'))],'open');});
 setTimeout(function(){input.focus();if(input.value)runSearch();deepDecorate();},20);
}
function captureOpen(e){var t=e.target&&e.target.closest?e.target.closest('#pst-bcc-home-search,.pst-bcc-sidebar-search,[onclick*="openCmdK"],[onclick*="pstWsSearch"]'):null;if(!t)return;e.preventDefault();e.stopImmediatePropagation();open('');}
document.addEventListener('click',captureOpen,true);
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&String(e.key||'').toLowerCase()==='k'){e.preventDefault();e.stopImmediatePropagation();open('');return;}if(e.key==='Escape'&&document.getElementById('pst-bcc')){e.preventDefault();e.stopImmediatePropagation();close();}},true);
window.openCmdK=open;
window.PSTSearchStableV2={open:open,close:close,loadIndex:loadIndex,search:function(q,scope){return loadIndex(false).then(function(){return searchNow(q,scope||'all');});},searchNow:searchNow,_state:state};
})();
