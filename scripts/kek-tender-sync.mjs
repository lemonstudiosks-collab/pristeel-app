import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL = 'https://isymxqfqzkchbsrbhucf.supabase.co';
const KRPP_ORIGIN = 'https://e-prokurimi.rks-gov.net';
const DEFAULT_KRPP_URL = `${KRPP_ORIGIN}/SPIN_PROD/application/ipn/DocumentManagement/NewPreglediDokumenataFrm.aspx`;
const REDUCED_PROVIDER = 'ReducedObjavljeniDokumenti_Idom3.RPN.BL.ReducedObjavljeniDokumentiSearch__sq-AL';
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

function htmlLines(value) {
  const cleaned = decodeEntities(String(value || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:td|th|tr|div|p|li|h1|h2|h3|h4|span|label)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '));
  return cleaned.split(/\r?\n/).map(text).filter(Boolean);
}

function cellsFromRow(rowHtml) {
  const cells = [];
  const re = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let match;
  while ((match = re.exec(rowHtml))) cells.push(stripTags(match[1]));
  return cells;
}

function rowPairs(html) {
  const pairs = [];
  const rowRe = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;
  let match;
  while ((match = rowRe.exec(String(html || '')))) {
    const cells = cellsFromRow(match[0]);
    if (cells.length >= 2) pairs.push(cells);
  }
  return pairs;
}

function absoluteUrl(base, href) {
  const raw = decodeEntities(text(href));
  if (!raw || /^javascript:/i.test(raw)) return '';
  try { return new URL(raw, base).href; } catch { return ''; }
}

function isoDateFromKosovo(value) {
  const match = text(value).match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (!match) return '';
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function dateCells(cells) {
  return cells
    .map((value, index) => ({ index, value, iso: isoDateFromKosovo(value) }))
    .filter(item => item.iso);
}

function parseAmount(value) {
  let raw = text(value).replace(/[^0-9,.-]/g, '');
  if (!raw) return null;
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    raw = raw.split(thousands).join('').replace(decimal, '.');
  } else if (comma >= 0) {
    const decimals = raw.length - comma - 1;
    raw = decimals === 2 ? raw.replace(/,/g, '.').replace(/\.(?=.*\.)/g, '') : raw.replace(/,/g, '');
  } else if (dot >= 0) {
    const decimals = raw.length - dot - 1;
    if (decimals !== 2) raw = raw.replace(/\./g, '');
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function likelyTitle(cells, publicationIndex, fppIndex) {
  if (fppIndex > 0) {
    const beforeFpp = text(cells[fppIndex - 1]);
    if (beforeFpp && beforeFpp.length > 3 && !/^\d+$/.test(beforeFpp)) return beforeFpp;
  }
  const start = publicationIndex >= 0 ? publicationIndex + 1 : 0;
  const end = fppIndex > start ? fppIndex : cells.length;
  const candidates = cells.slice(start, end)
    .map(value => text(value))
    .filter(value => value.length > 4)
    .filter(value => !/njoftim|formular|b0\d|b5\d|dokument/i.test(norm(value)))
    .sort((a, b) => b.length - a.length);
  return candidates[0] || '';
}

function dedupeRows(rows) {
  const unique = new Map();
  for (const row of rows || []) {
    const key = sourceKey(row);
    if (!unique.has(key)) unique.set(key, row);
  }
  return [...unique.values()];
}

export function parseSearchHtml(html, sourceUrl = DEFAULT_KRPP_URL) {
  const rows = [];
  const rowRe = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;
  let match;
  while ((match = rowRe.exec(String(html || '')))) {
    const rowHtml = match[0];
    const cells = cellsFromRow(rowHtml);
    if (!cells.length) continue;
    const procurementIndex = cells.findIndex(value => KEK_PROCUREMENT_RE.test(text(value)));
    if (procurementIndex < 0) continue;
    const authorityIndex = cells.findIndex(value => KEK_AUTHORITY_RE.test(value));
    if (authorityIndex < 0) continue;
    const procurementNo = text(cells[procurementIndex]);
    const publicationIndex = cells.findIndex(value => /^20\d{2}\/KEK-/i.test(text(value)));
    const publicationNo = publicationIndex >= 0 ? text(cells[publicationIndex]) : '';
    const fppIndex = cells.findIndex(value => FPP_RE.test(text(value)));
    const fpp = fppIndex >= 0 ? text(cells[fppIndex]) : '';
    const title = likelyTitle(cells, publicationIndex, fppIndex);
    if (!title) continue;
    const dates = dateCells(cells);
    const publishedDate = dates.length ? dates[dates.length - 1].iso : '';
    const deadline = dates.length > 1 ? dates[dates.length - 2].iso : '';
    const contractType = cells.find(value => /^(?:\d+\s+)?(Furnizim|Pun[eë]|Sh[eë]rbime)$/i.test(text(value))) || '';
    const procedure = cells.find(value => /procedur/i.test(norm(value))) || '';
    const contractValueBand = cells.find(value => /vler[eë]\s+(e\s+)?(madhe|mesme|ul[eë]t)/i.test(norm(value))) || '';
    const fppDescription = fppIndex >= 0 && cells[fppIndex + 1] && !/^(?:\d+\s+)?(Furnizim|Pun[eë]|Sh[eë]rbime)$/i.test(text(cells[fppIndex + 1]))
      ? text(cells[fppIndex + 1])
      : '';
    const detailUrl = (() => {
      const links = [];
      const re = /href\s*=\s*["']([^"']+)["']/gi;
      let linkMatch;
      while ((linkMatch = re.exec(rowHtml))) links.push(absoluteUrl(sourceUrl, linkMatch[1]));
      return links.find(url => /DokumentPodaciFrm\.aspx/i.test(url)) || '';
    })();
    const rowText = norm(cells.join(' '));
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
      is_retender: /ri[- ]?tender|ritender/i.test(norm(title)) || (/\bpo\b/.test(rowText) && /tender/.test(rowText)),
      source_url: sourceUrl,
      detail_url: detailUrl || null,
      payload: { cells, source_kind: 'search_table' }
    });
  }
  return dedupeRows(rows);
}

function lastMatch(value, re) {
  let result = '';
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  let match;
  while ((match = global.exec(String(value || '')))) result = match[1] || match[0];
  return result;
}

export function parseNoticeIndexHtml(html, sourceUrl = DEFAULT_KRPP_URL) {
  const source = String(html || '');
  const notices = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']*DokumentPodaciFrm\.aspx\?[^"']*\bid=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(source))) {
    const title = stripTags(match[2]).replace(/^\d+\.\s*/, '');
    if (!title || title.length < 4) continue;
    const detailUrl = absoluteUrl(sourceUrl, match[1]);
    const idMatch = detailUrl.match(/[?&]id=(\d+)/i);
    if (!idMatch) continue;
    const context = source.slice(Math.max(0, match.index - 5000), match.index);
    const dateText = lastMatch(context, /(?:On-line\s+njoftimet\s+)?(\d{1,2}\.\d{1,2}\.\d{4})/gi);
    const noticeType = lastMatch(context, /(?:PlusMinus)?(B(?:05|08|10|52|54|58))\b/gi);
    notices.push({
      detail_id: idMatch[1],
      title,
      notice_type: noticeType ? noticeType.toUpperCase() : null,
      published_date: isoDateFromKosovo(dateText) || null,
      source_url: sourceUrl,
      detail_url: detailUrl
    });
  }
  const unique = new Map();
  for (const notice of notices) if (!unique.has(notice.detail_id)) unique.set(notice.detail_id, notice);
  return [...unique.values()];
}

