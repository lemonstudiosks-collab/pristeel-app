/* PRISTEEL project stability and Gmail evidence recovery
 * - one active project at a time
 * - no project bouncing from stale legacy loads
 * - hide the redundant global picker inside the 360 workspace
 * - project-only contact view with full CRM details
 * - recover attachment metadata from already linked Gmail messages
 */
(function(){
'use strict';
if(window.__pstProjectStabilityV2)return;
window.__pstProjectStabilityV2=true;

var A=window.PSTProjectDataIntegrity;
var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com','prissteel@gmail.com'];
var lockedProjectId='';
var pendingProjectId='';
var opening=false;
var openingPromise=Promise.resolve();

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function email(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function unique(rows){var seen={};return arr(rows).filter(function(row){var key=String(row&&(row.id||row.key||row.gmail_message_id||row.file_name||row.filename||row.name||row.doc_nr)||'');if(!key||seen[key])return false;seen[key]=1;return true;});}
function currentData(){return window.__pstIntegrityLastData||null;}
function workspaceActive(){var p=document.getElementById('page-workspace-project');return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function setLock(id){lockedProjectId=String(id||'');window.__pstWorkspaceLockedProjectId=lockedProjectId;window.__pstCurrentProjectId=lockedProjectId;}

/* Prevent stale legacy project loads from changing a workspace that is already open. */
function wrapLegacyLoad(){
  if(typeof window.loadProject!=='function'||window.loadProject.__pstStable)return false;
  var original=window.loadProject;
  window.loadProject=function(id){
    var requested=String(id||'');
    if(workspaceActive()&&lockedProjectId&&requested&&requested!==lockedProjectId&&!window.__pstAllowLegacyProjectLoad){
      console.warn('PRISTEEL blocked stale project switch',requested,'while',lockedProjectId,'is active');
      return Promise.resolve(null);
    }
    return original.apply(this,arguments);
  };
  window.loadProject.__pstStable=true;
  return true;
}

/* Serialize workspace opens. Only the most recently requested project remains on screen. */
function wrapWorkspaceOpen(){
  if(typeof window.pstOpenProjectWorkspace!=='function'||window.pstOpenProjectWorkspace.__pstStable)return false;
  var original=window.pstOpenProjectWorkspace;
  function drain(){
    if(opening)return openingPromise;
    opening=true;
    openingPromise=(async function(){
      while(pendingProjectId){
        var target=pendingProjectId;
        pendingProjectId='';
        setLock(target);
        await original.call(window,target);
        if(lockedProjectId!==target)continue;
        stabilizeUi();
      }
    })().catch(function(error){console.error('PRISTEEL project open failed:',error);}).finally(function(){opening=false;});
    return openingPromise;
  }
  window.pstOpenProjectWorkspace=function(id){pendingProjectId=String(id||'');setLock(pendingProjectId);return drain();};
  window.pstOpenProjectWorkspace.__pstStable=true;
  return true;
}

/* Merge complete HubSpot/local contact fields into project contacts. */
if(A&&typeof A.load==='function'&&!A.load.__pstStable){
  var originalDataLoad=A.load;
  A.load=async function(id){
    setLock(id);
    var data=await originalDataLoad.apply(this,arguments);
    if(String(id)!==lockedProjectId)return data;
    try{
      var globalContacts=await A.safe('contacts?email=not.is.null&select=*&limit=5000');
      var by={};arr(globalContacts).forEach(function(c){var e=email(c.email);if(e)by[e]=c;});
      data.contacts=arr(data.contacts).map(function(c){var e=email(c.email),g=by[e]||{};return Object.assign({},g,c,{email:e||c.email,phone:c.phone||g.phone||g.mobile||g.telephone||'',mobile:c.mobile||g.mobile||'',address:c.address||g.address||'',country:c.country||g.country||'',website:c.website||g.website||''});});
    }catch(e){console.warn('PRISTEEL contact enrichment:',e);}
    await recoverLinkedGmailEvidence(data);
    if(String(id)===lockedProjectId)window.__pstIntegrityLastData=data;
    return data;
  };
  A.load.__pstStable=true;
}

function cachedGmailToken(){
  var E=window.PSTEmail;
  if(E&&E.token&&Date.now()<Number(E.tokenExp||0))return E.token;
  var G=window.PSTGoogleWorkspaceAuth;
  try{if(G&&G.currentToken){return G.currentToken([G.gmailScope])||'';}}catch(e){}
  return'';
}
function collectParts(part,message,row,out){
  if(!part)return;
  var fn=String(part.filename||'').trim(),body=part.body||{};
  if(fn&&(body.attachmentId||body.data)){
    out.push({
      id:'gmail:'+message.id+':'+(body.attachmentId||fn),key:message.id+':'+(body.attachmentId||fn),
      file_name:fn,name:fn,mime_type:part.mimeType||'application/octet-stream',size:Number(body.size||0),
      gmail_message_id:message.id,gmail_thread_id:message.threadId,gmail_url:row.gmail_url||('https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(message.threadId||message.id)),
      created_at:row.sent_at||new Date(Number(message.internalDate||0)).toISOString(),subject:row.subject||'',from_email:row.from_email||'',direction:row.direction||'',__pstSource:'gmail-live'
    });
  }
  arr(part.parts).forEach(function(child){collectParts(child,message,row,out);});
}
function offerLike(row){return /\b(offer|ofert|angebot|quotation|quote|proposal|preis|quo|off)\b|\bD[-_ ]?\d{1,4}\/\d{2}\b/i.test(String((row.file_name||'')+' '+(row.subject||'')));}
function contractLike(row){return /contract|vertrag|nda|agreement|kontrat|ugovor|purchase order|bestellung/i.test(String((row.file_name||'')+' '+(row.subject||'')));}
async function recoverLinkedGmailEvidence(data){
  var token=cachedGmailToken(),E=window.PSTEmail;
  if(!token||!E||typeof E.gmail!=='function'||!data||!arr(data.emails).length)return;
  var attachments=[];
  var messages=arr(data.emails).filter(function(row){return row.gmail_message_id;}).slice(0,150);
  var index=0;
  async function worker(){
    while(index<messages.length){
      var row=messages[index++];
      try{
        var m=await E.gmail('/messages/'+encodeURIComponent(row.gmail_message_id)+'?format=full',token);
        collectParts(m.payload,m,row,attachments);
      }catch(e){console.warn('PRISTEEL Gmail attachment metadata:',row.gmail_message_id,e);}
    }
  }
  await Promise.all([worker(),worker(),worker(),worker()]);
  attachments=unique(attachments);
  if(!attachments.length)return;
  data.gmailLiveFiles=attachments;
  data.mailAttachments=unique(arr(data.mailAttachments).concat(attachments));
  data.files=unique(arr(data.files).concat(attachments));
  data.projectDocs=unique(arr(data.projectDocs).concat(attachments));
  attachments.forEach(function(row){
    if(contractLike(row))return;
    if(!offerLike(row))return;
    var outgoing=String(row.direction||'').toLowerCase()==='outgoing'||INTERNAL.indexOf(email(row.from_email))>-1;
    if(outgoing)data.ourOffers=unique(arr(data.ourOffers).concat([row]));
    else data.supplierOffers=unique(arr(data.supplierOffers).concat([row]));
  });
}

/* Redundant top picker is hidden only while the 360 workspace is open. */
function pickerContainer(){
  var select=document.getElementById('global-proj');if(!select)return null;
  var node=select.parentElement,best=node;
  for(var i=0;node&&i<4;i++,node=node.parentElement){
    var text=String(node.innerText||'').toLowerCase();
    if(text.indexOf('zgjidh një modul')>-1||text.indexOf('zgjidh nje modul')>-1){best=node;break;}
    if(node.children&&node.children.length<=5)best=node;
  }
  return best;
}
function syncPickerVisibility(){
  var box=pickerContainer();if(!box)return;
  box.style.display=workspaceActive()?'none':'';
}

function contactDetails(c){
  var name=c.name||c.person||c.email||'Kontakt';
  var bits=[];
  if(c.role)bits.push(c.role);if(c.company)bits.push(c.company);if(c.country)bits.push(c.country);
  var links=[];
  if(c.email)links.push('<a href="mailto:'+esc(c.email)+'">'+esc(c.email)+'</a>');
  var phone=c.phone||c.mobile||c.telephone||'';if(phone)links.push('<a href="tel:'+esc(phone)+'">'+esc(phone)+'</a>');
  if(c.website)links.push('<a target="_blank" href="'+esc(c.website)+'">Website</a>');
  if(c.hubspot_url)links.push('<a target="_blank" href="'+esc(c.hubspot_url)+'">HubSpot</a>');
  return '<article class="pst-stable-contact"><div class="pst-stable-avatar">'+esc(name.split(/\s+/).slice(0,2).map(function(x){return x.charAt(0);}).join('').toUpperCase())+'</div><div class="pst-stable-contact-body"><h3>'+esc(name)+(c.hubspot_id?' <span>HubSpot</span>':'')+'</h3><p>'+esc(bits.join(' · ')||'Kontakt i projektit')+'</p><div>'+links.join('<b>·</b>')+'</div>'+(c.address?'<small>'+esc(c.address)+'</small>':'')+'</div></article>';
}
window.pstProjectShowContacts=function(){
  var data=currentData();if(!data)return;
  if(typeof window.pstPiTab==='function')window.pstPiTab('communication');
  setTimeout(function(){
    var host=document.getElementById('pst-pi-body');if(!host)return;
    host.innerHTML='<section class="pst-pi-card full"><div class="pst-pi-hd"><div><b>Kontaktet e projektit</b><small>'+arr(data.contacts).length+' kontakte nga emailat dhe HubSpot</small></div><button class="pst-pi-link" onclick="pstPiTab(\'communication\')">Komunikimi</button></div><div class="pst-stable-contacts">'+(arr(data.contacts).length?arr(data.contacts).map(contactDetails).join(''):'<div class="pst-pi-empty">Nuk ka kontakte të lidhura me këtë projekt.</div>')+'</div></section>';
  },0);
};
window.pstProjectRecoverFromGmail=function(){
  var data=currentData(),id=data&&data.project&&data.project.id||lockedProjectId;
  if(!id)return;
  if(typeof window.pstCollectProjectGmail==='function'){window.pstCollectProjectGmail(id);return;}
  alert('Kolektori Gmail nuk është ngarkuar. Rifresko faqen.');
};

function replaceStatActions(){
  document.querySelectorAll('.pst-pi-stat').forEach(function(stat){
    var label=stat.querySelector('span'),text=String(label&&label.textContent||'').trim().toLowerCase();
    if(text==='kontakte')stat.onclick=window.pstProjectShowContacts;
  });
}
function addRecoveryActions(){
  var actions=document.querySelector('.pst-pi-actions');
  if(actions&&!document.getElementById('pst-gmail-recover')){
    var b=document.createElement('button');b.id='pst-gmail-recover';b.className='pst-pi-btn';b.textContent='Mblidh nga Gmail';b.onclick=window.pstProjectRecoverFromGmail;
    actions.insertBefore(b,actions.lastElementChild||null);
  }
  document.querySelectorAll('.pst-pi-empty').forEach(function(empty){
    var card=empty.closest('.pst-pi-card');if(!card)return;
    var title=String((card.querySelector('.pst-pi-hd b')||{}).textContent||'').toLowerCase();
    if(!/(skedar|ofert|dokument)/.test(title)||card.querySelector('.pst-stable-recover'))return;
    var b=document.createElement('button');b.className='pst-pi-link pst-stable-recover';b.textContent='Kërko në Gmail';b.onclick=window.pstProjectRecoverFromGmail;empty.appendChild(document.createElement('br'));empty.appendChild(b);
  });
}
function stabilizeUi(){
  syncPickerVisibility();replaceStatActions();addRecoveryActions();
  var data=currentData();
  if(data&&data.project&&String(data.project.id)!==lockedProjectId){
    pendingProjectId=lockedProjectId;
    if(!opening)window.pstOpenProjectWorkspace(lockedProjectId);
  }
}

/* Legacy navigation deliberately releases the workspace lock. */
var oldGo=window.pstProjectGoStep;
if(typeof oldGo==='function'&&!oldGo.__pstStable){
  window.pstProjectGoStep=function(page){window.__pstAllowLegacyProjectLoad=true;try{return oldGo.apply(this,arguments);}finally{setTimeout(function(){window.__pstAllowLegacyProjectLoad=false;},500);}};
  window.pstProjectGoStep.__pstStable=true;
}

var style=document.createElement('style');style.id='pst-project-stability-css';style.textContent=`
.pst-stable-contacts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px}
.pst-stable-contact{display:flex;gap:12px;align-items:flex-start;border:1px solid #DFE9ED;border-radius:12px;padding:13px;background:#fff}
.pst-stable-avatar{width:40px;height:40px;border-radius:11px;background:#EAF5F8;color:#3F7F98;display:flex;align-items:center;justify-content:center;font-weight:780;font-size:12px;flex:0 0 auto}
.pst-stable-contact-body{min-width:0}.pst-stable-contact-body h3{font-size:13px;margin:0;color:#20272B}.pst-stable-contact-body h3 span{font-size:8px;background:#EAF5F8;color:#3F7F98;border-radius:999px;padding:2px 6px}.pst-stable-contact-body p{font-size:11px;color:#69767D;margin:3px 0 7px}.pst-stable-contact-body a{font-size:10.5px;color:#3F7F98;text-decoration:none}.pst-stable-contact-body b{color:#B4BEC3;padding:0 6px}.pst-stable-contact-body small{display:block;color:#899399;font-size:9.5px;margin-top:7px}.pst-stable-recover{margin-top:10px!important}
@media(max-width:760px){.pst-stable-contacts{grid-template-columns:1fr}}
`;
document.head.appendChild(style);

var tries=0,timer=setInterval(function(){wrapLegacyLoad();wrapWorkspaceOpen();stabilizeUi();if(++tries>120)clearInterval(timer);},250);
var observer=new MutationObserver(function(){setTimeout(stabilizeUi,0);});
function start(){if(document.body)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});stabilizeUi();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
