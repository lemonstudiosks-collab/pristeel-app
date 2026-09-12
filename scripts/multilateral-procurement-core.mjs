import { createHash } from 'node:crypto';

export const SOURCE_REGISTRY = Object.freeze([
  { key:'MCA_KOSOVO', label:'MCA Kosovo', country:'XK', kind:'html', url:'https://www.mcakosovo.org/procurement/' },
  { key:'KCF', label:'KCF', country:'XK', kind:'html', url:'https://kcf-kosovo.org/kcf-procurement/' },
  { key:'RCF', label:'RCF', country:'XK', kind:'html', url:'https://rcf-wb6.org/procurement-in-kosovo/' },
  { key:'EBRD_ECEPP', label:'EBRD', country:'XK', kind:'detail', url:'https://ecepp.ebrd.com/', detailPattern:/\/delta\/viewNotice\.html\?[^"'<>\s]+/gi, maxDetails:50 },
  { key:'WORLD_BANK', label:'World Bank', country:'XK', kind:'world-bank', url:'https://search.worldbank.org/api/procnotices?format=json&rows=100&os=0&country_exact=Kosovo' },
  { key:'UNGM', label:'UNGM', country:'XK', kind:'detail', url:'https://www.ungm.org/Public/Notice', detailPattern:/\/Public\/Notice\/\d+/gi, maxDetails:60 },
  { key:'UNDP_KOSOVO', label:'UNDP Kosovo', country:'XK', kind:'html', url:'https://www.undp.org/kosovo/procurement' },
  { key:'EU_OFFICE_KOSOVO', label:'EU Office Kosovo', country:'XK', kind:'detail', url:'https://www.eeas.europa.eu/eeas/tenders_en?s=113', detailPattern:/\/delegations\/kosovo\/[^"'<>\s]+/gi, maxDetails:40 }
]);

export const clean = v => String(v ?? '').replace(/\s+/g,' ').trim();
export const norm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const uniq = xs => [...new Set(xs.filter(Boolean))];
const sha1 = v => createHash('sha1').update(String(v)).digest('hex');
const decode = s => String(s ?? '').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');

export function htmlToText(html){
  return clean(decode(String(html ?? '').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi,'\n').replace(/<[^>]+>/g,' ')));
}

export function extractLinks(html,base,pattern){
  const out=[]; for(const m of String(html??'').matchAll(/href\s*=\s*["']([^"']+)["']/gi)){
    const href=m[1]; if(pattern){const ok=pattern.test(href);pattern.lastIndex=0;if(!ok)continue;}
    try{out.push(new URL(decode(href),base).toString());}catch{}
  } return uniq(out);
}

const MONTHS={jan:1,january:1,janar:1,feb:2,february:2,shkurt:2,mar:3,march:3,mars:3,apr:4,april:4,prill:4,may:5,maj:5,jun:6,june:6,qershor:6,jul:7,july:7,korrik:7,aug:8,august:8,gusht:8,sep:9,september:9,shtator:9,oct:10,october:10,tetor:10,nov:11,november:11,nentor:11,dec:12,december:12,dhjetor:12};
export function isoDate(v){
  const s=clean(v).replace(/(st|nd|rd|th)\b/gi,''); let m=s.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/); if(m)return`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m=s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/); if(m)return`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  m=s.match(/\b(\d{1,2})[\s-]+([A-Za-zÀ-ž]+)[\s-]+(20\d{2})\b/); if(m){const mo=MONTHS[norm(m[2])]??MONTHS[norm(m[2]).slice(0,3)];if(mo)return`${m[3]}-${String(mo).padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
  m=s.match(/\b([A-Za-zÀ-ž]+)[\s-]+(\d{1,2}),?[\s-]+(20\d{2})\b/); if(m){const mo=MONTHS[norm(m[1])]??MONTHS[norm(m[1]).slice(0,3)];if(mo)return`${m[3]}-${String(mo).padStart(2,'0')}-${m[2].padStart(2,'0')}`;} return'';
}

const FIELDS=['Project Name','EBRD Project ID','Country','Client Name','Client','ECEPP ID','Procurement Exercise Name','Procurement Exercise Description','Type of Procurement','Procurement Method','Business Sector','Notice Type','Publication Date','Issue Date','Closing Date','Beneficiary Institution','Beneficiary countries or territories','Registration level','Description','Email address','Reference number','Reference','Publication reference','Procurement No','Procurement number','Published on','Published','Opening date','Deadline on','Deadline to express your interest','Deadline for submission of proposals','Deadline for applications','Deadline','Identification number','Contract number','Authority','Contracting authority'];
const esc=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function field(body,labels){
  const flat=clean(body).replace(/\s*:\s*\|\s*/g,': '), boundary=uniq([...FIELDS,...labels]).sort((a,b)=>b.length-a.length).map(esc).join('|');
  for(const label of labels){const m=flat.match(new RegExp(`${esc(label)}\\s*[:|–-]\\s*(.{1,260}?)(?=\\s+(?:${boundary})\\s*[:|–-]|$)`,'i'));if(m?.[1])return clean(m[1]);} return'';
}
export function dateAfter(body,labels){const flat=clean(body).replace(/\s*:\s*\|\s*/g,': ');for(const label of labels){const m=flat.match(new RegExp(`${esc(label)}\\s*:?\\s*([^|•]{0,80})`,'i')),d=isoDate(m?.[1]??'');if(d)return d;}return'';}
const firstH1=html=>{const m=String(html??'').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);return m?htmlToText(m[1]):'';};

export function phase(title,body=''){const n=norm(`${title} ${body}`);if(/award notice|contract award|notification of award|shortlist notice/.test(n))return'award';if(/cancell?ation|cancelled|canceled/.test(n))return'cancelled';if(/general procurement notice|\bgpn\b/.test(n))return'pipeline';if(/closed|expired/.test(n)&&!/ongoing|open for response/.test(n))return'closed';return'opportunity';}
export function docType(title,body=''){const n=norm(`${title} ${body}`);if(/prequalification|pre-qualification|pqq/.test(n))return'Prequalification';if(/request for proposals|\brfp\b/.test(n))return'Request for proposals';if(/request for quotation|\brfq\b/.test(n))return'Request for quotation';if(/award notice|contract award/.test(n))return'Award/result';if(/general procurement notice/.test(n))return'General procurement notice';if(/invitation for bidders|invitation for tenders|specific procurement notice|call for tender|tender/.test(n))return'Contract notice';return'Procurement notice';}

const RULES=[['steel_structure',96,['steel structure','steelwork','metal structure','structural steel','metalworking']],['facade_roof_envelope',90,['facade','façade','roof','cladding','building envelope','curtain wall']],['roads_bridges_transport',90,['bridge','road','highway','railway','transport infrastructure']],['energy_electrical',90,['battery energy storage','bess','transmission','substation','power plant','electricity','electrical','energy efficiency','solar','photovoltaic']],['water_wastewater_utilities',88,['wastewater','water supply','sewer','sewerage','water treatment','pipeline']],['construction_civil',88,['construction','reconstruction','rehabilitation','refurbishment','adaptation','civil works','building works','foundation']],['industrial_mechanical',84,['industrial','mechanical','machinery','equipment installation','plant','production line','processing equipment']],['materials_equipment',72,['equipment','materials','supply and installation','goods','appliances','tools','furniture','lighting system']]];
export function classify(record){
  const c=norm([record.title,record.body,record.contract_type,record.document_type].filter(Boolean).join(' '));let sector='other',score=20;const reasons=[];
  for(const [s,n,terms] of RULES){const hits=terms.filter(t=>c.includes(norm(t)));if(hits.length&&n>score){sector=s;score=n;}if(hits.length)reasons.push(`${s}: ${hits.slice(0,3).join(', ')}`);}
  const consulting=/consultancy|consulting services|construction supervision|design and supervision|training|study|assessment|software|portal solution|conference/.test(c)&&!/steel structure|structural steel|metalwork|supply and installation|machinery|equipment|civil works|building works/.test(c);if(consulting){sector='other';score=Math.min(score,25);reasons.push('consultancy/service only');}
  if(record.notice_phase==='pipeline')score=Math.max(score,50);if(['award','cancelled'].includes(record.notice_phase))score=Math.min(score,45);
  const category=sector==='steel_structure'?'steel_structure':sector==='materials_equipment'&&/steel|metal|plate|sheet|profile|beam|pipe|rebar/.test(c)?'raw_material':'possible';
  let mode='Subcontracting/Sales opportunity';if(sector==='steel_structure'||sector==='industrial_mechanical')mode='PriSteel + subcontractor/supplier';else if(['construction_civil','energy_electrical','water_wastewater_utilities','roads_bridges_transport','facade_roof_envelope'].includes(sector))mode='Consortium/JV';else if(sector==='materials_equipment'&&/steel|metal/.test(c))mode='Direct from PriSteel';
  const q={references:/references?|similar contracts?|past experience|track record/.test(c),turnover:/turnover|financial capacity|annual revenue/.test(c),licenses:/licen[cs]e|certification|certificate|iso\s?9001|iso\s?14001|iso\s?45001/.test(c),bid_security:/bid security|tender security|bank guarantee|guarantee/.test(c),experience:/experience|similar works?|similar projects?/.test(c),consortium_allowed:/consortium|joint venture|\bjv\b|association/.test(c)};
  return{category,relevance_score:Math.min(100,score),match_reasons:uniq(reasons),sector,pristeel_fit:score>=85?'high':score>=60?'medium':'low',competition_mode:mode,qualification_signals:q,qualification_review_needed:Object.values(q).some(Boolean),recommended_lane:['award','cancelled','closed'].includes(record.notice_phase)?'reference':'direct_tender'};
}

export function parseHeadingRecords(html,source){
  const raw=String(html??''),hs=[...raw.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)],rows=[];
  for(let i=0;i<hs.length;i++){const title=htmlToText(hs[i][2]);if(!title||title.length<8||/^(procurement|documentation|important|active|closed|practical information|overview)$/i.test(title))continue;const body=htmlToText(raw.slice(hs[i].index+hs[i][0].length,hs[i+1]?.index??raw.length));if(body.length<10)continue;const prev=i?htmlToText(hs[i-1][2]):'';rows.push({title,body,authority:field(body,['Beneficiary Institution','Client Name','Contracting authority','Authority'])||source.label,reference:field(body,['Reference number','Reference','Publication reference','ECEPP ID','Procurement No','Procurement number']),published_date:dateAfter(body,['Publication Date','Published','Opening date'])||(/^Published\b/i.test(prev)?isoDate(prev):'')||null,deadline:dateAfter(body,['Closing Date','Closing date','Deadline on','Deadline to express your interest','Deadline'])||null,notice_phase:phase(title,body),document_type:docType(title,body),detail_url:source.url});}return rows;
}

export function parseEbrd(html,source){const body=htmlToText(html);if(field(body,['Country'])&&!/kosovo/i.test(field(body,['Country'])))return null;const title=field(body,['Procurement Exercise Name'])||firstH1(html)||field(body,['Project Name']);if(!title)return null;const nt=field(body,['Notice Type']);return{title,body,authority:field(body,['Client Name','Client'])||source.label,reference:field(body,['ECEPP ID','Tender/Contract Reference No','EBRD Project ID']),published_date:dateAfter(body,['Publication Date'])||null,deadline:dateAfter(body,['Closing Date'])||null,notice_phase:phase(nt||title,body),document_type:nt||docType(title,body),contract_type:field(body,['Type of Procurement'])||null,procedure:field(body,['Procurement Method'])||null,detail_url:source.url};}
export function parseUngm(html,source){const body=htmlToText(html);if(!/\bkosovo\b/i.test(body))return null;const title=firstH1(html);if(!title)return null;const agency=String(html).match(/<h[2-4]\b[^>]*>\s*(UNDP|UNOPS|UNICEF|UNHCR|FAO|WHO|IOM|UN WOMEN|UNFPA|WFP)\s*<\/h[2-4]>/i)?.[1];return{title,body,authority:clean(agency)||(/\bUNDP\b/i.test(body)?'UNDP':source.label),reference:field(body,['Reference']),published_date:dateAfter(body,['Published on','Published'])||null,deadline:dateAfter(body,['Deadline on','Deadline'])||null,notice_phase:phase(title,body),document_type:docType(title,body),detail_url:source.url};}
export function parseEaas(html,source){const body=htmlToText(html),title=firstH1(html);if(!title||!/\bkosovo\b/i.test(body)||/^tenders$/i.test(title))return null;return{title,body,authority:/european union special representative/i.test(body)?'EU Special Representative in Kosovo':'European Union Office in Kosovo',reference:field(body,['Publication reference','Identification number','Contract number']),published_date:dateAfter(body,['Publication Date','Published'])||isoDate(body.slice(0,500))||null,deadline:dateAfter(body,['Deadline to express your interest','Deadline for submission of proposals','Deadline for applications','Deadline'])||null,notice_phase:/contract award notice/i.test(title)?'award':phase(title,body),document_type:docType(title,body),detail_url:source.url};}

export function normalizeRecord(r,source,seenAt=new Date().toISOString()){
  if(!r?.title)return null;if(['EBRD_ECEPP','UNGM','EU_OFFICE_KOSOVO'].includes(source.key)&&!/\bkosovo\b/i.test(`${r.title} ${r.body}`))return null;const ext=clean(r.reference)||sha1(`${norm(r.authority)}|${norm(r.title)}|${r.published_date??''}|${r.deadline??''}`).slice(0,20),notice_phase=r.notice_phase||phase(r.title,r.body);
  const base={source_key:`${source.key}:${ext}`,procurement_no:clean(r.reference)||ext,publication_no:clean(r.reference)||null,authority:clean(r.authority)||source.label,title:clean(r.title),document_type:r.document_type||'Procurement notice',fpp:null,fpp_description:null,contract_type:clean(r.contract_type)||null,contract_value_band:null,procedure:clean(r.procedure)||null,estimated_value:Number.isFinite(r.estimated_value)?r.estimated_value:null,currency:clean(r.currency)||'EUR',deadline:r.deadline||null,published_date:r.published_date||null,is_retender:/re.?tender|relaunch|re-public/i.test(norm(r.title)),source_url:source.url,detail_url:r.detail_url||source.url,notice_phase,body:clean(r.body),last_seen_at:seenAt,updated_at:seenAt};
  const fit=classify(base),fp=sha1(`${norm(base.title)}|${norm(r.reference)||base.deadline||''}`).slice(0,24);return{...base,category:fit.category,relevance_score:fit.relevance_score,match_reasons:fit.match_reasons,payload:{source:source.key,source_label:source.label,country:source.country,source_kind:source.kind,external_id:ext,notice_phase,sector:fit.sector,pristeel_fit:fit.pristeel_fit,competition_mode:fit.competition_mode,qualification_signals:fit.qualification_signals,qualification_review_needed:fit.qualification_review_needed,recommended_lane:fit.recommended_lane,canonical_fingerprint:fp,provenance:[{source:source.key,url:base.detail_url}]}};
}

export function filterActionable(rows,{minScore=45,recentDays=120,today=new Date()}={}){const d=today.toISOString().slice(0,10),age=iso=>Math.floor((today-new Date(`${iso}T00:00:00Z`))/86400000);return rows.filter(r=>r.relevance_score>=minScore&&(['award','cancelled'].includes(r.payload.notice_phase)?(!r.published_date||age(r.published_date)<=recentDays):r.deadline?r.deadline>=d:r.published_date?age(r.published_date)<=recentDays:true));}
export function dedupe(rows){const m=new Map();for(const r of rows){const fp=r.payload.canonical_fingerprint,e=m.get(fp);if(!e){m.set(fp,r);continue;}const prefer=e.payload.source==='UNDP_KOSOVO'&&r.payload.source==='UNGM',keep=prefer?r:e,other=prefer?e:r;keep.payload.provenance=uniq([...keep.payload.provenance,...other.payload.provenance].map(JSON.stringify)).map(JSON.parse);keep.payload.duplicate_sources=uniq([...(keep.payload.duplicate_sources||[]),other.payload.source]);m.set(fp,keep);}return[...m.values()];}