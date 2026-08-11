/* PRISTEEL global Contacts provenance UI v1
 * Additive layer over the legacy global Contacts page.
 * Reads public.contact_sources and never writes contact master data.
 */
(function(){
'use strict';
if(window.__pstContactsProvenanceUIV1)return;
window.__pstContactsProvenanceUIV1=true;

var sourceMap=new Map();
var sourceRows=[];
var sourceFilter='all';
var sourcesReady=false;
var loadingPromise=null;

var original={
  loadContacts:typeof window.loadContacts==='function'?window.loadContacts:null,
  renderContacts:typeof window.renderContacts==='function'?window.renderContacts:null,
  renderContactStats:typeof window.renderContactStats==='function'?window.renderContactStats:null
};

function text(v){return String(v==null?'':v).trim();}
function esc(v){return text(v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});}
function contactId(c){return text(c&&c.id);}
function sourceLabel(source){
  if(source==='hubspot')return 'HubSpot';
  if(source==='bitrix24')return 'Bitrix24';
  return source||'Burim';
}
function sourceClass(source){return source==='hubspot'?'hubspot':source==='bitrix24'?'bitrix24':'other';}

function rebuildMap(rows){
  sourceRows=Array.isArray(rows)?rows:[];
  sourceMap=new Map();
  sourceRows.forEach(function(row){
    var id=text(row.contact_id); if(!id)return;
    if(!sourceMap.has(id))sourceMap.set(id,[]);
    sourceMap.get(id).push(row);
  });
  sourcesReady=true;
}

function sourcesFor(contact){
  var rows=(sourceMap.get(contactId(contact))||[]).slice();
  if(contact&&contact.hubspot_id&&!rows.some(function(r){return r.source==='hubspot';})){
    rows.push({contact_id:contactId(contact),source:'hubspot',external_id:text(contact.hubspot_id)||null,external_url:text(contact.hubspot_url)||null,synthetic:true});
  }
  var seen=new Set();
  return rows.filter(function(row){
    var s=text(row.source).toLowerCase();
    if(!s||seen.has(s))return false;
    seen.add(s);row.source=s;return true;
  }).sort(function(a,b){return text(a.source).localeCompare(text(b.source));});
}

function matchesSource(contact){
  if(sourceFilter==='all')return true;
  var sources=sourcesFor(contact).map(function(r){return r.source;});
  if(sourceFilter==='none')return sources.length===0;
  if(sourceFilter==='multi')return sources.length>1;
  return sources.indexOf(sourceFilter)>-1;
}

function setPageMeta(){
  try{
    if(window.pageMeta&&window.pageMeta.contacts){
      window.pageMeta.contacts.sub='Klientë dhe furnitorë · HubSpot + Bitrix24';
    }
  }catch(e){}
}

function injectStyle(){
  if(document.getElementById('pst-contacts-provenance-style'))return;
  var style=document.createElement('style');
  style.id='pst-contacts-provenance-style';
  style.textContent='\
#pst-ct-source-filter{height:32px;padding:0 28px 0 10px;border:1px solid var(--border);border-radius:7px;background:#fff;color:var(--text2);font-size:11.5px;font-weight:600;cursor:pointer}\
#pst-ct-source-filter:focus{border-color:var(--bronze)}\
.pst-ct-source-stack{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-wrap:wrap;max-width:170px;flex-shrink:0}\
.pst-ct-source{font-size:9px;font-weight:750;letter-spacing:.25px;padding:2px 7px;border-radius:999px;white-space:nowrap;border:1px solid transparent}\
.pst-ct-source.hubspot{background:#fff3ef;color:#b84f32;border-color:#ffd8cc}\
.pst-ct-source.bitrix24{background:#eef8ff;color:#1676a9;border-color:#cfeafb}\
.pst-ct-source.other{background:var(--bg3);color:var(--text2);border-color:var(--border)}\
.pst-ct-stat-active{background:var(--bronze-bg)!important}\
@media(max-width:900px){.pst-ct-source-stack{max-width:110px}.pst-ct-source{font-size:8.5px;padding:2px 6px}}\
';
  document.head.appendChild(style);
}

function ensureSourceControl(){
  var search=document.getElementById('ct-search');
  if(!search||document.getElementById('pst-ct-source-filter'))return;
  var select=document.createElement('select');
  select.id='pst-ct-source-filter';
  select.title='Filtro kontaktet sipas burimit';
  select.innerHTML='<option value="all">Burimi: Të gjithë</option>'
    +'<option value="hubspot">Burimi: HubSpot</option>'
    +'<option value="bitrix24">Burimi: Bitrix24</option>'
    +'<option value="multi">Burimi: disa sisteme</option>'
    +'<option value="none">Burimi: pa lidhje</option>';
  select.value=sourceFilter;
  select.addEventListener('change',function(){sourceFilter=select.value||'all';renderAll();});
  search.parentNode.insertBefore(select,search);
}

function sourceContactCount(source){
  var ids=new Set();
  sourceRows.forEach(function(row){if(row.source===source)ids.add(text(row.contact_id));});
  if(source==='hubspot'){
    (window._contacts||[]).forEach(function(c){if(c&&c.hubspot_id)ids.add(contactId(c));});
  }
  return ids.size;
}

function resetKind(){
  try{
    window._ctFilter='all';
    ['all','client','supplier'].forEach(function(x){var b=document.getElementById('ct-tab-'+x);if(b)b.classList.toggle('active',x==='all');});
  }catch(e){}
}
function clearSearch(){var s=document.getElementById('ct-search');if(s)s.value='';}
function setSource(next){sourceFilter=next||'all';var s=document.getElementById('pst-ct-source-filter');if(s)s.value=sourceFilter;renderAll();}
function setKind(kind){sourceFilter='all';var s=document.getElementById('pst-ct-source-filter');if(s)s.value='all';clearSearch();if(typeof window.filterContacts==='function')window.filterContacts(kind);else renderAll();}
function resetAll(){sourceFilter='all';var s=document.getElementById('pst-ct-source-filter');if(s)s.value='all';clearSearch();resetKind();renderAll();}

function renderStats(){
  var el=document.getElementById('ct-stats');if(!el)return;
  var contacts=window._contacts||[];
  var cli=contacts.filter(function(c){return c.kind==='client';}).length;
  var sup=contacts.filter(function(c){return c.kind==='supplier';}).length;
  var countries=new Set(contacts.map(function(c){return c.country;}).filter(Boolean)).size;
  var hs=sourceContactCount('hubspot');
  var bx=sourceContactCount('bitrix24');
  var cells=[
    {label:'Gjithsej',value:contacts.length,click:'all',active:sourceFilter==='all'&&window._ctFilter==='all'},
    {label:'Klientë',value:cli,click:'client',active:sourceFilter==='all'&&window._ctFilter==='client'},
    {label:'Furnitorë',value:sup,click:'supplier',active:sourceFilter==='all'&&window._ctFilter==='supplier'},
    {label:'HubSpot',value:hs,click:'hubspot',active:sourceFilter==='hubspot'},
    {label:'Bitrix24',value:bx,click:'bitrix24',active:sourceFilter==='bitrix24'},
    {label:'Vende',value:countries,click:'countries',active:false}
  ];
  el.style.flexWrap='wrap';
  el.innerHTML=cells.map(function(c,i){
    return '<div data-pst-ct-stat="'+c.click+'" class="'+(c.active?'pst-ct-stat-active':'')+'" style="flex:1 1 120px;padding:12px 16px;cursor:pointer;transition:background .13s;'+(i?'border-left:1px solid var(--border)':'')+'">'
      +'<div style="font-size:20px;font-weight:680;color:var(--text);letter-spacing:-.3px">'+c.value+'</div>'
      +'<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);font-weight:600;margin-top:2px">'+c.label+'</div>'
    +'</div>';
  }).join('');
  el.querySelectorAll('[data-pst-ct-stat]').forEach(function(node){
    node.addEventListener('click',function(){
      var key=node.getAttribute('data-pst-ct-stat');
      if(key==='all')resetAll();
      else if(key==='client'||key==='supplier')setKind(key);
      else if(key==='countries'&&typeof window.renderCountryBreakdown==='function')window.renderCountryBreakdown();
      else setSource(key);
    });
  });
}

function decorateCards(){
  var list=document.getElementById('contacts-list');if(!list)return;
  list.querySelectorAll('.ct').forEach(function(card){
    var old=card.querySelector('.pst-ct-source-stack');if(old)old.remove();
    var onclick=card.getAttribute('onclick')||'';
    var match=onclick.match(/openContactModal\(['\"]([^'\"]+)['\"]\)/);
    if(!match)return;
    var id=match[1];
    var contact=(window._contacts||[]).find(function(c){return contactId(c)===text(id);});
    if(!contact)return;
    var rows=sourcesFor(contact);
    var stack=document.createElement('div');stack.className='pst-ct-source-stack';
    if(!rows.length){stack.innerHTML='<span class="pst-ct-source other">Pa burim</span>';}
    else stack.innerHTML=rows.map(function(row){return '<span class="pst-ct-source '+sourceClass(row.source)+'">'+esc(sourceLabel(row.source))+'</span>';}).join('');
    var kind=card.querySelector('.ct-tag');
    if(kind)card.insertBefore(stack,kind);else card.appendChild(stack);
  });
}

function renderContactsWrapped(){
  if(!original.renderContacts)return;
  var all=window._contacts||[];
  var filtered=sourceFilter==='all'?all:all.filter(matchesSource);
  window._contacts=filtered;
  try{original.renderContacts();}
  finally{window._contacts=all;}
  decorateCards();
}

function renderAll(){ensureSourceControl();renderStats();renderContactsWrapped();}

async function loadSources(force){
  if(loadingPromise&&!force)return loadingPromise;
  if(typeof window.supaFetch!=='function')return Promise.resolve([]);
  loadingPromise=window.supaFetch('contact_sources?select=contact_id,email,source,external_id,external_url,last_seen&order=source.asc&limit=5000')
    .then(function(rows){rebuildMap(rows||[]);renderAll();return rows||[];})
    .catch(function(error){console.warn('PRISTEEL contact provenance UI:',error);sourcesReady=false;renderAll();return [];})
    .finally(function(){loadingPromise=null;});
  return loadingPromise;
}

async function loadContactsWrapped(){
  if(!original.loadContacts)return;
  var result=await original.loadContacts.apply(this,arguments);
  await loadSources(true);
  return result;
}

function install(){
  setPageMeta();injectStyle();ensureSourceControl();
  if(original.renderContactStats)window.renderContactStats=renderStats;
  if(original.renderContacts)window.renderContacts=renderContactsWrapped;
  if(original.loadContacts)window.loadContacts=loadContactsWrapped;
  loadSources(false);
}

window.PSTContactsProvenanceUI={
  refreshSources:function(){return loadSources(true);},
  setSource:setSource,
  getSources:function(contact){return sourcesFor(contact);},
  get state(){return {sourceFilter:sourceFilter,sourcesReady:sourcesReady,sourceLinks:sourceRows.length};}
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();