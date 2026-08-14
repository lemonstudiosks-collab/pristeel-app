import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL = 'https://isymxqfqzkchbsrbhucf.supabase.co';
const KRPP_ORIGIN = 'https://e-prokurimi.rks-gov.net';
const DEFAULT_INDEX_URL = `${KRPP_ORIGIN}/SPIN_PROD/application/ipn/DocumentManagement/NewPreglediDokumenataFrm.aspx`;
const ACTIONABLE_NOTICE_TYPES = new Set(['B05', 'B54']);
const FPP_RE = /(\d{8}-\d)(?:\s+(.+))?/;

const text = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
const norm = v => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function decodeEntities(v) {
  return String(v || '')
    .replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
function stripTags(v) { return text(decodeEntities(String(v || '').replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' '))); }
function cellsFromRow(rowHtml) { const out=[]; const re=/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi; let m; while((m=re.exec(rowHtml))) out.push(stripTags(m[1])); return out; }
function rowPairs(html) { const out=[]; const re=/<tr\b[^>]*>[\s\S]*?<\/tr>/gi; let m; while((m=re.exec(String(html||'')))) { const c=cellsFromRow(m[0]); if(c.length>=2) out.push(c); } return out; }
function htmlLines(v) { return decodeEntities(String(v||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(?:td|th|tr|div|p|li|h1|h2|h3|h4|span|label)>/gi,'\n').replace(/<[^>]+>/g,' ')).split(/\r?\n/).map(text).filter(Boolean); }
function absoluteUrl(base, href) { try { return new URL(decodeEntities(text(href)), base).href; } catch { return ''; } }
function isoDate(v) { const m=text(v).match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/); return m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : ''; }
function parseAmount(v) { let s=text(v).replace(/[^0-9,.-]/g,''); if(!s) return null; const c=s.lastIndexOf(','), d=s.lastIndexOf('.'); if(c>=0&&d>=0){const dec=c>d?',':'.', thou=dec===','?'.':','; s=s.split(thou).join('').replace(dec,'.');} else if(c>=0){s=s.replace(/,/g,'.');} const n=Number(s); return Number.isFinite(n)?n:null; }
function hasAny(v, terms) { const h=norm(v); return terms.find(t=>h.includes(norm(t)))||''; }

export function authorityPriority(authority) {
  const a=norm(authority);
  if (/korporata energjetike|\bkek\b/.test(a)) return 'A';
  if (/trep(c|ç)a|kostt|iber.?lepenc|infrakos/.test(a)) return 'A';
  if (/trainkos|termokos|ujesjelles|ujësjellës|kompania rajonale e uj|ngrohtor|telekom|mbeturin/.test(a)) return 'B';
  return 'other';
}

export function classifyKrppSteel(row) {
  const corpus=[row?.title,row?.fpp_description,row?.document_type].filter(Boolean).join(' ');
  const n=norm(corpus), reasons=[];
  let raw=0, structure=0;
  const rawStrong=hasAny(n,[
    'llamarine','llamarina','llamara','pllake celiku','pllake metalike','material celiku','material metalik',
    'profile celiku','profile metalike','shufra celiku','shufer celiku','trar celiku','tuba celiku','gypa celiku',
    'tel celiku','tela celiku','litar celiku','zinxhir celiku','sfera celiku','rrjete celiku','armature','rebar',
    'b500','b500c','ipe','ipn','hea','heb','hem','upe','upn','unp','flat bar','angle steel','steel plate','steel sheet'
  ]);
  if(rawStrong){raw+=68;reasons.push(`lëndë e parë: ${rawStrong}`);}
  const rawMedium=hasAny(n,['celik','hekur','metal','profil','shufr','llamar','trar','tub','gyp','zinxhir','litar','bobine','coil']);
  if(rawMedium&&!rawStrong){raw+=28;reasons.push(`sinjal lënde: ${rawMedium}`);}

  const structStrong=hasAny(n,[
    'konstruksion metalik','konstruksione metalike','konstruksion celiku','strukture celiku','struktura celiku',
    'strukture metalike','struktura metalike','steel structure','steelwork','halle metalike','mbulese metalike',
    'platforme metalike','platforma metalike','shkalle metalike','rrethoje metalike','rrethim metalik','grating',
    'shtylle metalike','shtylla metalike','support steel','steel support','frame steel','ura metalike','skela metalike'
  ]);
  if(structStrong){structure+=72;reasons.push(`strukturë: ${structStrong}`);}
  const structProcess=hasAny(n,['fabrikim','fabricim','saldim','welding','galvaniz','montim metal','mbajtese metal','bravari']);
  if(structProcess){structure+=34;reasons.push(`punim struktural: ${structProcess}`);}

  const fpp=text(row?.fpp).replace(/\D/g,'');
  if(/^2711/.test(fpp)){raw+=72;reasons.push(`FPP çelik: ${row.fpp}`);}
  else if(/^(273|4433)/.test(fpp)){raw+=52;reasons.push(`FPP produkt çeliku: ${row.fpp}`);}
  else if(/^28527/.test(fpp) && rawMedium){raw+=45;reasons.push(`FPP artikull metalik: ${row.fpp}`);}
  else if(/^2700/.test(fpp) && rawMedium){raw+=48;reasons.push(`FPP metal bazë: ${row.fpp}`);}
  else if(/^2800/.test(fpp) && rawMedium){raw+=34;reasons.push(`FPP produkt metalik: ${row.fpp}`);}

  if(/^(4421|452231|452232|45223)/.test(fpp)){structure+=48;reasons.push(`FPP strukturë metalike: ${row.fpp}`);}
  else if(/^45000000/.test(fpp) && structStrong){structure+=28;reasons.push(`FPP punë ndërtimi + sinjal metalik: ${row.fpp}`);}
  else if(/^(2851|2852)/.test(fpp) && structure>0){structure+=20;reasons.push(`FPP metal/punim: ${row.fpp}`);}

  if(/\bfurnizim\b/.test(n)&&raw>0) raw+=6;
  if(/\b(pune|punime|montim|vendosja|ndertim)\b/.test(n)&&structure>0) structure+=6;
  const best=Math.min(100,Math.max(raw,structure));
  let category='possible';
  if(best>=65) category=structure>=raw?'steel_structure':'raw_material';
  return {category,relevance_score:best,match_reasons:reasons};
}

