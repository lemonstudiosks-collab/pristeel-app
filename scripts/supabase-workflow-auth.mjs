import fs from 'node:fs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';

export function readPublicSupabaseConfig(file='pristeel-procurement.html'){
  const html=fs.readFileSync(file,'utf8');
  const um=html.match(/var\s+_SB_URL\s*=\s*['\"]([^'\"]+)['\"]/);
  const km=html.match(/var\s+_SB_KEY\s*=\s*['\"]([^'\"]+)['\"]/);
  if(!km)throw new Error('Could not read PPPP Supabase public key.');
  return{url:um&&um[1]||DEFAULT_SUPABASE_URL,key:km[1]};
}

export async function resolveSupabaseWorkflowAccess({
  supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,
  serviceKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'',
  syncEmail=process.env.PPPP_SYNC_EMAIL||'',
  syncPassword=process.env.PPPP_SYNC_PASSWORD||'',
  fetchImpl=fetch,
  configFile='pristeel-procurement.html'
}={}){
  if(serviceKey){
    return{supabaseUrl,apiKey:serviceKey,bearerToken:serviceKey,authMode:'service_key'};
  }
  if(!syncEmail||!syncPassword)throw new Error('No Supabase service key or PPPP sync account is configured.');
  const pub=readPublicSupabaseConfig(configFile);
  const url=supabaseUrl||pub.url;
  const response=await fetchImpl(`${url}/auth/v1/token?grant_type=password`,{
    method:'POST',
    headers:{apikey:pub.key,'Content-Type':'application/json'},
    body:JSON.stringify({email:syncEmail,password:syncPassword})
  });
  const raw=await response.text();
  if(!response.ok)throw new Error(`PPPP sync account auth failed: HTTP ${response.status} ${raw.slice(0,300)}`);
  const session=raw?JSON.parse(raw):{};
  if(!session.access_token)throw new Error('PPPP sync account auth returned no access token.');
  return{supabaseUrl:url,apiKey:pub.key,bearerToken:session.access_token,authMode:'pppp_sync_account'};
}
