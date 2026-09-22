import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const H = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const J = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: H });
const S = (v: unknown, n = 5000) => String(v ?? "").trim().slice(0, n);

type ParsedMessage = {
  sender_name: string | null;
  sender_phone: string | null;
  message_text: string;
  sent_at: string | null;
  source_timestamp_text: string;
  direction: "inbound" | "outbound" | "unknown";
  source_line_start: number;
  source_line_end: number;
};

function normalizeExport(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\r\n?/g, "\n");
}

function partsInZone(date: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });
  const out: Record<string, number> = {};
  for (const p of f.formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out;
}

function zonedIso(y: number, m: number, d: number, hh: number, mm: number, ss: number, timeZone: string) {
  try {
    const desired = Date.UTC(y, m - 1, d, hh, mm, ss);
    let guess = desired;
    for (let i = 0; i < 3; i++) {
      const p = partsInZone(new Date(guess), timeZone);
      const represented = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
      const delta = desired - represented;
      if (!delta) break;
      guess += delta;
    }
    return new Date(guess).toISOString();
  } catch {
    return null;
  }
}

function normalizePhone(sender: string | null) {
  if (!sender) return null;
  const raw = sender.replace(/[()\s.-]/g, "");
  if (/^\+?\d{7,16}$/.test(raw)) return raw.startsWith("+") ? raw : `+${raw}`;
  return null;
}

