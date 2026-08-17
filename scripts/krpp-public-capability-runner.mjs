import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';
import { parseNoticeIndexHtml, parseDetailHtml } from './krpp-public-steel-sync.mjs';
import { assessPristeelTender, attachCapabilityPayload, capabilityCandidateHint, PRISTEEL_CAPABILITY_PROFILE_VERSION } from './pristeel-capability-profile.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const KRPP_ORIGIN='https://e-prokurimi.rks-gov.net';
const DEFAULT_INDEX_URL=`${KRPP_ORIGIN}/SPIN_PROD/application/ipn/DocumentManagement/NewPreglediDokumenataFrm.aspx`;
const ACTIONABLE_NOTICE_TYPES=new Set(['B05','B54']);
const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function classifyKrppOpportunity(row){return assessPristeelTender(row);}
// Backward-compatible export for existing tests/callers while semantics move from keyword steel to PRISTEEL capability fit.
export const classifyKrppSteel=classifyKrppOpportunity;

export function selectCandidates(notices,{recentDateCount=30,fullScanDateCount=2,maxCandidates=240}={}){
  const dates=[...new Set((notices||[]).map(x=>x.published_date).filter(Boolean))].sort((a,b)=>b.localeCompare(a)).slice(0,recentDateCount);
  const allowed=new Set(dates),full=new Set(dates.slice(0,fullScanDateCount)),out=[];
  for(const x of notices||[]){
    if(allowed.size&&x.published_date&&!allowed.has(x.published_date))continue;
    const type=text(x.notice_type).toUpperCase();
    if(type&&!ACTIONABLE_NOTICE_TYPES.has(type))continue;
    const direct=classifyKrppOpportunity({title:x.title});
    const hint=capabilityCandidateHint(x.title);
    // Every notice on the newest publication dates is detail-scanned. This is what lets us discover hidden PRISTEEL packages
    // whose title says e.g. substation rehabilitation or conveyor repair rather than steel.
    const scan=!!x.published_date&&full.has(x.published_date);
    if(!scan&&direct.relevance_score<20&&!hint)continue;
    out.push({...x,candidate_score:Math.max(direct.relevance_score,hint?25:0,scan?15:0),candidate_full_scan:scan,candidate_hint:hint||null});
  }
  return out.sort((a,b)=>Number(b.candidate_full_scan)-Number(a.candidate_full_scan)||b.candidate_score-a.candidate_score).slice(0,maxCandidates);
}

function sourceKey(r){return text(r.publication_no)||`KRPP:${text(r.procurement_no)}:${createHash('sha1').update(norm(r.title)).digest('hex').slice(0,14)}`;}

export function prepareRows(rows,{seenAt=new Date().toISOString(),minScore=35,today=new Date()}={}){
  const todayIso=today.toISOString().slice(0,10);
  return(rows||[]).map(r=>{
    const assessment=classifyKrppOpportunity(r);
    return attachCapabilityPayload({...r,source_key:sourceKey(r),last_seen_at:seenAt,updated_at:seenAt},assessment);
  }).filter(r=>r.relevance_score>=minScore).filter(r=>!r.deadline||r.deadline>=todayIso);
}

async function getHtml(url,{timeoutMs=20000,referer=KRPP_ORIGIN}={}){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);
  try{
    const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 AppleWebKit/537.36 Chrome/151 Safari/537.36','Accept-Language':'sq-AL,sq;q=0.9,en;q=0.7',Referer:referer},signal:c.signal,redirect:'follow'});
    const b=await r.text();
    if(!r.ok)throw new Error(`KRPP HTTP ${r.status}`);
    return b;
  }finally{clearTimeout(t);}
}

async function mapLimit(items,limit,worker){
  const out=new Array(items.length);let cur=0;
  async function run(){while(true){const i=cur++;if(i>=items.length)return;try{out[i]=await worker(items[i]);}catch(e){out[i]={__error:String(e?.message||e),__item:items[i]};}}}
  await Promise.all(Array.from({length:Math.max(1,Math.min(limit,items.length||1))},run));
  return out;
}

async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){
  const r=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await r.text();
  if(!r.ok)throw new Error(`${method} ${path} failed: HTTP ${r.status} ${raw.slice(0,500)}`);
  return raw?JSON.parse(raw):[];
}

