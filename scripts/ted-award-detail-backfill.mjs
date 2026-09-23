import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';
import { normalizeTedNotice } from './ted-tender-sync.mjs';

const DEFAULT_SUPABASE_URL='https://awqfpnzqwfjrjefoktgd.supabase.co';
const TED_API='https://api.ted.europa.eu/v3/notices/search';
const DETAIL_FIELDS=[
  'publication-number','notice-title','notice-type','publication-date','buyer-name','classification-cpv','place-of-performance',
  'title-proc','title-lot','description-proc','description-lot',
  'estimated-value-proc','estimated-value-cur-proc','estimated-value-lot','estimated-value-cur-lot',
  'result-value-notice','result-value-cur-notice','result-value-lot','result-value-cur-lot',
  'winner-decision-date'
];

const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const asPayload=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};

async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){
  const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{
    method,
    headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const raw=await response.text();
  if(!response.ok)throw new Error(`${method} ${path} failed: HTTP ${response.status} ${raw.slice(0,700)}`);
  return raw?JSON.parse(raw):[];
}

function hasDescription(row){
  const p=asPayload(row?.payload);
  return !!text(p.description||p.short_description||p?.ted_details?.description||p?.ted_details?.procedure_description);
}

export function backfillCandidates(rows,{maxRows=400}={}){
  return (Array.isArray(rows)?rows:[])
    .filter(row=>{
      const p=asPayload(row?.payload);
      const status=text(row?.status).toLowerCase();
      return text(p.source).toUpperCase()==='TED'
        && text(p.notice_phase).toLowerCase()==='award'
        && ['new','review','watch','promoted'].includes(status)
        && !!text(row?.publication_no)
        && !hasDescription(row);
    })
    .sort((a,b)=>String(b?.published_date||'').localeCompare(String(a?.published_date||''))||Number(b?.relevance_score||0)-Number(a?.relevance_score||0))
    .slice(0,Math.max(0,Number(maxRows)||0));
}

function usefulDetails(details){
  if(!details||typeof details!=='object')return false;
  return !!(
    text(details.description)
    ||text(details.procedure_description)
    ||(Array.isArray(details.lot_titles)&&details.lot_titles.length)
    ||(Array.isArray(details.lot_descriptions)&&details.lot_descriptions.length)
    ||details.value_amount!=null
    ||text(details.award_date)
    ||(Array.isArray(details.place_of_performance)&&details.place_of_performance.length)
  );
}

function mergeDetails(oldDetails,newDetails){
  const out={...(oldDetails&&typeof oldDetails==='object'?oldDetails:{})};
  for(const [key,value] of Object.entries(newDetails&&typeof newDetails==='object'?newDetails:{})){
    if(value==null)continue;
    if(Array.isArray(value)&&!value.length)continue;
    if(typeof value==='string'&&!value.trim())continue;
    out[key]=value;
  }
  return out;
}

export function buildDetailPatch(row,notice,seenAt=new Date().toISOString()){
  const normalized=normalizeTedNotice(notice,'award',seenAt);
  if(!normalized)return null;
  const fresh=asPayload(normalized.payload),details=asPayload(fresh.ted_details);
  if(!usefulDetails(details))return null;

  const payload={...asPayload(row?.payload)};
  const description=text(fresh.description||details.description||details.procedure_description);
  if(description){
    payload.description=description;
    payload.short_description=description.slice(0,700);
  }
  payload.ted_details=mergeDetails(payload.ted_details,details);

  const patch={payload,updated_at:seenAt};
  if(text(normalized.title))patch.title=normalized.title;
  if(text(normalized.authority))patch.authority=normalized.authority;
  if(normalized.estimated_value!=null)patch.estimated_value=normalized.estimated_value;
  if(text(normalized.currency))patch.currency=normalized.currency;
  return patch;
}

async function tedRequest(publications,{fetchImpl=fetch}={}){
  const query=`publication-number IN (${publications.join(' ')})`;
  const response=await fetchImpl(TED_API,{
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({
      query,fields:DETAIL_FIELDS,page:1,limit:Math.min(250,Math.max(1,publications.length)),
      scope:'ALL',checkQuerySyntax:false,paginationMode:'PAGE_NUMBER',onlyLatestVersions:true
    })
  });
  const raw=await response.text();
  if(!response.ok)throw new Error(`TED detail lookup HTTP ${response.status}: ${raw.slice(0,1000)}`);
  let json;try{json=JSON.parse(raw);}catch{throw new Error(`TED detail lookup returned non-JSON: ${raw.slice(0,500)}`);}
  if(json&&json.timedOut===true)throw new Error('TED detail lookup timed out.');
  return Array.isArray(json?.notices)?json.notices:Array.isArray(json?.results)?json.results:[];
}

export async function fetchTedDetails(publications,{fetchImpl=fetch}={}){
  const refs=[...new Set((publications||[]).map(text).filter(Boolean))];
  if(!refs.length)return[];
  try{return await tedRequest(refs,{fetchImpl});}
  catch(error){
    if(refs.length===1)throw error;
    const mid=Math.ceil(refs.length/2);
    const left=await fetchTedDetails(refs.slice(0,mid),{fetchImpl});
    const right=await fetchTedDetails(refs.slice(mid),{fetchImpl});
    return left.concat(right);
  }
}

function publicationOf(notice){return text(notice?.['publication-number']??notice?.fields?.['publication-number']??notice?.data?.['publication-number']);}

async function writeSummary(summary){
  await mkdir('tmp',{recursive:true});
  await writeFile('tmp/ted-award-detail-backfill.json',JSON.stringify(summary,null,2));
}

export async function runTedAwardDetailBackfill({
  mode=process.env.SYNC_MODE||'preview',
  maxRows=Number(process.env.TED_DETAIL_BACKFILL_MAX_ROWS||400),
  batchSize=Number(process.env.TED_DETAIL_BATCH_SIZE||25),
  supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,
  apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'',
  bearerToken='',
  fetchImpl=fetch
}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const access=apiKey?{supabaseUrl,apiKey,bearerToken:bearerToken||apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl,fetchImpl});
  const rows=await rest({...access,path:'kek_tender_watch?select=id,source_key,publication_no,title,authority,status,relevance_score,published_date,estimated_value,currency,payload&status=in.(new,review,watch,promoted)&order=published_date.desc.nullslast&limit=1200'});
  const candidates=backfillCandidates(rows,{maxRows});
  const byPublication=new Map(candidates.map(row=>[text(row.publication_no),row]));
  const results=[];
  const size=Math.max(1,Math.min(50,Number(batchSize)||25));

  for(let i=0;i<candidates.length;i+=size){
    const refs=candidates.slice(i,i+size).map(row=>text(row.publication_no));
    let notices=[];
    try{notices=await fetchTedDetails(refs,{fetchImpl});}
    catch(error){
      results.push(...refs.map(publication_no=>({publication_no,status:'error',error:String(error?.message||error)})));
      continue;
    }
    const found=new Set();
    for(const notice of notices){
      const publication_no=publicationOf(notice),row=byPublication.get(publication_no);
      if(!row)continue;
      found.add(publication_no);
      const patch=buildDetailPatch(row,notice);
      if(!patch){
        results.push({publication_no,status:'no_official_details'});
        continue;
      }
      if(mode==='apply'){
        await rest({...access,path:`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,method:'PATCH',body:patch,prefer:'return=minimal'});
      }
      results.push({
        publication_no,status:mode==='apply'?'updated':'would_update',
        has_description:!!text(patch.payload?.description),
        has_value:patch.estimated_value!=null,
        award_date:patch.payload?.ted_details?.award_date||null
      });
    }
    for(const publication_no of refs)if(!found.has(publication_no))results.push({publication_no,status:'not_found_in_ted'});
  }

  const summary={
    mode,auth_mode:access.authMode,version:'ted-award-detail-backfill-v1',
    scanned:Array.isArray(rows)?rows.length:0,candidates:candidates.length,
    updated:results.filter(x=>x.status==='updated').length,
    would_update:results.filter(x=>x.status==='would_update').length,
    no_official_details:results.filter(x=>x.status==='no_official_details').length,
    not_found:results.filter(x=>x.status==='not_found_in_ted').length,
    errors:results.filter(x=>x.status==='error').length,
    with_description:results.filter(x=>x.has_description).length,
    with_value:results.filter(x=>x.has_value).length,
    results
  };
  await writeSummary(summary);
  console.log(`TED award detail backfill ${mode}: candidates=${summary.candidates}, updated=${summary.updated}, would_update=${summary.would_update}, no_details=${summary.no_official_details}, not_found=${summary.not_found}, errors=${summary.errors}.`);
  return summary;
}

const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct)runTedAwardDetailBackfill().catch(async error=>{try{await writeSummary({error:String(error?.message||error),mode:process.env.SYNC_MODE||'preview'});}catch{}console.error(error?.message||error);process.exit(1);});
