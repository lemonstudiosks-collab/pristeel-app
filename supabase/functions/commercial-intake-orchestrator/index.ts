import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
const H = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-pppp-cron-secret","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Content-Type":"application/json"};
const text = (v: unknown) => String(v ?? "").trim();
const norm = (v: unknown) => text(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
const arr = <T = any>(v: unknown): T[] => Array.isArray(v) ? v as T[] : [];
const emailOf = (v: unknown) => (text(v).toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/) || [""])[0];
const clip = (v: unknown, n = 25000) => text(v).replace(/\u0000/g, " ").slice(0, n);

function parseNumber(v: unknown): number | null {
  let s = text(v).replace(/[\s'’]/g, "");
  if (!s) return null;
  const commas = (s.match(/,/g) || []).length;
  const dots = (s.match(/\./g) || []).length;
  if (commas && dots) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (commas) { const p = s.split(","); s = p.length === 2 && p[1].length <= 3 ? `${p[0].replace(/\./g, "")}.${p[1]}` : s.replace(/,/g, ""); }
  else if (dots > 1) s = s.replace(/\./g, "");
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function firstNumber(source: string, patterns: RegExp[]): number | null {
  for (const re of patterns) { const m = source.match(re); if (m) { const n = parseNumber(m[1]); if (n != null) return n; } }
  return null;
}
function currency(source: string): string | null {
  if (/\bCHF\b/i.test(source)) return "CHF";
  if (/\bUSD\b/i.test(source) || /\$/i.test(source)) return "USD";
  if (/\bGBP\b/i.test(source) || /£/i.test(source)) return "GBP";
  if (/\bEUR(?:O)?\b/i.test(source) || /€/i.test(source)) return "EUR";
  return null;
}
function perKg(source: string): number | null {
  return firstNumber(source, [
    /(?:EUR|EURO|€|CHF|USD|GBP|£|\$)\s*([0-9][0-9.,]*)\s*(?:\/|per|pro)\s*kg\b/i,
    /([0-9][0-9.,]*)\s*(?:EUR|EURO|€|CHF|USD|GBP|£|\$)\s*(?:\/|per|pro)\s*kg\b/i,
    /\b(?:price|preis|cijena|cena)\s*(?:per|pro|\/)?\s*kg[^0-9]{0,20}([0-9][0-9.,]*)/i,
  ]);
}
function unitPrice(source: string): { unit_price: number | null; pricing_unit: string | null } {
  const unit = "(sets?|units?|pieces?|pcs?|pc|komad(?:a)?|cop[eë]|copë)";
  const patterns = [
    new RegExp(`(?:EUR|EURO|€|CHF|USD|GBP|£|\\$)\\s*([0-9][0-9 .,'’]*(?:[.,][0-9]+)?)\\s*(?:\\/|per)\\s*${unit}\\b`, "i"),
    new RegExp(`([0-9][0-9 .,'’]*(?:[.,][0-9]+)?)\\s*(?:EUR|EURO|€|CHF|USD|GBP|£|\\$)\\s*(?:\\/|per)\\s*${unit}\\b`, "i"),
  ];
  for (const re of patterns) {
    const m = source.match(re); if (!m) continue;
    const value = parseNumber(m[1]); if (value == null || value <= 0) continue;
    const u = norm(m[2]);
    const pricing_unit = u.startsWith("set") ? "set" : u.startsWith("pc") || u.startsWith("piece") || u.startsWith("komad") || u.startsWith("cop") ? "piece" : "unit";
    return { unit_price: value, pricing_unit };
  }
  return { unit_price: null, pricing_unit: null };
}
function moneyAfter(source: string, word: string): number | null {
  const re = new RegExp(`${word}[^\\n\\r0-9]{0,30}(?:EUR|EURO|€|CHF|USD|GBP|£|\\$)?\\s*([0-9][0-9 .,'’]*[0-9](?:[.,][0-9]{1,3})?)`, "i");
  const m = source.match(re); return m ? parseNumber(m[1]) : null;
}
function total(source: string): number | null {
  for (const w of ["grand\\s+total", "total", "gesamt", "ukupno", "totali", "summe", "amount"]) { const n = moneyAfter(source, w); if (n != null) return n; }
  return null;
}
function qtyKg(source: string): number | null {
  return firstNumber(source, [
    /\b(?:qty|quantity|menge|kolicina|količina|sasia|weight|gewicht|tezina|težina)\b[^0-9]{0,25}([0-9][0-9 .,'’]*(?:[.,][0-9]+)?)\s*kg\b/i,
    /\b([0-9][0-9 .,'’]*(?:[.,][0-9]+)?)\s*kg\b/i,
  ]);
}
function capture(source: string, re: RegExp, max = 180): string | null { const m = source.match(re); return m ? clip(m[1], max) : null; }
function offerRef(source: string): string | null {
  for (const re of [
    /(?:quotation|offer|quote|angebot)\s*(?:no\.?|nr\.?|number|nummer|ref(?:erence)?\.?|#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{2,50})/i,
    /(?:ponud[aeu]?|ofert[ae]?)\s*(?:no\.?|nr\.?|number|br\.?|#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{2,50})/i,
  ]) { const v = capture(source, re, 80); if (v) return v; }
  return null;
}
function paymentTerms(source: string): string | null {
  const direct = capture(source, /(?:payment\s+terms?|zahlungsbedingungen|uslovi\s+pla[cć]anja|kushtet\s+e\s+pages[eë]s)\s*[:\-]?\s*([^\n\r]{3,240})/i, 240);
  if (direct) return direct;
  const m = source.match(/(?:terms?\s+of\s+payment|payment\s+conditions?)\s*:?\s*([\s\S]{3,500}?)(?=\n\s*(?:validity|terms?\s+of\s+delivery|delivery|in\s+case\s+of|kind\s+regards|best\s+regards|$))/i);
  return m ? clip(m[1].replace(/[•·]/g, " ").replace(/\s*\n\s*/g, "; ").replace(/\s{2,}/g, " "), 320) : null;
}
function validityDays(source: string): number | null {
  return firstNumber(source, [/\b(?:validity|valid|gültig|gueltig|vazi|važi|vlefshm)\w*[\s\S]{0,120}?\(?([0-9]{1,4})\)?\s*(?:days?|tage|dana|dit[ëe]?)\b/i]);
}
function deliveryWeeks(source: string): number | null {
  const pos = source.search(/\b(?:terms?\s+of\s+delivery|delivery|lead\s*time|lieferzeit|rok\s+isporuke|afati\s+i\s+dorezimit)\b/i);
  const scope = pos >= 0 ? source.slice(pos, pos + 700) : source;
  let m = scope.match(/([0-9]+(?:[.,][0-9]+)?)\s*[-–]\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:weeks?|wochen|nedelj[ae]?|jav[ëe]?)\b/i);
  if (m) {
    let w = Math.max(parseNumber(m[1]) || 0, parseNumber(m[2]) || 0);
    const tail = scope.slice((m.index || 0) + m[0].length, (m.index || 0) + m[0].length + 240);
    const extra = tail.match(/(?:additional|plus|\+|with\s+additional|and\s+additional)[^0-9]{0,40}([0-9]+(?:[.,][0-9]+)?)\s*(?:weeks?|wochen|nedelj[ae]?|jav[ëe]?)\b/i);
    if (extra) w += parseNumber(extra[1]) || 0;
    return w > 0 ? Math.round(w) : null;
  }
  m = scope.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:weeks?|wochen|nedelj[ae]?|jav[ëe]?)\b/i);
  if (m) return Math.round(parseNumber(m[1]) || 0) || null;
  let d = scope.match(/([0-9]+(?:[.,][0-9]+)?)\s*[-–]\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:days?|tage|dana|dit[ëe]?)\b/i);
  if (d) return Math.ceil(Math.max(parseNumber(d[1]) || 0, parseNumber(d[2]) || 0) / 7) || null;
  d = scope.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:days?|tage|dana|dit[ëe]?)\b/i);
  return d ? Math.ceil((parseNumber(d[1]) || 0) / 7) || null : null;
}
function invoiceNumber(source: string): string | null { return capture(source, /(?:invoice|rechnung|faktur[ae]?|fatur[ae]?|račun|racun)\s*(?:no\.?|nr\.?|number|nummer|br\.?|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9._\/-]{2,50})/i, 80); }
function dateValue(source: string, label: RegExp): string | null {
  const m = source.match(label); if (!m) return null; const raw = text(m[1]);
  let z = raw.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/); if (z) return `${z[1]}-${z[2].padStart(2,"0")}-${z[3].padStart(2,"0")}`;
  z = raw.match(/(\d{1,2})[./-](\d{1,2})[./-](20\d{2})/); return z ? `${z[3]}-${z[2].padStart(2,"0")}-${z[1].padStart(2,"0")}` : null;
}
function offerExtract(source: string) {
  const cur = currency(source), pk = perKg(source), up = unitPrice(source), tt = total(source), q = qtyKg(source);
  const inc = (source.match(/\b(EXW|FCA|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/i) || [])[1] || null;
  return {currency:cur,price_kg:pk,unit_price:up.unit_price,pricing_unit:pk != null ? "kg" : up.pricing_unit,total_amount:tt,total_eur:cur === "EUR" ? tt : null,qty_kg:q,delivery_weeks:deliveryWeeks(source),incoterms:inc ? inc.toUpperCase() : null,payment_terms:paymentTerms(source),validity_days:validityDays(source),offer_ref:offerRef(source),cert:capture(source,/\b(EN\s*10204(?:\s*(?:3\.1|3\.2))?[^\n\r]{0,80})/i,100),origin:capture(source,/\b(?:country\s+of\s+origin|origin|ursprung|poreklo|origjina)\b\s*[:\-]?\s*([^\n\r]{2,80})/i,80)};
}
function invoiceExtract(source: string) {
  const cur = currency(source), tt = total(source);
  return {invoice_number:invoiceNumber(source),date:dateValue(source,/(?:invoice\s+date|date|datum|data|datë)\s*[:\-]?\s*((?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})|(?:\d{1,2}[./-]\d{1,2}[./-]20\d{2}))/i),due_date:dateValue(source,/(?:due\s+date|zahlbar\s+bis|faellig|fällig|rok\s+pla[cć]anja|afati\s+i\s+pages[eë]s)\s*[:\-]?\s*((?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})|(?:\d{1,2}[./-]\d{1,2}[./-]20\d{2}))/i),total_amount:tt,total_eur:cur === "EUR" ? tt : null,currency:cur,vat_pct:firstNumber(source,[/\b(?:VAT|MWST|PDV|TVSH)\b[^0-9]{0,15}([0-9]{1,2}(?:[.,][0-9]+)?)\s*%/i]),payment_terms:paymentTerms(source)};
}
function offerSignal(source: string): number { let s = 0; const n = norm(source), up = unitPrice(source); if (/\b(offer|quotation|quote|angebot|offerte|ofert|ponud|price|preis|cijena|cena)\b/.test(n)) s += 20; if (perKg(source) != null) s += 25; if (up.unit_price != null) s += 25; if (total(source) != null) s += 15; if (offerRef(source)) s += 10; if (/\b(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FOB|CIF|CFR)\b/i.test(source)) s += 5; if (/\b(delivery|lieferzeit|lead\s*time|rok\s+isporuke|afati)\b/.test(n)) s += 5; return s; }
function invoiceSignal(source: string): number { let s = 0; const n = norm(source); if (/\b(invoice|rechnung|faktura|fatura|racun|račun)\b/.test(n)) s += 30; if (invoiceNumber(source)) s += 20; if (total(source) != null) s += 20; if (/\b(due\s+date|payment\s+due|zahlbar|faellig|fällig|rok\s+pla[cć]anja)\b/.test(n)) s += 10; return s; }

