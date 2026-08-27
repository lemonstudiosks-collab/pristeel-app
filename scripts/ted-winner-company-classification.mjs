import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const VERSION='winner-company-v3';
const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const unique=arr=>[...new Set((arr||[]).filter(Boolean))];

const PRODUCER_RULES=[
  [/\b(stahl(?:-|\s+und\s+)?metallbau|stahlbau|metallbau|schlosserei|maschinenfabrik|steel fabrication|steel construction|steel structures?|structural steel|metal structures?)\b/gi,4,'explicit steel-fabrication company terms'],
  [/\b(manufactur|fabricat|production|factory|workshop|plant)\w*/gi,3,'manufacturing/fabrication'],
  [/\b(welding|schweiss|schweiß|laser cutting|plasma cutting|cnc|galvaniz|beschicht)\w*/gi,2,'fabrication processes'],
  [/\b(fertigung|produktion|werkstatt|stahlkonstruktion)\w*/gi,3,'German production terms'],
  [/\b(smed|smedearbejde|rustfri st[aå]l|vaerksted|værksted|produktion)\w*/gi,2,'Nordic fabrication terms']
];
const GC_RULES=[
  [/\b(general contractor|main contractor|building contractor|construction company|construction services)\b/gi,4,'general construction'],
  [/\b(epc|engineering procurement construction|turnkey|design[ -]?build)\b/gi,4,'EPC/turnkey'],
  [/\b(generalunternehmer|bauunternehmen)\w*/gi,4,'explicit German GC terms'],
  [/\b(schluesselfertig|schlüsselfertig|hochbau|tiefbau)\w*/gi,3,'German construction terms'],
  [/\b(project management|construction management|civil engineering)\b/gi,1,'project/construction management']
];
const TRADER_RULES=[
  [/\b(trading|trader|wholesale|wholesaler|distributor|distribution|merchant|stockholder)\b/gi,4,'trading/distribution'],
  [/\b(stahlhandel|handelshaus|grosshandel|großhandel|lagerhalter)\w*/gi,4,'German trading terms'],
  [/\b(steel service cent(?:er|re)|service center)\b/gi,3,'steel service center']
];

