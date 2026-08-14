import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';
import { parseNoticeIndexHtml, parseDetailHtml } from './krpp-public-steel-sync.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const KRPP_ORIGIN='https://e-prokurimi.rks-gov.net';
const DEFAULT_INDEX_URL=`${KRPP_ORIGIN}/SPIN_PROD/application/ipn/DocumentManagement/NewPreglediDokumenataFrm.aspx`;
const ACTIONABLE_NOTICE_TYPES=new Set(['B05','B54']);
const EXACT_TOKEN_TERMS=new Set(['ipe','ipn','hea','heb','hem','upe','upn','unp','b500','b500c','hekur','hekuri','hekurit']);
const STRUCTURAL_FPP_PREFIXES=['44212220','44212240','44212313','44212410','44212500','45223100','45223110','45223210'];
const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const reEsc=v=>String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function termMatch(haystack,term){const h=norm(haystack),t=norm(term);if(!t)return false;if(EXACT_TOKEN_TERMS.has(t))return new RegExp(`(?:^|[^a-z0-9])${reEsc(t)}(?=$|[^a-z0-9])`,'i').test(h);return h.includes(t);}
function hasAny(v,terms){return terms.find(t=>termMatch(v,t))||'';}

export function classifyKrppSteelV2(row){
 const corpus=[row?.title,row?.fpp_description,row?.document_type].filter(Boolean).join(' '),n=norm(corpus),reasons=[];let raw=0,structure=0;
 const rawStrong=hasAny(n,[
  'llamarine','llamarina','llamara','pllake celiku','pllake metalike','material celiku','material metalik',
  'profile celiku','profile metalike','profile hekuri','shufra celiku','shufer celiku','trar celiku','tuba celiku','gypa celiku',
  'tel celiku','tela celiku','litar celiku','zinxhir celiku','sfera celiku','rrjete celiku','armature','rebar',
  'celik','steel','hekur','hekuri','hekurit','b500','b500c','ipe','ipn','hea','heb','hem','upe','upn','unp','flat bar','angle steel','steel plate','steel sheet'
 ]);
 if(rawStrong){raw+=68;reasons.push(`lëndë e parë: ${rawStrong}`);}
 const rawMedium=hasAny(n,['metal','profil','shufr','llamar','trar','tub metal','gyp metal','zinxhir','litar','bobine','coil']);
 if(rawMedium&&!rawStrong){raw+=28;reasons.push(`sinjal lënde: ${rawMedium}`);}
 const structStrong=hasAny(n,[
  'konstruksion metalik','konstruksione metalike','konstruksion celiku','strukture celiku','struktura celiku','strukture metalike','struktura metalike',
  'steel structure','steelwork','halle metalike','mbulese metalike','platforme metalike','platforma metalike','shkalle metalike','rrethoje metalike','rrethim metalik',
  'grating','shtylle metalike','shtylla metalike','support steel','steel support','frame steel','ura metalike','skela metalike'
 ]);
 if(structStrong){structure+=72;reasons.push(`strukturë: ${structStrong}`);}
 const process=hasAny(n,['fabrikim','fabricim','saldim','welding','galvaniz','montim metal','mbajtese metal','bravari']);
 if(process){structure+=34;reasons.push(`punim struktural: ${process}`);}
 const fpp=text(row?.fpp).replace(/\D/g,'');
 if(/^2711/.test(fpp)){raw+=72;reasons.push(`FPP çelik: ${row.fpp}`);}
 else if(/^(273|4433)/.test(fpp)){raw+=52;reasons.push(`FPP produkt çeliku: ${row.fpp}`);}
 else if(/^28527/.test(fpp)&&(rawStrong||rawMedium)){raw+=45;reasons.push(`FPP artikull metalik: ${row.fpp}`);}
 else if(/^2700/.test(fpp)&&(rawStrong||rawMedium)){raw+=48;reasons.push(`FPP metal bazë: ${row.fpp}`);}
 else if(/^2800/.test(fpp)&&(rawStrong||rawMedium)){raw+=34;reasons.push(`FPP produkt metalik: ${row.fpp}`);}
 if(STRUCTURAL_FPP_PREFIXES.some(p=>fpp.startsWith(p))){structure+=52;reasons.push(`FPP strukturë metalike: ${row.fpp}`);}
 else if(/^4421/.test(fpp)&&structStrong){structure+=36;reasons.push(`FPP strukturë + tekst metalik: ${row.fpp}`);}
 else if(/^45000000/.test(fpp)&&structStrong){structure+=28;reasons.push(`FPP punë ndërtimi + sinjal metalik: ${row.fpp}`);}
 else if(/^(2851|2852)/.test(fpp)&&structure>0){structure+=20;reasons.push(`FPP metal/punim: ${row.fpp}`);}
 if(/\bfurnizim\b/.test(n)&&raw>0)raw+=6;if(/\b(pune|punime|montim|vendosja|ndertim)\b/.test(n)&&structure>0)structure+=6;
 const best=Math.min(100,Math.max(raw,structure));let category='possible';if(best>=65)category=structure>=raw?'steel_structure':'raw_material';return{category,relevance_score:best,match_reasons:[...new Set(reasons)]};
}