async function authorized(req: Request) { const key = req.headers.get("x-pppp-cron-secret") || ""; if (!key) return false; const {data,error}=await db.rpc("gmail_tracker_cron_authorized",{provided:key}); return !error && data === true; }
async function supplierEvidence() {
  const emails = new Set<string>(), names = new Map<string,string>();
  const [p,c,r] = await Promise.all([db.from("partners").select("id,name").contains("relation",["supplier"]).eq("stage","active").limit(1000),db.from("contacts").select("email,company").eq("kind","supplier").not("email","is",null).limit(5000),db.from("rfq_log").select("supplier_email,supplier_name").not("supplier_email","is",null).limit(10000)]);
  if (p.error) throw p.error; if (c.error) throw c.error; if (r.error) throw r.error;
  const partners=arr<any>(p.data), ids=partners.map(x=>x.id); if(ids.length){const pc=await db.from("partner_contacts").select("partner_id,email,email_alt").in("partner_id",ids).limit(5000);if(pc.error)throw pc.error;for(const x of arr<any>(pc.data)){const pn=partners.find(z=>z.id===x.partner_id);for(const v of [x.email,x.email_alt]){const e=emailOf(v);if(e){emails.add(e);if(pn?.name)names.set(e,text(pn.name));}}}}
  for(const x of arr<any>(c.data)){const e=emailOf(x.email);if(e){emails.add(e);if(x.company)names.set(e,text(x.company));}}
  for(const x of arr<any>(r.data)){const e=emailOf(x.supplier_email);if(e){emails.add(e);if(x.supplier_name)names.set(e,text(x.supplier_name));}}
  return {emails,names};
}
async function existingStatuses(table:string, keys:string[]){const out=new Map<string,string>();for(let i=0;i<keys.length;i+=100){const part=keys.slice(i,i+100);const q=await db.from(table).select("candidate_key,status").in("candidate_key",part);if(q.error)throw q.error;for(const x of arr<any>(q.data))out.set(text(x.candidate_key),text(x.status));}return out;}
async function upsertReview(table:string,row:any,current:Map<string,string>){const st=current.get(row.candidate_key);if(st&&st!=="review")return"protected";const q=await db.from(table).upsert(row,{onConflict:"candidate_key"});if(q.error)throw q.error;return st?"updated":"created";}
async function reviewTask(projectId:string,kind:"offer"|"invoice",count:number){if(!count)return;const q=await db.from("tasks").upsert({project_id:projectId,title:kind==="offer"?`Shqyrto ${count} ofertë/a furnitori të gjetura automatikisht`:`Shqyrto ${count} faturë/a furnitori të gjetura automatikisht`,detail:"PPPP i ka strukturuar si kandidat review-first. Kontrollo burimin origjinal para aprovimit. Asnjë dokument canonical nuk krijohet automatikisht.",due_date:new Date().toISOString().slice(0,10),priority:"larte",status:"hapur",source:"commercial_intake_review",source_ref:`commercial-intake:${projectId}:${kind}`,category:"furnitor"},{onConflict:"source,source_ref"});if(q.error)throw q.error;}
async function matchRfq(projectId:string,supplierEmail:string,receivedAt:string){const q=await db.from("rfq_log").select("id,status,sent_at,created_at,supplier_email").eq("project_id",projectId).in("status",["sent","replied"]).lte("sent_at",receivedAt).order("sent_at",{ascending:false}).order("created_at",{ascending:false}).limit(100);if(q.error)throw q.error;return arr<any>(q.data).find(x=>emailOf(x.supplier_email)===supplierEmail)||null;}
async function reconcileReply(match:any,receivedAt:string){if(!match||text(match.status)!=="sent")return false;const q=await db.from("rfq_log").update({status:"replied",replied_at:receivedAt}).eq("id",match.id).eq("status","sent").select("id");if(q.error)throw q.error;return arr(q.data).length>0;}

