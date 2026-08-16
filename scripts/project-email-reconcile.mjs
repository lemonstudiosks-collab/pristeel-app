import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const GUARD_FILE='pristeel-gmail-project-identity-guard-v1.js';

function arr(v){return Array.isArray(v)?v:[];}
function str(v){return String(v??'');}
function uniq(v){return [...new Set(arr(v).map(x=>str(x).trim()).filter(Boolean))];}
function systemMail(row){const s=`${str(row?.subject)} ${str(row?.snippet)}`.toLowerCase();return /delivery status notification|mail delivery subsystem|mailer-daemon|postmaster|undeliverable|calendar notification|hubspot notification/.test(s);}
function manualIgnored(row){return str(row?.match_method).toLowerCase()==='manual-ignored';}
function eligibleAnchor(a){
  const kind=str(a?.kind),key=str(a?.key);
  if(kind==='semantic'||kind==='semantic_phrase')return true;
  if(kind==='name_ref')return key.length>=6;
  if(kind==='ref'||kind==='business_ref')return key.length>=5&&(/\d/.test(key)||key.length>=10);
  return false;
}
export function autoEligibleHit(hit){return arr(hit?.anchors).some(eligibleAnchor);}

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
  for(const row of rows)if(row?.project_id)add(row.gmail_thread_id,row.project_id);
  for(const link of links)if(link?.project_id)add(link.gmail_thread_id,link.project_id);
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

async function request({supabaseUrl,key,path,method='GET',body}){
  const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=minimal'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await response.text();if(!response.ok)throw new Error(`${method} ${path} failed: ${response.status} ${raw.slice(0,700)}`);if(response.status===204||!raw)return[];return JSON.parse(raw);
}
async function fetchAll(access,table,select='*'){const rows=[];for(let offset=0;;offset+=1000){const batch=await request({...access,path:`${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${offset}`});rows.push(...batch);if(batch.length<1000)break;}return rows;}
async function patchRow(access,id,patch){await request({...access,path:`project_emails?id=eq.${encodeURIComponent(id)}`,method:'PATCH',body:patch});}
async function insertLink(access,row,target,method){await request({...access,path:'project_email_links',method:'POST',body:{project_id:target,gmail_message_id:row.gmail_message_id,gmail_thread_id:row.gmail_thread_id||null,link_method:method,confidence:100,created_at:new Date().toISOString()}});}
async function writeSummary(report){await mkdir('tmp',{recursive:true});await writeFile('tmp/project-email-reconcile.json',JSON.stringify(report,null,2));}
function sample(row,decision){return{id:row.id,gmail_message_id:row.gmail_message_id,gmail_thread_id:row.gmail_thread_id,subject:row.subject||'',sent_at:row.sent_at||null,target_project_id:decision.target||null,reason:decision.reason,anchors:arr(decision.result?.hits?.[0]?.anchors).map(a=>({kind:a.kind,key:a.key,label:a.label})).slice(0,5),unknown_refs:arr(decision.result?.unknownRefs).slice(0,5)};}

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
    fetchAll(access,'projects','id,name,client,ref,business_ref,status,created_at'),
    fetchAll(access,'project_emails','id,gmail_message_id,gmail_thread_id,project_id,suggested_project_id,sent_at,direction,subject,from_email,to_emails,cc_emails,snippet,match_method,match_confidence,needs_review'),
    fetchAll(access,'project_email_links','id,gmail_message_id,gmail_thread_id,project_id,link_method,confidence')
  ]);
  const index=tools.buildIndex(projects),owners=ownerMap(emails,links),knownLinks=new Set(links.filter(x=>x.project_id&&x.gmail_message_id).map(x=>`${x.project_id}|${x.gmail_message_id}`));
  const pending=emails.filter(x=>!x.project_id),planned=new Set();
  const report={mode,projects:projects.length,emails:emails.length,pending_initial:pending.length,strong:{candidates:[],applied:[]},thread:{candidates:[],applied:[]},skipped:{system:0,manual_ignored:0,mixed:0,unknown_reference:0,weak_identity:0,thread_conflict:0,insufficient_identity:0},remaining_estimate:pending.length};

  async function applyDecision(row,decision,bucket){
    bucket.candidates.push(sample(row,decision));planned.add(String(row.id));addOwner(owners,row.gmail_thread_id,decision.target);
    if(mode!=='apply')return;
    const patch={project_id:decision.target,suggested_project_id:decision.target,match_method:decision.method,match_confidence:100,needs_review:false,review_reason:null};
    await patchRow(access,row.id,patch);
    const lk=`${decision.target}|${row.gmail_message_id}`;
    if(row.gmail_message_id&&!knownLinks.has(lk)){await insertLink(access,row,decision.target,decision.method);knownLinks.add(lk);}
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
  await writeSummary(report);
  console.log(JSON.stringify(report,null,2));
  console.log(`PROJECT_EMAIL_RECONCILE_SUMMARY mode=${mode} projects=${report.projects} emails=${report.emails} pending=${report.pending_initial} strong_candidates=${report.strong.candidates.length} strong_applied=${report.strong.applied.length} thread_candidates=${report.thread.candidates.length} thread_applied=${report.thread.applied.length} remaining_estimate=${report.remaining_estimate}`);
  return report;
}

const isDirect=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isDirect)runProjectEmailReconcile().catch(async error=>{const report={mode:process.env.EMAIL_RECONCILE_MODE||process.env.SYNC_MODE||'preview',error:String(error?.message||error)};try{await writeSummary(report);}catch{}console.error(report.error);process.exit(1);});