async function upsert(access,rows){
  if(!rows.length)return;
  const body=rows.map(r=>({
    source_key:r.source_key,procurement_no:r.procurement_no,publication_no:r.publication_no,authority:r.authority,title:r.title,document_type:r.document_type,
    fpp:r.fpp,fpp_description:r.fpp_description,contract_type:r.contract_type,contract_value_band:r.contract_value_band,procedure:r.procedure,
    estimated_value:r.estimated_value,currency:r.currency||'EUR',deadline:r.deadline,published_date:r.published_date,is_retender:!!r.is_retender,
    category:r.category,relevance_score:r.relevance_score,match_reasons:r.match_reasons||[],source_url:r.source_url,detail_url:r.detail_url,payload:r.payload||{},
    last_seen_at:r.last_seen_at,updated_at:r.updated_at
  }));
  await rest({...access,path:'kek_tender_watch?on_conflict=source_key',method:'POST',body,prefer:'resolution=merge-duplicates,return=minimal'});
}

async function writeSummary(s){await mkdir('tmp',{recursive:true});await writeFile('tmp/krpp-public-steel-sync.json',JSON.stringify(s,null,2));}

export async function run({
  mode=process.env.SYNC_MODE||'preview',sourceUrl=process.env.KRPP_PUBLIC_INDEX_URL||DEFAULT_INDEX_URL,minScore=Number(process.env.KRPP_PUBLIC_MIN_SCORE||35),
  recentDateCount=Number(process.env.KRPP_PUBLIC_RECENT_DATE_COUNT||30),fullScanDateCount=Number(process.env.KRPP_PUBLIC_FULL_SCAN_DATES||2),
  maxCandidates=Number(process.env.KRPP_PUBLIC_MAX_CANDIDATES||240),detailConcurrency=Number(process.env.KRPP_PUBLIC_DETAIL_CONCURRENCY||5),
  supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||''
}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const notices=parseNoticeIndexHtml(await getHtml(sourceUrl),sourceUrl);
  if(!notices.length)throw new Error('KRPP public index returned zero notice links.');
  const candidates=selectCandidates(notices,{recentDateCount,fullScanDateCount,maxCandidates});
  const results=await mapLimit(candidates,detailConcurrency,async x=>parseDetailHtml(await getHtml(x.detail_url,{referer:sourceUrl}),x.detail_url,x));
  const failures=results.filter(x=>x&&x.__error),rows=results.filter(x=>x&&!x.__error&&x.authority&&x.title);
  if(candidates.length&&failures.length===candidates.length)throw new Error(`All ${candidates.length} KRPP detail requests failed.`);

  const seenAt=new Date().toISOString();
  const assessed=rows.map(r=>attachCapabilityPayload(r,classifyKrppOpportunity(r))).filter(r=>r.relevance_score>=minScore);
  const relevant=prepareRows(rows,{seenAt,minScore});
  let authMode='not_needed';
  if(mode==='apply'&&relevant.length){
    const access=apiKey?{supabaseUrl,apiKey,bearerToken:apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});
    authMode=access.authMode;await upsert(access,relevant);
  }
  const reviewCount=relevant.filter(r=>r.payload?.capability_review_required).length;
  const strongCount=relevant.filter(r=>r.payload?.capability_fit==='strong').length;
  const summary={
    mode,auth_mode:authMode,classifier:'pristeel-capability-fit-v1',capability_profile_version:PRISTEEL_CAPABILITY_PROFILE_VERSION,source:'KRPP',
    notice_links:notices.length,index_candidates:candidates.length,detail_failures:failures.length,capability_scored_rows:assessed.length,
    expired_filtered:assessed.length-relevant.length,relevant_rows:relevant.length,strong_matches:strongCount,review_matches:reviewCount,minimum_score:minScore,
    priority:relevant.reduce((a,r)=>(a[r.payload?.authority_priority||'other']=(a[r.payload?.authority_priority||'other']||0)+1,a),{}),
    tenders:relevant.map(r=>({procurement_no:r.procurement_no,authority:r.authority,authority_priority:r.payload?.authority_priority,title:r.title,fpp:r.fpp,category:r.category,
      relevance_score:r.relevance_score,capability_fit:r.payload?.capability_fit,capability_review_required:!!r.payload?.capability_review_required,
      capability_matches:r.payload?.capability_matches||[],published_date:r.published_date,deadline:r.deadline,match_reasons:r.match_reasons}))
  };
  await writeSummary(summary);
  console.log(`KRPP capability monitor ${mode}: notices=${notices.length}, candidates=${candidates.length}, relevant=${relevant.length}, review=${reviewCount}.`);
  return summary;
}

const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct){run().catch(async e=>{try{await writeSummary({error:String(e?.message||e),mode:process.env.SYNC_MODE||'preview'});}catch{}console.error(e);process.exit(1);});}
