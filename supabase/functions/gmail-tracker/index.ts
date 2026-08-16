import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { attachmentRegistryRows } from "./attachment-metadata.mjs";
import { attachmentScanStateRow, selectUnscannedAttachmentPairs } from "./attachment-scan-state.mjs";
import { bodyHydrationPatch, selectLinkedBodyCandidates } from "./body-hydration.mjs";

const SA_JSON = Deno.env.get("GOOGLE_SA_JSON")!;
const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const db = createClient(SUPABASE_URL, SERVICE_KEY);
const TERMINAL_PROJECT_STATUSES = new Set(["humbur", "arkivuar", "mbyllur", "realizuar"]);
const INTERNAL_EMAILS = new Set(
  [
    GMAIL_USER,
    "sales@prissteel.com",
    "arianit.vllahiu@prissteel.com",
    "oltian.vllahiu@prissteel.com",
    ...(Deno.env.get("PRISTEEL_INTERNAL_EMAILS") ?? "").split(/[;,\s]+/),
  ]
    .map((x) => String(x ?? "").trim().toLowerCase())
    .filter(Boolean),
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pppp-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function b64url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { token: string; exp: number } | null = null;

async function cronAuthorized(req: Request): Promise<boolean> {
  const provided = req.headers.get("x-pppp-cron-secret") ?? "";
  if (!provided) return false;
  const { data, error } = await db.rpc("gmail_tracker_cron_authorized", { provided });
  return !error && data === true;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;

  const sa = JSON.parse(SA_JSON);
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
  ].join(" ");

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    sub: GMAIL_USER,
    scope: scopes,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`token error ${r.status}: ${JSON.stringify(data)}`);

  cachedToken = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return cachedToken.token;
}

async function gmail(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Gmail ${path} -> ${r.status}: ${txt}`);
  return txt ? JSON.parse(txt) : {};
}

function headerValue(headers: any[], name: string): string {
  const h = headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

function extractEmail(raw: string): string {
  const direct = String(raw ?? "").match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);
  return (direct?.[0] ?? "").trim().toLowerCase();
}

function extractEmails(raw: string): string[] {
  const matches = String(raw ?? "").toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/g) ?? [];
  return [...new Set(matches)];
}

function fromName(raw: string, email: string): string {
  if (!raw) return "";
  let value = String(raw);
  if (email) value = value.replace(new RegExp(`<[^>]*${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>`, "i"), "");
  return value.replace(/["<>]/g, "").trim();
}

function payloadHasAttachment(part: any): boolean {
  if (!part) return false;
  if (String(part.filename ?? "").trim()) return true;
  return (part.parts ?? []).some((x: any) => payloadHasAttachment(x));
}

function decodeBase64Url(data: string): string {
  if (!data) return "";
  try {
    let normalized = String(data).replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) normalized += "=";
    const bin = atob(normalized);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return "";
  }
}

function stripHtml(raw: string): string {
  return String(raw ?? "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<\/div\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function collectBodyParts(part: any, out: { mime: string; text: string }[]) {
  if (!part) return;
  const mime = String(part.mimeType ?? "").toLowerCase();
  const filename = String(part.filename ?? "").trim();
  const data = String(part.body?.data ?? "");
  if (!filename && data && (mime === "text/plain" || mime === "text/html" || !mime)) {
    out.push({ mime: mime || "text/plain", text: decodeBase64Url(data) });
  }
  for (const child of part.parts ?? []) collectBodyParts(child, out);
}

function fullBodyText(payload: any, fallback: string): string {
  const parts: { mime: string; text: string }[] = [];
  collectBodyParts(payload, parts);
  let body = parts
    .filter((x) => x.mime === "text/plain" && x.text.trim())
    .map((x) => x.text)
    .join("\n\n")
    .trim();
  if (!body) {
    body = parts
      .filter((x) => x.mime === "text/html" && x.text.trim())
      .map((x) => stripHtml(x.text))
      .join("\n\n")
      .trim();
  }
  return (body || String(fallback ?? ""))
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, 50000);
}

function normalizeSubject(raw: string): string {
  let value = String(raw ?? "").normalize("NFKC").trim().toLowerCase();
  for (let i = 0; i < 8; i++) {
    const next = value.replace(/^\s*(?:re|fw|fwd|aw|wg)\s*:\s*/i, "").trim();
    if (next === value) break;
    value = next;
  }
  return value.replace(/\s+/g, " ");
}

type IncomingMeta = { at: string; subject: string };
type ReplyMatch = { id: string; at: string };
type GmailMessageRow = {
  gmail_message_id: string;
  gmail_thread_id: string;
  rfc822_message_id: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  subject: string;
  snippet: string;
  sent_at: string;
  direction: "incoming" | "outgoing";
  has_attachments: boolean;
  gmail_url: string;
  match_method: string;
  match_confidence: number;
  needs_review: boolean;
  review_reason: string | null;
  body_hydrated_at: string;
  body_hydration_method: string;
  updated_at: string;
};
type AttachmentPair = { project_id: string; gmail_message_id: string; gmail_thread_id: string | null };

async function listMessageIds(query: string, maxTotal = 3000): Promise<string[]> {
  const out: string[] = [];
  let pageToken = "";
  do {
    const path = `/messages?maxResults=500&q=${encodeURIComponent(query)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const page = await gmail(path);
    for (const m of page.messages ?? []) {
      if (m?.id && !out.includes(String(m.id))) out.push(String(m.id));
      if (out.length >= maxTotal) break;
    }
    pageToken = out.length >= maxTotal ? "" : String(page.nextPageToken ?? "");
  } while (pageToken);
  return out;
}

async function existingProjectEmailIds(ids: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    if (!chunk.length) continue;
    const { data, error } = await db.from("project_emails").select("gmail_message_id").in("gmail_message_id", chunk);
    if (error) throw error;
    for (const row of data ?? []) if (row.gmail_message_id) found.add(String(row.gmail_message_id));
  }
  return found;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, () => worker()));
  return output;
}

