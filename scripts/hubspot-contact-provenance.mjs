import { makeSourceRow, safeUpsertSourceRows } from './contact-provenance-common.mjs';

const supabaseUrl = process.env.SUPABASE_URL || 'https://isymxqfqzkchbsrbhucf.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.log('Contact provenance skipped: Supabase server-side key is not configured.');
  process.exit(0);
}

async function readHubSpotContacts() {
  const all = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 20000; offset += pageSize) {
    const response = await fetch(`${supabaseUrl}/rest/v1/contacts?select=id,email,hubspot_id,hubspot_url&hubspot_id=not.is.null&limit=${pageSize}&offset=${offset}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`HubSpot provenance contact read failed: HTTP ${response.status} ${body.slice(0, 500)}`);
    const rows = body ? JSON.parse(body) : [];
    all.push(...rows);
    if (rows.length < pageSize) return all;
  }
  throw new Error('Guard stopped HubSpot provenance: more than 20000 contacts.');
}

try {
  const contacts = await readHubSpotContacts();
  const seenAt = new Date().toISOString();
  const rows = contacts.map(contact => makeSourceRow({
    contactId: contact.id,
    email: contact.email,
    source: 'hubspot',
    externalId: contact.hubspot_id,
    externalUrl: contact.hubspot_url,
    seenAt
  })).filter(Boolean);

  const result = await safeUpsertSourceRows({
    supabaseUrl,
    apiKey: supabaseKey,
    bearerToken: supabaseKey,
    rows
  });

  if (result.available === false) {
    console.log('HubSpot provenance ready but inactive: run supabase/contact-sources-provenance.sql first.');
  } else if (result.available === null) {
    console.log(`HubSpot provenance warning: ${result.error}`);
  } else {
    console.log(`HubSpot provenance updated: ${result.upserted} source link(s).`);
  }
} catch (error) {
  console.log(`HubSpot provenance warning: ${String(error?.message || error)}`);
  process.exit(0);
}
