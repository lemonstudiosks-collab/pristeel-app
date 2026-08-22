const fs=require('fs');
const assert=require('assert');

const capture=fs.readFileSync('pristeel-project-workflow-legacy-capture-v1.js','utf8');
const canonical=fs.readFileSync('pristeel-project-workflow-canonical-v1.js','utf8');
const home=fs.readFileSync('pristeel-home-canonical-v1.js','utf8');
const guard=fs.readFileSync('pristeel-home-runtime-owner-guard-v1.js','utf8');
const release=fs.readFileSync('pristeel-workspace-release-fix-v3.js','utf8');

assert(!/findGlobalProjectStrip|pwf-global-project-strip/.test(capture),'Global project ancestor discovery is forbidden');
assert(!/body:has\(#page-workspace-project\.active\)/.test(capture),'Project CSS may not hide outer app ancestors');
assert(/function insideWorkspace\(/.test(capture),'Project click interception must enforce workspace scope');
assert(/data-pf2-offer-detail/.test(capture),'Inline supplier detail contract must remain protected');
assert(/if\(key==='projects'\)return renderProjects\(\)/.test(release),'Release router must own deterministic Projects navigation');
assert(/function go\(key\)[\s\S]*return legacyGo\?legacyGo\.apply/.test(home),'Canonical Home must delegate non-Home routes');
assert(/function finalGo\(key\)[\s\S]*return routerBase\.apply/.test(guard),'Final Home wrapper must delegate non-Home routes');
assert(/pstOpenProjectWorkspace/.test(home),'Home project actions must enter the canonical project opener');
assert(/installOpenBridge/.test(canonical)&&/base\.open=window\.pstOpenProjectWorkspace/.test(canonical),'Canonical project workflow must wrap the single project opener instead of replacing it');
assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(capture),'Project navigation may not win races by observing/polling globally');
console.log('Static navigation ownership guard passed.');
