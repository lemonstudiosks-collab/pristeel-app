const text = value => String(value == null ? '' : value).trim();

export function makeSourceRow({ contactId, email, source, externalId, externalUrl, seenAt }) {
  const id = text(contactId);
  const src = text(source).toLowerCase();
  if (!id || !src) return null;
  const row = {
    contact_id: id,
    source: src,
    last_seen: seenAt || new Date().toISOString(),
    updated_at: seenAt || new Date().toISOString()
  };
  const mail = text(email).toLowerCase();
  const extId = text(externalId);
  const extUrl = text(externalUrl);
  if (mail) row.email = mail;
  if (extId) row.external_id = extId;
  if (extUrl) row.external_url = extUrl;
  return row;
}

export function dedupeSourceRows(rows) {
  const map = new Map();
  for (const row of rows || []) {
    if (!row || !row.contact_id || !row.source) continue;
    const key = `${row.contact_id}::${row.source}`;
    map.set(key, { ...(map.get(key) || {}), ...row });
  }
  return [...map.values()];
}

function missingTable(status, body) {
  const b = String(body || '').toLowerCase();
  return (status === 404 || status === 400) && b.includes('contact_sources') && (
    b.includes('pgrst205') || b.includes('42p01') || b.includes('could not find the table') || b.includes('does not exist')
  );
}

export async function upsertSourceRows({ supabaseUrl, apiKey, bearerToken, rows, fetchImpl = fetch }) {
  const cleanRows = dedupeSourceRows(rows);
  if (!cleanRows.length) return { available: true, upserted: 0, skipped: 0 };

  let upserted = 0;
  for (let i = 0; i < cleanRows.length; i += 200) {
    const batch = cleanRows.slice(i, i + 200);
    const response = await fetchImpl(`${supabaseUrl}/rest/v1/contact_sources?on_conflict=contact_id,source`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${bearerToken || apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(batch)
    });
    const body = await response.text();
    if (!response.ok) {
      if (missingTable(response.status, body)) {
        return { available: false, upserted: 0, skipped: cleanRows.length, reason: 'contact_sources table not installed' };
      }
      throw new Error(`contact_sources upsert failed: HTTP ${response.status} ${body.slice(0, 500)}`);
    }
    upserted += batch.length;
  }
  return { available: true, upserted, skipped: 0 };
}

export async function safeUpsertSourceRows(options) {
  try {
    return await upsertSourceRows(options);
  } catch (error) {
    return {
      available: null,
      upserted: 0,
      skipped: dedupeSourceRows(options?.rows || []).length,
      error: String(error?.message || error)
    };
  }
}
