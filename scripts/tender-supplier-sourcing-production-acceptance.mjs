import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const TENDER='0b7e4541-fa39-4ce6-9297-75e1dda4c706';
const text=(v,max=1200)=>String(v==null?'':v).trim().slice(0,max);

async function call(body){
  const access=await resolveSupabaseWorkflowAccess({serviceKey:'',syncEmail:process.env.PPPP_SYNC_EMAIL||'',syncPassword:process.env.PPPP_SYNC_PASSWORD||''});
  if(access.authMode!=='pppp_sync_account')throw new Error('PPPP sync JWT unavailable.');
  const base=access.supabaseUrl.replace(/\/$/,'');
  const r=await fetch(base+'/functions/v1/pppp-tender-supplier-sourcing-v1',{method:'POST',headers:{apikey:access.apiKey,Authorization:'Bearer '+access.bearerToken,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const raw=await r.text();let data=null;try{data=raw?JSON.parse(raw):null;}catch{}
  if(!r.ok||!data||data.ok===false)throw new Error('supplier sourcing '+r.status+': '+text(data?.message||data?.error||raw));
  return data;
}

const base=await call({tender_id:TENDER,discover:false});
if(!Array.isArray(base.requirements)||base.requirements.length<2)throw new Error('Expected at least two extracted supply requirements.');
const round=base.requirements.find(x=>x.id==='round_bar');
const tubes=base.requirements.find(x=>x.id==='tubes');
if(!round||!tubes)throw new Error('Expected round_bar and tubes requirements.');
if(!Array.isArray(tubes.internal?.candidates))throw new Error('Internal supplier intelligence missing.');
if(base.policy?.external_discovery_on_demand_only!==true||base.policy?.email_send_allowed!==false)throw new Error('Sourcing safety policy mismatch.');

const ext=await call({tender_id:TENDER,discover:true,requirement_id:'round_bar'});
const row=ext.requirements?.[0];
if(!row||row.id!=='round_bar'||!row.external)throw new Error('Round-bar external discovery missing.');
if(!Array.isArray(row.external.queries)||row.external.queries.length<1)throw new Error('No external discovery queries executed.');
if(!row.external.queries.some(q=>q.ok===true))throw new Error('No public search tier returned a usable response.');

console.log(JSON.stringify({
  ok:true,
  requirements:base.requirements.map(x=>({id:x.id,label:x.label,strict_ready:x.internal?.strict_rfq_ready_existing||0,review_ready:x.internal?.review_rfq_ready_existing||0})),
  round_bar_discovery:{queries:row.external.queries.map(q=>({tier:q.tier,ok:q.ok})),candidates:(row.external.candidates||[]).slice(0,5).map(c=>({name:c.name,domain:c.domain,tier:c.source_tier,email:!!c.email,contact_ready:c.contact_ready,score:c.score}))}
},null,2));