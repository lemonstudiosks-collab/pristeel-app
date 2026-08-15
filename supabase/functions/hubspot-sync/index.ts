import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const HUBSPOT_TOKEN = Deno.env.get("HUBSPOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HS = "https://api.hubapi.com";

const db = createClient(SUPABASE_URL, SERVICE_KEY);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pppp-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

async function cronAuthorized(req: Request): Promise<boolean> {
  const provided = req.headers.get("x-pppp-cron-secret") ?? "";
  if (!provided) return false;
  const { data, error } = await db.rpc("hubspot_sync_cron_authorized", { provided });
  return !error && data === true;
}

async function hsGet(path: string) {
  const r = await fetch(`${HS}${path}`, { headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` } });
  if (!r.ok) throw new Error(`HubSpot GET ${path} -> ${r.status}: ${await r.text()}`);
  return await r.json();
}

async function hsPatch(path: string, body: unknown) {
  const r = await fetch(`${HS}${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HubSpot PATCH ${path} -> ${r.status}: ${await r.text()}`);
  return await r.json();
}

async function pullAll(object: string, props: string[]) {
  const out: any[] = [];
  let after: string | undefined;
  for (let i = 0; i < 40; i++) {
    const qs = new URLSearchParams({ limit: "100", properties: props.join(",") });
    if (after) qs.set("after", after);
    const data = await hsGet(`/crm/v3/objects/${object}?${qs.toString()}`);
    out.push(...(data.results ?? []));
    after = data.paging?.next?.after;
    if (!after) break;
  }
  return out;
}

async function pullDeals() {
  const rows = await pullAll("deals", ["dealname", "amount", "dealstage", "closedate", "description"]);
  const mapped = rows.map((d) => ({
    hs_deal_id: d.id,
    dealname: d.properties.dealname,
    amount: d.properties.amount ? Number(d.properties.amount) : null,
    dealstage: d.properties.dealstage,
    closedate: d.properties.closedate ? d.properties.closedate.slice(0, 10) : null,
    description: d.properties.description,
    last_synced: new Date().toISOString(),
  }));
  if (mapped.length) {
    const { error } = await db.from("crm_deals").upsert(mapped, { onConflict: "hs_deal_id" });
    if (error) throw new Error(`crm_deals upsert: ${error.message}`);
  }
  return mapped.length;
}

async function pullCompanies() {
  const rows = await pullAll("companies", ["name", "domain", "city"]);
  const mapped = rows.map((c) => ({ hs_id: c.id, name: c.properties.name, domain: c.properties.domain, city: c.properties.city }));
  if (mapped.length) {
    const { error } = await db.from("crm_companies").upsert(mapped, { onConflict: "hs_id" });
    if (error) throw new Error(`crm_companies upsert: ${error.message}`);
  }
  return mapped.length;
}

async function pullContacts() {
  const rows = await pullAll("contacts", ["firstname", "lastname", "email", "jobtitle", "company"]);
  const mapped = rows.map((c) => ({
    hs_id: c.id,
    firstname: c.properties.firstname,
    lastname: c.properties.lastname,
    email: c.properties.email,
    jobtitle: c.properties.jobtitle,
    company: c.properties.company,
  }));
  if (mapped.length) {
    const { error } = await db.from("crm_contacts").upsert(mapped, { onConflict: "hs_id" });
    if (error) throw new Error(`crm_contacts upsert: ${error.message}`);
  }
  return mapped.length;
}

async function pushDeal(hs_deal_id: string, properties: Record<string, unknown>) {
  await hsPatch(`/crm/v3/objects/deals/${hs_deal_id}`, { properties });
  const { error } = await db.from("crm_deals").update({ ...properties, last_synced: new Date().toISOString() }).eq("hs_deal_id", hs_deal_id);
  if (error) throw new Error(`crm_deals update: ${error.message}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (!(await cronAuthorized(req))) return json({ ok: false, error: "unauthorized" }, 401);

  try {
    const url = new URL(req.url);
    let action = url.searchParams.get("action") ?? "pull";
    let payload: any = {};
    if (req.method === "POST") {
      try { payload = await req.json(); if (payload.action) action = payload.action; } catch { /* empty */ }
    }

    if (action === "ping") {
      const me = await hsGet("/crm/v3/objects/deals?limit=1");
      return json({ ok: true, hubspot: "reachable", sample_count: me.results?.length ?? 0 });
    }
    if (action === "pull") {
      const deals = await pullDeals();
      const companies = await pullCompanies();
      const contacts = await pullContacts();
      return json({ ok: true, synced: { deals, companies, contacts } });
    }
    if (action === "push_deal") {
      const { hs_deal_id, properties } = payload;
      if (!hs_deal_id || !properties) return json({ ok: false, error: "hs_deal_id and properties required" }, 400);
      await pushDeal(hs_deal_id, properties);
      return json({ ok: true, pushed: hs_deal_id });
    }
    return json({ ok: false, error: `unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
