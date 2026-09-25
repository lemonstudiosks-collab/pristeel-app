const EMAIL_RE=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;
const FREE_DOMAINS=new Set(['gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','yahoo.com','yahoo.de','yahoo.fr','icloud.com','aol.com','gmx.com','gmx.de','web.de','proton.me','protonmail.com']);
const RESERVED_DOMAINS=new Set(['example.com','example.org','example.net']);
const BLOCKED_SOURCE_DOMAINS=new Set(['forbes.pl','aleo.com','linkedin.com','facebook.com','instagram.com','wikipedia.org','bloomberg.com','crunchbase.com','kompass.com','europages.com','lursoft.lv']);
const BLOCKED_OUTREACH_LOCAL_PARTS=new Set(['invoice','billing','faktury','accounting','accounts','payable','recruiting','jobs','careers','career','hr','humanresources','privacy','gdpr','datenschutz','skundai','webmaster','support','press','presse','media','marketing','newsletter','noreply','no-reply','donotreply','legal','dpo','security','abuse','investorrelations','investor.relations','personalni','nabor','werken','imie.nazwisko','bieterportal-alt','20info']);
const GENERIC_LOCAL_PARTS=new Set(['info','office','contact','kontakt','sales','verkauf','procurement','purchasing','einkauf','tender','tenders','ausschreibung','vergabe','post','mail','hello','service','support','faktury','invoice','billing','commercial','comercial','admin','webmaster','pr']);
const GENERAL_FALLBACK_LOCAL_PARTS=new Set(['info','office','contact','kontakt','post','mail','hello','service','support','sales','verkauf','admin','sekretariat','reception']);

export function contactTier(email,meta={}){
  const e=normalizeEmail(email),local=(e.split('@')[0]||'').replace(/\+.*/,''),role=txt(meta?.job_title||meta?.role||meta?.title,180).toLowerCase(),name=explicitName(meta?.full_name||meta?.contact_name||meta?.person_name||meta?.name||'');
  if(!validEmail(e)||isBlockedOutreachEmail(e)||/(marketing|press|presse|media|career|karriere|recruit|human resources|personalwesen|\bhr\b)/.test(role))return'F';
  if(/(einkauf|procurement|purchas|sourcing|beschaffung|ausschreibung|tender|vergabe)/.test(local))return'C';
  if(GENERAL_FALLBACK_LOCAL_PARTS.has(local))return'E';
  if(name&&/(einkauf|procurement|purchas|sourcing|beschaffung|material|supply|buyer)/.test(role))return'A';
  if(name&&/(project|projekt|technical|technik|commercial|kaufm|construction|bauleit|geschäfts|manag|director|leiter)/.test(role))return'B';
  return name||/^[a-z]+[._-][a-z]+$/.test(local)?'D':'E';
}
export function contactQualityScore(email,meta={}){const x=contactTier(email,meta);return x==='A'?95:x==='B'?82:x==='C'?70:x==='D'?55:x==='E'?25:0;}

