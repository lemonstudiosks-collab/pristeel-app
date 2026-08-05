import assert from 'node:assert/strict';
import { mapHubSpotContact, mapHubSpotDeal } from '../scripts/hubspot-sync.mjs';

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

console.log('HubSpot sync mapping smoke test passed.');