function parseExport(raw: string, opts: { dateFormat: "DMY" | "MDY"; ownName: string; timeZone: string }) {
  const text = normalizeExport(raw);
  const lines = text.split("\n");
  const messages: ParsedMessage[] = [];
  const warnings: string[] = [];
  let current: ParsedMessage | null = null;
  let ignoredBeforeFirst = 0;

  const header = /^\[?(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?\]?\s*(?:[-–—]\s*)?(.*)$/;

  const flush = () => {
    if (!current) return;
    current.message_text = current.message_text.trimEnd();
    if (current.message_text) messages.push(current);
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];
    const m = line.match(header);
    if (!m) {
      if (current) {
        current.message_text += `\n${line}`;
        current.source_line_end = lineNo;
      } else if (line.trim()) ignoredBeforeFirst++;
      continue;
    }

    flush();
    let a = Number(m[1]), b = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const month = opts.dateFormat === "DMY" ? b : a;
    const day = opts.dateFormat === "DMY" ? a : b;
    let hour = Number(m[4]);
    const minute = Number(m[5]);
    const second = Number(m[6] || 0);
    const ap = (m[7] || "").toUpperCase();
    if (ap === "PM" && hour < 12) hour += 12;
    if (ap === "AM" && hour === 12) hour = 0;

    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
      warnings.push(`Rreshti ${lineNo}: datë/orë e pavlefshme.`);
      continue;
    }

    const body = m[8] || "";
    const senderMatch = body.match(/^([^:]{1,180}):\s?(.*)$/s);
    const sender = senderMatch ? senderMatch[1].trim() : null;
    const msg = senderMatch ? senderMatch[2] : body;
    const own = opts.ownName.trim().toLocaleLowerCase();
    const direction: ParsedMessage["direction"] = own && sender
      ? (sender.toLocaleLowerCase() === own ? "outbound" : "inbound")
      : "unknown";

    current = {
      sender_name: sender,
      sender_phone: normalizePhone(sender),
      message_text: msg,
      sent_at: zonedIso(year, month, day, hour, minute, second, opts.timeZone),
      source_timestamp_text: `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}${m[6] ? `:${m[6]}` : ""}${m[7] ? ` ${m[7]}` : ""}`,
      direction,
      source_line_start: lineNo,
      source_line_end: lineNo,
    };
  }
  flush();
  if (ignoredBeforeFirst) warnings.push(`${ignoredBeforeFirst} rreshta para mesazhit të parë nuk u importuan.`);
  return { messages, warnings, lineCount: lines.length };
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function db(url: string, auth: string, anon: string, init: RequestInit = {}) {
  const r = await fetch(url, {
    ...init,
    headers: {
      apikey: anon,
      Authorization: auth,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`DB ${r.status}: ${raw.slice(0, 1000)}`);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });
  if (req.method !== "POST") return J({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.toLowerCase().startsWith("bearer ")) return J({ ok: false, error: "unauthorized" }, 401);

    const base = Deno.env.get("SUPABASE_URL") || "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!base || !anon) return J({ ok: false, error: "supabase_environment_missing" }, 500);

    const body = await req.json().catch(() => ({}));
    const projectId = S(body?.project_id, 80);
    const content = String(body?.content ?? "");
    const sourceFileName = S(body?.source_file_name || "whatsapp-export.txt", 255);
    const dryRun = body?.dry_run !== false;
    const dateFormat = String(body?.date_format || "DMY").toUpperCase() === "MDY" ? "MDY" : "DMY";
    const ownName = S(body?.own_name, 180);
    const timeZone = S(body?.time_zone || "Europe/Belgrade", 80) || "Europe/Belgrade";

    if (!/^[0-9a-f-]{36}$/i.test(projectId)) return J({ ok: false, error: "valid_project_id_required" }, 400);
    if (!content.trim()) return J({ ok: false, error: "content_required" }, 400);
    if (new TextEncoder().encode(content).byteLength > 2_500_000) return J({ ok: false, error: "file_too_large", max_bytes: 2500000 }, 413);

    const p = await db(`${base}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=id,name&limit=1`, auth, anon);
    if (!Array.isArray(p) || !p.length) return J({ ok: false, error: "project_not_found_or_not_visible" }, 404);

    const parsed = parseExport(content, { dateFormat, ownName, timeZone });
    if (!parsed.messages.length) return J({ ok: false, error: "no_whatsapp_messages_detected", warnings: parsed.warnings }, 422);
    if (parsed.messages.length > 10000) return J({ ok: false, error: "too_many_messages", max_messages: 10000, detected: parsed.messages.length }, 413);

    const batchId = crypto.randomUUID();
    const rows = [];
    for (const m of parsed.messages) {
      const hash = await sha256(`${projectId}|${m.sent_at || m.source_timestamp_text}|${m.sender_name || ""}|${m.message_text}`);
      rows.push({
        project_id: projectId,
        import_batch_id: batchId,
        source_file_name: sourceFileName,
        sender_name: m.sender_name,
        sender_phone: m.sender_phone,
        message_text: m.message_text,
        sent_at: m.sent_at,
        direction: m.direction,
        message_hash: hash,
        source_line_start: m.source_line_start,
        source_line_end: m.source_line_end,
      });
    }

    const preview = rows.slice(0, 20).map((r) => ({
      sent_at: r.sent_at,
      sender_name: r.sender_name,
      direction: r.direction,
      message_text: r.message_text.slice(0, 500),
    }));

    if (dryRun) return J({
      ok: true,
      dry_run: true,
      project: p[0],
      detected_messages: rows.length,
      date_format: dateFormat,
      time_zone: timeZone,
      warnings: parsed.warnings,
      preview,
      parser_version: 1,
    });

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const result = await db(
        `${base}/rest/v1/pppp_whatsapp_messages_v1?on_conflict=project_id,message_hash`,
        auth,
        anon,
        {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
          body: JSON.stringify(chunk),
        },
      );
      inserted += Array.isArray(result) ? result.length : 0;
    }

    return J({
      ok: true,
      dry_run: false,
      project: p[0],
      detected_messages: rows.length,
      inserted_messages: inserted,
      duplicate_messages: rows.length - inserted,
      import_batch_id: batchId,
      warnings: parsed.warnings,
      parser_version: 1,
    });
  } catch (e) {
    const detail = S((e as Error)?.message || e, 1200);
    console.error("pppp-whatsapp-import-v1", detail);
    const status = /DB 401|DB 403|row-level security|permission denied/i.test(detail) ? 403 : 500;
    return J({ ok: false, error: status === 403 ? "not_allowed" : "import_failed", detail }, status);
  }
});

