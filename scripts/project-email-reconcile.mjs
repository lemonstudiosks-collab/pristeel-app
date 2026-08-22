import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const GUARD_FILE='pristeel-gmail-project-identity-guard-v1.js';
const INTERNAL_DOMAIN='prissteel.com';

function arr(v){return Array.isArray(v)?v:[];}
function str(v){return String(v??'');}
function clean(v){return str(v).trim();}
function systemMail(row){const s=`${str(row?.subject)} ${str(row?.snippet)}`.toLowerCase();return /delivery status notification|mail delivery subsystem|mailer-daemon|postmaster|undeliverable|calendar notification|hubspot notification/.test(s);}
function manualIgnored(row){return str(row?.match_method).toLowerCase()==='manual-ignored';}
function standardLike(key){return /^(?:en\d{3,}|iso\d{3,}|din\d{3,}|exc\d+|s\d{3,}[a-z0-9]*)$/i.test(str(key));}
function eligibleAnchor(a){
  const kind=str(a?.kind),key=str(a?.key);
  if(!key||standardLike(key))return false;
  if(kind==='business_ref')return key.length>=5&&(/\d/.test(key)||key.length>=10);
  if(kind==='ref'||kind==='name_ref')return key.length>=6&&/\d/.test(key);
  return false;
}
export function autoEligibleHit(hit){return arr(hit?.anchors).some(eligibleAnchor);}

export function trustedMethod(method,confidence){
  const m=str(method).toLowerCase().trim();
  if(!m)return false;
  if(/^(manual(?:-|$)|gmail-panel$|gmail-intake-v[23]$|verified(?:-|$)|project-identity-audit-|project-ref-verified-|thread-verified-|intake-reassign-confirmed$|confirmed-thread-recovery$|identity-auto-link-v1$|identity-reconcile-v1$|confirmed-thread-auto-link-v1$|confirmed-thread-reconcile-v1$)/.test(m))return true;
  const c=Number(confidence);
  return false&&Number.isFinite(c)&&c>=100;
}

export async function loadIdentityTools(guardFile=GUARD_FILE){
  const source=await readFile(guardFile,'utf8');
  const document={
    head:{appendChild(){}},
    addEventListener(){},
    getElementById(){return null;},
    createElement(){return{style:{},dataset:{},setAttribute(){},appendChild(){},querySelector(){return null;},querySelectorAll(){return[];}};}
  };
  const window={};
  const sandbox={
    window,document,
    console:{log(){},info(){},warn(){},error(){},debug(){}},
    setTimeout(){return 0;},clearTimeout(){},
    URL,location:{href:'https://pppp.local/'},
    Event:function(){},CustomEvent:function(){}
  };
  window.window=window;window.document=document;window.location=sandbox.location;window.URL=URL;
  vm.runInNewContext(source,sandbox,{filename:guardFile,timeout:2000});
  const tools=window.PSTGmailProjectIdentityGuardV1?._test;
  if(!tools||typeof tools.buildIndex!=='function'||typeof tools.classifyCorpus!=='function')throw new Error('PST Gmail project identity guard test API is unavailable');
  return tools;
}

export function ownerMap(rows=[],links=[]){
  const out=new Map();
  function add(threadId,projectId){
    const tid=str(threadId).trim(),pid=str(projectId).trim();if(!tid||!pid)return;
    if(!out.has(tid))out.set(tid,new Set());out.get(tid).add(pid);
  }
  for(const row of rows)if(row?.project_id&&trustedMethod(row.match_method,row.match_confidence))add(row.gmail_thread_id,row.project_id);
  for(const link of links)if(link?.project_id&&trustedMethod(link.link_method,link.confidence))add(link.gmail_thread_id,link.project_id);
  return out;
}
function ownerIds(owners,threadId){return [...(owners.get(str(threadId))||new Set())];}
function addOwner(owners,threadId,projectId){const tid=str(threadId).trim(),pid=str(projectId).trim();if(!tid||!pid)return;if(!owners.has(tid))owners.set(tid,new Set());owners.get(tid).add(pid);}

