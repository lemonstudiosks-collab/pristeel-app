/* PRISTEEL Gmail core: read-only sync, matching and persistence */
(function(){
'use strict';

var A=window.PSTEmail=window.PSTEmail||{};
A.internal=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com'];
A.keys={
  page:'pst_gmail_history_page_token',
  count:'pst_gmail_history_processed',
  done:'pst_gmail_history_complete',
  daily:'pst_gmail_daily_last'
};
A.busy=false;
A.token=null;
A.tokenExp=0;
A.projects=[];

A.esc=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');};
A.norm=function(s){var m=String(s||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/g);return m?m[0]:'';};
A.emails=function(s){var x=String(s||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/g)||[];return x.filter(function(v,i){return x.indexOf(v)===i;});};
A.isInternal=function(e){return A.internal.indexOf(String(e||'').toLowerCase())>-1;};
A.fmt=function(v){if(!v)return'';var d=new Date(v);if(isNaN(d.getTime()))return'';return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});};
A.gmailUrl=function(t){return'https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(t||'');};
A.set=function(id,msg,col){var e=document.getElementById(id);if(e){e.textContent=msg||'';e.style.color=col||'var(--text3)';}};

function arr(v){return Array.isArray(v)?v:[];}
function uniq(v){return arr(v).map(String).filter(function(x,i,a){return x&&a.indexOf(x)===i;});}
function hdr(p,n){var h=(p&&p.headers)||[];n=String(n||'').toLowerCase();for(var i=0;i<h.length;i++)if(String(h[i].name||'').toLowerCase()===n)return h[i].value||'';return'';}
function attached(p){if(!p)return false;if(p.filename)return true;var x=p.parts||[];for(var i=0;i<x.length;i++)if(attached(x[i]))return true;return false;}
function tokens(s){
  var stop={project:1,projekt:1,steel:1,stahl:1,construction:1,konstruktion:1,prissteel:1,offer:1,angebot:1,quotation:1,anfrage:1,request:1,client:1,customer:1,material:1,lieferung:1,reply:1,forward:1,aw:1,fw:1,re:1};
  return String(s||'').toLowerCase().replace(/[^a-z0-9à-ž]+/gi,' ').split(/\s+/)
    .filter(function(w){return w.length>=5&&!stop[w];})
    .filter(function(w,i,a){return a.indexOf(w)===i;}).slice(0,16);
}
function phrase(v){return String(v||'').toLowerCase().replace(/[^a-z0-9à-ž]+/gi,' ').replace(/\s+/g,' ').trim();}
function inf(field,v){return field+'=in.('+v.map(function(x){return'"'+String(x).replace(/"/g,'')+'"';}).join(',')+')';}

A.auth=function(){
  return new Promise(function(ok,no){
    if(A.token&&Date.now()<A.tokenExp){ok(A.token);return;}
    var cid=localStorage.getItem('pristeel_gclient')||'';
    if(!cid){no(new Error('Mungon Google Client ID te Cilësimet.'));return;}
    if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){no(new Error('Google Identity nuk u ngarkua.'));return;}
    try{
      var c=google.accounts.oauth2.initTokenClient({
        client_id:cid,
        scope:'https://www.googleapis.com/auth/gmail.readonly',
        prompt:'consent',
        callback:function(r){
          if(r&&r.access_token){A.token=r.access_token;A.tokenExp=Date.now()+((r.expires_in||3600)-60)*1000;ok(A.token);}
          else no(new Error((r&&r.error_description)||'Autorizimi Gmail dështoi.'));
        }
      });
      c.requestAccessToken();
    }catch(e){no(e);}
  });
};

A.gmail=async function(path,t){
  var r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me'+path,{headers:{Authorization:'Bearer '+t}}),x=await r.text();
  if(!r.ok)throw new Error('Gmail '+r.status+': '+x.slice(0,220));
  return x?JSON.parse(x):{};
};

A.message=async function(id,t){
  var hh=['From','To','Cc','Subject','Date','Message-ID'];
  var p='/messages/'+encodeURIComponent(id)+'?format=metadata'+hh.map(function(x){return'&metadataHeaders='+encodeURIComponent(x);}).join('');
  var m=await A.gmail(p,t),from=hdr(m.payload,'From'),fe=A.norm(from),to=A.emails(hdr(m.payload,'To')),cc=A.emails(hdr(m.payload,'Cc'));
  return{
    gmail_message_id:m.id,
    gmail_thread_id:m.threadId,
    rfc822_message_id:hdr(m.payload,'Message-ID')||null,
    from_email:fe||null,
    from_name:from&&fe?from.replace(new RegExp('<'+fe.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'>','i'),'').replace(/["<>]/g,'').trim():from,
    to_emails:to,
    cc_emails:cc,
    subject:hdr(m.payload,'Subject')||'(pa subjekt)',
    snippet:m.snippet||'',
    sent_at:(function(){var raw=hdr(m.payload,'Date'),d=raw?Date.parse(raw):NaN;if(!isNaN(d))return new Date(d).toISOString();return m.internalDate?new Date(parseInt(m.internalDate,10)).toISOString():new Date().toISOString();})(),
    direction:A.isInternal(fe)?'outgoing':'incoming',
    has_attachments:attached(m.payload),
    gmail_url:A.gmailUrl(m.threadId)
  };
};

A.map=async function(items,n,fn,progress){
  var out=new Array(items.length),i=0,done=0;
  async function worker(){
    while(true){
      var k=i++;if(k>=items.length)return;
      try{out[k]=await fn(items[k]);}catch(e){out[k]=null;}
      done++;if(progress)progress(done,items.length);
    }
  }
  var w=[];for(var j=0;j<Math.min(n,items.length);j++)w.push(worker());
  await Promise.all(w);return out.filter(Boolean);
};

A.profiles=async function(){
  var p=await supaFetch('projects?select=id,name,client,ref,status,location,deadline,pipeline_stage&order=created_at.desc&limit=1000');
  var rfq=[],acts=[],pcs=[],docs=[];
  try{rfq=await supaFetch('rfq_log?select=project_id,supplier_email,subject&project_id=not.is.null&limit=10000');}catch(e){}
  try{acts=await supaFetch('contact_activities?select=project_id,email,contact_email&project_id=not.is.null&limit=10000');}catch(e){}
  try{pcs=await supaFetch('project_contacts?select=project_id,email&status=neq.inactive&limit=10000');}catch(e){}
  try{docs=await supaFetch('documents_registry?select=project_id,doc_nr,project,client&project_id=not.is.null&limit=10000');}catch(e){}
  var by={};
  arr(p).forEach(function(x){
    var refs=[String(x.ref||'').toLowerCase()].filter(function(v){return v.length>4;});
    by[String(x.id)]={
      p:x,
      refs:refs,
      names:uniq([phrase(x.name),phrase(x.client),phrase(x.location)]).filter(function(v){return v.length>=5;}),
      tokens:tokens((x.name||'')+' '+(x.client||'')+' '+(x.location||'')),
      emails:[]
    };
  });
  function addEmail(pid,value){var q=by[String(pid)],e=A.norm(value);if(q&&e&&!A.isInternal(e)&&q.emails.indexOf(e)<0)q.emails.push(e);}
  arr(rfq).forEach(function(x){var q=by[String(x.project_id)];if(q){addEmail(x.project_id,x.supplier_email);q.tokens=uniq(q.tokens.concat(tokens(x.subject||''))).slice(0,24);}});
  arr(acts).forEach(function(x){addEmail(x.project_id,x.email||x.contact_email);});
  arr(pcs).forEach(function(x){addEmail(x.project_id,x.email);});
  arr(docs).forEach(function(x){var q=by[String(x.project_id)];if(!q)return;var d=String(x.doc_nr||'').toLowerCase();if(d.length>4&&q.refs.indexOf(d)<0)q.refs.push(d);q.tokens=uniq(q.tokens.concat(tokens((x.project||'')+' '+(x.client||'')))).slice(0,24);});
  A.projects=Object.keys(by).map(function(k){return by[k].p;});
  return Object.keys(by).map(function(k){return by[k];});
};

function owners(profiles){
  var o={};
  profiles.forEach(function(x){
    x.emails.forEach(function(e){if(!o[e])o[e]=[];if(o[e].indexOf(String(x.p.id))<0)o[e].push(String(x.p.id));});
  });
  return o;
}

function threadInfoAdd(map,row,methodField){
  var tid=String(row.gmail_thread_id||''),pid=String(row.project_id||'');
  if(!tid||!pid)return;
  if(!map[tid])map[tid]={projects:[],manual:false};
  if(map[tid].projects.indexOf(pid)<0)map[tid].projects.push(pid);
  var m=String(row[methodField]||'').toLowerCase();
  if(m.indexOf('manual')===0)map[tid].manual=true;
}

async function existing(msg){
  var ids=uniq(msg.map(function(x){return x.gmail_message_id;}));
  var th=uniq(msg.map(function(x){return x.gmail_thread_id;}).filter(Boolean));
  var rows=[],tr=[],links=[];
  for(var i=0;i<ids.length;i+=40){
    try{rows=rows.concat(await supaFetch('project_emails?select=id,gmail_message_id,gmail_thread_id,project_id,suggested_project_id,match_method,match_confidence,needs_review&'+inf('gmail_message_id',ids.slice(i,i+40))));}catch(e){}
  }
  for(var j=0;j<th.length;j+=35){
    try{tr=tr.concat(await supaFetch('project_emails?select=gmail_thread_id,project_id,match_method&project_id=not.is.null&'+inf('gmail_thread_id',th.slice(j,j+35))));}catch(e){}
    try{links=links.concat(await supaFetch('project_email_links?select=gmail_thread_id,project_id,link_method&'+inf('gmail_thread_id',th.slice(j,j+35))+'&limit=5000'));}catch(e){}
  }
  return{rows:rows,threads:tr,links:links};
}

function match(m,profiles,threads,emailOwners){
  var tid=String(m.gmail_thread_id||''),thread=threads[tid]||{projects:[],manual:false};
  if(thread.manual&&thread.projects.length===1){
    return{project_id:thread.projects[0],suggested_project_id:thread.projects[0],confidence:100,method:'manual-thread'};
  }
  var text=phrase((m.subject||'')+' '+(m.snippet||'')),sub=phrase(m.subject||'');
  var people=[m.from_email].concat(m.to_emails||[],m.cc_emails||[]).filter(Boolean).filter(function(e){return!A.isInternal(e);});
  var scored=[];
  profiles.forEach(function(x){
    var s=0,h=[],strong=false,pid=String(x.p.id);
    x.refs.forEach(function(r){if(r&&text.indexOf(phrase(r))>-1){s+=180;h.push('reference');strong=true;}});
    var pn=phrase(x.p.name||'');
    if(pn.length>=7&&sub.indexOf(pn)>-1){s+=150;h.push('project-name-subject');strong=true;}
    else if(pn.length>=7&&text.indexOf(pn)>-1){s+=105;h.push('project-name');strong=true;}
    var client=phrase(x.p.client||'');
    if(client.length>=5&&sub.indexOf(client)>-1){s+=65;h.push('client-subject');}
    else if(client.length>=5&&text.indexOf(client)>-1){s+=30;h.push('client');}
    people.forEach(function(e){var z=emailOwners[e]||[];if(z.length===1&&z[0]===pid){s+=95;h.push('email-unique');}else if(x.emails.indexOf(e)>-1){s+=24;h.push('email-shared');}});
    x.tokens.forEach(function(t){if(sub.indexOf(t)>-1){s+=20;h.push('subject');}else if(text.indexOf(t)>-1){s+=5;h.push('snippet');}});
    if(thread.projects.length===1&&thread.projects[0]===pid){s+=45;h.push('thread-signal');}
    if(s>0)scored.push({profile:x,score:s,how:uniq(h),strong:strong});
  });
  scored.sort(function(a,b){return b.score-a.score;});
  var best=scored[0],second=scored[1],margin=best?best.score-(second?second.score:0):0;
  if(!best||best.score<35)return{project_id:null,suggested_project_id:null,confidence:0,method:thread.projects.length>1?'mixed-thread-unmatched':'unmatched'};
  var auto=(best.strong&&best.score>=100&&margin>=25)||(best.score>=105&&margin>=35);
  var confidence=Math.max(1,Math.min(100,Math.round(best.score>=180?100:best.score)));
  return{
    project_id:auto?String(best.profile.p.id):null,
    suggested_project_id:String(best.profile.p.id),
    confidence:confidence,
    method:(thread.projects.length>1?'mixed-thread+':'')+best.how.join('+')
  };
}

A.save=async function(msg,profiles){
  if(!msg.length)return{inserted:0,updated:0};
  var e=await existing(msg),mm={},tt={};
  e.rows.forEach(function(x){mm[x.gmail_message_id]=x;threadInfoAdd(tt,x,'match_method');});
  e.threads.forEach(function(x){threadInfoAdd(tt,x,'match_method');});
  e.links.forEach(function(x){threadInfoAdd(tt,x,'link_method');});
  var own=owners(profiles),ins=[],upd=[];
  msg.forEach(function(m){
    var q=match(m,profiles,tt,own),now=new Date().toISOString();
    var row=Object.assign({},m,{project_id:q.project_id,suggested_project_id:q.suggested_project_id,match_method:q.method,match_confidence:q.confidence,updated_at:now});
    var old=mm[m.gmail_message_id],oldMethod=String(old&&old.match_method||'');
    if(!old){ins.push(row);return;}
    if(oldMethod.indexOf('manual')===0)return;
    if(!old.project_id&&q.project_id){
      upd.push({id:old.id,row:{project_id:q.project_id,suggested_project_id:q.suggested_project_id,match_method:q.method,match_confidence:q.confidence,updated_at:now}});
    }else if(!old.project_id&&q.suggested_project_id&&(!old.suggested_project_id||q.confidence>Number(old.match_confidence||0))){
      upd.push({id:old.id,row:{suggested_project_id:q.suggested_project_id,match_method:q.method,match_confidence:q.confidence,updated_at:now}});
    }
  });
  for(var i=0;i<ins.length;i+=100)await supaFetch('project_emails','POST',ins.slice(i,i+100));
  for(var j=0;j<upd.length;j++)await supaFetch('project_emails?id=eq.'+upd[j].id,'PATCH',upd[j].row);
  return{inserted:ins.length,updated:upd.length};
};

A.page=async function(t,page,q){
  var p='/messages?maxResults=100&q='+encodeURIComponent(q||'-label:chats');
  if(page)p+='&pageToken='+encodeURIComponent(page);
  return A.gmail(p,t);
};

A.process=async function(ids,t,p,state,bar){
  var b=document.getElementById(bar);
  var m=await A.map(ids,6,function(id){return A.message(id,t);},function(d,n){A.set(state,'Po lexohen metadata: '+d+'/'+n+'…');if(b)b.style.width=Math.round(d/Math.max(n,1)*100)+'%';});
  A.set(state,'Po lidhen emailat me projektet…');
  return A.save(m,p);
};

A.history=async function(cb){
  if(A.busy)return;
  A.busy=true;
  try{
    var t=await A.auth(),p=await A.profiles(),page=localStorage.getItem(A.keys.page)||'',n=parseInt(localStorage.getItem(A.keys.count)||'0',10)||0;
    localStorage.removeItem(A.keys.done);
    while(true){
      var r=await A.page(t,page,'-label:chats'),ids=(r.messages||[]).map(function(x){return x.id;});
      if(!ids.length){localStorage.setItem(A.keys.done,'1');localStorage.removeItem(A.keys.page);break;}
      var s=await A.process(ids,t,p,'pec-state','pec-progress-fill');
      n+=ids.length;localStorage.setItem(A.keys.count,String(n));
      page=r.nextPageToken||'';
      if(page)localStorage.setItem(A.keys.page,page);else localStorage.removeItem(A.keys.page);
      if(cb)await cb({processed:n,inserted:s.inserted,updated:s.updated,done:!page});
      if(!page){localStorage.setItem(A.keys.done,'1');break;}
      await new Promise(function(x){setTimeout(x,120);});
    }
    return n;
  }finally{A.busy=false;}
};

A.daily=async function(cb){
  if(A.busy)return;
  A.busy=true;
  try{
    var t=await A.auth(),p=await A.profiles(),page='',n=0,ins=0,upd=0;
    do{
      var r=await A.page(t,page,'newer_than:2d -label:chats'),ids=(r.messages||[]).map(function(x){return x.id;});
      if(ids.length){var s=await A.process(ids,t,p,'pec-state','pec-progress-fill');n+=ids.length;ins+=s.inserted;upd+=s.updated;}
      page=r.nextPageToken||'';
    }while(page&&n<1000);
    localStorage.setItem(A.keys.daily,new Date().toISOString());
    if(cb)await cb({processed:n,inserted:ins,updated:upd});
    return{processed:n,inserted:ins,updated:upd};
  }finally{A.busy=false;}
};

})();
