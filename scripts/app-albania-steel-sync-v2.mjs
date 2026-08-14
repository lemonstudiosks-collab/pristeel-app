import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';
import { parseCsv, normalizeAppRecord } from './app-albania-steel-sync.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const APP_ORIGIN='https://app.gov.al';
const APP_EXPORT_PAGE=`${APP_ORIGIN}/eksportimi-i-procedurave-te-publikuara/`;
const EXACT_TOKEN_TERMS=new Set(['ipe','ipn','hea','heb','hem','upe','upn','unp','b500','b500c','hekur','hekuri','hekurit']);
const STRUCTURAL_CPV_PREFIXES=['44212220','44212240','44212313','44212410','44212500','45223100','45223110','45223210'];
const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const reEsc=v=>String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function termMatch(haystack,term){const h=norm(haystack),t=norm(term);if(!t)return false;if(EXACT_TOKEN_TERMS.has(t))return new RegExp(`(?:^|[^a-z0-9])${reEsc(t)}(?=$|[^a-z0-9])`,'i').test(h);return h.includes(t);}
function hasAny(v,terms){return terms.find(t=>termMatch(v,t))||'';}
function daysOld(date,today){if(!date)return Infinity;const d=new Date(`${date}T00:00:00Z`);return Number.isNaN(d.getTime())?Infinity:Math.floor((today-d)/86400000);}

export function classifyAlbaniaSteelV2(row){
 const corpus=[row?.title,row?.cpv_text,row?.contract_type].filter(Boolean).join(' '),n=norm(corpus),reasons=[];let raw=0,structure=0;
 const rawStrong=hasAny(n,[
  'llamarine','llamarina','llamara','çelik','celik','steel','material metalik','material hekuri','profile metalike','profile celiku','profile hekuri',
  'shufra celiku','shufra hekuri','trar celiku','tuba celiku','tuba çeliku','gypa celiku','tel celiku','zinxhir celiku','rrjete celiku','rrjetë çeliku',
  'hekur','hekuri','hekurit','armature','rebar','b500','b500c','ipe','ipn','hea','heb','hem','upe','upn','unp','steel plate','steel sheet','flat bar','angle steel'
 ]);
 if(rawStrong){raw+=68;reasons.push(`lëndë e parë: ${rawStrong}`);}
 const rawMedium=hasAny(n,['metal','profil metal','profil celik','shufra','llamar','trar metal','tub metal','gyp metal','bobine','coil']);
 if(rawMedium&&!rawStrong){raw+=28;reasons.push(`sinjal lënde: ${rawMedium}`);}
 const structStrong=hasAny(n,['konstruksion metalik','konstruksione metalike','konstruksion çeliku','konstruksion celiku','strukture celiku','strukturë çeliku','struktura metalike','strukture metalike','halle metalike','platforme metalike','platformë metalike','rrethim metalik','rrethoje metalike','shtylla metalike','ura metalike','grating','steel structure','steelwork','skela metalike']);
 if(structStrong){structure+=72;reasons.push(`strukturë: ${structStrong}`);}
 const process=hasAny(n,['fabrikim','saldim','welding','galvaniz','montim metal','punime metalike','bravari']);if(process){structure+=34;reasons.push(`punim struktural: ${process}`);}
 const cpvs=row?.cpvs||[];
 for(const c of cpvs){const d=c.replace(/\D/g,'');if(d.startsWith('14622000')){raw+=88;reasons.push(`CPV çelik: ${c}`);}else if(/^(44171000|44172000|44330000|44334000)/.test(d)){raw+=64;reasons.push(`CPV produkt çeliku: ${c}`);}else if(STRUCTURAL_CPV_PREFIXES.some(p=>d.startsWith(p))){structure+=82;reasons.push(`CPV strukturë metalike: ${c}`);}else if(/^4421/.test(d)&&structStrong){structure+=38;reasons.push(`CPV strukturë + tekst metalik: ${c}`);}else if(/^45000000/.test(d)&&structStrong){structure+=24;reasons.push(`CPV ndërtim + sinjal metalik: ${c}`);}}
 const best=Math.min(100,Math.max(raw,structure));let category='possible';if(best>=65)category=structure>=raw?'steel_structure':'raw_material';return{category,relevance_score:best,match_reasons:[...new Set(reasons)]};
}