const txt=(v,max=500)=>String(v==null?'':v).trim().slice(0,max);
export function normalizeEmail(v){return txt(v,320).toLowerCase().replace(/^mailto:/,'').replace(/[\s,;]+$/,'');}
export function validEmail(v){return EMAIL_RE.test(normalizeEmail(v));}
export function domainFromEmail(v){const e=normalizeEmail(v),i=e.lastIndexOf('@');return i>0?e.slice(i+1).replace(/^www\./,''):'';}
export function normalizeDomain(v){let s=txt(v,500).toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//i,'').split('/')[0].split('?')[0].split('#')[0].split(':')[0].replace(/^www\./,'');return s||'';}
export function isReservedEmail(v){const d=domainFromEmail(v);return !d||RESERVED_DOMAINS.has(d)||d.endsWith('.example')||d.endsWith('.invalid')||d==='localhost';}
export function isBlockedOutreachEmail(v){const e=normalizeEmail(v),local=e.split('@')[0]||'';return BLOCKED_OUTREACH_LOCAL_PARTS.has(local)||/^u003e/i.test(local)||/^(?:&gt;|%3e)/i.test(local)||/^20[a-z]{2,}\.[a-z]{2,}$/.test(local)||/^(serviceclient|siemensenergy|information)\.[a-z]{2}(?:\.[a-z]{2})?$/i.test(local)||/^contact-(latam|emea|apac)$/i.test(local);}
export function sameCompanyDomain(email,domain){const ed=domainFromEmail(email),d=normalizeDomain(domain);return !!ed&&!!d&&(ed===d||ed.endsWith('.'+d)||d.endsWith('.'+ed));}
function explicitName(v){const s=txt(v,180).replace(/\s+/g,' ');if(!s||s.includes('@')||/^https?:/i.test(s))return'';return s;}
function titleCaseNamePart(v){return v?`${v[0].toUpperCase()}${v.slice(1).toLowerCase()}`:'';}
export function inferredPersonName(email,meta={}){
  const purpose=txt(meta?.purpose,80).toLowerCase();if(purpose!=='person')return'';
  const e=normalizeEmail(email),local=e.split('@')[0]||'';if(!local||GENERIC_LOCAL_PARTS.has(local))return'';
  const parts=local.split(/[._-]+/).filter(Boolean);if(parts.length!==2)return'';
  if(parts.some(p=>p.length<2||p.length>40||GENERIC_LOCAL_PARTS.has(p)||!/^[a-zà-öø-ÿ]+$/i.test(p)))return'';
  return parts.map(titleCaseNamePart).join(' ');
}
function contactName(row,email){return explicitName(row?.full_name||row?.contact_name||row?.person_name||row?.name||'')||inferredPersonName(email,row);}
function confidenceRank(v){const s=txt(v,40).toLowerCase();return s==='high'?3:s==='medium'?2:s==='verified'?3:s==='low'?1:0;}
function websiteDomain(v){return normalizeDomain(v);}

function blockedSourceDomain(d){d=normalizeDomain(d);if(!d)return false;for(const b of BLOCKED_SOURCE_DOMAINS)if(d===b||d.endsWith('.'+b))return true;return false;}
const COMPANY_LEGAL_WORDS=new Set(['gmbh','mbh','co','kg','ag','se','srl','sro','sp','zoo','sa','sas','sasu','ltd','limited','inc','llc','bv','nv','oy','ab','aps','as','doo','d','o','gesellschaft','gruppe','group','company']);
function companyNameKey(v){return txt(v,300).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(x=>x&&!COMPANY_LEGAL_WORDS.has(x)).join(' ').trim();}
function scopedOrganizations(action,winner){
  const orgs=Array.isArray(winner?.contact_enrichment?.organizations)?winner.contact_enrichment.organizations:[],target=companyNameKey(action?.target_company||winner?.name);
  if(!orgs.length)return[];
  if(!target)return orgs.length===1?orgs:[];
  const exact=orgs.filter(org=>companyNameKey(org?.name)===target);
  if(exact.length)return exact;
  return orgs.length===1?orgs:[];
}
function companyDomains(action,winner){
  const out=new Set(),orgs=scopedOrganizations(action,winner),allOrgs=Array.isArray(winner?.contact_enrichment?.organizations)?winner.contact_enrichment.organizations:[];
  const add=d=>{d=normalizeDomain(d);if(d&&!FREE_DOMAINS.has(d)&&!RESERVED_DOMAINS.has(d)&&!blockedSourceDomain(d))out.add(d);};
  add(action?.company_domain);
  for(const org of orgs)add(org?.domain||websiteDomain(org?.official_website));
  if(allOrgs.length<=1){
    add(websiteDomain(winner?.website));
    for(const u of Array.isArray(winner?.websites)?winner.websites:[])add(websiteDomain(u));
  }
  return out;
}
function belongsToCompany(email,domains){if(!domains.size)return false;for(const d of domains)if(sameCompanyDomain(email,d))return true;return false;}
function sourceDomainMatches(email,meta,domains){const sd=websiteDomain(meta?.source_url);if(!sd||blockedSourceDomain(sd)||!sameCompanyDomain(email,sd))return false;if(!domains.size)return true;for(const d of domains)if(sd===d||sd.endsWith('.'+d)||d.endsWith('.'+sd))return true;return false;}

function candidate(email,meta={}){
  const e=normalizeEmail(email),d=domainFromEmail(e);if(!validEmail(e)||isReservedEmail(e)||(!meta?.allow_free_domain&&FREE_DOMAINS.has(d))||isBlockedOutreachEmail(e))return null;
  return {email:e,name:contactName(meta,e),salutation:txt(meta?.salutation||meta?.honorific||meta?.address_title||meta?.title_prefix,80)||null,gender:txt(meta?.gender,40)||null,job_title:txt(meta?.job_title||meta?.role||meta?.title,180)||null,purpose:txt(meta?.purpose,80)||null,confidence:txt(meta?.confidence||meta?.verification_status,40)||null,score:Number(meta?.score||0)||0,source_type:txt(meta?.source_type,80)||null,source_url:txt(meta?.source_url,1000)||null,priority:Number(meta?.priority||0)||0,company_attribution:txt(meta?.company_attribution,80)||null,recipient_company_name:txt(meta?.recipient_company_name,300)||null,recipient_company_domain:normalizeDomain(meta?.recipient_company_domain)||null,draft_eligible:meta?.draft_eligible!==false};
}
function mergeCandidate(a,b){
  if(!a)return b;if(!b)return a;
  const names=new Set([a.name,b.name].filter(Boolean));
  return {...a,
    name:names.size===1?[...names][0]:(a.name&&b.name&&a.name!==b.name?null:(a.name||b.name||null)),
    salutation:a.salutation||b.salutation||null,
    gender:a.gender||b.gender||null,
    job_title:a.job_title||b.job_title||null,
    purpose:a.purpose||b.purpose||null,
    confidence:confidenceRank(b.confidence)>confidenceRank(a.confidence)?b.confidence:a.confidence,
    score:Math.max(a.score||0,b.score||0),priority:Math.max(a.priority||0,b.priority||0),
    source_type:a.source_type||b.source_type||null,source_url:a.source_url||b.source_url||null,recipient_company_name:a.recipient_company_name||b.recipient_company_name||null,recipient_company_domain:a.recipient_company_domain||b.recipient_company_domain||null};
}

export function resolveTedDraftRecipients(action,tenderPayload,max=20){
  const winner=tenderPayload?.winner||{},domains=companyDomains(action,winner),rows=[];
  if(!domains.size)return [];
  const push=(email,meta={})=>{
    const c=candidate(email,{...meta,allow_free_domain:false});if(!c||c.draft_eligible===false)return;
    if(!belongsToCompany(c.email,domains))return;
    const cr=confidenceRank(c.confidence),score=Number(c.score||0);if(cr<2&&score<80)return;
    const tier=contactTier(c.email,c),contact_quality_score=contactQualityScore(c.email,c);if(contact_quality_score<50)return;
    rows.push({...c,contact_tier:tier,contact_quality_score,company_attribution:c.company_attribution||'verified_company_domain',recipient_company_domain:domainFromEmail(c.email)});
  };
  for(const r of Array.isArray(tenderPayload?.winner_contacts)?tenderPayload.winner_contacts:[]){
    if(!/verified|high|medium/i.test(txt(r?.verification_status||r?.confidence,40)))continue;
    push(r?.email||r?.value,{...r,priority:900});
  }
  for(const org of scopedOrganizations(action,winner)){
    const od=normalizeDomain(org?.domain||websiteDomain(org?.official_website));if(!od)continue;
    for(const r of Array.isArray(org?.contacts)?org.contacts:[]){
      if(txt(r?.type,30).toLowerCase()!=='email')continue;
      const email=r?.email||r?.value;if(!sameCompanyDomain(email,od))continue;
      push(email,{...r,priority:800+Math.min(99,Number(r?.score||0)),recipient_company_name:org?.name||null,recipient_company_domain:od});
    }
  }
  const map=new Map();for(const r of rows)map.set(r.email,mergeCandidate(map.get(r.email),r));
  const purposeRank={procurement:0,tender:1,sales:2,person:3,general:4};
  const limit=Math.max(1,Math.min(20,Number(max)||20));
  return [...map.values()].sort((a,b)=>(b.contact_quality_score-a.contact_quality_score)||(purposeRank[a.purpose]??8)-(purposeRank[b.purpose]??8)||(b.priority-a.priority)||(b.score-a.score)||a.email.localeCompare(b.email)).slice(0,limit);
}

export function resolveTedRecipients(action,tenderPayload,max=1){
  const winner=tenderPayload?.winner||{},domains=companyDomains(action,winner),rows=[];
  const readiness=(action?.payload?.outreach_readiness_v1&&typeof action.payload.outreach_readiness_v1==='object')
    ?action.payload.outreach_readiness_v1
    :(tenderPayload?.outreach_readiness_v1&&typeof tenderPayload.outreach_readiness_v1==='object'?tenderPayload.outreach_readiness_v1:{});
  const verifiedDomain=normalizeDomain(readiness?.verified_company_domain);
  const contactIdentityVerified=readiness?.contact_identity_verified===true||String(readiness?.contact_identity_verified||'').toLowerCase()==='true';
  const allowGenericFallback=String(readiness?.contact_quality||'').toLowerCase()==='generic_fallback_reviewed';
  const push=(email,meta={},trust='domain')=>{
    meta={...meta,allow_free_domain:false};
    const c=candidate(email,meta);if(!c||c.draft_eligible===false)return;
    const local=(c.email.split('@')[0]||'').replace(/\+.*/,'');
    if(GENERAL_FALLBACK_LOCAL_PARTS.has(local)&&!allowGenericFallback)return;
    if(!contactIdentityVerified||!verifiedDomain||!sameCompanyDomain(c.email,verifiedDomain))return;
    let ok=false,attribution='';
    if(trust==='domain'){ok=belongsToCompany(c.email,domains)||sameCompanyDomain(c.email,verifiedDomain);attribution='verified_company_domain';}
    else if(trust==='official'){ok=sourceDomainMatches(c.email,meta,domains)||sameCompanyDomain(c.email,verifiedDomain);attribution='official_source';}
    else if(trust==='ted'){ok=sameCompanyDomain(c.email,verifiedDomain);attribution='ted_declared+manual_domain_verified';}
    if(!ok)return;
    rows.push({...c,company_attribution:c.company_attribution||attribution,recipient_company_domain:verifiedDomain});
  };
  push(action?.target_email,{priority:1000,source_type:'opportunity_action',confidence:'high',recipient_company_name:action?.target_company||null,recipient_company_domain:verifiedDomain},'domain');
  for(const r of Array.isArray(tenderPayload?.winner_contacts)?tenderPayload.winner_contacts:[]){
    const verified=/verified|high/i.test(txt(r?.verification_status||r?.confidence,40));
    const ted=/ted/i.test(txt(r?.source_type||r?.source,80));
    const official=/official_website|company_website/i.test(txt(r?.source_type||r?.source,80));
    push(r?.email||r?.value,{...r,priority:verified?900:760},ted?'ted':official&&verified?'official':'domain');
  }
  for(const r of Array.isArray(winner?.contacts)?winner.contacts:[]){
    if((r?.type&&txt(r.type,30).toLowerCase()!=='email'))continue;
    push(r?.email||r?.value,{...r,priority:780},'domain');
  }
  for(const org of scopedOrganizations(action,winner)){
    const od=normalizeDomain(org?.domain||websiteDomain(org?.official_website));
    for(const r of Array.isArray(org?.contacts)?org.contacts:[]){
      if(txt(r?.type,30).toLowerCase()!=='email')continue;
      const email=r?.email||r?.value;if(!validEmail(email)||isReservedEmail(email)||isBlockedOutreachEmail(email))continue;
      if(od&&!sameCompanyDomain(email,od)&&!sameCompanyDomain(email,verifiedDomain))continue;
      const cr=confidenceRank(r?.confidence),score=Number(r?.score||0);if(cr<2&&score<80)continue;
      push(email,{...r,priority:700+Math.min(99,score),recipient_company_name:org?.name||null,recipient_company_domain:verifiedDomain},'domain');
    }
  }
  for(const [idx,e] of (Array.isArray(winner?.emails)?winner.emails:[]).entries())push(e,{priority:650,source_type:'TED',confidence:'high',recipient_company_name:(Array.isArray(winner?.names)?winner.names[idx]:null)||winner?.name||null,recipient_company_domain:verifiedDomain},'ted');
  push(winner?.email,{priority:640,source_type:'TED',confidence:'high',recipient_company_name:winner?.name||null,recipient_company_domain:verifiedDomain},'ted');
  const map=new Map();for(const r of rows)map.set(r.email,mergeCandidate(map.get(r.email),r));
  return [...map.values()].sort((a,b)=>(b.priority-a.priority)||(b.score-a.score)||a.email.localeCompare(b.email)).slice(0,Math.max(1,Math.min(1,Number(max)||1)));
}

export function recipientGreeting(company,recipient){const e=normalizeEmail(recipient?.email),local=(e.split('@')[0]||'').replace(/\+.*/,''),purpose=txt(recipient?.purpose,80).toLowerCase(),general=purpose==='general'||GENERIC_LOCAL_PARTS.has(local);const n=general?'':explicitName(recipient?.name);return n?`Dear ${n},`:'Dear Sir or Madam,';}

