export const PIPELINE = Object.freeze(['DISCOVERED','VERIFIED','CONTACT FOUND','DRAFT READY','CONTACTED','REPLIED','RFQ RECEIVED','REQUEST TO DRUSEIDT READY','DRUSEIDT QUOTING','OFFER RECEIVED','PRISTEEL OFFER READY','OFFERED','FOLLOW-UP','WON','LOST','ARCHIVED']);
export function blocked(lead,contact={}) { return /\bspie\b|@(?:[\w.-]+\.)?spie\./i.test(JSON.stringify([lead.context,contact])); }
export function contactAllowed(contact) {
 return ['VERIFIED','PUBLISHED','verified','published'].includes(contact.verification_status) && /^https:\/\//.test(contact.source_url||'') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email||'') && !contact.do_not_contact;
}
export function draftMessage(lead,contact,request=false) {
 if (blocked(lead,contact)) throw new Error('SPIE outreach blocked');
 if (!contactAllowed(contact)) throw new Error('Published or verified contact required');
 const ctx=lead.context,analysis=lead.analysis,confirmed=analysis.confirmed||[];
 if ((!analysis.eligible && !(request && ['HIGH','MEDIUM'].includes(analysis.relevance))) || !confirmed.length || !analysis.custom_made?.verified) throw new Error('Concrete technical evidence required');
 if (ctx.closed && !request) throw new Error('Tender closed; outreach requires current project evidence');
 const ref=ctx.reference||ctx.title;
 let subject,opening;
 if(request){
  if(lead.pipeline!=='RFQ RECEIVED'&&lead.pipeline!=='REQUEST TO DRUSEIDT READY')throw new Error('RFQ received required');
  subject='Technical + commercial quotation request | '+ref;
  opening='We have received a customer RFQ relating to '+ctx.title+'.\n\nCustomer information received: '+(lead.rfq.text||'Please review the linked customer RFQ and drawings listed below.')+'\n\nRFQ documents: '+(lead.rfq.attachments||[]).map(x=>x.attachment_name).join(', ')+'.';
 }else if(lead.kind==='award'){
  const names=ctx.winner?.names||[ctx.winner?.name].filter(Boolean);
  if(!names.length)throw new Error('Published winner required');
  subject='Druseidt component quotation | '+ref;
  opening='The published award for '+ctx.title+(ctx.reference?' ('+ctx.reference+')':'')+' identifies '+names.join(' / ')+' as the awarded contractor. The official scope identifies the following relevant positions.';
 }else if(lead.kind==='active'){
  const bidder=(ctx.bidder_evidence||[]).find(x=>x.company_domain===contact.company_domain&&x.source_url&&x.verified===true);
  if(!bidder)throw new Error('Verified bidder evidence required');
  subject='Tender component support | '+ref;
  opening='Regarding your evidenced participation in '+ctx.title+(ctx.reference?' ('+ctx.reference+')':'')+', we have identified the following positions in the official tender scope.';
 }else{
  subject='Electrical component sourcing for '+ctx.company+' | Druseidt';
  opening='Your published company information describes '+ctx.scope+'. We would like to discuss component sourcing for this activity. We have not assumed that any particular project is currently open for procurement.';
 }
 const products=confirmed.filter(x=>x.product!=='Electrical panel manufacturing').map(x=>x.product);
 const families=products.length?products.join('; '):'copper/aluminium components, busbar supports and electrical connection accessories, subject to the actual panel drawings and specifications';
 const custom='In addition to standard products, Paul Druseidt Elektrotechnische Spezialfabrik GmbH & Co. KG, Germany, manufactures customer-specific copper/aluminium components and high-current solutions according to drawings, dimensions, technical specifications and project requirements.';
 const close=request?'Please review the customer requirements and advise a technical and commercial quotation, together with any missing information you require. No delivery, price or commercial terms have been committed.':lead.kind==='direct'?'Could you direct us to the colleague responsible for purchasing or electrical engineering? For any open component packages, we would be pleased to review drawings/specifications and prepare a technical and commercial quotation.':'If these component packages are still open for procurement, we would be pleased to review the relevant drawings/specifications and prepare a technical and commercial quotation.';
 const evidence=lead.kind==='direct'?'Published activity: '+ctx.source_url:'Confirmed scope evidence:\n'+confirmed.map(x=>'- '+x.excerpt+'\n  '+x.source_url).join('\n');
 const plain='Dear '+(contact.name||'Procurement / Engineering Team')+',\n\n'+opening+'\n\n'+evidence+'\n\nPotential Druseidt product families: '+families+'.\n\n'+custom+'\n\nInformation to confirm: '+analysis.missing.join(', ')+'.\n\n'+close+'\n\nBest regards,\nArianit Vllahiu\nPriSteel';
 return {subject,plain};
}