export function classifyEmail(row,index,owners,tools,{allowThread=false}={}){
  if(!row||row.project_id)return{target:'',reason:'already-linked'};
  if(manualIgnored(row))return{target:'',reason:'manual-ignored'};
  if(systemMail(row))return{target:'',reason:'system-mail'};
  const corpus=`${str(row.subject)} ${str(row.snippet)}`;
  const result=tools.classifyCorpus(corpus,index);
  const threadOwners=ownerIds(owners,row.gmail_thread_id);
  if(!result||result.mixed)return{target:'',reason:'mixed',result};
  if(arr(result.hits).length===1){
    const hit=result.hits[0],target=str(hit?.project?.id);
    if(!target)return{target:'',reason:'no-target',result};
    if(!autoEligibleHit(hit))return{target:'',reason:'weak-identity-anchor',result};
    if(threadOwners.length&&!(threadOwners.length===1&&threadOwners[0]===target))return{target:'',reason:'thread-conflict',result};
    return{target,reason:'strong-identity',method:'identity-reconcile-v1',result};
  }
  if(arr(result.unknownRefs).length)return{target:'',reason:'unknown-reference',result};
  if(allowThread&&threadOwners.length===1)return{target:threadOwners[0],reason:'single-project-thread',method:'confirmed-thread-reconcile-v1',result};
  return{target:'',reason:'insufficient-identity',result};
}

export function normalizeContactEmail(value){
  let v=clean(value).toLowerCase();
  const angle=v.match(/<([^<>]+)>/);if(angle)v=angle[1].trim();
  v=v.replace(/^mailto:/,'').replace(/[>,;]+$/g,'').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?v:'';
}
export function isExternalContactEmail(value){
  const email=normalizeContactEmail(value);if(!email)return false;
  const [local,domain]=email.split('@');
  if(domain===INTERNAL_DOMAIN||domain.endsWith(`.${INTERNAL_DOMAIN}`))return false;
  if(/^(?:no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc)(?:[+._-]|$)/i.test(local))return false;
  return true;
}
function list(v){if(Array.isArray(v))return v;if(typeof v==='string'&&v.trim()){try{const parsed=JSON.parse(v);return Array.isArray(parsed)?parsed:[];}catch{return v.split(',').map(x=>x.trim()).filter(Boolean);}}return[];}
function messageId(row){return clean(row?.gmail_message_id)||clean(row?.id);}
function validDate(v){const d=v?new Date(v):null;return d&&!Number.isNaN(d.getTime())?d:null;}
function prettierLocal(email){const local=str(email).split('@')[0].replace(/[._+-]+/g,' ').replace(/\s+/g,' ').trim();return local?local.replace(/\b\w/g,c=>c.toUpperCase()):'';}
function globalContactMap(rows=[]){
  const out=new Map();
  for(const row of rows){const email=normalizeContactEmail(row?.email);if(!email)continue;const prev=out.get(email)||{};out.set(email,{email,person:clean(prev.person)||clean(row?.person),company:clean(prev.company)||clean(row?.company),role:clean(prev.role)||clean(row?.role)});}
  return out;
}
export function deriveProjectContacts(emails=[],globalContacts=[]){
  const globals=globalContactMap(globalContacts),map=new Map();
  for(const row of emails){
    const projectId=clean(row?.project_id);if(!projectId)continue;
    const direct=new Set(),cc=new Set();
    const sender=normalizeContactEmail(row?.from_email);if(isExternalContactEmail(sender))direct.add(sender);
    for(const raw of list(row?.to_emails)){const email=normalizeContactEmail(raw);if(isExternalContactEmail(email))direct.add(email);}
    for(const raw of list(row?.cc_emails)){const email=normalizeContactEmail(raw);if(isExternalContactEmail(email))cc.add(email);}
    const all=new Set([...direct,...cc]);if(!all.size)continue;
    const mid=messageId(row),when=validDate(row?.sent_at||row?.date),senderName=clean(row?.from_name);
    for(const email of all){
      const key=`${projectId}|${email}`;
      if(!map.has(key))map.set(key,{project_id:projectId,email,name:'',company:'',role:'',first_seen:null,last_seen:null,email_count:0,direct_count:0,cc_count:0,source_message_ids:[],_messages:new Set(),_direct:new Set(),_cc:new Set()});
      const item=map.get(key);
      if(sender===email&&senderName&&!item.name)item.name=senderName;
      if(mid&&!item._messages.has(mid)){item._messages.add(mid);item.email_count++;item.source_message_ids.push(mid);}
      if(mid&&direct.has(email)&&!item._direct.has(mid)){item._direct.add(mid);item.direct_count++;}
      if(mid&&cc.has(email)&&!item._cc.has(mid)){item._cc.add(mid);item.cc_count++;}
      if(when){if(!item.first_seen||when<item.first_seen)item.first_seen=when;if(!item.last_seen||when>item.last_seen)item.last_seen=when;}
    }
  }
  return [...map.values()].map(item=>{
    const g=globals.get(item.email)||{};
    return{
      project_id:item.project_id,email:item.email,
      name:clean(g.person)||clean(item.name)||prettierLocal(item.email),
      company:clean(g.company),role:clean(g.role),
      first_seen:item.first_seen?item.first_seen.toISOString():null,
      last_seen:item.last_seen?item.last_seen.toISOString():null,
      email_count:item.email_count,direct_count:item.direct_count,cc_count:item.cc_count,
      source_message_ids:[...new Set(item.source_message_ids)]
    };
  }).sort((a,b)=>`${a.project_id}|${a.email}`.localeCompare(`${b.project_id}|${b.email}`));
}

