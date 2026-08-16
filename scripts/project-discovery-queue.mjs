import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { loadIdentityTools, autoEligibleHit } from './project-email-reconcile.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const DISCOVERY_FILE='pristeel-project-discovery.js';
const TERMINAL_STATUSES=new Set(['created','linked','ignored']);

function arr(v){return Array.isArray(v)?v:[];}
function str(v){return String(v??'');}
function unique(values){return[...new Set(arr(values).map(x=>str(x).trim()).filter(Boolean))];}

export async function loadDiscoveryTools(file=DISCOVERY_FILE){
  const source=await readFile(file,'utf8');
  const marker='window.__PSTProjectDiscoveryServerCore={buildCandidates:buildCandidates,projectSignal:projectSignal,clusterKey:clusterKey,systemNoise:systemNoise,coldOutreach:coldOutreach};';
  const instrumented=source.replace(/\}\)\(\);\s*$/,`${marker}\n})();`);
  if(instrumented===source)throw new Error('Could not instrument Project Discovery browser engine');

  const noop=()=>{};
  const makeNode=()=>({
    id:'',className:'',textContent:'',innerHTML:'',style:{},dataset:{},firstChild:null,parentNode:null,
    appendChild:noop,insertBefore:noop,remove:noop,setAttribute:noop,addEventListener:noop,
    querySelector(){return null;},querySelectorAll(){return[];}
  });
  const document={
    head:{appendChild:noop},documentElement:{},body:{appendChild:noop},readyState:'complete',
    createElement:makeNode,getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return[];},addEventListener:noop
  };
  class MutationObserver{constructor(){} observe(){} disconnect(){}}
  const storage=new Map();
  const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
  const window={document,localStorage,supaFetch:async()=>[]};
  const sandbox={
    window,document,localStorage,MutationObserver,
    console:{log:noop,info:noop,warn:noop,error:noop,debug:noop},
    setTimeout:()=>0,clearTimeout:noop,
    alert:noop,confirm:()=>false,prompt:()=>null,
    Date,JSON,Math,Array,Object,String,Number,RegExp,Promise,URL,
  };
  window.window=window;window.MutationObserver=MutationObserver;window.setTimeout=sandbox.setTimeout;window.clearTimeout=noop;
  vm.runInNewContext(instrumented,sandbox,{filename:file,timeout:2500});
  const tools=window.__PSTProjectDiscoveryServerCore;
  if(!tools||typeof tools.buildCandidates!=='function')throw new Error('Project Discovery buildCandidates API unavailable');
  return tools;
}

export function authoritativeMatch(candidate,identityIndex,identityTools){
  const corpus=[candidate?.title,candidate?.ref,...arr(candidate?.subjects),...arr(candidate?.rows).map(r=>`${str(r?.subject)} ${str(r?.snippet)}`)].filter(Boolean).join(' ');
  const result=identityTools.classifyCorpus(corpus,identityIndex);
  if(!result||result.mixed||arr(result.hits).length!==1){
    return{project:null,score:0,state:result?.mixed?'mixed':'none',unknown_refs:arr(result?.unknownRefs)};
  }
  const hit=result.hits[0],project=hit?.project||null;
  if(!project?.id)return{project:null,score:0,state:'none',unknown_refs:arr(result?.unknownRefs)};
  const strong=autoEligibleHit(hit);
  return{
    project,
    score:strong?100:85,
    state:strong?'strong-existing-project':'semantic-existing-project',
    anchors:arr(hit.anchors).map(a=>({kind:a.kind,key:a.key,label:a.label})).slice(0,8),
    unknown_refs:arr(result.unknownRefs),
  };
}

async function request({supabaseUrl,key,path,method='GET',body,prefer='return=minimal'}){
  const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{
    method,
    headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:prefer},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const raw=await response.text();
  if(!response.ok)throw new Error(`${method} ${path} failed: ${response.status} ${raw.slice(0,700)}`);
  if(response.status===204||!raw)return[];
  return JSON.parse(raw);
}
async function fetchAll(access,table,select='*',filter=''){
  const rows=[];
  for(let offset=0;;offset+=1000){
    const path=`${table}?select=${encodeURIComponent(select)}${filter?`&${filter}`:''}&limit=1000&offset=${offset}`;
    const batch=await request({...access,path});rows.push(...batch);if(batch.length<1000)break;
  }
  return rows;
}
async function upsertCandidate(access,row){
  await request({...access,path:'project_discovery_candidates?on_conflict=candidate_key',method:'POST',body:row,prefer:'resolution=merge-duplicates,return=minimal'});
}
async function markStale(access,key){
  await request({...access,path:`project_discovery_candidates?candidate_key=eq.${encodeURIComponent(key)}`,method:'PATCH',body:{status:'stale',updated_at:new Date().toISOString()}});
}
async function writeSummary(report){await mkdir('tmp',{recursive:true});await writeFile('tmp/project-discovery-queue.json',JSON.stringify(report,null,2));}