function lastMatch(v,re){let out='';const r=new RegExp(re.source,re.flags.includes('g')?re.flags:`${re.flags}g`);let m;while((m=r.exec(String(v||''))))out=m[1]||m[0];return out;}
export function parseNoticeIndexHtml(html, sourceUrl=DEFAULT_INDEX_URL){
  const src=String(html||''), out=[]; const re=/<a\b[^>]*href\s*=\s*["']([^"']*DokumentPodaciFrm\.aspx\?[^"']*\bid=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi; let m;
  while((m=re.exec(src))){
    const title=stripTags(m[2]).replace(/^\d+\.\s*/,''); if(!title||title.length<4) continue;
    const detailUrl=absoluteUrl(sourceUrl,m[1]); const id=(detailUrl.match(/[?&]id=(\d+)/i)||[])[1]; if(!id) continue;
    const ctx=src.slice(Math.max(0,m.index-5000),m.index);
    const date=lastMatch(ctx,/(?:On-line\s+njoftimet\s+)?(\d{1,2}\.\d{1,2}\.\d{4})/gi);
    const type=lastMatch(ctx,/(?:PlusMinus)?(B(?:05|08|10|52|54|58))\b/gi).toUpperCase();
    out.push({detail_id:id,title,notice_type:type||null,published_date:isoDate(date)||null,source_url:sourceUrl,detail_url:detailUrl});
  }
  const map=new Map(); for(const x of out) if(!map.has(x.detail_id)) map.set(x.detail_id,x); return [...map.values()];
}