async function fetchMessageRow(id: string): Promise<GmailMessageRow> {
  const fields = "id,threadId,internalDate,snippet,payload(headers,filename,mimeType,body(data,attachmentId,size),parts(filename,mimeType,body(data,attachmentId,size),parts(filename,mimeType,body(data,attachmentId,size),parts(filename,mimeType,body(data,attachmentId,size))))))";
  const full = await gmail(`/messages/${encodeURIComponent(id)}?format=full&fields=${encodeURIComponent(fields)}`);
  const headers = full.payload?.headers ?? [];
  const fromRaw = headerValue(headers, "From");
  const from = extractEmail(fromRaw);
  const subject = headerValue(headers, "Subject") || "(pa subjekt)";
  const dateHeader = headerValue(headers, "Date");
  const internalMs = Number(full.internalDate ?? 0);
  const parsedHeader = Date.parse(dateHeader);
  const sentAt = Number.isFinite(internalMs) && internalMs > 0
    ? new Date(internalMs).toISOString()
    : Number.isFinite(parsedHeader)
      ? new Date(parsedHeader).toISOString()
      : new Date().toISOString();
  const threadId = String(full.threadId ?? "");
  if (!threadId) throw new Error(`Gmail message ${id} has no threadId`);
  const hydratedAt = new Date().toISOString();
  return {
    gmail_message_id: String(full.id ?? id),
    gmail_thread_id: threadId,
    rfc822_message_id: headerValue(headers, "Message-ID") || null,
    from_email: from || null,
    from_name: fromName(fromRaw, from) || null,
    to_emails: extractEmails(headerValue(headers, "To")),
    cc_emails: extractEmails(headerValue(headers, "Cc")),
    subject,
    snippet: fullBodyText(full.payload, String(full.snippet ?? "")),
    sent_at: sentAt,
    direction: INTERNAL_EMAILS.has(from) ? "outgoing" : "incoming",
    has_attachments: payloadHasAttachment(full.payload),
    gmail_url: `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(threadId)}`,
    match_method: "server-ingest-unmatched-v1",
    match_confidence: 0,
    needs_review: false,
    review_reason: null,
    body_hydrated_at: hydratedAt,
    body_hydration_method: "server-full-mime-v1",
    updated_at: hydratedAt,
  };
}

