import assert from 'node:assert/strict';
globalThis.window={addEventListener(){}};
const {resolveTracker,TRACKER_NAME,tableHtml,worksheetRows}=await import('../spie/tracker.mjs');
assert.equal(resolveTracker([{name:TRACKER_NAME,id:'a',parents:['other']},{name:TRACKER_NAME,id:'b',parents:['spie']},{name:'another.xlsx',id:'c',parents:['spie']}],'spie')[0].id,'b');
assert.equal(resolveTracker([{name:TRACKER_NAME,id:'a',parents:['spie'],trashed:true}],'spie').length,0);
const html=tableHtml([['<script>bad()</script>','=2+2','Oferta & porosia']]);assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.includes('Oferta &amp; porosia'));
assert.throws(()=>worksheetRows({utils:{decode_range:()=>({e:{c:4,r:90000}})}},{'!ref':'A1:E90001'}),/kufirin/);
assert.deepEqual(worksheetRows({},{}),[]);
console.log('SPIE private tracker: exact filename/folder, escaping and bounded worksheet passed.');
