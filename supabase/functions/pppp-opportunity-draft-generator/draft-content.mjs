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

function outwardText(v,max=1000){
  const raw=txt(v,max);if(!raw)return'';
  const s=norm(raw);
  const internal=/(pergatit\s+draft|draft\s+vetem|mos\s+e\s+dergo|mos\s+i\s+trajto|verifiko\s+rolin|qasja\s+nuk\s+duhet|do\s+not\s+send|prepare\s+(?:an?\s+)?draft|draft\s+only|internal\s+instruction|human\s+approval|outreach\s+(?:draft|copy|message|instruction))/i;
  return internal.test(s)?'':raw;
}
function publicAwardFacts(language,role,title,company,tender){
  const awardCompany=company||txt(tender?.winner?.name,300)||'the awarded company';
  const authority=txt(tender?.authority,300);
  if(language==='de'){
    const project='Die veröffentlichten Vergabeinformationen betreffen das Projekt „'+title+'“.',companyFact=role==='gc'
      ?awardCompany+' ist in den Vergabeinformationen als Auftragnehmer für diesen Auftrag aufgeführt.'
      :role==='producer'
        ?awardCompany+' ist in den Vergabeinformationen als ausführendes Unternehmen für diesen Auftrag aufgeführt.'
        :awardCompany+' ist in den Vergabeinformationen als beteiligtes Unternehmen für diesen Auftrag aufgeführt.';
    return[project,companyFact||(authority?'Auftraggeber ist '+authority+'.':'')].filter(Boolean);
  }
  if(language==='bcs'){
    const project='Objavljeni podaci o dodjeli odnose se na projekat „'+title+'“.',companyFact=role==='gc'
      ?awardCompany+' je u podacima o dodjeli naveden kao izvođač za ovaj ugovor.'
      :role==='producer'
        ?awardCompany+' je u podacima o dodjeli naveden kao izvođač/proizvođač za ovaj ugovor.'
        :awardCompany+' je u podacima o dodjeli naveden kao učesnik u ovom ugovoru.';
    return[project,companyFact||(authority?'Naručilac je '+authority+'.':'')].filter(Boolean);
  }
  const project='The published award information relates to “'+title+'”.',companyFact=role==='gc'
    ?awardCompany+' is identified in the award information as a contractor for this contract.'
    :role==='producer'
      ?awardCompany+' is identified in the award information as an executing/fabricating company for this contract.'
      :awardCompany+' is identified in the award information as a participant in this contract.';
  return[project,companyFact||(authority?'The contracting authority is '+authority+'.':'')].filter(Boolean);
}
function outboundFacts(language,role,title,company,action,tender,rdata){
  const verified=[rdata?.scope_evidence,rdata?.project_fact].map(x=>outwardText(x,1000)).filter(Boolean),fallback=publicAwardFacts(language,role,title,company,tender),out=[];
  for(const fact of [...verified,...fallback])if(fact&&!out.includes(fact))out.push(fact);
  return out.slice(0,2);
}

