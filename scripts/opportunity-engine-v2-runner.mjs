import {pathToFileURL} from 'node:url';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const DOSSIER_PATH='/functions/v1/pppp-tender-dossier-analysis';

function requestUrl(input){
  if(typeof input==='string')return input;
  if(input instanceof URL)return input.href;
  if(typeof Request!=='undefined'&&input instanceof Request)return input.url;
  return String(input||'');
}

function withHeaders(input,init,headers){
  if(typeof Request!=='undefined'&&input instanceof Request){
    return [new Request(input,{...init,headers}),undefined];
  }
  return [input,{...init,headers}];
}

export async function runOpportunityEngineWithUserDossierAuth({supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL}={}){
  const syncAccess=await resolveSupabaseWorkflowAccess({supabaseUrl,serviceKey:''});
  if(syncAccess.authMode!=='pppp_sync_account')throw new Error(`Dossier auth requires PPPP sync account, got ${syncAccess.authMode}`);

  const nativeFetch=globalThis.fetch.bind(globalThis);
  globalThis.fetch=async(input,init={})=>{
    const url=requestUrl(input);
    if(url.includes(DOSSIER_PATH)){
      const baseHeaders=typeof Request!=='undefined'&&input instanceof Request?input.headers:undefined;
      const headers=new Headers(baseHeaders||init.headers||{});
      headers.set('apikey',syncAccess.apiKey);
      headers.set('Authorization',`Bearer ${syncAccess.bearerToken}`);
      headers.set('Content-Type','application/json');
      const [nextInput,nextInit]=withHeaders(input,init,headers);
      return nextInit===undefined?nativeFetch(nextInput):nativeFetch(nextInput,nextInit);
    }
    return nativeFetch(input,init);
  };

  try{
    const {runOpportunityEngineV2}=await import('./opportunity-engine-v2.mjs');
    const result=await runOpportunityEngineV2({supabaseUrl});
    console.log(`Opportunity dossier auth: ${syncAccess.authMode}; orchestration auth: ${result?.auth_mode||'unknown'}.`);
    return result;
  }finally{
    globalThis.fetch=nativeFetch;
  }
}

const directRun=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(directRun)runOpportunityEngineWithUserDossierAuth().catch(error=>{console.error(error);process.exit(1);});
