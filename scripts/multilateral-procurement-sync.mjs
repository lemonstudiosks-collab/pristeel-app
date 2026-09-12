import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';
import { SOURCE_REGISTRY, clean, htmlToText, isoDate, phase, docType, dateAfter, parseHeadingRecords, parseUngm, parseEaas, normalizeRecord, filterActionable, dedupe } from './multilateral-procurement-core.mjs';

const SUPABASE='https://isymxqfqzkchbsrbhucf.supabase.co';
const UA='PriSteel-PPPP-Procurement-Monitor/1.0 (+https://prissteel.com)';
const UNGM_PUBLIC_SEARCH='https://www.ungm.org/Public/Notice/Search';
const UNGM_KOSOVO_COUNTRY_ID=2525;
const EBRD_KOSOVO_SEARCH='https://ecepp.ebrd.com/delta/noticeSearchResults.html?form_fields%5Bkeyword%5D=Kosovo&form_fields%5BnoticeType%5D=&form_fields%5Bstatus%5D=&form_id=190d54e&locale=en&post_id=544&queried_id=10&referer_title=Welcome+to+the+EBRD+Client+e-Procurement+Portal+%28ECEPP%29+-+ECEPP';
const EEAS_KOSOVO_TENDER_SEARCH='https://www.eeas.europa.eu/eeas/tenders_en?f%5B0%5D=tender_site%3AKosovo%2A';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const uniq=xs=>[...new Set(xs.filter(Boolean))];

async function fetchOk(url,{timeout=30000,accept='text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',method='GET',body,headers={}}={}){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(url,{method,redirect:'follow',headers:{'User-Agent':UA,Accept:accept,...headers},body,signal:c.signal});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return r;
  }finally{clearTimeout(t);}
}

const detailParser=(s,h)=>s.key==='UNGM'?parseUngm(h,s):s.key==='EU_OFFICE_KOSOVO'?parseEaas(h,s):parseHeadingRecords(h,s)[0]||null;

function wbRecord(o){
  const pick=(...ks)=>ks.map(k=>o?.[k]).find(v=>v!=null&&clean(v))??'';
  const title=pick('notice_title','procurement_notice_title','title','procurement_title','project_name');
  if(!title)return null;
  return{title,body:clean(JSON.stringify(o)),authority:pick('borrower','agency','client_name','implementing_agency','project_name')||'World Bank',reference:pick('notice_id','procurement_notice_id','reference_no','procurement_ref','project_id','id'),published_date:isoDate(pick('publication_date','published_date','publication_dt','date'))||null,deadline:isoDate(pick('deadline_date','submission_deadline','closing_date','deadline'))||null,notice_phase:phase(title,pick('notice_type','status','type')),document_type:pick('notice_type','procurement_method','type')||docType(title),contract_type:pick('procurement_category','procurement_type','category'),detail_url:pick('url','notice_url','detail_url')||null,currency:pick('currency'),estimated_value:Number(pick('estimated_amount','amount'))||null};
}

function largestArray(v){
  const a=[];
  (function walk(x){if(Array.isArray(x)){if(x.some(y=>y&&typeof y==='object'&&!Array.isArray(y)))a.push(x);x.forEach(walk);}else if(x&&typeof x==='object')Object.values(x).forEach(walk);})(v);
  return a.sort((x,y)=>y.length-x.length)[0]||[];
}

function mcaLoose(html,s){
  const t=htmlToText(html),parts=t.split(/(?=(?:Ongoing|Closed|Award notice|General Procurement Notice|Specific Procurement Notice|Funding opportunities)\s+Published\s*:)/gi),out=[];
  for(const p of parts){
    if(!/Published\s*:/i.test(p))continue;
    const status=clean(p.match(/^(Ongoing|Closed|Award notice|General Procurement Notice|Specific Procurement Notice|Funding opportunities)/i)?.[1]),published=dateAfter(p,['Published'])||null,deadline=dateAfter(p,['Deadline'])||null;
    let title=clean(p.replace(/^(?:Ongoing|Closed|Award notice|General Procurement Notice|Specific Procurement Notice|Funding opportunities)\s*/i,'').replace(/Published\s*:\s*\S+(?:\s+\d{4})?/i,'').replace(/^Deadline\s*:\s*\S+(?:\s+\d{4})?/i,''));
    if(deadline){const q=p.split(/\bDeadline\s*:/i)[1];if(q)title=clean(q.replace(/^\s*\S+(?:\s+\d{4})?/,'')).slice(0,320);}
    if(title.length<8)continue;
    out.push({title,body:p,authority:'MCA-Kosovo',reference:'',published_date:published,deadline,notice_phase:/award/i.test(status)?'award':/closed/i.test(status)?'closed':'opportunity',document_type:docType(title,p),detail_url:s.url});
  }
  return out;
}

function ungmSearchPayload(PageIndex){
  return{PageIndex,PageSize:50,Title:'',Description:'',Reference:'',PublishedFrom:'',PublishedTo:'',DeadlineFrom:'',DeadlineTo:'',Countries:[UNGM_KOSOVO_COUNTRY_ID],Agencies:[],UNSPSCs:[],NoticeTypes:[],SortField:'DatePublished',SortAscending:false,isPicker:false,NoticeTASStatus:[],IsSustainable:false,NoticeDisplayType:null,NoticeSearchTotalLabelId:'noticeSearchTotal',TypeOfCompetitions:[]};
}

