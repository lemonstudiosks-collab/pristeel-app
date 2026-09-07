const txt=(v,max=12000)=>String(v==null?'':v).replace(/\r/g,'').trim().slice(0,max);
const emailDomain=v=>{const e=txt(v,320).toLowerCase(),i=e.lastIndexOf('@');return i>0?e.slice(i+1):'';};
const norm=v=>txt(v,300).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const first=(...xs)=>xs.map(x=>txt(x,1000)).find(Boolean)||'';
const esc=v=>txt(v,12000).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

export const PRISTEEL_LOGO_URL='https://ci3.googleusercontent.com/mail-sig/AIorK4zBbQr6xZC9wHaoIhmL0bKLl8uPOlacg1Q4uZvshbApeKuRiHczkMprJts9P2a3CvsPovpqy2N5ZRba';
const LINKEDIN_URL='https://www.linkedin.com/in/arianit-vllahiu-8a779b3b4/';
const SIGNATURE=[
  'Arianit Vllahiu',
  'Head of Business Development',
  '+383 (0) 44 244 699',
  'arianit.vllahiu@prissteel.com',
  'www.prissteel.com',
  LINKEDIN_URL
].join('\n');
const SIGNATURE_HTML=`<div style="margin-top:14px;font-family:Arial,sans-serif;color:#202124;line-height:1.45"><div>Arianit Vllahiu</div><div>Head of Business Development</div><div>+383 (0) 44 244 699</div><div><a href="mailto:arianit.vllahiu@prissteel.com">arianit.vllahiu@prissteel.com</a></div><div><a href="https://www.prissteel.com/">www.prissteel.com</a></div><div style="margin-top:8px"><img src="${PRISTEEL_LOGO_URL}" width="200" height="50" alt="PRISTEEL" style="display:block;border:0;outline:none;text-decoration:none;width:200px;height:50px"></div><div style="margin-top:6px"><a href="${LINKEDIN_URL}">LinkedIn</a></div></div>`;

function explicitLanguage(v){
  const s=norm(v);
  if(!s)return'';
  if(/^(de|deu|ger)(\b|[-_])|german|deutsch/.test(s))return'de';
  if(/^(sq|alb)(\b|[-_])|alban/.test(s))return'sq';
  if(/^(sr|hr|bs|me|bcs)(\b|[-_])|serb|croat|hrvat|bosn|montenegr/.test(s))return'bcs';
  if(/^(en|eng)(\b|[-_])|english/.test(s))return'en';
  return'';
}
function marketTokens(action,tender,recipient){
  const winner=tender?.winner||{},vals=[
    recipient?.country,recipient?.country_code,action?.country,action?.market,action?.market_country,
    action?.payload?.country,action?.payload?.market,action?.payload?.market_country,
    winner?.country,...(Array.isArray(winner?.countries)?winner.countries:[]),
    ...(Array.isArray(tender?.place_of_performance)?tender.place_of_performance:[]),
    tender?.country,tender?.market
  ];
  return vals.map(norm).filter(Boolean);
}
export function resolveDraftLanguage(action={},tender={},recipient={}){
  for(const v of [recipient?.language,recipient?.preferred_language,recipient?.locale,action?.language,action?.contact_language,action?.payload?.language,action?.payload?.contact_language,tender?.language]){const x=explicitLanguage(v);if(x)return x;}
  const d=emailDomain(recipient?.email||action?.target_email);
  if(/\.(de|at|ch|li)$/.test(d))return'de';
  if(/\.(al|xk)$/.test(d))return'sq';
  if(/\.(rs|hr|ba|me)$/.test(d))return'bcs';
  const tokens=marketTokens(action,tender,recipient).join(' ');
  if(/\b(deu|de|germany|deutschland|aut|at|austria|osterreich|che|ch|switzerland|schweiz|lie|li|liechtenstein)\b/.test(tokens))return'de';
  if(/\b(alb|al|albania|shqiperi|xkx|xk|kosovo)\b/.test(tokens))return'sq';
  if(/\b(srb|rs|serbia|srbija|hrv|hr|croatia|hrvatska|bih|ba|bosnia|mne|me|montenegro)\b/.test(tokens))return'bcs';
  const title=norm(first(action?.tender_title,tender?.title));
  if(/\b(germany|deutschland|austria|osterreich|switzerland|schweiz|liechtenstein)\b/.test(title))return'de';
  if(/\b(albania|kosovo|shqiperi)\b/.test(title))return'sq';
  if(/\b(serbia|croatia|bosnia|montenegro|srbija|hrvatska)\b/.test(title))return'bcs';
  return'en';
}

