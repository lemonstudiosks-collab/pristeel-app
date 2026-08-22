const fs=require('fs');
const assert=require('assert');

const matrix=fs.readFileSync('docs/NAVIGATION_TEST_MATRIX.md','utf8');
const canonical=fs.readFileSync('pristeel-project-workflow-canonical-v1.js','utf8');
const release=fs.readFileSync('pristeel-workspace-release-fix-v3.js','utf8');
const integrity=fs.readFileSync('pristeel-project-integrity-ui-v1.js','utf8');

[
  'Home','Projektet','Hap projektin','Përmbledhja','Prokurimi','Ekzekutimi','Financat','Skedarët','Komunikimi',
  'BOM','RFQ','Ofertat e furnitorëve','Krahasimi i ofertave','Çmimi i shitjes','Oferta për klientin','Detaje'
].forEach(label=>assert(matrix.includes(label),`Navigation matrix missing ${label}`));

assert(/if\(key==='projects'\)return renderProjects\(\)/.test(release),'Projects route must render a concrete Projects surface');
assert(/activate\('page-workspace-projects'\)/.test(release),'Projects renderer must activate page-workspace-projects');
assert(/window\.pstReleaseOpenProject/.test(release)&&/pstOpenProjectWorkspace/.test(release),'Projects rows must enter canonical Project Workspace');
assert(/window\.pstOpenProjectWorkspace=async function/.test(integrity),'Project Workspace must have one explicit async entrypoint');
assert(/activate\(\)/.test(integrity),'Project entrypoint must activate a visible project page');
assert(/emptyState\(/.test(canonical),'Canonical procurement stages must have explicit empty-state support');
['bom','rfq','offers','comparison','pricing','client_offer'].forEach(stage=>assert(canonical.includes(`'${stage}'`),`Canonical workflow missing ${stage}`));
console.log('Navigation release surface guard passed.');
