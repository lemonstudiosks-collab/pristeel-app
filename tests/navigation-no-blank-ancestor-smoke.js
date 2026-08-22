const fs=require('fs');
const assert=require('assert');
const source=fs.readFileSync('pristeel-project-workflow-legacy-capture-v1.js','utf8');

/* The 2026-08-22 production regression was not a data failure. A project-only
 * cleanup layer tagged a common global ancestor and CSS hid it while the
 * project page was active. Keep this explicit guard even if implementation
 * details change later. */
const forbidden=[
  'findGlobalProjectStrip',
  'pwf-global-project-strip',
  'body:has(#page-workspace-project.active)',
  "document.querySelectorAll('button')"
];
forbidden.forEach(x=>assert(!source.includes(x),`Blank-screen regression pattern returned: ${x}`));
assert(source.includes("document.getElementById('page-workspace-project')"),'Project cleanup must have an explicit local root');
assert(source.includes('p.querySelectorAll(\'.flow-step\')'),'Legacy ribbon discovery must be scoped to the project root');
console.log('Blank-screen ancestor regression guard passed.');
