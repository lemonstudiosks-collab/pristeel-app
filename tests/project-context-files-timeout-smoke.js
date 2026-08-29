const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><html><head></head><body>
<select id="global-proj"></select>
</body></html>`, { url: 'https://example.test' });
const { window } = dom;
window.__pstProjectReadWait = 20;
window.console = console;
window.PSTProjectDataIntegrity = {
  load: async () => ({
    project: { id: 'p1', name: 'Project One', client: 'Client One', ref: 'REF-1' },
    docs: [], offers: [], projectDocs: [], attachmentLinks: [], inboxDocs: [],
    drive: { rows: [] }, mailAttachments: []
  }),
  safe: () => new Promise(() => {})
};

const context = vm.createContext(window);
context.window = window;
context.document = window.document;
context.localStorage = window.localStorage;
context.setTimeout = setTimeout;
context.clearTimeout = clearTimeout;
context.console = console;
context.Promise = Promise;
context.URL = URL;

vm.runInContext(fs.readFileSync('pristeel-project-context-navigation-v1.js', 'utf8'), context, {
  filename: 'pristeel-project-context-navigation-v1.js'
});

const started = Date.now();
window.PSTProjectDataIntegrity.load('p1').then((data) => {
  const elapsed = Date.now() - started;
  if (elapsed > 250) throw new Error(`optional files enrichment blocked project load for ${elapsed}ms`);
  if (!data || !data.project || data.project.id !== 'p1') throw new Error('core project data was not preserved');
  if (!Array.isArray(data.databaseFiles) || data.databaseFiles.length !== 0) throw new Error('timed out optional files read must fall back to []');
  console.log('project-context-files-timeout-smoke: ok');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
