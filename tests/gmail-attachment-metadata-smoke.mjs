import assert from 'node:assert/strict';
import { attachmentRegistryRows, collectAttachmentMetadata } from '../supabase/functions/gmail-tracker/attachment-metadata.mjs';

const payload={
  mimeType:'multipart/mixed',
  parts:[
    {filename:'spec.pdf',mimeType:'application/pdf',headers:[{name:'Content-Disposition',value:'attachment; filename="spec.pdf"'}],body:{attachmentId:'att-1',size:1200}},
    {filename:'inline-logo.png',mimeType:'image/png',headers:[{name:'Content-Disposition',value:'inline; filename="inline-logo.png"'}],body:{attachmentId:'inline-1',size:500}},
    {filename:'inline-body.png',mimeType:'image/png',headers:[{name:'Content-Disposition',value:'inline; filename="inline-body.png"'}],body:{data:'aW1hZ2U=',size:5}},
    {mimeType:'multipart/alternative',parts:[
      {filename:'drawing.dwg',mimeType:'application/acad',headers:[{name:'Content-Disposition',value:'attachment; filename="drawing.dwg"'}],body:{attachmentId:'att-2',size:9000}},
      {filename:'drawing.dwg',mimeType:'application/acad',headers:[{name:'Content-Disposition',value:'attachment; filename="drawing.dwg"'}],body:{attachmentId:'att-2',size:9000}},
    ]}
  ]
};

const metadata=collectAttachmentMetadata(payload,[]);
assert.equal(metadata.length,3,'collector should keep real downloadable attachments before dedupe and exclude inline MIME parts');
assert.ok(metadata.every(x=>x.attachment_id&&x.attachment_name),'registry must require real Gmail attachment ids and filenames');
assert.ok(!metadata.some(x=>x.attachment_id==='inline-1'),'Content-Disposition inline part must not enter the project attachment registry');
assert.ok(!metadata.some(x=>x.attachment_name==='inline-body.png'),'inline body data without attachmentId must not be registered');

const rows=attachmentRegistryRows({id:'gmail-1',threadId:'thread-1',payload},'project-1');
assert.equal(rows.length,2,'duplicate real attachments collapse while inline assets stay excluded');
assert.deepEqual(rows.map(x=>x.attachment_id).sort(),['att-1','att-2']);
assert.ok(rows.every(x=>x.gmail_message_id==='gmail-1'&&x.gmail_thread_id==='thread-1'));
assert.ok(rows.every(x=>x.project_id==='project-1'));
assert.ok(rows.every(x=>x.drive_file_id===null),'metadata sync must never claim a Drive upload happened');
assert.ok(rows.every(x=>x.link_method==='server-metadata-v1'));
assert.deepEqual(attachmentRegistryRows({id:'gmail-1',payload},''),[],'projectless email must never create attachment registry rows');

console.log('Gmail attachment metadata smoke: OK');
