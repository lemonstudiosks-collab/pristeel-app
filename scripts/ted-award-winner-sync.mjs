import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';
import { classifyTedNotice } from './ted-tender-sync.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const TED_API='https://api.ted.europa.eu/v3/notices/search';
const AWARD_TYPES=['can-standard','can-social','can-desg','can-tran'];
const STEEL_QUERY='(classification-cpv = 14622000 OR classification-cpv = 44171000 OR classification-cpv = 44172000 OR classification-cpv = 44212220 OR classification-cpv = 44212240 OR classification-cpv = 44212313 OR classification-cpv = 44212410 OR classification-cpv = 44212500 OR classification-cpv = 44330000 OR classification-cpv = 44334000 OR classification-cpv = 45223100 OR classification-cpv = 45223110 OR classification-cpv = 45223210 OR FT IN (Stahlbau Stahlkonstruktion Stahltragwerk Stahlhalle steelwork staalbouw staalconstructie))';
const FIELDS=[
  'publication-number','notice-title','notice-type','publication-date','buyer-name',
  'classification-cpv','place-of-performance',
  'winner-name','winner-email','winner-internet-address','winner-country','winner-city',
  'winner-identifier','winner-decision-date','winner-contact-point'
];
const RAW_CPVS=new Set(['14622000','44171000','44172000','44330000','44334000']);
const STRUCT_CPVS=new Set(['44212220','44212240','44212313','44212410','44212500','45223100','45223110','45223210']);
const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
function ymd(date){return date.toISOString().slice(0,10).replace(/-/g,'');}
function daysAgo(days){const d=new Date();d.setUTCDate(d.getUTCDate()-days);return d;}
function firstScalar(value){
  if(value==null)return '';
  if(Array.isArray(value)){for(const x of value){const v=firstScalar(x);if(v)return v;}return '';}
  if(typeof value==='object'){
    for(const key of ['eng','en','deu','de','fra','fr','ita','it','nld','nl','value','label','name','text']){
      if(value[key]!=null){const v=firstScalar(value[key]);if(v)return v;}
    }
    for(const v of Object.values(value)){const x=firstScalar(v);if(x)return x;}
    return '';
  }
  return text(value);
}
function listScalars(value){
  const out=[];
  const walk=v=>{
    if(v==null)return;
    if(Array.isArray(v)){v.forEach(walk);return;}
    if(typeof v==='object'){
      if('value' in v){walk(v.value);return;}
      const languageKeys=['eng','en','deu','de','fra','fr','ita','it','nld','nl'];
      const matched=languageKeys.filter(k=>v[k]!=null);
      if(matched.length){matched.forEach(k=>walk(v[k]));return;}
      Object.values(v).forEach(walk);return;
    }
    const s=text(v);if(s&&!out.includes(s))out.push(s);
  };
  walk(value);return out;
}
function field(row,name){return row?.[name]??row?.fields?.[name]??row?.data?.[name]??null;}
function isoDate(value){const s=firstScalar(value);const m=s.match(/\b(20\d{2})[-/]?(\d{2})[-/]?(\d{2})\b/);return m?`${m[1]}-${m[2]}-${m[3]}`:null;}
function noticeItems(json){for(const key of ['notices','results','content','items'])if(Array.isArray(json?.[key]))return json[key];if(Array.isArray(json))return json;return [];}
function cpvCodes(row){return listScalars(field(row,'classification-cpv')).map(v=>(v.match(/\b\d{8}\b/)||[])[0]).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);}
function tedTitle(row){const value=field(row,'notice-title');if(typeof value==='object'&&!Array.isArray(value)){for(const key of ['eng','en','deu','de','fra','fr'])if(value[key])return firstScalar(value[key]);}return firstScalar(value);}
function winnerValues(row,name){return listScalars(field(row,name));}
function winnerData(row){
  const names=winnerValues(row,'winner-name');
  const emails=winnerValues(row,'winner-email');
  const websites=winnerValues(row,'winner-internet-address');
  const countries=winnerValues(row,'winner-country');
  const cities=winnerValues(row,'winner-city');
  const identifiers=winnerValues(row,'winner-identifier');
  const contacts=winnerValues(row,'winner-contact-point');
  const decisionDates=winnerValues(row,'winner-decision-date').map(isoDate).filter(Boolean);
  return {
    names,emails,websites,countries,cities,identifiers,contacts,decision_dates:decisionDates,
    name:names[0]||null,email:emails[0]||null,website:websites[0]||null,country:countries[0]||null,
    city:cities[0]||null,identifier:identifiers[0]||null,contact_point:contacts[0]||null,
    decision_date:decisionDates[0]||null
  };
}
export function normalizeTedAward(row,seenAt=new Date().toISOString()){
  const publication=firstScalar(field(row,'publication-number'));if(!publication)return null;
  const title=tedTitle(row)||`TED ${publication}`;
  const cpv=cpvCodes(row);
  const cls=classifyTedNotice({title,cpv});
  const type=firstScalar(field(row,'notice-type'));
  const winner=winnerData(row);
  const buyer=firstScalar(field(row,'buyer-name'))||'TED buyer';
  const place=listScalars(field(row,'place-of-performance'));
  return {
    source_key:`TED:${publication}`,procurement_no:`TED-${publication}`,publication_no:publication,
    authority:buyer,title,document_type:type||null,fpp:cpv.find(c=>RAW_CPVS.has(c)||STRUCT_CPVS.has(c))||cpv[0]||null,
    fpp_description:cpv.length?`CPV ${cpv.join(', ')}`:null,contract_type:null,contract_value_band:null,
    procedure:null,estimated_value:null,currency:'EUR',deadline:null,published_date:isoDate(field(row,'publication-date')),
    is_retender:false,category:cls.category,relevance_score:cls.relevance_score,match_reasons:cls.match_reasons,
    source_url:`https://ted.europa.eu/en/notice/${encodeURIComponent(publication)}/html`,
    detail_url:`https://ted.europa.eu/en/notice/-/detail/${encodeURIComponent(publication)}`,
    payload:{source:'TED',notice_phase:'award',workflow:'winner_outreach',cpv,notice_type:type||null,place_of_performance:place,winner},
    last_seen_at:seenAt,updated_at:seenAt
  };
}
function queryForAwards(days){
  const typeExpr=`notice-type IN (${AWARD_TYPES.join(' ')})`;
  const dateExpr=`publication-date = (${ymd(daysAgo(days))} <> ${ymd(new Date())})`;
  return `${typeExpr} AND ${STEEL_QUERY} AND ${dateExpr} SORT BY publication-number DESC`;
}
async function tedSearch({query,fetchImpl=fetch,maxPages=4,limit=250}){
  const all=[];
  for(let page=1;page<=maxPages;page++){
    const response=await fetchImpl(TED_API,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,fields:FIELDS,page,limit,scope:'ACTIVE',checkQuerySyntax:false,paginationMode:'PAGE_NUMBER',onlyLatestVersions:true})});
    const raw=await response.text();if(!response.ok)throw new Error(`TED search HTTP ${response.status}: ${raw.slice(0,1200)}`);
    let json;try{json=JSON.parse(raw);}catch{throw new Error(`TED search returned non-JSON: ${raw.slice(0,500)}`);}
    const items=noticeItems(json);all.push(...items);if(items.length<limit)break;
  }
  return all;
}
async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){
  const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await response.text();if(!response.ok)throw new Error(`${method} ${path} failed: HTTP ${response.status} ${raw.slice(0,700)}`);return raw?JSON.parse(raw):[];
}
async function upsertRows(access,rows){if(!rows.length)return;await rest({...access,path:'kek_tender_watch?on_conflict=source_key',method:'POST',body:rows,prefer:'resolution=merge-duplicates,return=minimal'});}
async function writeSummary(summary){await mkdir('tmp',{recursive:true});await writeFile('tmp/ted-award-winner-sync.json',JSON.stringify(summary,null,2));}
export async function runTedAwardWinnerSync({mode=process.env.SYNC_MODE||'preview',minScore=Number(process.env.TED_TENDER_MIN_SCORE||75),days=Number(process.env.TED_AWARD_DAYS||30),fetchImpl=fetch,supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'',bearerToken=''}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const seenAt=new Date().toISOString();
  const awardRaw=await tedSearch({query:queryForAwards(days),fetchImpl});
  const dedupe=new Map();
  for(const item of awardRaw){const row=normalizeTedAward(item,seenAt);if(!row||row.relevance_score<minScore)continue;dedupe.set(row.source_key,row);}
  const rows=[...dedupe.values()];
  let authMode='not_needed';
  if(mode==='apply'&&rows.length){const access=apiKey?{supabaseUrl,apiKey,bearerToken:bearerToken||apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});authMode=access.authMode;await upsertRows(access,rows);}
  const winnersFound=rows.filter(r=>r.payload?.winner?.name).length;
  const summary={mode,auth_mode:authMode,api:TED_API,workflow:'award_winner_outreach',award_raw:awardRaw.length,relevant_rows:rows.length,awards:rows.length,winners_found:winnersFound,without_winner:rows.length-winnersFound,minimum_score:minScore,lookback_days:days,query:queryForAwards(days),tenders:rows.map(r=>({publication_no:r.publication_no,title:r.title,buyer:r.authority,winner:r.payload.winner?.name||null,winner_email:r.payload.winner?.email||null,winner_website:r.payload.winner?.website||null,category:r.category,relevance_score:r.relevance_score,published_date:r.published_date,cpv:r.payload.cpv}))};
  await writeSummary(summary);console.log(`TED award winner sync ${mode}: awardRaw=${summary.award_raw}, relevant=${summary.relevant_rows}, winners=${summary.winners_found}.`);return summary;
}
const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct)runTedAwardWinnerSync().catch(async error=>{try{await writeSummary({error:String(error?.message||error),mode:process.env.SYNC_MODE||'preview'});}catch{}console.error(error?.message||error);process.exit(1);});