function fieldFromDetail(html, labels) {
  const normalizedLabels = labels.map(norm);
  for (const cells of rowPairs(html)) {
    const first = norm(cells[0]);
    const i = normalizedLabels.findIndex(label => first === label || first.startsWith(`${label} `));
    if (i >= 0 && text(cells[1])) return text(cells[1]);
  }
  const lines = htmlLines(html);
  for (let i = 0; i < lines.length; i++) {
    const lineNorm = norm(lines[i]);
    for (const label of normalizedLabels) {
      if (lineNorm === label) {
        for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) if (text(lines[j])) return text(lines[j]);
      }
      if (lineNorm.startsWith(`${label} `)) {
        const words = lines[i].split(/\s+/);
        const labelWords = label.split(/\s+/).length;
        const rest = words.slice(labelWords).join(' ').trim();
        if (rest) return rest;
      }
    }
  }
  return '';
}

function procurementFromPublication(publicationNo, html) {
  const fromPublication = text(publicationNo).match(/(?:^|\/)(KEK-\d{2}-[A-Z0-9./-]+?)(?=\/B(?:05|08|10|52|54|58)-)/i);
  if (fromPublication) return fromPublication[1];
  const fromPage = stripTags(html).match(/\b(KEK-\d{2}-[A-Z0-9.-]+-\d-\d-\d)\b/i);
  return fromPage ? fromPage[1] : '';
}

