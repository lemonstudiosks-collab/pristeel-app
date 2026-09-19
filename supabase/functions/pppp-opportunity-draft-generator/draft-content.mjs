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
const SIGNATURE_HTML=`<div style="margin-top:14px;font-family:Arial,sans-serif;color:#202124;line-height:1.45"><div>Arianit Vllahiu</div><div>Head of Business Development</div><div>+383 (0) 44 244 699</div><div><a href="mailto:arianit.vllahiu@prissteel.com">arianit.vllahiu@prissteel.com</a></div><div><a href="https://www.prissteel.com/">www.prissteel.com</a></div><div style="margin-top:8px"><img src="${PRISTEEL_LOGO_URL}" width="200" height="50" alt="PRISTEEL" style="display:block;border:0;outline:none;text-decoration:none;width:200px;height:50px"></div></div>`;

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
  const name=txt(recipient?.name,180).replace(/\s+/g,' '),co=txt(company,300);
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
function shortProject(v){const s=txt(v,180).replace(/\s+/g,' ');return s.length>92?s.slice(0,89).replace(/\s+\S*$/,'')+'…':s;}
function subjectFor(language,role,title){
  const suffix=title?' – '+shortProject(title):'';
  if(language==='de')return (role==='producer'?'Zusätzliche Fertigungskapazität':role==='consortium'?'Stahlbeschaffung & Fertigung':'Stahlbau & Fertigung')+suffix+' | PRISTEEL';
  if(language==='bcs')return (role==='producer'?'Dodatni kapacitet za čelične konstrukcije':role==='consortium'?'Nabavka i proizvodnja čeličnih komponenti':'Čelične konstrukcije i proizvodnja')+suffix+' | PRISTEEL';
  return (role==='producer'?'Additional steel fabrication capacity':role==='consortium'?'Steel supply & fabrication support':'Steel fabrication support')+suffix+' | PRISTEEL';
}
function roleParagraphs(language,role,title){
  if(language==='de'){
    if(role==='producer')return[
      'im Zusammenhang mit dem Projekt „'+title+'“ möchte ich Ihnen PRISTEEL als mögliche zusätzliche Fertigungskapazität für Stahlkonstruktionen und Stahlkomponenten vorstellen.',
      'PRISTEEL koordiniert ein zertifiziertes Produktionsnetzwerk und unterstützt Hersteller bei Auslastungsspitzen, engen Terminen, ausgelagerten Baugruppen oder kompletten Build-to-Print-Paketen. Je nach Umfang können wir Materialbeschaffung, Fertigung, Oberflächenschutz, Qualitätsdokumentation, Verpackung und Lieferung übernehmen.',
      'Falls Sie für dieses oder kommende Projekte Teile des Fertigungsumfangs auslagern möchten, prüfen wir gerne Zeichnungen, Stücklisten oder Spezifikationen und erstellen darauf basierend ein technisches und kommerzielles Angebot. Sollte externe Fertigung von einem anderen Kollegen betreut werden, wäre ich Ihnen für eine Weiterleitung an die zuständige Person dankbar.'
    ];
    if(role==='consortium')return[
      'im Zusammenhang mit dem Projekt „'+title+'“ möchte ich Ihnen PRISTEEL als möglichen Partner für projektbezogene Stahlmaterialien und gefertigte Stahlkomponenten vorstellen.',
      'Über unser Produktionsnetzwerk können wir Materialbeschaffung, Build-to-Print-Fertigung, Oberflächenschutz, Qualitätsdokumentation, Verpackung und Lieferung als ein koordiniertes Paket abbilden.',
      'Falls innerhalb Ihres konkreten Leistungsumfangs Stahlmaterialien, gefertigte Komponenten oder externe Fertigung beschafft werden, prüfen wir gerne Zeichnungen, Leistungsverzeichnisse, Stücklisten oder Spezifikationen und erstellen ein technisches und kommerzielles Angebot. Sollte hierfür ein anderes Konsortialmitglied oder ein anderer Kollege zuständig sein, wäre ich für eine Weiterleitung dankbar.'
    ];
    if(role==='gc')return[
      'im Zusammenhang mit dem Projekt „'+title+'“ möchte ich Ihnen PRISTEEL als möglichen Fertigungs- und Lieferpartner für projektspezifische Stahlbaupakete vorstellen.',
      'PRISTEEL koordiniert ein zertifiziertes Produktionsnetzwerk für Build-to-Print-Stahlkonstruktionen und Stahlkomponenten. Je nach Leistungsumfang können wir Materialbeschaffung, Fertigung, Oberflächenschutz, Qualitätsdokumentation, Verpackung und Lieferung als ein abgestimmtes Gesamtpaket übernehmen.',
      'Falls in Ihrem Leistungsumfang für dieses Projekt Stahlbau, gefertigte Stahlkomponenten oder ausgelagerte Fertigungspakete vorgesehen sind, prüfen wir gerne Zeichnungen, Leistungsverzeichnisse, Stücklisten oder Spezifikationen und erstellen darauf basierend ein technisches und kommerzielles Angebot. Sollte dieser Bereich von einem anderen Kollegen betreut werden, wäre ich Ihnen für eine Weiterleitung an den zuständigen Einkauf bzw. das Projektteam dankbar.'
    ];
    return[
      'im Zusammenhang mit dem Projekt „'+title+'“ möchte ich Ihnen PRISTEEL als möglichen Partner für projektbezogene Stahlbau- und Stahlkomponenten vorstellen.',
      'PRISTEEL koordiniert ein zertifiziertes Produktionsnetzwerk für Build-to-Print-Stahlkonstruktionen und Stahlkomponenten. Je nach Projektumfang können wir Materialbeschaffung, Fertigung, Oberflächenschutz, Qualitätsdokumentation, Verpackung und Lieferung koordinieren.',
      'Falls Ihr Leistungsumfang Stahlkonstruktionen, Stahlkomponenten oder externe Fertigung umfasst, prüfen wir gerne Zeichnungen, Leistungsverzeichnisse, Stücklisten oder Spezifikationen und erstellen ein technisches und kommerzielles Angebot. Sollte dieser Bereich von einem anderen Kollegen betreut werden, wäre ich Ihnen für eine Weiterleitung an den zuständigen Einkauf bzw. das Projektteam dankbar.'
    ];
  }
  if(language==='bcs'){
    if(role==='producer')return[
      'u vezi s projektom „'+title+'“, želimo predstaviti PRISTEEL kao mogući dodatni proizvodni kapacitet za čelične konstrukcije i komponente.',
      'PRISTEEL koordinira certificiranu proizvodnu mrežu i podržava proizvođače kada su potrebni dodatni kapaciteti, kratki rokovi, izdvojeni sklopovi ili kompletni build-to-print paketi. Ovisno o opsegu možemo organizirati nabavku materijala, proizvodnju, površinsku zaštitu, dokumentaciju kvalitete, pakiranje i isporuku.',
      'Ako za ovaj ili buduće projekte želite dio proizvodnje povjeriti vanjskom partneru, rado ćemo pregledati nacrte, BOM liste ili specifikacije i pripremiti tehničko-komercijalnu ponudu. Ako je za vanjsku proizvodnju zadužena druga osoba, bili bismo zahvalni na prosljeđivanju poruke.'
    ];
    if(role==='consortium')return[
      'u vezi s projektom „'+title+'“, želimo predstaviti PRISTEEL kao mogućeg partnera za projektnu nabavku čelika i proizvodnju gotovih čeličnih komponenti.',
      'Putem naše proizvodne mreže možemo koordinirati nabavku materijala, build-to-print proizvodnju, površinsku zaštitu, dokumentaciju kvalitete, pakiranje i isporuku kao objedinjeni paket.',
      'Ako se u okviru vašeg konkretnog opsega nabavljaju čelični materijali, gotove komponente ili vanjska proizvodnja, rado ćemo pregledati nacrte, troškovnike/BOM liste ili specifikacije i pripremiti tehničko-komercijalnu ponudu. Ako je za to zadužen drugi član konzorcija ili kolega, bili bismo zahvalni na prosljeđivanju poruke.'
    ];
    if(role==='gc')return[
      'u vezi s projektom „'+title+'“, želimo predstaviti PRISTEEL kao mogućeg partnera za proizvodnju i isporuku projektno specifičnih čeličnih konstrukcija i komponenti.',
      'PRISTEEL koordinira certificiranu proizvodnu mrežu za build-to-print izradu čeličnih konstrukcija i komponenti. Ovisno o opsegu možemo organizirati nabavku materijala, proizvodnju, površinsku zaštitu, dokumentaciju kvalitete, pakiranje i isporuku kao objedinjeni paket.',
      'Ako vaš opseg na ovom projektu uključuje čelične konstrukcije, gotove čelične komponente ili vanjsku proizvodnju, rado ćemo pregledati nacrte, troškovnike/BOM liste ili specifikacije i pripremiti tehničko-komercijalnu ponudu. Ako je za ovo područje zadužena druga osoba, bili bismo zahvalni ako biste poruku proslijedili odgovornom kolegi u nabavci ili projektnom timu.'
    ];
    return[
      'u vezi s projektom „'+title+'“, želimo predstaviti PRISTEEL kao mogućeg partnera za projektnu nabavku i proizvodnju čeličnih konstrukcija i komponenti.',
      'PRISTEEL koordinira certificiranu proizvodnu mrežu za build-to-print izradu čeličnih konstrukcija i komponenti, uključujući nabavku materijala, površinsku zaštitu, dokumentaciju kvalitete, pakiranje i isporuku.',
      'Ako vaš opseg uključuje čelične konstrukcije, čelične komponente ili vanjsku proizvodnju, rado ćemo pregledati nacrte, troškovnike/BOM liste ili specifikacije i pripremiti tehničko-komercijalnu ponudu. Ako je za ovo područje zadužena druga osoba, bili bismo zahvalni na prosljeđivanju poruke odgovornom kolegi.'
    ];
  }
  if(role==='producer')return[
    'With reference to the project “'+title+'”, I would like to introduce PRISTEEL as a potential source of additional steel fabrication capacity.',
    'PRISTEEL coordinates a certified production network and supports manufacturers when projects require overflow capacity, tight schedules, outsourced assemblies or complete build-to-print packages. Depending on the scope, we can cover material procurement, fabrication, surface protection, quality documentation, packing and delivery.',
    'If you need to outsource part of the fabrication scope for this project, or require additional capacity for upcoming projects, we would be pleased to review drawings, BOMs or specifications and prepare a technical-commercial quotation. If external fabrication is handled by another colleague, I would appreciate it if you could forward my message to the responsible person.'
  ];
  if(role==='consortium')return[
    'With reference to the project “'+title+'”, I would like to introduce PRISTEEL as a potential partner for project-specific steel supply and fabricated components.',
    'Through our production network, we can coordinate material procurement, build-to-print fabrication, surface protection, quality documentation, packing and delivery as one package.',
    'If steel materials, fabricated components or external manufacturing are being sourced within your specific awarded scope, we would be pleased to review drawings, BOQs/BOMs or specifications and prepare a technical-commercial quotation. If another consortium member or colleague is responsible for this area, I would appreciate it if you could forward my message accordingly.'
  ];
  if(role==='gc')return[
    'With reference to the project “'+title+'”, I would like to introduce PRISTEEL as a potential fabrication and supply partner for project-specific steel packages.',
    'PRISTEEL coordinates a certified production network for build-to-print steel structures and components. Depending on the scope, we can cover material procurement, fabrication, surface protection, quality documentation, packing and delivery as one coordinated package.',
    'If structural steel, fabricated components or outsourced steel packages form part of your scope on this project, we would be pleased to review drawings, BOQs/BOMs or specifications and prepare a technical-commercial quotation. If this area is handled by another colleague, I would appreciate it if you could forward my message to the responsible procurement or project team.'
  ];
  return[
    'With reference to the project “'+title+'”, I would like to introduce PRISTEEL as a potential partner for project-specific steel supply and fabrication.',
    'PRISTEEL coordinates a certified production network for build-to-print steel structures and components, including material procurement, fabrication, surface protection, quality documentation, packing and delivery.',
    'If your scope includes structural steel, steel components or outsourced fabrication, we would be pleased to review drawings, BOQs/BOMs or specifications and prepare a technical-commercial quotation. If this area is handled by another colleague, I would appreciate it if you could forward my message to the responsible procurement or project team.'
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