export function mergeProjectContact(existing,derived){
  const source=clean(existing?.source)||'email-auto';
  const patch={
    first_seen:derived.first_seen,last_seen:derived.last_seen,
    email_count:Number(derived.email_count||0),direct_count:Number(derived.direct_count||0),cc_count:Number(derived.cc_count||0),
    source_message_ids:arr(derived.source_message_ids),
    name:clean(existing?.name)||clean(derived.name)||null,
    company:clean(existing?.company)||clean(derived.company)||null,
    role:clean(existing?.role)||clean(derived.role)||null,
    source
  };
  if(source==='email-auto')patch.status='active';
  return patch;
}
function dateKey(v){const d=validDate(v);return d?d.getTime():clean(v);}
function setKey(v){return [...new Set(list(v).map(str))].sort().join('\u0000');}
export function projectContactPatchChanged(existing,patch){
  for(const [key,value] of Object.entries(patch)){
    const old=existing?.[key];
    if(key==='first_seen'||key==='last_seen'){if(dateKey(old)!==dateKey(value))return true;continue;}
    if(key==='source_message_ids'){if(setKey(old)!==setKey(value))return true;continue;}
    if(['email_count','direct_count','cc_count'].includes(key)){if(Number(old||0)!==Number(value||0))return true;continue;}
    if(clean(old)!==clean(value))return true;
  }
  return false;
}