function scoreRules(raw,rules){
  const hay=norm(raw),evidence=[];let score=0;
  for(const [pattern,weight,label] of rules){
    pattern.lastIndex=0;
    const matches=[...hay.matchAll(pattern)];
    if(!matches.length)continue;
    const capped=Math.min(2,matches.length);
    score+=Number(weight)*capped;
    evidence.push({label,weight:Number(weight)*capped,examples:unique(matches.slice(0,2).map(m=>text(m[0])))});
  }
  return{score,evidence};
}
export function classifyCompanyText(raw,{organizationCount=1}={}){
  if(Number(organizationCount)>1){
    return{company_type:'trader_consortium',confidence:'high',scores:{producer:0,gc_epc:0,trader_consortium:6},evidence:[{label:'multiple awarded organizations / consortium',weight:6,examples:[String(organizationCount)]}]};
  }
  const p=scoreRules(raw,PRODUCER_RULES),g=scoreRules(raw,GC_RULES),t=scoreRules(raw,TRADER_RULES);
  const scores={producer:p.score,gc_epc:g.score,trader_consortium:t.score};
  const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  const [best,bestScore]=ranked[0],second=ranked[1]?.[1]||0;
  if(bestScore<4||bestScore-second<2)return{company_type:'unknown',confidence:bestScore>=4?'low':'none',scores,evidence:[...p.evidence,...g.evidence,...t.evidence].slice(0,8)};
  return{company_type:best,confidence:bestScore>=8&&bestScore-second>=4?'high':'medium',scores,evidence:(best==='producer'?p.evidence:best==='gc_epc'?g.evidence:t.evidence).slice(0,8)};
}
function cooperationAngle(type){if(type==='producer')return'additional_fabrication_capacity';if(type==='gc_epc')return'steel_fabrication_subcontractor';if(type==='trader_consortium')return'verify_supply_or_fabrication_role';return'verify_company_role';}
function safeUrl(v){try{const u=new URL(text(v));return /^https?:$/.test(u.protocol)?u:null;}catch{return null;}}
function domain(v){const u=safeUrl(v);return u?u.hostname.replace(/^www\./,'').toLowerCase():'';}
function stripHtml(v){return text(String(v||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '));}
function candidateLinks(html,base){
  const host=domain(base),out=[];
  for(const m of String(html||'').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    try{
      const u=new URL(m[1],base);
      if(!/^https?:$/.test(u.protocol)||domain(u.href)!==host)continue;
      const label=norm(`${u.pathname} ${stripHtml(m[2])}`);
      if(!/(about|company|unternehmen|uber-uns|ueber-uns|services|leistungen|capabilit|production|fertigung|stahlbau|steel|construction|bau|teknik|service|produktion)/.test(label))continue;
      const clean=u.href.split('#')[0];
      if(!out.includes(clean))out.push(clean);
      if(out.length>=4)break;
    }catch{}
  }
  return out;
}
async function fetchPage(url,{fetchImpl=fetch,timeoutMs=8000}={}){
  const r=await fetchImpl(url,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (compatible; PRISTEEL-Procurement-Research/1.0; +https://prissteel.com)','Accept':'text/html,application/xhtml+xml;q=0.9,*/*;q=0.7'},signal:AbortSignal.timeout(timeoutMs)});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const ct=String(r.headers?.get?.('content-type')||'');
  if(ct&&!/html|text/i.test(ct))throw new Error('non-html');
  return{url:r.url||url,html:await r.text()};
}
function winner(row){const p=row?.payload&&typeof row.payload==='object'?row.payload:{};return p.winner&&typeof p.winner==='object'?p.winner:{};}
function organizations(w){return Array.isArray(w?.contact_enrichment?.organizations)?w.contact_enrichment.organizations:[];}
function winnerNames(w){return unique([...(Array.isArray(w?.names)?w.names:[]),w?.name].map(text).filter(Boolean));}
function siteSeeds(w){return unique([...organizations(w).map(o=>o?.official_website),...(Array.isArray(w?.websites)?w.websites:[]),w?.website].map(text).filter(Boolean));}
async function researchRow(row,{fetchImpl=fetch}={}){
  const w=winner(row),orgs=organizations(w),names=winnerNames(w),sites=siteSeeds(w);
  if(names.length>1||orgs.length>1){const c=classifyCompanyText('',{organizationCount:Math.max(names.length,orgs.length)});return{...c,source_urls:sites.slice(0,5)};}
  const nameEvidence=` awarded company ${names.join(' ')}`;
  const nameOnly=classifyCompanyText(nameEvidence,{organizationCount:1});
  if(nameOnly.company_type!=='unknown'&&['medium','high'].includes(nameOnly.confidence))return{...nameOnly,source_urls:[],text_chars:nameEvidence.length,classification_method:'legal_name'};
  let combined=nameEvidence,sources=[];
  for(const seed of sites.slice(0,2)){
    try{
      const home=await fetchPage(seed,{fetchImpl});
      combined+=' '+stripHtml(home.html);sources.push(home.url);
      for(const u of candidateLinks(home.html,home.url).slice(0,3)){
        try{const p=await fetchPage(u,{fetchImpl});combined+=' '+stripHtml(p.html);sources.push(p.url);}catch{}
      }
      if(combined.length>1200)break;
    }catch{}
  }
  const c=classifyCompanyText(combined,{organizationCount:1});
  return{...c,source_urls:unique(sources).slice(0,6),text_chars:combined.length,classification_method:sources.length?'public_web':'legal_name_unresolved'};
}
async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){
  const r=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await r.text();
  if(!r.ok)throw new Error(`${method} ${path} failed: HTTP ${r.status} ${raw.slice(0,700)}`);
  return raw?JSON.parse(raw):[];
}
async function patchRow(access,row,result){
  const p={...(row.payload||{})},w={...winner(row)};
  w.company_type=result.company_type;
  w.company_classification={version:VERSION,company_type:result.company_type,confidence:result.confidence,scores:result.scores,evidence:result.evidence,source_urls:result.source_urls||[],classification_method:result.classification_method||'rules',classified_at:new Date().toISOString()};
  p.winner=w;p.workflow_track='ted_award_sales';p.business_mode='winner_outreach';p.company_verification_required=result.company_type==='unknown';p.cooperation_angle=cooperationAngle(result.company_type);
  await rest({...access,path:`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,method:'PATCH',body:{payload:p,updated_at:new Date().toISOString()},prefer:'return=minimal'});
}
async function writeSummary(summary){await mkdir('tmp',{recursive:true});await writeFile('tmp/ted-winner-company-classification.json',JSON.stringify(summary,null,2));}
export async function runTedWinnerCompanyClassification({mode=process.env.SYNC_MODE||'preview',minScore=Number(process.env.TED_COMPANY_MIN_SCORE||85),maxRows=Number(process.env.TED_COMPANY_MAX_ROWS||20),fetchImpl=fetch,supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'',bearerToken=''}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const access=apiKey?{supabaseUrl,apiKey,bearerToken:bearerToken||apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});
  const raw=await rest({...access,path:`kek_tender_watch?select=id,title,relevance_score,status,payload&relevance_score=gte.${encodeURIComponent(minScore)}&order=published_date.desc&limit=500`});
  const candidates=(Array.isArray(raw)?raw:[]).filter(r=>{const p=r?.payload||{},w=winner(r),c=w.company_classification,current=String(w.company_type||c?.company_type||'unknown');return String(p.source||'').toUpperCase()==='TED'&&p.notice_phase==='award'&&r.status!=='ignored'&&winnerNames(w).length&&!['producer','gc_epc','trader_consortium'].includes(current)&&(!c||c.version!==VERSION);}).slice(0,Math.max(0,maxRows));
  const results=[];
  for(const row of candidates){
    try{const result=await researchRow(row,{fetchImpl});if(mode==='apply')await patchRow(access,row,result);results.push({id:row.id,title:row.title,company_type:result.company_type,confidence:result.confidence,scores:result.scores,source_urls:result.source_urls||[],classification_method:result.classification_method||'rules'});}
    catch(e){results.push({id:row.id,title:row.title,company_type:'unknown',confidence:'error',error:String(e?.message||e)});}
  }
  const summary={mode,version:VERSION,auth_mode:access.authMode||'service_key',minimum_score:minScore,max_rows:maxRows,candidates:candidates.length,classified:results.filter(x=>x.confidence!=='error').length,producer:results.filter(x=>x.company_type==='producer').length,gc_epc:results.filter(x=>x.company_type==='gc_epc').length,trader_consortium:results.filter(x=>x.company_type==='trader_consortium').length,unknown:results.filter(x=>x.company_type==='unknown').length,errors:results.filter(x=>x.confidence==='error').length,results};
  await writeSummary(summary);
  console.log(`TED winner company classification ${mode}: candidates=${summary.candidates}, producer=${summary.producer}, gc_epc=${summary.gc_epc}, unknown=${summary.unknown}.`);
  return summary;
}

const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct)runTedWinnerCompanyClassification().catch(async error=>{try{await writeSummary({error:String(error?.message||error),mode:process.env.SYNC_MODE||'preview'});}catch{}console.error(error?.message||error);process.exit(1);});
