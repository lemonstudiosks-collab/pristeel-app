import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";

const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'');
const H={'content-type':'application/json'};
const T=(v:any)=>String(v??'').trim();
const UUID=(v:any)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(T(v));

async function worker(req:Request){const key=req.headers.get('x-pppp-worker-key')||'';if(!key)return null;const {data,error}=await db.rpc('semantic_worker_authorize',{p_key:key});if(error||!data)return null;return T(data)}
function reply(body:any,status=200){return new Response(JSON.stringify(body),{status,headers:H})}

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
      // The currently running Monterey worker validates payload version 3.
      // Server v4 payloads are schema-compatible, so only the copy returned to the worker is downgraded.
      // The canonical DB payload remains v4 and is applied by the v4 orchestrator after completion.
      if(job?.payload&&Number(job.payload.worker_payload_version||0)===4){
        job=structuredClone(job);
        job.payload.worker_payload_version=3;
        job.payload.server_semantic_version=4;
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
