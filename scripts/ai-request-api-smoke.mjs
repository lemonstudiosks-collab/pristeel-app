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
globalThis.fetch = async function nativeFetchStub(url, init = {}) {
  calls.push({ url: String(url), init });
  if (String(url).includes('generativelanguage.googleapis.com')) {
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"route":"gemini"}' }] } }],
      usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2, totalTokenCount: 6 }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url).includes('api.groq.com/openai/v1/chat/completions')) {
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

localStorage.setItem('pristeel_apikey', 'legacy-test-key');
assert(window.PSTAI.hasApiKey() === true, 'Legacy compatibility key was not detected.');
calls = [];
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
localStorage.setItem('pristeel_apikey', '__GEMINI_COMPAT__');
calls = [];
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
localStorage.removeItem('pristeel_apikey');
assert(window.PSTAI.hasApiKey() === false, 'Missing compatibility key should report unavailable.');
let missingKeyError = '';
try {
  await window.PSTAI.requestJson({ messages: [] });
} catch (error) {
  missingKeyError = String(error && error.message || error);
}
assert(/Mungon AI API Key/i.test(missingKeyError), 'Missing-key behavior changed.');

console.log('PPPP AI request API smoke');
console.log('Legacy Groq-shaped route: OK');
console.log('Gemini compatibility route: OK');
console.log('Missing-key behavior: OK');