export function parseDetailHtml(html, detailUrl = '', fallback = {}) {
  const authority = fieldFromDetail(html, ['Blerësi', 'Bleresi', 'Autoriteti kontraktues']);
  const publicationNo = fieldFromDetail(html, ['Kodi/Numri', 'Kodi/numri i dokumentit']);
  const title = fieldFromDetail(html, ['Emërtimi', 'Emertimi', 'Lënda e prokurimit / grupi']) || text(fallback.title);
  const documentType = fieldFromDetail(html, ['Lloji i dokumentit*', 'Lloji i dokumentit']) || text(fallback.notice_type);
  const contractTypeRaw = fieldFromDetail(html, ['Lloji i kontratës', 'Lloji i kontrates']);
  const fppRaw = fieldFromDetail(html, ['FPP']);
  const procedureRaw = fieldFromDetail(html, ['Lloji i procedurës', 'Lloji i procedures']);
  const estimatedRaw = fieldFromDetail(html, ['Vlera e parashikuar']);
  const deadlineRaw = fieldFromDetail(html, ['Afati për dorëzimin e ofertave/kërkesës për pjesëmarrje', 'Afati per dorezimin e ofertave/kerkeses per pjesemarrje', 'Data e Mbylljes']);
  const publishedRaw = fieldFromDetail(html, ['Data e njoftimit', 'Data e publikimit']);
  const fppMatch = text(fppRaw).match(/(\d{8}-\d)(?:\s+(.+))?/);
  const procurementNo = procurementFromPublication(publicationNo, html);
  return {
    procurement_no: procurementNo,
    publication_no: text(publicationNo) || null,
    authority: text(authority),
    title: text(title),
    document_type: text(documentType) || null,
    fpp: fppMatch ? fppMatch[1] : null,
    fpp_description: fppMatch && fppMatch[2] ? text(fppMatch[2]) : null,
    contract_type: text(contractTypeRaw).replace(/^\d+\s+/, '') || null,
    contract_value_band: null,
    procedure: text(procedureRaw).replace(/^\d+\s+/, '') || null,
    estimated_value: parseAmount(estimatedRaw),
    currency: 'EUR',
    deadline: isoDateFromKosovo(deadlineRaw) || null,
    published_date: isoDateFromKosovo(publishedRaw) || fallback.published_date || null,
    is_retender: /ri[- ]?tender|ritender/i.test(norm(title)),
    source_url: fallback.source_url || DEFAULT_KRPP_URL,
    detail_url: detailUrl || fallback.detail_url || null,
    payload: {
      detail_id: fallback.detail_id || null,
      index_notice_type: fallback.notice_type || null,
      source_kind: 'notice_index_detail'
    }
  };
}

function hasAny(haystack, terms) {
  const normalized = norm(haystack);
  return terms.find(term => normalized.includes(norm(term))) || '';
}

