const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async () => {
  const html = '<!doctype html><html><head></head><body>' +
    '<div class="pst-pi-stat"><b>1</b><span>Kontakte</span></div>' +
    '<section class="pst-pi-card"><div class="pst-pi-hd"><div><b>Kontaktet</b><small></small></div></div><div class="pst-pi-body"></div></section>' +
    '</body></html>';
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test/' });
  const w = dom.window;
  w.__pstCurrentProjectId = 'p1';
  w.__pstIntegrityLastData = {
    project: { id: 'p1', name: 'Project One' },
    contacts: [{ email: 'ana@example.com', name: 'Ana Project', email_count: 4 }],
    emails: [{ from_email: 'ana@example.com', from_name: 'Ana Project', sent_at: '2026-08-05T10:00:00Z', to_emails: [], cc_emails: [] }]
  };
  w.supaFetch = async path => {
    if (path.startsWith('project_contacts?')) return [{ project_id: 'p1', email: 'ana@example.com', role: 'Project Manager', is_primary: true }];
    if (path.startsWith('contacts?')) return [
      { email: 'ana@example.com', person: 'Ana Complete', company: 'Example GmbH', phone: '+49 123 456', address: 'Main Street 4', city: 'Berlin', country: 'Germany', website: 'example.com', linkedin_url: 'https://linkedin.com/in/ana' },
      { email: 'unrelated@other.com', person: 'Unrelated Person', phone: '+1 999' }
    ];
    return [];
  };

  const source = fs.readFileSync('pristeel-project-contacts-full-v1.js', 'utf8');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source), 'Contacts module must not use observers or intervals');
  w.eval(source);
  w.document.querySelector('.pst-pi-stat').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 25));

  const text = w.document.querySelector('.pst-pi-body').textContent;
  assert(text.includes('Ana Project'), 'Project contact was not shown');
  assert(text.includes('Project Manager'), 'Project-specific role was not preserved');
  assert(text.includes('+49 123 456'), 'Phone was not enriched');
  assert(text.includes('Main Street 4'), 'Address was not enriched');
  assert(text.includes('Germany'), 'Country was not enriched');
  assert(text.includes('LinkedIn'), 'LinkedIn action was not shown');
  assert(!text.includes('Unrelated Person'), 'Unrelated global contact leaked into the project');
  console.log('Full project contacts smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
