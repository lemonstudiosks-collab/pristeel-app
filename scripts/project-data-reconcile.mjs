const SUPABASE_URL = process.env.SUPABASE_URL || 'https://isymxqfqzkchbsrbhucf.supabase.co';
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = String(process.env.APPLY || 'true').toLowerCase() === 'true';
if (!KEY) throw new Error('Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal'
};

const TABLES = [
  { name: 'documents_registry', select: '*' },
  { name: 'offers', select: '*' },
  { name: 'bom_items', select: '*' },
  { name: 'rfq_log', select: '*' },
  { name: 'project_docs', select: '*' },
  { name: 'project_attachment_links', select: '*' },
  { name: 'offers_inbox', select: '*' },
  { name: 'files', select: 'id,file_name,file_type,size_kb,created_at,project_id,page_context' }
];

function norm(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function identifiers(project) {
  const source = norm(`${project.name || ''} ${project.ref || ''}`);
  return unique(source.match(/\b(?:[a-z]{1,6}[-_\/]?)?\d{4,}(?:[-_\/]?[a-z0-9]+)*\b/g) || []);
}
function projectProfile(project) {
  return {
    ...project,
    nName: norm(project.name),
    nRef: norm(project.ref),
    ids: identifiers(project)
  };
}
function primitiveText(row) {
  return norm(Object.entries(row || {})
    .filter(([key, value]) => key !== 'file_base64' && value != null && typeof value !== 'object')
    .map(([, value]) => value).join(' '));
}
function dedicatedValues(row) {
  const keys = ['project','project_name','project_ref','ref','reference','rfq_ref','request_ref','title','subject','doc_nr','document_nr','file_name','filename'];
  return keys.map(key => norm(row?.[key])).filter(Boolean);
}
function score(row, project) {
  const dedicated = dedicatedValues(row);
  const text = primitiveText(row);
  let points = 0;
  if (project.nName && dedicated.some(v => v === project.nName)) points = Math.max(points, 1200);
  if (project.nRef && dedicated.some(v => v === project.nRef)) points = Math.max(points, 1180);
  if (project.nRef && project.nRef.length >= 4 && dedicated.some(v => v.includes(project.nRef))) points = Math.max(points, 1050);
  if (project.nName && project.nName.length >= 7 && dedicated.some(v => v.includes(project.nName) || project.nName.includes(v))) points = Math.max(points, 980);
  if (project.ids.some(id => dedicated.some(v => v.includes(id)))) points = Math.max(points, 960);
  if (project.ids.some(id => text.includes(id))) points = Math.max(points, 900);
  if (project.nRef && project.nRef.length >= 4 && text.includes(project.nRef)) points = Math.max(points, 850);
  if (project.nName && project.nName.length >= 10 && text.includes(project.nName)) points = Math.max(points, 820);
  return points;
}

async function request(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  if (response.status === 204) return [];
  return response.json();
}
async function fetchAll(table, select = '*') {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const batch = await request(`${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${offset}`, { method: 'GET' });
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}
async function patchProjectId(table, id, projectId) {
  await request(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ project_id: projectId }) });
}

const projects = (await fetchAll('projects', 'id,name,client,ref,status,created_at')).map(projectProfile);
const validProjectIds = new Set(projects.map(p => String(p.id)));
const report = { projects: projects.length, applied: [], unresolved: [], conflicts: [], tables: {} };

for (const table of TABLES) {
  let rows;
  try {
    rows = await fetchAll(table.name, table.select);
  } catch (error) {
    report.tables[table.name] = { error: error.message };
    continue;
  }
  const stats = { total: rows.length, alreadyLinked: 0, repaired: 0, unresolved: 0, conflicts: 0 };
  for (const row of rows) {
    const current = row.project_id == null ? '' : String(row.project_id);
    const ranked = projects
      .map(project => ({ project, score: score(row, project) }))
      .filter(item => item.score >= 820)
      .sort((a, b) => b.score - a.score);

    if (current && validProjectIds.has(current)) {
      stats.alreadyLinked++;
      if (ranked.length && String(ranked[0].project.id) !== current && ranked[0].score >= 960) {
        stats.conflicts++;
        report.conflicts.push({ table: table.name, id: row.id, currentProjectId: current, suggestedProjectId: ranked[0].project.id, score: ranked[0].score });
      }
      continue;
    }

    const best = ranked[0];
    const second = ranked[1];
    const safe = best && (!second || best.score - second.score >= 100);
    if (!safe) {
      stats.unresolved++;
      report.unresolved.push({ table: table.name, id: row.id, label: row.doc_nr || row.file_name || row.subject || row.title || row.project || row.project_name || '', candidates: ranked.slice(0, 3).map(x => ({ id: x.project.id, name: x.project.name, score: x.score })) });
      continue;
    }

    if (APPLY) await patchProjectId(table.name, row.id, best.project.id);
    stats.repaired++;
    report.applied.push({ table: table.name, id: row.id, projectId: best.project.id, project: best.project.name, score: best.score });
  }
  report.tables[table.name] = stats;
}

console.log(JSON.stringify(report, null, 2));
console.log(`PROJECT_RECONCILE_SUMMARY projects=${report.projects} applied=${report.applied.length} unresolved=${report.unresolved.length} conflicts=${report.conflicts.length}`);
