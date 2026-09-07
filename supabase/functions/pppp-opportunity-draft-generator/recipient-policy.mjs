const EMAIL_RE=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;
const FREE_DOMAINS=new Set(['gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','yahoo.com','yahoo.de','yahoo.fr','icloud.com','aol.com','gmx.com','gmx.de','web.de','proton.me','protonmail.com']);
const GENERIC_LOCAL_PARTS=new Set(['info','office','contact','kontakt','sales','verkauf','procurement','purchasing','einkauf','tender','tenders','ausschreibung','vergabe','post','mail','hello','service','support','faktury','invoice','billing','commercial','comercial','admin','webmaster','pr']);

const txt=(v,max=500)=>String(v==null?'':v).trim().slice(0,max);
export function normalizeEmail(v){return txt(v,320).toLowerCase().replace(/^mailto:/,'').replace(/[\s,;]+$/,'');}
export function validEmail(v){return EMAIL_RE.test(normalizeEmail(v));}
export function domainFromEmail(v){const e=normalizeEmail(v),i=e.lastIndexOf('@');return i>0?e.slice(i+1).replace(/^www\./,''):'';}
export function normalizeDomain(v){let s=txt(v,500).toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//i,'').split('/')[0].split('?')[0].split('#')[0].split(':')[0].replace(/^www\./,'');return s||'';}
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

function companyDomains(action,winner){
  const out=new Set();
  const add=d=>{d=normalizeDomain(d);if(d&&!FREE_DOMAINS.has(d))out.add(d);};
  add(action?.company_domain);
  add(websiteDomain(winner?.website));
  for(const u of Array.isArray(winner?.websites)?winner.websites:[])add(websiteDomain(u));
  for(const org of winner?.contact_enrichment?.organizations||[])add(org?.domain||websiteDomain(org?.official_website));
  const targetDomain=domainFromEmail(action?.target_email);if(targetDomain&&!FREE_DOMAINS.has(targetDomain))add(targetDomain);
  return out;
}
function belongsToCompany(email,domains){if(!domains.size)return true;for(const d of domains)if(sameCompanyDomain(email,d))return true;return false;}

function candidate(email,meta={}){
  const e=normalizeEmail(email);if(!validEmail(e))return null;
  return {email:e,name:contactName(meta,e),job_title:txt(meta?.job_title||meta?.role||meta?.title,180)||null,purpose:txt(meta?.purpose,80)||null,confidence:txt(meta?.confidence||meta?.verification_status,40)||null,score:Number(meta?.score||0)||0,source_type:txt(meta?.source_type,80)||null,source_url:txt(meta?.source_url,1000)||null,priority:Number(meta?.priority||0)||0};
}
function mergeCandidate(a,b){
  if(!a)return b;if(!b)return a;
  const names=new Set([a.name,b.name].filter(Boolean));
  return {...a,
    name:names.size===1?[...names][0]:(a.name&&b.name&&a.name!==b.name?null:(a.name||b.name||null)),
    job_title:a.job_title||b.job_title||null,
    purpose:a.purpose||b.purpose||null,
    confidence:confidenceRank(b.confidence)>confidenceRank(a.confidence)?b.confidence:a.confidence,
    score:Math.max(a.score||0,b.score||0),priority:Math.max(a.priority||0,b.priority||0),
    source_type:a.source_type||b.source_type||null,source_url:a.source_url||b.source_url||null};
}

export function resolveTedRecipients(action,tenderPayload,max=20){
  const winner=tenderPayload?.winner||{},domains=companyDomains(action,winner),rows=[];
  const push=(email,meta={},trust='domain')=>{const c=candidate(email,meta);if(!c)return;if(trust==='domain'&&!belongsToCompany(c.email,domains))return;rows.push(c);};
  // The action's selected target is always retained for backward compatibility.
  push(action?.target_email,{priority:1000,source_type:'opportunity_action',confidence:'high'},'explicit');

  // Rich named winner contacts are preferred when the contact record explicitly belongs to this winner.
  for(const r of Array.isArray(tenderPayload?.winner_contacts)?tenderPayload.winner_contacts:[]){
    const verified=/verified|high/i.test(txt(r?.verification_status||r?.confidence,40));
    const ted=/ted/i.test(txt(r?.source_type||r?.source,80));
    push(r?.email||r?.value,{...r,priority:verified?900:760},(verified||ted)?'explicit':'domain');
  }
  for(const r of Array.isArray(winner?.contacts)?winner.contacts:[]){
    if((r?.type&&txt(r.type,30).toLowerCase()!=='email'))continue;
    push(r?.email||r?.value,{...r,priority:780},'domain');
  }

  // Public-web enrichment can contain unrelated addresses on a page, so organization-domain matching is mandatory.
  for(const org of winner?.contact_enrichment?.organizations||[]){
    const od=normalizeDomain(org?.domain||websiteDomain(org?.official_website));
    for(const r of Array.isArray(org?.contacts)?org.contacts:[]){
      if(txt(r?.type,30).toLowerCase()!=='email')continue;
      const email=r?.email||r?.value;if(!validEmail(email))continue;
      if(od&&!sameCompanyDomain(email,od))continue;
      if(!od&&!belongsToCompany(email,domains))continue;
      const cr=confidenceRank(r?.confidence),score=Number(r?.score||0);if(cr<2&&score<80)continue;
      push(email,{...r,priority:700+Math.min(99,score)},'explicit');
    }
  }

  // TED-declared winner email arrays remain authoritative even for companies using a public mailbox domain.
  for(const e of Array.isArray(winner?.emails)?winner.emails:[])push(e,{priority:650,source_type:'TED',confidence:'high'},'explicit');
  push(winner?.email,{priority:640,source_type:'TED',confidence:'high'},'explicit');

  const map=new Map();for(const r of rows)map.set(r.email,mergeCandidate(map.get(r.email),r));
  return [...map.values()].sort((a,b)=>(b.priority-a.priority)||(b.score-a.score)||a.email.localeCompare(b.email)).slice(0,Math.max(1,Math.min(50,Number(max)||20)));
}

export function recipientGreeting(company,recipient){const n=explicitName(recipient?.name);return n?`Dear ${n},`:`Dear ${txt(company,300)||'Sir or Madam'} team,`;}