function ungmNoticeIds(html){return uniq([...String(html??'').matchAll(/data-noticeid\s*=\s*["']?(\d+)/gi)].map(m=>m[1]));}

export function ebrdKosovoLinks(html,base=EBRD_KOSOVO_SEARCH){
  return uniq(parseEbrdListingRows(html,base).map(r=>r.detail_url));
}

export function parseEbrdListingRows(html,base=EBRD_KOSOVO_SEARCH){
  const out=[];
  for(const row of [...String(html??'').matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map(m=>m[0])){
    if(!/\bKosovo\b/i.test(row)||!/viewNotice\.html/i.test(row))continue;
    const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
    const linkMatch=row.match(/href\s*=\s*["']([^"']*viewNotice\.html[^"']*)["']/i);
    if(!linkMatch)continue;
    let detail='';
    try{detail=new URL(linkMatch[1].replace(/&amp;/gi,'&'),base).toString();}catch{continue;}
    const titleCell=htmlToText(cells[0]||'');
    const noticeType=htmlToText(cells[1]||'');
    const exercise=htmlToText(cells[2]||'');
    const datePrimary=isoDate(htmlToText(cells[3]||''));
    const accessMode=htmlToText(cells[5]||'');
    const issueDate=isoDate(htmlToText(cells[6]||''));
    const metadata=htmlToText(cells[9]||'');
    const body=clean(`${htmlToText(row)} ${metadata}`);
    const reference=new URL(detail).searchParams.get('displayNoticeId')||'';
    const title=exercise||titleCell;
    const noticePhase=phase(noticeType||title,body);
    const contractType=/\bworks?\b/i.test(body)?'Works':/\bconsult(?:ancy|ing)\b/i.test(body)?'Consultancy':/\bgoods?\b|\bsuppl(?:y|ies)\b/i.test(body)?'Goods':'';
    const deadline=noticePhase==='opportunity'&&!/information only/i.test(accessMode)?(datePrimary||null):null;
    out.push({title,body,authority:'EBRD ECEPP',reference,published_date:issueDate||datePrimary||null,deadline,notice_phase:noticePhase,document_type:noticeType||docType(title,body),contract_type:contractType||null,detail_url:detail});
  }
  return out;
}

export function eeasKosovoTenderLinks(html,base=EEAS_KOSOVO_TENDER_SEARCH){
  const out=[];
  for(const m of String(html??'').matchAll(/href\s*=\s*["']([^"']*delegations\/kosovo[^"']*)["']/gi)){
    const href=m[1].replace(/&amp;/gi,'&');
    if(/(?:vacancy|news|press|event|story|project)/i.test(href))continue;
    try{out.push(new URL(href,base).toString());}catch{}
  }
  return uniq(out);
}

async function fetchDetailRows(s,links){
  const out=[];
  for(const url of links.slice(0,s.maxDetails||60)){
    let h='';
    for(let attempt=1;attempt<=2;attempt++){
      try{h=await(await fetchOk(url,{timeout:20000})).text();break;}
      catch(e){
        if(attempt<2&&/HTTP 429/.test(String(e?.message||e))){await sleep(1200);continue;}
        console.warn(`${s.key} detail skipped: ${e.message}`);h='';break;
      }
    }
    if(!h)continue;
    const r=detailParser({...s,url},h);
    if(r)out.push({...r,detail_url:url,body:clean(r.body||htmlToText(h)).slice(0,12000)});
    if(s.key==='UNGM')await sleep(180);
  }
  return out;
}

async function collectUngm(s){
  const ids=[];
  for(let page=0;page<3&&ids.length<(s.maxDetails||60);page++){
    const r=await fetchOk(UNGM_PUBLIC_SEARCH,{method:'POST',accept:'text/html,*/*;q=0.8',headers:{'Content-Type':'application/json','Referer':'https://www.ungm.org/Public/Notice'},body:JSON.stringify(ungmSearchPayload(page))});
    const html=await r.text(),pageIds=ungmNoticeIds(html);
    if(!pageIds.length)break;
    for(const id of pageIds)if(!ids.includes(id))ids.push(id);
  }
  return fetchDetailRows(s,ids.map(id=>`https://www.ungm.org/Public/Notice/${id}`));
}

async function collectEbrd(){
  const listing=process.env.EBRD_NOTICE_SEARCH_URL||EBRD_KOSOVO_SEARCH;
  const html=await(await fetchOk(listing,{headers:{Referer:'https://ecepp.ebrd.com/'}})).text();
  const rows=parseEbrdListingRows(html,listing);
  if(!rows.length)console.warn('EBRD_ECEPP listing returned no Kosovo notice rows.');
  return rows;
}

async function collectEaas(s){
  const listing=process.env.EEAS_KOSOVO_TENDERS_URL||EEAS_KOSOVO_TENDER_SEARCH;
  const html=await(await fetchOk(listing,{headers:{Referer:'https://www.eeas.europa.eu/'}})).text();
  const links=eeasKosovoTenderLinks(html,listing);
  if(!links.length)console.warn('EU_OFFICE_KOSOVO: no current Kosovo tender links on the official EEAS tender facet.');
  return fetchDetailRows(s,links);
}

async function collect(s){
  if(s.kind==='world-bank'){
    const j=await(await fetchOk(process.env.WORLD_BANK_PROC_NOTICES_URL||s.url,{accept:'application/json,*/*;q=0.8'})).json();
    return largestArray(j).map(wbRecord).filter(Boolean);
  }
  if(s.key==='UNGM')return collectUngm(s);
  if(s.key==='EBRD_ECEPP')return collectEbrd();
  if(s.key==='EU_OFFICE_KOSOVO')return collectEaas(s);
  const html=await(await fetchOk(s.url)).text();
  const rows=parseHeadingRecords(html,s);
  if(s.key==='MCA_KOSOVO')rows.push(...mcaLoose(html,s));
  return rows;
}

async function rest(a,path,body){
  const r=await fetch(`${a.supabaseUrl}/rest/v1/${path}`,{method:'POST',headers:{apikey:a.apiKey,Authorization:`Bearer ${a.bearerToken||a.apiKey}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)}),x=await r.text();
  if(!r.ok)throw new Error(`POST ${path} failed: HTTP ${r.status} ${x.slice(0,500)}`);
}

async function upsert(a,rows){
  const data=rows.map(r=>({source_key:r.source_key,procurement_no:r.procurement_no,publication_no:r.publication_no,authority:r.authority,title:r.title,document_type:r.document_type,fpp:r.fpp,fpp_description:r.fpp_description,contract_type:r.contract_type,contract_value_band:r.contract_value_band,procedure:r.procedure,estimated_value:r.estimated_value,currency:r.currency,deadline:r.deadline,published_date:r.published_date,is_retender:!!r.is_retender,category:r.category,relevance_score:r.relevance_score,match_reasons:r.match_reasons||[],source_url:r.source_url,detail_url:r.detail_url,payload:r.payload,last_seen_at:r.last_seen_at,updated_at:r.updated_at}));
  for(let i=0;i<data.length;i+=40)await rest(a,'kek_tender_watch?on_conflict=source_key',data.slice(i,i+40));
}

async function save(x){await mkdir('tmp',{recursive:true});await writeFile('tmp/multilateral-procurement-sync.json',JSON.stringify(x,null,2));}

export async function run({mode=process.env.SYNC_MODE||'preview',minScore=Number(process.env.MULTILATERAL_MIN_SCORE||45),recentDays=Number(process.env.MULTILATERAL_RECENT_DAYS||120),onlySource=process.env.MULTILATERAL_SOURCE||'',supabaseUrl=process.env.SUPABASE_URL||SUPABASE,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||''}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const sources=SOURCE_REGISTRY.filter(s=>!onlySource||s.key===onlySource);
  if(!sources.length)throw new Error(`Unknown MULTILATERAL_SOURCE: ${onlySource}`);
  const seen=new Date().toISOString(),all=[],status=[];
  for(const s of sources){
    try{
      const raw=await collect(s),rows=filterActionable(raw.map(r=>normalizeRecord(r,s,seen)).filter(Boolean),{minScore,recentDays});
      all.push(...rows);
      status.push({source:s.key,status:'ok',fetched:raw.length,relevant:rows.length});
      console.log(`${s.key}: fetched=${raw.length}, relevant=${rows.length}`);
    }catch(e){
      status.push({source:s.key,status:'error',error:String(e?.message||e)});
      console.error(`${s.key}: ${e?.message||e}`);
    }
  }
  const rows=dedupe(all);
  let auth_mode='not_needed';
  if(mode==='apply'&&rows.length){
    const a=apiKey?{supabaseUrl,apiKey,bearerToken:apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});
    auth_mode=a.authMode;
    await upsert(a,rows);
  }
  const summary={mode,auth_mode,minimum_score:minScore,recent_days:recentDays,sources:status,rows:rows.length,by_source:rows.reduce((a,r)=>(a[r.payload.source]=(a[r.payload.source]||0)+1,a),{}),by_sector:rows.reduce((a,r)=>(a[r.payload.sector]=(a[r.payload.sector]||0)+1,a),{}),tenders:rows.map(r=>({source:r.payload.source,reference:r.procurement_no,authority:r.authority,title:r.title,deadline:r.deadline,sector:r.payload.sector,fit:r.payload.pristeel_fit,competition_mode:r.payload.competition_mode,score:r.relevance_score,recommended_lane:r.payload.recommended_lane}))};
  await save(summary);
  if(status.every(s=>s.status==='error'))throw new Error(`All procurement sources failed: ${status.map(s=>`${s.source}: ${s.error}`).join('; ')}`);
  return summary;
}

const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct)run().catch(async e=>{try{await save({mode:process.env.SYNC_MODE||'preview',error:String(e?.message||e)});}catch{}console.error(e?.message||e);process.exit(1);});