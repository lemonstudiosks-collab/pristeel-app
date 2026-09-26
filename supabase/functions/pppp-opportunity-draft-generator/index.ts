import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveTedRecipients, resolveTedDraftRecipients, normalizeEmail, contactTier, contactQualityScore } from "./recipient-policy.mjs";
import { encodeRfc2047Header } from "./mime-headers.mjs";
import { buildTedDraftContent } from "./draft-content.mjs";

const SA_JSON=Deno.env.get('GOOGLE_SA_JSON')!;
const GMAIL_USER=Deno.env.get('GMAIL_USER')!;
const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-pppp-cron-secret','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Content-Type':'application/json'};
const text=(v:any,max=12000)=>String(v==null?'':v).replace(/\r/g,'').trim().slice(0,max);
const GENERATOR='pppp-opportunity-draft-generator-v25-commercial-engine-v3-routed-copy';
const REGISTRY='pppp_opportunity_outreach_registry_v1';
const MAX_CONTACTS_PER_ACTION=20;
const MAX_DRAFT_WRITES_PER_RUN=25;
const GMAIL_SCOPE='https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.readonly';
const META_HEADERS=['Message-ID','X-PPPP-Outreach-ID','X-PPPP-Action-ID','To','Date'];

function b64url(input:Uint8Array|string){const bytes=typeof input==='string'?new TextEncoder().encode(input):input;let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function pemToArrayBuffer(pem:string){const body=pem.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s+/g,'');const bin=atob(body),buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);return buf.buffer;}
let cachedToken:{token:string;exp:number}|null=null;
async function token(){const now=Math.floor(Date.now()/1000);if(cachedToken&&cachedToken.exp>now+60)return cachedToken.token;const sa=JSON.parse(SA_JSON),header={alg:'RS256',typ:'JWT'},claim={iss:sa.client_email,sub:GMAIL_USER,scope:GMAIL_SCOPE,aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600},unsigned=`${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;const key=await crypto.subtle.importKey('pkcs8',pemToArrayBuffer(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);const sig=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned))),jwt=`${unsigned}.${b64url(sig)}`;const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})}),data=await r.json();if(!r.ok)throw new Error(`token ${r.status}: ${JSON.stringify(data).slice(0,400)}`);cachedToken={token:data.access_token,exp:now+(data.expires_in||3600)};return cachedToken.token;}
async function authorizationMode(req:Request){
  const provided=req.headers.get('x-pppp-cron-secret')||'';
  if(provided){const {data,error}=await db.rpc('gmail_tracker_cron_authorized',{provided});if(!error&&data===true)return'cron';}
  const auth=req.headers.get('Authorization')||'',m=auth.match(/^Bearer\s+(.+)$/i);
  if(!m)return'';
  const {data,error}=await db.auth.getUser(m[1]);return !error&&data?.user?'user':'';
}
function headerSafe(v:any){return text(v,500).replace(/[\r\n]+/g,' ');}
function hdr(m:any,name:string){return text((m?.payload?.headers||[]).find((x:any)=>String(x?.name||'').toLowerCase()===name.toLowerCase())?.value,1000);}
function rfcMessageId(outreachId:string){return `<pppp.${outreachId}@prissteel.com>`;}

async function tenderContext(tenderWatchId:any){
  const id=text(tenderWatchId,80);if(!id)return{};
  const [{data,error},{data:canonical,error:canonicalError}]=await Promise.all([
    db.from('kek_tender_watch').select('payload,publication_no,procurement_no,source_url,detail_url,title,authority').eq('id',id).maybeSingle(),
    db.from('outreach_contacts').select('company_name,company_domain,contact_email').eq('tender_watch_id',id).not('contact_email','is',null).limit(MAX_CONTACTS_PER_ACTION)
  ]);
  if(error)throw error;if(canonicalError)throw canonicalError;
  const p=data?.payload&&typeof data.payload==='object'?data.payload:{},winner=p?.winner&&typeof p.winner==='object'?{...p.winner}:{};
  const existingContacts=Array.isArray(p?.winner_contacts)?p.winner_contacts.slice():[],orgs=Array.isArray(winner?.contact_enrichment?.organizations)?winner.contact_enrichment.organizations.map((x:any)=>({...x,contacts:Array.isArray(x?.contacts)?x.contacts.slice():[]})):[];
  for(const row of canonical||[]){
    const email=normalizeEmail(row?.contact_email);if(!email)continue;
    if(!existingContacts.some((x:any)=>normalizeEmail(x?.email||x?.value)===email))existingContacts.push({email,verification_status:'verified',confidence:'high',source_type:'outreach_contacts',draft_eligible:true,company_name:row?.company_name||winner?.name||null,company_domain:row?.company_domain||null});
    const name=text(row?.company_name||winner?.name,300),domain=text(row?.company_domain,300).toLowerCase().replace(/^www\./,'');
    let org=orgs.find((x:any)=>text(x?.name,300).toLowerCase()===name.toLowerCase()||(domain&&text(x?.domain,300).toLowerCase().replace(/^www\./,'')===domain));
    if(!org){org={name:name||winner?.name||null,domain:domain||null,contacts:[]};orgs.push(org);}
    if(!Array.isArray(org.contacts))org.contacts=[];
    if(!org.contacts.some((x:any)=>normalizeEmail(x?.email||x?.value)===email))org.contacts.push({type:'email',value:email,email,confidence:'high',score:95,source_type:'outreach_contacts',draft_eligible:true});
  }
  if(orgs.length)winner.contact_enrichment={...(winner.contact_enrichment||{}),organizations:orgs};
  return{...p,winner,winner_contacts:existingContacts,publication_no:data?.publication_no||p.publication_no||null,procurement_no:data?.procurement_no||p.procurement_no||null,source_url:data?.source_url||p.source_url||null,detail_url:data?.detail_url||p.detail_url||null,title:data?.title||p.title||null,authority:data?.authority||p.authority||null};
}

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
async function deleteDraftForRefresh(draftId:string){if(!draftId)return;const tk=await token(),r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}/drafts/${encodeURIComponent(draftId)}`,{method:'DELETE',headers:{Authorization:`Bearer ${tk}`}});if(!r.ok&&r.status!==404)throw new Error(`Gmail draft delete ${r.status}`);}
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

