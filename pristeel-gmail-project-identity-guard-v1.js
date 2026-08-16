/* PRISTEEL Gmail project identity guard v1
 * Project/RFQ identity is authoritative; company/contact/domain are supporting evidence only.
 * - Strong project refs/business refs/identity aliases and unique project-name anchors/phrases may auto-suggest.
 * - Existing verified thread continuity is allowed only when no contradictory project identity appears.
 * - Mixed/multi-RFQ threads are never normalized automatically to one project.
 * - Unknown strong refs (for example ANF-8910 when only ANF-8915 exists) block automatic linking.
 * - Cross-thread collector auto-selects only rows that identify the current project specifically.
 * No polling, no MutationObserver, no relation writes, no OAuth popup.
 */
(function(){
'use strict';
if(window.__pstGmailProjectIdentityGuardV1)return;
window.__pstGmailProjectIdentityGuardV1=true;

var STOP={
  project:1,projekti:1,projekt:1,client:1,customer:1,steel:1,stahl:1,construction:1,konstruktion:1,konstrukcija:1,konstrukcije:1,
  offer:1,offerte:1,ponuda:1,ponude:1,ponudu:1,angebot:1,anfrage:1,request:1,kerkese:1,kerkes:1,fertigung:1,produktion:1,
  italian:1,style:1,stacon:1,evosys:1,laser:1,roleff:1,gmbh:1,shpk:1,doo:1,restoran:1,restaurant:1,
  schweissgestell:1,schweissbaugruppen:1,schweissbaugruppe:1,porosi:1,porosia:1,konfirmuar:1,confirmed:1,
  fwd:1,forwarded:1,nachfrage:1,dokument:1,dokumente:1,dokumentacion:1,celicne:1,celicna:1,konstrukciju:1
};
var projectCache=null,projectCacheAt=0,collectorProjectId='',intakeSeq=0;

function arr(v){return Array.isArray(v)?v:[];}
function uniq(v){var m={};return arr(v).map(function(x){return String(x||'').trim();}).filter(function(x){if(!x||m[x])return false;m[x]=1;return true;});}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function compact(v){return norm(v).replace(/\s+/g,'');}
function canonicalRefKey(v){var k=compact(v);return k.replace(/^anf0+(\d{4})$/,'anf$1');}
function identityCompact(v){return compact(v).replace(/anf0+(\d{4})/g,'anf$1');}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function words(v){return norm(v).split(' ').filter(function(x){return x.length>=5&&!STOP[x];});}
function phraseWords(v){return norm(v).split(' ').filter(function(x){return x.length>=4&&!STOP[x];});}
function semanticPhrases(p){
  var client={};phraseWords(p&&p.client||'').forEach(function(x){client[x]=1;});
  var xs=phraseWords(p&&p.name||'').filter(function(x){return !client[x];}),out=[];
  for(var i=0;i<xs.length-1;i++){var phrase=xs[i]+' '+xs[i+1];if(compact(phrase).length>=8)out.push(phrase);}
  return uniq(out);
}
function safe(path){if(typeof window.supaFetch!=='function')return Promise.resolve([]);return Promise.resolve(window.supaFetch(path)).then(arr).catch(function(e){console.warn('PRISTEEL identity guard optional read:',e&&e.message);return[];});}

function referenceKeys(v){
  var raw=String(v||''),out=[];
  function add(x){var k=canonicalRefKey(x);if(k.length>=4&&out.indexOf(k)<0)out.push(k);}
  (raw.match(/\b[A-Za-z]{2,}[A-Za-z0-9]*[\s._\/-]*\d{2,}\b/g)||[]).forEach(add);
  (raw.match(/\b[A-Za-z]{2,}[\s._\/-]*[A-Za-z]\d{3,}\b/g)||[]).forEach(add);
  (raw.match(/\bD[\s._\/-]*\d{2}[\s._\/-]*\d{2}\b/gi)||[]).forEach(add);
  (raw.match(/\b\d{5,6}[A-Za-z]{2,4}\b/g)||[]).forEach(add);
  (raw.match(/\b\d{6}[\s._\/-]*[A-Za-z]{2,4}\b/g)||[]).forEach(add);
  (raw.match(/\b\d{6}\b/g)||[]).forEach(add);
  return out;
}
function looksLikeExternalProjectRef(k){return /^(anf\d{4,6}|esw\d{3,}|robmc\d{4,}|d\d{4}|\d{5,6}[a-z]{2,4}|\d{6}[a-z]{2,4}|\d{6})$/.test(String(k||''));}
function projectClientWords(p){var m={};words(p&&p.client||'').forEach(function(x){m[x]=1;});return m;}
function buildIndex(projects){
  projects=arr(projects);var occurrence={},phraseOccurrence={};
  projects.forEach(function(p){var cw=projectClientWords(p);uniq(words(p&&p.name||'')).forEach(function(t){if(!cw[t]&&t.length>=7)occurrence[t]=(occurrence[t]||0)+1;});semanticPhrases(p).forEach(function(ph){var k=compact(ph);phraseOccurrence[k]=(phraseOccurrence[k]||0)+1;});});
  var byId={},knownRef={};
  var items=projects.map(function(p){
    var anchors=[],seen={};
    function add(value,kind,label){var k=(kind==='semantic'||kind==='semantic_phrase')?compact(value):canonicalRefKey(value);if(k.length<4||seen[k])return;seen[k]=1;anchors.push({key:k,kind:kind,label:String(label||value||k)});if(kind!=='semantic'&&kind!=='semantic_phrase')knownRef[k]=1;}
    if(p&&p.ref)add(p.ref,'ref',p.ref);
    if(p&&p.business_ref)add(p.business_ref,'business_ref',p.business_ref);
    arr(p&&p.identity_aliases).forEach(function(alias){var refs=referenceKeys(alias);if(refs.length)refs.forEach(function(k){add(k,'business_ref',alias);});else if(norm(alias).length>=8)add(alias,'semantic_phrase',alias);});
    referenceKeys(p&&p.name||'').forEach(function(k){add(k,'name_ref',k);});
    var cw=projectClientWords(p);uniq(words(p&&p.name||'')).forEach(function(t){if(!cw[t]&&t.length>=7&&occurrence[t]===1)add(t,'semantic',t);});
    semanticPhrases(p).forEach(function(ph){if(phraseOccurrence[compact(ph)]===1)add(ph,'semantic_phrase',ph);});
    var item={project:p,anchors:anchors};byId[String(p&&p.id||'')]=item;return item;
  });
  return{items:items,byId:byId,knownRef:knownRef};
}
function hasAnchor(textNorm,textCompact,a,refs){
  if(!a||!a.key)return false;
  if(a.kind==='semantic')return (' '+textNorm+' ').indexOf(' '+a.key+' ')>-1;
  if(a.kind==='semantic_phrase')return (' '+textNorm+' ').indexOf(' '+norm(a.label)+' ')>-1;
  if(arr(refs).indexOf(a.key)>-1)return true;
  var label=norm(a.label);
  return !!label&&(' '+textNorm+' ').indexOf(' '+label+' ')>-1;
}
function classifyCorpus(corpus,index){
  index=index||{items:[],knownRef:{}};var n=norm(corpus),c=identityCompact(corpus),refs=referenceKeys(corpus),hits=[];
  arr(index.items).forEach(function(item){var matched=arr(item.anchors).filter(function(a){return hasAnchor(n,c,a,refs);});if(matched.length)hits.push({project:item.project,anchors:matched});});
  var unknown=refs.filter(function(k){return looksLikeExternalProjectRef(k)&&!index.knownRef[k];});
  return{hits:hits,unknownRefs:uniq(unknown),mixed:hits.length>1||(hits.length>0&&unknown.length>0)||unknown.length>1,corpus:String(corpus||'')};
}
async function projectsIndex(force){
  if(!force&&projectCache&&Date.now()-projectCacheAt<30000)return projectCache;
  var rows=await safe('projects?select=id,name,client,ref,business_ref,identity_aliases,status&order=created_at.desc&limit=2000');
  projectCache=buildIndex(rows);projectCacheAt=Date.now();return projectCache;
}
function parseIntakeTarget(){try{var u=new URL(window.__pstPendingGmailIntakeTarget||location.href,location.href);return{messageId:u.searchParams.get('gmail_message_id')||'',threadId:u.searchParams.get('gmail_thread_id')||'',subject:u.searchParams.get('subject')||''};}catch(e){return{messageId:'',threadId:'',subject:''};}}
function intakeCorpus(root){
  root=root||document.getElementById('pgi2-bg');if(!root)return'';
  var parts=[],mail=root.querySelector('.pgi2-mail b');if(mail)parts.push(mail.textContent||'');
  root.querySelectorAll('.pgi2-file-main b').forEach(function(x){parts.push(x.textContent||'');});
  var t=parseIntakeTarget();if(t.subject)parts.push(t.subject);return parts.join(' ');
}
function systemMail(corpus){var n=norm(corpus);return /delivery status notification|undeliverable|mailer daemon|calendar notification|hubspot notification/.test(n);}
async function linkedIdsForTarget(t){
  var rows=[];
  if(t.threadId){rows=rows.concat(await safe('project_email_links?gmail_thread_id=eq.'+encodeURIComponent(t.threadId)+'&select=project_id,link_method&limit=5000'));rows=rows.concat(await safe('project_emails?gmail_thread_id=eq.'+encodeURIComponent(t.threadId)+'&project_id=not.is.null&select=project_id,match_method&limit=5000'));}
  else if(t.messageId){rows=rows.concat(await safe('project_email_links?gmail_message_id=eq.'+encodeURIComponent(t.messageId)+'&select=project_id,link_method&limit=50'));rows=rows.concat(await safe('project_emails?gmail_message_id=eq.'+encodeURIComponent(t.messageId)+'&project_id=not.is.null&select=project_id,match_method&limit=50'));}
  return uniq(rows.map(function(r){return r&&r.project_id;}));
}
function projectName(index,id){var x=index&&index.byId&&index.byId[String(id||'')];return x&&x.project&&x.project.name||'projekt tjetër';}
function guardBanner(root,type,title,text){
  var old=root.querySelector('#pgi2-project-identity-guard');if(old)old.remove();var host=root.querySelector('.pgi2-body');if(!host)return;
  var d=document.createElement('div');d.id='pgi2-project-identity-guard';d.className='pgi2-banner '+(type||'neutral');d.innerHTML='<b>'+esc(title)+'</b><span>'+esc(text)+'</span>';
  var mail=host.querySelector('.pgi2-mail');host.insertBefore(d,mail||host.firstChild);
}
function setSelect(root,value){var s=root.querySelector('#pgi2-project');if(!s)return false;s.value=String(value||'');try{s.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}return true;}
function blockSave(root){var b=root.querySelector('#pgi2-save');if(b)b.disabled=true;}
function allowManualIfChosen(root){var b=root.querySelector('#pgi2-save'),s=root.querySelector('#pgi2-project');if(b&&s&&s.value)b.disabled=false;}
async function applyIntakeGuard(){
  var root=document.getElementById('pgi2-bg');if(!root||!root.querySelector('.pgi2-mail'))return false;var my=++intakeSeq;
  var index=await projectsIndex(false);if(my!==intakeSeq||!document.getElementById('pgi2-bg'))return false;
  root=document.getElementById('pgi2-bg');var corpus=intakeCorpus(root),result=classifyCorpus(corpus,index),t=parseIntakeTarget(),linked=await linkedIdsForTarget(t);if(my!==intakeSeq||!document.getElementById('pgi2-bg'))return false;
  root=document.getElementById('pgi2-bg');var select=root.querySelector('#pgi2-project'),manual=root.dataset.pstIdentityManual==='1',selected=select&&String(select.value||''),hitIds=uniq(result.hits.map(function(h){return String(h.project&&h.project.id||'');}));
  if(systemMail(corpus)){
    if(select&&!manual)setSelect(root,'');blockSave(root);guardBanner(root,'bad','Email sistemor, jo projekt','Ky email nuk lidhet automatikisht me projekt.');return true;
  }
  if(result.mixed){
    if(select&&!manual)setSelect(root,'');blockSave(root);guardBanner(root,'bad','U gjetën disa identitete projekti','Ky thread/email përmban disa referenca projekti ose një referencë kontradiktore. Nuk normalizohet automatikisht te një projekt i vetëm.');return true;
  }
  if(result.hits.length===1){
    var target=hitIds[0],name=projectName(index,target);
    if(linked.length&&linked.some(function(id){return id!==target;})){
      if(select&&!manual)setSelect(root,target);blockSave(root);guardBanner(root,'bad','Referenca bie ndesh me lidhjen ekzistuese','Përmbajtja identifikon “'+name+'”, ndërsa thread-i ka lidhje me projekt tjetër. Kërkohet riklasifikim i kontrolluar.');return true;
    }
    if(select&&!manual&&selected!==target)setSelect(root,target);
    guardBanner(root,'ok','Identiteti i projektit u verifikua','Referenca/emri specifik e lidh këtë thread me “'+name+'”.');return true;
  }
  if(result.unknownRefs.length){
    if(select&&!manual)setSelect(root,'');blockSave(root);guardBanner(root,'bad','Referencë projekti pa destinacion të saktë','U gjet '+result.unknownRefs.join(', ')+' por nuk ekziston projekt me këtë referencë. Mos e lidh me një projekt tjetër të së njëjtës kompani.');return true;
  }
  if(linked.length===1){
    guardBanner(root,'info','Vazhdim i thread-it të verifikuar','Nuk u gjet referencë e re kontradiktore; ruhet identiteti ekzistues i thread-it me “'+projectName(index,linked[0])+'”.');return true;
  }
  if(manual&&select&&select.value){allowManualIfChosen(root);guardBanner(root,'info','Zgjedhje manuale','Nuk u gjet referencë e mjaftueshme për auto-lidhje. Destinacioni është zgjedhur manualisht.');return true;}
  if(select)setSelect(root,'');blockSave(root);guardBanner(root,'neutral','Kompania nuk mjafton për ta zgjedhur projektin','Nuk u gjet ref/business_ref ose sinjal unik i projektit. Zgjidhe manualisht ose krijo projektin e saktë.');return true;
}

function collectorCorpus(row){if(!row)return'';var c=row.cloneNode(true);c.querySelectorAll('.pgc-safety-note').forEach(function(n){n.remove();});return String(c.textContent||'');}
function collectorNote(row,kind,text){var host=row&&row.querySelector('.pgc-main');if(!host)return;var old=host.querySelector('.pgc-identity-note');if(old)old.remove();var n=document.createElement('span');n.className='pgc-identity-note '+kind;n.textContent=text;host.appendChild(n);}
async function applyCollectorGuard(){
  var modal=document.getElementById('pgc-bg'),pid=String(collectorProjectId||window.__pstCurrentProjectId||'');if(!modal||!pid)return false;var index=await projectsIndex(false);modal=document.getElementById('pgc-bg');if(!modal)return false;
  if(!index.byId[pid])return false;
  [].slice.call(modal.querySelectorAll('.pgc-row')).forEach(function(row){
    var cb=row.querySelector('.pgc-thread');if(!cb||cb.disabled)return;var r=classifyCorpus(collectorCorpus(row),index),ids=uniq(r.hits.map(function(h){return String(h.project&&h.project.id||'');}));
    if(r.mixed){cb.checked=false;collectorNote(row,'bad','Disa/kontradiktore referenca projekti — kontroll manual');}
    else if(ids.length===1&&ids[0]===pid){cb.checked=true;collectorNote(row,'ok','Identiteti i projektit u verifikua');}
    else if(ids.length===1){cb.checked=false;collectorNote(row,'bad','I takon projektit: '+projectName(index,ids[0]));}
    else if(r.unknownRefs.length){cb.checked=false;collectorNote(row,'bad','Referencë tjetër/pa projekt: '+r.unknownRefs.join(', '));}
    else{cb.checked=false;collectorNote(row,'manual','Vetëm kompani/kontakt — kërkon kontroll manual');}
  });
  modal.querySelectorAll('.pgc-attachment').forEach(function(x){x.checked=false;x.disabled=true;});
  var st=modal.querySelector('#pgc-status');if(st){st.textContent='Auto-zgjedhja lejohet vetëm kur emaili identifikon këtë projekt specifik. Kompania, domeni ose kontakti vetëm nuk mjaftojnë.';st.className='pgc-status ok';}
  return true;
}
function installCollector(){
  var f=window.pstCollectProjectGmail;if(typeof f!=='function'||f.__pstProjectIdentityGuard)return false;var target=f;
  function wrapped(id){collectorProjectId=String(id||window.__pstCurrentProjectId||'');var r=target.apply(this,arguments);return Promise.resolve(r).then(function(v){setTimeout(applyCollectorGuard,0);return v;});}
  wrapped.__pstProjectIdentityGuard=true;wrapped.__base=target;window.pstCollectProjectGmail=wrapped;return true;
}
function installMapHook(){
  var E=window.PSTEmail;if(!E||typeof E.map!=='function'||E.map.__pstProjectIdentityGuard)return false;var target=E.map;
  function wrapped(){var r=target.apply(this,arguments);return Promise.resolve(r).then(function(v){if(document.getElementById('pgc-bg'))setTimeout(applyCollectorGuard,0);return v;});}
  wrapped.__pstProjectIdentityGuard=true;wrapped.__base=target;E.map=wrapped;return true;
}
function installIntakeEvents(){
  document.addEventListener('click',function(e){var t=e.target;if(!t)return;if(t.id==='pgi2-change')setTimeout(applyIntakeGuard,0);},true);
  document.addEventListener('change',function(e){var t=e.target;if(!t||t.id!=='pgi2-project')return;var root=document.getElementById('pgi2-bg');if(root&&e.isTrusted)root.dataset.pstIdentityManual='1';setTimeout(applyIntakeGuard,0);},true);
  document.addEventListener('pst:gmail-intake-request',function(){setTimeout(applyIntakeGuard,0);});
  document.addEventListener('pst:gmail-handoff-fallback',function(){setTimeout(applyIntakeGuard,0);});
}
function install(){installCollector();installMapHook();}
function css(){if(document.getElementById('pst-gmail-project-identity-css'))return;var s=document.createElement('style');s.id='pst-gmail-project-identity-css';s.textContent='.pgc-identity-note{display:block;margin-top:5px;font-size:8.5px;font-weight:750}.pgc-identity-note.ok{color:#2F7657}.pgc-identity-note.bad{color:#96483F}.pgc-identity-note.manual{color:#9A6A25}';document.head.appendChild(s);}
css();install();installIntakeEvents();
document.addEventListener('pst:modules-ready',install,{once:true});
setTimeout(function(){install();applyIntakeGuard();},0);
window.PSTGmailProjectIdentityGuardV1={applyIntake:applyIntakeGuard,applyCollector:applyCollectorGuard,install:install,_test:{norm:norm,compact:compact,canonicalRefKey:canonicalRefKey,referenceKeys:referenceKeys,buildIndex:buildIndex,classifyCorpus:classifyCorpus,semanticPhrases:semanticPhrases}};
})();