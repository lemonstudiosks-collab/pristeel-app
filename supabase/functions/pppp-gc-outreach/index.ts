import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SA_JSON=Deno.env.get('GOOGLE_SA_JSON')!;
const GMAIL_USER=Deno.env.get('GMAIL_USER')||'arianit.vllahiu@prissteel.com';
const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const ENGINE='pppp-gc-outreach-v10-commercial-engine-v3-routed-copy';
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-pppp-cron-secret',
  'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
  'Content-Type':'application/json'
};
const text=(v:any,max=12000)=>String(v==null?'':v).replace(/\r/g,'').trim().slice(0,max);
const safeHeader=(v:any)=>text(v,500).replace(/[\r\n]+/g,' ');
const lower=(v:any)=>text(v,1000).toLowerCase();
const nowIso=()=>new Date().toISOString();
const emailRe=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function b64url(input:Uint8Array|string){
  const bytes=typeof input==='string'?new TextEncoder().encode(input):input;
  let bin='';for(const b of bytes)bin+=String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function pemToArrayBuffer(pem:string){
  const body=pem.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s+/g,'');
  const bin=atob(body),buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);return buf.buffer;
}
function encodeHeader(s:string){
  const clean=safeHeader(s);if(/^[\x20-\x7E]*$/.test(clean))return clean;
  const bytes=new TextEncoder().encode(clean);let bin='';for(const b of bytes)bin+=String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}
function esc(s:any){return text(s,20000).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function domainFromEmail(v:any){const e=lower(v);const i=e.lastIndexOf('@');return i>0?e.slice(i+1).replace(/^www\./,''):null;}
function contactDomain(p:any){return lower(domainFromEmail(p?.contact_email)||p?.company_domain||'')||null;}
function safePersonName(v:any){
  const n=text(v,160).replace(/\s+/g,' ').trim();
  if(!n||n.length<3||n.length>80||/[0-9]/.test(n)||n.split(/\s+/).length>6)return '';
  if(/[,;]|\b(gmbh|s\.?r\.?o|sp\.?\s*z|ltd|limited|a\/s|company|office|department|závod|strasse|straße|street|road)\b/i.test(n))return '';
  return n;
}
function header(m:any,name:string){return text((m?.payload?.headers||[]).find((h:any)=>lower(h.name)===name.toLowerCase())?.value,2000);}
function emailsIn(v:any){return (text(v,4000).match(emailRe)||[]).map((x:string)=>x.toLowerCase());}
function sameDomain(email:string,domain:string|null){const d=domainFromEmail(email);return !!d&&!!domain&&(d===domain||d.endsWith('.'+domain)||domain.endsWith('.'+d));}
function msgAt(m:any){const n=Number(m?.internalDate||0);return n?new Date(n):null;}
function afterDateQuery(d:Date){return `${d.getUTCFullYear()}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${String(d.getUTCDate()).padStart(2,'0')}`;}

let cachedToken:{token:string;exp:number}|null=null;
async function gmailToken(){
  const now=Math.floor(Date.now()/1000);if(cachedToken&&cachedToken.exp>now+60)return cachedToken.token;
  const sa=JSON.parse(SA_JSON),scope='https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify';
  const h={alg:'RS256',typ:'JWT'},claim={iss:sa.client_email,sub:GMAIL_USER,scope,aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600};
  const unsigned=`${b64url(JSON.stringify(h))}.${b64url(JSON.stringify(claim))}`;
  const key=await crypto.subtle.importKey('pkcs8',pemToArrayBuffer(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned)));
  const jwt=`${unsigned}.${b64url(sig)}`;
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})});
  const data=await r.json();if(!r.ok)throw new Error(`Google token ${r.status}: ${JSON.stringify(data).slice(0,500)}`);
  cachedToken={token:data.access_token,exp:now+(data.expires_in||3600)};return cachedToken.token;
}
async function authorizationMode(req:Request){
  const provided=req.headers.get('x-pppp-cron-secret')||'';
  if(provided){const {data,error}=await db.rpc('gmail_tracker_cron_authorized',{provided});if(!error&&data===true)return'cron';}
  const auth=req.headers.get('Authorization')||'',m=auth.match(/^Bearer\s+(.+)$/i);
  if(!m)return'';
  const {data,error}=await db.auth.getUser(m[1]);
  return !error&&data?.user?'user':'';
}
async function gmail(path:string,init:RequestInit={}){
  const tk=await gmailToken();
  const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}${path}`,{...init,headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json',...(init.headers||{})}});
  if(r.status===204)return null;
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Gmail ${r.status} ${path}: ${JSON.stringify(data).slice(0,600)}`);return data;
}
async function message(id:string){
  const qs=new URLSearchParams({format:'metadata'});for(const h of ['To','Cc','Bcc','From','Subject','Message-ID','Date'])qs.append('metadataHeaders',h);
  return gmail(`/messages/${encodeURIComponent(id)}?${qs.toString()}`);
}
async function thread(id:string){
  const qs=new URLSearchParams({format:'metadata'});for(const h of ['To','Cc','Bcc','From','Subject','Message-ID','Date'])qs.append('metadataHeaders',h);
  return gmail(`/threads/${encodeURIComponent(id)}?${qs.toString()}`);
}
async function searchMessages(q:string,max=20){
  const qs=new URLSearchParams({q,maxResults:String(max)}),x=await gmail(`/messages?${qs.toString()}`);return x?.messages||[];
}
async function listDrafts(q:string,max=20){
  const qs=new URLSearchParams({q,maxResults:String(max)}),x=await gmail(`/drafts?${qs.toString()}`);return x?.drafts||[];
}
async function deleteDraft(id:string|null){if(!id)return;try{await gmail(`/drafts/${encodeURIComponent(id)}`,{method:'DELETE'});}catch{/* missing/deleted draft is already safe */}}

