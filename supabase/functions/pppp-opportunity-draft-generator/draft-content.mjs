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
const GENERAL_LOCAL_PARTS=new Set(['info','office','contact','kontakt','mail','hello','post','admin','sekretariat','service']);
export function recipientKind(recipient={}){
  const purpose=norm(recipient?.purpose),email=txt(recipient?.email,320).toLowerCase(),local=(email.split('@')[0]||'').replace(/\+.*/,'');
  if(purpose==='general'||GENERAL_LOCAL_PARTS.has(local))return'general';
  return'direct';
}
function shortProject(v){const s=txt(v,120).replace(/\s+/g,' ');return s.length>72?s.slice(0,69).replace(/\s+\S*$/,'')+'…':s;}
function subjectFor(language,route,kind,title){
  const p=shortProject(title),general=kind==='general',producer=route==='TED_PRODUCER',suffix=p?' – '+p:'';
  if(language==='de')return (general?(producer?'Ansprechpartner externe Fertigung':'Ansprechpartner Stahlbeschaffung'):(producer?'Zusätzliche Fertigungskapazität':'Stahlbaupaket'))+suffix+' | PRISTEEL';
  if(language==='sq')return (general?(producer?'Kontakti për fabrikim të jashtëm':'Kontakti për prokurim çeliku'):(producer?'Kapacitet shtesë fabrikimi':'Paketa e çelikut'))+suffix+' | PRISTEEL';
  if(language==='bcs')return (general?(producer?'Kontakt za vanjsku proizvodnju':'Kontakt za nabavku čelika'):(producer?'Dodatni proizvodni kapacitet':'Paket čeličnih konstrukcija'))+suffix+' | PRISTEEL';
  return (general?(producer?'Contact for external fabrication':'Steel procurement contact'):(producer?'Additional fabrication capacity':'Structural-steel package'))+suffix+' | PRISTEEL';
}
function routeParagraph(language,route,kind){
  const producer=route==='TED_PRODUCER',general=kind==='general';
  if(general){
    if(language==='de')return producer
      ?'Könnten Sie mir bitte kurz mitteilen, wer bei Ihnen für externe Fertigungspartner bzw. zusätzliche Stahlbaukapazität zuständig ist? Ich würde mich dann direkt mit der zuständigen Person abstimmen.'
      :'Könnten Sie mir bitte kurz mitteilen, wer bei Ihnen für die Beschaffung bzw. Vergabe von Stahlbau- und Stahlkomponenten für dieses Projekt zuständig ist? Ich würde mich dann direkt und kurz mit der zuständigen Person abstimmen.';
    if(language==='sq')return producer
      ?'A mund të më tregoni shkurt kush është përgjegjës për partnerët e jashtëm të fabrikimit ose kapacitetin shtesë të çelikut? Pastaj do të kontaktoja drejtpërdrejt personin përgjegjës.'
      :'A mund të më tregoni shkurt kush është përgjegjës për prokurimin ose kontraktimin e konstruksioneve dhe komponentëve të çelikut për këtë projekt? Pastaj do të kontaktoja drejtpërdrejt personin përgjegjës.';
    if(language==='bcs')return producer
      ?'Možete li mi kratko reći ko je kod vas zadužen za vanjske proizvodne partnere ili dodatni kapacitet za čelične konstrukcije? Zatim bih se direktno javio odgovornoj osobi.'
      :'Možete li mi kratko reći ko je kod vas zadužen za nabavku ili ugovaranje čeličnih konstrukcija i komponenti za ovaj projekt? Zatim bih se direktno javio odgovornoj osobi.';
    return producer
      ?'Could you please point me to the person responsible for external fabrication partners or additional structural-steel capacity? I would then contact that person directly.'
      :'Could you please point me to the person responsible for procurement or subcontracting of structural-steel packages and steel components for this project? I would then contact that person directly.';
  }
  if(language==='de')return producer
    ?'Da Ihr Unternehmen selbst im Stahlbau tätig ist, möchten wir Ihnen PRISTEEL als zusätzliche Fertigungskapazität vorstellen. Wir können bei Auslastungsspitzen, Terminengpässen oder einzelnen Arbeitspaketen mit Fertigung und koordinierter Produktion unterstützen.'
    :'Wir möchten kurz prüfen, ob das Stahlbau- bzw. Stahlkomponentenpaket für dieses Projekt bereits vergeben ist oder noch beschafft wird. PRISTEEL koordiniert projektbezogene Stahlkonstruktionen und kundenspezifische Stahlkomponenten über etablierte Fertigungspartner.';
  if(language==='sq')return producer
    ?'Meqë kompania juaj është vetë aktive në konstruksione çeliku, dëshirojmë t’ju prezantojmë PRISTEEL si kapacitet shtesë fabrikimi për ngarkesa kulmore, afate të ngushta ose paketa të veçanta pune.'
    :'Dëshirojmë vetëm të verifikojmë nëse paketa e konstruksioneve ose komponentëve të çelikut për këtë projekt është tashmë e kontraktuar apo ende në prokurim. PRISTEEL koordinon prodhimin përmes partnerëve të etabliruar të fabrikimit.';
  if(language==='bcs')return producer
    ?'Pošto je vaša kompanija direktno aktivna u čeličnim konstrukcijama, želimo predstaviti PRISTEEL kao dodatni proizvodni kapacitet za vršna opterećenja, kratke rokove ili pojedinačne pakete radova.'
    :'Želimo kratko provjeriti da li je paket čeličnih konstrukcija ili komponenti za ovaj projekt već ugovoren ili je još u nabavci. PRISTEEL koordinira projektnu proizvodnju preko provjerenih proizvodnih partnera.';
  return producer
    ?'As your company is directly active in steel fabrication, we would like to introduce PRISTEEL as additional production capacity for workload peaks, tight schedules or specific work packages.'
    :'We would simply like to check whether the structural-steel or steel-component package for this project has already been awarded or is still being sourced. PRISTEEL coordinates project-specific fabrication through established manufacturing partners.';
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
  const language=resolveDraftLanguage(action,tender,recipient),route=txt(action?.route,80),company=txt(action?.target_company,300),ref=tedReference(tender),url=tedUrl(tender),title=cleanProjectTitle(first(action?.tender_title,tender?.title,action?.payload?.project_title),ref),kind=recipientKind(recipient),subject=subjectFor(language,route,kind,title);
  const greet=greeting(language,company,recipient),introText=intro(language,title),routeText=routeParagraph(language,route,kind),capability=kind==='general'?'':capabilityParagraph(language),close=closing(language);
  const body=[greet,introText,routeText,capability,close,SIGNATURE].filter(Boolean).join('\n\n');
  const htmlBody=`<div dir="ltr" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#202124">${htmlParagraph(greet)}${htmlParagraph(introText)}${htmlParagraph(routeText)}${htmlParagraph(capability)}<p style="margin:0">${esc(close)}</p>${SIGNATURE_HTML}</div>`;
  return{language,subject,body,html_body:htmlBody,recipient_kind:kind,tender_reference:ref||null,tender_url:url||null,signature:SIGNATURE,signature_html:SIGNATURE_HTML};
}

export const PRISTEEL_SIGNATURE=SIGNATURE;
export const PRISTEEL_SIGNATURE_HTML=SIGNATURE_HTML;