export function classifyTender(row) {
  const corpus = [row?.title, row?.fpp_description, row?.document_type].filter(Boolean).join(' ');
  const normalized = norm(corpus);
  const reasons = [];
  let raw = 0;
  let structure = 0;

  const rawStrong = hasAny(normalized, [
    'llamarine', 'llamarina', 'steel plate', 'steel sheet', 'plate steel',
    'profile celiku', 'profile metalike', 'trar celiku', 'shufra celiku', 'tuba celiku',
    'gypa celiku', 'gypa te celikut', 'litar celiku', 'litare celiku', 'zinxhir celiku',
    'coil', 'bobine celiku', 'armature b500', 'b500c', 'ipe', 'hea', 'heb', 'upe', 'upn',
    'flat bar', 'kendore celiku', 'angle steel'
  ]);
  if (rawStrong) {
    raw += 62;
    reasons.push(`lëndë e parë: ${rawStrong}`);
  }

  const rawMedium = hasAny(normalized, ['llamar', 'profile', 'shufr', 'tub metal', 'gyp metal', 'trar', 'hekur', 'metal sheet', 'zinxhir', 'litar']);
  if (rawMedium && !rawStrong) {
    raw += 38;
    reasons.push(`sinjal lënde: ${rawMedium}`);
  }

  const structStrong = hasAny(normalized, [
    'konstruksion metalik', 'konstruksione metalike', 'struktura celiku', 'strukture celiku',
    'steel structure', 'platforme metalike', 'platforma metalike', 'shkalle metalike',
    'rrethoje', 'rrethojes', 'grating', 'shtylle metalike', 'shtylla metalike',
    'support steel', 'steel support', 'frame steel', 'ura metalike'
  ]);
  if (structStrong) {
    structure += 68;
    reasons.push(`strukturë: ${structStrong}`);
  }

  const structMedium = hasAny(normalized, ['fabrikim', 'fabricim', 'saldim', 'welding', 'galvaniz', 'montim metal', 'mbajtese metal']);
  if (structMedium) {
    structure += 34;
    reasons.push(`punim struktural: ${structMedium}`);
  }

  if (/\bfurnizim\b/.test(normalized) && raw > 0) raw += 7;
  if (/\b(pune|punime|montim|vendosja)\b/.test(normalized) && structure > 0) structure += 7;

  const fpp = text(row?.fpp).replace(/\D/g, '');
  if (/^2711/.test(fpp)) {
    raw += 68;
    reasons.push(`FPP çelik: ${row.fpp}`);
  } else if (/^(273[0-9]|4433)/.test(fpp)) {
    raw += 48;
    reasons.push(`FPP profil/produkt çeliku: ${row.fpp}`);
  } else if (/^(4421|44212|45223)/.test(fpp)) {
    structure += 42;
    reasons.push(`FPP strukturë metalike: ${row.fpp}`);
  } else if (/^(2851|2852)/.test(fpp)) {
    structure += 22;
    reasons.push(`FPP metal: ${row.fpp}`);
  }

  const genericSteel = hasAny(normalized, ['celik', 'steel']);
  if (genericSteel && raw < 35 && structure < 35) {
    raw += 35;
    reasons.push(`sinjal i përgjithshëm çeliku: ${genericSteel}`);
  }

  const best = Math.min(100, Math.max(raw, structure));
  let category = 'possible';
  if (best >= 65) category = structure >= raw ? 'steel_structure' : 'raw_material';
  return { category, relevance_score: best, match_reasons: reasons };
}

const DETAIL_CANDIDATE_HINTS = [
  'celik', 'çelik', 'steel', 'metal', 'llamar', 'profile', 'shufr', 'trar', 'gyp', 'tub',
  'konstruksion', 'strukture', 'strukturë', 'platform', 'shkalle', 'shkallë', 'rretho', 'grating',
  'shtyll', 'fabrikim', 'saldim', 'galvan', 'elemente lidhese', 'elemente lidhëse', 'lidhese', 'lidhëse',
  'bulon', 'dado', 'vida', 'anker', 'flanxh', 'zinxhir', 'litar', 'rost', 'kracer', 'bravari'
];

