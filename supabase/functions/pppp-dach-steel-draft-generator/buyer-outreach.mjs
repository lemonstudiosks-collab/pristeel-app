// Canonical buyer templates. Used only by the Material Trade draft engine.
export const version = 'buyer-outreach-20261006-v1';
export const templates = {
  buyer_outreach_en: {
    subject: 'Steel supply for {{company_name}} | PRISTEEL',
    body: 'Dear {{salutation}},\n\nI am reaching out because {{company_name}} {{activity}}.\n\nPRISTEEL supplies structural steel from qualified European sources, including {{products}}.\n\nDepending on the requirement, we can also provide EN 10204 3.1 documentation, cutting/basic processing and DAP delivery directly to the required location.\n\nIf you are currently purchasing these materials, we would be glad to review an RFQ, material list or upcoming requirement and see whether we can offer a competitive supply option.\n\nBest regards,'
  },
  buyer_outreach_de: {
    subject: 'Stahllieferung für {{company_name}} | PRISTEEL',
    body: 'Guten Tag {{salutation}},\n\nich melde mich bei Ihnen, weil {{company_name}} {{activity}}.\n\nPRISTEEL liefert Baustahl und verwandte Stahlprodukte aus qualifizierten europäischen Bezugsquellen, darunter {{products}}.\n\nJe nach Bedarf können wir außerdem EN 10204 3.1-Dokumentation, Zuschnitt bzw. Grundbearbeitung sowie DAP-Lieferung direkt an den gewünschten Lieferort anbieten.\n\nFalls Sie diese Materialien aktuell einkaufen, können Sie uns gerne eine RFQ, Materialliste oder einen kommenden Bedarf senden. Wir prüfen gerne, ob wir Ihnen eine wettbewerbsfähige Lieferoption anbieten können.\n\nMit freundlichen Grüßen'
  }
};
const profiles = {
  marine: { en: ['is active in shipbuilding, marine fabrication or offshore structures, where steel is used in vessel and structural packages', 'heavy plate, structural sections, beams, hollow sections and project-specific steel products'], de: ['im Schiffbau, in der maritimen Fertigung oder im Offshore-Bereich tätig ist und dafür Stahl für Schiffs- und Tragwerkskomponenten benötigt', 'Grobbleche, Stahlprofile, Träger, Hohlprofile und projektspezifische Stahlprodukte'] },
  fabricator: { en: ['is active in structural steel fabrication and steel construction, where steel forms the basis of fabricated structures', 'beams, hollow sections, plates, channels, angles and other structural sections'], de: ['im Stahlbau und in der Fertigung von Stahlkonstruktionen tätig ist und dafür Stahl für Tragwerke und Bauteile benötigt', 'Träger, Hohlprofile, Bleche, U-Profile, Winkel und weitere Stahlprofile'] },
  industrial: { en: ['is active in industrial manufacturing, where steel products form part of the production supply chain', 'plate, profiles, tubes, sections and steel products with basic processing'], de: ['in der industriellen Fertigung tätig ist und dafür Stahlprodukte in der Produktionslieferkette benötigt', 'Bleche, Profile, Rohre und grundbearbeitete Stahlprodukte'] },
  construction: { en: ['is active in construction or industrial projects requiring structural steel', 'beams, hollow sections, plate and project-specific steel packages'], de: ['Bau- oder Industrieprojekte umsetzt, für die Baustahl benötigt wird', 'Träger, Hohlprofile, Bleche und projektspezifische Stahlpakete'] },
  neutral: { en: ['may have requirements for steel products in its procurement', 'plates, beams, hollow sections and other structural steel products'], de: ['möglicherweise Bedarf an Stahlprodukten in der Beschaffung hat', 'Bleche, Träger, Hohlprofile und weitere Baustahlprodukte'] }
};
export const signatureText = 'Arianit Vllahiu\nHead of Business Development\nPRISTEEL\n+383 (0) 44 244 699\narianit.vllahiu@prissteel.com\nwww.prissteel.com';
export const escapeHtml = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function buyerLanguage(target) { return ['DE','AT','CH'].includes(String(target.country || target.country_code || '').toUpperCase()) ? 'de' : 'en'; }
export function buyerProfile(target) {
  // Classification inputs choose approved prose; raw metadata never reaches copy.
  const raw = target.last_verified_at || target.last_company_analysis_at ? [target.primary_activity,target.buyer_type,target.steel_scope].join(' ').toLowerCase() : '';
  if (/shipbuild|shipyard|marine|offshore|schiffbau|werft/.test(raw)) return 'marine';
  if (/stahlbau|steel fabricat|steel construction|metallbau|structural steel/.test(raw)) return 'fabricator';
  if (/manufactur|maschinenbau|anlagenbau|industrial|oem|production|fabrication/.test(raw)) return 'industrial';
  if (/construction|contractor|\bepc\b|bauunternehmen/.test(raw)) return 'construction';
  return 'neutral';
}
export function renderBuyerOutreach(target, contact = {}, signatureHtml = '') {
  const language = buyerLanguage(target), profile = buyerProfile(target), templateId = 'buyer_outreach_' + language;
  const company = String(target.company_name || '').replace(/[\r\n]+/g,' ').trim().slice(0,180);
  if (!company) throw new Error('buyer_company_name_required');
  const person = String(contact.person || '').replace(/[\r\n]+/g,' ').trim();
  const salutation = person && !/tier|score|aktiviteti|einkauf|procurement team/i.test(person) ? person : language === 'de' ? '' : 'Procurement Team';
  const [activity,products] = profiles[profile][language];
  const values = {company_name:company,salutation,activity,products};
  const merge = source => source.replace(/\{\{(\w+)\}\}/g,(_,key)=>values[key]);
  const subject = merge(templates[templateId].subject), text = merge(templates[templateId].body).replace('Guten Tag ,','Guten Tag,');
  const htmlSig = signatureHtml || '<div>'+signatureText.split('\n').map(escapeHtml).join('<br>')+'</div>';
  const plainSig = signatureHtml ? signatureHtml.replace(/<(?:br\s*\/?|\/div|\/p|\/tr)>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#39;/g,"'").replace(/&quot;/gi,'"').trim() : signatureText;
  return {subject,body:text+'\n\n'+plainSig,plain_body:text+'\n\n'+plainSig,html_body:'<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55">'+text.split('\n\n').map(p=>'<p>'+escapeHtml(p)+'</p>').join('')+htmlSig+'</div>',language,template_id:templateId,template_version:version,profile,offer_model:'material_supply',company_role:'material_buyer',recipient_role:person?'named_contact':'procurement_team',selected_public_facts:[],missing_facts:target.missing_company_facts||[],copy_mode:profile==='neutral'?'general_safe':'evidence_specific',offer_selection_reason:'Approved buyer profile variant',copy_policy_version:version,approach_mode:'material_buyer',personalization_facts:[]};
}
