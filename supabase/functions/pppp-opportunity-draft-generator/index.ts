import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveTedRecipients, normalizeEmail } from "./recipient-policy.mjs";
import { encodeRfc2047Header } from "./mime-headers.mjs";
import { buildTedDraftContent } from "./draft-content.mjs";

const SA_JSON=Deno.env.get('GOOGLE_SA_JSON')!;
const GMAIL_USER=Deno.env.get('GMAIL_USER')!;
const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-pppp-cron-secret','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Content-Type':'application/json'};
const text=(v:any,max=12000)=>String(v==null?'':v).replace(/\r/g,'').trim().slice(0,max);
const GENERATOR='pppp-opportunity-draft-generator-v7-thread-header-sent-match';
const REGISTRY='pppp_opportunity_outreach_registry_v1';
const MAX_CONTACTS_PER_ACTION=20;
const MAX_DRAFT_WRITES_PER_RUN=60;
const GMAIL_SCOPE='https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.readonly';
const META_HEADERS=['Message-ID','X-PPPP-Outreach-ID','X-PPPP-Action-ID','To','Date'];

function b64url(input:Uint8Array|string){const bytes=typeof input==='string'?new TextEncoder().encode(input):input;let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function pemToArrayBuffer(pem:string){const body=pem.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s+/g,'');const bin=atob(body),buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);return buf.buffer;}
let cachedToken:{token:string;exp:number}|null=null;
async function token(){const now=Math.floor(Date.now()/1000);if(cachedToken&&cachedToken.exp>now+60)return cachedToken.token;const sa=JSON.parse(SA_JSON),header={alg:'RS256',typ:'JWT'},claim={iss:sa.client_email,sub:GMAIL_USER,scope:GMAIL_SCOPE,aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600},unsigned=`${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;const key=await crypto.subtle.importKey('pkcs8',pemToArrayBuffer(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);const sig=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned))),jwt=`${unsigned}.${b64url(sig)}`;const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})}),data=await r.json();if(!r.ok)throw new Error(`token ${r.status}: ${JSON.stringify(data).slice(0,400)}`);cachedToken={token:data.access_token,exp:now+(data.expires_in||3600)};return cachedToken.token;}
async function authorized(req:Request){const provided=req.headers.get('x-pppp-cron-secret')||'';if(!provided)return false;const {data,error}=await db.rpc('gmail_tracker_cron_authorized',{provided});return !error&&data===true;}
function headerSafe(v:any){return text(v,500).replace(/[\r\n]+/g,' ');}
function hdr(m:any,name:string){return text((m?.payload?.headers||[]).find((x:any)=>String(x?.name||'').toLowerCase()===name.toLowerCase())?.value,1000);}
function rfcMessageId(outreachId:string){return `<pppp.${outreachId}@prissteel.com>`;}

async function tenderContext(tenderWatchId:any){const id=text(tenderWatchId,80);if(!id)return{};const {data,error}=await db.from('kek_tender_watch').select('payload,publication_no,procurement_no,source_url,detail_url,title,authority').eq('id',id).maybeSingle();if(error)throw error;const p=data?.payload&&typeof data.payload==='object'?data.payload:{};return{...p,publication_no:data?.publication_no||p.publication_no||null,procurement_no:data?.procurement_no||p.procurement_no||null,source_url:data?.source_url||p.source_url||null,detail_url:data?.detail_url||p.detail_url||null,title:data?.title||p.title||null,authority:data?.authority||p.authority||null};}

function rawFor(a:any,tender:any,recipient:any,outreachId:string,rfcId:string){
  const content=buildTedDraftContent(a,tender,recipient),to=normalizeEmail(recipient?.email);
  if(!to)throw new Error('recipient_email_required');
  const boundary=`pppp_${crypto.randomUUID().replace(/-/g,'')}`;
  const raw=[
    `To: ${headerSafe(to)}`,
    `Subject: ${encodeRfc2047Header(content.subject)}`,
    `Message-ID: ${headerSafe(rfcId)}`,
    `X-PPPP-Outreach-ID: ${headerSafe(outreachId)}`,
    `X-PPPP-Action-ID: ${headerSafe(a.id)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    content.body,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    content.html_body,
    `--${boundary}--`,
    ''
  ].join('\r\n');
  return{raw,content,to};
}
async function writeDraft(a:any,tender:any,recipient:any,row:any){const built=rawFor(a,tender,recipient,row.outreach_id,row.rfc_message_id),tk=await token(),url=`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}/drafts`,r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:JSON.stringify({message:{raw:b64url(built.raw)}})}),data=await r.json();if(!r.ok)throw new Error(`Gmail draft ${r.status}: ${JSON.stringify(data).slice(0,600)}`);return{data,content:built.content,to:built.to};}
async function deleteDraft(draftId:string){if(!draftId)return;try{const tk=await token();await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}/drafts/${encodeURIComponent(draftId)}`,{method:'DELETE',headers:{Authorization:`Bearer ${tk}`}});}catch{}}
async function gmailDraft(draftId:string){if(!draftId)return null;const tk=await token(),r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}/drafts/${encodeURIComponent(draftId)}?format=metadata`,{headers:{Authorization:`Bearer ${tk}`}});if(r.status===404)return null;const raw=await r.text();if(!r.ok)throw new Error(`Gmail draft get ${r.status}: ${raw.slice(0,500)}`);return JSON.parse(raw);}
async function gmailMessage(id:string){const tk=await token(),u=new URL(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}/messages/${encodeURIComponent(id)}`);u.searchParams.set('format','metadata');for(const h of META_HEADERS)u.searchParams.append('metadataHeaders',h);const r=await fetch(u,{headers:{Authorization:`Bearer ${tk}`}}),raw=await r.text();if(!r.ok)throw new Error(`Gmail message ${r.status}: ${raw.slice(0,500)}`);return JSON.parse(raw);}
async function gmailThread(id:string){if(!id)return null;const tk=await token(),u=new URL(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}/threads/${encodeURIComponent(id)}`);u.searchParams.set('format','metadata');for(const h of META_HEADERS)u.searchParams.append('metadataHeaders',h);const r=await fetch(u,{headers:{Authorization:`Bearer ${tk}`}}),raw=await r.text();if(r.status===404)return null;if(!r.ok)throw new Error(`Gmail thread ${r.status}: ${raw.slice(0,500)}`);return JSON.parse(raw);}
async function gmailSearch(query:string,maxResults=20){const tk=await token(),u=new URL(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}/messages`);u.searchParams.set('q',query);u.searchParams.set('maxResults',String(maxResults));const r=await fetch(u,{headers:{Authorization:`Bearer ${tk}`}}),raw=await r.text();if(!r.ok)throw new Error(`Gmail sent search ${r.status}: ${raw.slice(0,500)}`);return JSON.parse(raw||'{}');}
function isSentMatch(row:any,m:any){const labels=new Set((m?.labelIds||[]).map(String));if(!labels.has('SENT'))return false;const x=hdr(m,'X-PPPP-Outreach-ID'),mid=hdr(m,'Message-ID'),aid=hdr(m,'X-PPPP-Action-ID');if(x&&x===row.outreach_id)return true;if(mid&&mid===row.rfc_message_id)return true;return !!row.gmail_thread_id&&m?.threadId===row.gmail_thread_id&&aid===row.action_id;}
function sentMatchMethod(row:any,m:any){if(hdr(m,'X-PPPP-Outreach-ID')===row.outreach_id)return'x-pppp-outreach-id';if(hdr(m,'Message-ID')===row.rfc_message_id)return'rfc822-message-id';return'gmail-thread-id+x-pppp-action-id';}
async function findSent(row:any){
  if(row.gmail_thread_id){const t=await gmailThread(row.gmail_thread_id);for(const m of (t?.messages||[]).slice().reverse())if(isSentMatch(row,m))return m;}
  const queries=[`in:sent rfc822msgid:${row.rfc_message_id}`,`in:sent to:${row.recipient_email} newer_than:365d`];
  for(const q of queries){const data=await gmailSearch(q,q.includes('rfc822msgid:')?5:50);for(const item of data.messages||[]){const m=await gmailMessage(item.id);if(isSentMatch(row,m))return m;}}
  return null;
}
function sentAt(meta:any){const ms=Number(meta?.internalDate||0);return Number.isFinite(ms)&&ms>0?new Date(ms).toISOString():new Date().toISOString();}

async function registryRow(actionId:string,email:string){const {data,error}=await db.from(REGISTRY).select('*').eq('action_id',actionId).eq('recipient_email',normalizeEmail(email)).maybeSingle();if(error)throw error;return data;}
async function ensureRegistry(a:any,recipient:any){const email=normalizeEmail(recipient?.email);let row=await registryRow(a.id,email);if(row)return row;const outreachId=crypto.randomUUID(),now=new Date().toISOString(),candidate={outreach_id:outreachId,action_id:a.id,action_key:a.action_key,tender_watch_id:a.tender_watch_id||null,recipient_email:email,recipient_name:recipient?.name||null,gmail_user:GMAIL_USER.toLowerCase(),rfc_message_id:rfcMessageId(outreachId),status:'draft_pending',generator:GENERATOR,human_send_required:true,gmail_auto_send:false,draft_created_at:null,sent_at:null,last_checked_at:now,last_error:null,payload:{route:a.route,target_company:a.target_company||null}};const ins=await db.from(REGISTRY).upsert(candidate,{onConflict:'action_id,recipient_email',ignoreDuplicates:true}).select('*');if(ins.error)throw ins.error;row=ins.data?.[0]||await registryRow(a.id,email);if(!row)throw new Error('registry_reservation_failed');return row;}
async function markSent(row:any,meta:any){const now=new Date().toISOString(),at=sentAt(meta),method=sentMatchMethod(row,meta);const {data,error}=await db.from(REGISTRY).update({status:'sent',gmail_message_id:meta.id,gmail_thread_id:meta.threadId||row.gmail_thread_id||null,sent_at:at,last_checked_at:now,last_error:null,updated_at:now,payload:{...(row.payload||{}),sent_match_method:method}}).eq('id',row.id).select('*').single();if(error)throw error;return data;}
async function markMissing(row:any){const now=new Date().toISOString();const {data,error}=await db.from(REGISTRY).update({status:'draft_missing',last_checked_at:now,last_error:null,updated_at:now}).eq('id',row.id).select('*').single();if(error)throw error;return data;}
async function markError(row:any,e:any){try{await db.from(REGISTRY).update({status:'error',last_error:text(e?.message||e,1000),last_checked_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',row.id);}catch{}}

async function persistActionState(a:any,p:any,recipients:any[]){const {data,error}=await db.from(REGISTRY).select('*').eq('action_id',a.id).order('created_at',{ascending:true});if(error)throw error;const rows=data||[],drafts=rows.map((r:any)=>({email:r.recipient_email,name:r.recipient_name||null,draft_id:r.gmail_draft_id||null,message_id:r.gmail_message_id||r.gmail_draft_message_id||null,thread_id:r.gmail_thread_id||null,created_at:r.draft_created_at||r.created_at,updated_at:r.updated_at,generator:r.generator||GENERATOR,language:r.language||null,subject:r.subject||null,mime_type:r.mime_type||null,html:r.html===true,status:r.status,outreach_id:r.outreach_id,rfc_message_id:r.rfc_message_id,sent_at:r.sent_at||null}));const byEmail=new Map(rows.map((r:any)=>[r.recipient_email,r])),allCovered=recipients.every((r:any)=>['draft_created','sent'].includes(byEmail.get(normalizeEmail(r.email))?.status)),firstDraft=rows.find((r:any)=>r.status==='draft_created'),firstAny=rows[0]||null,next={...p,gmail_drafts:drafts,gmail_draft_count:rows.filter((r:any)=>r.status==='draft_created').length,gmail_sent_count:rows.filter((r:any)=>r.status==='sent').length,gmail_recipient_count:recipients.length,gmail_recipients:recipients.map((r:any)=>({email:r.email,name:r.name||null,job_title:r.job_title||null,purpose:r.purpose||null,confidence:r.confidence||null,source_type:r.source_type||null})),gmail_outreach_registry_version:'v1',gmail_draft_generator_target:GENERATOR,gmail_draft_generator_complete:allCovered,gmail_draft_generator:GENERATOR,gmail_draft_write_policy:'registry_state_machine_v1',gmail_draft_html:true,gmail_auto_send:false,human_send_required:true,gmail_draft_id:firstDraft?.gmail_draft_id||null,gmail_message_id:firstAny?.gmail_message_id||firstAny?.gmail_draft_message_id||null,gmail_thread_id:firstAny?.gmail_thread_id||null,gmail_draft_created_at:firstDraft?.draft_created_at||null};const u=await db.from('pppp_opportunity_actions').update({payload:next,updated_at:new Date().toISOString()}).eq('id',a.id);if(u.error)throw u.error;return next;}

async function processAction(a:any,budget:{writes:number}){let p=a.payload&&typeof a.payload==='object'?a.payload:{},tender=await tenderContext(a.tender_watch_id);const recipients=/^TED_/i.test(text(a.route,80))?resolveTedRecipients(a,tender,MAX_CONTACTS_PER_ACTION):resolveTedRecipients(a,{winner:{email:a.target_email}},1);if(!recipients.length)return{action_key:a.action_key,event:'no_recipients',recipients:0,created:0,preserved:0,sent:0,remaining:0};let created=0,preserved=0,sent=0,failures:any[]=[];
  for(const recipient of recipients){let row=await ensureRegistry(a,recipient);try{
      if(row.status==='sent'){sent++;continue;}
      if(row.status==='draft_created'&&row.gmail_draft_id){const live=await gmailDraft(row.gmail_draft_id);if(live){preserved++;continue;}const sentMessage=await findSent(row);if(sentMessage){row=await markSent(row,sentMessage);sent++;continue;}row=await markMissing(row);}
      if(row.status!=='draft_created'){const sentMessage=await findSent(row);if(sentMessage){row=await markSent(row,sentMessage);sent++;continue;}}
      if(budget.writes>=MAX_DRAFT_WRITES_PER_RUN)continue;
      const d=await writeDraft(a,tender,recipient,row),at=new Date().toISOString(),patch={status:'draft_created',recipient_name:recipient.name||null,gmail_draft_id:d.data.id||null,gmail_draft_message_id:d.data.message?.id||null,gmail_thread_id:d.data.message?.threadId||null,draft_created_at:at,last_checked_at:at,last_error:null,generator:GENERATOR,language:d.content.language,subject:d.content.subject,mime_type:'multipart/alternative',html:true,updated_at:at,payload:{...(row.payload||{}),tender_reference:d.content.tender_reference||null,tender_url:d.content.tender_url||null}};const u=await db.from(REGISTRY).update(patch).eq('id',row.id).select('*').single();if(u.error){await deleteDraft(d.data.id||'');throw u.error;}row=u.data;created++;budget.writes++;
    }catch(e){failures.push({email:normalizeEmail(recipient.email),error:text((e as any)?.message||e,500)});await markError(row,e);}
  }
  p=await persistActionState(a,p,recipients);const {data:rows,error}=await db.from(REGISTRY).select('recipient_email,status').eq('action_id',a.id);if(error)throw error;const current=rows||[],covered=recipients.filter((r:any)=>['draft_created','sent'].includes(current.find((x:any)=>x.recipient_email===normalizeEmail(r.email))?.status)).length;
  return{action_key:a.action_key,company:a.target_company,event:covered>=recipients.length?'outreach_ready':'outreach_partial',recipients:recipients.length,created,preserved,sent,covered,remaining:Math.max(0,recipients.length-covered),failures};
}

async function run(limit=20,actionId=''){let q=db.from('pppp_opportunity_action_queue_v2').select('*').eq('status','draft_review').in('action_type',['gc_project_outreach_draft','producer_capacity_outreach_draft']).order('updated_at',{ascending:true});if(text(actionId,80))q=q.eq('id',text(actionId,80));const {data,error}=await q.limit(Math.min(50,Math.max(1,limit)));if(error)throw error;const budget={writes:0},results:any[]=[],errors:any[]=[];let ready=0,partial=0,noRecipients=0,created=0,preserved=0,sent=0;for(const a of data||[]){try{const r=await processAction(a,budget);results.push(r);created+=Number(r.created||0);preserved+=Number(r.preserved||0);sent+=Number(r.sent||0);if(r.event==='outreach_ready')ready++;else if(r.event==='outreach_partial')partial++;else if(r.event==='no_recipients')noRecipients++;if(budget.writes>=MAX_DRAFT_WRITES_PER_RUN)break;}catch(e){errors.push({action_key:a.action_key,error:text((e as any)?.message||e,500)});}}return{candidates:(data||[]).length,actions_ready:ready,actions_partial:partial,no_recipients:noRecipients,drafts_created:created,drafts_updated:0,drafts_preserved:preserved,sent_already:sent,draft_writes:budget.writes,failed:errors.length,errors:errors.slice(0,10),results:results.slice(0,50),generator:GENERATOR,registry:REGISTRY,write_policy:'registry_state_machine_v1',sent_match_policy:'thread_id_plus_pppp_headers',stable_headers:['X-PPPP-Outreach-ID','X-PPPP-Action-ID'],html:true,separate_draft_per_recipient:true,human_send_required:true,auto_send:false,max_contacts_per_action:MAX_CONTACTS_PER_ACTION,draft_write_budget_per_run:MAX_DRAFT_WRITES_PER_RUN};}
Deno.serve(async(req:Request)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(!(await authorized(req)))return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:cors});try{const u=new URL(req.url),limit=Number(u.searchParams.get('limit')||20),actionId=text(u.searchParams.get('action_id')||'',80),out=await run(limit,actionId);return new Response(JSON.stringify({ok:true,...out}),{headers:cors});}catch(e){return new Response(JSON.stringify({ok:false,error:text((e as any)?.message||e,1000),auto_send:false,human_send_required:true}),{status:500,headers:cors});}});
