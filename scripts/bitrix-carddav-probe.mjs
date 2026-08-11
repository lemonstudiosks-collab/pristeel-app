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
  return [...xml.matchAll(/<(?:d:)?href[^>]*>([\s\S]*?)<\/(?:d:)?href>/gi)].map(m => xmlDecode(m[1].trim()));
}
function firstHrefNear(xml, tag) {
  const re = new RegExp(`<[^>]*${tag}[^>]*>[\\s\\S]*?<(?:d:)?href[^>]*>([\\s\\S]*?)<\\/(?:d:)?href>[\\s\\S]*?<\\/[^>]*${tag}[^>]*>`, 'i');
  const m = xml.match(re);
  return m ? xmlDecode(m[1].trim()) : '';
}
function displayNames(xml='') {
  return [...xml.matchAll(/<(?:d:)?displayname[^>]*>([\s\S]*?)<\/(?:d:)?displayname>/gi)].map(m => xmlDecode(m[1].trim()));
}
function absolute(href) {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  return new URL(href, base).href;
}
async function dav(url, method='PROPFIND', depth='0', body='') {
  const res = await fetch(url, {
    method,
    redirect: 'follow',
    headers: {
      Authorization: auth,
      Depth: depth,
      'Content-Type': 'application/xml; charset=utf-8',
      'User-Agent': 'PRISTEEL-PPPP-CardDAV-Probe/1.0'
    },
    body: body || undefined
  });
  const text = await res.text();
  if (!res.ok && res.status !== 207) {
    throw new Error(`${method} ${url} -> ${res.status} ${res.statusText}\n${text.slice(0,500)}`);
  }
  return { status: res.status, url: res.url, text };
}

async function discover() {
  const propCurrent = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/><d:principal-URL/></d:prop></d:propfind>`;
  const starts = [`${base}/.well-known/carddav`, `${base}/bitrix/groupdav.php/`];
  let root = null;
  let errors = [];
  for (const url of starts) {
    try {
      root = await dav(url, 'PROPFIND', '0', propCurrent);
      break;
    } catch (e) {
      errors.push(String(e.message || e));
    }
  }
  if (!root) throw new Error('CardDAV discovery failed.\n' + errors.join('\n---\n'));

  let principal = firstHrefNear(root.text, 'current-user-principal') || firstHrefNear(root.text, 'principal-URL') || hrefs(root.text)[0];
  if (!principal) throw new Error('Authenticated, but no CardDAV principal was returned.');

  const propHome = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav"><d:prop><card:addressbook-home-set/><d:displayname/></d:prop></d:propfind>`;
  const p = await dav(absolute(principal), 'PROPFIND', '0', propHome);
  let home = firstHrefNear(p.text, 'addressbook-home-set');
  if (!home) {
    // Bitrix often exposes GroupDAV directly under /bitrix/groupdav.php/.
    home = hrefs(p.text).find(x => /groupdav\.php/i.test(x) && x !== principal) || principal;
  }

  const propBooks = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav"><d:prop><d:displayname/><d:resourcetype/><card:supported-address-data/></d:prop></d:propfind>`;
  const booksResp = await dav(absolute(home), 'PROPFIND', '1', propBooks);
  const allHrefs = hrefs(booksResp.text);
  const names = displayNames(booksResp.text);

  const candidates = allHrefs.filter((h, i, arr) => h && arr.indexOf(h) === i && absolute(h) !== absolute(home));
  const books = [];
  for (let i=0; i<candidates.length; i++) {
    const href = candidates[i];
    let count = null;
    let ok = false;
    try {
      const q = `<?xml version="1.0"?><card:addressbook-query xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav"><d:prop><d:getetag/></d:prop><card:filter/></card:addressbook-query>`;
      const r = await dav(absolute(href), 'REPORT', '1', q);
      count = Math.max(0, hrefs(r.text).length - 1);
      ok = true;
    } catch (e) {
      // Not every child under the home-set is an address book.
    }
    if (ok) books.push({ href, name: names[i+1] || names[i] || '', count });
  }

  return {
    checkedAt: new Date().toISOString(),
    host,
    login,
    discoveryUrl: root.url,
    principal,
    home,
    addressBooks: books
  };
}

try {
  const result = await discover();
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync('tmp/bitrix-carddav-probe.json', JSON.stringify(result, null, 2));
  console.log('Bitrix24 CardDAV connection: OK');
  console.log(`Principal: ${result.principal}`);
  console.log(`Address books found: ${result.addressBooks.length}`);
  result.addressBooks.forEach((b,i) => console.log(`${i+1}. ${b.name || '(unnamed)'} | ${b.count} items | ${b.href}`));
} catch (e) {
  console.error('Bitrix24 CardDAV probe failed.');
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}
