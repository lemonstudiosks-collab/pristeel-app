import fs from 'node:fs';

const host = process.env.BITRIX_HOST || 'b24-cl53os.bitrix24.com';
const login = process.env.BITRIX_LOGIN || 'sales@prissteel.com';
const password = process.env.BITRIX_APP_PASSWORD || '';

if (!password) {
  console.error('Missing BITRIX_APP_PASSWORD secret.');
  process.exit(2);
}

const auth = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
const base = `https://${host}`;

function xmlDecode(s='') {
  return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
}
function hrefs(xml='') {
  return [...xml.matchAll(/<(?:[a-z]+:)?href[^>]*>([\s\S]*?)<\/(?:[a-z]+:)?href>/gi)].map(m => xmlDecode(m[1].trim()));
}
function firstHrefNear(xml, tag) {
  const re = new RegExp(`<[^>]*${tag}[^>]*>[\\s\\S]*?<(?:[a-z]+:)?href[^>]*>([\\s\\S]*?)<\\/(?:[a-z]+:)?href>[\\s\\S]*?<\\/[^>]*${tag}[^>]*>`, 'i');
  const m = xml.match(re);
  return m ? xmlDecode(m[1].trim()) : '';
}
function displayNames(xml='') {
  return [...xml.matchAll(/<(?:[a-z]+:)?displayname[^>]*>([\s\S]*?)<\/(?:[a-z]+:)?displayname>/gi)].map(m => xmlDecode(m[1].trim()));
}
function absolute(href) {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  return new URL(href, base).href;
}
function uniq(xs) { return [...new Set(xs.filter(Boolean))]; }
function safePath(u) {
  try { return new URL(absolute(u)).pathname; } catch { return String(u||''); }
}

async function dav(url, method='PROPFIND', depth='0', body='') {
  const res = await fetch(url, {
    method,
    redirect: 'follow',
    headers: {
      Authorization: auth,
      Depth: depth,
      'Content-Type': 'application/xml; charset=utf-8',
      'User-Agent': 'PRISTEEL-PPPP-CardDAV-Probe/2.0'
    },
    body: body || undefined
  });
  const text = await res.text();
  if (!res.ok && res.status !== 207) {
    throw new Error(`${method} ${url} -> ${res.status} ${res.statusText}\n${text.slice(0,300)}`);
  }
  return { status: res.status, url: res.url, text };
}

const props = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav"><d:prop><d:displayname/><d:resourcetype/><d:current-user-principal/><d:principal-URL/><card:addressbook-home-set/><card:supported-address-data/></d:prop></d:propfind>`;
const report = `<?xml version="1.0"?><card:addressbook-query xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav"><d:prop><d:getetag/></d:prop><card:filter/></card:addressbook-query>`;

async function propProbe(url, depth='1') {
  try {
    const r = await dav(absolute(url), 'PROPFIND', depth, props);
    return { ok:true, status:r.status, finalUrl:r.url, hrefs:uniq(hrefs(r.text)), names:displayNames(r.text), xml:r.text };
  } catch (e) {
    return { ok:false, error:String(e.message||e), hrefs:[], names:[], xml:'' };
  }
}

async function reportProbe(url) {
  try {
    const r = await dav(absolute(url), 'REPORT', '1', report);
    const hs = uniq(hrefs(r.text));
    return { ok:true, status:r.status, count:Math.max(0, hs.length - 1), hrefs:hs };
  } catch (e) {
    return { ok:false, error:String(e.message||e), count:null, hrefs:[] };
  }
}

async function discover() {
  const starts = [`${base}/.well-known/carddav`, `${base}/bitrix/groupdav.php/`];
  let root = null;
  const errors = [];
  for (const url of starts) {
    try {
      root = await dav(url, 'PROPFIND', '0', props);
      break;
    } catch (e) {
      errors.push(String(e.message || e));
    }
  }
  if (!root) throw new Error('CardDAV discovery failed.\n' + errors.join('\n---\n'));

  const principal = firstHrefNear(root.text, 'current-user-principal') || firstHrefNear(root.text, 'principal-URL') || hrefs(root.text)[0];
  if (!principal) throw new Error('Authenticated, but no CardDAV principal was returned.');

  const principalProbe = await propProbe(principal, '1');
  const home = firstHrefNear(principalProbe.xml, 'addressbook-home-set');

  // Bitrix Cloud exposes GroupDAV paths that are not always advertised through generic CardDAV discovery.
  // Probe only read-only DAV locations derived from the authenticated principal and known GroupDAV roots.
  const seeds = uniq([
    '/bitrix/groupdav.php/',
    principal,
    home,
    ...principalProbe.hrefs,
    `/bitrix/groupdav.php/addressbooks/user/${encodeURIComponent(login)}/`,
    `/bitrix/groupdav.php/s1/${encodeURIComponent(login)}/`,
    `/bitrix/groupdav.php/s1/${encodeURIComponent(login)}/addressbook/`
  ]);

  const visited = new Set();
  const queue = seeds.slice();
  const probes = [];
  const candidateHrefs = [];

  while (queue.length && visited.size < 80) {
    const u = queue.shift();
    const key = absolute(u);
    if (!key || visited.has(key)) continue;
    visited.add(key);
    const p = await propProbe(u, '1');
    probes.push({ path:safePath(u), ok:p.ok, status:p.status||null, hrefCount:p.hrefs.length, names:p.names.slice(0,12), error:p.error||null });
    if (!p.ok) continue;
    for (const h of p.hrefs) {
      const path = safePath(h);
      if (!/groupdav\.php/i.test(path)) continue;
      candidateHrefs.push(h);
      if (!visited.has(absolute(h)) && queue.length < 120) queue.push(h);
    }
  }

  const reportTargets = uniq([
    home,
    ...candidateHrefs
  ]).filter(h => /groupdav\.php/i.test(safePath(h))).slice(0,100);

  const books = [];
  const reportDiagnostics = [];
  for (const h of reportTargets) {
    const rp = await reportProbe(h);
    reportDiagnostics.push({ path:safePath(h), ok:rp.ok, status:rp.status||null, count:rp.count, error:rp.error||null });
    if (rp.ok && rp.count > 0) {
      books.push({ href:safePath(h), count:rp.count });
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    host,
    login,
    discoveryUrl: root.url,
    principal:safePath(principal),
    advertisedHome:safePath(home),
    addressBooks:books,
    diagnostics:{
      propfind:probes,
      reports:reportDiagnostics
    }
  };
}

try {
  const result = await discover();
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync('tmp/bitrix-carddav-probe.json', JSON.stringify(result, null, 2));
  console.log('Bitrix24 CardDAV connection: OK');
  console.log(`Principal: ${result.principal}`);
  console.log(`Advertised home: ${result.advertisedHome || '(none)'}`);
  console.log(`Address books with items: ${result.addressBooks.length}`);
  result.addressBooks.forEach((b,i) => console.log(`${i+1}. ${b.count} items | ${b.href}`));
  if (!result.addressBooks.length) {
    console.log('No populated address book detected yet. Diagnostic paths were written to the sanitized artifact.');
  }
} catch (e) {
  console.error('Bitrix24 CardDAV probe failed.');
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}