function credibilityLine(language,offerModel){
  const network=offerModel==='material_supply'?'steel supply and fabrication network':'fabrication network';
  if(language==='de')return offerModel==='material_supply'
    ?'PRISTEEL verbindet erfahrenes Stahlindustrie-Management mit einem etablierten Beschaffungs- und Fertigungsnetzwerk in Südosteuropa. Wo erforderlich, kann die Vertragserfüllung durch Bankgarantien der ProCredit Bank abgesichert werden.'
    :'PRISTEEL verbindet erfahrenes Stahlindustrie-Management mit einem etablierten Fertigungsnetzwerk in Südosteuropa. Wo erforderlich, kann die Vertragserfüllung durch Bankgarantien der ProCredit Bank abgesichert werden.';
  if(language==='bcs')return offerModel==='material_supply'
    ?'PRISTEEL kombinuje iskusno upravljanje u industriji čelika sa etabliranom mrežom dobavljača i proizvodnih partnera u Jugoistočnoj Evropi. Kada je potrebno, ugovorno izvršenje može biti podržano bankarskim garancijama preko ProCredit Bank.'
    :'PRISTEEL kombinuje iskusno upravljanje u industriji čelika sa etabliranom mrežom proizvodnih partnera u Jugoistočnoj Evropi. Kada je potrebno, ugovorno izvršenje može biti podržano bankarskim garancijama preko ProCredit Bank.';
  return 'PRISTEEL combines experienced steel-industry management with an established '+network+' in Southeast Europe. Where required, contractual performance can be supported by bank guarantees through ProCredit Bank.';
}
function projectIntro(language,title,rdata){
  const specific=[rdata?.scope_evidence,rdata?.project_fact].map(x=>outwardText(x,1000)).filter(Boolean)[0]||'';
  if(language==='de')return specific?'Ich melde mich bezüglich des Projekts „'+title+'“. '+specific:'Ich melde mich bezüglich des Projekts „'+title+'“.';
  if(language==='bcs')return specific?'Javljam Vam se u vezi sa projektom „'+title+'“. '+specific:'Javljam Vam se u vezi sa projektom „'+title+'“.';
  return specific?'I am contacting you regarding “'+title+'”. '+specific:'I am contacting you regarding “'+title+'”.';
}
function routedOfferCopy(language,offerModel,title,rdata){
  const p=shortProject(title),intro=projectIntro(language,title,rdata),cred=credibilityLine(language,offerModel);
  if(offerModel==='external_production_capacity'){
    if(language==='de')return{
      subject:'Projekt '+p+' – externe Fertigungskapazität | PRISTEEL',
      paras:[intro,'Für klar definierte Fertigungspakete kann PRISTEEL als gesteuerte externe Produktionskapazität eingesetzt werden und technische Klärung, Fertigung, Oberflächenschutz, Qualitätsdokumentation und koordinierte DAP-Lieferung über einen Ansprechpartner übernehmen.','Ihr Team behält die Kontrolle über Projekt und Produktionsprioritäten. Wir übernehmen die Verantwortung für das ausgelagerte Paket bis zur Lieferung.',cred,'Wenn Sie ein klar abgegrenztes Fertigungspaket extern vergeben möchten, senden Sie uns die Zeichnungen oder Stückliste – wir übernehmen die weitere Abwicklung.']
    };
    if(language==='bcs')return{
      subject:'Projekt '+p+' – vanjski proizvodni kapacitet | PRISTEEL',
      paras:[intro,'Za jasno definisane proizvodne pakete PRISTEEL može djelovati kao upravljani vanjski proizvodni kapacitet i koordinirati tehničko usaglašavanje, proizvodnju, površinsku zaštitu, dokumentaciju kvaliteta i DAP isporuku preko jedne kontakt tačke.','Vaš tim zadržava kontrolu nad projektom i proizvodnim prioritetima. Mi preuzimamo odgovornost za izdvojeni paket do isporuke.',cred,'Ako postoji jasno definisan proizvodni paket koji želite povjeriti vanjskom partneru, pošaljite nam nacrte ili listu materijala i mi preuzimamo dalje.']
    };
    return{
      subject:'Project '+p+' – external fabrication capacity | PRISTEEL',
      paras:[intro,'For clearly defined fabrication packages, PRISTEEL can act as managed external production capacity, coordinating technical clarification, fabrication, surface treatment, quality documentation and DAP delivery through one point of contact.','Your team keeps control of the project and production priorities. We take ownership of the outsourced package through to delivery.',cred,'If there is a clearly defined fabrication package you would prefer to place externally, send us the drawings or BOM and we will take it from there.']
    };
  }
  if(offerModel==='material_supply'){
    if(language==='de')return{
      subject:'Projekt '+p+' – Stahlmaterialpaket | PRISTEEL',
      paras:[intro,'PRISTEEL kann die Verantwortung für ein klar definiertes Stahlmaterialpaket übernehmen – von Beschaffung und technischer/kaufmännischer Koordination über Dokumentation und optionale Bearbeitung bis zur koordinierten DAP-Lieferung – mit einem Ansprechpartner.','Sie behalten die Kontrolle über den Einkauf. Wir steuern das Paket von RFQ bzw. Materialliste bis zur Lieferung.',cred,'Senden Sie uns die RFQ, Materialliste oder Stückliste und den Lieferort – wir übernehmen die weitere Abwicklung.']
    };
    if(language==='bcs')return{
      subject:'Projekt '+p+' – paket čeličnog materijala | PRISTEEL',
      paras:[intro,'PRISTEEL može preuzeti odgovornost za jasno definisan paket čeličnog materijala – od nabavke i tehničko-komercijalne koordinacije, preko dokumentacije i opcionalne obrade, do koordinirane DAP isporuke – preko jedne kontakt tačke.','Vi zadržavate kontrolu nad nabavkom. Mi vodimo paket od RFQ-a ili liste materijala do isporuke.',cred,'Pošaljite nam RFQ, listu materijala ili BOM i mjesto isporuke – mi preuzimamo dalje.']
    };
    return{
      subject:'Project '+p+' – steel material package | PRISTEEL',
      paras:[intro,'PRISTEEL can take responsibility for a clearly defined steel-material package — from sourcing and technical/commercial coordination to documentation, optional processing and coordinated DAP delivery — through one point of contact.','You remain in control of purchasing. We manage the package from RFQ or material list through to delivery.',cred,'Send us the RFQ, material list or BOM and delivery point, and we will take it from there.']
    };
  }
  if(offerModel==='future_supplier_qualification'){
    if(language==='de')return{
      subject:(txt(rdata?.company_name,300)||('Projekt '+p))+' – Lieferantenqualifizierung Stahl | PRISTEEL',
      paras:[intro,'Für künftige Stahlpakete kann PRISTEEL als technischer und kaufmännischer Ansprechpartner für klar definierte Umfänge eingebunden werden.',cred,'Wer ist bei Ihnen für die Qualifizierung künftiger Partner für Stahlpakete zuständig?']
    };
    if(language==='bcs')return{
      subject:(txt(rdata?.company_name,300)||('Projekt '+p))+' – kvalifikacija dobavljača čelika | PRISTEEL',
      paras:[intro,'Za buduće čelične pakete PRISTEEL može biti jedna tehnička i komercijalna kontakt tačka za jasno definisane opsege.',cred,'Ko je kod Vas zadužen za kvalifikaciju budućih partnera za čelične pakete?']
    };
    return{
      subject:'Project '+p+' – future steel partner qualification | PRISTEEL',
      paras:[intro,'For future steel packages, PRISTEEL can act as one technical and commercial point of responsibility for clearly defined scopes.',cred,'Who handles qualification of future partners for steel packages?']
    };
  }
  if(language==='de')return{
    subject:'Projekt '+p+' – ein Partner für das Stahlpaket | PRISTEEL',
    paras:[intro,'PRISTEEL kann die vollständige Verantwortung für ein klar definiertes Stahlpaket übernehmen – von Materialbeschaffung und Build-to-Print-Fertigung über Oberflächenschutz und Qualitätsdokumentation bis zur koordinierten DAP-Lieferung – mit einem technischen und kaufmännischen Ansprechpartner.','Sie behalten die Kontrolle über das Projekt. Wir übernehmen das Stahlpaket von Zeichnungen oder Stückliste bis zur Lieferung.',cred,'Wenn Sie ein konstruktives oder gefertigtes Stahlpaket lieber an einen externen Partner vergeben möchten, senden Sie uns die Zeichnungen oder Stückliste – wir übernehmen die weitere Abwicklung.']
  };
  if(language==='bcs')return{
    subject:'Projekt '+p+' – jedan partner za čelični paket | PRISTEEL',
    paras:[intro,'PRISTEEL može preuzeti punu odgovornost za jasno definisan čelični paket – od nabavke materijala i proizvodnje prema nacrtima do površinske zaštite, dokumentacije kvaliteta i koordinirane DAP isporuke – preko jedne tehničke i komercijalne kontakt tačke.','Vi zadržavate punu kontrolu nad projektom. Mi preuzimamo čelični paket od nacrta ili liste materijala do isporuke.',cred,'Ako postoji konstrukcijski ili proizvodni čelični paket koji želite povjeriti jednom vanjskom partneru, pošaljite nam nacrte ili listu materijala i mi preuzimamo dalje.']
  };
  return{
    subject:'Project '+p+' – one partner for the steel package | PRISTEEL',
    paras:[intro,'PRISTEEL can take full responsibility for a clearly defined steel package — from material sourcing and build-to-print fabrication to surface treatment, quality documentation and coordinated DAP delivery — with one technical and commercial point of contact.','You remain in control of the project. We take ownership of the steel package from drawings or BOM through to delivery.',cred,'If there is a structural or fabricated steel package you would prefer to place with one external partner, send us the drawings or BOM and we will take it from there.']
  };
}

