const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('pristeel-outreach-followup-v1.js','utf8');
const bootstrap = fs.readFileSync('pristeel-project-emails.js','utf8');

assert(bootstrap.includes("'pristeel-outreach-followup-v1.js?v=20260813-1'"), 'Follow-up module must be bootstrapped');
assert(src.includes("direction=eq.outgoing&project_id=is.null"), 'Follow-up must start from projectless outgoing mail');
assert(src.includes("direction=eq.incoming"), 'Follow-up must inspect incoming replies');
assert(src.includes("if(sent>now){future.add(e);return;}"), 'Future/scheduled outgoing mail must not count as sent');
assert(src.includes("isAutomatedIncoming"), 'Automated replies must not count as human replies');
assert(src.includes("linkedThreadSet"), 'Project-linked threads must be excluded from cold outreach follow-up');
assert(src.includes("lower(contact.kind)==='supplier'"), 'Supplier contacts must not be mixed into client cold outreach follow-up');
assert(src.includes("return n<=1?7:n===2?14:30"), 'Follow-up cadence must be 7/14/30 days');
assert(src.includes("Follow-up për kontakte"), 'Inbox must be relabeled as a follow-up queue');
assert(src.includes("Kërkesa pa projekt"), 'Right column must represent only projectless requests');
assert(src.includes("project_email_links?select="), 'Right-column filtering must inspect canonical project links');
assert(src.includes("subjectProjects"), 'Right-column filtering must use unique canonical subject evidence');
assert(src.includes("scope:'https://www.googleapis.com/auth/gmail.compose'"), 'Draft authorization must request gmail.compose explicitly');
assert(src.includes("/gmail/v1/users/me/drafts"), 'Feature must use Gmail drafts.create endpoint');
assert(!src.includes('/drafts/send'), 'Feature must never send Gmail drafts');
assert(!src.includes('/messages/send'), 'Feature must never send Gmail messages');
assert(src.includes("status:'Scheduled'"), 'Confirmed draft follow-up must persist Scheduled state');
assert(src.includes("client.requestAccessToken()"), 'Compose authorization must be tied to the explicit draft action');
assert(!src.includes('setInterval('), 'Follow-up module must not add background polling');
assert(!src.includes('MutationObserver'), 'Follow-up module must not add observers');

console.log('Cold outreach follow-up inbox smoke test passed.');
