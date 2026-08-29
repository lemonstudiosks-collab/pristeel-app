import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";

const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'');
const H={'content-type':'application/json'};
const T=(v:any)=>String(v??'').trim();
const A=(v:any)=>Array.isArray(v)?v:[];
const UUID=(v:any)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(T(v));

async function worker(req:Request){const key=req.headers.get('x-pppp-worker-key')||'';if(!key)return null;const {data,error}=await db.rpc('semantic_worker_authorize',{p_key:key});if(error||!data)return null;return T(data)}
function reply(body:any,status=200){return new Response(JSON.stringify(body),{status,headers:H})}
function compactSchema(raw:any){
  const s=raw&&typeof raw==='object'?structuredClone(raw):{};
  const p=s?.properties||{};
  const str=(k:string,n:number)=>{if(p[k]&&p[k].type==='string')p[k].maxLength=n};
  const arr=(k:string,maxItems:number,maxLength:number)=>{if(!p[k]||p[k].type!=='array')return;p[k].maxItems=maxItems;if(p[k].items&&p[k].items.type==='string')p[k].items.maxLength=maxLength};
  str('summary',160);
  arr('required_capabilities',3,40);
  arr('required_grades',3,40);
  arr('requirements',2,100);
  arr('risks',2,100);
  arr('missing_information',2,100);
  arr('recommended_supplier_names',2,100);
  arr('rfq_scope_lines',2,100);
  return s;
}
function compactForMonterey(p:any){
  const ctx=p?.context||{};
  const latest=p?.meta?.latest_incoming||null;
  const meta={latest_incoming:latest?{gmail_message_id:latest.gmail_message_id,subject:T(latest.subject).slice(0,180),snippet:T(latest.snippet).slice(0,450),sent_at:latest.sent_at,from_email:latest.from_email,sender_role:latest.sender_role}:null};
  const sources=A(p?.sources).slice(0,3).map((s:any)=>({id:s?.id,type:s?.type,label:T(s?.label).slice(0,100),date:s?.date,text:T(s?.text).slice(0,320),meta:s?.meta}));
  const candidates=A(p?.supplier_candidates).slice(0,5).map((s:any)=>({name:s?.name,business_type:s?.business_type,categories:A(s?.categories).slice(0,5),grades:A(s?.grades).slice(0,5),class_approval:s?.class_approval,deterministic_score:s?.deterministic_score,contacts:A(s?.contacts).slice(0,1).map((c:any)=>({full_name:c?.full_name,email:c?.email,language:c?.language,is_primary:c?.is_primary}))}));
  const compactInstruction=' Output compact JSON only: summary <=160 characters; requirements, risks, missing_information, recommended_supplier_names and rfq_scope_lines max 2 short items each; required_capabilities and required_grades max 3 items each; use [] when absent; no markdown or code fences.';
  return {worker_payload_version:3,server_semantic_version:4,system:T(p?.system)+compactInstruction,response_schema:compactSchema(p?.response_schema),trigger:p?.trigger,guard:p?.guard,bom:p?.bom,deterministic:p?.deterministic,supplier_candidates:candidates,meta,context:{project:ctx?.project,current_rfqs:A(ctx?.current_rfqs).slice(0,2),supplier_offers:A(ctx?.supplier_offers).slice(0,2)},sources};
}

Deno.serve(async req=>{
  try{
    const label=await worker(req);
    if(!label)return reply({ok:false,error:'unauthorized'},401);
    const body=req.method==='POST'?await req.json().catch(()=>({})):{};
    const action=T(body.action||'health').toLowerCase();
    if(action==='health')return reply({ok:true,worker:label,time:new Date().toISOString()});
    if(action==='claim'){
      const {data,error}=await db.rpc('semantic_claim_job',{p_worker_label:label});
      if(error)throw error;
      let job=data||null;
      // Keep canonical v4 payload in DB. Return a tightly bounded v3-compatible copy to the Monterey worker.
      if(job?.payload&&Number(job.payload.worker_payload_version||0)===4){
        job=structuredClone(job);
        job.payload=compactForMonterey(job.payload);
      }
      return reply({ok:true,job});
    }
    if(action==='complete'){
      const id=T(body.job_id);
      if(!UUID(id))return reply({ok:false,error:'invalid job_id'},400);
      const err=T(body.error),result=body.result&&typeof body.result==='object'&&!Array.isArray(body.result)?body.result:null;
      if(!err&&!result)return reply({ok:false,error:'result or error required'},400);
      const {data,error}=await db.rpc('semantic_complete_job',{p_job_id:id,p_worker_label:label,p_model:T(body.model)||null,p_result:result,p_error:err||null});
      if(error)throw error;
      if(data!==true)return reply({ok:false,error:'job is no longer claimable by this worker'},409);
      return reply({ok:true,job_id:id,state:err?'failed':'completed'});
    }
    return reply({ok:false,error:'unsupported action'},400);
  }catch(e){return reply({ok:false,error:String((e as any)?.message||e)},500)}
});