async function linkedBodyHydrationCandidates(limit = 20) {
  const safeLimit = Math.min(40, Math.max(1, Math.floor(Number(limit) || 20)));
  const selectCols = "gmail_message_id,project_id,suggested_project_id,body_hydrated_at,sent_at";
  const { data: direct, error: directError } = await db
    .from("project_emails")
    .select(selectCols)
    .not("gmail_message_id", "is", null)
    .not("project_id", "is", null)
    .is("body_hydrated_at", null)
    .order("sent_at", { ascending: false })
    .limit(Math.max(200, safeLimit * 4));
  if (directError) throw directError;

  const { data: links, error: linkError } = await db
    .from("project_email_links")
    .select("project_id,gmail_message_id")
    .not("project_id", "is", null)
    .not("gmail_message_id", "is", null)
    .limit(5000);
  if (linkError) throw linkError;

  const directIds = new Set((direct ?? []).map((x: any) => String(x.gmail_message_id ?? "")).filter(Boolean));
  const linkedIds = [...new Set((links ?? []).map((x: any) => String(x.gmail_message_id ?? "")).filter((id: string) => id && !directIds.has(id)))];
  const linkedEmails: any[] = [];
  for (let i = 0; i < linkedIds.length; i += 200) {
    const ids = linkedIds.slice(i, i + 200);
    if (!ids.length) continue;
    const { data, error } = await db
      .from("project_emails")
      .select(selectCols)
      .in("gmail_message_id", ids)
      .is("body_hydrated_at", null);
    if (error) throw error;
    linkedEmails.push(...(data ?? []));
  }

  return selectLinkedBodyCandidates([...(direct ?? []), ...linkedEmails], links ?? [], safeLimit);
}

async function syncLinkedBodyHydration(limit = 20) {
  const candidates = await linkedBodyHydrationCandidates(limit);
  if (!candidates.length) return { candidates: 0, hydrated: 0, empty_marked: 0, not_found: 0, failed: 0 };
  let hydrated = 0;
  let emptyMarked = 0;
  let notFound = 0;
  let failed = 0;
  const failures: Array<{ id: string; error: string }> = [];

  await mapLimit(candidates, 5, async (candidate) => {
    const id = String(candidate.gmail_message_id ?? "");
    if (!id) return;
    try {
      const full = await gmail(`/messages/${encodeURIComponent(id)}?format=full`);
      const body = fullBodyText(full?.payload, "");
      const at = new Date().toISOString();
      const patch = bodyHydrationPatch(body, at);
      const update = patch ?? {
        body_hydrated_at: at,
        body_hydration_method: "server-full-mime-empty-v1",
        updated_at: at,
      };
      const { error } = await db
        .from("project_emails")
        .update(update)
        .eq("gmail_message_id", id)
        .is("body_hydrated_at", null);
      if (error) throw error;
      if (patch) hydrated++; else emptyMarked++;
    } catch (e) {
      const message = String(e);
      if (/Gmail \/messages\/[^ ]+\?format=full -> 404:/i.test(message)) {
        const at = new Date().toISOString();
        const { error } = await db
          .from("project_emails")
          .update({
            body_hydrated_at: at,
            body_hydration_method: "server-full-mime-not-found-v1",
            updated_at: at,
          })
          .eq("gmail_message_id", id)
          .is("body_hydrated_at", null);
        if (error) {
          failed++;
          failures.push({ id, error: String(error).slice(0, 300) });
        } else {
          notFound++;
        }
        return;
      }
      failed++;
      failures.push({ id, error: message.slice(0, 300) });
    }
  });

  if (failed === candidates.length && candidates.length > 0) {
    throw new Error(`Body hydration batch failed for all ${failed} candidates: ${failures[0]?.error || "unknown error"}`);
  }
  return {
    candidates: candidates.length,
    hydrated,
    empty_marked: emptyMarked,
    not_found: notFound,
    failed,
    errors: failures.slice(0, 10),
  };
}

