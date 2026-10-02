import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('pristeel-home-operator-dashboard-v1.js','utf8');
assert(!/supaFetch\s*\(|MutationObserver\s*\(|setInterval\s*\(/.test(source),'Home operator dashboard must stay snapshot-driven and event-driven');
assert(!source.includes('Vazhdo aty ku e le'),'Broken resume surface must stay removed');
assert(!source.includes('Projektet aktive'),'Generic active-project strip must stay removed');
[
  'Pyet PPPP',
  'Aktivitetet që kërkojnë vëmendjen tënde',
  'Aktivitetet e fundit',
  'Afatet e ardhshme',
  'Në pritje nga të tjerët',
  'Financa kërkon vëmendje',
  'Mundësi të reja'
].forEach(label=>assert(source.includes(label),'Missing Home section: '+label));
assert(source.includes('pst-live-command-shell'),'Existing Ask PPPP shell must be preserved');
assert(source.includes('PSTHomeCanonicalV1'),'Canonical Home must remain the data owner');
assert(source.includes('PSTFinanceDailyV1'),'Finance rows must delegate to the existing Finance owner');
assert(source.includes('PSTProjectCentricWorkflowV1'),'Opportunity rows must delegate to the existing Opportunities owner');
assert(source.includes('translateY(-2px)')&&source.includes('box-shadow'),'Interactive cards must keep hover/focus lift feedback');
console.log('Home operator dashboard static smoke: PASS');
