const txt=(v,max=12000)=>String(v==null?'':v).replace(/\r/g,'').trim().slice(0,max);
const emailDomain=v=>{const e=txt(v,320).toLowerCase(),i=e.lastIndexOf('@');return i>0?e.slice(i+1):'';};
const norm=v=>txt(v,300).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const first=(...xs)=>xs.map(x=>txt(x,1000)).find(Boolean)||'';
const esc=v=>txt(v,12000).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

export const PRISTEEL_LOGO_URL='https://ci3.googleusercontent.com/mail-sig/AIorK4zBbQr6xZC9wHaoIhmL0bKLl8uPOlacg1Q4uZvshbApeKuRiHczkMprJts9P2a3CvsPovpqy2N5ZRba';
const SIGNATURE=[
  'Arianit Vllahiu',
  'Head of Business Development',
  '+383 (0) 44 244 699',
  'arianit.vllahiu@prissteel.com',
  'www.prissteel.com'
].join('\n');
const SIGNATURE_HTML=`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;border-collapse:collapse;font-family:Arial,sans-serif;color:#1f2937"><tbody><tr><td valign="middle" style="padding:0 18px 0 0"><img src="${PRISTEEL_LOGO_URL}" width="182" alt="PRISTEEL" style="display:block;border:0;outline:none;text-decoration:none;width:182px;height:auto"></td><td valign="middle" style="border-left:2px solid #1a73e8;padding:0 0 0 18px"><div style="font-size:17px;line-height:1.25;font-weight:700;color:#1f2937">Arianit Vllahiu</div><div style="font-size:15px;line-height:1.35;color:#1f2937">Head of Business Development</div><div style="margin-top:8px;font-size:14px;line-height:1.5"><a href="tel:+38344244699" style="color:#1a73e8;text-decoration:underline">+383 (0) 44 244 699</a></div><div style="font-size:14px;line-height:1.5"><a href="mailto:arianit.vllahiu@prissteel.com" style="color:#1a73e8;text-decoration:underline">arianit.vllahiu@prissteel.com</a></div><div style="font-size:14px;line-height:1.5"><a href="https://www.prissteel.com" style="color:#1a73e8;text-decoration:underline">www.prissteel.com</a></div></td></tr></tbody></table>`;