async function run(limit=250){
  const max=Math.max(20,Math.min(800,Number(limit)||250)),since=new Date(Date.now()-60*86400000).toISOString(),sup=await supplierEvidence();
  const em=await db.from("project_emails").select("project_id,gmail_message_id,from_email,from_name,subject,snippet,sent_at,direction").not("project_id","is",null).eq("direction","incoming").gte("sent_at",since).order("sent_at",{ascending:false}).limit(max); if(em.error)throw em.error;
  const rows=arr<any>(em.data), ids=rows.map(x=>text(x.gmail_message_id)).filter(Boolean); let attachments:any[]=[];
  for(let i=0;i<ids.length;i+=100){const q=await db.from("project_attachment_links").select("id,gmail_message_id,attachment_name,analysis_status,extracted_text").in("gmail_message_id",ids.slice(i,i+100)).in("analysis_status",["analyzed","complete","local_ocr_complete"]).limit(3000);if(q.error)throw q.error;attachments.push(...arr(q.data));}
  const offerCurrent=await existingStatuses("supplier_offer_candidates",rows.map(x=>`offer:email:${x.gmail_message_id}`));
  const invoiceCurrent=await existingStatuses("invoice_candidates",rows.map(x=>`invoice:email:${x.gmail_message_id}`));
  const summary:any={checked:rows.length,supplier_messages:0,offer_candidates:0,invoice_candidates:0,created:0,updated:0,protected:0,rfq_replies_reconciled:0,items:[]};
  const counts=new Map<string,{offer:number,invoice:number}>();
  for(const m of rows){
    const sender=emailOf(m.from_email); if(!sender||!sup.emails.has(sender))continue; summary.supplier_messages++;
    const aa=attachments.filter(x=>text(x.gmail_message_id)===text(m.gmail_message_id)); const raw=clip([m.subject,m.snippet,...aa.map(x=>x.extracted_text)].filter(Boolean).join("\n\n")); if(!raw)continue;
    const pid=text(m.project_id), name=sup.names.get(sender)||text(m.from_name)||sender, inv=invoiceSignal(raw), off=offerSignal(raw); let c=counts.get(pid);if(!c){c={offer:0,invoice:0};counts.set(pid,c);}
    if(inv>=50){const ex=invoiceExtract(raw),key=`invoice:email:${m.gmail_message_id}`,action=await upsertReview("invoice_candidates",{candidate_key:key,project_id:pid,gmail_message_id:m.gmail_message_id,attachment_link_ids:aa.map(x=>x.id),party_name:name,party_email:sender,direction:"incoming",subject:m.subject||null,extracted:{...ex,source_sent_at:m.sent_at,source_attachment_names:aa.map(x=>x.attachment_name),warnings:["Kandidat automatik: verifiko numrin, totalin, VAT dhe afatin në dokumentin origjinal para aprovimit."]},raw_text:raw,confidence:Math.min(98,45+inv),status:"review",updated_at:new Date().toISOString()},invoiceCurrent);summary.invoice_candidates++;summary[action]=(summary[action]||0)+1;c.invoice++;continue;}
    if(off>=35){const ex=offerExtract(raw),match=await matchRfq(pid,sender,text(m.sent_at));if(await reconcileReply(match,text(m.sent_at)))summary.rfq_replies_reconciled++;const key=`offer:email:${m.gmail_message_id}`,action=await upsertReview("supplier_offer_candidates",{candidate_key:key,project_id:pid,gmail_message_id:m.gmail_message_id,attachment_link_ids:aa.map(x=>x.id),supplier_name:name,supplier_email:sender,subject:m.subject||null,source_kind:aa.length?"email_attachment":"email",matched_rfq_id:match?.id||null,extracted:{...ex,source_sent_at:m.sent_at,source_attachment_names:aa.map(x=>x.attachment_name),warnings:["Kandidat automatik: verifiko scope-in, valutën, sasitë, çmimet dhe kushtet para aprovimit."]},raw_text:raw,confidence:Math.min(98,40+off),status:"review",updated_at:new Date().toISOString()},offerCurrent);summary.offer_candidates++;summary[action]=(summary[action]||0)+1;c.offer++;summary.items.push({kind:"offer",gmail_message_id:m.gmail_message_id,matched_rfq_id:match?.id||null,extracted:ex});}
  }
  for(const [pid,c] of counts){if(c.offer)await reviewTask(pid,"offer",c.offer);if(c.invoice)await reviewTask(pid,"invoice",c.invoice);}
  return summary;
}

Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:H});if(!(await authorized(req)))return new Response(JSON.stringify({ok:false,error:"unauthorized"}),{status:401,headers:H});try{const u=new URL(req.url);let p:any={};if(req.method==="POST")try{p=await req.json();}catch{}const res=await run(Number(u.searchParams.get("limit")||p.limit||250));return new Response(JSON.stringify({ok:true,...res}),{headers:H});}catch(e){return new Response(JSON.stringify({ok:false,error:text((e as any)?.message||e)}),{status:500,headers:H});}});