function candidateRecord(candidate,match,now){
  const rows=arr(candidate.rows);
  return{
    candidate_key:str(candidate.key),
    status:'open',
    title:str(candidate.title).slice(0,240),
    client:str(candidate.client).slice(0,180)||null,
    project_ref:str(candidate.ref).slice(0,160)||null,
    domain:str(candidate.domain).slice(0,180)||null,
    score:Number(candidate.score)||0,
    match_project_id:match?.project?.id||null,
    match_score:Number(match?.score)||0,
    email_ids:unique(rows.map(r=>r?.id)).map(x=>Number(x)).filter(Number.isFinite),
    gmail_message_ids:unique(rows.map(r=>r?.gmail_message_id)),
    gmail_thread_ids:unique(rows.map(r=>r?.gmail_thread_id)),
    subjects:unique(candidate.subjects).slice(-8),
    tags:unique(candidate.tags).slice(0,12),
    attachment_count:Number(candidate.attachments)||0,
    first_seen_at:candidate.first||null,
    last_seen_at:candidate.last||null,
    evidence:{
      discovery_score:Number(candidate.score)||0,
      row_count:rows.length,
      match_state:match?.state||'none',
      match_anchors:match?.anchors||[],
      unknown_refs:match?.unknown_refs||[],
      directions:unique(rows.map(r=>r?.direction)),
      sample_from:unique(rows.map(r=>r?.from_email)).slice(0,6),
    },
    source:'gmail-project-discovery-v1',
    discovered_at:now,
    updated_at:now,
    resolved_at:null,
  };
}

export async function runProjectDiscoveryQueue({
  supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,
  key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'',
  mode=process.env.PROJECT_DISCOVERY_MODE||(String(process.env.APPLY||'false').toLowerCase()==='true'?'apply':'preview'),
  discoveryFile=DISCOVERY_FILE,
}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported PROJECT_DISCOVERY_MODE: ${mode}`);
  if(!key)throw new Error('Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');
  const access={supabaseUrl,key},now=new Date().toISOString();
  const [discoveryTools,identityTools,projects,emails,existing]=await Promise.all([
    loadDiscoveryTools(discoveryFile),
    loadIdentityTools(),
    fetchAll(access,'projects','id,name,client,ref,business_ref,identity_aliases,status,pipeline_stage,created_at'),
    fetchAll(access,'project_emails','id,gmail_message_id,gmail_thread_id,from_email,to_emails,cc_emails,subject,snippet,sent_at,direction,has_attachments,match_method,match_confidence,needs_review,gmail_url','project_id=is.null&order=sent_at.asc'),
    fetchAll(access,'project_discovery_candidates','candidate_key,status,title,score,match_project_id,updated_at')
  ]);

  // Build candidate clusters with the existing browser discovery engine. Existing-project
  // matching is intentionally disabled here and replaced below by the authoritative identity guard.
  const candidates=arr(discoveryTools.buildCandidates(emails,[]));
  const identityIndex=identityTools.buildIndex(projects);
  const existingByKey=new Map(existing.map(x=>[str(x.candidate_key),x]));
  const records=[];
  for(const candidate of candidates){
    const match=authoritativeMatch(candidate,identityIndex,identityTools);
    records.push(candidateRecord(candidate,match,now));
  }

  const report={
    mode,projects:projects.length,unlinked_emails:emails.length,candidates:records.length,
    new_project_candidates:records.filter(x=>!x.match_project_id).length,
    existing_project_suggestions:records.filter(x=>!!x.match_project_id).length,
    high_confidence_new:records.filter(x=>!x.match_project_id&&x.score>=96).length,
    applied:0,staled:0,skipped_resolved:0,
    top:records.slice(0,60).map(x=>({candidate_key:x.candidate_key,title:x.title,score:x.score,client:x.client,project_ref:x.project_ref,match_project_id:x.match_project_id,match_score:x.match_score,row_count:x.evidence.row_count,subjects:x.subjects}))
  };

  if(mode==='apply'){
    const liveKeys=new Set(records.map(x=>x.candidate_key));
    for(const row of records){
      const old=existingByKey.get(row.candidate_key);
      if(old&&TERMINAL_STATUSES.has(str(old.status))){report.skipped_resolved++;continue;}
      await upsertCandidate(access,row);report.applied++;
    }
    for(const old of existing){
      if(!['open','review'].includes(str(old.status)))continue;
      if(liveKeys.has(str(old.candidate_key)))continue;
      await markStale(access,old.candidate_key);report.staled++;
    }
  }

  await writeSummary(report);
  console.log(JSON.stringify(report,null,2));
  console.log(`PROJECT_DISCOVERY_QUEUE_SUMMARY mode=${mode} unlinked_emails=${report.unlinked_emails} candidates=${report.candidates} new=${report.new_project_candidates} existing_suggestions=${report.existing_project_suggestions} high_confidence_new=${report.high_confidence_new} applied=${report.applied} staled=${report.staled}`);
  return report;
}

const isDirect=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isDirect)runProjectDiscoveryQueue().catch(async error=>{const report={mode:process.env.PROJECT_DISCOVERY_MODE||'preview',error:String(error?.message||error)};try{await writeSummary(report);}catch{}console.error(report.error);process.exit(1);});
