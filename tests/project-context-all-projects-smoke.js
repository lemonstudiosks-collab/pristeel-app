const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><html><body>
<select id="global-proj"></select>
<input id="i-projname"><input id="i-client"><input id="i-ref"><span id="proj-badge"></span>
</body></html>`, { runScripts: 'outside-only', url: 'https://example.test/' });
const w = dom.window;
w.console = console;
w.open = () => {};

const projects = {
  airbus: { id:'airbus', name:'260784_Airbus H24X_Anfrage Fertigung', client:'Stacon', ref:'260784' },
  stacon22: { id:'stacon22', name:'STACON D-22/26', client:'Stacon', ref:'D-22/26' },
  geiger: { id:'geiger', name:'Geiger Schluesselfertigbau', client:'Geiger', ref:'PST-GEI-001/26' },
  tennet: { id:'tennet', name:'PROJEKT TENNET - SPIE', client:'SPIE', ref:'TENNET' }
};

const docs = [
  { id:'q-airbus', series:'QUO', doc_nr:'Q-AIRBUS', project:'260784 Airbus H24X Anfrage Fertigung' },
  { id:'q-stacon22', series:'QUO', doc_nr:'D-22/26', project:'STACON D-22/26' },
  { id:'q-stacon23', series:'QUO', doc_nr:'D-23/26', project:'STACON D-23/26' },
  { id:'q-geiger', series:'QUO', doc_nr:'PST-GEI-001/26', project:'Geiger Schluesselfertigbau PST-GEI-001/26' },
  { id:'q-tennet', series:'QUO', doc_nr:'TENNET-Q', project:'PROJEKT TENNET SPIE' },
  { id:'q-direct-airbus', series:'QUO', doc_nr:'AIRBUS-DIRECT', project_id:'airbus' },
  { id:'q-direct-geiger', series:'QUO', doc_nr:'GEIGER-DIRECT', project_id:'geiger' }
];

const files = {
  airbus:[{id:'f-airbus',file_name:'260784 drawing.pdf',project_id:'airbus'}],
  stacon22:[{id:'f-stacon22',file_name:'D-22-26 contract.pdf',project_id:'stacon22'}],
  geiger:[{id:'f-geiger',file_name:'PST-GEI-001-26 drawing.pdf',project_id:'geiger'}],
  tennet:[{id:'f-tennet',file_name:'TENNET specification.pdf',project_id:'tennet'}]
};

w.PSTProjectDataIntegrity = {
  safe: async path => {
    const m = path.match(/^files\?project_id=eq\.([^&]+)/);
    return m ? (files[decodeURIComponent(m[1])] || []) : [];
  },
  load: async id => ({
    project: projects[id],
    docs: docs.slice(),
    offers: [], projectDocs: [], attachmentLinks: [], inboxDocs: [],
    drive:{rows:[],state:'no-folder'}, mailAttachments:[], ourOffers:[], supplierOffers:[], files:[]
  })
};
w.__pstWorkspaceLegacy = { showPage: () => {} };
w.eval(fs.readFileSync('pristeel-project-context-navigation-v1.js','utf8'));

(async () => {
  const expected = {
    airbus:['q-airbus','q-direct-airbus'],
    stacon22:['q-stacon22'],
    geiger:['q-geiger','q-direct-geiger'],
    tennet:['q-tennet']
  };
  for (const id of Object.keys(projects)) {
    const data = await w.PSTProjectDataIntegrity.load(id);
    assert.deepStrictEqual(
      data.ourOffers.map(x=>x.id).sort(),
      expected[id].slice().sort(),
      `Wrong offers leaked into project ${id}`
    );
    assert.deepStrictEqual(
      data.databaseFiles.map(x=>x.id),
      [files[id][0].id],
      `Wrong file metadata loaded for project ${id}`
    );
    assert.strictEqual(w.document.getElementById('global-proj').value,id,`Active project was not switched to ${id}`);
    assert.strictEqual(w.document.getElementById('i-projname').value,projects[id].name);
  }
  console.log('All-project isolation smoke test passed.');
  dom.window.close();
})().catch(error=>{console.error(error);dom.window.close();process.exit(1);});