export function selectNoticeCandidates(notices, { recentDateCount = 30, maxCandidates = 120 } = {}) {
  const dates = [];
  for (const notice of notices || []) {
    if (notice.published_date && !dates.includes(notice.published_date)) dates.push(notice.published_date);
    if (dates.length >= recentDateCount) break;
  }
  const allowedDates = new Set(dates);
  const scored = [];
  for (const notice of notices || []) {
    if (allowedDates.size && notice.published_date && !allowedDates.has(notice.published_date)) continue;
    const type = text(notice.notice_type).toUpperCase();
    if (type && !['B05', 'B54'].includes(type)) continue;
    const direct = classifyTender({ title: notice.title });
    const hint = hasAny(notice.title, DETAIL_CANDIDATE_HINTS);
    if (direct.relevance_score < 20 && !hint) continue;
    scored.push({
      ...notice,
      candidate_score: Math.max(direct.relevance_score, hint ? 25 : 0),
      candidate_reason: direct.relevance_score >= 20 ? 'title_classifier' : `title_hint:${hint}`
    });
  }
  return scored.sort((a, b) => b.candidate_score - a.candidate_score).slice(0, maxCandidates);
}

export function sourceKey(row) {
  const publication = text(row?.publication_no);
  if (publication) return publication;
  return [text(row?.procurement_no), text(row?.published_date), norm(row?.title)].join('::');
}

export function prepareRelevantRows(rows, seenAt = new Date().toISOString(), minScore = 35) {
  return (rows || [])
    .map(row => ({
      ...row,
      source_key: sourceKey(row),
      ...classifyTender(row),
      last_seen_at: seenAt,
      updated_at: seenAt
    }))
    .filter(row => row.relevance_score >= minScore);
}

function cookiePairs(setCookie) {
  const values = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return values.map(value => String(value).split(';')[0]).filter(value => /^[^=]+=/.test(value));
}

function createKrppClient() {
  const jar = new Map();
  function absorb(headers) {
    let setCookies = [];
    try { if (typeof headers.getSetCookie === 'function') setCookies = headers.getSetCookie(); } catch {}
    if (!setCookies.length) {
      const single = headers.get('set-cookie');
      if (single) setCookies = [single];
    }
    for (const pair of cookiePairs(setCookies)) {
      const i = pair.indexOf('=');
      if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }
  function cookieHeader() {
    return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
  }
  async function get(url, { timeoutMs = 20000, referer = `${KRPP_ORIGIN}/Home/` } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const cookie = cookieHeader();
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'sq-AL,sq;q=0.9,en;q=0.7',
          Referer: referer,
          ...(cookie ? { Cookie: cookie } : {})
        },
        signal: controller.signal,
        redirect: 'follow'
      });
      absorb(response.headers);
      const body = await response.text();
      if (!response.ok) throw new Error(`KRPP HTTP ${response.status} @ ${url}`);
      return body;
    } finally {
      clearTimeout(timer);
    }
  }
  async function bootstrap() {
    try { await get(`${KRPP_ORIGIN}/Home/`, { timeoutMs: 12000, referer: KRPP_ORIGIN }); } catch {}
  }
  return { get, bootstrap };
}

function reducedSearchUrl() {
  return `${KRPP_ORIGIN}/SPIN_PROD/APPLICATION/IPN/Common/SearchFrm.aspx?guid=${encodeURIComponent(randomUUID())}&providerKey=${encodeURIComponent(REDUCED_PROVIDER)}`;
}

async function fetchIndexWithFallback(client, sourceUrl) {
  const attempts = [];
  const candidates = [sourceUrl];
  if (!/SearchFrm\.aspx/i.test(sourceUrl)) candidates.push(reducedSearchUrl());
  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i];
    try {
      if (i > 0) await client.bootstrap();
      const html = await client.get(url, { timeoutMs: 22000 });
      if (/SearchFrm\.aspx/i.test(url)) {
        const searchRows = parseSearchHtml(html, url);
        if (searchRows.length) return { kind: 'search', url, html, searchRows, attempts };
        attempts.push({ url, error: '200 but zero KEK rows in reduced search result' });
        continue;
      }
      const notices = parseNoticeIndexHtml(html, url);
      if (notices.length) return { kind: 'notice_index', url, html, notices, attempts };
      attempts.push({ url, error: '200 but zero notice links found' });
    } catch (error) {
      attempts.push({ url, error: String(error?.message || error) });
      if (i === 0) await client.bootstrap();
    }
  }
  throw new Error(`KRPP sources unavailable: ${attempts.map(item => item.error).join(' | ')}`);
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function runner() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try { output[i] = await worker(items[i], i); }
      catch (error) { output[i] = { __error: String(error?.message || error), __item: items[i] }; }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, runner));
  return output;
}

