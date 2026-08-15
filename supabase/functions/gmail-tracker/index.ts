import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SA_JSON = Deno.env.get("GOOGLE_SA_JSON")!;
const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const db = createClient(SUPABASE_URL, SERVICE_KEY);
const TERMINAL_PROJECT_STATUSES = new Set(["humbur", "arkivuar", "mbyllur", "realizuar"]);

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
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
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
          .filter((r) =>
            !assigned.has(String(r.id)) &&
            !!r.normalizedSubject &&
            r.normalizedSubject === incomingSubject &&
            Date.parse(r.sent_at) <= atMs
          )
          .sort((a, b) => Date.parse(b.sent_at) - Date.parse(a.sent_at));
        if (!eligible.length) continue;
        const chosen = eligible[0];
        assigned.add(String(chosen.id));
        matches.push({ id: String(chosen.id), at: info.at });
      }
    }

    if (apply) {
      for (const match of matches) {
        const { error } = await db
          .from("rfq_log")
          .update({ replied_at: match.at, status: "replied" })
          .eq("id", match.id)
          .is("replied_at", null);
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
    if (action === "scan_preview") {
      const res = await scanReplies(Number(url.searchParams.get("days") ?? payload.days ?? 7), false);
      return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action === "scan") {
      const res = await scanReplies(Number(url.searchParams.get("days") ?? payload.days ?? 7), true);
      return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action === "sla") {
      const res = await slaCheck();
      return new Response(JSON.stringify({ ok: true, ...res }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (action === "run") {
      const scan = await scanReplies(Number(url.searchParams.get("days") ?? 7), true);
      const sla = await slaCheck();
      return new Response(JSON.stringify({ ok: true, scan, sla }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: false, error: `unknown action: ${action}` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
