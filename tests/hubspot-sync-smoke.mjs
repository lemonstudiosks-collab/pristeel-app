import assert from 'node:assert/strict';
import { mapHubSpotContact, mapHubSpotDeal, planHubSpotContactUpdate } from '../scripts/hubspot-sync.mjs';

const contact = mapHubSpotContact({
  id: '123',
  properties: {
    firstname: 'Anna',
    lastname: 'Muster',
    email: 'ANNA@EXAMPLE.COM',
    phone: '+49 123',
    company: 'Example GmbH',
    jobtitle: 'Einkauf',
    country: 'DE'
  }
});

assert.equal(contact.hubspot_id, '123');
assert.equal(contact.person, 'Anna Muster');
assert.equal(contact.email, 'anna@example.com');
assert.equal(contact.company, 'Example GmbH');
assert.match(contact.hubspot_url, /147958987\/contact\/123$/);
assert.deepEqual(Object.keys(contact).sort(), [
  'company', 'country', 'email', 'hubspot_id', 'hubspot_url', 'person', 'phone', 'role'
].sort());

const safeMerge = planHubSpotContactUpdate({
  id: 'local-1',
  hubspot_id: null,
  hubspot_url: null,
  person: 'Anton Manzl jr.',
  company: 'Empl Baugesellschaft m.b.H.',
  email: 'office@empl-bau.at',
  phone: '+43 111',
  role: null,
  country: 'AT'
}, {
  hubspot_id: '987',
  hubspot_url: 'https://app.hubspot.com/contacts/147958987/contact/987',
  person: 'Anton Manzl',
  company: 'Empl Baugesellschaft m.b.H.',
  email: 'office@empl-bau.at',
  phone: '+43 999',
  role: 'Einkauf',
  country: 'AT'
});

assert.equal(safeMerge.payload.hubspot_id, '987');
assert.match(safeMerge.payload.hubspot_url, /\/987$/);
assert.equal(safeMerge.payload.role, 'Einkauf');
assert.equal(safeMerge.payload.person, undefined);
assert.equal(safeMerge.payload.phone, undefined);
assert.equal(safeMerge.payload.company, undefined);
assert.equal(safeMerge.payload.email, undefined);
assert.equal(safeMerge.payload.country, undefined);
assert.deepEqual(safeMerge.conflicts.sort(), ['person', 'phone']);

const fillOnly = planHubSpotContactUpdate({
  hubspot_id: '123',
  hubspot_url: 'https://app.hubspot.com/contacts/147958987/contact/123',
  person: null,
  company: '',
  email: 'anna@example.com',
  phone: null,
  role: null,
  country: null
}, contact);

assert.equal(fillOnly.payload.person, 'Anna Muster');
assert.equal(fillOnly.payload.company, 'Example GmbH');
assert.equal(fillOnly.payload.phone, '+49 123');
assert.equal(fillOnly.payload.role, 'Einkauf');
assert.equal(fillOnly.payload.country, 'DE');
assert.equal(fillOnly.payload.email, undefined);
assert.deepEqual(fillOnly.conflicts, []);

const deal = mapHubSpotDeal({
  id: '456',
  properties: {
    dealname: 'Airbus H24X',
    amount: '125000.50',
    dealstage: 'appointmentscheduled',
    closedate: '2026-09-15T00:00:00.000Z',
    description: 'Steel package'
  }
});

assert.equal(deal.hs_object_id, '456');
assert.equal(deal.dealname, 'Airbus H24X');
assert.equal(deal.amount, 125000.5);
assert.equal(deal.closedate, '2026-09-15');
assert.deepEqual(Object.keys(deal).sort(), [
  'amount', 'closedate', 'dealname', 'dealstage', 'description', 'hs_object_id'
].sort());

console.log('HubSpot sync mapping and contact safety smoke test passed.');