function fieldFromDetail(html, labels){
  const nl=labels.map(norm); for(const cells of rowPairs(html)){const first=norm(cells[0]); if(nl.some(l=>first===l||first.startsWith(`${l} `))&&text(cells[1])) return text(cells[1]);}
  const lines=htmlLines(html); for(let i=0;i<lines.length;i++){const ln=norm(lines[i]); for(const l of nl){if(ln===l){for(let j=i+1;j<Math.min(lines.length,i+5);j++) if(text(lines[j])) return text(lines[j]);}}} return '';
}
function procurementFromPublication(publicationNo, html){
  const p=text(publicationNo).match(/^20\d{2}\/(.+?)\/B(?:05|08|10|52|54|58)-/i); if(p) return p[1];
  const flat=stripTags(html); const m=flat.match(/\b([A-Z0-9ÇË._/-]+-\d{2}-[A-Z0-9._/-]+-\d-\d-\d)\b/i); return m?m[1]:'';
}
export function parseDetailHtml(html, detailUrl='', fallback={}){
  const authority=fieldFromDetail(html,['Blerësi','Bleresi','Autoriteti kontraktues']);
  const publicationNo=fieldFromDetail(html,['Kodi/Numri','Kodi/numri i dokumentit']);
  const title=fieldFromDetail(html,['Emërtimi','Emertimi','Lënda e prokurimit / grupi'])||text(fallback.title);
  const documentType=fieldFromDetail(html,['Lloji i dokumentit*','Lloji i dokumentit'])||text(fallback.notice_type);
  const contractType=fieldFromDetail(html,['Lloji i kontratës','Lloji i kontrates']).replace(/^\d+\s+/,'');
  const fppRaw=fieldFromDetail(html,['FPP']); const fm=text(fppRaw).match(FPP_RE);
  const procedure=fieldFromDetail(html,['Lloji i procedurës','Lloji i procedures']).replace(/^\d+\s+/,'');
  const estimated=fieldFromDetail(html,['Vlera e parashikuar']);
  const deadline=fieldFromDetail(html,['Afati për dorëzimin e ofertave/kërkesës për pjesëmarrje','Afati per dorezimin e ofertave/kerkeses per pjesemarrje','Data e Mbylljes']);
  const published=fieldFromDetail(html,['Data e njoftimit','Data e publikimit']);
  return {
    procurement_no:procurementFromPublication(publicationNo,html)||null, publication_no:text(publicationNo)||null, authority:text(authority), title:text(title),
    document_type:text(documentType)||null, fpp:fm?fm[1]:null, fpp_description:fm&&fm[2]?text(fm[2]):null, contract_type:text(contractType)||null,
    contract_value_band:null, procedure:text(procedure)||null, estimated_value:parseAmount(estimated), currency:'EUR', deadline:isoDate(deadline)||null,
    published_date:isoDate(published)||fallback.published_date||null, is_retender:/ri[- ]?tender|ritender/i.test(norm(title)), source_url:fallback.source_url||DEFAULT_INDEX_URL,
    detail_url:detailUrl||fallback.detail_url||null, payload:{source:'KRPP',country:'XK',authority_priority:authorityPriority(authority),detail_id:fallback.detail_id||null,index_notice_type:fallback.notice_type||null,source_kind:'krpp_public_monitor'}
  };
}

const HINTS=['celik','çelik','hekur','metal','llamar','profile','shufr','trar','gyp','tub','konstruksion','strukture','strukturë','platform','shkalle','shkallë','rretho','grating','shtyll','fabrikim','saldim','galvan','bravari','armature','b500','ipe','hea','heb'];
export function selectCandidates(notices,{recentDateCount=30,fullScanDateCount=2,maxCandidates=180}={}){
  const dates=[...new Set((notices||[]).map(x=>x.published_date).filter(Boolean))].sort((a,b)=>b.localeCompare(a)).slice(0,recentDateCount);
  const allowed=new Set(dates), full=new Set(dates.slice(0,fullScanDateCount)), out=[];
  for(const x of notices||[]){if(allowed.size&&x.published_date&&!allowed.has(x.published_date))continue;const type=text(x.notice_type).toUpperCase();if(type&&!ACTIONABLE_NOTICE_TYPES.has(type))continue;const direct=classifyKrppSteel({title:x.title});const hint=hasAny(x.title,HINTS);const scan=!!x.published_date&&full.has(x.published_date);if(!scan&&direct.relevance_score<20&&!hint)continue;out.push({...x,candidate_score:Math.max(direct.relevance_score,hint?25:0,scan?15:0),candidate_full_scan:scan});}
  return out.sort((a,b)=>Number(b.candidate_full_scan)-Number(a.candidate_full_scan)||b.candidate_score-a.candidate_score).slice(0,maxCandidates);
}
function sourceKey(row){return text(row.publication_no)||`KRPP:${text(row.procurement_no)}:${createHash('sha1').update(norm(row.title)).digest('hex').slice(0,14)}`;}
export function prepareRelevantRows(rows,seenAt=new Date().toISOString(),minScore=35){return(rows||[]).map(r=>({...r,source_key:sourceKey(r),...classifyKrppSteel(r),last_seen_at:seenAt,updated_at:seenAt})).filter(r=>r.relevance_score>=minScore);}