let cachedRecipientCooldownDays:number|null=null;
async function recipientCooldownDays(){
  if(cachedRecipientCooldownDays!=null)return cachedRecipientCooldownDays;
  const {data,error}=await db.from('pppp_outbound_policy_v1').select('recipient_cooldown_days').eq('id','global').maybeSingle();
  if(error)throw error;
  cachedRecipientCooldownDays=Math.max(1,Number(data?.recipient_cooldown_days||30));
  return cachedRecipientCooldownDays;
}
async function recentSentToExact(email:string){
  const days=await recipientCooldownDays(),normalized=normalizeEmail(email);
  if(!normalized)return null;
  const data=await gmailSearch('in:sent to:'+normalized+' newer_than:'+days+'d',10);
  for(const item of data.messages||[]){
    const m=await gmailMessage(item.id);
    if((m?.labelIds||[]).includes('SENT'))return m;
  }
  return null;
}
let cachedDomainCooldownDays:number|null=null;
function emailDomain(v:any){const e=normalizeEmail(v);const i=e.lastIndexOf('@');return i>0?e.slice(i+1).replace(/^www\./,''):'';}
async function domainCooldownDays(){
  if(cachedDomainCooldownDays!=null)return cachedDomainCooldownDays;
  const {data,error}=await db.from('pppp_outbound_policy_v1').select('domain_cooldown_days').eq('id','global').maybeSingle();
  if(error)throw error;
  cachedDomainCooldownDays=Math.max(1,Number(data?.domain_cooldown_days||14));
  return cachedDomainCooldownDays;
}
async function recentSentToDomain(domain:any){
  const d=text(domain,300).toLowerCase().replace(/^www\./,'');if(!d)return null;
  const days=await domainCooldownDays(),data=await gmailSearch('in:sent newer_than:'+days+'d '+d,20);
  for(const item of data.messages||[]){
    const m=await gmailMessage(item.id);
    if(!(m?.labelIds||[]).includes('SENT'))continue;
    const all=[hdr(m,'To'),hdr(m,'Cc'),hdr(m,'Bcc')].join(' ');
    const emails=(all.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[]).map((x:string)=>x.toLowerCase());
    if(emails.some((e:string)=>emailDomain(e)===d))return m;
  }
  return null;
}
async function globalCommunicationGuard(a:any,row:any,recipient:any){
  const email=normalizeEmail(recipient?.email);
  const domain=text(recipient?.recipient_company_domain||recipient?.company_domain||'',300)||null;
  const {data,error}=await db.rpc('pppp_global_communication_guard_v1',{
    p_recipient_email:email,
    p_company_domain:domain,
    p_exclude_source:'TED',
    p_exclude_source_record_id:row?.id||null,
    p_exclude_queue_id:null
  });
  if(error)throw error;
  return data||{ok:false,reason:'global_guard_empty'};
}
async function retireBlockedRegistryRow(row:any,reason:string,guard:any,budget:{writes:number}){
  const now=new Date().toISOString();
  if(row?.gmail_draft_id){
    const live=await gmailDraft(row.gmail_draft_id);
    if(live){
      await deleteDraftForRefresh(row.gmail_draft_id);
      budget.writes++;
    }
  }
  const {data,error}=await db.from(REGISTRY).update({
    status:'draft_missing',
    gmail_draft_id:null,
    gmail_draft_message_id:null,
    last_checked_at:now,
    last_error:reason,
    updated_at:now,
    payload:{...(row?.payload||{}),global_communication_guard:guard||null,global_guard_blocked_at:now,global_guard_blocked_by:GENERATOR}
  }).eq('id',row.id).select('*').single();
  if(error)throw error;
  return data;
}