export function prepareAppRowsV2(records,{seenAt=new Date().toISOString(),minScore=55,recentDays=60,today=new Date()}={}){
 const todayIso=today.toISOString().slice(0,10);
 return(records||[]).map(normalizeAppRecord).filter(Boolean).map(r=>({...r,source_key:`APP_AL:${r.procurement_no}`,...classifyAlbaniaSteelV2(r),last_seen_at:seenAt,updated_at:seenAt})).filter(r=>r.relevance_score>=minScore).filter(r=>{
  if(r.payload.notice_phase==='award')return daysOld(r.published_date,today)<=recentDays;
  if(r.deadline)return r.deadline>=todayIso;
  return daysOld(r.published_date,today)<=recentDays;
 });
}
async function fetchCsv(year){const url=`${APP_ORIGIN}/GetData/ExportDocument?year=${year}`;const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 AppleWebKit/537.36 Chrome/151 Safari/537.36',Accept:'text/csv,application/octet-stream,*/*',Referer:APP_EXPORT_PAGE},redirect:'follow'});if(!r.ok)throw new Error(`APP export HTTP ${r.status}`);const buf=new Uint8Array(await r.arrayBuffer());let out=new TextDecoder('utf-8').decode(buf);if((out.match(/�/g)||[]).length>5){try{out=new TextDecoder('windows-1252').decode(buf);}catch{}}return out;}
async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){const r=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await r.text();if(!r.ok)throw new Error(`${method} ${path} failed: HTTP ${r.status} ${raw.slice(0,500)}`);return raw?JSON.parse(raw):[];}
async function upsert(access,rows){if(!rows.length)return;const body=rows.map(r=>({source_key:r.source_key,procurement_no:r.procurement_no,publication_no:r.publication_no,authority:r.authority,title:r.title,document_type:r.document_type,fpp:r.fpp,fpp_description:r.fpp_description,contract_type:r.contract_type,contract_value_band:r.contract_value_band,procedure:r.procedure,estimated_value:r.estimated_value,currency:r.currency,deadline:r.deadline,published_date:r.published_date,is_retender:!!r.is_retender,category:r.category,relevance_score:r.relevance_score,match_reasons:r.match_reasons||[],source_url:r.source_url,detail_url:r.detail_url,payload:r.payload,last_seen_at:r.last_seen_at,updated_at:r.updated_at}));await rest({...access,path:'kek_tender_watch?on_conflict=source_key',method:'POST',body,prefer:'resolution=merge-duplicates,return=minimal'});}
async function writeSummary(s){await mkdir('tmp',{recursive:true});await writeFile('tmp/app-albania-steel-sync.json',JSON.stringify(s,null,2));}
export async function runAppAlbaniaSteelSyncV2({mode=process.env.SYNC_MODE||'preview',year=Number(process.env.APP_AL_YEAR||new Date().getUTCFullYear()),minScore=Number(process.env.APP_AL_MIN_SCORE||55),recentDays=Number(process.env.APP_AL_RECENT_DAYS||60),supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||''}={}){
 if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);const csv=await fetchCsv(year);const records=parseCsv(csv);if(!records.length)throw new Error('APP Albania export returned no CSV records.');const seenAt=new Date().toISOString();const allScored=records.map(normalizeAppRecord).filter(Boolean).map(r=>({...r,...classifyAlbaniaSteelV2(r)})).filter(r=>r.relevance_score>=minScore);const relevant=prepareAppRowsV2(records,{seenAt,minScore,recentDays});let authMode='not_needed';if(mode==='apply'&&relevant.length){const access=apiKey?{supabaseUrl,apiKey,bearerToken:apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});authMode=access.authMode;await upsert(access,relevant);}const summary={mode,auth_mode:authMode,classifier:'v2-boundary-safe',source:'APP_AL',year,records:records.length,steel_scored_rows:allScored.length,time_filtered:allScored.length-relevant.length,relevant_rows:relevant.length,minimum_score:minScore,recent_days:recentDays,priority:relevant.reduce((a,r)=>(a[r.payload.authority_priority]=(a[r.payload.authority_priority]||0)+1,a),{}),phases:relevant.reduce((a,r)=>(a[r.payload.notice_phase]=(a[r.payload.notice_phase]||0)+1,a),{}),tenders:relevant.map(r=>({reference:r.procurement_no,authority:r.authority,authority_priority:r.payload.authority_priority,title:r.title,cpv:r.payload.cpv,category:r.category,relevance_score:r.relevance_score,published_date:r.published_date,deadline:r.deadline,phase:r.payload.notice_phase,match_reasons:r.match_reasons}))};await writeSummary(summary);console.log(`APP Albania steel v2 ${mode}: records=${records.length}, steel-scored=${allScored.length}, relevant=${relevant.length}.`);return summary;
}
const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;if(direct){runAppAlbaniaSteelSyncV2().catch(async e=>{const s={error:String(e?.message||e),mode:process.env.SYNC_MODE||'preview'};try{await writeSummary(s);}catch{}console.error(s.error);process.exit(1);});}