async function linkedAttachmentCandidates(limit = 20): Promise<AttachmentPair[]> {
  const safeLimit = Math.min(40, Math.max(1, Math.floor(Number(limit) || 20)));
  const { data: emails, error: emailError } = await db
    .from("project_emails")
    .select("project_id,gmail_message_id,gmail_thread_id,has_attachments,sent_at")
    .eq("has_attachments", true)
    .not("gmail_message_id", "is", null)
    .order("sent_at", { ascending: false })
    .limit(2000);
  if (emailError) throw emailError;
  const attachmentMessages = new Map<string, any>();
  for (const row of emails ?? []) if (row.gmail_message_id) attachmentMessages.set(String(row.gmail_message_id), row);

  const { data: links, error: linkError } = await db
    .from("project_email_links")
    .select("project_id,gmail_message_id,gmail_thread_id")
    .not("project_id", "is", null)
    .not("gmail_message_id", "is", null)
    .limit(4000);
  if (linkError) throw linkError;

  const pairs = new Map<string, AttachmentPair>();
  for (const row of emails ?? []) {
    if (!row.project_id || !row.gmail_message_id) continue;
    const pair = { project_id: String(row.project_id), gmail_message_id: String(row.gmail_message_id), gmail_thread_id: row.gmail_thread_id ? String(row.gmail_thread_id) : null };
    pairs.set(`${pair.project_id}|${pair.gmail_message_id}`, pair);
  }
  for (const link of links ?? []) {
    if (!attachmentMessages.has(String(link.gmail_message_id ?? "")) || !link.project_id || !link.gmail_message_id) continue;
    const base = attachmentMessages.get(String(link.gmail_message_id));
    const pair = { project_id: String(link.project_id), gmail_message_id: String(link.gmail_message_id), gmail_thread_id: link.gmail_thread_id ? String(link.gmail_thread_id) : (base?.gmail_thread_id ? String(base.gmail_thread_id) : null) };
    pairs.set(`${pair.project_id}|${pair.gmail_message_id}`, pair);
  }

  const { data: scanRows, error: scanError } = await db
    .from("project_attachment_scan_state")
    .select("project_id,gmail_message_id")
    .limit(10000);
  if (scanError) throw scanError;
  return selectUnscannedAttachmentPairs([...pairs.values()], scanRows ?? [], safeLimit);
}

