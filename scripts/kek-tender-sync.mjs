import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL = 'https://isymxqfqzkchbsrbhucf.supabase.co';
const DEFAULT_KRPP_URL = 'https://e-prokurimi.rks-gov.net/SPIN_PROD/APPLICATION/IPN/Common/SearchFrm.aspx?providerKey=ObjavljeniDokumenti_Idom3.RPN.BL.ObjavljeniDokumentiSearch__sq-AL';
const KEK_AUTHORITY_RE = /KORPORATA\s+ENERGJETIKE\s+E\s+KOSOV(?:E|Ë)S/i;
const KEK_PROCUREMENT_RE = /^KEK-\d{2}-[A-Z0-9./-]+$/i;
const FPP_RE = /^\d{8}-\d$/;

const text = value => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
const norm = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripTags(value) {
  return text(decodeEntities(String(value || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')));
}

function cellsFromRow(rowHtml) {
  const cells = [];
  const re = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let m;
  while ((m = re.exec(rowHtml))) cells.push(stripTags(m[1]));
  return cells;
}

function absoluteUrl(base, href) {
  const raw = decodeEntities(text(href));
  if (!raw || /^javascript:/i.test(raw)) return '';
  try { return new URL(raw, base).href; } catch { return ''; }
}

function detailUrlFromRow(rowHtml, baseUrl) {
  const links = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(rowHtml))) links.push(absoluteUrl(baseUrl, m[1]));
  return links.find(url => /DocumentManagement|DokumentPodaciFrm\.aspx/i.test(url)) || '';
}

function isoDateFromKosovo(value) {
  const m = text(value).match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (!m) return '';
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  return `${m[3]}-${mm}-${dd}`;
}

function dateCells(cells) {
  return cells.map((value, index) => ({ index, value, iso: isoDateFromKosovo(value) })).filter(x => x.iso);
}

function likelyTitle(cells, publicationIndex, fppIndex) {
  if (fppIndex > 0) {
    const before = text(cells[fppIndex - 1]);
    if (before && before.length > 3 && !/^\d+$/.test(before)) return before;
  }
  const start = publicationIndex >= 0 ? publicationIndex + 1 : 0;
  const end = fppIndex > start ? fppIndex : cells.length;
  const candidates = cells.slice(start, end)
    .map((value, offset) => ({ value: text(value), index: start + offset }))
    .filter(x => x.value.length > 4)
    .filter(x => !/njoftim|formular|b0\d|b5\d|dokument/i.test(norm(x.value)))
    .sort((a, b) => b.value.length - a.value.length);
  return candidates[0]?.value || '';
}

export function parseSearchHtml(html, sourceUrl = DEFAULT_KRPP_URL) {
  const rows = [];
  const rowRe = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;
  let match;
  while ((match = rowRe.exec(String(html || '')) ) {
    const rowHtml = match[0];
    const cells = cellsFromRow(rowHtml);
    if (!cells.length) continue;

    const procurementIndex = cells.findIndex(v => KEK_PROCUREMENT_RE.test(text(v)));
    if (procurementIndex < 0) continue;
    const procurementNo = text(cells[procurementIndex]);
    const authorityIndex = cells.findIndex(v => KEK_AUTHORITY_RE.test(v));
    if (authorityIndex < 0) continue;

    const publicationIndex = cells.findIndex(v => /^20\d{2}\/KEK-/i.test(text(v)));
    const publicationNo = publicationIndex >= 0 ? text(cells[publicationIndex]) : '';
    const fppIndex = cells.findIndex(v => FPP_RE.test(text(v)));
    const fpp = fppIndex >= 0 ? text(cells[fppIndex]) : '';
    const title = likelyTitle(cells, publicationIndex, fppIndex);
    if (!title) continue;

    const dates = dateCells(cells);
    const publishedDate = dates.length ? dates[dates.length - 1].iso : '';
    const deadline = dates.length > 1 ? dates[dates.length - 2].iso : '';
    const contractType = cells.find(v => /^(Furnizim|Pun[eë]|Sh[eë]rbime)$/i.test(text(v))) || '';
    const procedure = cells.find(v => /procedur/i.test(norm(v))) || '';
    const contractValueBand = cells.find(v => /vler[eë]\s+(e\s+)?(madhe|mesme|ul[eë]t)/i.test(norm(v))) || '';
    const fppDescription = fppIndex >= 0 && cells[fppIndex + 1] && !/^(Furnizim|Pun[eë]|Sh[eë]rbime)$/i.test(text(cells[fppIndex + 1]))
      ? text(cells[fppIndex + 1])
      : '';
    const detailUrl = detailUrlFromRow(rowHtml, sourceUrl);
    const isRetender = /ri[- ]?tender|ritender/i.test(norm(title)) || cells.some(v => /^po$/i.test(text(v)) && /tender/i.test(norm(cells.join(' '))));

    rows.push({
      procurement_no: procurementNo,
      publication_no: publicationNo || null,
      authority: text(cells[authorityIndex]),
      title,
      document_type: null,
      fpp: fpp || null,
      fpp_description: fppDescription || null,
      contract_type: contractType || null,
      contract_value_band: contractValueBand || null,
      procedure: procedure || null,
      estimated_value: null,
      currency: 'EUR',
      deadline: deadline || null,
      published_date: publishedDate || null,
      is_retender: isRetender,
      source_url: sourceUrl,
      detail_url: detailUrl || null,
      payload: { cells }
    });
  }
  return dedupeRows(rows);
}

function dedupeRows(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const key = sourceKey(row);
    if (!map.has(key)) map.set(key, row);
  }
  return [...map.values()];
}

function hasAny(haystack, terms) {
  const n = norm(haystack);
  return terms.find(term => n.includes(norm(term))) || '';
}

export function classifyTender(row) {
  const corpus = [row?.title, row?.fpp_description, row?.document_type].filter(Boolean).join(' ');
  const n = norm(corpus);
  const reasons = [];
  let raw = 0;
  let structure = 0;

  const rawStrong = hasAny(n, [
    'llamarine', 'llamarina', 'celik', 'steel plate', 'steel sheet', 'plate steel',
    'profile celiku', 'profile metalike', 'trar celiku', 'shufra celiku', 'tuba celiku',
    'coil', 'bobine celiku', 'armature b500', 'b500c', 'ipe', 'hea', 'heb', 'upe', 'upn',
    'flat bar', 'kendore celiku', 'angle steel'
  ]);
  if (rawStrong) { raw += 62; reasons.push(`lëndë e parë: ${rawStrong}`); }

  const rawMedium = hasAny(n, ['llamar', 'profile', 'shufr', 'tub metal', 'trar', 'hekur', 'metal sheet']);
  if (rawMedium && !rawStrong) { raw += 38; reasons.push(`sinjal lënde: ${rawMedium}`); }

  const structStrong = hasAny(n, [
    'konstruksion metalik', 'konstruksione metalike', 'struktura celiku', 'strukture celiku',
    'steel structure', 'platforme metalike', 'platforma metalike', 'shkalle metalike',
    'rrethoje', 'rrethojes', 'grating', 'shtylle metalike', 'shtylla metalike',
    'support steel', 'steel support', 'frame steel', 'ura metalike'
  ]);
  if (structStrong) { structure += 68; reasons.push(`strukturë: ${structStrong}`); }

  const structMedium = hasAny(n, ['fabrikim', 'fabricim', 'saldim', 'welding', 'galvaniz', 'montim metal', 'mbajtese metal']);
  if (structMedium) { structure += 34; reasons.push(`punim struktural: ${structMedium}`); }

  if (/\bfurnizim\b/.test(n) && raw > 0) raw += 7;
  if (/\b(pune|punime|montim|vendosja)\b/.test(n) && structure > 0) structure += 7;

  const fpp = text(row?.fpp).replace(/\D/g, '');
  if (/^(2711|273[0-9]|4433)/.test(fpp)) {
    raw += 48;
    reasons.push(`FPP çelik/profil: ${row.fpp}`);
  } else if (/^(2851|2852|4421|44212|45223)/.test(fpp)) {
    structure += 28;
    reasons.push(`FPP metal/strukturë: ${row.fpp}`);
  }

  const genericSteel = hasAny(n, ['celik', 'steel']);
  if (genericSteel && raw < 35 && structure < 35) {
    raw += 35;
    reasons.push(`sinjal i përgjithshëm çeliku: ${genericSteel}`);
  }

  const best = Math.min(100, Math.max(raw, structure));
  let category = 'possible';
  if (best >= 65) category = structure >= raw ? 'steel_structure' : 'raw_material';
  return { category, relevance_score: best, match_reasons: reasons };
}

export function sourceKey(row) {
  const publication = text(row?.publication_no);
  if (publication) return publication;
  return [text(row?.procurement_no), text(row?.published_date), norm(row?.title)].join('::');
}

export function prepareRelevantRows(rows, seenAt = new Date().toISOString(), minScore = 35) {
  return (rows || []).map(row => {
    const cls = classifyTender(row);
    return {
      ...row,
      source_key: sourceKey(row),
      ...cls,
      last_seen_at: seenAt,
      updated_at: seenAt
    };
  }).filter(row => row.relevance_score >= minScore);
}

async function fetchHtml(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PRISTEEL-KEK-Tender-Monitor/1.0 (+https://prissteel.com)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    if (!response.ok) throw new Error(`KRPP HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function rest({ supabaseUrl, apiKey, bearerToken = apiKey, path, method = 'GET', body, prefer }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} failed: HTTP ${response.status} ${raw.slice(0, 700)}`);
  return raw ? JSON.parse(raw) : [];
}

async function upsertRows(access, rows) {
  if (!rows.length) return;
  const body = rows.map(row => ({
    source_key: row.source_key,
    procurement_no: row.procurement_no,
    publication_no: row.publication_no,
    authority: row.authority,
    title: row.title,
    document_type: row.document_type,
    fpp: row.fpp,
    fpp_description: row.fpp_description,
    contract_type: row.contract_type,
    contract_value_band: row.contract_value_band,
    procedure: row.procedure,
    estimated_value: row.estimated_value,
    currency: row.currency || 'EUR',
    deadline: row.deadline,
    published_date: row.published_date,
    is_retender: !!row.is_retender,
    category: row.category,
    relevance_score: row.relevance_score,
    match_reasons: row.match_reasons || [],
    source_url: row.source_url,
    detail_url: row.detail_url,
    payload: row.payload || {},
    last_seen_at: row.last_seen_at,
    updated_at: row.updated_at
  }));
  await rest({
    ...access,
    path: 'kek_tender_watch?on_conflict=source_key',
    method: 'POST',
    body,
    prefer: 'resolution=merge-duplicates,return=minimal'
  });
}

async function writeSummary(summary) {
  await mkdir('tmp', { recursive: true });
  await writeFile('tmp/kek-tender-sync.json', JSON.stringify(summary, null, 2));
}

export async function runKekTenderSync({
  mode = process.env.SYNC_MODE || 'preview',
  sourceUrl = process.env.KRPP_SEARCH_URL || DEFAULT_KRPP_URL,
  fixtureFile = process.env.KRPP_HTML_FIXTURE || '',
  minScore = Number(process.env.KEK_TENDER_MIN_SCORE || 35),
  allowEmpty = String(process.env.KRPP_ALLOW_EMPTY || '').toLowerCase() === 'true',
  supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  apiKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  bearerToken = ''
} = {}) {
  if (!['preview', 'apply'].includes(mode)) throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) throw new Error('KEK_TENDER_MIN_SCORE must be between 0 and 100.');

  const html = fixtureFile ? await readFile(fixtureFile, 'utf8') : await fetchHtml(sourceUrl);
  const parsed = parseSearchHtml(html, sourceUrl);
  if (!parsed.length && !allowEmpty) throw new Error('KRPP page returned zero KEK rows. Collector stopped without writes.');

  const seenAt = new Date().toISOString();
  const relevant = prepareRelevantRows(parsed, seenAt, minScore);
  let authMode = 'not_needed';

  if (mode === 'apply' && relevant.length) {
    const access = apiKey
      ? { supabaseUrl, apiKey, bearerToken: bearerToken || apiKey, authMode: 'service_key' }
      : await resolveSupabaseWorkflowAccess({ supabaseUrl });
    authMode = access.authMode;
    await upsertRows(access, relevant);
  }

  const summary = {
    mode,
    auth_mode: authMode,
    source_url: sourceUrl,
    parsed_kek_rows: parsed.length,
    relevant_rows: relevant.length,
    minimum_score: minScore,
    categories: relevant.reduce((acc, row) => {
      acc[row.category] = (acc[row.category] || 0) + 1;
      return acc;
    }, {}),
    tenders: relevant.map(row => ({
      procurement_no: row.procurement_no,
      publication_no: row.publication_no,
      title: row.title,
      fpp: row.fpp,
      category: row.category,
      relevance_score: row.relevance_score,
      published_date: row.published_date,
      deadline: row.deadline,
      match_reasons: row.match_reasons
    }))
  };
  await writeSummary(summary);
  console.log(`KEK tender sync ${mode}: ${summary.parsed_kek_rows} KEK rows, ${summary.relevant_rows} steel-relevant.`);
  return summary;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  runKekTenderSync().catch(async error => {
    const summary = { error: String(error?.message || error), mode: process.env.SYNC_MODE || 'preview' };
    try { await writeSummary(summary); } catch {}
    console.error(summary.error);
    process.exit(1);
  });
}
