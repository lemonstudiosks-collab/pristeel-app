/* PRISTEEL — supplier/project guard
   Preventon ofertat e furnitoreve nga krijimi si projekte te reja.
   Kandidatet e furnitoreve lidhen me projektin ekzistues kur perputhja eshte e sigurt.
*/
(function(){
'use strict';
if(window.__pstSupplierProjectGuardLoaded)return;
window.__pstSupplierProjectGuardLoaded=true;

var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com','prissteel@gmail.com'];
var GENERIC={project:1,projekt:1,projekti:1,steel:1,stahl:1,construction:1,konstruktion:1,offer:1,offerta:1,oferta:1,quotation:1,angebot:1,rfq:1,request:1,reply:1,fwd:1,forwarded:1,email:1,albania:1,shqiperi:1};

function arr(v){return Array.isArray(v)?v:[]}
function enc(v){return encodeURIComponent(String(v==null?'':v))}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function uniq(v){return arr(v).map(String).filter(function(x,i,a){return x&&a.indexOf(x)===i})}
function saved(){try{return JSON.parse(localStorage.getItem('pst_project_discovery')||'null')}catch(e){return null}}
function candidateAt(i){var d=saved();return d&&arr(d.candidates)[Number(i)]||null}
function textOf(c){var out=[c&&c.title,c&&c.ref,c&&c.client,c&&c.domain].concat(arr(c&&c.subjects));arr(c&&c.rows).forEach(function(r){out.push(r.subject,r.snippet,r.from_email);out=out.concat(arr(r.to_emails),arr(r.cc_emails))});return norm(out.join(' '))}
function externalEmails(c){var all=[];arr(c&&c.rows).forEach(function(r){all.push(r.from_email);all=all.concat(arr(r.to_emails),arr(r.cc_emails))});return uniq(all.map(function(x){return String(x||'').toLowerCase()}).filter(function(x){return x&&INTERNAL.indexOf(x)<0}))}
function tokens(v){return norm(v).split(' ').filter(function(w){return w.length>=4&&!GENERIC[w]}).filter(function(w,i,a){return a.indexOf(w)===i})}
function supplierSignal(c){
  var t=textOf(c),rows=arr(c&&c.rows),dirs=uniq(rows.map(function(r){return String(r.direction||'')}));
  var commercial=/(^| )(rfq|request for quotation|quotation|quote|offer|offerta|oferta|angebot|ponuda|price|cmim|cmime|tender)( |$)/.test(t);
  var supplierFlow=dirs.indexOf('outgoing')>-1&&dirs.indexOf('incoming')>-1;
  var supplierReply=rows.some(function(r){return String(r.direction)==='incoming'&&/(offer|quotation|offerta|oferta|angebot|ponuda|price|cmim)/.test(norm((r.subject||'')+' '+(r.snippet||'')))});
  var projectOrder=/(purchase order|bestellung|auftrag|werkvertrag|signed contract|kontrate e nenshkruar|contract award)/.test(t);
  return !!((commercial&&(supplierFlow||supplierReply))&&!projectOrder)
}
function sspSignal(c){var t=textOf(c);return /(17s 25|pst ssp sc 001 2026|smartct|smart city|camera pole|camera poles|cctv pole|shtyllat e kamerave|shtyllave te kamerave)/.test(t)}
function scoreProject(c,p){
  var ct=textOf(c),pn=norm((p&&p.name)||''),pr=norm((p&&p.ref)||''),pc=norm((p&&p.client)||''),s=0;
  if(c&&c.ref&&pr&&norm(c.ref)===pr)s+=180;
  if(pr&&ct.indexOf(pr)>-1)s+=150;
  if(pn&&ct.indexOf(pn)>-1)s+=110;
  var a=tokens(ct),b=tokens(pn+' '+pr+' '+pc),common=a.filter(function(x){return b.indexOf(x)>-1});
  s+=common.length*18;
  if(sspSignal(c)&&/(ssp|smart city|camera pole|camera poles)/.test(pn))s+=220;
  return s
}
function bestProject(c,projects){var best=null,bestScore=0,second=0;arr(projects).forEach(function(p){var s=scoreProject(c,p);if(s>bestScore){second=bestScore;bestScore=s;best=p}else if(s>second)second=s});return{project:best,score:bestScore,margin:bestScore-second}}
async function currentProjects(){var d=saved(),p=arr(d&&d.projects);if(p.length)return p;try{return await supaFetch('projects?select=id,name,client,ref,status,pipeline_stage&order=created_at.desc&limit=3000')}catch(e){return[]}}
async function linkCandidate(c,projectId){
  var rows=arr(c&&c.rows),linked=0,conflicts=0;
  for(var i=0;i<rows.length;i++){
    var r=rows[i],method=String(r.match_method||'').toLowerCase();
    if(r.project_id&&String(r.project_id)!==String(projectId)&&method.indexOf('manual')===0){conflicts++;continue}
    var patch={project_id:projectId,suggested_project_id:projectId,match_method:'manual-supplier-guard',match_confidence:100,needs_review:false,review_reason:null,updated_at:new Date().toISOString()};
    await supaFetch('project_emails?id=eq.'+enc(r.id),'PATCH',patch);
    try{await supaFetch('project_email_links','POST',{project_id:projectId,gmail_message_id:r.gmail_message_id||null,gmail_thread_id:r.gmail_thread_id||null,link_method:'manual-supplier-guard',confidence:100,created_at:new Date().toISOString()})}catch(e){}
    linked++
  }
  if(typeof window.pstSyncProjectContacts==='function')try{await window.pstSyncProjectContacts(projectId)}catch(e){}
  return{linked:linked,conflicts:conflicts}
}
function cardIndex(el){var c=el&&el.closest&&el.closest('[id^="ppd-c-"]');return c?Number(c.id.replace('ppd-c-','')):NaN}
function decorate(){
  var d=saved(),cs=arr(d&&d.candidates),ps=arr(d&&d.projects);
  document.querySelectorAll('[id^="ppd-c-"]').forEach(function(card){
    var i=Number(card.id.replace('ppd-c-','')),c=cs[i];if(!c||!supplierSignal(c))return;
    if(card.querySelector('.ppd-supplier-warning'))return;
    var match=bestProject(c,ps),tags=card.querySelector('.ppd-c-tags'),badge=document.createElement('span');
    badge.className='ppd-tag ppd-supplier-warning';badge.style.background='#EAF5F8';badge.style.color='#326F87';
    badge.textContent=match.project&&match.score>=120?'Ofertë furnitori · lidhe me '+match.project.name:'Ofertë furnitori · mos krijo projekt';
    if(tags)tags.appendChild(badge);
    var btn=card.querySelector('button[onclick*="pstDiscoveryCreate"]');if(btn){btn.textContent=match.project&&match.score>=120?'Lidhe me projektin':'Zgjidh projektin';btn.style.background='#4F91AA';btn.style.borderColor='#4F91AA'}
  })
}
function install(){
  if(window.__pstSupplierProjectGuardInstalled)return true;
  if(typeof window.pstDiscoveryCreate!=='function')return false;
  window.__pstSupplierProjectGuardInstalled=true;
  var originalCreate=window.pstDiscoveryCreate;
  window.pstDiscoveryCreate=async function(i){
    var c=candidateAt(i);if(!c)return originalCreate.apply(this,arguments);
    if(!supplierSignal(c))return originalCreate.apply(this,arguments);
    var projects=await currentProjects(),match=bestProject(c,projects);
    if(match.project&&match.score>=120&&match.margin>=20){
      if(!confirm('Ky komunikim duket si ofertë e një furnitori, jo si projekt i ri. Ta lidhim me projektin “'+match.project.name+'”?'))return;
      try{var r=await linkCandidate(c,match.project.id);var el=document.getElementById('ppd-c-'+i);if(el)el.remove();alert(r.linked+' emaila u lidhën me projektin “'+match.project.name+'”.'+(r.conflicts?' '+r.conflicts+' lidhje manuale kërkojnë kontroll.':''));}catch(e){alert('Gabim gjatë lidhjes: '+String(e&&e.message||e))}
      return
    }
    alert('Ky komunikim duket si RFQ/ofertë furnitori. Nuk do të krijohet projekt i ri. Zgjidh projektin ekzistues nga lista dhe kliko “Bashkëngjit”.');
  };
  var originalSafe=window.pstDiscoveryCreateSafe;
  if(typeof originalSafe==='function')window.pstDiscoveryCreateSafe=async function(){
    var d=saved(),all=arr(d&&d.candidates),blocked=all.filter(supplierSignal).length;
    if(blocked)alert(blocked+' raste furnitorësh janë përjashtuar nga krijimi automatik i projekteve. Ato duhet të lidhen me projektet ekzistuese.');
    return originalSafe.apply(this,arguments)
  };
  return true
}
var tries=0,t=setInterval(function(){install();decorate();if(++tries>240)clearInterval(t)},250);
var mo=new MutationObserver(function(){decorate()});mo.observe(document.documentElement,{childList:true,subtree:true});
})();