async function syncLinkedAttachmentMetadata(limit = 20) {
  const candidates = await linkedAttachmentCandidates(limit);
  if (!candidates.length) return { candidates: 0, messages_fetched: 0, pairs_scanned: 0, rows_registered: 0, no_downloadable: 0 };
  const ids = [...new Set(candidates.map((x) => x.gmail_message_id))];
  const fetched = await mapLimit(ids, 5, async (id) => {
    const full = await gmail(`/messages/${encodeURIComponent(id)}?format=full`);
    return [id, full] as const;
  });
  const byId = new Map(fetched);
  const registryRows: any[] = [];
  const scanRows: any[] = [];
  let noDownloadable = 0;
  for (const candidate of candidates) {
    const full = byId.get(candidate.gmail_message_id);
    const rows = attachmentRegistryRows(full, candidate.project_id, "server-metadata-v1");
    if (!rows.length) noDownloadable++;
    for (const row of rows) {
      if (!row.gmail_thread_id && candidate.gmail_thread_id) row.gmail_thread_id = candidate.gmail_thread_id;
      registryRows.push(row);
    }
    const scanRow = attachmentScanStateRow(candidate, rows.length, new Date().toISOString(), "server-metadata-v1");
    if (scanRow) scanRows.push(scanRow);
  }
  if (registryRows.length) {
    const { error } = await db
      .from("project_attachment_links")
      .upsert(registryRows, { onConflict: "gmail_message_id,attachment_id,project_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  if (scanRows.length) {
    const { error } = await db
      .from("project_attachment_scan_state")
      .upsert(scanRows, { onConflict: "project_id,gmail_message_id", ignoreDuplicates: false });
    if (error) throw error;
  }
  return { candidates: candidates.length, messages_fetched: ids.length, pairs_scanned: scanRows.length, rows_registered: registryRows.length, no_downloadable: noDownloadable };
}

async function ingestProjectEmails(days: number, apply = true) {
  const safeDays = Math.min(14, Math.max(1, Math.floor(Number(days) || 2)));
  const ids = await listMessageIds(`newer_than:${safeDays}d -label:chats`);
  const existing = await existingProjectEmailIds(ids);
  const newIds = ids.filter((id) => !existing.has(id));
  if (!apply) {
    return { listed: ids.length, existing: existing.size, new_messages: newIds.length, inserted: 0, applied: false, sample_new_ids: newIds.slice(0, 20) };
  }

  const rows = await mapLimit(newIds, 8, (id) => fetchMessageRow(id));
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    if (!chunk.length) continue;
    const { data, error } = await db
      .from("project_emails")
      .upsert(chunk, { onConflict: "gmail_message_id", ignoreDuplicates: true })
      .select("gmail_message_id");
    if (error) throw error;
    inserted += (data ?? []).length;
  }
  return { listed: ids.length, existing: existing.size, new_messages: newIds.length, fetched: rows.length, inserted, applied: true };
}

async function scanReplies(days: number, apply = true) {
  const q = `in:inbox newer_than:${days}d -from:${GMAIL_USER}`;
  const list = await gmail(`/messages?q=${encodeURIComponent(q)}&maxResults=100`);
  const messages = list.messages ?? [];
  const seen: Record<string, IncomingMeta[]> = {};
  for (const m of messages) {
    const full = await gmail(`/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
    const hs = full.payload?.headers ?? [];
    const from = extractEmail(headerValue(hs, "From"));
    const subject = headerValue(hs, "Subject");
    const dateMs = Number(full.internalDate ?? Date.now());
    const at = new Date(dateMs).toISOString();
    if (!from) continue;
    if (!seen[from]) seen[from] = [];
    seen[from].push({ at, subject });
  }

  const senders = Object.keys(seen);
  let rfqUpdated = 0;
  const matches: ReplyMatch[] = [];
  if (senders.length) {
    const { data: rfqs, error: rfqError } = await db
      .from("rfq_log")
      .select("id, supplier_email, subject, sent_at, replied_at")
      .in("supplier_email", senders)
      .is("replied_at", null)
      .not("sent_at", "is", null);
    if (rfqError) throw rfqError;

    for (const sender of senders) {
      const incoming = [...(seen[sender] ?? [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      const candidates = (rfqs ?? [])
        .filter((r) => String(r.supplier_email ?? "").toLowerCase() === sender)
        .map((r) => ({ ...r, normalizedSubject: normalizeSubject(r.subject ?? "") }));
      const assigned = new Set<string>();
      for (const info of incoming) {
        const incomingSubject = normalizeSubject(info.subject);
        if (!incomingSubject) continue;
        const atMs = Date.parse(info.at);
        const eligible = candidates
          .filter((r) => !assigned.has(String(r.id)) && !!r.normalizedSubject && r.normalizedSubject === incomingSubject && Date.parse(r.sent_at) <= atMs)
          .sort((a, b) => Date.parse(b.sent_at) - Date.parse(a.sent_at));
        if (!eligible.length) continue;
        const chosen = eligible[0];
        assigned.add(String(chosen.id));
        matches.push({ id: String(chosen.id), at: info.at });
      }
    }

    if (apply) {
      for (const match of matches) {
        const { error } = await db.from("rfq_log").update({ replied_at: match.at, status: "replied" }).eq("id", match.id).is("replied_at", null);
        if (!error) rfqUpdated++;
      }
      for (const sender of senders) {
        const latest = [...(seen[sender] ?? [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
        if (latest) await db.from("contacts").update({ last_contact: latest.at.slice(0, 10) }).eq("email", sender);
      }
    }
  }
  return { scanned: messages.length, unique_senders: senders.length, rfq_matches: matches.length, rfq_marked_replied: rfqUpdated, applied: apply };
}

async function slaCheck() {
  const now = Date.now();
  const created: string[] = [];
  const { data: rfqs, error: rfqError } = await db
    .from("rfq_log")
    .select("id, project_id, project_name, supplier_name, supplier_email, sent_at, replied_at, last_followup_at, status")
    .is("replied_at", null)
    .not("sent_at", "is", null);
  if (rfqError) throw rfqError;

  const projectIds = [...new Set((rfqs ?? []).map((r) => r.project_id).filter(Boolean))];
  const projectStatuses = new Map<string, string>();
  if (projectIds.length) {
    const { data: projects, error: projectError } = await db.from("projects").select("id, status").in("id", projectIds);
    if (projectError) throw projectError;
    for (const p of projects ?? []) projectStatuses.set(String(p.id), String(p.status ?? "").toLowerCase());
  }

  for (const r of rfqs ?? []) {
    const projectStatus = r.project_id ? projectStatuses.get(String(r.project_id)) ?? "" : "";
    if (TERMINAL_PROJECT_STATUSES.has(projectStatus)) continue;
    const base = new Date(r.last_followup_at ?? r.sent_at!).getTime();
    const days = (now - base) / 86400000;
    if (days < 7) continue;
    const { data: existing } = await db.from("tasks").select("id").eq("contact_email", r.supplier_email).eq("status", "hapur").eq("source", "sla_auto").limit(1);
    if (existing && existing.length) continue;
    const { error } = await db.from("tasks").insert({
      project_id: r.project_id,
      title: `Follow-up: ${r.supplier_name ?? r.supplier_email} (${Math.floor(days)} ditë pa përgjigje)`,
      detail: `RFQ për ${r.project_name ?? "projekt"} dërguar më ${(r.sent_at ?? "").slice(0, 10)}. Pa përgjigje.`,
      due_date: new Date().toISOString().slice(0, 10),
      priority: days > 14 ? "larte" : "normal",
      status: "hapur",
      source: "sla_auto",
      contact_email: r.supplier_email,
      category: "furnitor",
    });
    if (!error) created.push(r.supplier_email ?? "");
  }
  return { tasks_created: created.length, contacts: created };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!(await cronAuthorized(req))) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  }

  try {
    const url = new URL(req.url);
    let action = url.searchParams.get("action") ?? "scan";
    let payload: any = {};
    if (req.method === "POST") {
      try { payload = await req.json(); if (payload.action) action = payload.action; } catch { /* empty */ }
    }

    if (action === "ping") {
      const p = await gmail("/profile");
      return new Response(JSON.stringify({ ok: true, email: p.emailAddress, total: p.messagesTotal }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action === "ingest_preview") {
      const days = Number(url.searchParams.get("days") ?? payload.days ?? 2);
      const res = await ingestProjectEmails(days, false);
      return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action === "ingest") {
      const days = Number(url.searchParams.get("days") ?? payload.days ?? 2);
      const res = await ingestProjectEmails(days, true);
      return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action === "body_hydrate") {
      const limit = Number(url.searchParams.get("limit") ?? payload.limit ?? 20);
      const res = await syncLinkedBodyHydration(limit);
      return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action === "attachment_sync") {
      const limit = Number(url.searchParams.get("limit") ?? payload.limit ?? 20);
      const res = await syncLinkedAttachmentMetadata(limit);
      return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action === "scan_preview") {
      const days = Number(url.searchParams.get("days") ?? payload.days ?? 7);
      const res = await scanReplies(days, false);
      return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action === "scan") {
      const days = Number(url.searchParams.get("days") ?? payload.days ?? 7);
      const res = await scanReplies(days, true);
      return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action === "sla") {
      const res = await slaCheck();
      return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action === "run") {
      const ingestDays = Number(url.searchParams.get("ingest_days") ?? payload.ingest_days ?? 2);
      const scanDays = Number(url.searchParams.get("days") ?? payload.days ?? 7);
      const bodyLimit = Number(url.searchParams.get("body_limit") ?? payload.body_limit ?? 20);
      const attachmentLimit = Number(url.searchParams.get("attachment_limit") ?? payload.attachment_limit ?? 20);
      const ingest = await ingestProjectEmails(ingestDays, true);
      const scan = await scanReplies(scanDays, true);
      const sla = await slaCheck();
      const body_hydration = await syncLinkedBodyHydration(bodyLimit);
      const attachments = await syncLinkedAttachmentMetadata(attachmentLimit);
      return new Response(JSON.stringify({ ok: true, ingest, scan, sla, body_hydration, attachments }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, error: `unknown action: ${action}` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});