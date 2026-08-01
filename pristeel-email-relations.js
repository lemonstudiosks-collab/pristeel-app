/* PRISTEEL Gmail relations: shumë projekte për email dhe kontroll i thread-eve të përziera */
(function(){
'use strict';

if(window.__pstEmailRelationsLoaded)return;
window.__pstEmailRelationsLoaded=true;

var A=window.PSTEmail;
if(!A)return;

var legacyLoad=window.pstEmailLoad;
var legacyLink=window.pstEmailLink;
var legacyUnlink=window.pstEmailUnlink;
var readyCache={value:null,checked:0};

var style=document.createElement('style');
style.id='pst-email-relations-style';
style.textContent=`
.pem-badge.shared{background:#F0EDF7;color:#6B5B95}.pem-badge.review{background:#F9ECEA;color:#A64B42}.pem-review-note{border:1px solid #F0D3CF;background:#FDF6F5;color:#8E4038;border-radius:8px;padding:8px 10px;font-size:10.5px;line-height:1.45;margin:8px 0}.pem-rel-summary{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:8px;font-size:10px;color:var(--text3)}
`;
document.head.appendChild(style);

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return A.esc?A.esc(v):String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function q(v){return encodeURIComponent(String(v==null?'':v));}
function uniq(v){return arr(v).map(String).filter(function(x,i,a){return x&&a.indexOf(x)===i;});}
function inText(field,values){return field+'=in.('+values.map(function(x){return'"'+String(x).replace(/"/g,'')+'"';}).join(',')+')';}
function inNums(field,values){return field+'=in.('+values.map(function(x){return String(x).replace(/[^0-9-]/g,'');}).filter(Boolean).join(',')+')';}

async function relationsReady(force){
  if(!force&&readyCache.value!==null&&Date.now()-readyCache.checked<60000)return readyCache.value;
  try{
    await supaFetch('project_email_links?select=id&limit=1');
    readyCache={value:true,checked:Date.now()};
  }catch(e){
    readyCache={value:false,checked:Date.now()};
  }
  return readyCache.value;
}
window.pstEmailRelationsReady=relationsReady;

async function fetchMessagesByGmailIds(ids){
  ids=uniq(ids);var out=[];
  for(var i=0;i<ids.length;i+=35){
    try{out=out.concat(await supaFetch('project_emails?select=*&'+inText('gmail_message_id',ids.slice(i,i+35))+'&order=sent_at.desc'));}catch(e){}
  }
  return out;
}

async function fetchMessagesByIds(ids){
  ids=uniq(ids);var out=[];
  for(var i=0;i<ids.length;i+=50){
    try{out=out.concat(await supaFetch('project_emails?select=*&'+inNums('id',ids.slice(i,i+50))+'&order=sent_at.desc'));}catch(e){}
  }
  return out;
}

async function getLinksByMessages(ids){
  ids=uniq(ids);var out=[];
  for(var i=0;i<ids.length;i+=35){
    try{out=out.concat(await supaFetch('project_email_links?select=*&'+inText('gmail_message_id',ids.slice(i,i+35))+'&limit=3000'));}catch(e){}
  }
  return out;
}

async function getLinksByThreads(ids){
  ids=uniq(ids);var out=[];
  for(var i=0;i<ids.length;i+=35){
    try{out=out.concat(await supaFetch('project_email_links?select=gmail_thread_id,project_id,gmail_message_id&'+inText('gmail_thread_id',ids.slice(i,i+35))+'&limit=5000'));}catch(e){}
  }
  return out;
}

async function addLink(message,pid,method,confidence){
  if(!message||!message.gmail_message_id||!pid)return null;
  var existing=await supaFetch('project_email_links?gmail_message_id=eq.'+q(message.gmail_message_id)+'&project_id=eq.'+q(pid)+'&select=id&limit=1');
  var payload={
    gmail_message_id:String(message.gmail_message_id),
    gmail_thread_id:message.gmail_thread_id?String(message.gmail_thread_id):null,
    project_id:String(pid),
    link_method:method||'manual',
    confidence:confidence==null?100:Number(confidence),
    updated_at:new Date().toISOString()
  };
  if(existing&&existing[0])return supaFetch('project_email_links?id=eq.'+existing[0].id,'PATCH',payload);
  payload.created_at=new Date().toISOString();
  return supaFetch('project_email_links','POST',payload);
}
window.pstAddEmailProjectLink=addLink;

function strongProject(message,profiles){
  var text=((message.subject||'')+' '+(message.snippet||'')).toLowerCase();
  var best=null,bestScore=0;
  arr(profiles).forEach(function(profile){
    var score=0;
    arr(profile.refs).forEach(function(ref){if(ref&&text.indexOf(String(ref).toLowerCase())>-1)score+=140;});
    var name=String((profile.p&&profile.p.name)||'').toLowerCase().trim();
    if(name.length>=7&&text.indexOf(name)>-1)score+=115;
    arr(profile.tokens).forEach(function(token){if(String(message.subject||'').toLowerCase().indexOf(token)>-1)score+=18;});
    if(score>bestScore){bestScore=score;best=profile;}
  });
  return best&&bestScore>=100?{project_id:String(best.p.id),score:Math.min(100,bestScore)}:null;
}

async function reconcile(messages,profiles){
  if(!await relationsReady())return;
  var ids=uniq(arr(messages).map(function(x){return x.gmail_message_id;}));
  if(!ids.length)return;
  var rows=await fetchMessagesByGmailIds(ids);
  var threadIds=uniq(rows.map(function(x){return x.gmail_thread_id;}));
  var threadLinks=await getLinksByThreads(threadIds);
  var byThread={};
  threadLinks.forEach(function(link){
    var tid=String(link.gmail_thread_id||'');if(!tid)return;
    if(!byThread[tid])byThread[tid]=[];
    var pid=String(link.project_id||'');if(pid&&byThread[tid].indexOf(pid)<0)byThread[tid].push(pid);
  });
  for(var i=0;i<rows.length;i++){
    var row=rows[i],projects=byThread[String(row.gmail_thread_id||'')]||[];
    var strong=strongProject(row,profiles);
    var conflict=strong&&row.project_id&&String(row.project_id)!==strong.project_id;
    var mixed=projects.length>1;
    var patch=null;
    if((mixed||conflict)&&String(row.match_method||'').indexOf('manual')!==0){
      patch={needs_review:true,review_reason:mixed?'Thread-i është lidhur me disa projekte.':'Përmbajtja tregon një projekt tjetër nga lidhja e thread-it.',updated_at:new Date().toISOString()};
      if(row.match_method==='thread'&&conflict){
        patch.project_id=null;
        patch.suggested_project_id=strong.project_id;
        patch.match_method='mixed-thread-review';
        patch.match_confidence=strong.score;
        row.project_id=null;
      }
      try{await supaFetch('project_emails?id=eq.'+row.id,'PATCH',patch);}catch(e){}
    }
    if(row.project_id){
      try{await addLink(row,String(row.project_id),row.match_method||'legacy',row.match_confidence||100);}catch(e){}
    }
  }
}

if(typeof A.save==='function'&&!A.save.__pstRelations){
  var originalSave=A.save;
  A.save=async function(messages,profiles){
    var result=await originalSave.apply(this,arguments);
    try{await reconcile(messages,profiles);}catch(e){console.error('PRISTEEL email relations reconcile:',e);}
    return result;
  };
  A.save.__pstRelations=true;
}

window.pstOpenGmailThread=function(url,threadId){
  var target=url||(A.gmailUrl?A.gmailUrl(threadId):'https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(threadId||''));
  var w=window.open(target,'PRISTEEL_GMAIL');
  if(w)try{w.focus();}catch(e){}
};

function contactText(x){
  return x.direction==='outgoing'?arr(x.to_emails).join(', '):(x.from_name||x.from_email||'');
}

function emailRow(x,pid,suggest,linkCount){
  var badges=[];
  if(x.needs_review)badges.push('<span class="pem-badge review">KONTROLLO</span>');
  if(linkCount>1)badges.push('<span class="pem-badge shared">'+linkCount+' PROJEKTE</span>');
  if(suggest)badges.push('<span class="pem-badge suggest">SUGJERIM '+(x.match_confidence||0)+'%</span>');
  if(!badges.length)badges.push('<span class="pem-badge">'+(x.direction==='outgoing'?'DËRGUAR':'PRANUAR')+'</span>');
  var action=suggest
    ?'<button class="pem-link" onclick="event.stopPropagation();pstEmailLink('+x.id+',\''+esc(pid)+'\')">Lidhe</button>'
    :'<button class="pem-link" onclick="event.stopPropagation();pstEmailUnlink('+x.id+',\''+esc(pid)+'\')">Hiqe nga projekti</button>';
  var note=x.needs_review&&x.review_reason?'<div class="pem-review-note">'+esc(x.review_reason)+'</div>':'';
  return '<div class="pem-thread"><div class="pem-row" onclick="pstOpenGmailThread(\''+esc(x.gmail_url||'')+'\',\''+esc(x.gmail_thread_id||'')+'\')">'
    +'<div class="pem-dir">'+(x.direction==='outgoing'?'→':'←')+'</div><div class="pem-main"><div class="pem-subject">'+esc(x.subject||'(pa subjekt)')+(x.has_attachments?' · 📎':'')+'</div>'
    +'<div class="pem-meta">'+esc(contactText(x))+'</div><div class="pem-snippet">'+esc(x.snippet||'')+'</div>'+note+'</div>'
    +'<div class="pem-side"><div class="pem-date">'+(A.fmt?A.fmt(x.sent_at):'')+'</div>'+badges.join('')+action+'</div></div></div>';
}

async function relationLoad(pid){
  var el=document.getElementById('pem-list-'+pid);if(!el)return;
  if(!await relationsReady()){
    if(typeof legacyLoad==='function')return legacyLoad(pid);
    return;
  }
  el.innerHTML='<div class="pem-empty">Duke ngarkuar…</div>';
  try{
    var links=await supaFetch('project_email_links?project_id=eq.'+q(pid)+'&select=*&order=created_at.desc&limit=1000');
    var linked=await fetchMessagesByGmailIds(arr(links).map(function(x){return x.gmail_message_id;}));
    var legacy=await supaFetch('project_emails?project_id=eq.'+q(pid)+'&order=sent_at.desc&limit=500');
    var map={};
    linked.concat(arr(legacy)).forEach(function(x){if(x&&x.gmail_message_id)map[x.gmail_message_id]=x;});
    linked=Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return String(b.sent_at||'').localeCompare(String(a.sent_at||''));});
    var suggestions=await supaFetch('project_emails?project_id=is.null&suggested_project_id=eq.'+q(pid)+'&order=sent_at.desc&limit=100');
    var allLinks=await getLinksByMessages(linked.concat(arr(suggestions)).map(function(x){return x.gmail_message_id;}));
    var counts={};allLinks.forEach(function(x){var k=String(x.gmail_message_id||'');if(!counts[k])counts[k]=[];var p=String(x.project_id||'');if(p&&counts[k].indexOf(p)<0)counts[k].push(p);});
    var html='<div class="pem-rel-summary"><span>'+linked.length+' emaila të lidhur</span><span>·</span><span>Një email mund të jetë në disa projekte.</span></div>';
    html+=linked.length?linked.map(function(x){return emailRow(x,pid,false,(counts[x.gmail_message_id]||[]).length);}).join(''):'<div class="pem-empty">Ende nuk ka emaila të lidhur me këtë projekt.</div>';
    if(suggestions&&suggestions.length){
      html+='<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)"><div style="font-size:10.5px;font-weight:700;color:var(--bronze);text-transform:uppercase;margin-bottom:7px">Për shqyrtim ('+suggestions.length+')</div>'
        +suggestions.map(function(x){return emailRow(x,pid,true,(counts[x.gmail_message_id]||[]).length);}).join('')+'</div>';
    }
    el.innerHTML=html;
    if(A.set)A.set('pem-state-'+pid,linked.length+' emaila të lidhur'+(suggestions.length?' · '+suggestions.length+' sugjerime':''));
  }catch(e){
    if(typeof legacyLoad==='function'&&String(e.message||'').toLowerCase().indexOf('project_email_links')>-1)return legacyLoad(pid);
    el.innerHTML='<div class="pem-empty" style="color:var(--red-text)">'+esc(e.message)+'</div>';
  }
}

window.pstEmailLoad=relationLoad;

window.pstEmailLink=async function(id,pid){
  if(!await relationsReady())return typeof legacyLink==='function'?legacyLink(id,pid):undefined;
  try{
    var rows=await supaFetch('project_emails?id=eq.'+id+'&select=*&limit=1');var message=rows&&rows[0];
    if(!message)throw new Error('Emaili nuk u gjet.');
    await addLink(message,pid,'manual',100);
    var patch={suggested_project_id:pid,match_confidence:100,updated_at:new Date().toISOString(),needs_review:false,review_reason:null};
    if(!message.project_id){patch.project_id=pid;patch.match_method='manual';}
    else if(String(message.project_id)!==String(pid)){patch.match_method='manual-multi-project';}
    await supaFetch('project_emails?id=eq.'+id,'PATCH',patch);
    if(typeof window.pstSyncProjectContacts==='function')window.pstSyncProjectContacts(pid);
    await relationLoad(pid);
  }catch(e){alert('Gabim: '+e.message);}
};

window.pstEmailUnlink=async function(id,pid){
  if(!await relationsReady())return typeof legacyUnlink==='function'?legacyUnlink(id,pid):undefined;
  try{
    var rows=await supaFetch('project_emails?id=eq.'+id+'&select=*&limit=1');var message=rows&&rows[0];
    if(!message)throw new Error('Emaili nuk u gjet.');
    await supaFetch('project_email_links?gmail_message_id=eq.'+q(message.gmail_message_id)+'&project_id=eq.'+q(pid),'DELETE');
    if(String(message.project_id||'')===String(pid)){
      var remaining=await supaFetch('project_email_links?gmail_message_id=eq.'+q(message.gmail_message_id)+'&select=project_id&order=created_at.asc&limit=1');
      await supaFetch('project_emails?id=eq.'+id,'PATCH',{project_id:remaining&&remaining[0]?remaining[0].project_id:null,suggested_project_id:pid,match_method:'manual-unlinked',updated_at:new Date().toISOString()});
    }
    if(typeof window.pstSyncProjectContacts==='function')window.pstSyncProjectContacts(pid);
    await relationLoad(pid);
  }catch(e){alert('Gabim: '+e.message);}
};

})();
