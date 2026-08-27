import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync('supabase/functions/pppp-openai-assistant/index.ts','utf8');
assert.doesNotMatch(src,/provider_unconfigured|required_secret|OPENAI_API_KEY[^\n]{0,120}503/,'missing AI provider must never become a 503 contract');
assert.match(src,/if\(!key\)return null/,'OpenAI must be optional');
assert.match(src,/inferProject\(question,projects\)/,'server fallback must resolve a project from the user question');
assert.match(src,/pppp-live-data/,'server fallback must identify live-data answers');
assert.match(src,/deterministic\(project,facts,emails,tasks\)/,'project questions must answer from live PPPP data without OpenAI');
assert.match(src,/nuk lidhet me një projekt unik/,'general fallback must be human-readable');
assert.doesNotMatch(src,/required_secret/,'secret names must never be exposed to the UI');
console.log('PPPP assistant server-side live-data fallback: OK');
