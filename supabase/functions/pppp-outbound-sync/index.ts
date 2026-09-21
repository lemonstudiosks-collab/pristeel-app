import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { listAllDraftRefs, localDate, mapLimit } from "./sync-core.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SA_JSON = Deno.env.get("GOOGLE_SA_JSON") || "";
const GMAIL_USER = Deno.env.get("GMAIL_USER") || "";
const TIMEZONE = "Europe/Belgrade";
const DAILY_LIMIT = 50;
const HEADERS = { "Content-Type": "application/json" };

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: HEADERS });

function b64url(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string) {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let cachedToken: { token: string; exp: number } | null = null;

async function gmailToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;
  if (!SA_JSON || !GMAIL_USER) throw new Error("gmail_service_account_not_configured");
  const serviceAccount = JSON.parse(SA_JSON);
  const claim = {
    iss: serviceAccount.client_email,
    sub: GMAIL_USER,
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(signature)}`,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`google_token_${response.status}`);
  const token = String(data.access_token || "");
  if (!token) throw new Error("google_token_missing_access_token");
  cachedToken = { token, exp: now + Number(data.expires_in || 3600) };
  return token;
}

async function gmail(path: string) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}${path}`,
    { headers: { Authorization: `Bearer ${await gmailToken()}` } },
  );
  const raw = await response.text();
  if (!response.ok) throw new Error(`gmail_${response.status}`);
  return raw ? JSON.parse(raw) : {};
}

async function rpc(name: string, body: unknown) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`rpc_${name}_${response.status}:${raw.slice(0, 300)}`);
  return raw ? JSON.parse(raw) : null;
}

async function authorized(req: Request) {
  const provided = req.headers.get("x-pppp-cron-secret") || "";
  if (!provided) return false;
  return (await rpc("gmail_tracker_cron_authorized", { provided })) === true;
}

function header(message: any, name: string) {
  return String(
    (message?.payload?.headers || []).find(
      (item: any) => String(item?.name || "").toLowerCase() === name.toLowerCase(),
    )?.value || "",
  ).trim();
}

function firstEmail(value: string) {
  return String(value || "")
    .toLowerCase()
    .match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/)?.[0] || "";
}

async function draftSnapshot(draftId: string) {
  const query = new URLSearchParams({ format: "metadata" });
  query.append("metadataHeaders", "To");
  query.append("metadataHeaders", "Subject");
  const draft = await gmail(`/drafts/${encodeURIComponent(draftId)}?${query.toString()}`);
  return {
    draft_id: String(draft?.id || draftId),
    message_id: String(draft?.message?.id || ""),
    thread_id: String(draft?.message?.threadId || ""),
    recipient_email: firstEmail(header(draft?.message, "To")),
    subject: header(draft?.message, "Subject"),
  };
}

Deno.serve(async (req: Request) => {
  if (!["GET", "POST"].includes(req.method)) return json({ ok: false, error: "GET_or_POST_required" }, 405);
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  try {
    if (!(await authorized(req))) return json({ ok: false, error: "unauthorized", run_id: runId }, 401);
    const { refs, pages } = await listAllDraftRefs(gmail);
    const snapshot = await mapLimit(refs, 5, (draft: any) => draftSnapshot(String(draft.id)));
    const reconcileResult = await rpc("pppp_outbound_reconcile_live_drafts_v1", { p_drafts: snapshot });
    const targetDate = localDate(TIMEZONE);
    const planResult = await rpc("pppp_outbound_plan_day_v1", {
      p_day: targetDate,
      p_limit: DAILY_LIMIT,
    });
    return json({
      ok: true,
      version: "pppp-outbound-sync-v2",
      run_id: runId,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      timezone: TIMEZONE,
      target_date: targetDate,
      gmail_pages: pages,
      gmail_drafts_seen: refs.length,
      snapshot_count: snapshot.length,
      reconcile_calls: 1,
      reconcile_result: reconcileResult,
      plan_calls: 1,
      planned_count: Array.isArray(planResult) ? planResult.length : 0,
      daily_limit: DAILY_LIMIT,
      sent_email: false,
    });
  } catch (error) {
    console.error("pppp-outbound-sync", error instanceof Error ? error.message : "unknown_error");
    return json({
      ok: false,
      version: "pppp-outbound-sync-v2",
      run_id: runId,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      error: String((error as any)?.message || error).slice(0, 600),
      sent_email: false,
    }, 500);
  }
});