export function tedReference(tender={}){
  let r=first(tender?.publication_no,tender?.procurement_no,tender?.ted_reference,tender?.notice_id,tender?.payload?.publication_no,tender?.payload?.procurement_no);
  r=r.replace(/^TED[-\s:]*/i,'').trim();
  return r;
}
export function tedUrl(tender={}){return first(tender?.source_url,tender?.detail_url,tender?.payload?.source_url,tender?.payload?.detail_url);}
function greeting(language,company,recipient){
  const name=txt(recipient?.name,180).replace(/\s+/g,' '),co=txt(company,300)||'PRISTEEL partner';
  if(language==='de')return name?`Guten Tag ${name},`:'Sehr geehrte Damen und Herren,';
  if(language==='sq')return name?`Përshëndetje ${name},`:'Përshëndetje,';
  if(language==='bcs')return name?`Poštovani ${name},`:'Poštovani,';
  return name?`Dear ${name},`:`Dear ${co} team,`;
}
function closing(language){return language==='de'?'Mit freundlichen Grüßen':language==='sq'?'Me respekt':language==='bcs'?'Srdačan pozdrav':'Best regards';}
function subjectFor(language,route){
  if(language==='de')return `${route==='TED_GC'?'Stahlbau-Unterstützung für Ihr Projekt':'Zusätzliche Stahlbau-Fertigungskapazität'} | PRISTEEL`;
  if(language==='sq')return `${route==='TED_GC'?'Mbështetje për paketat e çelikut':'Kapacitet shtesë për fabrikim çeliku'} | PRISTEEL`;
  if(language==='bcs')return `${route==='TED_GC'?'Podrška za čelične pakete':'Dodatni kapacitet za čelične konstrukcije'} | PRISTEEL`;
  return `${route==='TED_GC'?'Structural-steel support for your project':'Additional steel fabrication capacity'} | PRISTEEL`;
}
function routeParagraph(language,route){
  const producer=route==='TED_PRODUCER';
  if(language==='de')return producer
    ?'Da Ihr Unternehmen selbst im Stahlbau tätig ist, möchten wir Ihnen PRISTEEL als zusätzliche Fertigungskapazität vorstellen. Wir können bei Auslastungsspitzen, Terminengpässen oder einzelnen Arbeitspaketen mit Fertigung und koordinierter Produktion unterstützen.'
    :'PRISTEEL möchte Ihr Projektteam bei relevanten Stahlbaupaketen unterstützen. Wir koordinieren Fertigung und technische Abwicklung über etablierte Fertigungspartner und können zusätzliche Kapazität für projektbezogene Stahlkonstruktionen bereitstellen.';
  if(language==='sq')return producer
    ?'Meqë kompania juaj është vetë aktive në konstruksione çeliku, dëshirojmë t’ju prezantojmë PRISTEEL si kapacitet shtesë fabrikimi për ngarkesa kulmore, afate të ngushta ose paketa të veçanta pune.'
    :'PRISTEEL dëshiron të mbështesë ekipin tuaj të projektit për paketat relevante të konstruksioneve të çelikut, përmes kapaciteteve shtesë të fabrikimit dhe koordinimit teknik.';
  if(language==='bcs')return producer
    ?'Pošto je vaša kompanija direktno aktivna u čeličnim konstrukcijama, želimo predstaviti PRISTEEL kao dodatni proizvodni kapacitet za vršna opterećenja, kratke rokove ili pojedinačne pakete radova.'
    :'PRISTEEL želi podržati vaš projektni tim na relevantnim paketima čeličnih konstrukcija kroz dodatni proizvodni kapacitet i tehničku koordinaciju.';
  return producer
    ?'As your company is directly active in steel fabrication, we would like to introduce PRISTEEL as additional production capacity for workload peaks, tight schedules or specific work packages.'
    :'PRISTEEL would be interested in supporting your project team on relevant structural-steel packages through additional fabrication capacity and coordinated technical execution.';
}
function capabilityParagraph(language){
  if(language==='de')return 'Unsere Partnerwerke fertigen Stahlkonstruktionen nach EN 1090-2 bis EXC-4. Gerne prüfen wir Zeichnungen oder Leistungsverzeichnisse und geben kurzfristig Rückmeldung, welche Pakete wir unterstützen können.';
  if(language==='sq')return 'Fabrikat partnere me të cilat punojmë prodhojnë konstruksione çeliku sipas EN 1090-2 deri në EXC-4. Mund t’i shqyrtojmë vizatimet ose listat e sasive dhe t’ju kthejmë shpejt vlerësim për paketat që mund t’i mbështesim.';
  if(language==='bcs')return 'Naše partnerske fabrike proizvode čelične konstrukcije prema EN 1090-2 do EXC-4. Rado možemo pregledati nacrte ili troškovnike i brzo potvrditi koje pakete možemo podržati.';
  return 'Our partner factories fabricate structural steel to EN 1090-2 up to EXC-4. We would be glad to review drawings or bills of quantities and quickly confirm which packages we can support.';
}
function cleanProjectTitle(v,ref=''){
  let s=txt(v,1400);
  if(ref)s=s.replace(new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),' ');
  s=s.replace(/\bTED\b(?:\s*[-:#]?\s*\d{5,}-\d{4})?/gi,' ').replace(/\s+/g,' ').replace(/^[\s|:;,.\-–—]+|[\s|:;,.\-–—]+$/g,'').trim();
  return s;
}
function intro(language,title){
  if(!title)return'';
  if(language==='de')return `wir sind auf das Projekt „${title}“ aufmerksam geworden.`;
  if(language==='sq')return `jemi informuar për projektin “${title}”.`;
  if(language==='bcs')return `upoznati smo sa projektom „${title}“.`;
  return `we became aware of the project “${title}”.`;
}
function htmlParagraph(v){return v?`<p style="margin:0 0 14px 0">${esc(v)}</p>`:'';}

export function buildTedDraftContent(action={},tender={},recipient={}){
  const language=resolveDraftLanguage(action,tender,recipient),route=txt(action?.route,80),company=txt(action?.target_company,300),ref=tedReference(tender),url=tedUrl(tender),title=cleanProjectTitle(first(action?.tender_title,tender?.title,action?.payload?.project_title),ref),subject=subjectFor(language,route);
  const greet=greeting(language,company,recipient),introText=intro(language,title),routeText=routeParagraph(language,route),capability=capabilityParagraph(language),close=closing(language);
  const body=[greet,introText,routeText,capability,close,SIGNATURE].filter(Boolean).join('\n\n');
  const htmlBody=`<div dir="ltr" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#202124">${htmlParagraph(greet)}${htmlParagraph(introText)}${htmlParagraph(routeText)}${htmlParagraph(capability)}<p style="margin:0">${esc(close)}</p>${SIGNATURE_HTML}</div>`;
  return{language,subject,body,html_body:htmlBody,tender_reference:ref||null,tender_url:url||null,signature:SIGNATURE,signature_html:SIGNATURE_HTML};
}

export const PRISTEEL_SIGNATURE=SIGNATURE;
export const PRISTEEL_SIGNATURE_HTML=SIGNATURE_HTML;