function projectName(p:any){
  const a=Array.isArray(p.current_projects)?p.current_projects:[];return text(a?.[0]?.name,500)||text(p.company_name,300)||'relevant projects';
}
function shortProject(p:any){const s=projectName(p).replace(/^.*?\s[–-]\s/,'').trim();return s.length>82?s.slice(0,79)+'…':s;}
function factsFor(p:any){
  const a=Array.isArray(p?.personalization_facts)?p.personalization_facts.map((x:any)=>text(x,900)).filter(Boolean):[];
  const proj=projectName(p);
  if(!a.length&&proj)a.push('Project: '+proj);
  const ev=Array.isArray(p?.evidence)?p.evidence:[];
  for(const x of ev){
    const v=text(x?.reason||x?.title||x?.source,900);
    if(v&&!a.includes(v))a.push(v);
    if(a.length>=2)break;
  }
  return a.slice(0,2);
}
function greeting(p:any){
  const n=safePersonName(p.contact_name);
  if(p.language==='de')return n?`Guten Tag ${n},`:'Sehr geehrte Damen und Herren,';
  if(p.language==='sr')return n?`Poštovani ${n},`:'Poštovani,';
  return n?`Dear ${n},`:'Dear Sir or Madam,';
}
function subject1(p:any){
  const proj=shortProject(p);
  if(p.language==='de')return `Projekt ${proj} – ein Partner für das Stahlpaket | PRISTEEL`;
  if(p.language==='sr')return `Projekt ${proj} – jedan partner za čelični paket | PRISTEEL`;
  return `Project ${proj} – one partner for the steel package | PRISTEEL`;
}
function signaturePlain(lang:string){const close=lang==='de'?'Mit freundlichen Grüßen':lang==='sr'?'Srdačan pozdrav':'Kind regards';return `${close},\n\nArianit Vllahiu\nHead of Business Development\n+383 (0) 44 244 699\narianit.vllahiu@prissteel.com\nwww.prissteel.com`;}
function signatureHtml(lang:string){const close=lang==='de'?'Mit freundlichen Grüßen':lang==='sr'?'Srdačan pozdrav':'Kind regards';return `${esc(close)},<br><br><strong>Arianit Vllahiu</strong><br>Head of Business Development<br><a href="tel:+38344244699">+383 (0) 44 244 699</a><br><a href="mailto:arianit.vllahiu@prissteel.com">arianit.vllahiu@prissteel.com</a><br><a href="https://www.prissteel.com">www.prissteel.com</a>`;}
function body1(p:any){
  const g=greeting(p),facts=factsFor(p),proj=projectName(p);
  if(facts.length<2)throw new Error('outreach_v2_requires_two_specific_facts');
  const fact=facts[0]||'';
  if(p.language==='de')return `${g}\n\nich melde mich bezüglich des Projekts „${proj}“.${fact?' '+fact:''}\n\nPRISTEEL kann die vollständige Verantwortung für ein klar definiertes Stahlpaket übernehmen – von Materialbeschaffung und Build-to-Print-Fertigung über Oberflächenschutz und Qualitätsdokumentation bis zur koordinierten DAP-Lieferung – mit einem technischen und kaufmännischen Ansprechpartner.\n\nSie behalten die Kontrolle über das Projekt. Wir übernehmen das Stahlpaket von Zeichnungen oder Stückliste bis zur Lieferung.\n\nPRISTEEL verbindet erfahrenes Stahlindustrie-Management mit einem etablierten Fertigungsnetzwerk in Südosteuropa. Wo erforderlich, kann die Vertragserfüllung durch Bankgarantien der ProCredit Bank abgesichert werden.\n\nWenn Sie ein konstruktives oder gefertigtes Stahlpaket lieber an einen externen Partner vergeben möchten, senden Sie uns die Zeichnungen oder Stückliste – wir übernehmen die weitere Abwicklung.\n\n${signaturePlain('de')}`;
  if(p.language==='sr')return `${g}\n\njavljam Vam se u vezi sa projektom „${proj}“.${fact?' '+fact:''}\n\nPRISTEEL može preuzeti punu odgovornost za jasno definisan čelični paket – od nabavke materijala i proizvodnje prema nacrtima do površinske zaštite, dokumentacije kvaliteta i koordinirane DAP isporuke – preko jedne tehničke i komercijalne kontakt tačke.\n\nVi zadržavate punu kontrolu nad projektom. Mi preuzimamo čelični paket od nacrta ili liste materijala do isporuke.\n\nPRISTEEL kombinuje iskusno upravljanje u industriji čelika sa etabliranom mrežom proizvodnih partnera u Jugoistočnoj Evropi. Kada je potrebno, ugovorno izvršenje može biti podržano bankarskim garancijama preko ProCredit Bank.\n\nAko postoji konstrukcijski ili proizvodni čelični paket koji želite povjeriti jednom vanjskom partneru, pošaljite nam nacrte ili listu materijala i mi preuzimamo dalje.\n\n${signaturePlain('sr')}`;
  return `${g}\n\nI am contacting you regarding “${proj}”.${fact?' '+fact:''}\n\nPRISTEEL can take full responsibility for a clearly defined steel package — from material sourcing and build-to-print fabrication to surface treatment, quality documentation and coordinated DAP delivery — with one technical and commercial point of contact.\n\nYou remain in control of the project. We take ownership of the steel package from drawings or BOM through to delivery.\n\nPRISTEEL combines experienced steel-industry management with an established fabrication network in Southeast Europe. Where required, contractual performance can be supported by bank guarantees through ProCredit Bank.\n\nIf there is a structural or fabricated steel package you would prefer to place with one external partner, send us the drawings or BOM and we will take it from there.\n\n${signaturePlain('en')}`;
}
function body1Html(p:any){return body1(p).split('\n\n').slice(0,-1).map((x:string)=>esc(x).replace(/\n/g,'<br>')).join('<br><br>')+'<br><br>'+signatureHtml(p.language);}
function body2(p:any){
  const g=greeting(p),proj=projectName(p);
  if(p.language==='de')return `${g}\n\nfalls das Stahlbaupaket für „${proj}“ bereits vergeben ist, müssen Sie dafür nichts weiter prüfen. In diesem Fall genügt mir eine kurze Rückmeldung, ob PRISTEEL für künftige klar abgegrenzte Stahlbaupakete in Ihren Lieferantenprozess aufgenommen werden kann – und wer dafür zuständig ist.\n\n${signaturePlain('de')}`;
  if(p.language==='sr')return `${g}\n\nako je paket čeličnih radova za „${proj}“ već ugovoren, nije potrebno da za ovaj projekat išta dodatno provjeravate. U tom slučaju bi nam bila dovoljna kratka informacija da li PRISTEEL može biti uključen u Vaš proces kvalifikacije za buduće jasno definisane čelične pakete – i ko je za to nadležan.\n\n${signaturePlain('sr')}`;
  return `${g}\n\nIf the steel package for “${proj}” is already covered, there is nothing further to review for this project. In that case, a short indication of whether PRISTEEL can be considered in your supplier process for future clearly defined steel packages – and who handles that qualification – would be enough.\n\n${signaturePlain('en')}`;
}
function body2Html(p:any){return body2(p).split('\n\n').slice(0,-1).map((x:string)=>esc(x).replace(/\n/g,'<br>')).join('<br><br>')+'<br><br>'+signatureHtml(p.language);}
function mime(to:string,subject:string,plain:string,html:string,replyMessageId:string|null=null){
  const boundary=`pppp_gc_${crypto.randomUUID().replace(/-/g,'')}`;
  const h=[`From: Arianit Vllahiu <${safeHeader(GMAIL_USER)}>`,`To: ${safeHeader(to)}`,`Subject: ${encodeHeader(subject)}`,'MIME-Version: 1.0'];
  if(replyMessageId){h.push(`In-Reply-To: ${safeHeader(replyMessageId)}`);h.push(`References: ${safeHeader(replyMessageId)}`);}
  h.push(`Content-Type: multipart/alternative; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: 8bit','',plain,'',`--${boundary}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: 8bit','',`<div dir="ltr">${html}</div>`,'',`--${boundary}--`,'');return h.join('\r\n');
}
async function createDraft(p:any,second=false,threadId:string|null=null,replyMessageId:string|null=null,subjectOverride:string|null=null){
  const subject=subjectOverride||(second?`Re: ${subject1(p).replace(/^Re:\s*/i,'')}`:subject1(p));
  const raw=mime(p.contact_email,subject,second?body2(p):body1(p),second?body2Html(p):body1Html(p),replyMessageId);
  const payload:any={message:{raw:b64url(raw)}};if(threadId)payload.message.threadId=threadId;
  return gmail('/drafts',{method:'POST',body:JSON.stringify(payload)});
}
async function existingDraftFor(p:any,subject:string,threadId:string|null=null){
  const drafts=await listDrafts(`to:${p.contact_email}`,30);
  for(const d of drafts){
    if(threadId&&d?.message?.threadId!==threadId)continue;
    try{const m=await message(d.message.id);if(lower(header(m,'Subject'))===lower(subject))return d;}catch{}
  }
  return null;
}
async function historySentToDomain(p:any){
  const d=contactDomain(p);if(!d)return false;
  const refs=await searchMessages(`in:sent newer_than:5y ${d}`,30);
  for(const ref of refs){
    try{const m=await message(ref.id),recips=[...emailsIn(header(m,'To')),...emailsIn(header(m,'Cc')),...emailsIn(header(m,'Bcc'))];if(recips.some(e=>sameDomain(e,d)))return true;}catch{}
  }
  return false;
}
function sentInThread(t:any,to:string,after:Date|null,exclude:string|null=null){
  return (t?.messages||[]).filter((m:any)=>Array.isArray(m.labelIds)&&m.labelIds.includes('SENT')&&(!exclude||m.id!==exclude)&&emailsIn(header(m,'To')).includes(lower(to))&&(!after||((msgAt(m)?.getTime()||0)>=after.getTime()-120000))).sort((a:any,b:any)=>(msgAt(a)?.getTime()||0)-(msgAt(b)?.getTime()||0))[0]||null;
}
function replyInThread(t:any,companyDomain:string|null,after:Date|null){
  if(!companyDomain||!after)return null;
  return (t?.messages||[]).filter((m:any)=>!(m.labelIds||[]).includes('SENT')&&!(m.labelIds||[]).includes('DRAFT')&&sameDomain(emailsIn(header(m,'From'))[0]||'',companyDomain)&&((msgAt(m)?.getTime()||0)>after.getTime())).sort((a:any,b:any)=>(msgAt(a)?.getTime()||0)-(msgAt(b)?.getTime()||0))[0]||null;
}
async function domainReply(p:any,after:Date){
  const d=contactDomain(p);if(!d)return null;
  const refs=await searchMessages(`from:${d} after:${afterDateQuery(after)} -in:sent -in:drafts`,20);
  for(const ref of refs){try{const m=await message(ref.id),from=emailsIn(header(m,'From'))[0]||'',at=msgAt(m);if(at&&at>after&&sameDomain(from,d))return m;}catch{}}
  return null;
}
async function bounceAfter(p:any,after:Date){
  const q=`{from:mailer-daemon from:postmaster} after:${afterDateQuery(after)} "${p.contact_email}"`,refs=await searchMessages(q,10);
  for(const ref of refs){try{const m=await message(ref.id),from=lower(header(m,'From')),at=msgAt(m);if(at&&at>after&&(from.includes('mailer-daemon')||from.includes('postmaster')))return m;}catch{}}
  return null;
}
async function loadProspect(id:string){const {data,error}=await db.from('pppp_gc_prospects_v1').select('*').eq('id',id).single();if(error)throw error;return data;}
async function rpc(name:string,args:any){const {data,error}=await db.rpc(name,args);if(error)throw error;return data;}
async function stopDoNotContact(p:any){
  await deleteDraft(p.first_draft_id);await deleteDraft(p.second_draft_id);
  await db.from('pppp_gc_prospects_v1').update({status:'do_not_contact',no_more_auto:true,followup_due_date:null,updated_at:nowIso(),last_error:null}).eq('id',p.id);
  if(p.outreach_contact_id)await db.from('outreach_contacts').update({status:'Do not contact',follow_up_date:null,updated_at:nowIso()}).eq('id',p.outreach_contact_id);
}

async function processOne(row:any,createRequested=false){
  let p=row;
  if(p.do_not_contact||p.status==='do_not_contact'){await stopDoNotContact(p);return {id:p.id,company:p.company_name,event:'do_not_contact'};}
  if(!p.contact_email)return {id:p.id,company:p.company_name,event:'no_contact_email'};
  if(!p.first_sent_at&&text(p.outreach_engine_version,20)==='v2'){
    const facts=factsFor(p);
    if(text(p.workflow_state,80)!=='ready_for_outreach'&&text(p.workflow_state,80)!=='draft_created')return {id:p.id,company:p.company_name,event:'readiness_blocked',reason:p.workflow_state||'not_ready'};
    if(Number(p.company_fit_score||0)<65||Number(p.commercial_timing_score||0)<35||Number(p.contact_quality_score||0)<50||Number(p.message_evidence_score||0)<60||facts.length<2)return {id:p.id,company:p.company_name,event:'readiness_blocked',reason:'score_or_evidence_gate'};
  }
  if(!p.first_sent_at&&p.status==='draft_ready'&&text(p.outreach_engine_version,20)==='v2'&&text(p.workflow_state,80)==='ready_for_outreach'){
    if(!createRequested)return {id:p.id,company:p.company_name,event:'legacy_draft_requires_manual_refresh',draft_id:p.first_draft_id||null};
    await deleteDraft(p.first_draft_id);
    await db.from('pppp_gc_prospects_v1').update({first_draft_id:null,first_gmail_message_id:null,first_gmail_thread_id:null,first_draft_created_at:null,status:'contact_ready',updated_at:nowIso(),last_error:'Legacy draft retired for Sales Engine V2 refresh'}).eq('id',p.id);
    p=await loadProspect(p.id);
  }

  // Detect first manual send from the draft's Gmail thread.
  if(!p.first_sent_at&&p.first_gmail_thread_id&&p.first_draft_created_at){
    try{
      const t=await thread(p.first_gmail_thread_id),sent=sentInThread(t,p.contact_email,new Date(p.first_draft_created_at));
      if(sent){await rpc('pppp_gc_mark_first_sent_v1',{p_prospect_id:p.id,p_message_id:sent.id,p_thread_id:sent.threadId,p_sent_at:msgAt(sent)?.toISOString()});p=await loadProspect(p.id);}
    }catch{}
  }

  // A DB draft_ready state is not authoritative if the Gmail draft was deleted.
  if(!p.first_sent_at&&p.status==='draft_ready'){
    const subj=subject1(p),existing=await existingDraftFor(p,subj);
    if(existing){
      if(existing.id!==p.first_draft_id||existing.message?.id!==p.first_gmail_message_id){
        await db.from('pppp_gc_prospects_v1').update({
          first_draft_id:existing.id,
          first_gmail_message_id:existing.message?.id||null,
          first_gmail_thread_id:existing.message?.threadId||null,
          updated_at:nowIso(),last_error:null
        }).eq('id',p.id).eq('status','draft_ready');
      }
      return {id:p.id,company:p.company_name,event:'live_draft_1_verified',draft_id:existing.id,human_send_required:true};
    }
    await db.from('pppp_gc_prospects_v1').update({
      first_draft_id:null,first_gmail_message_id:null,first_gmail_thread_id:null,first_draft_created_at:null,
      status:'contact_ready',updated_at:nowIso(),last_error:'Recovered missing Gmail draft #1'
    }).eq('id',p.id).eq('status','draft_ready');
    p=await loadProspect(p.id);
  }

  // Before Draft #1, use both the DB hard guard and actual Gmail Sent history.
  if(!p.first_sent_at&&p.status==='contact_ready'){
    if(!createRequested)return {id:p.id,company:p.company_name,event:'ready_for_manual_draft',offer_model:p.pristeel_offer_model||'fabricated_steel_package',human_send_required:true};
    const gg=await rpc('pppp_global_communication_guard_v1',{
      p_recipient_email:p.contact_email,
      p_company_domain:p.company_domain||contactDomain(p),
      p_exclude_source:'GC',
      p_exclude_source_record_id:p.id,
      p_exclude_queue_id:null
    });
    if(!gg?.ok){
      await rpc('pppp_gc_mark_gmail_history_duplicate_v1',{p_prospect_id:p.id,p_reason:'Global communication guard: '+text(gg?.reason||'blocked',180)});
      return {id:p.id,company:p.company_name,event:'blocked_global_communication_guard',reason:gg?.reason||'blocked',guard:gg,engine:ENGINE};
    }
    const hist=await rpc('pppp_gc_historical_outreach_v1',{p_company:p.company_name,p_domain:p.company_domain,p_email:p.contact_email});
    if(hist?.contacted){await rpc('pppp_gc_mark_gmail_history_duplicate_v1',{p_prospect_id:p.id,p_reason:'Historical PPPP outreach already exists'});return {id:p.id,company:p.company_name,event:'blocked_db_history'};}
    if(await historySentToDomain(p)){await rpc('pppp_gc_mark_gmail_history_duplicate_v1',{p_prospect_id:p.id,p_reason:'Historical Gmail Sent message exists for this company domain'});return {id:p.id,company:p.company_name,event:'blocked_gmail_history'};}
    const subj=subject1(p),existing=await existingDraftFor(p,subj),d=existing||await createDraft(p,false);
    await db.from('pppp_gc_prospects_v1').update({first_draft_id:d.id,first_gmail_message_id:d.message?.id||null,first_gmail_thread_id:d.message?.threadId||null,first_draft_created_at:nowIso(),status:'draft_ready',workflow_state:'draft_created',outreach_engine_version:'v2',outreach_motion:p.outreach_motion||'awarded_project_gc',pristeel_offer_model:p.pristeel_offer_model||'fabricated_steel_package',human_send_required:true,updated_at:nowIso(),last_error:null}).eq('id',p.id).eq('status','contact_ready');
    return {id:p.id,company:p.company_name,event:existing?'adopted_draft_1':'created_draft_1',draft_id:d.id,human_send_required:true};
  }

  if(!p.first_sent_at)return {id:p.id,company:p.company_name,event:'awaiting_manual_send_1'};

  // Record second manual send before evaluating replies, then reply/bounce wins as final state.
  if(!p.second_sent_at&&p.second_draft_id&&p.first_gmail_thread_id&&p.second_draft_created_at){
    try{
      const t=await thread(p.first_gmail_thread_id),sent=sentInThread(t,p.contact_email,new Date(p.second_draft_created_at),p.first_gmail_message_id);
      if(sent){await rpc('pppp_gc_mark_second_sent_v1',{p_prospect_id:p.id,p_message_id:sent.id,p_thread_id:sent.threadId,p_sent_at:msgAt(sent)?.toISOString()});p=await loadProspect(p.id);}
    }catch{}
  }

  const firstAt=new Date(p.first_sent_at),companyDomain=contactDomain(p);
  let t:any=null;try{if(p.first_gmail_thread_id)t=await thread(p.first_gmail_thread_id);}catch{}
  const threadReply=replyInThread(t,companyDomain,firstAt),externalReply=threadReply?null:await domainReply(p,firstAt);
  if(threadReply||externalReply){const m=threadReply||externalReply,cls=await rpc('pppp_outreach_reply_classification_v2',{p_subject:header(m,'Subject'),p_snippet:text(m?.snippet,500)});await deleteDraft(p.second_draft_id);await rpc('pppp_gc_mark_replied_v1',{p_prospect_id:p.id,p_replied_at:msgAt(m)?.toISOString()||nowIso(),p_reason:threadReply?'gmail_thread_reply':'gmail_company_domain_reply'});await db.from('pppp_gc_prospects_v1').update({reply_classification:cls?.category||'needs_human_review',reply_evidence:cls?.evidence||{},workflow_state:'reply_received',updated_at:nowIso()}).eq('id',p.id);return {id:p.id,company:p.company_name,event:'reply_detected',reply_classification:cls?.category||'needs_human_review'};}
  const bounce=await bounceAfter(p,firstAt);
  if(bounce){await deleteDraft(p.second_draft_id);await rpc('pppp_gc_mark_bounced_v1',{p_prospect_id:p.id,p_bounced_at:msgAt(bounce)?.toISOString()||nowIso(),p_reason:'gmail_delivery_bounce'});return {id:p.id,company:p.company_name,event:'bounce_detected'};}

  if(p.second_sent_at){
    if(new Date(p.second_sent_at).getTime()<=Date.now()-7*86400000){await rpc('pppp_gc_mark_no_response_v1',{p_prospect_id:p.id});return {id:p.id,company:p.company_name,event:'no_response_after_2'};}
    return {id:p.id,company:p.company_name,event:'sequence_complete_waiting_reply'};
  }

  const due=p.followup_due_date?new Date(`${p.followup_due_date}T00:00:00Z`):null;
  if(!due||due.getTime()>Date.now())return {id:p.id,company:p.company_name,event:'followup_not_due',due:p.followup_due_date};
  if(!createRequested)return {id:p.id,company:p.company_name,event:'followup_due_manual',due:p.followup_due_date,new_value:'future_supplier_qualification_question'};

  if(p.second_draft_id&&p.status==='draft_2_ready'){
    let firstMsg:any=null;try{if(p.first_gmail_message_id)firstMsg=await message(p.first_gmail_message_id);}catch{}
    const firstSubject=header(firstMsg,'Subject')||subject1(p),replySubject=/^re:/i.test(firstSubject)?firstSubject:`Re: ${firstSubject}`;
    const existing=await existingDraftFor(p,replySubject,p.first_gmail_thread_id);
    if(existing)return {id:p.id,company:p.company_name,event:'live_draft_2_verified',draft_id:existing.id,human_send_required:true};
    await db.from('pppp_gc_prospects_v1').update({
      second_draft_id:null,second_gmail_message_id:null,second_draft_created_at:null,
      status:'followup_due',updated_at:nowIso(),last_error:'Recovered missing Gmail draft #2'
    }).eq('id',p.id).eq('status','draft_2_ready');
    p=await loadProspect(p.id);
  }

  if(!p.second_draft_id){
    await db.from('pppp_gc_prospects_v1').update({status:'followup_due',updated_at:nowIso()}).eq('id',p.id).in('status',['contacted_1','followup_due']);
    let firstMsg:any=null;try{if(p.first_gmail_message_id)firstMsg=await message(p.first_gmail_message_id);}catch{}
    const firstSubject=header(firstMsg,'Subject')||subject1(p),rfcId=header(firstMsg,'Message-ID')||null,replySubject=/^re:/i.test(firstSubject)?firstSubject:`Re: ${firstSubject}`;
    const existing=await existingDraftFor(p,replySubject,p.first_gmail_thread_id),d=existing||await createDraft(p,true,p.first_gmail_thread_id,rfcId,replySubject);
    await db.from('pppp_gc_prospects_v1').update({second_draft_id:d.id,second_gmail_message_id:d.message?.id||null,second_draft_created_at:nowIso(),status:'draft_2_ready',human_send_required:true,updated_at:nowIso(),last_error:null}).eq('id',p.id).in('status',['contacted_1','followup_due']);
    return {id:p.id,company:p.company_name,event:existing?'adopted_draft_2':'created_draft_2',draft_id:d.id,human_send_required:true};
  }
  return {id:p.id,company:p.company_name,event:'awaiting_manual_send_2'};
}

async function run(limit=25,prospectId='',createRequested=false){
  let q=db.from('pppp_gc_prospects_v1').select('*');
  if(prospectId)q=q.eq('id',prospectId);
  else q=q.in('status',['draft_ready','contacted_1','followup_due','draft_2_ready','contacted_2','no_response_2']);
  const {data,error}=await q.order('relevance_score',{ascending:false}).order('updated_at',{ascending:true}).limit(prospectId?1:Math.min(50,Math.max(1,limit)));
  if(error)throw error;
  const results:any[]=[];let drafts1=0,drafts2=0,replies=0,bounces=0,duplicates=0,failed=0;
  for(const row of data||[]){
    try{
      const r=await processOne(row,createRequested);results.push(r);
      if(r.event==='created_draft_1'||r.event==='adopted_draft_1')drafts1++;
      if(r.event==='created_draft_2'||r.event==='adopted_draft_2')drafts2++;
      if(r.event==='reply_detected')replies++;
      if(r.event==='bounce_detected')bounces++;
      if(r.event==='blocked_db_history'||r.event==='blocked_gmail_history')duplicates++;
    }catch(e){failed++;const msg=String(e instanceof Error?e.message:e).slice(0,800);results.push({id:row.id,company:row.company_name,event:'failed',error:msg});await db.from('pppp_gc_prospects_v1').update({last_error:msg,updated_at:nowIso()}).eq('id',row.id);}
  }
  return {checked:(data||[]).length,drafts_1_ready:drafts1,drafts_2_ready:drafts2,replies,bounces,duplicates_blocked:duplicates,failed,results:results.slice(0,50),sequence:'manual email_1 -> 7 days -> contextual manual email_2 -> stop',human_send_required:true,auto_send:false,auto_cold_draft:false,no_paid_api:true,engine:ENGINE};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(!['GET','POST'].includes(req.method))return new Response(JSON.stringify({ok:false,error:'GET_or_POST_required'}),{status:405,headers:cors});
  const mode=await authorizationMode(req);if(!mode)return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:cors});
  try{
    const u=new URL(req.url);let body:any={};if(req.method==='POST'){try{body=await req.json();}catch{}}
    const limit=Number(body?.limit||u.searchParams.get('limit')||25),prospectId=text(body?.prospect_id||u.searchParams.get('prospect_id')||'',80);
    if(mode==='user'&&!prospectId)return new Response(JSON.stringify({ok:false,error:'prospect_id_required_for_user_request',auto_send:false,human_send_required:true}),{status:400,headers:cors});
    const out=await run(limit,prospectId,mode==='user');
    return new Response(JSON.stringify({ok:true,...out,authorization_mode:mode}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e instanceof Error?e.message:e),auto_send:false,no_paid_api:true,human_send_required:true}),{status:500,headers:cors});}
});
