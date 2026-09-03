import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_KEY=Deno.env.get('OPENAI_API_KEY')!;
const MODEL=Deno.env.get('OPENAI_PROSPECTING_MODEL')||Deno.env.get('OPENAI_ASSISTANT_MODEL')||'gpt-5.6-sol';
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-pppp-cron-secret','Access-Control-Allow-Methods':'GET, OPTIONS','Content-Type':'application/json'};
const ALLOWED=new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','GB','CH','ME','RS']);
const text=(v:any,max=10000)=>String(v==null?'':v).trim().slice(0,max);
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

function domain(v:any){
  let s=text(v,500).toLowerCase();
  s=s.replace(/^[a-z][a-z0-9+.-]*:\/\//i,'').split('/')[0].split('?')[0].split('#')[0].split(':')[0].replace(/^www\./,'');
  return s||null;
}
function emailDomain(v:any){const e=text(v,300).toLowerCase();const i=e.lastIndexOf('@');return i>0?domain(e.slice(i+1)):null;}
function validEmail(v:any){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(v,300).toLowerCase());}
function isCorporateEmail(email:string,d:string|null){
  if(!validEmail(email)||!d)return false;
  const ed=emailDomain(email); if(!ed)return false;
  return ed===d||ed.endsWith('.'+d)||d.endsWith('.'+ed);
}
function outputText(data:any){
  if(typeof data?.output_text==='string')return data.output_text;
  for(const item of data?.output||[])if(item?.type==='message')for(const c of item?.content||[])if(c?.type==='output_text'&&typeof c.text==='string')return c.text;
  return '';
}
async function authorized(req:Request){
  const provided=req.headers.get('x-pppp-cron-secret')||''; if(!provided)return false;
  const {data,error}=await db.rpc('gmail_tracker_cron_authorized',{provided});
  return !error&&data===true;
}
async function fetchText(url:string,timeout=7000){
  try{
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
    const r=await fetch(url,{signal:ctl.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (compatible; PriSteel-Research/1.0)','Accept':'text/html,application/xhtml+xml'}});
    clearTimeout(timer); if(!r.ok)return null;
    const ct=r.headers.get('content-type')||''; if(!ct.includes('text')&&!ct.includes('html'))return null;
    return (await r.text()).slice(0,1500000);
  }catch{return null;}
}
function extractEmails(html:string,d:string){
  const found=new Set<string>();
  for(const m of html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)){
    const e=m[0].toLowerCase().replace(/[).,;:]+$/,''); if(isCorporateEmail(e,d))found.add(e);
  }
  return [...found];
}
function emailScore(e:string){
  const local=e.split('@')[0].toLowerCase();
  if(/(procurement|purchas|einkauf|beschaffung|supply|sourcing|subcontract|ausschreib|tender|estimating|estimation|kalkulation|kalkulationen|vergabe)/.test(local))return 92;
  if(/(projekt|project|commercial|angebot|office|kontakt|contact)/.test(local))return 76;
  if(/^(info|mail|hello|reception|sekretariat|centrala)$/.test(local))return 60;
  return 72;
}
async function verifyOrFindEmail(candidate:any){
  const d=domain(candidate.company_domain||candidate.website_url||emailDomain(candidate.contact?.email));
  if(!d)return {email:null,source:null,confidence:0};
  const proposed=text(candidate.contact?.email,300).toLowerCase();
  const src=text(candidate.contact?.source_url,1000);
  if(proposed&&isCorporateEmail(proposed,d)&&src){
    const html=await fetchText(src); if(html&&html.toLowerCase().includes(proposed))return {email:proposed,source:src,confidence:Math.max(80,Math.min(100,Number(candidate.contact?.confidence)||80))};
  }
  const website=text(candidate.website_url,1000);
  if(!/^https?:\/\//i.test(website))return {email:null,source:null,confidence:0};
  let origin=''; try{origin=new URL(website).origin;}catch{return {email:null,source:null,confidence:0};}
  const paths=['','/contact','/kontakt','/impressum','/einkauf','/procurement'];
  let best:{email:string;source:string;confidence:number}|null=null;
  for(const p of paths){
    const u=p?origin+p:website; const html=await fetchText(u); if(!html)continue;
    for(const e of extractEmails(html,d)){
      const score=emailScore(e); if(!best||score>best.confidence)best={email:e,source:u,confidence:score};
    }
    if(best&&best.confidence>=90)break;
  }
  return best||{email:null,source:null,confidence:0};
}
function providerSources(data:any){
  const out:any[]=[];
  for(const item of data?.output||[])if(item?.type==='web_search_call'){
    for(const s of item?.action?.sources||[])if(s?.url)out.push({url:s.url,title:s.title||null,type:s.type||null});
  }
  return out.slice(0,80);
}

const projectSchema={
  type:'object',additionalProperties:false,
  properties:{name:{type:'string'},location:{type:['string','null']},status:{type:'string'},source_url:{type:'string'},source_date:{type:['string','null']},relevance_reason:{type:'string'}},
  required:['name','location','status','source_url','source_date','relevance_reason']
};
const evidenceSchema={type:'object',additionalProperties:false,properties:{url:{type:'string'},title:{type:['string','null']},reason:{type:'string'},source_type:{type:'string'}},required:['url','title','reason','source_type']};
const schema={
  type:'object',additionalProperties:false,
  properties:{
    candidates:{type:'array',maxItems:20,items:{
      type:'object',additionalProperties:false,
      properties:{
        company_name:{type:'string'},company_domain:{type:['string','null']},website_url:{type:['string','null']},country:{type:'string'},country_code:{type:'string'},company_type:{type:'string',enum:['GC','GU','EPC','Design-Build']},relevance_score:{type:'integer',minimum:0,maximum:100},
        contact:{type:'object',additionalProperties:false,properties:{name:{type:['string','null']},email:{type:['string','null']},role:{type:['string','null']},source_url:{type:['string','null']},confidence:{type:'integer',minimum:0,maximum:100}},required:['name','email','role','source_url','confidence']},
        current_projects:{type:'array',maxItems:4,items:projectSchema},recent_projects:{type:'array',maxItems:4,items:projectSchema},evidence:{type:'array',minItems:1,maxItems:8,items:evidenceSchema}
      },
      required:['company_name','company_domain','website_url','country','country_code','company_type','relevance_score','contact','current_projects','recent_projects','evidence']
    }}
  },required:['candidates']
};

async function openaiResearch(limit:number,known:string[],hints:any[],enrich:any[]){
  const today=new Date().toISOString().slice(0,10);
  const instructions=`You are the public-source business research engine for PriSteel, a steel fabrication and industrial metalwork supplier. Return JSON only via the supplied schema. Use web search extensively and never invent companies, projects, email addresses, roles, URLs, dates, or facts.\n\nGoal: identify high-quality NEW General Contractors / Generalunternehmer / EPC / Design-Build contractors that PriSteel could approach as a fabrication subcontractor. Target countries: EU-27 plus United Kingdom, Switzerland, Montenegro, Serbia. Exclude architects, developers that do not self-perform/contract construction, consultants, pure steel producers, staffing firms and directories.\n\nRelevance: structural steel, bridges, rail, industrial plants, energy/substations, data centers, logistics, large buildings and infrastructure. Each candidate needs at least one publicly evidenced current, awarded, under-construction, or completed-in-the-last-24-months relevant project. Prefer mid-to-large contractors with active project pipelines.\n\nContacts: prioritize Procurement, Purchasing, Supply Chain, Einkauf, Beschaffung, Sourcing, Project Procurement, Estimating/Kalkulation, Tendering/Vergabe or subcontracting. Provide an email only if it is visibly published on a public source and belongs to the company's corporate domain. Generic info@ may be reported only with confidence <=60. Never infer an email pattern.\n\nDate: ${today}. Diversify by geography; do not return multiple subsidiaries of the same corporate group unless they have distinct domains and procurement organizations.`,
  prompt=`Produce up to ${limit} strong candidates. Avoid these already-contacted/known outreach domains:\n${known.slice(0,650).join(', ')}\n\nRecent TED award hints worth checking (not mandatory, and still exclude if already contacted):\n${JSON.stringify(hints).slice(0,10000)}\n\nExisting high-relevance prospects needing better public contact evidence; if you can enrich them, include them too rather than duplicating them:\n${JSON.stringify(enrich).slice(0,7000)}\n\nFor every factual claim include the actual public source URL in project/evidence fields. Output JSON.`;
  const body:any={model:MODEL,store:false,instructions,input:[{role:'user',content:[{type:'input_text',text:prompt}]}],tools:[{type:'web_search_preview',search_context_size:'medium'}],tool_choice:'auto',include:['web_search_call.action.sources'],reasoning:{effort:'low'},text:{format:{type:'json_schema',name:'pppp_gc_prospects',strict:true,schema}}};
  let r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${OPENAI_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  let data=await r.json();
  if(!r.ok&&String(data?.error?.message||'').toLowerCase().includes('web_search_preview')){
    body.tools=[{type:'web_search'}];
    r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${OPENAI_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)}); data=await r.json();
  }
  if(!r.ok)throw new Error(`OpenAI ${r.status}: ${JSON.stringify(data?.error||data).slice(0,900)}`);
  const raw=outputText(data); if(!raw)throw new Error('OpenAI returned no structured output');
  let parsed:any; try{parsed=JSON.parse(raw);}catch{throw new Error('OpenAI structured output was not valid JSON');}
  return {data,parsed};
}