const HINTS=['celik','çelik','steel','hekur','hekuri','material metalik','metal','llamar','profile','shufr','trar','gyp','tub','konstruksion','strukture','strukturë','platform','shkalle','shkallë','rretho','grating','shtyll','fabrikim','saldim','galvan','bravari','armature','b500','ipe','ipn','hea','heb','hem','upe','upn','unp'];
export function selectKrppCandidatesV2(notices,{recentDateCount=30,fullScanDateCount=2,maxCandidates=180}={}){
 const dates=[...new Set((notices||[]).map(x=>x.published_date).filter(Boolean))].sort((a,b)=>b.localeCompare(a)).slice(0,recentDateCount),allowed=new Set(dates),full=new Set(dates.slice(0,fullScanDateCount)),out=[];
 for(const x of notices||[]){if(allowed.size&&x.published_date&&!allowed.has(x.published_date))continue;const type=text(x.notice_type).toUpperCase();if(type&&!ACTIONABLE_NOTICE_TYPES.has(type))continue;const direct=classifyKrppSteelV2({title:x.title});const hint=hasAny(x.title,HINTS);const scan=!!x.published_date&&full.has(x.published_date);if(!scan&&direct.relevance_score<20&&!hint)continue;out.push({...x,candidate_score:Math.max(direct.relevance_score,hint?25:0,scan?15:0),candidate_full_scan:scan});}
 return out.sort((a,b)=>Number(b.candidate_full_scan)-Number(a.candidate_full_scan)||b.candidate_score-a.candidate_score).slice(0,maxCandidates);
}
function sourceKey(row){return text(row.publication_no)||`KRPP:${text(row.procurement_no)}:${createHash('sha1').update(norm(row.title)).digest('hex').slice(0,14)}`;}
export function prepareKrppRowsV2(rows,{seenAt=new Date().toISOString(),minScore=35,today=new Date()}={}){const todayIso=today.toISOString().slice(0,10);return(rows||[]).map(r=>({...r,source_key:sourceKey(r),...classifyKrppSteelV2(r),last_seen_at:seenAt,updated_at:seenAt})).filter(r=>r.relevance_score>=minScore).filter(r=>!r.deadline||r.deadline>=todayIso);}
async function getHtml(url,{timeoutMs=20000,referer=KRPP_ORIGIN}={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 AppleWebKit/537.36 Chrome/151 Safari/537.36','Accept-Language':'sq-AL,sq;q=0.9,en;q=0.7',Referer:referer},signal:c.signal,redirect:'follow'});const body=await r.text();if(!r.ok)throw new Error(`KRPP HTTP ${r.status}`);return body;}finally{clearTimeout(t);}}
async function mapLimit(items,limit,worker){const out=new Array(items.length);let cur=0;async function run(){while(true){const i=cur++;if(i>=items.length)return;try{out[i]=await worker(items[i]);}catch(e){out[i]={__error:String(e?.message||e),__item:items[i]};}}}await Promise.all(Array.from({length:Math.max(1,Math.min(limit,items.length||1))},run));return out;}
async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){const r=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await r.text();if(!r.ok)throw new Error(`${method} ${path} failed: HTTP ${r.status} ${raw.slice(0,500)}`);return raw?JSON.parse(raw):[];}
async function upsert(access,rows){if(!rows.length)return;const body=rows.map(r=>({source_key:r.source_key,procurement_no:r.procurement_no,publication_no:r.publication_no,authority:r.authority,title:r.title,document_type:r.document_type,fpp:r.fpp,fpp_description:r.fpp_description,contract_type:r.contract_type,contract_value_band:r.contract_value_band,procedure:r.procedure,estimated_value:r.estimated_value,currency:r.currency||'EUR',deadline:r.deadline,published_date:r.published_date,is_retender:!!r.is_retender,category:r.category,relevance_score:r.relevance_score,match_reasons:r.match_reasons||[],source_url:r.source_url,detail_url:r.detail_url,payload:r.payload||{},last_seen_at:r.last_seen_at,updated_at:r.updated_at}));await rest({...access,path:'kek_tender_watch?on_conflict=source_key',method:'POST',body,prefer:'resolution=merge-duplicates,return=minimal'});}
async function writeSummary(s){await mkdir('tmp',{recursive:true});await writeFile('tmp/krpp-public-steel-sync.json',JSON.stringify(s,null,2));}
export async function runKrppPublicSteelSyncV2({mode=process.env.SYNC_MODE||'preview',sourceUrl=process.env.KRPP_PUBLIC_INDEX_URL||DEFAULT_INDEX_URL,minScore=Number(process.env.KRPP_PUBLIC_MIN_SCORE||35),recentDateCount=Number(process.env.KRPP_PUBLIC_RECENT_DATE_COUNT||30),fullScanDateCount=Number(process.env.KRPP_PUBLIC_FULL_SCAN_DATES||2),maxCandidates=Number(process.env.KRPP_PUBLIC_MAX_CANDIDATES||180),detailConcurrency=Number(process.env.KRPP_PUBLIC_DETAIL_CONCURRENCY||5),supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||''}={}){
 if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);const indexHtml=await getHtml(sourceUrl);const notices=parseNoticeIndexHtml(indexHtml,sourceUrl);if(!notices.length)throw new Error('KRPP public index returned zero notice links.');const candidates=selectKrppCandidatesV2(notices,{recentDateCount,fullScanDateCount,maxCandidates});const results=await mapLimit(candidates,detailConcurrency,async x=>parseDetailHtml(await getHtml(x.detail_url,{referer:sourceUrl}),x.detail_url,x));const failures=results.filter(x=>x&&x.__error),rows=results.filter(x=>x&&!x.__error&&x.authority&&x.title);if(candidates.length&&failures.length===candidates.length)throw new Error(`All ${candidates.length} KRPP detail requests failed.`);const seenAt=new Date().toISOString();const scored=rows.map(r=>({...r,...classifyKrppSteelV2(r)})).filter(r=>r.relevance_score>=minScore);const relevant=prepareKrppRowsV2(rows,{seenAt,minScore});let authMode='not_needed';if(mode==='apply'&&relevant.length){const access=apiKey?{supabaseUrl,apiKey,bearerToken:apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});authMode=access.authMode;await upsert(access,relevant);}const summary={mode,auth_mode:authMode,classifier:'v2-boundary-safe',source:'KRPP',notice_links:notices.length,index_candidates:candidates.length,detail_failures:failures.length,steel_scored_rows:scored.length,expired_filtered:scored.length-relevant.length,relevant_rows:relevant.length,minimum_score:minScore,priority:relevant.reduce((a,r)=>(a[r.payload?.authority_priority||'other']=(a[r.payload?.authority_priority||'other']||0)+1,a),{}),tenders:relevant.map(r=>({procurement_no:r.procurement_no,authority:r.authority,authority_priority:r.payload?.authority_priority,title:r.title,fpp:r.fpp,category:r.category,relevance_score:r.relevance_score,published_date:r.published_date,deadline:r.deadline,match_reasons:r.match_reasons}))};await writeSummary(summary);console.log(`KRPP public steel v2 ${mode}: notices=${notices.length}, candidates=${candidates.length}, relevant=${relevant.length}, expired-filtered=${summary.expired_filtered}.`);return summary;
}
const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;if(direct){runKrppPublicSteelSyncV2().catch(async e=>{const s={error:String(e?.message||e),mode:process.env.SYNC_MODE||'preview'};try{await writeSummary(s);}catch{}console.error(s.error);process.exit(1);});}
