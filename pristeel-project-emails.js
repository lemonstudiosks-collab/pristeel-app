/* ═══════════════════════════════════════════════════════════
   PRISTEEL — EMAILAT E PROJEKTIT
   Gmail read-only · lidhje automatike me projekt · shqyrtim manual
   Ngarkohet nga pristeel-drive.js
   ═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

var GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
var INTERNAL_EMAILS = [
  'sales@prissteel.com',
  'arianit.vllahiu@prissteel.com',
  'oltian.vllahiu@prissteel.com'
];
var _gmailToken = null;
var _gmailTokenExp = 0;
var _syncBusy = false;

var css = document.createElement('style');
css.textContent = `
.pem-box{background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:12px}
.pem-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.pem-title{font-size:12px;font-weight:650;letter-spacing:.4px;text-transform:uppercase;color:var(--text2)}
.pem-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pem-actions select{font-size:11px;padding:5px 7px;width:auto}
.pem-state{font-size:10.5px;color:var(--text3);min-height:16px;margin:2px 0 8px}
.pem-thread{border:1px solid var(--border);border-radius:9px;margin-bottom:7px;background:#fff;overflow:hidden;transition:all .15s ease}
.pem-thread:hover{border-color:var(--border2);box-shadow:var(--sh-1)}
.pem-row{display:flex;align-items:flex-start;gap:10px;padding:10px 11px;cursor:pointer}
.pem-dir{width:25px;height:25px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--bg2);color:var(--text2);font-size:13px;font-weight:700}
.pem-main{flex:1;min-width:0}
.pem-subject{font-size:12px;font-weight:650;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pem-meta{font-size:10.5px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pem-snippet{font-size:10.5px;color:var(--text2);margin-top:4px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pem-side{flex-shrink:0;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.pem-date{font-size:10px;color:var(--text3);white-space:nowrap}
.pem-badge{font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:var(--bg3);color:var(--text2);white-space:nowrap}
.pem-badge.suggest{background:var(--bronze-bg);color:var(--bronze)}
.pem-empty{font-size:11.5px;color:var(--text3);font-style:italic;padding:10px 2px}
.pem-review{margin-top:12px;padding-top:10px;border-top:1px solid var(--border)}
.pem-review-title{font-size:10.5px;font-weight:700;color:var(--bronze);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px}
.pem-link{font-size:10px;padding:3px 8px;border:1px solid var(--border2);border-radius:6px;background:#fff;color:var(--bronze);cursor:pointer}
.pem-link:hover{background:var(--bronze);color:#fff;border-color:var(--bronze)}
.pem-foot{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:8px;font-size:10px;color:var(--text3);flex-wrap:wrap}
`;
document.head.appendChild(css);

function esc(s){
  return String(s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function normEmail(s){
  var m=String(s||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/g);
  return m?m[0]:'';
}
function emailList(s){
  var a=String(s||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/g)||[];
  return a.filter(function(x,i){return a.indexOf(x)===i;});
}
function isInternal(e){ return INTERNAL_EMAILS.indexOf(String(e||'').toLowerCase())>-1; }
function fmtDate(v){
  if(!v) return '';
  var d=new Date(v);
  if(isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
}
function header(payload,name){
  var hs=(payload&&payload.headers)||[];
  name=String(name||'').toLowerCase();
  for(var i=0;i<hs.length;i++) if(String(hs[i].name||'').toLowerCase()===name) return hs[i].value||'';
  return '';
}
function hasAttachment(part){
  if(!part) return false;
  if(part.filename) return true;
  var ps=part.parts||[];
  for(var i=0;i<ps.length;i++) if(hasAttachment(ps[i])) return true;
  return false;
}
function cleanTokens(s){
  var stop={project:1,projekt:1,steel:1,stahl:1,construction:1,konstruktion:1,prissteel:1,offer:1,angebot:1,quotation:1,anfrage:1,request:1,client:1,customer:1,material:1,lieferung:1};
  return String(s||'').toLowerCase().replace(/[^a-z0-9à-ž]+/gi,' ').split(/\s+/)
    .filter(function(w){return w.length>=5&&!stop[w];})
    .filter(function(w,i,a){return a.indexOf(w)===i;}).slice(0,8);
}
function gmailUrl(threadId){ return 'https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(threadId||''); }
function setState(pid,msg,col){
  var e=document.getElementById('pem-state-'+pid);
  if(e){e.textContent=msg||'';e.style.color=col||'var(--text3)';}
}

function getGmailToken(){
  return new Promise(function(resolve,reject){
    if(_gmailToken&&Date.now()<_gmailTokenExp){resolve(_gmailToken);return;}
    var cid=localStorage.getItem('pristeel_gclient')||'';
    if(!cid){reject(new Error('Mungon Google Client ID te Cilësimet.'));return;}
    if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){
      reject(new Error('Google Identity nuk u ngarkua.'));return;
    }
    try{
      var tc=google.accounts.oauth2.initTokenClient({
        client_id:cid,
        scope:GMAIL_SCOPE,
        prompt:'consent',
        callback:function(r){
          if(r&&r.access_token){
            _gmailToken=r.access_token;
            _gmailTokenExp=Date.now()+((r.expires_in||3600)-60)*1000;
            resolve(_gmailToken);
          }else reject(new Error((r&&r.error_description)||'Autorizimi Gmail dështoi.'));
        }
      });
      tc.requestAccessToken();
    }catch(e){reject(e);}
  });
}

async function gmailFetch(path,token){
  var r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me'+path,{headers:{Authorization:'Bearer '+token}});
  var txt=await r.text();
  if(!r.ok) throw new Error('Gmail '+r.status+': '+txt.slice(0,220));
  return txt?JSON.parse(txt):{};
}
async function listMessageIds(token,days,maxRows){
  var ids=[],page='';
  var q='newer_than:'+days+'d -label:chats';
  while(ids.length<maxRows){
    var path='/messages?maxResults=100&q='+encodeURIComponent(q)+(page?'&pageToken='+encodeURIComponent(page):'');
    var r=await gmailFetch(path,token);
    (r.messages||[]).forEach(function(x){if(ids.length<maxRows)ids.push(x.id);});
    page=r.nextPageToken||'';
    if(!page)break;
  }
  return ids;
}
async function mapLimit(items,limit,fn,onProgress){
  var out=new Array(items.length),idx=0,done=0;
  async function worker(){
    while(true){
      var i=idx++; if(i>=items.length)return;
      try{out[i]=await fn(items[i],i);}catch(e){out[i]=null;}
      done++;if(onProgress)onProgress(done,items.length);
    }
  }
  var ws=[];for(var j=0;j<Math.min(limit,items.length);j++)ws.push(worker());
  await Promise.all(ws);return out.filter(Boolean);
}
async function getMessageMeta(id,token){
  var h=['From','To','Cc','Subject','Date','Message-ID'];
  var p='/messages/'+encodeURIComponent(id)+'?format=metadata'+h.map(function(x){return '&metadataHeaders='+encodeURIComponent(x);}).join('');
  var m=await gmailFetch(p,token);
  var from=header(m.payload,'From'),to=header(m.payload,'To'),cc=header(m.payload,'Cc');
  var fromEmail=normEmail(from),tos=emailList(to),ccs=emailList(cc);
  return {
    gmail_message_id:m.id,
    gmail_thread_id:m.threadId,
    rfc822_message_id:header(m.payload,'Message-ID')||null,
    from_email:fromEmail||null,
    from_name:from&&fromEmail?from.replace(new RegExp('<'+fromEmail.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'>','i'),'').replace(/["<>]/g,'').trim():from,
    to_emails:tos,
    cc_emails:ccs,
    subject:header(m.payload,'Subject')||'(pa subjekt)',
    snippet:m.snippet||'',
    sent_at:(function(){var raw=header(m.payload,'Date'),t=raw?Date.parse(raw):NaN;if(!isNaN(t))return new Date(t).toISOString();if(m.internalDate)return new Date(parseInt(m.internalDate,10)).toISOString();return new Date().toISOString();})(),
    direction:isInternal(fromEmail)?'outgoing':'incoming',
    has_attachments:hasAttachment(m.payload),
    gmail_url:gmailUrl(m.threadId)
  };
}

async function loadProfiles(){
  var projects=await supaFetch('projects?select=id,name,client,ref,status&order=created_at.desc&limit=200');
  var rfqs=[];
  try{rfqs=await supaFetch('rfq_log?select=project_id,supplier_email,subject&project_id=not.is.null&limit=5000');}catch(e){}
  var acts=[];
  try{acts=await supaFetch('contact_activities?select=project_id,email,contact_email&project_id=not.is.null&limit=5000');}catch(e){}
  var byId={};
  (projects||[]).forEach(function(p){
    byId[String(p.id)]={
      p:p,
      refs:[String(p.ref||'').toLowerCase()].filter(function(x){return x.length>4;}),
      tokens:cleanTokens((p.name||'')+' '+(p.client||'')),
      emails:[]
    };
  });
  (rfqs||[]).forEach(function(r){
    var x=byId[String(r.project_id)],e=normEmail(r.supplier_email);
    if(x&&e&&!isInternal(e)&&x.emails.indexOf(e)<0)x.emails.push(e);
  });
  (acts||[]).forEach(function(r){
    var x=byId[String(r.project_id)],e=normEmail(r.email||r.contact_email);
    if(x&&e&&!isInternal(e)&&x.emails.indexOf(e)<0)x.emails.push(e);
  });
  return Object.keys(byId).map(function(k){return byId[k];});
}
function buildEmailOwners(profiles){
  var own={};
  profiles.forEach(function(x){
    x.emails.forEach(function(e){
      if(!own[e])own[e]=[];
      if(own[e].indexOf(String(x.p.id))<0)own[e].push(String(x.p.id));
    });
  });
  return own;
}
function matchMessage(m,profiles,threadMap,emailOwners){
  var tid=String(m.gmail_thread_id||'');
  if(tid&&threadMap[tid])return {project_id:threadMap[tid],suggested_project_id:threadMap[tid],confidence:100,method:'thread'};
  var text=((m.subject||'')+' '+(m.snippet||'')).toLowerCase();
  var subject=String(m.subject||'').toLowerCase();
  var participants=[m.from_email].concat(m.to_emails||[],m.cc_emails||[]).filter(Boolean).filter(function(e){return !isInternal(e);});
  var best=null,bestScore=0,bestMethod='';
  profiles.forEach(function(x){
    var score=0,method=[];
    x.refs.forEach(function(ref){if(ref&&text.indexOf(ref)>-1){score+=100;method.push('reference');}});
    participants.forEach(function(e){
      var owners=emailOwners[e]||[];
      if(owners.length===1&&owners[0]===String(x.p.id)){score+=90;method.push('email');}
      else if(x.emails.indexOf(e)>-1){score+=35;method.push('email-shared');}
    });
    x.tokens.forEach(function(t){
      if(subject.indexOf(t)>-1){score+=24;method.push('subject');}
      else if(text.indexOf(t)>-1){score+=8;method.push('snippet');}
    });
    if(score>bestScore){bestScore=score;best=x;bestMethod=method.join('+');}
  });
  if(!best||bestScore<35)return null;
  return {
    project_id:bestScore>=80?String(best.p.id):null,
    suggested_project_id:String(best.p.id),
    confidence:Math.min(100,bestScore),
    method:bestMethod||'keywords'
  };
}

async function saveMessages(messages,profiles){
  var existing=await supaFetch('project_emails?select=id,gmail_message_id,gmail_thread_id,project_id,suggested_project_id&limit=10000');
  var msgMap={},threadMap={};
  (existing||[]).forEach(function(x){
    msgMap[x.gmail_message_id]=x;
    if(x.gmail_thread_id&&x.project_id)threadMap[x.gmail_thread_id]=String(x.project_id);
  });
  var emailOwners=buildEmailOwners(profiles),insertRows=[],updates=[];
  messages.forEach(function(m){
    var mt=matchMessage(m,profiles,threadMap,emailOwners);
    if(!mt)return;
    var row=Object.assign({},m,{
      project_id:mt.project_id,
      suggested_project_id:mt.suggested_project_id,
      match_method:mt.method,
      match_confidence:mt.confidence,
      updated_at:new Date().toISOString()
    });
    var old=msgMap[m.gmail_message_id];
    if(!old){insertRows.push(row);return;}
    if(!old.project_id&&row.project_id)updates.push({id:old.id,row:{project_id:row.project_id,suggested_project_id:row.suggested_project_id,match_method:row.match_method,match_confidence:row.match_confidence,updated_at:row.updated_at}});
  });
  for(var i=0;i<insertRows.length;i+=100){
    await supaFetch('project_emails','POST',insertRows.slice(i,i+100));
  }
  for(var j=0;j<updates.length;j++){
    await supaFetch('project_emails?id=eq.'+updates[j].id,'PATCH',updates[j].row);
  }
  return {inserted:insertRows.length,updated:updates.length,matched:insertRows.length+updates.length};
}

function emailRow(x,pid,suggested){
  var who=x.direction==='outgoing'?(x.to_emails||[]).join(', '):(x.from_name||x.from_email||'');
  var dir=x.direction==='outgoing'?'→':'←';
  var badge=suggested?'<span class="pem-badge suggest">SUGJERIM '+(x.match_confidence||0)+'%</span>':'<span class="pem-badge">'+(x.direction==='outgoing'?'DËRGUAR':'PRANUAR')+'</span>';
  var action=suggested?'<button class="pem-link" onclick="event.stopPropagation();pstEmailLink('+x.id+',\''+pid+'\')">Lidhe</button>':'<button class="pem-link" onclick="event.stopPropagation();pstEmailUnlink('+x.id+',\''+pid+'\')">Hiqe</button>';
  return '<div class="pem-thread">'
    +'<div class="pem-row" onclick="window.open(\''+esc(x.gmail_url||gmailUrl(x.gmail_thread_id))+'\',\'_blank\')">'
      +'<div class="pem-dir">'+dir+'</div>'
      +'<div class="pem-main">'
        +'<div class="pem-subject">'+esc(x.subject||'(pa subjekt)')+(x.has_attachments?' · 📎':'')+'</div>'
        +'<div class="pem-meta">'+esc(who)+'</div>'
        +'<div class="pem-snippet">'+esc(x.snippet||'')+'</div>'
      +'</div>'
      +'<div class="pem-side"><div class="pem-date">'+fmtDate(x.sent_at)+'</div>'+badge+action+'</div>'
    +'</div>'
  +'</div>';
}

window.pstProjectEmailsSection=function(proj){
  var pid=String(proj.id);
  return '<div class="pem-box" id="pem-'+pid+'">'
    +'<div class="pem-hd"><span class="pem-title">Emailat e projektit</span>'
      +'<div class="pem-actions">'
        +'<select id="pem-days-'+pid+'"><option value="90">90 ditë</option><option value="365">1 vit</option><option value="730" selected>2 vite</option><option value="1825">5 vite</option></select>'
        +'<button class="btn btn-sm" onclick="pstEmailLoad(\''+pid+'\')">Rifresko</button>'
        +'<button class="btn btn-sm btn-primary" id="pem-sync-'+pid+'" onclick="pstEmailSync(\''+pid+'\')">Sinkronizo Gmail</button>'
      +'</div></div>'
    +'<div class="pem-state" id="pem-state-'+pid+'">Lexim Gmail vetëm me leje. Ruhet metadata, jo trupi i plotë.</div>'
    +'<div id="pem-list-'+pid+'"><div class="pem-empty">Duke ngarkuar…</div></div>'
    +'<div class="pem-foot"><span>Adresat: sales@prissteel.com · arianit.vllahiu@prissteel.com · oltian.vllahiu@prissteel.com</span>'
      +'<span>Hapja e emailit bëhet në Gmail.</span></div>'
  +'</div>';
};

window.pstEmailLoad=async function(pid){
  var el=document.getElementById('pem-list-'+pid);if(!el)return;
  el.innerHTML='<div class="pem-empty">Duke ngarkuar…</div>';
  try{
    var linked=await supaFetch('project_emails?project_id=eq.'+encodeURIComponent(pid)+'&order=sent_at.desc&limit=250');
    var suggested=await supaFetch('project_emails?project_id=is.null&suggested_project_id=eq.'+encodeURIComponent(pid)+'&order=sent_at.desc&limit=80');
    var h='';
    h+=(linked&&linked.length)?linked.map(function(x){return emailRow(x,pid,false);}).join(''):'<div class="pem-empty">Ende nuk ka emaila të lidhur me këtë projekt.</div>';
    if(suggested&&suggested.length){
      h+='<div class="pem-review"><div class="pem-review-title">Për shqyrtim ('+suggested.length+')</div>'
        +suggested.map(function(x){return emailRow(x,pid,true);}).join('')+'</div>';
    }
    el.innerHTML=h;
    setState(pid,(linked||[]).length+' emaila të lidhur'+((suggested||[]).length?' · '+suggested.length+' sugjerime për shqyrtim':''));
  }catch(e){
    el.innerHTML='<div class="pem-empty" style="color:var(--red-text)">'+esc(e.message)+'</div>';
    setState(pid,'Tabela project_emails mungon ose nuk është e qasshme.','var(--red-text)');
  }
};

window.pstEmailLink=async function(id,pid){
  try{
    await supaFetch('project_emails?id=eq.'+id,'PATCH',{
      project_id:pid,suggested_project_id:pid,match_method:'manual',match_confidence:100,updated_at:new Date().toISOString()
    });
    window.pstEmailLoad(pid);
  }catch(e){alert('Gabim gjatë lidhjes: '+e.message);}
};

window.pstEmailUnlink=async function(id,pid){
  try{
    await supaFetch('project_emails?id=eq.'+id,'PATCH',{
      project_id:null,suggested_project_id:pid,match_method:'manual-unlinked',updated_at:new Date().toISOString()
    });
    window.pstEmailLoad(pid);
  }catch(e){alert('Gabim gjatë heqjes së lidhjes: '+e.message);}
};

window.pstEmailSync=async function(pid){
  if(_syncBusy)return;
  _syncBusy=true;
  var btn=document.getElementById('pem-sync-'+pid),old=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent='Autorizimi…';}
  try{
    if(typeof supaFetch!=='function')throw new Error('supaFetch mungon.');
    var token=await getGmailToken();
    var days=parseInt((document.getElementById('pem-days-'+pid)||{}).value||730,10);
    if(btn)btn.textContent='Po lexohen projektet…';
    var profiles=await loadProfiles();
    setState(pid,'Po kërkohen emailat e '+days+' ditëve të fundit…');
    var ids=await listMessageIds(token,days,1000);
    if(btn)btn.textContent='0/'+ids.length;
    var messages=await mapLimit(ids,6,function(id){return getMessageMeta(id,token);},function(done,total){
      if(btn)btn.textContent=done+'/'+total;
      if(done%25===0||done===total)setState(pid,'Po lexohen metadata: '+done+'/'+total+'…');
    });
    setState(pid,'Po bëhet lidhja e sigurt me projektet…');
    var r=await saveMessages(messages,profiles);
    setState(pid,'Sinkronizimi përfundoi: '+r.inserted+' të rinj, '+r.updated+' lidhje të përditësuara.','var(--green-text)');
    await window.pstEmailLoad(pid);
  }catch(e){
    setState(pid,e.message,'var(--red-text)');
  }finally{
    _syncBusy=false;
    if(btn){btn.disabled=false;btn.textContent=old||'Sinkronizo Gmail';}
  }
};

function injectIntoOverview(){
  if(typeof window.renderOverviewModal!=='function')return false;
  if(window.renderOverviewModal.__pem)return true;
  var orig=window.renderOverviewModal;
  window.renderOverviewModal=function(id,p){
    orig.apply(this,arguments);
    try{
      var body=document.getElementById('ov-body');
      if(!body||document.getElementById('pem-'+id))return;
      var host=document.createElement('div');
      host.innerHTML=window.pstProjectEmailsSection({id:id,name:(p&&p.name)||''});
      var drive=document.getElementById('dv-'+id);
      if(drive&&drive.parentNode)drive.parentNode.insertBefore(host.firstChild,drive.nextSibling);
      else body.appendChild(host.firstChild);
      setTimeout(function(){window.pstEmailLoad(String(id));},30);
    }catch(e){console.error('project emails inject',e);}
  };
  window.renderOverviewModal.__pem=true;
  return true;
}

function init(){
  var tries=0;
  var iv=setInterval(function(){
    if(injectIntoOverview()||++tries>35)clearInterval(iv);
  },400);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,900);});
else setTimeout(init,900);

})();
