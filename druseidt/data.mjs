import { session, PROJECT_REF } from '../spie/data.mjs';
const publicKey='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cWZwbnpxd2ZqcmplZm9rdGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzY0MzQsImV4cCI6MjEwNTA1MjQzNH0.T3FFElqBw4mb6mvh_WkfS35CNAsacPimiGG2H9J2G7E';
const cache=new Map();let cacheToken='';
async function call(path,body,write=false){
 const s=session();if(!s)throw new Error('Hapni PPPP për të hyrë, pastaj rihapni Druseidt.');
 if(cacheToken!==s.access_token){cache.clear();cacheToken=s.access_token;}
 const key=path+JSON.stringify(body),old=cache.get(key);if(!write&&old&&Date.now()-old.at<300000)return old.value;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const r=await fetch('https://'+PROJECT_REF+'.supabase.co/'+path,{method:'POST',cache:'no-store',signal:controller.signal,headers:{apikey:publicKey,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await r.json();if(!r.ok||data?.ok===false)throw new Error(data.error||data.message||('PPPP '+r.status));
  if(session()?.access_token!==s.access_token)throw new Error('Sesioni ndryshoi; rihapni modulin.');
  if(write)cache.clear();else cache.set(key,{at:Date.now(),value:data});return data;
 }finally{clearTimeout(timer);}
}
export const snapshot=()=>call('rest/v1/rpc/pppp_druseidt_snapshot_v1',{});
export const detail=id=>call('rest/v1/rpc/pppp_druseidt_lead_detail_v1',{p_id:id});
export const createDraft=(id,contact_key,mode='customer')=>call('functions/v1/pppp-druseidt-commercial',{lead_id:id,contact_key,mode},true);
export const transition=(lead,state,evidence)=>call('rest/v1/rpc/pppp_druseidt_transition_v1',{p_id:lead.id,p_state:state,p_expected:lead.updated_at,p_evidence:evidence},true);
export const invalidate=()=>cache.clear();