async function collectFromNoticeIndex(client, source, options) {
  const candidates = selectNoticeCandidates(source.notices, options);
  if (!candidates.length) return { rows: [], candidates, detailFailures: [] };
  const results = await mapLimit(candidates, options.detailConcurrency, async notice => {
    const html = await client.get(notice.detail_url, { timeoutMs: options.detailTimeoutMs, referer: source.url });
    const row = parseDetailHtml(html, notice.detail_url, notice);
    row.payload = { ...(row.payload || {}), index_candidate_reason: notice.candidate_reason };
    return row;
  });
  const detailFailures = results.filter(item => item && item.__error);
  const rows = results.filter(item => item && !item.__error && KEK_AUTHORITY_RE.test(item.authority) && KEK_PROCUREMENT_RE.test(item.procurement_no));
  if (candidates.length && detailFailures.length === candidates.length) {
    throw new Error(`All ${candidates.length} KRPP candidate detail pages failed. First error: ${detailFailures[0].__error}`);
  }
  return { rows, candidates, detailFailures };
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
  recentDateCount = Number(process.env.KRPP_RECENT_DATE_COUNT || 30),
  maxCandidates = Number(process.env.KRPP_MAX_DETAIL_CANDIDATES || 120),
  detailConcurrency = Number(process.env.KRPP_DETAIL_CONCURRENCY || 4),
  detailTimeoutMs = Number(process.env.KRPP_DETAIL_TIMEOUT_MS || 15000),
  allowEmpty = String(process.env.KRPP_ALLOW_EMPTY || '').toLowerCase() === 'true',
  supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  apiKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  bearerToken = ''
} = {}) {
  if (!['preview', 'apply'].includes(mode)) throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) throw new Error('KEK_TENDER_MIN_SCORE must be between 0 and 100.');
  const options = { recentDateCount, maxCandidates, detailConcurrency, detailTimeoutMs };
  const client = createKrppClient();

  let source;
  let rawRows = [];
  let candidateCount = 0;
  let detailFailureCount = 0;

  if (fixtureFile) {
    const html = await readFile(fixtureFile, 'utf8');
    const searchRows = parseSearchHtml(html, sourceUrl);
    source = { kind: 'fixture', url: sourceUrl, attempts: [] };
    rawRows = searchRows;
  } else {
    source = await fetchIndexWithFallback(client, sourceUrl);
    if (source.kind === 'search') {
      rawRows = source.searchRows;
    } else {
      const collected = await collectFromNoticeIndex(client, source, options);
      rawRows = collected.rows;
      candidateCount = collected.candidates.length;
      detailFailureCount = collected.detailFailures.length;
    }
  }

  const seenAt = new Date().toISOString();
  const relevant = prepareRelevantRows(rawRows, seenAt, minScore);
  if (!relevant.length && !allowEmpty && source.kind === 'search' && !rawRows.length) {
    throw new Error('KRPP search source returned zero KEK rows. Collector stopped without writes.');
  }

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
    source_kind: source.kind,
    source_url: source.url,
    source_fallback_attempts: source.attempts || [],
    scanned_kek_rows: rawRows.length,
    index_candidates: candidateCount,
    detail_failures: detailFailureCount,
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
      document_type: row.document_type,
      fpp: row.fpp,
      category: row.category,
      relevance_score: row.relevance_score,
      published_date: row.published_date,
      deadline: row.deadline,
      match_reasons: row.match_reasons
    }))
  };
  await writeSummary(summary);
  console.log(`KEK tender sync ${mode}: source=${summary.source_kind}, KEK scanned=${summary.scanned_kek_rows}, steel-relevant=${summary.relevant_rows}, detail-failures=${summary.detail_failures}.`);
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
