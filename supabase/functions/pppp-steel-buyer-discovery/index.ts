import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ANON=Deno.env.get("SUPABASE_ANON_KEY")||"";
const db=createClient(SUPABASE_URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
const VERSION="pppp-steel-buyer-discovery-v2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-pppp-cron-secret","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const text=(v:any,n=1000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...H,"Cache-Control":"no-store"}});
const badDomains=new Set(["facebook.com","linkedin.com","instagram.com","youtube.com","x.com","twitter.com","wikipedia.org","wikidata.org"]);

function businessDay(){
 return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Budapest",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function domainOf(v:any){
 try{return new URL(text(v,1000)).hostname.toLowerCase().replace(/^www\./,"");}catch{return"";}
}
function num(v:any){
 const raw=String(v??"").trim();
 if(!raw)return null;
 const n=Number(raw.replace(/[^\d.\-]/g,""));
 return Number.isFinite(n)?Math.max(0,Math.round(n)):null;
}
function sizeBand(employees:number|null){
 if(employees==null)return"unknown";
 return employees>=5000?"enterprise":employees>=500?"large":employees>=50?"medium":employees>=10?"small":"micro";
}
function consumption(industry:any,employees:number|null){
 const s=text(industry,500).toLowerCase();
 if(/shipbuild|rolling stock|railway|trailer|heavy machinery|construction equipment|steel fabrication|metal fabrication|commercial vehicle/.test(s))return employees!=null&&employees<50?"medium":"high";
 if(/machinery|automotive|metal|manufactur|engineering|construction/.test(s))return employees!=null&&employees>=250?"high":"medium";
 return"unknown";
}
async function authorized(req:Request){
 const secret=text(req.headers.get("x-pppp-cron-secret"),500);
 if(secret){
  const q=await db.rpc("gmail_tracker_cron_authorized",{provided:secret});
  if(!q.error&&q.data===true)return{kind:"cron",id:"daily"};
 }
 const auth=req.headers.get("Authorization")||"";
 if(!auth.toLowerCase().startsWith("bearer ")||!ANON)return null;
 const client=createClient(SUPABASE_URL,ANON,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const u=await client.auth.getUser();
 return u.error||!u.data.user?null:{kind:"user",id:u.data.user.id};
}
async function wikidata(limit:number){
 const offset=(Math.floor(Date.now()/86400000)%20)*limit;
 const query=[
  "SELECT DISTINCT ?company ?companyLabel ?website ?countryCode ?industryLabel ?employees ?revenue WHERE {",
  " VALUES ?companyType { wd:Q783794 wd:Q4830453 }",
  " VALUES ?industry { wd:Q3406654 wd:Q25528380 wd:Q3063796 wd:Q953045 wd:Q474200 }",
  " ?company wdt:P31 ?companyType; wdt:P856 ?website; wdt:P452 ?industry; wdt:P17 ?country.",
  " VALUES ?country { wd:Q183 wd:Q40 wd:Q39 wd:Q145 wd:Q142 wd:Q38 wd:Q31 wd:Q55 wd:Q159 wd:Q213 wd:Q36 wd:Q218 wd:Q219 wd:Q41 wd:Q191 wd:Q211 wd:Q224 wd:Q236 wd:Q27 wd:Q28 wd:Q29 wd:Q45 wd:Q33 wd:Q34 wd:Q35 wd:Q212 wd:Q214 wd:Q215 wd:Q217 wd:Q221 wd:Q222 wd:Q223 wd:Q225 wd:Q229 wd:Q233 wd:Q237 wd:Q238 wd:Q20 }",
  " ?country wdt:P297 ?countryCode.",
  " OPTIONAL { ?company wdt:P1128 ?employees. }",
  " OPTIONAL { ?company wdt:P2139 ?revenue. }",
  ' SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de". }',
  "} ORDER BY ?company LIMIT "+Math.max(10,Math.min(80,limit))+" OFFSET "+offset
 ].join("\n");
 const endpoint="https://query.wikidata.org/sparql?format=json&query="+encodeURIComponent(query);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const r=await fetch(endpoint,{headers:{"Accept":"application/sparql-results+json","User-Agent":"PPPP-PriSteel/1.0 (daily public company discovery)","Cache-Control":"no-cache"},signal:controller.signal});
  if(!r.ok)throw new Error("wikidata_http_"+r.status);
  const data=await r.json();
  return Array.isArray(data?.results?.bindings)?data.results.bindings:[];
 }finally{clearTimeout(timer);}
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return json({ok:false,error:"method_not_allowed"},405);
 const actor=await authorized(req);
 if(!actor)return json({ok:false,error:"unauthorized"},401);
 let body:any={};try{body=await req.json();}catch{}
 const day=businessDay(),force=body?.force===true&&actor.kind==="user",limit=Math.max(10,Math.min(80,Number(body?.limit||40)));
 const prior=await db.from("pppp_steel_buyer_discovery_runs_v1").select("*").eq("run_date",day).maybeSingle();
 if(prior.error)return json({ok:false,error:prior.error.message,version:VERSION},500);
 const recentRunning=prior.data?.status==='running'&&Date.now()-new Date(prior.data.started_at).getTime()<2*60*60*1000;
 if(prior.data&&!force&&!['failed','skipped'].includes(prior.data.status)&&prior.data.status!=='running'||recentRunning)return json({ok:true,skipped:true,reason:"daily_run_already_exists",run:prior.data,version:VERSION,
  outbound_created:false,gmail_draft_created:false,external_email_sent:false});
 const start=new Date().toISOString();
 const up=await db.from("pppp_steel_buyer_discovery_runs_v1").upsert({
  run_date:day,status:"running",source:"wikidata_public_sparql",started_at:start,finished_at:null,error_message:null,
  discovered_count:0,inserted_count:0,duplicate_count:0,routing_review_count:0,
  payload:{version:VERSION,actor:actor.kind,requested_limit:limit,public_source_only:true,no_paid_api:true,no_email:true}
 },{onConflict:"run_date"}).select("*").single();
 if(up.error)return json({ok:false,error:up.error.message,version:VERSION},500);
 const run=up.data;
 try{
  const rows=await wikidata(limit);
  let inserted=0,duplicates=0,routing=0,rejected=0,errors=0;
  const rejection_reasons={missing_name:0,missing_domain:0,blocked_domain:0,unrouted:0};
  const candidates:any[]=[];
  for(const x of rows){
   const name=text(x?.companyLabel?.value,500),website=text(x?.website?.value,1000),domain=domainOf(website);
   if(!name){rejected++;rejection_reasons.missing_name++;continue;}
   if(!domain){rejected++;rejection_reasons.missing_domain++;continue;}
   if(badDomains.has(domain)){rejected++;rejection_reasons.blocked_domain++;continue;}
   const employees=num(x?.employees?.value),industry=text(x?.industryLabel?.value,500),potential=consumption(industry,employees);
   const entity=text(x?.company?.value,1000),country=text(x?.countryCode?.value,3).toUpperCase();
   const payload={
    external_key:"wikidata:"+entity.split("/").pop(),company_name:name,website,country_code:country,industry,
    employees:employees==null?null:String(employees),revenue_text:text(x?.revenue?.value,200)||null,
    size_band:sizeBand(employees),consumption_potential:potential,
    business_summary:[industry,employees!=null?employees+" employees":""].filter(Boolean).join(" · "),
    source_url:entity,evidence:[{source:"Wikidata",url:entity,claim:"Official website and public industry classification",verified_at:start}]
   };
   candidates.push(payload);
  }
  if(candidates.length){
   const q=await db.rpc("pppp_register_steel_buyer_discovery_batch_v1",{p_run_id:run.id,p_candidates:candidates});
   if(q.error)throw q.error;
   inserted=Number(q.data?.inserted_count||0);duplicates=Number(q.data?.duplicate_count||0);
   routing=Number(q.data?.routing_review_count||0);errors=Number(q.data?.error_count||0);
   const staged=Number(q.data?.staged_count||0);
   if(staged){rejected+=staged;rejection_reasons.unrouted+=staged;}
  }
  const finished=new Date().toISOString(),result={discovered_count:rows.length,inserted_count:inserted,duplicate_count:duplicates,
   routing_review_count:routing,rejected_count:rejected,error_count:errors,rejection_reasons};
  const completed=await db.from("pppp_steel_buyer_discovery_runs_v1").update({status:"succeeded",
   discovered_count:result.discovered_count,inserted_count:inserted,duplicate_count:duplicates,routing_review_count:routing,finished_at:finished,
   payload:{...run.payload,...result,completed_at:finished,no_outbound_created:true,no_gmail_draft_created:true,no_external_email_sent:true}}).eq("id",run.id);
  if(completed.error)throw completed.error;
  return json({ok:true,version:VERSION,run_id:run.id,run_date:day,...result,human_review_required:true,
   outbound_created:false,gmail_draft_created:false,external_email_sent:false});
 }catch(error){
  const message=text((error as any)?.message||error,1000);
  await db.from("pppp_steel_buyer_discovery_runs_v1").update({status:"failed",error_message:message,finished_at:new Date().toISOString()}).eq("id",run.id);
  return json({ok:false,error:message,version:VERSION,outbound_created:false,gmail_draft_created:false,external_email_sent:false},500);
 }
});