async function getHtml(url,{timeoutMs=20000,referer=KRPP_ORIGIN}={}){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 AppleWebKit/537.36 Chrome/151 Safari/537.36','Accept-Language':'sq-AL,sq;q=0.9,en;q=0.7',Referer:referer},signal:c.signal,redirect:'follow'});const body=await r.text();if(!r.ok)throw new Error(`KRPP HTTP ${r.status}`);return body;}finally{clearTimeout(t);}}
async function mapLimit(items,limit,worker){const out=new Array(items.length);let cur=0;async function run(){while(true){const i=cur++;if(i>=items.length)return;try{out[i]=await worker(items[i]);}catch(e){out[i]={__error:String(e?.message||e),__item:items[i]};}}}await Promise.all(Array.from({length:Math.max(1,Math.min(limit,items.length||1))},run));return out;}
async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){const r=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await r.text();if(!r.ok)throw new Error(`${method} ${path} failed: HTTP ${r.status} ${raw.slice(0,500)}`);return raw?JSON.parse(raw):[];}
async function upsert(access,rows){if(!rows.length)return;const body=rows.map(r=>({source_key:r.source_key,procurement_no:r.procurement_no,publication_no:r.publication_no,authority:r.authority,title:r.title,document_type:r.document_type,fpp:r.fpp,fpp_description:r.fpp_description,contract_type:r.contract_type,contract_value_band:r.contract_value_band,procedure:r.procedure,estimated_value:r.estimated_value,currency:r.currency||'EUR',deadline:r.deadline,published_date:r.published_date,is_retender:!!r.is_retender,category:r.category,relevance_score:r.relevance_score,match_reasons:r.match_reasons||[],source_url:r.source_url,detail_url:r.detail_url,payload:r.payload||{},last_seen_at:r.last_seen_at,updated_at:r.updated_at}));await rest({...access,path:'kek_tender_watch?on_conflict=source_key',method:'POST',body,prefer:'resolution=merge-duplicates,return=minimal'});}
async function writeSummary(s){await mkdir('tmp',{recursive:true});await writeFile('tmp/krpp-public-steel-sync.json',JSON.stringify(s,null,2));}

export async function runKrppPublicSteelSync({mode=process.env.SYNC_MODE||'preview',sourceUrl=process.env.KRPP_PUBLIC_INDEX_URL||DEFAULT_INDEX_URL,minScore=Number(process.env.KRPP_PUBLIC_MIN_SCORE||35),recentDateCount=Number(process.env.KRPP_PUBLIC_RECENT_DATE_COUNT||30),fullScanDateCount=Number(process.env.KRPP_PUBLIC_FULL_SCAN_DATES||2),maxCandidates=Number(process.env.KRPP_PUBLIC_MAX_CANDIDATES||180),detailConcurrency=Number(process.env.KRPP_PUBLIC_DETAIL_CONCURRENCY||5),supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||''}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const indexHtml=await getHtml(sourceUrl); const notices=parseNoticeIndexHtml(indexHtml,sourceUrl); if(!notices.length)throw new Error('KRPP public index returned zero notice links.');
  const candidates=selectCandidates(notices,{recentDateCount,fullScanDateCount,maxCandidates});
  const results=await mapLimit(candidates,detailConcurrency,async x=>parseDetailHtml(await getHtml(x.detail_url,{referer:sourceUrl}),x.detail_url,x));
  const failures=results.filter(x=>x&&x.__error), rows=results.filter(x=>x&&!x.__error&&x.authority&&x.title);
  if(candidates.length&&failures.length===candidates.length)throw new Error(`All ${candidates.length} KRPP detail requests failed.`);
  const relevant=prepareRelevantRows(rows,new Date().toISOString(),minScore); let authMode='not_needed';
  if(mode==='apply'&&relevant.length){const access=apiKey?{supabaseUrl,apiKey,bearerToken:apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});authMode=access.authMode;await upsert(access,relevant);}
  const byPriority=relevant.reduce((a,r)=>(a[r.payload?.authority_priority||'other']=(a[r.payload?.authority_priority||'other']||0)+1,a),{});
  const summary={mode,auth_mode:authMode,source:'KRPP',notice_links:notices.length,index_candidates:candidates.length,detail_failures:failures.length,relevant_rows:relevant.length,minimum_score:minScore,priority:byPriority,tenders:relevant.map(r=>({procurement_no:r.procurement_no,authority:r.authority,authority_priority:r.payload?.authority_priority,title:r.title,fpp:r.fpp,category:r.category,relevance_score:r.relevance_score,published_date:r.published_date,deadline:r.deadline,match_reasons:r.match_reasons}))};
  await writeSummary(summary); console.log(`KRPP public steel sync ${mode}: notices=${notices.length}, candidates=${candidates.length}, relevant=${relevant.length}.`); return summary;
}

const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct){runKrppPublicSteelSync().catch(async e=>{const s={error:String(e?.message||e),mode:process.env.SYNC_MODE||'preview'};try{await writeSummary(s);}catch{}console.error(s.error);process.exit(1);});}
