'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const guardSource = fs.readFileSync('pristeel-home-runtime-owner-guard-v1.js', 'utf8');
const rolesSource = fs.readFileSync('pristeel-roles.js', 'utf8');

assert(
  rolesSource.indexOf('pristeel-home-runtime-owner-guard-v1.js') !== -1,
  'RBAC/bootstrap loader must load the Home runtime owner guard'
);
assert(
  rolesSource.indexOf('pristeel-home-runtime-owner-guard-v1.js') < rolesSource.indexOf('pristeel-project-emails.js'),
  'Home runtime owner guard must be requested before the ordered runtime bootstrap'
);

const listeners = Object.create(null);
const nodes = {
  'page-workspace-home': {},
  'pst-ws-home-actions': {},
  'pst-ws-home-projects': {}
};
let canonicalScript = null;
let legacyCalls = [];
let canonicalRenders = 0;
let canonicalActivations = 0;
let capturedLegacyDuringCanonicalLoad = null;

const document = {
  getElementById(id) { return nodes[id] || null; },
  querySelector(sel) {
    if (sel === 'script[data-pst-home-canonical-v1]') return canonicalScript;
    return null;
  },
  createElement(tag) {
    assert.strictEqual(tag, 'script');
    return {
      attrs: {},
      addEventListener() {},
      setAttribute(k, v) { this.attrs[k] = v; }
    };
  },
  head: {
    appendChild(script) {
      canonicalScript = script;
      setTimeout(() => {
        capturedLegacyDuringCanonicalLoad = context.window.pstWorkspaceGo;
        context.window.pstWorkspaceGo = function canonicalGo() {
          throw new Error('Guard must remain the public Home router');
        };
        context.window.PSTHomeCanonicalV1 = {
          activateHome() { canonicalActivations += 1; },
          render() { canonicalRenders += 1; return Promise.resolve(true); }
        };
        if (typeof script.onload === 'function') script.onload();
      }, 0);
    }
  },
  addEventListener(name, fn) { listeners[name] = fn; }
};

const context = vm.createContext({
  console,
  document,
  setTimeout,
  clearTimeout,
  Promise
});
context.window = context;

vm.runInContext(guardSource, context, { filename: 'pristeel-home-runtime-owner-guard-v1.js' });

function workspaceGo(key) {
  legacyCalls.push(String(key || 'home'));
  return 'legacy:' + String(key || 'home');
}
context.window.pstWorkspaceGo = workspaceGo;

(async function run() {
  await new Promise(resolve => setTimeout(resolve, 20));

  assert.strictEqual(
    capturedLegacyDuringCanonicalLoad,
    workspaceGo,
    'Canonical must capture the real Workspace router while it loads'
  );

  const beforeReady = context.window.pstWorkspaceGo('home');
  assert.strictEqual(beforeReady, 'legacy:home', 'Workspace may build the Home shell before modules-ready');
  assert.strictEqual(legacyCalls.filter(x => x === 'home').length, 1);

  assert(listeners['pst:modules-ready'], 'Guard must listen for the real bootstrap completion event');
  listeners['pst:modules-ready']();
  await new Promise(resolve => setTimeout(resolve, 220));

  assert(canonicalRenders >= 1, 'Canonical Home must render after modules-ready');
  assert(canonicalActivations >= 1, 'Canonical Home must activate its Home page after modules-ready');

  const legacyHomeCount = legacyCalls.filter(x => x === 'home').length;
  context.window.pstWorkspaceGo('home');
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.strictEqual(
    legacyCalls.filter(x => x === 'home').length,
    legacyHomeCount,
    'After modules-ready, Home must never route back to Workspace legacy renderHome'
  );
  assert(canonicalRenders >= 2, 'Later Home navigation must render Canonical directly');

  context.window.pstWorkspaceGo('projects');
  assert.strictEqual(legacyCalls[legacyCalls.length - 1], 'projects', 'Non-Home Workspace routes must remain intact');

  console.log('Home runtime owner guard smoke: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
