/* PRISTEEL project contacts: nxjerr automatikisht kontaktet nga emailat e lidhur */
(function(){
'use strict';

if(window.__pstProjectContactsLoaded)return;
window.__pstProjectContactsLoaded=true;

var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com'];
var SYSTEM_RE=/(^|[._-])(no-?reply|mailer-daemon|postmaster|notifications?|dmarc)([._-]|@|$)/i;
var tableState={value:null,checked:0};

var style=document.createElement('style');
style.id='pst-project-contacts-style';
style.textContent=`
.pct-box{background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:12px}.pct-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap}.pct-title{font-size:12px;font-weight:650;letter-spacing:.4px;text-transform:uppercase;color:var(--text2)}.pct-sub{font-size:10px;color:var(--text3);margin-top:2px}.pct-state{font-size:10px;color:var(--text3);margin-bottom:8px}.pct-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.pct-person{border:1px solid var(--border);border-radius:9px;padding:10px;display:flex;align-items:center;gap:9px;min-width:0;background:#fff}.pct-person:hover{border-color:var(--border2);box-shadow:var(--sh-1)}.pct-avatar{width:32px;height:32px;border-radius:9px;background:#EAF2F7;color:#3D6F8E;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:750;flex-shrink:0}.pct-main{flex:1;min-width:0}.pct-name{font-size:11.5px;font-weight:680;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pct-company{font-size:9.5px;color:var(--text2);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pct-email{font-size:9px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pct-meta{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:5px}.pct-tag{font-size:8px;font-weight:700;color:#6B5B95;background:#F0EDF7;border-radius:10px;padding:2px 6px}.pct-tag.primary{color:#8A4E24;background:#F7EDE5}.pct-count{font-size:8.5px;color:var(--text3)}.pct-actions{display:flex;flex-direction:column;gap:4px;flex-shrink:0}.pct-icon{width:27px;height:27px;border:1px solid var(--border);background:#fff;border-radius:7px;color:var(--text3);display:flex;align-items:center;justify-content:center;cursor:pointer}.pct-icon:hover{color:var(--bronze);border-color:var(--bronze);background:var(--bronze-bg)}.pct-icon svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pct-empty{padding:12px 2px;font-size:11px;color:var(--text3);font-style:italic}.pct-foot{font-size:9px;color:var(--text3);margin-top:9px;padding-top:8px;border-top:1px solid var(--border)}
@media(max-width:850px){.pct-list{grid-template-columns:1fr}}
`;
document.head.appendChild(style);

var ICONS={
  mail:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  star:'<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z"/></svg>',
  edit:'<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/></svg>'
};

function arr(v){
  if(Array.isArray(v))return v;
  if(typeof v==='string')return v.match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/ig)||[];
  return [];
}
function norm(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function external(email){email=norm(email);return email&&INTERNAL.indexOf(email)<0&&!SYSTEM_RE.test(email);}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function q(v){return encodeURIComponent(String(v==null?'':v));}
function uniq(v){return arr(v).map(String).filter(function(x,i,a){return x&&a.indexOf(x)===i;});}
function inText(field,values){return field+'=in.('+values.map(function(x){return'"'+String(x).replace(/"/g,'')+'"';}).join(',')+')';}
function initials(v){var p=String(v||'?').trim().split(/\s+/);return ((p[0]||'?')[0]+(p[1]?p[1][0]:'')).toUpperCase();}
function prettyLocal(email){var local=String(email||'').split('@')[0].replace(/[._-]+/g,' ').trim();return local.replace(/\b\w/g,function(c){return c.toUpperCase();});}
function companyFromEmail(email){
  var domain=String(email||'').split('@')[1]||'';
  var generic=['gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','proton.me','protonmail.com','gmx.de','web.de'];
  if(!domain||generic.indexOf(domain)>-1)return'';
  var name=domain.split('.')[0].replace(/[-_]+/g,' ');
  return name.replace(/\b\w/g,function(c){return c.toUpperCase();});
}

async function contactsTableReady(force){
  if(!force&&tableState.value!==null&&Date.now()-tableState.checked<60000)return tableState.value;
  try{await supaFetch('project_contacts?select=id&limit=1');tableState={value:true,checked:Date.now()};}
  catch(e){tableState={value:false,checked:Date.now()};}
  return tableState.value;
}

async function linkedMessages(pid){
  var map={};
  try{
    var links=await supaFetch('project_email_links?project_id=eq.'+q(pid)+'&select=gmail_message_id&limit=3000');
    var ids=uniq(arr(links).map(function(x){return x.gmail_message_id;}));
    for(var i=0;i<ids.length;i+=35){
      var rows=await supaFetch('project_emails?select=*&'+inText('gmail_message_id',ids.slice(i,i+35))+'&order=sent_at.asc');
      arr(rows).forEach(function(x){map[x.gmail_message_id]=x;});
    }
  }catch(e){}
  try{
    var legacy=await supaFetch('project_emails?project_id=eq.'+q(pid)+'&select=*&order=sent_at.asc&limit=1500');
    arr(legacy).forEach(function(x){map[x.gmail_message_id]=x;});
  }catch(e){}
  return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return String(a.sent_at||'').localeCompare(String(b.sent_at||''));});
}

function derive(messages){
  var by={};
  function add(email,name,kind,date,messageId){
    email=norm(email);if(!external(email))return;
    if(!by[email])by[email]={email:email,name:'',company:companyFromEmail(email),role:'',first_seen:date||null,last_seen:date||null,email_count:0,direct_count:0,cc_count:0,message_ids:[]};
    var c=by[email];
    if(name&&String(name).trim()&&!c.name)c.name=String(name).replace(/["<>]/g,'').trim();
    if(date&&(!c.first_seen||date<c.first_seen))c.first_seen=date;
    if(date&&(!c.last_seen||date>c.last_seen))c.last_seen=date;
    c.email_count++;
    if(kind==='cc')c.cc_count++;else c.direct_count++;
    if(messageId&&c.message_ids.indexOf(String(messageId))<0)c.message_ids.push(String(messageId));
  }
  arr(messages).forEach(function(m){
    var date=m.sent_at||null;
    add(m.from_email,m.from_name,'direct',date,m.gmail_message_id);
    arr(m.to_emails).forEach(function(e){add(e,'','direct',date,m.gmail_message_id);});
    arr(m.cc_emails).forEach(function(e){add(e,'','cc',date,m.gmail_message_id);});
  });
  return Object.keys(by).map(function(k){var c=by[k];if(!c.name)c.name=prettyLocal(c.email);return c;});
}

async function enrichFromGlobal(list){
  try{
    var rows=await supaFetch('contacts?select=id,email,person,company,role,kind&email=not.is.null&limit=3000');
    var map={};arr(rows).forEach(function(x){var e=norm(x.email);if(e)map[e]=x;});
    list.forEach(function(c){var g=map[c.email];if(!g)return;c.global_contact_id=g.id;c.name=g.person||c.name;c.company=g.company||c.company;c.role=g.role||c.role;c.kind=g.kind||'';});
  }catch(e){}
  return list;
}

async function persist(pid,list){
  if(!await contactsTableReady())return list;
  var existing=await supaFetch('project_contacts?project_id=eq.'+q(pid)+'&select=*&limit=3000');
  var map={};arr(existing).forEach(function(x){map[norm(x.email)]=x;});
  var seen={};
  for(var i=0;i<list.length;i++){
    var c=list[i],old=map[c.email];seen[c.email]=true;
    var payload={
      project_id:String(pid),email:c.email,
      first_seen:c.first_seen,last_seen:c.last_seen,email_count:c.email_count,
      direct_count:c.direct_count,cc_count:c.cc_count,
      source_message_ids:c.message_ids,source:'email-auto',status:'active',updated_at:new Date().toISOString()
    };
    if(!old){
      payload.name=c.name||null;payload.company=c.company||null;payload.role=c.role||null;payload.created_at=new Date().toISOString();
      var inserted=await supaFetch('project_contacts','POST',payload);c.id=inserted&&inserted[0]?inserted[0].id:null;c.is_primary=false;
    }else{
      if(!old.name&&c.name)payload.name=c.name;
      if(!old.company&&c.company)payload.company=c.company;
      if(!old.role&&c.role)payload.role=c.role;
      await supaFetch('project_contacts?id=eq.'+old.id,'PATCH',payload);
      c.id=old.id;c.name=old.name||c.name;c.company=old.company||c.company;c.role=old.role||c.role;c.is_primary=!!old.is_primary;c.status=old.status||'active';
    }
  }
  for(var j=0;j<existing.length;j++){
    var oldRow=existing[j];
    if(oldRow.source==='email-auto'&&!seen[norm(oldRow.email)]&&oldRow.status!=='inactive'){
      try{await supaFetch('project_contacts?id=eq.'+oldRow.id,'PATCH',{status:'inactive',updated_at:new Date().toISOString()});}catch(e){}
    }
  }
  return list;
}

function compose(email){
  var url='https://mail.google.com/mail/u/0/?view=cm&fs=1&to='+encodeURIComponent(email||'');
  var w=window.open(url,'PRISTEEL_GMAIL');if(w)try{w.focus();}catch(e){}
}
window.pstProjectContactMail=compose;

window.pstProjectContactPrimary=async function(id,pid){
  if(!id||!await contactsTableReady())return;
  try{
    await supaFetch('project_contacts?project_id=eq.'+q(pid),'PATCH',{is_primary:false,updated_at:new Date().toISOString()});
    await supaFetch('project_contacts?id=eq.'+id,'PATCH',{is_primary:true,updated_at:new Date().toISOString()});
    await window.pstProjectContactsLoad(pid,false);
  }catch(e){alert('Gabim: '+e.message);}
};

window.pstProjectContactRole=async function(id,pid,current){
  if(!id||!await contactsTableReady())return;
  var role=prompt('Roli i kontaktit në këtë projekt:',current||'');if(role===null)return;
  try{await supaFetch('project_contacts?id=eq.'+id,'PATCH',{role:role||null,updated_at:new Date().toISOString()});await window.pstProjectContactsLoad(pid,false);}catch(e){alert('Gabim: '+e.message);}
};

function render(pid,list,persisted){
  var host=document.getElementById('pct-list-'+pid);if(!host)return;
  list=arr(list).filter(function(c){return c.status!=='hidden'&&c.status!=='inactive';}).sort(function(a,b){return Number(!!b.is_primary)-Number(!!a.is_primary)||b.direct_count-a.direct_count||String(a.name).localeCompare(String(b.name));});
  var state=document.getElementById('pct-state-'+pid);if(state)state.textContent=list.length+' kontakte të gjetura nga emailat e këtij projekti'+(persisted?'':' · pamje e përkohshme derisa të ekzekutohet SQL-ja');
  if(!list.length){host.innerHTML='<div class="pct-empty">Ende nuk ka kontakte të jashtme në emailat e lidhur me këtë projekt.</div>';return;}
  host.innerHTML=list.map(function(c){
    var role=c.role||((c.cc_count>c.direct_count)?'CC':'Kontakt');
    return '<div class="pct-person"><div class="pct-avatar">'+esc(initials(c.name||c.email))+'</div><div class="pct-main"><div class="pct-name">'+esc(c.name||c.email)+'</div>'
      +'<div class="pct-company">'+esc(c.company||role)+'</div><div class="pct-email">'+esc(c.email)+'</div><div class="pct-meta">'
      +(c.is_primary?'<span class="pct-tag primary">Primar</span>':'<span class="pct-tag">'+esc(role)+'</span>')
      +'<span class="pct-count">'+Number(c.email_count||0)+' emaila</span></div></div><div class="pct-actions">'
      +'<button class="pct-icon" title="Dërgo email" onclick="pstProjectContactMail(\''+esc(c.email)+'\')">'+ICONS.mail+'</button>'
      +(c.id?'<button class="pct-icon" title="Cakto si kontakt primar" onclick="pstProjectContactPrimary('+c.id+',\''+esc(pid)+'\')">'+ICONS.star+'</button><button class="pct-icon" title="Ndrysho rolin" onclick="pstProjectContactRole('+c.id+',\''+esc(pid)+'\',\''+esc(c.role||'')+'\')">'+ICONS.edit+'</button>':'')
      +'</div></div>';
  }).join('');
}

window.pstProjectContactsLoad=async function(pid,resync){
  var host=document.getElementById('pct-list-'+pid);if(host)host.innerHTML='<div class="pct-empty">Duke analizuar emailat…</div>';
  try{
    var messages=await linkedMessages(pid);
    var list=await enrichFromGlobal(derive(messages));
    var persistent=await contactsTableReady(!!resync);
    if(persistent)list=await persist(pid,list);
    render(pid,list,persistent);
  }catch(e){if(host)host.innerHTML='<div class="pct-empty" style="color:var(--red-text)">'+esc(e.message)+'</div>';}
};
window.pstSyncProjectContacts=function(pid){return window.pstProjectContactsLoad(pid,true);};

function section(pid){
  return '<div class="pct-box" id="pct-'+esc(pid)+'"><div class="pct-hd"><div><div class="pct-title">Kontaktet e projektit</div><div class="pct-sub">From, To dhe CC nga emailat e lidhur me këtë projekt</div></div><button class="btn btn-sm" onclick="pstProjectContactsLoad(\''+esc(pid)+'\',true)">Sinkronizo</button></div><div class="pct-state" id="pct-state-'+esc(pid)+'">Duke ngarkuar…</div><div class="pct-list" id="pct-list-'+esc(pid)+'"><div class="pct-empty">Duke analizuar emailat…</div></div><div class="pct-foot">Adresat e brendshme të PRISTEEL-it dhe adresat automatike no-reply përjashtohen.</div></div>';
}

function inject(){
  if(typeof window.renderOverviewModal!=='function')return false;
  if(window.renderOverviewModal.__pct)return true;
  var original=window.renderOverviewModal;
  window.renderOverviewModal=function(id,p){
    original.apply(this,arguments);
    try{
      var body=document.getElementById('ov-body');if(!body||document.getElementById('pct-'+id))return;
      var wrap=document.createElement('div');wrap.innerHTML=section(String(id));
      var emailCard=document.getElementById('pem-'+id);
      if(emailCard&&emailCard.parentNode)emailCard.parentNode.insertBefore(wrap.firstChild,emailCard);
      else body.appendChild(wrap.firstChild);
      setTimeout(function(){window.pstProjectContactsLoad(String(id),false);},60);
    }catch(e){console.error('PRISTEEL project contacts inject:',e);}
  };
  window.renderOverviewModal.__pct=true;
  return true;
}

var tries=0,timer=setInterval(function(){if(inject()||++tries>80)clearInterval(timer);},300);

})();
