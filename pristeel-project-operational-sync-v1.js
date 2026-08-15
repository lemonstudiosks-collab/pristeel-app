/* PRISTEEL project operational sync v1
 * Additive project reconciliation on authenticated reads.
 * - Never opens OAuth automatically.
 * - Never sends email.
 * - Recovers confirmed single-project Gmail thread continuity through the existing continuity module.
 * - Reconstructs sent RFQ history from already-sent project emails with duplicate guards.
 * - Persists a metadata-only index of Drive files so cross-device project views do not falsely look empty.
 */
(function(){
'use strict';
if(window.__pstProjectOperationalSyncV1)return;
window.__pstProjectOperationalSyncV1=true;

var cooldown={},inflight={};
function A(v){return Array.isArray(v)?v:[];}
function E(v){return encodeURIComponent(String(v==null?'':v));}
function S(v){return String(v==null?'':v);}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function email(v){var m=S(v).toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function internal(e){return /@(prissteel\.com)$/i.test(email(e))||['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com'].indexOf(email(e))>-1;}
function currentToken(){
  var G=window.PSTGoogleWorkspaceAuth;if(!G)return'';
  try{return (typeof G.cachedToken==='function'&&G.cachedToken([G.gmailScope,G.driveScope]))||'';}catch(e){return'';}
}
async function safe(path){try{return A(await window.supaFetch(path));}catch(e){return[];}}
async function db(path,method,body){return window.supaFetch(path,method,body);}
function rfqSubject(v){
  var s=N(v);if(!s||/^re\s*:/.test(s))return false;
  return /\brfq\b|request for quotation|request for quote|upit za ponudu|zahtev za ponudu|zahtjev za ponudu|zahtjev za ponud|kerkese per oferte|kerkes[ae] per ofert|ponuda za izradu|ponudu za izradu/.test(s);
}
function sentKey(row){return N(row&&row.supplier_email)+'|'+N(row&&row.subject)+'|'+S(row&&row.sent_at).slice(0,16);}
function gmailMarker(row){var m=S(row&&row.notes).match(/gmail_message_id=([^\s.;]+)/i);return m?m[1]:'';}
function prettyLocal(e){var p=email(e).split('@')[0]||'';return p.replace(/[._-]+/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase();})||'Furnitor';}
async function contactName(pid,e,projectClient){
  var q=email(e);if(!q)return'Furnitor';
  var rows=await safe('project_contacts?project_id=eq.'+E(pid)+'&email=eq.'+E(q)+'&select=name,company,email&limit=1'),r=rows[0];
  if(!r){var g=await safe('contacts?email=eq.'+E(q)+'&select=person,company,email&limit=1');r=g[0]||null;if(r)r.name=r.person;}
  var company=S(r&&r.company).trim(),name=S(r&&r.name).trim();
  if(company&&N(company)!==N(projectClient))return company;
  return name||company||prettyLocal(q);
}
async function backfillRfqs(pid){
  var projects=await safe('projects?id=eq.'+E(pid)+'&select=id,name,client&limit=1'),project=projects[0];if(!project)return{added:0,candidates:0};
  var mails=await safe('project_emails?project_id=eq.'+E(pid)+'&direction=eq.outgoing&select=gmail_message_id,to_emails,subject,snippet,sent_at,direction&order=sent_at.asc&limit=3000');
  var existing=await safe('rfq_log?project_id=eq.'+E(pid)+'&select=id,supplier_email,subject,sent_at,notes&limit=3000'),markers={},keys={};
  existing.forEach(function(x){var m=gmailMarker(x);if(m)markers[m]=1;keys[sentKey(x)]=1;});
  var added=0,candidates=0;
  for(var i=0;i<mails.length;i++){
    var m=mails[i];if(!rfqSubject(m.subject))continue;
    var recipients=A(m.to_emails).map(email).filter(function(x){return x&&!internal(x);});if(!recipients.length)continue;
    candidates++;
    for(var j=0;j<recipients.length;j++){
      var e=recipients[j],marker=S(m.gmail_message_id),key=N(e)+'|'+N(m.subject)+'|'+S(m.sent_at).slice(0,16);if((marker&&markers[marker])||keys[key])continue;
      var supplier=await contactName(pid,e,project.client);
      var row={project_id:pid,project_name:project.name,supplier_name:supplier,supplier_email:e,subject:m.subject||'RFQ',body:m.snippet||null,sent_at:m.sent_at||new Date().toISOString(),status:'sent',followup_count:0,notes:'[PPPP confirmed-thread recovery] gmail_message_id='+marker+'. Reconstructed from an already-sent project email; this operation never sends mail.'};
      try{await db('rfq_log','POST',row);added++;if(marker)markers[marker]=1;keys[key]=1;}catch(err){if(window.console&&console.warn)console.warn('PRISTEEL RFQ recovery:',err);}
    }
  }
  return{added:added,candidates:candidates};
}
async function persistDriveIndex(data){
  var p=data&&data.project,drive=data&&data.drive;if(!p||!p.id||!drive||drive.state!=='ok'||!A(drive.rows).length)return{added:0};
  var existing=await safe('project_docs?project_id=eq.'+E(p.id)+'&select=id,file_name,drive_url,notes&limit=3000'),seen={};
  existing.forEach(function(x){if(x.drive_url)seen[N(x.drive_url)]=1;if(x.file_name)seen['name:'+N(x.file_name)]=1;});
  var added=0;
  for(var i=0;i<drive.rows.length;i++){
    var f=drive.rows[i],name=S(f.name||f.title).trim(),url=S(f.webViewLink||f.url).trim();if(!name)continue;
    if((url&&seen[N(url)])||seen['name:'+N(name)])continue;
    var row={project_id:p.id,doc_type:'drive_file',title:name,file_name:name,drive_url:url||null,status:'source',doc_date:S(f.modifiedTime||f.modified_time||f.createdTime||f.created_time).slice(0,10)||null,notes:'[PPPP Drive index] Metadata-only index of the permanent project Drive file. The Drive file remains the source of truth.'};
    try{await db('project_docs','POST',row);added++;if(url)seen[N(url)]=1;seen['name:'+N(name)]=1;}catch(err){if(window.console&&console.warn)console.warn('PRISTEEL Drive index:',err);}
  }
  return{added:added};
}
async function sync(pid,token,force){
  pid=S(pid);if(!pid)return{skipped:'no-project'};token=token||currentToken();if(!token)return{skipped:'auth-required'};
  if(inflight[pid])return inflight[pid];
  if(!force&&Date.now()-Number(cooldown[pid]||0)<45000)return{skipped:'cooldown'};
  inflight[pid]=(async function(){
    var continuity={skipped:'continuity-unavailable'},rfq={added:0};
    var C=window.PSTProjectIntakeContinuityV1;
    if(C&&typeof C.normalizeProjectThreads==='function')continuity=await C.normalizeProjectThreads(pid,token);
    rfq=await backfillRfqs(pid);cooldown[pid]=Date.now();return{continuity:continuity,rfq:rfq};
  })().finally(function(){delete inflight[pid];});
  return inflight[pid];
}
function wrapIntegrity(){
  var I=window.PSTProjectDataIntegrity;if(!I||typeof I.load!=='function'||I.load.__pstOperationalSync)return false;
  var base=I.load;
  async function load(id){
    var token=currentToken();if(token)try{await sync(id,token,false);}catch(e){if(window.console&&console.warn)console.warn('PRISTEEL project sync:',e);}
    var data=await base.apply(this,arguments);
    try{var indexed=await persistDriveIndex(data);if(indexed.added)data=await base.apply(this,arguments);}catch(e){if(window.console&&console.warn)console.warn('PRISTEEL Drive index refresh:',e);}
    return data;
  }
  load.__pstOperationalSync=true;load.__base=base;I.load=load;return true;
}
function fileCard(){var p=document.getElementById('page-workspace-project');if(!p)return null;return [].slice.call(p.querySelectorAll('.pf2-card')).filter(function(c){var b=c.querySelector('header b');return b&&S(b.textContent).trim()==='Skedarët e projektit';})[0]||null;}
function refreshProject(pid){if(typeof window.pstOpenProjectWorkspace==='function')return window.pstOpenProjectWorkspace(pid);var F=window.PSTProjectFirstV2;if(F&&typeof F.mount==='function')return F.mount(pid,true);return false;}
function decorateFiles(){
  var d=window.__pstIntegrityLastData,c=fileCard();if(!d||!c)return false;var p=d.project||{},state=d.drive&&d.drive.state;if(!p.drive_folder_id||state!=='not-authorized')return false;
  var sub=c.querySelector('header span');if(sub)sub.textContent='Drive kërkon autorizim';
  var body=c.querySelector('header+div');if(!body)return false;if(body.querySelector('[data-pst-drive-auth-note]'))return true;
  var n=document.createElement('div');n.setAttribute('data-pst-drive-auth-note','1');n.style.cssText='margin:10px;padding:12px 13px;border:1px solid #D7E5EA;border-radius:10px;background:#F5FAFC;font-size:10px;line-height:1.5;color:#52666F';
  n.innerHTML='<b style="display:block;color:#315665;margin-bottom:4px">Dosja Drive është e lidhur</b><span>Ky browser nuk është autorizuar për ta lexuar. Numri 0 nuk do të thotë se dosja është bosh.</span><div style="margin-top:9px"><button type="button" data-pst-drive-auth style="height:32px;border:0;border-radius:8px;background:#5B9BB3;color:#fff;padding:0 11px;font-size:9px;font-weight:750;cursor:pointer">Autorizo Gmail + Drive</button></div>';
  body.insertBefore(n,body.firstChild);
  n.querySelector('[data-pst-drive-auth]').onclick=async function(){var b=this,G=window.PSTGoogleWorkspaceAuth,pid=S(p.id);try{b.disabled=true;b.textContent='Duke autorizuar…';if(!G||typeof G.authorizeForIntake!=='function')throw new Error('Google Workspace Auth nuk është gati.');var token=await G.authorizeForIntake();b.textContent='Duke sinkronizuar…';await sync(pid,token,true);refreshProject(pid);}catch(e){b.disabled=false;b.textContent='Autorizo Gmail + Drive';alert(e.message||e);}};
  return true;
}
function wrapRender(){
  var F=window.PSTProjectFirstV2;if(!F||typeof F.render!=='function'||F.render.__pstOperationalSync)return false;var base=F.render;
  function render(){var r=base.apply(this,arguments);setTimeout(decorateFiles,0);setTimeout(decorateFiles,120);return r;}
  render.__pstOperationalSync=true;render.__base=base;F.render=render;return true;
}
async function warmCurrent(){
  var pid=S(window.__pstCurrentProjectId||window._curProjId||''),token=currentToken();if(!pid||!token)return false;
  try{var r=await sync(pid,token,true),changed=Number(r&&r.continuity&&(r.continuity.added||0))+Number(r&&r.rfq&&r.rfq.added||0);if(changed)refreshProject(pid);}catch(e){if(window.console&&console.warn)console.warn('PRISTEEL warm project sync:',e);}return true;
}
function install(){wrapIntegrity();wrapRender();decorateFiles();}
function schedule(){[0,250,900,1800].forEach(function(ms){setTimeout(function(){install();if(ms===900)warmCurrent();},ms);});}
document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="files"]')){setTimeout(decorateFiles,0);setTimeout(decorateFiles,150);}},true);
schedule();
window.PSTProjectOperationalSyncV1={install:install,sync:sync,backfillRfqs:backfillRfqs,persistDriveIndex:persistDriveIndex,decorateFiles:decorateFiles,_test:{rfqSubject:rfqSubject,sentKey:sentKey,currentToken:currentToken}};
})();