async function request({supabaseUrl,key,path,method='GET',body,prefer='return=minimal'}){
  const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:prefer},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await response.text();if(!response.ok)throw new Error(`${method} ${path} failed: ${response.status} ${raw.slice(0,700)}`);if(response.status===204||!raw)return[];return JSON.parse(raw);
}
async function fetchAll(access,table,select='*'){const rows=[];for(let offset=0;;offset+=1000){const batch=await request({...access,path:`${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${offset}`});rows.push(...batch);if(batch.length<1000)break;}return rows;}
async function patchRow(access,id,patch){await request({...access,path:`project_emails?id=eq.${encodeURIComponent(id)}`,method:'PATCH',body:patch});}
async function insertLink(access,row,target,method){await request({...access,path:'project_email_links',method:'POST',body:{project_id:target,gmail_message_id:row.gmail_message_id,gmail_thread_id:row.gmail_thread_id||null,link_method:method,confidence:100,created_at:new Date().toISOString()}});}
async function patchContact(access,id,patch){await request({...access,path:`project_contacts?id=eq.${encodeURIComponent(id)}`,method:'PATCH',body:{...patch,updated_at:new Date().toISOString()}});}
async function insertContacts(access,rows){for(let i=0;i<rows.length;i+=200){const chunk=rows.slice(i,i+200);if(chunk.length)await request({...access,path:'project_contacts',method:'POST',body:chunk});}}
async function writeSummary(report){await mkdir('tmp',{recursive:true});await writeFile('tmp/project-email-reconcile.json',JSON.stringify(report,null,2));}
function sample(row,decision){return{id:row.id,gmail_message_id:row.gmail_message_id,gmail_thread_id:row.gmail_thread_id,subject:row.subject||'',sent_at:row.sent_at||null,target_project_id:decision.target||null,reason:decision.reason,anchors:arr(decision.result?.hits?.[0]?.anchors).map(a=>({kind:a.kind,key:a.key,label:a.label})).slice(0,5),unknown_refs:arr(decision.result?.unknownRefs).slice(0,5)};}

async function reconcileProjectContacts(access,emails,mode){
  const [globalContacts,existing]=await Promise.all([
    fetchAll(access,'contacts','email,person,company,role'),
    fetchAll(access,'project_contacts','id,project_id,email,name,company,role,first_seen,last_seen,email_count,direct_count,cc_count,source_message_ids,is_primary,source,status')
  ]);
  const derived=deriveProjectContacts(emails,globalContacts),byKey=new Map(existing.map(x=>[`${clean(x.project_id)}|${normalizeContactEmail(x.email)}`,x]));
  const inserts=[],updates=[];
  for(const row of derived){
    const current=byKey.get(`${row.project_id}|${row.email}`);
    if(!current){inserts.push({...row,is_primary:false,source:'email-auto',status:'active'});continue;}
    const patch=mergeProjectContact(current,row);if(projectContactPatchChanged(current,patch))updates.push({id:current.id,patch});
  }
  if(mode==='apply'){
    await insertContacts(access,inserts);
    for(const item of updates)await patchContact(access,item.id,item.patch);
  }
  return{derived:derived.length,existing:existing.length,new_rows:inserts.length,changed_rows:updates.length,applied_inserts:mode==='apply'?inserts.length:0,applied_updates:mode==='apply'?updates.length:0};
}