function resolveOfferModel(action,role){
  const motion=txt(action?.outreach_motion,80),route=txt(action?.route,80).toUpperCase(),stored=txt(action?.pristeel_offer_model,80),timing=txt(action?.timing_classification,80);
  if(motion==='future_supplier_qualification'||timing==='future_supplier_qualification'||stored==='future_supplier_qualification')return'future_supplier_qualification';
  if(route==='DIRECT_RAW_MATERIAL'||motion==='material_buyer'||stored==='material_supply')return'material_supply';
  if(role==='producer'||route==='TED_PRODUCER'||motion==='external_production_capacity'||stored==='external_production_capacity')return'external_production_capacity';
  if(stored==='fabricated_steel_package')return'fabricated_steel_package';
  return'fabricated_steel_package';
}

export function buildTedDraftContent(action={},tender={},recipient={}){
  const language=resolveDraftLanguage(action,tender,recipient),route=txt(action?.route,80),role=roleFor(route),company=txt(action?.target_company,300),ref=tedReference(tender),url=tedUrl(tender),title=cleanProjectTitle(first(action?.tender_title,tender?.title,action?.payload?.project_title),ref)||'the referenced project',kind=recipientKind(recipient),motion=txt(action?.outreach_motion||'awarded_project_gc',80),rdata=readinessData(action,tender);
  const offerModel=resolveOfferModel(action,role);
  const copy=routedOfferCopy(language,offerModel,title,{...rdata,company_name:company});
  const greet=greeting(language,company,recipient),close=closing(language),paras=copy.paras.filter(Boolean);
  const body=[greet,...paras,close,SIGNATURE].filter(Boolean).join('\n\n');
  const htmlBody='<div dir="ltr" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#202124">'+htmlParagraph(greet)+paras.map(htmlParagraph).join('')+'<p style="margin:0">'+esc(close)+'</p>'+SIGNATURE_HTML+'</div>';
  return{language,subject:copy.subject,body,html_body:htmlBody,recipient_kind:kind,tender_reference:ref||null,tender_url:url||null,offer_model:offerModel,signature:SIGNATURE,signature_html:SIGNATURE_HTML};
}
export const PRISTEEL_SIGNATURE=SIGNATURE;
export const PRISTEEL_SIGNATURE_HTML=SIGNATURE_HTML;