async function run(limit:number,lane:string,force:boolean){
  const day=new Date().toISOString().slice(0,10),safeLane=(lane||'EU_UK').slice(0,40);
  const {data:existing}=await db.from('pppp_gc_discovery_runs_v1').select('*').eq('run_date',day).eq('lane',safeLane).maybeSingle();
  if(existing?.status==='succeeded'&&!force)return {skipped:true,reason:'daily_run_already_succeeded',run_id:existing.id};
  const started=new Date().toISOString();
  const {data:run,error:runErr}=await db.from('pppp_gc_discovery_runs_v1').upsert({run_date:day,lane:safeLane,status:'running',requested_count:limit,started_at:started,finished_at:null,error_message:null},{onConflict:'run_date,lane'}).select('id').single();
  if(runErr)throw runErr;
  try{
    const [{data:outreach},{data:ted},{data:enrich}]=await Promise.all([
      db.from('outreach_contacts').select('company_domain').not('company_domain','is',null).limit(900),
      db.from('pppp_ted_sales_outreach_v1').select('opportunity_id,title,winner_name,authority,relevance_score,published_date').not('winner_name','is',null).order('published_date',{ascending:false}).limit(12),
      db.from('pppp_gc_prospects_v1').select('company_name,company_domain,website_url,country,country_code,relevance_score').eq('status','research_ready').order('relevance_score',{ascending:false}).limit(5)
    ]);
    const known=[...new Set((outreach||[]).map((x:any)=>domain(x.company_domain)).filter(Boolean))] as string[];
    const research=await openaiResearch(limit,known,ted||[],enrich||[]);
    const candidates=Array.isArray(research.parsed?.candidates)?research.parsed.candidates.slice(0,limit):[];
    let accepted=0,duplicates=0,ready=0,rejected=0;
    const results:any[]=[];
    for(const c of candidates){
      const code=text(c.country_code,3).toUpperCase(); if(!ALLOWED.has(code)||Number(c.relevance_score)<55){rejected++;continue;}
      const d=domain(c.company_domain||c.website_url||emailDomain(c.contact?.email));
      let verified=await verifyOrFindEmail(c);
      if(verified.email&&d&&!isCorporateEmail(verified.email,d))verified={email:null,source:null,confidence:0};
      const params={
        p_company_name:text(c.company_name,300),p_company_domain:d,p_website_url:text(c.website_url,1000)||null,p_country:text(c.country,120),p_country_code:code,
        p_company_type:text(c.company_type,40)||'GC/GU',p_relevance_score:Math.round(Number(c.relevance_score)||0),p_contact_name:text(c.contact?.name,200)||null,p_contact_email:verified.email,
        p_contact_role:text(c.contact?.role,250)||null,p_contact_source_url:verified.source,p_contact_confidence:verified.confidence||0,p_current_projects:c.current_projects||[],p_recent_projects:c.recent_projects||[],p_evidence:c.evidence||[],
        p_discovery_source:'openai_web_search',p_source_url:text(c.evidence?.[0]?.url,1000)||text(c.website_url,1000)||null,p_discovery_run_id:run.id
      };
      const {data:up,error}=await db.rpc('pppp_gc_upsert_prospect_v1',params); if(error){results.push({company:c.company_name,error:error.message});continue;}
      const status=up?.status; if(status==='already_contacted'){duplicates++;}else{accepted++; if(status==='contact_ready')ready++;}
      results.push({company:c.company_name,status,domain:d,contact:verified.email,confidence:verified.confidence});
      await sleep(80);
    }
    const finished=new Date().toISOString(),sources=providerSources(research.data);
    await db.from('pppp_gc_discovery_runs_v1').update({status:'succeeded',discovered_count:candidates.length,accepted_count:accepted,duplicate_count:duplicates,contact_ready_count:ready,response_id:research.data?.id||null,finished_at:finished,payload:{rejected,model:research.data?.model||MODEL,provider_sources:sources.slice(0,50),results:results.slice(0,20)}}).eq('id',run.id);
    return {run_id:run.id,discovered:candidates.length,accepted,duplicates,contact_ready:ready,rejected,results,human_send_required:true,no_email_created:true};
  }catch(e){
    const msg=String(e instanceof Error?e.message:e).slice(0,1500);
    await db.from('pppp_gc_discovery_runs_v1').update({status:'failed',error_message:msg,finished_at:new Date().toISOString()}).eq('id',run.id);
    throw e;
  }
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='GET')return new Response(JSON.stringify({ok:false,error:'GET required'}),{status:405,headers:cors});
  if(!(await authorized(req)))return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:cors});
  try{
    const u=new URL(req.url),limit=Math.min(20,Math.max(1,Number(u.searchParams.get('limit')||12))),lane=text(u.searchParams.get('lane')||'EU_UK',40),force=u.searchParams.get('force')==='true';
    const out=await run(limit,lane,force); return new Response(JSON.stringify({ok:true,...out}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e instanceof Error?e.message:e)}),{status:500,headers:cors});}
});
