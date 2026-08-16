import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const TED_API='https://api.ted.europa.eu/v3/notices/search';
const OPPORTUNITY_TYPES=['cn-standard','cn-social','pin-cfc-standard','pin-cfc-social','qu-sy','subco'];
const AWARD_TYPES=['can-standard','can-social','can-desg','can-tran'];
const STEEL_QUERY='(classification-cpv = 14622000 OR classification-cpv = 44171000 OR classification-cpv = 44172000 OR classification-cpv = 44212220 OR classification-cpv = 44212240 OR classification-cpv = 44212313 OR classification-cpv = 44212410 OR classification-cpv = 44212500 OR classification-cpv = 44330000 OR classification-cpv = 44334000 OR classification-cpv = 45223100 OR classification-cpv = 45223110 OR classification-cpv = 45223210 OR FT IN (Stahlbau Stahlkonstruktion Stahltragwerk Stahlhalle steelwork staalbouw staalconstructie))';
const FIELDS=['publication-number','notice-title','notice-type','publication-date','buyer-name','classification-cpv','deadline','deadline-receipt-tender-date-lot','deadline-receipt-request-date-lot','deadline-date-lot','place-of-performance'];
const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function ymd(date){return date.toISOString().slice(0,10).replace(/-/g,'');}
function isoToday(){return new Date().toISOString().slice(0,10);}
function daysAgo(days){const d=new Date();d.setUTCDate(d.getUTCDate()-days);return d;}
function firstScalar(value){if(value==null)return '';if(Array.isArray(value)){for(const x of value){const v=firstScalar(x);if(v)return v;}return '';}if(typeof value==='object'){for(const key of ['eng','en','deu','de','fra','fr','value','label','name','text']){if(value[key]!=null){const v=firstScalar(value[key]);if(v)return v;}}for(const v of Object.values(value)){const x=firstScalar(v);if(x)return x;}return '';}return text(value);}
function listScalars(value){const out=[];const walk=v=>{if(v==null)return;if(Array.isArray(v)){v.forEach(walk);return;}if(typeof v==='object'){if('value' in v){walk(v.value);return;}const languageKeys=['eng','en','deu','de','fra','fr','ita','it','nld','nl'];const matched=languageKeys.filter(k=>v[k]!=null);if(matched.length){matched.forEach(k=>walk(v[k]));return;}Object.values(v).forEach(walk);return;}const s=text(v);if(s&&!out.includes(s))out.push(s);};walk(value);return out;}
function field(row,name){return row?.[name]??row?.fields?.[name]??row?.data?.[name]??null;}
function isoDate(value){const s=firstScalar(value);const m=s.match(/\b(20\d{2})[-/]?(\d{2})[-/]?(\d{2})\b/);return m?`${m[1]}-${m[2]}-${m[3]}`:null;}
function deadlineDate(row){const candidates=['deadline-receipt-tender-date-lot','deadline-receipt-request-date-lot','deadline-date-lot','deadline'].flatMap(name=>listScalars(field(row,name))).map(isoDate).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).sort();if(!candidates.length)return null;const today=isoToday();return candidates.find(v=>v>=today)||candidates[candidates.length-1]||null;}
function noticeItems(json){for(const key of ['notices','results','content','items'])if(Array.isArray(json?.[key]))return json[key];if(Array.isArray(json))return json;return [];}
function cpvCodes(row){return listScalars(field(row,'classification-cpv')).map(v=>(v.match(/\b\d{8}\b/)||[])[0]).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);}
function tedTitle(row){const value=field(row,'notice-title');if(typeof value==='object'&&!Array.isArray(value)){for(const key of ['eng','en','deu','de','fra','fr'])if(value[key])return firstScalar(value[key]);}return firstScalar(value);}
function buyer(row){return firstScalar(field(row,'buyer-name'))||'TED buyer';}
function country(row){const values=listScalars(field(row,'place-of-performance'));return values[0]||'';}
const RAW_CPVS=new Set(['14622000','44171000','44172000','44330000','44334000']);
const STRUCT_CPVS=new Set(['44212220','44212240','44212313','44212410','44212500','45223100','45223110','45223210']);
const STRUCT_TITLE_RE=/stahlbau|stahlkonstruk|stahltragwerk|stahlhalle|steelwork|structural steel|steel structure|steel girder|staalbouw|staalconstruct|charpente metall|construction metall|ossature metall|konstrukcj[a-ząćęłńóśźż ]*stal|ocelov[a-zá-ž ]*konstruk|celicn[a-zčćžšđ ]*konstruk/i;
const RAW_TITLE_RE=/steel plate|steel sheet|stahlblech|blech aus stahl|steel profile|stahlprofil|structural profile|steel bar|steel rod|steel wire|armierungsstahl|bewehrungsstahl|blach[a-ząćęłńóśźż ]*stal|stali specjal|table din otel|armatura.*stal/i;
const CLEAR_NON_STEEL_TITLE_RE=/\baluminium\b|\baluminum\b|\balu(?:\b|[-/ ])/i;
export function classifyTedNotice({title='',cpv=[]}={}){
  const codes=Array.isArray(cpv)?cpv:[];const n=norm(title);const reasons=[];let raw=0,structure=0;
  const primary=codes[0]||'';const rawPrimary=RAW_CPVS.has(primary);const structPrimary=STRUCT_CPVS.has(primary);
  const rawSecondary=codes.slice(1).find(c=>RAW_CPVS.has(c));const structSecondary=codes.slice(1).find(c=>STRUCT_CPVS.has(c));
  const titleStructure=STRUCT_TITLE_RE.test(n);const titleRaw=RAW_TITLE_RE.test(n);const clearNonSteel=CLEAR_NON_STEEL_TITLE_RE.test(n)&&!titleStructure&&!titleRaw;
  if(rawPrimary){raw=95;reasons.push(`CPV kryesor lëndë çeliku: ${primary}`);}else if(rawSecondary){raw=50;reasons.push(`CPV dytësor lëndë çeliku: ${rawSecondary}`);}
  if(structPrimary){structure=96;reasons.push(`CPV kryesor strukturë çeliku: ${primary}`);}else if(structSecondary){structure=52;reasons.push(`CPV dytësor strukturë çeliku: ${structSecondary}`);}
  if(titleStructure){structure=Math.max(structure,88);reasons.push('titull i qartë për strukturë çeliku');}
  if(titleRaw){raw=Math.max(raw,86);reasons.push('titull i qartë për lëndë çeliku');}
  if(clearNonSteel){raw=Math.min(raw,30);structure=Math.min(structure,30);reasons.push('titulli tregon qartë material jo-çelik (aluminium/alu)');}
  if(/^71/.test(primary)&&!rawPrimary&&!structPrimary){raw=Math.min(raw,40);structure=Math.min(structure,40);reasons.push('shërbim projektimi/mbikëqyrjeje, jo prodhim');}
  const score=Math.min(100,Math.max(raw,structure));return{category:structure>=raw&&structure?'steel_structure':raw?'raw_material':'possible',relevance_score:score,match_reasons:[...new Set(reasons)]};
}
export function normalizeTedNotice(row,phase='opportunity',seenAt=new Date().toISOString()){const publication=firstScalar(field(row,'publication-number'));if(!publication)return null;const title=tedTitle(row)||`TED ${publication}`;const cpv=cpvCodes(row);const cls=classifyTedNotice({title,cpv});const type=firstScalar(field(row,'notice-type'));return{source_key:`TED:${publication}`,procurement_no:`TED-${publication}`,publication_no:publication,authority:buyer(row),title,document_type:type||null,fpp:cpv.find(c=>RAW_CPVS.has(c)||STRUCT_CPVS.has(c))||cpv[0]||null,fpp_description:cpv.length?`CPV ${cpv.join(', ')}`:null,contract_type:null,contract_value_band:null,procedure:null,estimated_value:null,currency:'EUR',deadline:phase==='opportunity'?deadlineDate(row):null,published_date:isoDate(field(row,'publication-date')),is_retender:false,category:cls.category,relevance_score:cls.relevance_score,match_reasons:cls.match_reasons,source_url:`https://ted.europa.eu/en/notice/${encodeURIComponent(publication)}/html`,detail_url:`https://ted.europa.eu/en/notice/-/detail/${encodeURIComponent(publication)}`,payload:{source:'TED',notice_phase:phase,country:country(row)||null,cpv,notice_type:type||null},last_seen_at:seenAt,updated_at:seenAt};}
function queryFor(types,{days=null}={}){const typeExpr=`notice-type IN (${types.join(' ')})`;const dateExpr=days?` AND publication-date = (${ymd(daysAgo(days))} <> ${ymd(new Date())})`:'';return `${typeExpr} AND ${STEEL_QUERY}${dateExpr} SORT BY publication-number DESC`;}
async function tedSearch({query,scope='ACTIVE',fetchImpl=fetch,maxPages=4,limit=250}){const all=[];for(let page=1;page<=maxPages;page++){const response=await fetchImpl(TED_API,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,fields:FIELDS,page,limit,scope,checkQuerySyntax:false,paginationMode:'PAGE_NUMBER',onlyLatestVersions:true})});const raw=await response.text();if(!response.ok)throw new Error(`TED search HTTP ${response.status}: ${raw.slice(0,1200)}`);let json;try{json=JSON.parse(raw);}catch{throw new Error(`TED search returned non-JSON: ${raw.slice(0,500)}`);}const items=noticeItems(json);all.push(...items);if(items.length<limit)break;}return all;}
async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await response.text();if(!response.ok)throw new Error(`${method} ${path} failed: HTTP ${response.status} ${raw.slice(0,700)}`);return raw?JSON.parse(raw):[];}
async function upsertRows(access,rows){if(!rows.length)return;await rest({...access,path:'kek_tender_watch?on_conflict=source_key',method:'POST',body:rows,prefer:'resolution=merge-duplicates,return=minimal'});}
async function deleteRow(access,id){await rest({...access,path:`kek_tender_watch?id=eq.${encodeURIComponent(id)}`,method:'DELETE',prefer:'return=minimal'});}
export async function reconcileTedOpportunityLifecycle(access,{evaluatedKeys=new Set(),relevantKeys=new Set(),today=isoToday()}={}){
  const existing=await rest({...access,path:'kek_tender_watch?select=id,source_key,status,project_id,deadline,payload&limit=2000'});
  let rejected=0,expired=0;
  for(const row of Array.isArray(existing)?existing:[]){
    const p=row?.payload&&typeof row.payload==='object'?row.payload:{};
    if(String(p.source||'').toUpperCase()!=='TED'||p.notice_phase!=='opportunity'||row.status!=='new'||row.project_id)continue;
    const key=String(row.source_key||'');
    if(row.deadline&&String(row.deadline)<today){await deleteRow(access,row.id);expired++;continue;}
    if(evaluatedKeys.has(key)&&!relevantKeys.has(key)){await deleteRow(access,row.id);rejected++;}
  }
  return{rejected,expired};
}
async function writeSummary(summary){await mkdir('tmp',{recursive:true});await writeFile('tmp/ted-tender-sync.json',JSON.stringify(summary,null,2));}
export async function runTedTenderSync({mode=process.env.SYNC_MODE||'preview',minScore=Number(process.env.TED_TENDER_MIN_SCORE||75),opportunityDays=Number(process.env.TED_OPPORTUNITY_DAYS||45),awardDays=Number(process.env.TED_OPEN_AWARD_DAYS||14),fetchImpl=fetch,supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'',bearerToken=''}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const seenAt=new Date().toISOString(),today=isoToday();
  const opportunityRaw=await tedSearch({query:queryFor(OPPORTUNITY_TYPES,{days:opportunityDays}),scope:'ACTIVE',fetchImpl});
  const awardRaw=await tedSearch({query:queryFor(AWARD_TYPES,{days:awardDays}),scope:'ACTIVE',fetchImpl});
  const evaluatedKeys=new Set();const relevantOpportunityKeys=new Set();const dedupe=new Map();
  for(const item of opportunityRaw){const row=normalizeTedNotice(item,'opportunity',seenAt);if(!row)continue;evaluatedKeys.add(row.source_key);if(row.deadline&&row.deadline<today)continue;if(row.relevance_score<minScore)continue;relevantOpportunityKeys.add(row.source_key);dedupe.set(row.source_key,row);}
  for(const item of awardRaw){const row=normalizeTedNotice(item,'award',seenAt);if(!row||row.relevance_score<minScore)continue;if(!dedupe.has(row.source_key))dedupe.set(row.source_key,row);}
  const rows=[...dedupe.values()];let authMode='not_needed',lifecycle={rejected:0,expired:0};
  if(mode==='apply'){
    const access=apiKey?{supabaseUrl,apiKey,bearerToken:bearerToken||apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});
    authMode=access.authMode;await upsertRows(access,rows);lifecycle=await reconcileTedOpportunityLifecycle(access,{evaluatedKeys,relevantKeys:relevantOpportunityKeys,today});
  }
  const summary={mode,auth_mode:authMode,api:TED_API,opportunity_raw:opportunityRaw.length,award_raw:awardRaw.length,relevant_rows:rows.length,opportunities:rows.filter(r=>r.payload.notice_phase==='opportunity').length,opportunities_with_deadline:rows.filter(r=>r.payload.notice_phase==='opportunity'&&r.deadline).length,awards:rows.filter(r=>r.payload.notice_phase==='award').length,minimum_score:minScore,opportunity_lookback_days:opportunityDays,award_lookback_days:awardDays,lifecycle_pruned:lifecycle,queries:{opportunities:queryFor(OPPORTUNITY_TYPES,{days:opportunityDays}),awards:queryFor(AWARD_TYPES,{days:awardDays})},tenders:rows.map(r=>({publication_no:r.publication_no,title:r.title,authority:r.authority,category:r.category,relevance_score:r.relevance_score,phase:r.payload.notice_phase,cpv:r.payload.cpv,published_date:r.published_date,deadline:r.deadline}))};
  await writeSummary(summary);console.log(`TED tender sync ${mode}: opportunityRaw=${summary.opportunity_raw}, awardRaw=${summary.award_raw}, relevant=${summary.relevant_rows}, opportunities=${summary.opportunities}, withDeadline=${summary.opportunities_with_deadline}, awards=${summary.awards}, prunedRejected=${lifecycle.rejected}, prunedExpired=${lifecycle.expired}.`);return summary;
}
const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct)runTedTenderSync().catch(async error=>{try{await writeSummary({error:String(error?.message||error),mode:process.env.SYNC_MODE||'preview'});}catch{}console.error(error?.message||error);process.exit(1);});
