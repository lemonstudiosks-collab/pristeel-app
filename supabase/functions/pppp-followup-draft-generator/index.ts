import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SA_JSON=Deno.env.get('GOOGLE_SA_JSON')!;
const GMAIL_USER=Deno.env.get('GMAIL_USER')!;
const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-pppp-cron-secret',
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Content-Type':'application/json'
};
const text=(v:any,max=12000)=>String(v==null?'':v).replace(/\r/g,'').trim().slice(0,max);
const safeHeader=(v:any)=>text(v,500).replace(/[\r\n]+/g,' ');

function b64url(input:Uint8Array|string){
  const bytes=typeof input==='string'?new TextEncoder().encode(input):input;
  let bin=''; for(const b of bytes) bin+=String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function pemToArrayBuffer(pem:string){
  const body=pem.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s+/g,'');
  const bin=atob(body),buf=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  return buf.buffer;
}
function encodeHeader(s:string){
  const clean=safeHeader(s);
  if(/^[\x20-\x7E]*$/.test(clean)) return clean;
  const bytes=new TextEncoder().encode(clean); let bin=''; for(const b of bytes)bin+=String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}

let cachedToken:{token:string;exp:number}|null=null;
async function gmailToken(){
  const now=Math.floor(Date.now()/1000);
  if(cachedToken&&cachedToken.exp>now+60)return cachedToken.token;
  const sa=JSON.parse(SA_JSON);
  const scope='https://www.googleapis.com/auth/gmail.compose';
  const header={alg:'RS256',typ:'JWT'};
  const claim={iss:sa.client_email,sub:GMAIL_USER,scope,aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600};
  const unsigned=`${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key=await crypto.subtle.importKey('pkcs8',pemToArrayBuffer(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned)));
  const jwt=`${unsigned}.${b64url(sig)}`;
  const r=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})
  });
  const data=await r.json();
  if(!r.ok)throw new Error(`Google token ${r.status}: ${JSON.stringify(data).slice(0,400)}`);
  cachedToken={token:data.access_token,exp:now+(data.expires_in||3600)};
  return cachedToken.token;
}
async function authorized(req:Request){
  const provided=req.headers.get('x-pppp-cron-secret')||'';
  if(!provided)return false;
  const {data,error}=await db.rpc('gmail_tracker_cron_authorized',{provided});
  return !error&&data===true;
}

function greeting(lang:string){
  if(lang==='de')return 'Guten Tag,';
  if(lang==='sq')return 'Përshëndetje,';
  if(lang==='sr')return 'Poštovani,';
  return 'Hello,';
}
function closing(lang:string){
  if(lang==='de')return 'Vielen Dank im Voraus.\n\nMit freundlichen Grüßen\nPriSteel';
  if(lang==='sq')return 'Faleminderit paraprakisht.\n\nMe respekt,\nPriSteel';
  if(lang==='sr')return 'Hvala unapred.\n\nSrdačan pozdrav,\nPriSteel';
  return 'Thank you in advance.\n\nBest regards,\nPriSteel';
}
function bodyFor(a:any){
  const lang=text(a.lang,10).toLowerCase()||'en';
  const project=text(a.project_name,500)||'the project';
  const supplier=a.party_type==='supplier';
  let main='';
  if(supplier){
    if(lang==='de')main=`kurze Rückfrage zu unserer Anfrage für „${project}“. Könnten Sie uns bitte mitteilen, wann wir mit Ihrem Angebot bzw. Ihrer Kalkulation rechnen können?`;
    else if(lang==='sq')main=`vetëm një kujtesë e shkurtër lidhur me kërkesën tonë për “${project}”. Ju lutem, a mund të na tregoni kur mund ta presim ofertën/kalkulimin tuaj?`;
    else if(lang==='sr')main=`kratak podsetnik u vezi sa našim upitom za „${project}“. Molimo vas da nam javite kada možemo očekivati vašu ponudu/kalkulaciju.`;
    else main=`just a short follow-up regarding our RFQ for “${project}”. Could you please let us know when we may expect your quotation/calculation?`;
  }else{
    if(lang==='de')main=`kurze Rückfrage zu unserer letzten Korrespondenz bezüglich „${project}“. Wir würden uns über eine kurze Rückmeldung zum aktuellen Stand freuen. Falls Sie noch Informationen oder Klärungen von unserer Seite benötigen, stehen wir gerne zur Verfügung.`;
    else if(lang==='sq')main=`vetëm një follow-up i shkurtër lidhur me komunikimin tonë të fundit për “${project}”. Do ta vlerësonim një përditësim të shkurtër mbi statusin aktual. Nëse ju nevojitet ndonjë sqarim ose informacion shtesë nga ana jonë, jemi në dispozicion.`;
    else if(lang==='sr')main=`kratak follow-up u vezi sa našom poslednjom komunikacijom za „${project}“. Bili bismo zahvalni na kratkoj informaciji o trenutnom statusu. Ukoliko su vam potrebna dodatna pojašnjenja ili informacije sa naše strane, stojimo vam na raspolaganju.`;
    else main=`just a short follow-up regarding our recent communication about “${project}”. We would appreciate a brief update on the current status. If you need any clarification or additional information from our side, we remain at your disposal.`;
  }
  return `${greeting(lang)}\n\n${main}\n\n${closing(lang)}`;
}
function rawFor(a:any){
  const subject=safeHeader(a.last_outgoing_subject||a.project_name||'PriSteel follow-up');
  const refs=safeHeader(a.last_outgoing_rfc822_message_id||'');
  const headers=[
    `To: ${safeHeader(a.contact_email)}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit'
  ];
  if(refs){headers.push(`In-Reply-To: ${refs}`);headers.push(`References: ${refs}`);}
  headers.push('',bodyFor(a));
  return headers.join('\r\n');
}
async function createDraft(a:any){
  const tk=await gmailToken();
  const message:any={raw:b64url(rawFor(a)),threadId:safeHeader(a.last_outgoing_gmail_thread_id)};
  const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}/drafts`,{
    method:'POST',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify({message})
  });
  const data=await r.json();
  if(!r.ok)throw new Error(`Gmail draft ${r.status}: ${JSON.stringify(data).slice(0,600)}`);
  return data;
}
async function refreshCandidates(){
  const {error}=await db.rpc('pppp_refresh_followup_draft_candidates_v1');
  if(error)throw error;
}
async function run(limit=20){
  await refreshCandidates();
  const {data,error}=await db.from('pppp_followup_draft_queue_v1').select('*').order('due_date',{ascending:true}).order('updated_at',{ascending:true}).limit(Math.min(50,Math.max(1,limit)));
  if(error)throw error;
  let created=0,skipped=0,failed=0;
  const errors:any[]=[];
  for(const a of data||[]){
    if(a.gmail_draft_id){skipped++;continue;}
    try{
      const draft=await createDraft(a);
      const now=new Date().toISOString();
      const {error:updateError}=await db.from('pppp_followup_drafts_v1').update({
        status:'draft_ready',gmail_draft_id:draft.id,gmail_message_id:draft.message?.id||null,
        gmail_thread_id:draft.message?.threadId||a.last_outgoing_gmail_thread_id,
        human_send_required:true,last_error:null,updated_at:now
      }).eq('id',a.id).eq('status','candidate');
      if(updateError)throw updateError;
      const marker=`PPPP: Gmail follow-up draft gati (${draft.id}). Human gate: shqyrto tekstin dhe dërgoje vetë nga Gmail; PPPP nuk e dërgon automatikisht.`;
      const old=text(a.task_detail,10000);
      const detail=old.includes('PPPP: Gmail follow-up draft gati')?old:`${old}${old?'\n\n':''}${marker}`;
      await db.from('tasks').update({detail}).eq('id',a.task_id);
      created++;
    }catch(e){
      failed++;
      const msg=String(e instanceof Error?e.message:e).slice(0,700);
      errors.push({id:a.id,task_id:a.task_id,error:msg});
      await db.from('pppp_followup_drafts_v1').update({last_error:msg,updated_at:new Date().toISOString()}).eq('id',a.id);
    }
  }
  return {candidates:(data||[]).length,created,skipped,failed,errors:errors.slice(0,10),human_send_required:true};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='GET')return new Response(JSON.stringify({ok:false,error:'GET required'}),{status:405,headers:cors});
  if(!(await authorized(req)))return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:cors});
  try{
    const u=new URL(req.url),limit=Number(u.searchParams.get('limit')||20);
    const out=await run(limit);
    return new Response(JSON.stringify({ok:true,...out}),{headers:cors});
  }catch(e){
    return new Response(JSON.stringify({ok:false,error:String(e instanceof Error?e.message:e)}),{status:500,headers:cors});
  }
});
