const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async () => {
  const source = fs.readFileSync('pristeel-business-command-center-v1.js', 'utf8');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source), 'Command center must not poll or observe the platform');
  assert(!/supaFetch\([^)]*,\s*['\"](?:POST|PATCH|DELETE)/i.test(source), 'Command center must remain read-only');
  assert(!/(?:window\.)?(?:pstOpenProjectWorkspace|authGetSession|doLogin|PSTEmail)\s*=/.test(source), 'Command center must not replace project, login or Gmail functions');
  assert(source.includes('window.openCmdK='), 'Global search entry point is missing');

  const dom = new JSDOM(`<!doctype html><html><head></head><body class="pst-ui-v2">
    <div id="pst-ws-sidebar"><button class="pst-ws-search">Kërko</button></div>
    <div id="page-workspace-home" style="display:block">
      <div class="pst-ws-page">
        <div class="pst-ws-head">
          <div><div class="pst-ws-sub">Old subtitle</div></div>
          <div class="pst-ws-actions"><button onclick="pstWsSearch()">Kërko</button></div>
        </div>
        <div class="pst-ws-quick"><button>Projekt</button><button>Ofertë</button><button>Faturë</button><button>Detyrë</button><button>Inbox</button></div>
        <div class="pst-ws-homegrid">
          <section class="pst-ws-card"><div class="pst-ws-card-title">Për mua sot</div><div class="pst-ws-card-sub">Old</div></section>
          <section class="pst-ws-card"><div class="pst-ws-card-title">Vazhdo punën</div><div class="pst-ws-card-sub">Old</div></section>
        </div>
      </div>
    </div>
  </body></html>`, { runScripts: 'outside-only', url: 'https://example.test/' });

  const w = dom.window;
  w.pstOpenProjectWorkspace = () => {};
  w.open = () => ({ focus() {} });
  w.supaFetch = async path => {
    if (path.startsWith('projects?')) return [{ id:'p1', name:'Geiger Maschinenhaus', client:'Geiger', ref:'GEI-001', status:'aktiv' }];
    if (path.startsWith('project_emails?')) return [{ id:'e1', gmail_message_id:'m1', gmail_thread_id:'t1', project_id:'p1', subject:'Freight and price clarification', snippet:'Freight costs are covered separately by the buyer.', from_name:'Florian Kern', from_email:'florian@example.com', sent_at:'2026-08-01T10:00:00Z' }];
    if (path.startsWith('project_email_links?')) return [];
    if (path.startsWith('contacts?')) return [{ id:'c1', person:'Florian Kern', email:'florian@example.com', company:'Geiger', role:'Procurement' }];
    if (path.startsWith('project_contacts?')) return [{ project_id:'p1', email:'florian@example.com' }];
    if (path.startsWith('documents_registry?')) return [{ id:'d1', project_id:'p1', doc_nr:'GEI-Q-01', title:'Transport cost scope', description:'Delivery, freight and cost scope', drive_url:'https://drive.example/doc' }];
    if (path.startsWith('rfq_log?')) return [{ id:'rfq1', project_id:'p1', rfq_ref:'RFQ-GEI-01', subject:'Request for quotation for steel plates', supplier_name:'Steel Supplier' }];
    if (path.startsWith('offers?')) return [{ id:'o1', project_id:'p1', reference:'OFF-GEI-02', title:'Angebot Montage und Fertigung', supplier:'Aktiva' }];
    if (path.startsWith('bom_items?')) return [{ id:'b1', project_id:'p1', item_name:'HEA steel profiles', description:'Bill of materials position' }];
    return [];
  };

  w.eval(source);
  assert(w.PSTBusinessCommandCenterV1, 'Command center API was not exported');
  assert.strictEqual(w.PSTBusinessCommandCenterV1.decorateHome(), true, 'Home decoration did not run');
  assert(w.document.getElementById('pst-bcc-home-search'), 'Prominent universal search was not added to home');
  assert(w.document.querySelector('.pst-bcc-old-search'), 'Duplicate small home search was not de-emphasized');
  assert(w.document.querySelector('.pst-bcc-sidebar-search'), 'Sidebar search was not highlighted');

  w.openCmdK();
  assert(w.document.getElementById('pst-bcc'), 'Search modal did not open');
  assert(w.document.getElementById('pst-bcc-input'), 'Search input is missing');

  const results = await w.PSTBusinessCommandCenterV1.search('transport cost', 'all');
  assert(results.some(r => r.type === 'email' && r.row.gmail_message_id === 'm1'), 'Cross-language keyword search did not find the relevant email');
  assert(results.some(r => r.type === 'document' && r.row.id === 'd1'), 'Universal search did not include project documents');
  assert(results.some(r => r.projectId === 'p1'), 'Search results lost the project relation');

  const requestResults = await w.PSTBusinessCommandCenterV1.search('kerkese per oferte', 'all');
  const rfq = requestResults.find(r => r.row.id === 'rfq1');
  assert(rfq, 'Albanian request-for-offer vocabulary did not find the RFQ record');
  assert(rfq.meta.includes('RFQ'), 'RFQ result was not identified clearly');

  const offerResults = await w.PSTBusinessCommandCenterV1.search('oferte montim', 'all');
  assert(offerResults.some(r => r.row.id === 'o1'), 'Offer vocabulary did not find the German supplier offer');

  const bomResults = await w.PSTBusinessCommandCenterV1.search('BOM profiles', 'all');
  assert(bomResults.some(r => r.row.id === 'b1'), 'BOM vocabulary or business record source is missing');

  const groups = w.PSTBusinessCommandCenterV1.tokenGroups('RFQ kërkesë ofertë');
  assert(groups.some(group => group.includes('request for quotation')), 'RFQ synonym family is missing');
  assert(groups.some(group => group.includes('request')), 'Request synonym family is missing');
  assert(groups.some(group => group.includes('angebot')), 'Offer synonym family is missing');

  const project = (await w.PSTBusinessCommandCenterV1.search('GEI-001', 'project'))[0];
  assert(project && project.projectId === 'p1', 'Project reference search failed');

  dom.window.close();
  console.log('Business command center isolation smoke test passed.');
})().catch(error => { console.error(error); process.exit(1); });
