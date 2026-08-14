import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) {
  if (!condition) throw new Error(`AI REQUEST API SMOKE FAILED: ${message}`);
}

const store = new Map();
globalThis.localStorage = {
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, String(value)); },
  removeItem(key) { store.delete(key); }
};

globalThis.document = {
  readyState: 'complete',
  activeElement: null,
  getElementById() { return null; },
  addEventListener() {}
};
globalThis.window = globalThis;

let calls = [];
let nativeMode = 'normal';
globalThis.fetch = async function nativeFetchStub(url, init = {}) {
  calls.push({ url: String(url), init });
  if (String(url).includes('generativelanguage.googleapis.com')) {
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"route":"gemini"}' }] } }],
      usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2, totalTokenCount: 6 }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url).includes('api.groq.com/openai/v1/chat/completions')) {
    if (nativeMode === 'network-error') throw new Error('synthetic-network-error');
    if (nativeMode === 'http-error') {
      return new Response(JSON.stringify({ error: { message: 'synthetic-http-error' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (nativeMode === 'invalid-json-content') {
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'not-json' } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (nativeMode === 'empty-content') {
      return new Response(JSON.stringify({
        choices: [{ message: { content: '' } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      choices: [{ message: { content: '```json\n{"route":"legacy"}\n```' } }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  throw new Error(`Unexpected native fetch URL: ${url}`);
};

const source = fs.readFileSync('pristeel-groq-rate-limit.js', 'utf8');
vm.runInThisContext(source, { filename: 'pristeel-groq-rate-limit.js' });

assert(window.PSTAI, 'PSTAI was not initialized.');
assert(typeof window.PSTAI.hasApiKey === 'function', 'PSTAI.hasApiKey is missing.');
assert(typeof window.PSTAI.requestJson === 'function', 'PSTAI.requestJson is missing.');

localStorage.setItem('pristeel_groq_apikey', 'legacy-test-key');
assert(window.PSTAI.hasApiKey() === true, 'Dedicated Groq key was not detected.');
calls = [];
nativeMode = 'normal';
const legacy = await window.PSTAI.requestJson({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Return JSON.' }],
  temperature: 0,
  max_tokens: 2400,
  response_format: { type: 'json_object' }
});
assert(legacy && legacy.route === 'legacy', 'Legacy Groq-shaped route did not return parsed JSON.');
assert(calls.length === 1, `Legacy route expected 1 native request, got ${calls.length}.`);
assert(calls[0].url === 'https://api.groq.com/openai/v1/chat/completions', 'Legacy route used the wrong endpoint.');
assert(calls[0].init.headers && calls[0].init.headers.Authorization === 'Bearer legacy-test-key', 'Legacy Authorization header changed.');
const legacyBody = JSON.parse(calls[0].init.body);
assert(legacyBody.model === 'llama-3.3-70b-versatile', 'Legacy model shaping changed unexpectedly.');
assert(legacyBody.max_tokens === 2400, 'Legacy max_tokens changed unexpectedly.');

localStorage.setItem('pristeel_gemini_apikey', 'gemini-test-key');
localStorage.setItem('pristeel_gemini_model', 'gemini-3.1-flash-lite');
calls = [];
nativeMode = 'normal';
const gemini = await window.PSTAI.requestJson({
  model: 'llama-3.3-70b-versatile',
  messages: [
    { role: 'system', content: 'Return only JSON.' },
    { role: 'user', content: 'Return JSON.' }
  ],
  temperature: 0,
  max_tokens: 2400,
  response_format: { type: 'json_object' }
});
assert(gemini && gemini.route === 'gemini', 'Gemini compatibility route did not return parsed JSON.');
assert(calls.length === 1, `Gemini route expected 1 native request, got ${calls.length}.`);
assert(calls[0].url.includes('/gemini-3.1-flash-lite:generateContent'), 'Configured Gemini model was not used.');
assert(calls[0].init.headers && calls[0].init.headers['x-goog-api-key'] === 'gemini-test-key', 'Gemini API key header changed.');
const geminiBody = JSON.parse(calls[0].init.body);
assert(Array.isArray(geminiBody.contents) && geminiBody.contents.length === 1, 'Gemini user content mapping changed.');
assert(geminiBody.systemInstruction && geminiBody.systemInstruction.parts[0].text === 'Return only JSON.', 'Gemini system instruction mapping changed.');

localStorage.removeItem('pristeel_gemini_apikey');
localStorage.setItem('pristeel_groq_apikey', 'legacy-test-key');
for (const [mode, expectedCode] of [
  ['http-error', 'HTTP'],
  ['empty-content', 'EMPTY'],
  ['invalid-json-content', 'INVALID_JSON']
]) {
  nativeMode = mode;
  let caught = null;
  try {
    await window.PSTAI.requestJson({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: mode }] });
  } catch (error) {
    caught = error;
  }
  assert(caught && caught.pstAiCode === expectedCode, `${mode} did not produce typed ${expectedCode} error.`);
}

nativeMode = 'network-error';
let networkError = null;
try {
  await window.PSTAI.requestJson({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'network' }] });
} catch (error) {
  networkError = error;
}
assert(networkError && /synthetic-network-error/.test(String(networkError.message || networkError)), 'Network failure did not propagate.');
assert(!networkError.pstAiCode, 'Network failure was incorrectly converted into a soft typed response error.');

localStorage.removeItem('pristeel_groq_apikey');
assert(window.PSTAI.hasApiKey() === false, 'Missing real provider keys should report unavailable.');
let missingKeyError = null;
try {
  await window.PSTAI.requestJson({ messages: [] });
} catch (error) {
  missingKeyError = error;
}
assert(missingKeyError && /Mungon AI API Key/i.test(String(missingKeyError.message || missingKeyError)), 'Missing-key behavior changed.');
assert(missingKeyError && missingKeyError.pstAiCode === 'MISSING_KEY', 'Missing-key error code changed.');

console.log('PPPP AI request API smoke');
console.log('Legacy Groq-shaped route: OK');
console.log('Gemini compatibility route: OK');
console.log('Typed HTTP/EMPTY/INVALID_JSON errors: OK');
console.log('Network error propagation: OK');
console.log('Missing-key behavior: OK');
