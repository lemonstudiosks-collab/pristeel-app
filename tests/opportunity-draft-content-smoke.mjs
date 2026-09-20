import assert from 'node:assert/strict';
import {
  buildTedDraftContent,
  PRISTEEL_SIGNATURE_HTML
} from '../supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs';

assert.equal(/linkedin/i.test(PRISTEEL_SIGNATURE_HTML),false,'signature must not contain LinkedIn');
assert.equal((PRISTEEL_SIGNATURE_HTML.match(/<img\b/gi)||[]).length,1,'signature must contain only the PriSteel logo image');
assert.equal(/<a\b/i.test(PRISTEEL_SIGNATURE_HTML),false,'signature should not add extra clickable links');
assert.ok(PRISTEEL_SIGNATURE_HTML.includes('border-left:2px solid #1a73e8'),'signature should keep the blue divider');
assert.ok(PRISTEEL_SIGNATURE_HTML.includes('Arianit Vllahiu'),'signature must include sender name');
assert.ok(PRISTEEL_SIGNATURE_HTML.includes('Head of Business Development'),'signature must include role');

const samples=[
  {
    action:{route:'TED_PRODUCER',target_company:'Example Stahlbau GmbH',target_email:'info@example.de',tender_title:'Germany – Structural steelworks – Very Long Project Name for a Large Structural Steel Package at an Industrial Site'},
    tender:{title:'Germany – Structural steelworks – Very Long Project Name for a Large Structural Steel Package at an Industrial Site'},
    recipient:{email:'info@example.de',purpose:'general'}
  },
  {
    action:{route:'TED_GC',target_company:'Example Construction Ltd',target_email:'purchasing@example.ie',tender_title:'Ireland – Construction work – Example Rail Accessibility Upgrade Works'},
    tender:{title:'Ireland – Construction work – Example Rail Accessibility Upgrade Works'},
    recipient:{email:'purchasing@example.ie',purpose:'procurement'}
  }
];

for(const sample of samples){
  const d=buildTedDraftContent(sample.action,sample.tender,sample.recipient);
  const bodyOnly=d.body.split(/\n\n(?:Kind regards|Mit freundlichen Grüßen|S poštovanjem)/)[0];
  const words=bodyOnly.split(/\s+/).filter(Boolean).length;
  assert.ok(words<=130,'first-touch outreach should stay concise; got '+words+' words');
  assert.ok(d.subject.length<=105,'subject should be concise; got '+d.subject.length+' chars');
  assert.equal(/linkedin/i.test(d.html_body),false,'draft must not contain LinkedIn');
  assert.ok(/EN 1090-2/i.test(d.body),'draft must mention EN 1090-2');
  assert.ok(/EXC4/i.test(d.body),'draft must mention EXC4');
  assert.ok(/ISO 3834-2/i.test(d.body),'draft must mention ISO 3834-2');
  assert.ok(/\bDAP\b/.test(d.body)&&/\bDDP\b/.test(d.body),'draft must mention DAP and DDP as conditional delivery terms');
}

console.log('opportunity draft concise copy + safe signature smoke: ok');