export async function runProjectEmailReconcile({
  supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,
  key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'',
  mode=process.env.EMAIL_RECONCILE_MODE||process.env.SYNC_MODE||(String(process.env.APPLY||'false').toLowerCase()==='true'?'apply':'preview'),
  guardFile=GUARD_FILE
}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported EMAIL_RECONCILE_MODE: ${mode}`);
  if(!key)throw new Error('Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');
  const tools=await loadIdentityTools(guardFile),access={supabaseUrl,key};
  const [projects,emails,links]=await Promise.all([
    fetchAll(access,'projects','id,name,client,ref,business_ref,identity_aliases,status,created_at'),
    fetchAll(access,'project_emails','id,gmail_message_id,gmail_thread_id,project_id,suggested_project_id,sent_at,direction,subject,from_email,from_name,to_emails,cc_emails,snippet,match_method,match_confidence,needs_review'),
    fetchAll(access,'project_email_links','id,gmail_message_id,gmail_thread_id,project_id,link_method,confidence')
  ]);
  const index=tools.buildIndex(projects),owners=ownerMap(emails,links),knownLinks=new Set(links.filter(x=>x.project_id&&x.gmail_message_id).map(x=>`${x.project_id}|${x.gmail_message_id}`));
  const pending=emails.filter(x=>!x.project_id),planned=new Set();
  const report={mode,projects:projects.length,emails:emails.length,pending_initial:pending.length,trusted_owner_threads:owners.size,strong:{candidates:[],applied:[]},thread:{candidates:[],applied:[]},skipped:{system:0,manual_ignored:0,mixed:0,unknown_reference:0,weak_identity:0,thread_conflict:0,insufficient_identity:0},remaining_estimate:pending.length,contacts:null};

  async function applyDecision(row,decision,bucket){
    bucket.candidates.push(sample(row,decision));planned.add(String(row.id));addOwner(owners,row.gmail_thread_id,decision.target);
    if(mode!=='apply'){row.project_id=decision.target;return;}
    const patch={project_id:decision.target,suggested_project_id:decision.target,match_method:decision.method,match_confidence:100,needs_review:false,review_reason:null};
    await patchRow(access,row.id,patch);
    const lk=`${decision.target}|${row.gmail_message_id}`;
    if(row.gmail_message_id&&!knownLinks.has(lk)){await insertLink(access,row,decision.target,decision.method);knownLinks.add(lk);}
    row.project_id=decision.target;row.suggested_project_id=decision.target;row.match_method=decision.method;row.match_confidence=100;row.needs_review=false;
    bucket.applied.push(sample(row,decision));
  }

  function countSkip(reason){
    if(reason==='system-mail')report.skipped.system++;
    else if(reason==='manual-ignored')report.skipped.manual_ignored++;
    else if(reason==='mixed')report.skipped.mixed++;
    else if(reason==='unknown-reference')report.skipped.unknown_reference++;
    else if(reason==='weak-identity-anchor')report.skipped.weak_identity++;
    else if(reason==='thread-conflict')report.skipped.thread_conflict++;
    else if(reason==='insufficient-identity')report.skipped.insufficient_identity++;
  }

  for(const row of pending){
    const decision=classifyEmail(row,index,owners,tools,{allowThread:false});
    if(decision.target&&decision.reason==='strong-identity')await applyDecision(row,decision,report.strong);else countSkip(decision.reason);
  }
  for(const row of pending){
    if(planned.has(String(row.id)))continue;
    const decision=classifyEmail(row,index,owners,tools,{allowThread:true});
    if(decision.target&&decision.reason==='single-project-thread')await applyDecision(row,decision,report.thread);
  }
  report.remaining_estimate=Math.max(0,pending.length-report.strong.candidates.length-report.thread.candidates.length);
  report.contacts=await reconcileProjectContacts(access,emails,mode);
  await writeSummary(report);
  console.log(JSON.stringify(report,null,2));
  console.log(`PROJECT_EMAIL_RECONCILE_SUMMARY mode=${mode} projects=${report.projects} emails=${report.emails} pending=${report.pending_initial} trusted_owner_threads=${report.trusted_owner_threads} strong_candidates=${report.strong.candidates.length} strong_applied=${report.strong.applied.length} thread_candidates=${report.thread.candidates.length} thread_applied=${report.thread.applied.length} remaining_estimate=${report.remaining_estimate} contacts_derived=${report.contacts.derived} contacts_new=${report.contacts.new_rows} contacts_changed=${report.contacts.changed_rows} contacts_inserted=${report.contacts.applied_inserts} contacts_updated=${report.contacts.applied_updates}`);
  return report;
}

const isDirect=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isDirect)runProjectEmailReconcile().catch(async error=>{const report={mode:process.env.EMAIL_RECONCILE_MODE||process.env.SYNC_MODE||'preview',error:String(error?.message||error)};try{await writeSummary(report);}catch{}console.error(report.error);process.exit(1);});
