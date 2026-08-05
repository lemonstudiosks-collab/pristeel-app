#!/usr/bin/env node

const HUBSPOT_BASE = 'https://api.hubapi.com';
const DEFAULT_SUPABASE_URL = 'https://isymxqfqzkchbsrbhucf.supabase.co';

const CONTACT_PROPERTIES = [
  'firstname', 'lastname', 'email', 'phone', 'mobilephone',
  'company', 'jobtitle', 'country'
];

const DEAL_PROPERTIES = [
  'dealname', 'amount', 'dealstage', 'closedate', 'description'
];

function required(name, value) {
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

function clean(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function dateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function fullName(properties) {
  return [clean(properties.firstname), clean(properties.lastname)].filter(Boolean).join(' ') || null;
}

function titleCase(value) {
  return String(value || '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
    .trim();
}

function normalized(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function inferredCompany(email) {
  const domain = clean(email)?.split('@')[1] || '';
  const root = domain.split('.')[0] || '';
  return titleCase(root) || 'Pa kompani';
}

function inferredPerson(email, hubspotId) {
  const local = clean(email)?.split('@')[0] || '';
  return titleCase(local) || `HubSpot kontakt ${hubspotId}`;
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function filterToColumns(payload, columns) {
  const allowed = new Set(columns);
  return Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.has(key)));
}

export function mapHubSpotContact(record, portalId = '147958987') {
  const p = record.properties || {};
  return compactObject({
    hubspot_id: String(record.id),
    hubspot_url: `https://app.hubspot.com/contacts/${portalId}/contact/${record.id}`,
    person: fullName(p),
    company: clean(p.company),
    email: clean(p.email)?.toLowerCase() || null,
    phone: clean(p.phone) || clean(p.mobilephone),
    role: clean(p.jobtitle),
    country: clean(p.country)
  });
}

export function mapHubSpotDeal(record) {
  const p = record.properties || {};
  return compactObject({
    hs_object_id: String(record.id),
    dealname: clean(p.dealname) || `HubSpot deal ${record.id}`,
    amount: numberOrNull(p.amount),
    dealstage: clean(p.dealstage),
    closedate: dateOnly(p.closedate),
    description: clean(p.description)
  });
}

async function request(url, options = {}, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, options);
    if (response.ok) {
      if (response.status === 204) return null;
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }

    const body = await response.text();
    lastError = new Error(`${response.status} ${response.statusText}: ${body.slice(0, 700)}`);
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === attempts) break;

    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(30_000, 750 * 2 ** (attempt - 1));
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
  throw lastError;
}

async function fetchHubSpotObjects(objectType, properties, token) {
  const output = [];
  let after = null;

  do {
    const url = new URL(`${HUBSPOT_BASE}/crm/v3/objects/${objectType}`);
    url.searchParams.set('limit', '100');
    url.searchParams.set('archived', 'false');
    url.searchParams.set('properties', properties.join(','));
    if (after) url.searchParams.set('after', after);

    const page = await request(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    output.push(...(page?.results || []));
    after = page?.paging?.next?.after || null;
  } while (after);

  return Array.from(new Map(output.map(record => [String(record.id), record])).values());
}

function supabaseHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

async function readTableColumns(table, supabaseUrl, supabaseKey) {
  const schema = await request(`${supabaseUrl}/rest/v1/`, {
    headers: supabaseHeaders(supabaseKey, { Accept: 'application/openapi+json' })
  });

  const properties =
    schema?.definitions?.[table]?.properties ||
    schema?.components?.schemas?.[table]?.properties ||
    {};

  const columns = Object.keys(properties);
  if (!columns.length) throw new Error(`Could not read schema for ${table}.`);
  return columns;
}

async function readExisting(table, select, supabaseUrl, supabaseKey) {
  const url = `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=10000`;
  return await request(url, { headers: supabaseHeaders(supabaseKey) }) || [];
}

async function patchRow(table, filterColumn, filterValue, payload, supabaseUrl, supabaseKey) {
  const url = `${supabaseUrl}/rest/v1/${table}?${encodeURIComponent(filterColumn)}=eq.${encodeURIComponent(filterValue)}`;
  await request(url, {
    method: 'PATCH',
    headers: supabaseHeaders(supabaseKey, { Prefer: 'return=minimal' }),
    body: JSON.stringify(payload)
  });
}

async function insertRows(table, rows, conflictColumn, supabaseUrl, supabaseKey) {
  if (!rows.length) return;
  const suffix = conflictColumn ? `?on_conflict=${encodeURIComponent(conflictColumn)}` : '';
  const url = `${supabaseUrl}/rest/v1/${table}${suffix}`;

  for (let i = 0; i < rows.length; i += 100) {
    await request(url, {
      method: 'POST',
      headers: supabaseHeaders(supabaseKey, {
        Prefer: conflictColumn ? 'resolution=ignore-duplicates,return=minimal' : 'return=minimal'
      }),
      body: JSON.stringify(rows.slice(i, i + 100))
    });
  }
}

async function runPool(items, worker, concurrency = 8) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

export async function syncContacts(records, config) {
  const existing = await readExisting(
    'contacts',
    'id,hubspot_id,email,kind,notes',
    config.supabaseUrl,
    config.supabaseKey
  );

  const byHubSpotId = new Map(existing.filter(row => row.hubspot_id).map(row => [String(row.hubspot_id), row]));
  const byEmail = new Map(existing.filter(row => row.email).map(row => [String(row.email).toLowerCase(), row]));
  const updates = [];
  const inserts = [];

  for (const record of records) {
    const mapped = mapHubSpotContact(record, config.portalId);
    const current = byHubSpotId.get(mapped.hubspot_id) || (mapped.email ? byEmail.get(mapped.email) : null);

    if (current) {
      const payload = { ...mapped };
      if (!payload.person) delete payload.person;
      if (!payload.company) delete payload.company;
      if (!payload.email) delete payload.email;
      if (!payload.phone) delete payload.phone;
      if (!payload.role) delete payload.role;
      if (!payload.country) delete payload.country;
      updates.push({ id: current.id, payload });
    } else {
      inserts.push({
        ...mapped,
        person: mapped.person || inferredPerson(mapped.email, mapped.hubspot_id),
        company: mapped.company || inferredCompany(mapped.email),
        kind: 'client'
      });
    }
  }

  await runPool(
    updates,
    item => patchRow('contacts', 'id', item.id, item.payload, config.supabaseUrl, config.supabaseKey)
  );
  await insertRows('contacts', inserts, 'hubspot_id', config.supabaseUrl, config.supabaseKey);

  return { total: records.length, updated: updates.length, insertedOrAlreadyPresent: inserts.length };
}

export async function syncDeals(records, config) {
  const columns = await readTableColumns('crm_deals', config.supabaseUrl, config.supabaseKey);
  const identifierColumn = [
    'hs_object_id', 'hubspot_id', 'hubspot_deal_id', 'deal_id'
  ].find(column => columns.includes(column)) || null;
  const rowKeyColumn = columns.includes('id') ? 'id' : identifierColumn || 'dealname';
  const select = Array.from(new Set([rowKeyColumn, 'dealname', identifierColumn].filter(Boolean))).join(',');
  const existing = await readExisting('crm_deals', select, config.supabaseUrl, config.supabaseKey);

  console.log(`crm_deals HubSpot identifier column: ${identifierColumn || 'none; matching by dealname'}`);

  const byHubSpotId = identifierColumn
    ? new Map(existing.filter(row => row[identifierColumn]).map(row => [String(row[identifierColumn]), row]))
    : new Map();
  const byName = new Map(existing.filter(row => row.dealname).map(row => [normalized(row.dealname), row]));
  const updates = [];
  const inserts = [];

  for (const record of records) {
    const source = mapHubSpotDeal(record);
    const hubspotId = source.hs_object_id;
    delete source.hs_object_id;
    if (identifierColumn) source[identifierColumn] = hubspotId;

    const payload = filterToColumns(source, columns);
    const current = identifierColumn
      ? byHubSpotId.get(hubspotId) || byName.get(normalized(payload.dealname))
      : byName.get(normalized(payload.dealname));

    if (current) {
      updates.push({ key: current[rowKeyColumn], payload });
    } else {
      inserts.push(payload);
    }
  }

  await runPool(
    updates,
    item => patchRow('crm_deals', rowKeyColumn, item.key, item.payload, config.supabaseUrl, config.supabaseKey)
  );
  await insertRows('crm_deals', inserts, null, config.supabaseUrl, config.supabaseKey);

  return {
    total: records.length,
    identifierColumn: identifierColumn || 'dealname',
    updated: updates.length,
    inserted: inserts.length
  };
}

export async function runHubSpotSync(env = process.env) {
  const config = {
    hubspotToken: required('HUBSPOT_ACCESS_TOKEN', env.HUBSPOT_ACCESS_TOKEN),
    supabaseUrl: env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
    supabaseKey: required(
      'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY',
      env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
    ),
    portalId: env.HUBSPOT_PORTAL_ID || '147958987'
  };

  console.log('Fetching HubSpot contacts…');
  const contacts = await fetchHubSpotObjects('contacts', CONTACT_PROPERTIES, config.hubspotToken);
  console.log(`Fetched ${contacts.length} contacts.`);

  console.log('Fetching HubSpot deals…');
  const deals = await fetchHubSpotObjects('deals', DEAL_PROPERTIES, config.hubspotToken);
  console.log(`Fetched ${deals.length} deals.`);

  const contactResult = await syncContacts(contacts, config);
  const dealResult = await syncDeals(deals, config);

  console.log('HubSpot sync completed.');
  console.log(JSON.stringify({ contacts: contactResult, deals: dealResult }, null, 2));
  return { contacts: contactResult, deals: dealResult };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runHubSpotSync().catch(error => {
    console.error(`HubSpot sync failed: ${error.message}`);
    process.exitCode = 1;
  });
}