async function registryRow(actionId:string,email:string){const {data,error}=await db.from(REGISTRY).select('*').eq('action_id',actionId).eq('recipient_email',normalizeEmail(email)).maybeSingle();if(error)throw error;return data;}
async function ensureRegistry(a:any,recipient:any){const email=normalizeEmail(recipient?.email);let row=await registryRow(a.id,email);if(row)return row;const outreachId=crypto.randomUUID(),now=new Date().toISOString(),candidate={outreach_id:outreachId,action_id:a.id,action_key:a.action_key,tender_watch_id:a.tender_watch_id||null,recipient_email:email,recipient_name:recipient?.name||null,gmail_user:GMAIL_USER.toLowerCase(),rfc_message_id:rfcMessageId(outreachId),status:'draft_pending',generator:GENERATOR,human_send_required:true,gmail_auto_send:false,draft_created_at:null,sent_at:null,last_checked_at:now,last_error:null,payload:{route:a.route,target_company:a.target_company||null,recipient_purpose:recipient?.purpose||null,recipient_source_type:recipient?.source_type||null,recipient_source_url:recipient?.source_url||null,company_attribution:recipient?.company_attribution||null,recipient_company_name:recipient?.recipient_company_name||null,recipient_company_domain:recipient?.recipient_company_domain||null,outreach_readiness_v1:a?.payload?.outreach_readiness_v1||null}};const ins=await db.from(REGISTRY).upsert(candidate,{onConflict:'action_id,recipient_email',ignoreDuplicates:true}).select('*');if(ins.error)throw ins.error;row=ins.data?.[0]||await registryRow(a.id,email);if(!row)throw new Error('registry_reservation_failed');return row;}
async function seedLegacyTenderDraft(a:any,tender:any,recipients:any[]){
  const legacy=tender?.outreach_draft&&typeof tender.outreach_draft==='object'?tender.outreach_draft:null;
  if(!legacy||!['created','scheduled'].includes(text(legacy.status,40).toLowerCase())||!text(legacy.gmail_draft_id,200))return false;
  const email=normalizeEmail(legacy.to),recipient=recipients.find((r:any)=>normalizeEmail(r.email)===email);if(!recipient)return false;
  let row=await ensureRegistry(a,recipient);if(['draft_created','sent'].includes(text(row?.status,40)))return true;
  const now=new Date().toISOString(),{data,error}=await db.from(REGISTRY).update({
    status:'draft_created',recipient_name:recipient.name||row.recipient_name||null,gmail_draft_id:text(legacy.gmail_draft_id,200),
    gmail_draft_message_id:text(legacy.gmail_message_id,200)||null,gmail_thread_id:text(legacy.gmail_thread_id,200)||null,
    draft_created_at:text(legacy.created_at,80)||now,last_checked_at:now,last_error:null,generator:'legacy_tender_payload_import_v1',
    updated_at:now,payload:{...(row.payload||{}),legacy_tender_payload:true,legacy_status:text(legacy.status,40)}
  }).eq('id',row.id).select('*').single();if(error)throw error;return !!data;
}
async function markSent(row:any,meta:any){const now=new Date().toISOString(),at=sentAt(meta),method=sentMatchMethod(row,meta);const {data,error}=await db.from(REGISTRY).update({status:'sent',gmail_message_id:meta.id,gmail_thread_id:meta.threadId||row.gmail_thread_id||null,sent_at:at,last_checked_at:now,last_error:null,updated_at:now,payload:{...(row.payload||{}),sent_match_method:method}}).eq('id',row.id).select('*').single();if(error)throw error;return data;}
async function markMissing(row:any){const now=new Date().toISOString();const {data,error}=await db.from(REGISTRY).update({status:'draft_missing',last_checked_at:now,last_error:null,updated_at:now}).eq('id',row.id).select('*').single();if(error)throw error;return data;}
async function markError(row:any,e:any){try{await db.from(REGISTRY).update({status:'error',last_error:text(e?.message||e,1000),last_checked_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',row.id);}catch{}}

function effectiveTedRole(tender:any){
  const w=tender?.winner&&typeof tender.winner==='object'?tender.winner:{};
  const t=text(w.company_type||w?.company_classification?.company_type||'',80).toLowerCase();
  if(t&&t!=='unknown')return t;
  const ar=tender?.award_role&&typeof tender.award_role==='object'?tender.award_role:{};
  const at=text(ar.type,80).toLowerCase(),ac=text(ar.confidence,40).toLowerCase();
  if(at==='gc_epc'&&['medium','high'].includes(ac))return'gc_epc';
  return'unknown';
}
function expectedTedRoute(tender:any){
  const t=effectiveTedRole(tender);
  if(t==='producer')return'TED_PRODUCER';
  if(t==='trader_consortium'||t==='consortium_mixed')return'TED_CONSORTIUM';
  if(t==='gc_epc')return'TED_GC';
  return'';
}
function truthy(v:any){return v===true||String(v??'').toLowerCase()==='true';}
function tedDraftReadiness(a:any,tender:any){
  const winner=tender?.winner&&typeof tender.winner==='object'?tender.winner:{};
  const winnerType=effectiveTedRole(tender);
  const route=text(a?.route,80).toUpperCase();
  if(!text(winner?.name,300))return{ok:false,reason:'winner_identity_missing'};
  if(!text(tender?.title,500))return{ok:false,reason:'tender_identity_missing'};
  if(winnerType&&winnerType!=='unknown'){
    const expected=expectedTedRoute(tender);
    if(expected&&route!==expected)return{ok:false,reason:'route_mismatch',expected_route:expected};
  }else if(route!=='TED_GENERAL'){
    return{ok:false,reason:'winner_role_unverified_requires_general_route'};
  }
  return{ok:true,reason:'draft_identity_ready',winner_type:winnerType||'unknown'};
}
function readinessEvidence(a:any,tender:any){
  const ap=a?.payload&&typeof a.payload==='object'?a.payload:{};
  const tp=tender&&typeof tender==='object'?tender:{};
  const r=ap?.outreach_readiness_v1||tp?.outreach_readiness_v1||null;
  return r&&typeof r==='object'&&!Array.isArray(r)?r:null;
}
function tedReadiness(a:any,tender:any){
  const winner=tender?.winner&&typeof tender.winner==='object'?tender.winner:{};
  const winnerType=text(winner.company_type||winner?.company_classification?.company_type||'',80).toLowerCase();
  const angle=text(tender?.cooperation_angle||'',120).toLowerCase();
  if(!winnerType||winnerType==='unknown')return{ok:false,reason:'winner_role_unverified'};
  if(['verify_company_role','verify_supply_or_fabrication_role'].includes(angle))return{ok:false,reason:'winner_role_requires_verification'};
  const r=readinessEvidence(a,tender);
  if(!r)return{ok:false,reason:'outreach_readiness_missing'};
  const required=[
    ['winner_role_verified',truthy(r.winner_role_verified)],
    ['exact_lot_match',truthy(r.exact_lot_match)],
    ['pristeel_scope_fit',truthy(r.pristeel_scope_fit)],
    ['contact_identity_verified',truthy(r.contact_identity_verified)],
    ['timing_fit',truthy(r.timing_fit)],
    ['previous_contact_guard',truthy(r.previous_contact_guard)],
    ['bounce_suppression_guard',truthy(r.bounce_suppression_guard)]
  ];
  for(const [name,ok] of required)if(!ok)return{ok:false,reason:String(name)+'_required'};
  for(const name of ['pristeel_scope','scope_evidence','buyer_function','verified_company_domain','concrete_question']){
    if(!text(r?.[name],1200))return{ok:false,reason:name+'_required'};
  }
  const selfRisk=text(r.self_perform_risk,80).toLowerCase();
  if(selfRisk==='high'&&!truthy(r.outsourcing_evidence))return{ok:false,reason:'self_perform_risk_high'};
  if(truthy(r.qualification_required)&&!truthy(r.qualification_fit))return{ok:false,reason:'qualification_not_verified'};
  return{ok:true,reason:'manual_high_confidence_ready',evidence:r,winner_type:winnerType,cooperation_angle:angle};
}

async function retireObsoleteDrafts(a:any,keepEmails:Set<string>,reason:string,budget:{writes:number}){
  const {data,error}=await db.from(REGISTRY).select('*').eq('action_id',a.id);
  if(error)throw error;
  let retired=0;
  for(const row of data||[]){
    if(row.status==='sent'||keepEmails.has(normalizeEmail(row.recipient_email)))continue;
    if(budget.writes>=MAX_DRAFT_WRITES_PER_RUN)break;
    try{
      if(row.status==='draft_created'&&row.gmail_draft_id){
        const live=await gmailDraft(row.gmail_draft_id);
        if(live)await deleteDraftForRefresh(row.gmail_draft_id);
      }
      const now=new Date().toISOString();
      const u=await db.from(REGISTRY).update({
        status:'draft_missing',
        last_checked_at:now,
        last_error:reason,
        updated_at:now,
        payload:{...(row.payload||{}),retired_reason:reason,retired_by:GENERATOR,retired_at:now}
      }).eq('id',row.id);
      if(u.error)throw u.error;
      retired++;budget.writes++;
    }catch(e){await markError(row,e);}
  }
  return retired;
}

async function persistActionState(a:any,p:any,recipients:any[]){const {data,error}=await db.from(REGISTRY).select('*').eq('action_id',a.id).order('created_at',{ascending:true});if(error)throw error;const rows=data||[],drafts=rows.map((r:any)=>({email:r.recipient_email,name:r.recipient_name||null,draft_id:r.gmail_draft_id||null,message_id:r.gmail_message_id||r.gmail_draft_message_id||null,thread_id:r.gmail_thread_id||null,created_at:r.draft_created_at||r.created_at,updated_at:r.updated_at,generator:r.generator||GENERATOR,language:r.language||null,subject:r.subject||null,mime_type:r.mime_type||null,html:r.html===true,status:r.status,outreach_id:r.outreach_id,rfc_message_id:r.rfc_message_id,sent_at:r.sent_at||null}));const byEmail=new Map(rows.map((r:any)=>[r.recipient_email,r])),allCovered=recipients.length>0&&recipients.every((r:any)=>['draft_created','sent'].includes(byEmail.get(normalizeEmail(r.email))?.status)),firstDraft=rows.find((r:any)=>r.status==='draft_created'),firstAny=rows[0]||null,next={...p,gmail_drafts:drafts,gmail_draft_count:rows.filter((r:any)=>r.status==='draft_created').length,gmail_sent_count:rows.filter((r:any)=>r.status==='sent').length,gmail_recipient_count:recipients.length,gmail_recipients:recipients.map((r:any)=>({email:r.email,name:r.name||null,job_title:r.job_title||null,purpose:r.purpose||null,confidence:r.confidence||null,source_type:r.source_type||null,source_url:r.source_url||null,company_attribution:r.company_attribution||null,recipient_company_name:r.recipient_company_name||null,recipient_company_domain:r.recipient_company_domain||null})),gmail_outreach_registry_version:'v1',gmail_draft_generator_target:GENERATOR,gmail_draft_generator_complete:allCovered,gmail_draft_generator:GENERATOR,gmail_draft_write_policy:'registry_state_machine_v1',gmail_draft_html:true,gmail_auto_send:false,human_send_required:true,gmail_draft_id:firstDraft?.gmail_draft_id||null,gmail_message_id:firstAny?.gmail_message_id||firstAny?.gmail_draft_message_id||null,gmail_thread_id:firstAny?.gmail_thread_id||null,gmail_draft_created_at:firstDraft?.draft_created_at||null};const u=await db.from('pppp_opportunity_actions').update({payload:next,updated_at:new Date().toISOString()}).eq('id',a.id);if(u.error)throw u.error;return next;}

async function processAction(a:any,budget:{writes:number},refreshExisting=false,explicitUser=false){
  const canonical=await db.from('pppp_opportunity_actions').select('*').eq('id',a.id).maybeSingle();if(canonical.error)throw canonical.error;if(canonical.data)a={...a,...canonical.data};
  let p=a.payload&&typeof a.payload==='object'?a.payload:{},tender=await tenderContext(a.tender_watch_id);
  const cs=await db.from('pppp_opportunity_communication_state_v1').select('communication_state,communication_at,communication_thread_id').eq('action_id',a.id).maybeSingle();
  if(cs.error)throw cs.error;
  if(['waiting','replied','contacted_history'].includes(text(cs.data?.communication_state,40).toLowerCase())){
    return{action_key:a.action_key,company:a.target_company,event:'communication_history_blocked',reason:cs.data.communication_state,communication_at:cs.data.communication_at||null,gmail_thread_id:cs.data.communication_thread_id||null,recipients:0,created:0,refreshed:0,preserved:0,sent:0,retired:0,remaining:0};
  }
  const facts=Array.isArray(a.personalization_facts)?a.personalization_facts.filter((x:any)=>text(x,1200)):[];
  if(!explicitUser&&(text(a.outreach_engine_version,20)!=='v2'||text(a.workflow_state,80)!=='ready_for_outreach'))return{action_key:a.action_key,company:a.target_company,event:'readiness_blocked',reason:'outreach_v2_candidate_not_ready',recipients:0,created:0,refreshed:0,preserved:0,sent:0,retired:0,remaining:0};
  if(!explicitUser&&(Number(a.company_fit_score||0)<65||Number(a.commercial_timing_score||0)<35||Number(a.message_evidence_score||0)<60||facts.length<2))return{action_key:a.action_key,company:a.target_company,event:'readiness_blocked',reason:'outreach_v2_score_or_evidence_gate',recipients:0,created:0,refreshed:0,preserved:0,sent:0,retired:0,remaining:0};
  const route=text(a.route,80).toUpperCase(),expected=/^TED_/i.test(route)?expectedTedRoute(tender):route;
  if(/^TED_/i.test(route)){
    const readiness=tedDraftReadiness(a,tender);
    if(!readiness.ok){
      if(readiness.reason==='route_mismatch'){
        const retired=refreshExisting?await retireObsoleteDrafts(a,new Set(),`route_mismatch:${route}->${readiness.expected_route}`,budget):0;
        return{action_key:a.action_key,company:a.target_company,event:'route_mismatch',route,expected_route:readiness.expected_route,recipients:0,created:0,refreshed:0,preserved:0,sent:0,retired,remaining:0};
      }
      return{action_key:a.action_key,company:a.target_company,event:'readiness_blocked',reason:readiness.reason,route,recipients:0,created:0,refreshed:0,preserved:0,sent:0,retired:0,remaining:0};
    }
  }
  let recipients=(/^TED_/i.test(route)?resolveTedDraftRecipients(a,tender,MAX_CONTACTS_PER_ACTION):resolveTedRecipients(a,{winner:{email:a.target_email}},1));
  recipients=recipients.map((r:any)=>({...r,job_title:r.job_title||a.target_role||null,name:r.name||a.target_name||null,contact_tier:contactTier(r.email,r),contact_quality_score:contactQualityScore(r.email,r)})).filter((r:any)=>Number(r.contact_quality_score||0)>=25).slice(0,MAX_CONTACTS_PER_ACTION);
  const keepEmails=new Set(recipients.map((r:any)=>normalizeEmail(r.email)));
  const retired=refreshExisting?await retireObsoleteDrafts(a,keepEmails,'recipient_no_longer_preflight_eligible',budget):0;
  if(!recipients.length){
    p=await persistActionState(a,p,recipients);
    return{action_key:a.action_key,event:'no_recipients',recipients:0,created:0,refreshed:0,preserved:0,sent:0,retired,remaining:0};
  }
  await seedLegacyTenderDraft(a,tender,recipients);
  let created=0,refreshed=0,preserved=0,sent=0,failures:any[]=[];
  for(const recipient of recipients){
    let row=await ensureRegistry(a,recipient);
    try{
      if(row.status==='sent'){sent++;continue;}

      const ownSent=await findSent(row);
      if(ownSent){row=await markSent(row,ownSent);sent++;continue;}

      const gg=await globalCommunicationGuard(a,row,recipient);
      if(!gg?.ok){
        row=await retireBlockedRegistryRow(row,'global_communication_guard:'+text(gg?.reason||'blocked',180),gg,budget);
        failures.push({email:normalizeEmail(recipient.email),blocked:true,reason:text(gg?.reason||'global_guard_blocked',180)});
        continue;
      }

      const recent=await recentSentToExact(recipient.email);
      if(recent){
        if(isSentMatch(row,recent)){row=await markSent(row,recent);sent++;continue;}
        const liveGuard={ok:false,reason:'gmail_recipient_cooldown_active',gmail_message_id:recent.id,gmail_thread_id:recent.threadId||null,sent_at:sentAt(recent)};
        row=await retireBlockedRegistryRow(row,'gmail_recipient_cooldown_active',liveGuard,budget);
        failures.push({email:normalizeEmail(recipient.email),blocked:true,reason:'gmail_recipient_cooldown_active'});
        continue;
      }
      const domain=text(recipient?.recipient_company_domain||recipient?.company_domain||emailDomain(recipient.email),300).toLowerCase();
      const domainRecent=await recentSentToDomain(domain);
      if(domainRecent){
        const liveGuard={ok:false,reason:'gmail_domain_cooldown_active',gmail_message_id:domainRecent.id,gmail_thread_id:domainRecent.threadId||null,sent_at:sentAt(domainRecent),domain};
        row=await retireBlockedRegistryRow(row,'gmail_domain_cooldown_active',liveGuard,budget);
        failures.push({email:normalizeEmail(recipient.email),blocked:true,reason:'gmail_domain_cooldown_active'});
        continue;
      }

      if(budget.writes>=MAX_DRAFT_WRITES_PER_RUN)continue;
      let wasRefresh=false;
      if(row.status==='draft_created'&&row.gmail_draft_id){
        const live=await gmailDraft(row.gmail_draft_id);
        if(live){
          if(!((refreshExisting||explicitUser)&&text(row.generator,200)!==GENERATOR)){preserved++;continue;}
          await deleteDraftForRefresh(row.gmail_draft_id);wasRefresh=true;
        }else{
          const sentMessage=await findSent(row);if(sentMessage){row=await markSent(row,sentMessage);sent++;continue;}row=await markMissing(row);
        }
      }
      if(row.status!=='draft_created'){const sentMessage=await findSent(row);if(sentMessage){row=await markSent(row,sentMessage);sent++;continue;}}
      if(budget.writes>=MAX_DRAFT_WRITES_PER_RUN)continue;
      const d=await writeDraft(a,tender,recipient,row),at=new Date().toISOString(),patch={status:'draft_created',outreach_engine_version:'v2',outreach_motion:a.outreach_motion,pristeel_offer_model:d.content.offer_model||a.pristeel_offer_model||null,contact_tier:recipient.contact_tier,outreach_readiness_score:a.outreach_readiness_score,personalization_facts:facts.slice(0,4),recipient_name:recipient.name||null,gmail_draft_id:d.data.id||null,gmail_draft_message_id:d.data.message?.id||null,gmail_thread_id:d.data.message?.threadId||null,draft_created_at:at,last_checked_at:at,last_error:null,generator:GENERATOR,language:d.content.language,subject:d.content.subject,mime_type:'multipart/alternative',html:true,updated_at:at,payload:{...(row.payload||{}),outreach_engine_version:'v2',outreach_motion:a.outreach_motion,pristeel_offer_model:d.content.offer_model||a.pristeel_offer_model||null,contact_quality_score:recipient.contact_quality_score,tender_reference:d.content.tender_reference||null,tender_url:d.content.tender_url||null,refreshed_from_generator:wasRefresh?text(row.generator,200)||'unknown':null}};
      const u=await db.from(REGISTRY).update(patch).eq('id',row.id).select('*').single();if(u.error){await deleteDraft(d.data.id||'');throw u.error;}row=u.data;created++;if(wasRefresh)refreshed++;budget.writes++;
    }catch(e){failures.push({email:normalizeEmail(recipient.email),error:text((e as any)?.message||e,500)});await markError(row,e);}
  }
  p=await persistActionState(a,p,recipients);
  const {data:rows,error}=await db.from(REGISTRY).select('recipient_email,status').eq('action_id',a.id);if(error)throw error;
  const current=rows||[],covered=recipients.filter((r:any)=>['draft_created','sent'].includes(current.find((x:any)=>x.recipient_email===normalizeEmail(r.email))?.status)).length;
  const nextState=covered>=recipients.length?'draft_created':'ready_for_outreach';await db.from('pppp_opportunity_actions').update({workflow_state:nextState,contact_tier:recipients[0]?.contact_tier||a.contact_tier,contact_quality_score:recipients[0]?.contact_quality_score||a.contact_quality_score,target_email:recipients[0]?.email||a.target_email,target_name:recipients[0]?.name||a.target_name,target_role:recipients[0]?.job_title||a.target_role,updated_at:new Date().toISOString()}).eq('id',a.id);
  return{action_key:a.action_key,company:a.target_company,event:covered>=recipients.length?'outreach_ready':'outreach_partial',recipients:recipients.length,created,refreshed,preserved,sent,retired,covered,remaining:Math.max(0,recipients.length-covered),failures};
}

async function run(limit=20,actionId='',refreshExisting=false,explicitUser=false){
  let q=db.from('pppp_opportunity_action_queue_v2').select('*').eq('status','draft_review').in('action_type',['gc_project_outreach_draft','producer_capacity_outreach_draft','consortium_project_outreach_draft','general_project_outreach_draft']).order('updated_at',{ascending:true});
  if(text(actionId,80))q=q.eq('id',text(actionId,80));
  const {data,error}=await q.limit(Math.min(1000,Math.max(1,limit)));if(error)throw error;
  const budget={writes:0},results:any[]=[],errors:any[]=[];
  let ready=0,partial=0,noRecipients=0,routeMismatch=0,readinessBlocked=0,created=0,refreshed=0,preserved=0,sent=0,retired=0;
  for(const a of data||[]){
    try{
      const r=await processAction(a,budget,refreshExisting,explicitUser);results.push(r);
      created+=Number(r.created||0);refreshed+=Number(r.refreshed||0);preserved+=Number(r.preserved||0);sent+=Number(r.sent||0);retired+=Number(r.retired||0);
      if(r.event==='outreach_ready')ready++;else if(r.event==='outreach_partial')partial++;else if(r.event==='no_recipients')noRecipients++;else if(r.event==='route_mismatch')routeMismatch++;else if(r.event==='readiness_blocked')readinessBlocked++;
      if(budget.writes>=MAX_DRAFT_WRITES_PER_RUN)break;
    }catch(e){errors.push({action_key:a.action_key,error:text((e as any)?.message||e,500)});}
  }
  return{candidates:(data||[]).length,actions_ready:ready,actions_partial:partial,no_recipients:noRecipients,route_mismatch:routeMismatch,readiness_blocked:readinessBlocked,drafts_created:created,drafts_refreshed:refreshed,drafts_retired:retired,drafts_updated:0,drafts_preserved:preserved,sent_already:sent,draft_writes:budget.writes,failed:errors.length,errors:errors.slice(0,10),results:results.slice(0,50),generator:GENERATOR,registry:REGISTRY,write_policy:'registry_state_machine_v1',sent_match_policy:'thread_id_plus_pppp_headers',stable_headers:['X-PPPP-Outreach-ID','X-PPPP-Action-ID'],html:true,separate_draft_per_recipient:true,human_send_required:true,auto_send:false,refresh_existing:refreshExisting,max_contacts_per_action:MAX_CONTACTS_PER_ACTION,draft_write_budget_per_run:MAX_DRAFT_WRITES_PER_RUN,outreach_engine_version:'v2'};
}
Deno.serve(async(req:Request)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});const mode=await authorizationMode(req);if(!mode)return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:cors});try{const u=new URL(req.url);let body:any={};if(req.method==='POST'){try{body=await req.json();}catch{}}const limit=Number(body?.limit||u.searchParams.get('limit')||20),actionId=text(body?.action_id||u.searchParams.get('action_id')||'',80),refreshExisting=String(body?.refresh_existing??u.searchParams.get('refresh_existing')??'false').toLowerCase()==='true';if(mode==='cron'||!actionId){return new Response(JSON.stringify({ok:true,event:'manual_draft_only',reason:mode==='cron'?'scheduled_cold_draft_generation_disabled':'cold_draft_generation_requires_explicit_action_id',authorization_mode:mode,auto_send:false,human_send_required:true,drafts_created:0}),{headers:cors});}const out=await run(Math.min(1,limit),actionId,refreshExisting,mode==='user'&&!!actionId);return new Response(JSON.stringify({ok:true,...out,authorization_mode:mode}),{headers:cors});}catch(e){return new Response(JSON.stringify({ok:false,error:text((e as any)?.message||e,1000),auto_send:false,human_send_required:true}),{status:500,headers:cors});}});