const DACH_TOKENS=new Set(['de','deu','ger','germany','deutschland','at','aut','austria','osterreich','oesterreich','ch','che','switzerland','schweiz','li','lie','liechtenstein']);
const BCS_TOKENS=new Set(['hr','hrv','croatia','hrvatska','rs','srb','serbia','srbija','me','mne','montenegro','crna gora']);
const COUNTRY_PREFIXES=new Set(['albania','austria','belgium','bosnia and herzegovina','bulgaria','croatia','cyprus','czechia','czech republic','denmark','estonia','finland','france','germany','greece','hungary','iceland','ireland','italy','kosovo','latvia','liechtenstein','lithuania','luxembourg','malta','montenegro','netherlands','north macedonia','norway','poland','portugal','romania','serbia','slovakia','slovenia','spain','sweden','switzerland','united kingdom','uk']);
function decodeEntities(v){return txt(v,1800).replace(/&amp;quot;/gi,'"').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');}
function tokenLanguage(v){
  const s=norm(v).replace(/[^a-z0-9 ]+/g,' ').trim();if(!s)return'';
  for(const t of DACH_TOKENS)if(s===t||s.startsWith(t+' ')||s.endsWith(' '+t)||s.includes(' '+t+' '))return'de';
  for(const t of BCS_TOKENS)if(s===t||s.startsWith(t+' ')||s.endsWith(' '+t)||s.includes(' '+t+' '))return'bcs';
  return'';
}
function titleMarketLanguage(action,tender){
  const raw=decodeEntities(first(action?.tender_title,tender?.title,action?.payload?.project_title));
  return tokenLanguage((raw.split(/\s+[–—]\s+/)[0]||'').trim());
}
function marketValues(action,tender,recipient){
  const winner=tender?.winner||{};
  return [recipient?.country,recipient?.country_code,action?.country,action?.market,action?.market_country,action?.payload?.country,action?.payload?.market,action?.payload?.market_country,winner?.country,...(Array.isArray(winner?.countries)?winner.countries:[]),...(Array.isArray(tender?.place_of_performance)?tender.place_of_performance:[]),tender?.country,tender?.market].filter(Boolean);
}
export function resolveDraftLanguage(action={},tender={},recipient={}){
  const byTitle=titleMarketLanguage(action,tender);if(byTitle)return byTitle;
  for(const v of marketValues(action,tender,recipient)){const x=tokenLanguage(v);if(x)return x;}
  const d=emailDomain(recipient?.email||action?.target_email);
  if(/\.(de|at|ch|li)$/.test(d))return'de';
  if(/\.(hr|rs|me)$/.test(d))return'bcs';
  return'en';
}

export function tedReference(tender={}){
  let r=first(tender?.publication_no,tender?.procurement_no,tender?.ted_reference,tender?.notice_id,tender?.payload?.publication_no,tender?.payload?.procurement_no);
  r=r.replace(/^TED[-\s:]*/i,'').trim();
  return r;
}
export function tedUrl(tender={}){return first(tender?.source_url,tender?.detail_url,tender?.payload?.source_url,tender?.payload?.detail_url);}
function explicitGermanGender(recipient,name){
  const raw=norm(first(recipient?.salutation,recipient?.honorific,recipient?.address_title,recipient?.title_prefix,recipient?.gender));
  const fromName=norm(name);
  if(/^(herr|mr|mister|male|mann|m|masculine)(\b|$)/.test(raw)||/^(herr|mr\.?|mister)\s+/.test(fromName))return'male';
  if(/^(frau|mrs|ms|miss|female|weiblich|w|f|feminine)(\b|$)/.test(raw)||/^(frau|mrs\.?|ms\.?|miss)\s+/.test(fromName))return'female';
  return'';
}
function germanSurname(name){
  let s=txt(name,180).replace(/\s+/g,' ').trim();
  s=s.replace(/^(?:(?:herr|frau|mr\.?|mrs\.?|ms\.?|miss)\s+)+/i,'').trim();
  s=s.replace(/^(?:(?:prof\.?|dr\.?|prof\.?\s*dr\.?)\s+)+/i,'').trim();
  const parts=s.split(' ').filter(Boolean);
  return parts.length?parts[parts.length-1]:'';
}
function greeting(language,company,recipient){
  const kind=recipientKind(recipient),name=kind==='general'?'':txt(recipient?.name,180).replace(/\s+/g,' ');
  if(language==='de'){
    const gender=explicitGermanGender(recipient,name),surname=germanSurname(name);
    if(gender==='male'&&surname)return'Sehr geehrter Herr '+surname+',';
    if(gender==='female'&&surname)return'Sehr geehrte Frau '+surname+',';
    return'Sehr geehrte Damen und Herren,';
  }
  if(language==='bcs')return name?'Poštovani '+name+',':'Poštovani,';
  return name?'Dear '+name+',':'Hello,';
}
function closing(language){return language==='de'?'Mit freundlichen Grüßen':language==='bcs'?'S poštovanjem':'Kind regards';}
const GENERAL_LOCAL_PARTS=new Set(['info','office','contact','kontakt','mail','hello','post','admin','sekretariat','service']);
export function recipientKind(recipient={}){
  const purpose=norm(recipient?.purpose),email=txt(recipient?.email,320).toLowerCase(),local=(email.split('@')[0]||'').replace(/\+.*/,'');
  if(purpose==='general'||GENERAL_LOCAL_PARTS.has(local))return'general';
  return'direct';
}
function roleFor(route){const r=txt(route,80).toUpperCase();if(r==='TED_PRODUCER')return'producer';if(r==='TED_CONSORTIUM')return'consortium';if(r==='TED_GC')return'gc';return'general';}
function shortProject(v){const s=txt(v,220).replace(/\s+/g,' ');if(s.length<=68)return s;const ref=(s.match(/\b(?:MDH\/\d+\/\d+|V\d{3,4}|NSW[_-][A-Z0-9_-]+|[A-Z]{1,5}[-_]\d{2,}[A-Z0-9_-]*)\b/i)||[])[0];if(ref)return ref;const marker=(s.match(/\b(?:zona\s+(?:Est|Vest|Nord|Sud)|East|West|North|South)\b/i)||[])[0],head=s.slice(0,38).replace(/\s+\S*$/,'').trim();if(marker)return head+'…'+marker;const tail=s.slice(-25).replace(/^\S*\s+/,'').trim();return head+'…'+tail;}
function subjectFor(language,role,title){
  const p=shortProject(title);
  if(language==='de')return 'Projekt '+p+' – Stahlpaket | PRISTEEL';
  if(language==='bcs')return 'Projekt '+p+' – čelični paket | PRISTEEL';
  return 'Project '+p+' – steel package | PRISTEEL';
}
function readinessData(action,tender){
  const a=action?.payload?.outreach_readiness_v1;
  if(a&&typeof a==='object'&&!Array.isArray(a))return a;
  const t=tender?.outreach_readiness_v1;
  if(t&&typeof t==='object'&&!Array.isArray(t))return t;
  return {};
}
function roleParagraphs(language,role,title,action,tender){
  const r=readinessData(action,tender);
  const fact=first(r.scope_evidence,r.project_fact,r.pristeel_scope);
  const question=first(r.concrete_question);
  const scope=first(r.pristeel_scope);
  const qualification=(r.qualification_required===true&&r.qualification_fit===true)?first(r.qualification_evidence):'';
  if(language==='de'){
    const intro=fact||('Für das Projekt „'+title+'“ wurde ein konkreter Stahlumfang identifiziert.');
    const ask=question||'Ist dieser Fertigungsumfang bereits vollständig vergeben oder bestehen noch klar abgegrenzte Pakete für externe Fertigung?';
    const capability='PRISTEEL kann für diesen Umfang '+(scope||'projektbezogene Stahlbauteile')+' einschließlich Materialbeschaffung, Build-to-Print-Fertigung, Oberflächenschutz, Qualitätsdokumentation und Lieferung koordinieren.';
    return[intro,ask,capability,qualification].filter(Boolean);
  }
  if(language==='bcs'){
    const intro=fact||('Za projekt „'+title+'“ identificiran je konkretan opseg čeličnih radova.');
    const ask=question||'Da li je ovaj proizvodni opseg već u potpunosti ugovoren ili postoje jasno odvojeni paketi za vanjsku proizvodnju?';
    const capability='PRISTEEL za ovaj opseg može koordinirati '+(scope||'projektne čelične komponente')+', uključujući nabavku materijala, proizvodnju prema nacrtima, površinsku zaštitu, dokumentaciju kvaliteta i isporuku.';
    return[intro,ask,capability,qualification].filter(Boolean);
  }
  const intro=fact||('A specific steel scope has been identified for “'+title+'”.');
  const ask=question||'Is this fabrication scope already fully covered, or are clearly defined packages still open for external fabrication?';
  const capability='PRISTEEL can coordinate '+(scope||'project-specific steel components')+' for this scope, including material procurement, build-to-print fabrication, surface protection, quality documentation and delivery.';
  return[intro,ask,capability,qualification].filter(Boolean);
}
function cleanProjectTitle(v,ref=''){
  let s=decodeEntities(v);
  if(ref)s=s.split(ref).join(' ');
  s=s.replace(/\bTED\b(?:\s*[-:#]?\s*\d{5,}-\d{4})?/gi,' ').replace(/\s+/g,' ').replace(/^[\s|:;,.\-–—]+|[\s|:;,.\-–—]+$/g,'').trim();
  const parts=s.split(/\s+[–—]\s+/).map(x=>x.trim()).filter(Boolean);
  if(parts.length>=3&&COUNTRY_PREFIXES.has(norm(parts[0])))s=parts.slice(2).join(' – ');
  else if(parts.length>=2&&COUNTRY_PREFIXES.has(norm(parts[0])))s=parts.slice(1).join(' – ');
  return s.trim();
}
function htmlParagraph(v){return v?`<p style="margin:0 0 14px 0">${esc(v).replace(/\\n/g,'<br>')}</p>`:'';}

export function buildTedDraftContent(action={},tender={},recipient={}){
  const language=resolveDraftLanguage(action,tender,recipient),route=txt(action?.route,80),role=roleFor(route),company=txt(action?.target_company,300),ref=tedReference(tender),url=tedUrl(tender),title=cleanProjectTitle(first(action?.tender_title,tender?.title,action?.payload?.project_title),ref)||'the referenced project',kind=recipientKind(recipient),motion=txt(action?.outreach_motion||'awarded_project_gc',80),rdata=readinessData(action,tender),facts=(Array.isArray(action?.personalization_facts)&&action.personalization_facts.length?action.personalization_facts:[rdata.scope_evidence||rdata.project_fact,rdata.pristeel_scope||rdata.qualification_evidence]).map(x=>txt(x,1000)).filter(Boolean);
  if(facts.length<2)throw new Error('outreach_v2_requires_two_specific_facts');
  const future=motion==='future_supplier_qualification'||txt(action?.timing_classification,80)==='future_supplier_qualification';
  const subject=future?(language==='de'?company+' – Lieferantenqualifizierung Stahl | PRISTEEL':language==='bcs'?company+' – kvalifikacija dobavljača čelika | PRISTEEL':company+' – future steel supplier qualification | PRISTEEL'):subjectFor(language,role,title);
  const greet=greeting(language,company,recipient),scope=txt(rdata.pristeel_scope,1000),capability=language==='de'?'PRISTEEL koordiniert '+(scope||'klar abgegrenzte Stahlbaupakete')+' einschließlich Materialbeschaffung, Build-to-Print-Fertigung, Qualitätsdokumentation und DAP-Lieferung.':language==='bcs'?'PRISTEEL koordinira '+(scope||'jasno odvojene pakete čeličnih konstrukcija')+', uključujući nabavku materijala, proizvodnju prema nacrtima, dokumentaciju kvaliteta i DAP isporuku.':'PRISTEEL coordinates '+(scope||'clearly defined structural-steel packages')+', including material procurement, build-to-print fabrication, quality documentation and DAP delivery.',cta=txt(rdata.concrete_question,1000)||(future?(language==='de'?'Wäre es hilfreich, wenn ich Ihnen eine einseitige Leistungsübersicht zur internen Lieferantenprüfung sende?':language==='bcs'?'Da li bi bilo korisno da Vam pošaljem pregled naših kapaciteta na jednoj stranici za internu provjeru dobavljača?':'Would it be useful if I sent a one-page capability summary for internal supplier review?'):(language==='de'?'Ist ein kurzer Abgleich sinnvoll, ob ein klar abgegrenztes Stahlpaket noch offen ist?':language==='bcs'?'Da li bi kratak razgovor bio koristan kako bismo provjerili da li je jasno odvojen čelični paket još otvoren?':'Would a short fit check be useful to see whether a clearly defined steel package is still open?')),paras=[facts[0],facts[1],capability,cta],close=closing(language);
  const body=[greet,...paras,close,SIGNATURE].filter(Boolean).join('\n\n');
  const htmlBody='<div dir="ltr" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#202124">'+htmlParagraph(greet)+paras.map(htmlParagraph).join('')+'<p style="margin:0">'+esc(close)+'</p>'+SIGNATURE_HTML+'</div>';
  return{language,subject,body,html_body:htmlBody,recipient_kind:kind,tender_reference:ref||null,tender_url:url||null,signature:SIGNATURE,signature_html:SIGNATURE_HTML};
}
export const PRISTEEL_SIGNATURE=SIGNATURE;
export const PRISTEEL_SIGNATURE_HTML=SIGNATURE_HTML;

