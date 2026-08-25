const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const allowedSources = new Set(['chatgpt','email','phone','document','system','user','api','other']);
const allowedEvidence = new Set(['unverified','observed','verbal','documented','confirmed']);
const allowedFactStatus = new Set(['observed','suggested']);

type FactInput = {
  fact_key: string;
  category?: string;
  subject?: string | null;
  value?: unknown;
  value_json?: string;
  evidence_status?: string;
  confidence?: number | null;
  fact_status?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}
function text(v: unknown, max = 4000) {
  return String(v == null ? '' : v).trim().slice(0, max);
}
function clampConfidence(v: unknown) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}
function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  const obj = value as Record<string, unknown>;
  return '{' + Object.keys(obj).sort().map(k => JSON.stringify(k) + ':' + stableJson(obj[k])).join(',') + '}';
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function restHeaders(auth: string, anonKey: string) {
  return { 'apikey': anonKey, 'Authorization': auth, 'Content-Type': 'application/json' };
}
async function restJson(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const bodyText = await res.text();
  let body: any = null;
  try { body = bodyText ? JSON.parse(bodyText) : null; } catch { body = bodyText; }
  if (!res.ok) throw new Error(`Database request failed (${res.status}): ${typeof body === 'string' ? body.slice(0,300) : JSON.stringify(body).slice(0,300)}`);
  return body;
}
function normalizeFact(raw: FactInput): FactInput {
  const factKey = text(raw?.fact_key, 240);
  if (!factKey) throw new Error('Every fact requires fact_key');
  const evidence = allowedEvidence.has(text(raw?.evidence_status)) ? text(raw.evidence_status) : 'unverified';
  const status = allowedFactStatus.has(text(raw?.fact_status)) ? text(raw.fact_status) : 'observed';
  let value: unknown = raw?.value;
  if (value === undefined && typeof raw?.value_json === 'string') {
    try { value = JSON.parse(raw.value_json); } catch { value = raw.value_json; }
  }
  if (value === undefined) value = null;
  return {
    fact_key: factKey,
    category: text(raw?.category || 'general', 120) || 'general',
    subject: text(raw?.subject, 300) || null,
    value,
    evidence_status: evidence,
    confidence: clampConfidence(raw?.confidence),
    fact_status: status,
  };
}

