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
const SIGNATURE_HTML=`<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;border-collapse:collapse;font-family:Arial,sans-serif;color:#1f2937"><tr><td valign="middle" style="padding:0 18px 0 0"><img src="${PRISTEEL_LOGO_URL}" width="182" alt="PRISTEEL" style="display:block;border:0;outline:none;text-decoration:none;width:182px;height:auto"></td><td valign="middle" style="border-left:2px solid #1a73e8;padding:0 0 0 18px"><div style="font-size:17px;line-height:1.25;font-weight:700;color:#1f2937">Arianit Vllahiu</div><div style="font-size:15px;line-height:1.35;color:#1f2937">Head of Business Development</div><div style="margin-top:8px;font-size:14px;line-height:1.5;color:#1a73e8">+383 (0) 44 244 699</div><div style="font-size:14px;line-height:1.5;color:#1f2937">arianit.vllahiu@prissteel.com</div><div style="font-size:14px;line-height:1.5;color:#1f2937">www.prissteel.com</div></td></tr></table>`;

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
function greeting(language,company,recipient){
  const kind=recipientKind(recipient),name=kind==='general'?'':txt(recipient?.name,180).replace(/\s+/g,' '),co=txt(company,300);
  if(language==='de')return name?'Guten Tag '+name+',':'Sehr geehrte Damen und Herren,';
  if(language==='bcs')return name?'Poštovani '+name+',':'Poštovani,';
  return name?'Dear '+name+',':'Dear Sir or Madam,';
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
  const suffix=title?' – '+shortProject(title):'';
  if(language==='de')return (role==='producer'?'Fertigungskapazität':role==='consortium'?'Stahlbau & Fertigung':'Stahlbau & Fertigung')+suffix+' | PRISTEEL';
  if(language==='bcs')return (role==='producer'?'Dodatni kapacitet':role==='consortium'?'Čelik & proizvodnja':'Čelične konstrukcije')+suffix+' | PRISTEEL';
  return (role==='producer'?'Fabrication capacity':role==='consortium'?'Steel supply & fabrication':'Steel fabrication')+suffix+' | PRISTEEL';
}
function roleParagraphs(language,role,title){
  if(language==='de'){
    const common=[
      'Genau dort kann PRISTEEL unterstützen.',
      'Wir übernehmen Build-to-Print-Pakete – von Material und Fertigung bis Oberflächenschutz und Qualitätsdokumentation. Unser Produktionsnetzwerk umfasst nach EN 1090-2 bis EXC4 und ISO 3834-2 zertifizierte Werke für CE-konformen Stahlbau. Lieferung ist DAP oder, projektspezifisch, DDP möglich.'
    ];
    if(role==='producer')return[
      'Bei Projekten wie „'+title+'“ wird zusätzliche Fertigungskapazität oft dann wichtig, wenn Termine enger werden oder interne Kapazitäten bereits gebunden sind.',
      ...common,
      'Wenn Sie ein Paket haben, das Kapazität bindet oder zeitkritisch wird, schicken Sie mir gerne eine Zeichnung oder Stückliste. Ich sage Ihnen kurzfristig, ob wir es technisch und wirtschaftlich sinnvoll übernehmen können. Falls ein anderer Kollege externe Fertigung betreut, freue ich mich über eine Weiterleitung.'
    ];
    if(role==='consortium')return[
      'Bei einem Projekt wie „'+title+'“ kann zusätzlicher Stahlbau schnell zur Kapazitäts- und Terminfrage werden – besonders wenn mehrere Gewerke parallel laufen.',
      ...common,
      'Wenn Stahlmaterialien oder gefertigte Komponenten zu Ihrem Leistungsumfang gehören, schicken Sie mir gerne eine Zeichnung, Stückliste oder ein Paket. Ich sage Ihnen kurzfristig, ob wir sinnvoll unterstützen können. Falls ein anderes Konsortialmitglied zuständig ist, freue ich mich über eine Weiterleitung.'
    ];
    if(role==='gc')return[
      'Bei einem Projekt wie „'+title+'“ kann ein Stahlbaupaket schnell zum Termin- oder Kapazitätsthema werden, wenn interne Ressourcen bereits gebunden sind.',
      ...common,
      'Wenn Sie ein Paket haben, das extern vergeben werden soll oder zeitkritisch wird, schicken Sie mir gerne eine Zeichnung oder Stückliste. Ich sage Ihnen kurzfristig, ob wir es sinnvoll übernehmen können. Falls ein anderer Kollege den Stahlbau betreut, freue ich mich über eine Weiterleitung an Einkauf oder Projektteam.'
    ];
    return[
      'Bei einem Projekt wie „'+title+'“ kann zusätzlicher Stahlbau schnell zur Kapazitäts- und Terminfrage werden.',
      ...common,
      'Wenn Sie ein Paket haben, das extern vergeben werden soll oder zeitkritisch wird, schicken Sie mir gerne eine Zeichnung oder Stückliste. Ich sage Ihnen kurzfristig, ob wir es sinnvoll übernehmen können. Falls ein anderer Kollege zuständig ist, freue ich mich über eine Weiterleitung.'
    ];
  }
  if(language==='bcs'){
    const common=[
      'Tu PRISTEEL može pomoći.',
      'Preuzimamo build-to-print pakete – od materijala i proizvodnje do površinske zaštite i dokumentacije kvalitete. Naša proizvodna mreža uključuje pogone certificirane prema EN 1090-2 do EXC4 i ISO 3834-2 za CE-usaglašene čelične konstrukcije. Isporuka je moguća DAP ili, zavisno od projekta, DDP.'
    ];
    if(role==='producer')return[
      'Kod projekata kao što je „'+title+'“, dodatni proizvodni kapacitet postaje važan kada su rokovi kratki ili su interne kapacitete već zauzete.',
      ...common,
      'Ako imate paket koji opterećuje kapacitet ili postaje vremenski kritičan, pošaljite mi jedan nacrt ili BOM. Brzo ću vam reći možemo li ga tehnički i komercijalno preuzeti. Ako je za vanjsku proizvodnju zadužen drugi kolega, bio bih zahvalan na prosljeđivanju.'
    ];
    if(role==='consortium')return[
      'Kod projekta kao što je „'+title+'“, čelični paketi lako postanu pitanje kapaciteta i rokova kada više radova teče paralelno.',
      ...common,
      'Ako čelični materijali ili gotove komponente ulaze u vaš opseg, pošaljite mi jedan nacrt, BOM ili paket. Brzo ću vam reći možemo li ga smisleno podržati. Ako je zadužen drugi član konzorcija, bio bih zahvalan na prosljeđivanju.'
    ];
    return[
      'Kod projekta kao što je „'+title+'“, čelični paket lako postane pitanje kapaciteta i rokova kada su interne resurse već zauzete.',
      ...common,
      'Ako imate paket koji treba eksterno ugovoriti ili postaje vremenski kritičan, pošaljite mi jedan nacrt ili BOQ/BOM. Brzo ću vam reći možemo li ga preuzeti. Ako je zadužen drugi kolega, bio bih zahvalan na prosljeđivanju.'
    ];
  }
  const common=[
    'That is where PRISTEEL can help.',
    'We take on build-to-print packages – from material sourcing and fabrication to surface treatment and quality documentation. Our production network includes EN 1090-2 certified facilities up to EXC4 and ISO 3834-2 for CE-marked structural steelwork. Delivery can be arranged DAP or, project-specific, DDP.'
  ];
  if(role==='producer')return[
    'On projects like “'+title+'”, additional fabrication capacity becomes valuable when deadlines tighten or internal production is already committed.',
    ...common,
    'If you have a package that is tying up capacity or becoming time-critical, send me one drawing or BOM. I will tell you quickly whether we can take it on technically and competitively. If another colleague handles external fabrication, I would appreciate a referral.'
  ];
  if(role==='consortium')return[
    'On a project like “'+title+'”, steel packages can quickly become a capacity and schedule issue when several scopes are running in parallel.',
    ...common,
    'If steel materials or fabricated components fall within your scope, send me one drawing, BOQ/BOM or package. I will tell you quickly whether we can support it competitively. If another consortium member handles this scope, I would appreciate a referral.'
  ];
  if(role==='gc')return[
    'On a project like “'+title+'”, a steel package can quickly become a capacity or schedule issue when internal resources are already committed.',
    ...common,
    'If you have a package that should be outsourced or is becoming time-critical, send me one drawing or BOQ/BOM. I will tell you quickly whether we can take it on. If another colleague handles the steel package, I would appreciate a referral.'
  ];
  return[
    'On a project like “'+title+'”, additional steelwork can quickly become a capacity and schedule issue.',
    ...common,
    'If you have a package that should be outsourced or is becoming time-critical, send me one drawing or BOQ/BOM. I will tell you quickly whether we can take it on. If another colleague handles this area, I would appreciate a referral.'
  ];
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
function htmlParagraph(v){return v?`<p style="margin:0 0 14px 0">${esc(v)}</p>`:'';}

export function buildTedDraftContent(action={},tender={},recipient={}){
  const language=resolveDraftLanguage(action,tender,recipient),route=txt(action?.route,80),role=roleFor(route),company=txt(action?.target_company,300),ref=tedReference(tender),url=tedUrl(tender),title=cleanProjectTitle(first(action?.tender_title,tender?.title,action?.payload?.project_title),ref)||'the referenced project',kind=recipientKind(recipient),subject=subjectFor(language,role,title);
  const greet=greeting(language,company,recipient),paras=roleParagraphs(language,role,title),close=closing(language);
  const body=[greet,...paras,close,SIGNATURE].filter(Boolean).join('\n\n');
  const htmlBody='<div dir="ltr" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#202124">'+htmlParagraph(greet)+paras.map(htmlParagraph).join('')+'<p style="margin:0">'+esc(close)+'</p>'+SIGNATURE_HTML+'</div>';
  return{language,subject,body,html_body:htmlBody,recipient_kind:kind,tender_reference:ref||null,tender_url:url||null,signature:SIGNATURE,signature_html:SIGNATURE_HTML};
}
export const PRISTEEL_SIGNATURE=SIGNATURE;
export const PRISTEEL_SIGNATURE_HTML=SIGNATURE_HTML;
