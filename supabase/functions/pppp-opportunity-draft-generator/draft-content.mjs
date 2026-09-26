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
function subjectFor(language,role,title,offerModel='fabricated_steel_package'){
  const p=shortProject(title);
  if(offerModel==='material_supply'){
    if(language==='de')return 'Projekt '+p+' – Stahlmaterial | PRISTEEL';
    if(language==='bcs')return 'Projekt '+p+' – čelični materijal | PRISTEEL';
    return 'Project '+p+' – steel material | PRISTEEL';
  }
  if(offerModel==='external_production_capacity'){
    if(language==='de')return 'Projekt '+p+' – externe Fertigungskapazität | PRISTEEL';
    if(language==='bcs')return 'Projekt '+p+' – vanjski proizvodni kapacitet | PRISTEEL';
    return 'Project '+p+' – external fabrication capacity | PRISTEEL';
  }
  if(language==='de')return 'Projekt '+p+' – ein Partner für das Stahlpaket | PRISTEEL';
  if(language==='bcs')return 'Projekt '+p+' – jedan partner za čelični paket | PRISTEEL';
  return 'Project '+p+' – one partner for the steel package | PRISTEEL';
}
function readinessData(action,tender){
  const a=action?.payload?.outreach_readiness_v1;
  if(a&&typeof a==='object'&&!Array.isArray(a))return a;
  const t=tender?.outreach_readiness_v1;
  if(t&&typeof t==='object'&&!Array.isArray(t))return t;
  return {};
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
function htmlParagraph(v){return v?'<p style="margin:0 0 14px 0">'+esc(v).replace(/\n/g,'<br>')+'</p>':'';}

function outwardText(v,max=1000){
  const raw=txt(v,max);if(!raw)return'';
  const s=norm(raw);
  const internal=/(pergatit\s+draft|draft\s+vetem|mos\s+e\s+dergo|mos\s+i\s+trajto|verifiko\s+rolin|qasja\s+nuk\s+duhet|do\s+not\s+send|prepare\s+(?:an?\s+)?draft|draft\s+only|internal\s+instruction|human\s+approval|outreach\s+(?:draft|copy|message|instruction))/i;
  return internal.test(s)?'':raw;
}
function projectIntro(language,title){
  if(language==='de')return 'Ich melde mich bezüglich des Projekts „'+title+'“.';
  if(language==='bcs')return 'Javljam Vam se u vezi sa projektom „'+title+'“.';
  return 'I am contacting you regarding “'+title+'”.';
}
function credibilityLine(language,offerModel){
  const network=offerModel==='material_supply'
    ?(language==='de'?'einem etablierten Beschaffungs- und Fertigungsnetzwerk in Südosteuropa':language==='bcs'?'uspostavljenom mrežom dobavljača i proizvođača u Jugoistočnoj Evropi':'an established supply and fabrication network in Southeast Europe')
    :(language==='de'?'einem etablierten Fertigungsnetzwerk in Südosteuropa':language==='bcs'?'uspostavljenom proizvodnom mrežom u Jugoistočnoj Evropi':'an established fabrication network in Southeast Europe');
  if(language==='de')return 'PRISTEEL verbindet erfahrenes Stahlindustrie-Management mit '+network+'. Wo vertraglich erforderlich, kann die Vertragserfüllung durch Bankgarantien der ProCredit Bank abgesichert werden.';
  if(language==='bcs')return 'PRISTEEL kombinuje iskusno upravljanje u industriji čelika sa '+network+'. Kada je ugovorno potrebno, izvršenje obaveza može biti podržano bankarskim garancijama ProCredit Bank.';
  return 'PRISTEEL combines experienced steel-industry management with '+network+'. Where required, contractual performance can be supported by bank guarantees through ProCredit Bank.';
}
function routedOfferCopy(language,offerModel,title,scope=''){
  if(offerModel==='external_production_capacity'){
    const capability=language==='de'
      ?'Wenn zusätzliche Kapazität benötigt wird, kann PRISTEEL klar definierte Fertigungspakete übernehmen und technische Klärung, Build-to-Print-Fertigung, Oberflächenschutz, Qualitätsdokumentation und koordinierte DAP-Lieferung steuern.'
      :language==='bcs'
        ?'Kada je potreban dodatni kapacitet, PRISTEEL može preuzeti jasno definisane proizvodne pakete i voditi tehničko usaglašavanje, proizvodnju prema nacrtima, površinsku zaštitu, dokumentaciju kvaliteta i koordiniranu DAP isporuku.'
        :'When additional capacity is needed, PRISTEEL can take on clearly defined fabrication packages and manage technical clarification, build-to-print fabrication, surface treatment, quality documentation and coordinated DAP delivery.';
    const control=language==='de'?'Sie behalten die Kontrolle über das Projekt; wir übernehmen die Verantwortung für das ausgelagerte Fertigungspaket.':language==='bcs'?'Vi zadržavate kontrolu nad projektom; mi preuzimamo odgovornost za izdvojeni proizvodni paket.':'You retain control of the project; we take responsibility for the outsourced fabrication package.';
    const cta=language==='de'?'Wenn Sie für dieses Projekt ein klar abgegrenztes Paket extern vergeben möchten, senden Sie uns Zeichnungen oder BOM – wir übernehmen ab dort.':language==='bcs'?'Ako za ovaj projekat želite izdvojiti jasno definisan paket vanjskom partneru, pošaljite nam nacrte ili BOM i mi ćemo preuzeti dalje.':'If there is a clearly defined package you would prefer to place externally, send us the drawings or BOM and we will take it from there.';
    return{capability,control,cta};
  }
  if(offerModel==='material_supply'){
    const capability=language==='de'
      ?'PRISTEEL kann die Verantwortung für ein klar definiertes Stahlmaterial-Paket übernehmen – von Beschaffung und Dokumentation über optionale Bearbeitung bis zur koordinierten DAP-Lieferung.'
      :language==='bcs'
        ?'PRISTEEL može preuzeti odgovornost za jasno definisan paket čeličnog materijala – od nabavke i dokumentacije, preko opcionalne obrade, do koordinirane DAP isporuke.'
        :'PRISTEEL can take responsibility for a clearly defined steel-material package — from material sourcing and documentation through optional processing and coordinated DAP delivery.';
    const control=language==='de'?'Sie behalten die Kontrolle über den Einkauf. Wir steuern das Paket von RFQ oder Materialliste bis zur Lieferung.':language==='bcs'?'Vi zadržavate kontrolu nad nabavkom. Mi vodimo paket od RFQ-a ili liste materijala do isporuke.':'You remain in control of purchasing. We manage the package from RFQ or material list through to delivery.';
    const cta=language==='de'?'Wenn noch Materialbedarf offen ist, senden Sie uns Ihre RFQ, BOM oder Materialliste – wir übernehmen ab dort.':language==='bcs'?'Ako još postoji otvorena potreba za materijalom, pošaljite nam RFQ, BOM ili listu materijala i mi ćemo preuzeti dalje.':'If there is still material scope to place, send us the RFQ, BOM or material list and we will take it from there.';
    return{capability,control,cta};
  }
  if(offerModel==='future_supplier_qualification'){
    const capability=language==='de'
      ?'Für künftige Pakete kann PRISTEEL als ein technischer und kaufmännischer Ansprechpartner für klar definierte Stahlumfänge eingebunden werden.'
      :language==='bcs'
        ?'Za buduće pakete PRISTEEL može biti jedna tehnička i komercijalna kontaktna tačka za jasno definisane čelične opsege.'
        :'For future packages, PRISTEEL can act as one technical and commercial point of responsibility for clearly defined steel scopes.';
    const control=language==='de'?'Unser Ziel ist eine klare Schnittstelle: Ihr Team behält die Projektkontrolle, PRISTEEL koordiniert den vereinbarten Stahlumfang.':language==='bcs'?'Cilj je jasna odgovornost: Vaš tim zadržava kontrolu nad projektom, a PRISTEEL koordinira dogovoreni čelični opseg.':'The aim is a clear interface: your team retains project control while PRISTEEL coordinates the agreed steel scope.';
    const cta=language==='de'?'Wer ist bei Ihnen für die Qualifizierung künftiger Partner für Stahlpakete zuständig?':language==='bcs'?'Ko je kod Vas zadužen za kvalifikaciju budućih partnera za čelične pakete?':'Who handles qualification of future partners for steel packages?';
    return{capability,control,cta};
  }
  const capability=language==='de'
    ?'PRISTEEL kann die volle Verantwortung für ein klar definiertes Stahlpaket übernehmen – von Materialbeschaffung und Build-to-Print-Fertigung über Oberflächenschutz und Qualitätsdokumentation bis zur koordinierten DAP-Lieferung – mit einem technischen und kaufmännischen Ansprechpartner.'
    :language==='bcs'
      ?'PRISTEEL može preuzeti punu odgovornost za jasno definisan čelični paket – od nabavke materijala i proizvodnje prema nacrtima, preko površinske zaštite i dokumentacije kvaliteta, do koordinirane DAP isporuke – uz jednu tehničku i komercijalnu kontakt tačku.'
      :'PRISTEEL can take full responsibility for a clearly defined steel package — from material sourcing and build-to-print fabrication to surface treatment, quality documentation and coordinated DAP delivery — with one technical and commercial point of contact.';
  const control=language==='de'?'Sie behalten die Kontrolle über das Projekt. Wir übernehmen die Verantwortung für das Stahlpaket von Zeichnungen oder BOM bis zur Lieferung.':language==='bcs'?'Vi zadržavate kontrolu nad projektom. Mi preuzimamo odgovornost za čelični paket od nacrta ili BOM-a do isporuke.':'You remain in control of the project. We take ownership of the steel package from drawings or BOM through to delivery.';
  const cta=language==='de'?'Wenn es ein Stahlpaket gibt, das Sie lieber bei einem externen Partner platzieren möchten, senden Sie uns Zeichnungen oder BOM – wir übernehmen ab dort.':language==='bcs'?'Ako postoji čelični paket koji biste radije povjerili jednom vanjskom partneru, pošaljite nam nacrte ili BOM i mi ćemo preuzeti dalje.':'If there is a structural or fabricated steel package you would prefer to place with one external partner, send us the drawings or BOM and we will take it from there.';
  return{capability,control,cta};
}

export function buildTedDraftContent(action={},tender={},recipient={}){
  const language=resolveDraftLanguage(action,tender,recipient),route=txt(action?.route,80),role=roleFor(route),company=txt(action?.target_company,300),ref=tedReference(tender),url=tedUrl(tender),title=cleanProjectTitle(first(action?.tender_title,tender?.title,action?.payload?.project_title),ref)||'the referenced project',kind=recipientKind(recipient),motion=txt(action?.outreach_motion||'awarded_project_gc',80),rdata=readinessData(action,tender);
  const future=motion==='future_supplier_qualification'||txt(action?.timing_classification,80)==='future_supplier_qualification';
  let offerModel=future?'future_supplier_qualification':txt(action?.pristeel_offer_model,80);
  if(!offerModel){
    if(route.toUpperCase()==='DIRECT_RAW_MATERIAL')offerModel='material_supply';
    else if(role==='producer')offerModel='external_production_capacity';
    else offerModel='fabricated_steel_package';
  }
  if(route.toUpperCase()==='DIRECT_RAW_MATERIAL'&&offerModel==='fabricated_steel_package')offerModel='material_supply';
  const subject=future
    ?(language==='de'?company+' – Lieferantenqualifizierung Stahl | PRISTEEL':language==='bcs'?company+' – kvalifikacija dobavljača čelika | PRISTEEL':company+' – future steel supplier qualification | PRISTEEL')
    :subjectFor(language,role,title,offerModel);
  const greet=greeting(language,company,recipient);
  const copy=routedOfferCopy(language,offerModel,title,outwardText(rdata.pristeel_scope,1000));
  const paras=[projectIntro(language,title),copy.capability,copy.control,credibilityLine(language,offerModel),outwardText(rdata.concrete_question,1000)||copy.cta];
  const close=closing(language);
  const body=[greet,...paras,close,SIGNATURE].filter(Boolean).join('\n\n');
  const htmlBody='<div dir="ltr" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#202124">'+htmlParagraph(greet)+paras.map(htmlParagraph).join('')+'<p style="margin:0">'+esc(close)+'</p>'+SIGNATURE_HTML+'</div>';
  return{language,subject,body,html_body:htmlBody,recipient_kind:kind,tender_reference:ref||null,tender_url:url||null,offer_model:offerModel,signature:SIGNATURE,signature_html:SIGNATURE_HTML};
}
export const PRISTEEL_SIGNATURE=SIGNATURE;
export const PRISTEEL_SIGNATURE_HTML=SIGNATURE_HTML;