async function extractWithOpenAI(content: string, project: any, currentFacts: any[]) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return { configured: false, facts: [] as FactInput[] };
  const model = Deno.env.get('OPENAI_CONTEXT_MODEL') || 'gpt-5.4-mini';
  const context = currentFacts.slice(0, 60).map(f => ({
    fact_key: f.fact_key,
    category: f.category,
    value: f.value,
    evidence_status: f.evidence_status,
    source_type: f.source_type,
  }));
  const instructions = `You extract durable business facts for PRISTEEL PPPP. Return only facts that are explicitly supported by the supplied text or clearly framed as suggestions. Do not create approvals or commitments. Never approve or send an external email, choose a final client selling price or margin, commit a supplier, create a PO or contract, mark a project won/lost, or convert an assumption into a confirmed fact. Use fact_status=observed for statements present in the source and suggested only for proposed assumptions/plans. Evidence must reflect the source: verbal only when the text says phone/verbal; documented only when there is documentary evidence; confirmed only when explicitly confirmed. value_json must itself be a valid JSON-encoded value such as {"amount":1.85,"currency":"EUR","unit":"kg"}, [6,9,12], true, or "text".`;
  const userInput = `Project:\n${JSON.stringify(project)}\n\nCurrent canonical context (do not repeat unchanged facts unless the new source materially updates them):\n${JSON.stringify(context)}\n\nSource text to extract:\n${content}`;
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      facts: {
        type: 'array',
        maxItems: 40,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            fact_key: { type: 'string', minLength: 1, maxLength: 240 },
            category: { type: 'string', minLength: 1, maxLength: 120 },
            subject: { type: ['string','null'], maxLength: 300 },
            value_json: { type: 'string', minLength: 1, maxLength: 8000 },
            evidence_status: { type: 'string', enum: ['unverified','observed','verbal','documented','confirmed'] },
            confidence: { type: ['number','null'], minimum: 0, maximum: 1 },
            fact_status: { type: 'string', enum: ['observed','suggested'] },
          },
          required: ['fact_key','category','subject','value_json','evidence_status','confidence','fact_status'],
        },
      },
    },
    required: ['facts'],
  };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: { effort: 'low' },
      instructions,
      input: [{ role: 'user', content: [{ type: 'input_text', text: userInput }] }],
      text: { format: { type: 'json_schema', name: 'pppp_project_context_facts', strict: true, schema } },
    }),
  });
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status}): ${raw.slice(0,500)}`);
  const outputText = data?.output_text || (Array.isArray(data?.output) ? data.output.flatMap((o:any) => Array.isArray(o?.content) ? o.content : []).find((c:any) => c?.type === 'output_text')?.text : null);
  if (!outputText) throw new Error('OpenAI returned no structured output');
  const parsed = JSON.parse(outputText);
  return { configured: true, model: data?.model || model, response_id: data?.id || null, facts: Array.isArray(parsed?.facts) ? parsed.facts : [] };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  try {
    const auth = req.headers.get('Authorization') || '';
    if (!auth.toLowerCase().startsWith('bearer ')) return json({ ok: false, error: 'unauthorized' }, 401);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    if (!supabaseUrl || !anonKey) return json({ ok: false, error: 'supabase_environment_missing' }, 500);
    const body = await req.json().catch(() => ({}));
    const projectId = text(body?.project_id, 80);
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) return json({ ok: false, error: 'valid_project_id_required' }, 400);
    const headers = restHeaders(auth, anonKey);
    const projects = await restJson(`${supabaseUrl}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=id,name,client,reference,status,pipeline_stage,operational_state&limit=1`, { headers });
    const project = Array.isArray(projects) ? projects[0] : null;
    if (!project) return json({ ok: false, error: 'project_not_found_or_not_visible' }, 404);
    const sourceType = allowedSources.has(text(body?.source_type)) ? text(body.source_type) : 'api';
    const sourceRef = text(body?.source_ref, 500) || `pppp-openai-context:${new Date().toISOString()}`;
    let candidates: FactInput[] = [];
    let provider: any = { mode: 'direct' };
    if (Array.isArray(body?.facts)) {
      if (body.facts.length > 60) return json({ ok: false, error: 'too_many_facts' }, 413);
      candidates = body.facts;
    } else {
      const content = text(body?.content, 50000);
      if (!content) return json({ ok: false, error: 'content_or_facts_required' }, 400);
      const current = await restJson(`${supabaseUrl}/rest/v1/pppp_project_context_current_v?project_id=eq.${encodeURIComponent(projectId)}&select=fact_key,category,value,evidence_status,source_type&order=updated_at.desc&limit=60`, { headers });
      const extracted = await extractWithOpenAI(content, project, Array.isArray(current) ? current : []);
      if (!extracted.configured) return json({ ok: false, reason: 'provider_unconfigured', provider: 'openai', required_secret: 'OPENAI_API_KEY' }, 503);
      candidates = extracted.facts;
      provider = { mode: 'openai', model: extracted.model, response_id: extracted.response_id };
    }
    const inserted: any[] = [];
    for (const rawFact of candidates) {
      const fact = normalizeFact(rawFact);
      const idemHash = await sha256(`${projectId}|${sourceRef}|${fact.fact_key}|${stableJson(fact.value)}`);
      const rpcBody = {
        p_project_id: projectId,
        p_fact_key: fact.fact_key,
        p_value: fact.value,
        p_category: fact.category,
        p_subject: fact.subject,
        p_source_type: sourceType,
        p_source_ref: sourceRef,
        p_evidence_status: fact.evidence_status,
        p_confidence: fact.confidence,
        p_fact_status: fact.fact_status,
        p_idempotency_key: `context:${idemHash}`,
        p_created_by: sourceType === 'chatgpt' ? 'chatgpt_pppp_bridge' : 'pppp_context_bridge',
      };
      const id = await restJson(`${supabaseUrl}/rest/v1/rpc/pppp_ingest_context_fact_v1`, { method: 'POST', headers, body: JSON.stringify(rpcBody) });
      inserted.push({ id, fact_key: fact.fact_key, fact_status: fact.fact_status, evidence_status: fact.evidence_status });
    }
    return json({ ok: true, project: { id: project.id, name: project.name }, provider, inserted_count: inserted.length, facts: inserted });
  } catch (error) {
    console.error('pppp-openai-context', error);
    return json({ ok: false, error: 'context_bridge_failed', message: String(error?.message || error).slice(0,800) }, 500);
  }
});
