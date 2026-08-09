const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
  const src=fs.readFileSync('pristeel-drive-import.js','utf8');
  assert(!/FileReader|readAsDataURL|base64/i.test(src),'Drive upload must not convert large files to base64');
  assert(/CHUNK_SIZE\s*=\s*8\*1024\*1024/.test(src),'Large uploads must use 8 MiB chunks');
  assert(/Content-Range/.test(src),'Resumable upload must send Content-Range headers');
  assert(/status===308/.test(src),'Resumable upload must handle HTTP 308 Resume Incomplete');
  assert(/file\.slice\(/.test(src),'Large file upload must slice the browser File into chunks');
  assert(/queryUpload\(/.test(src),'Interrupted uploads must query the resumable session before failing');
  assert(!/MutationObserver|setInterval\s*\(/.test(src),'Drive upload must not add polling or global observers');

  const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.supaFetch=async()=>[];
  w.eval(src);
  assert(w.PSTDriveImport&&w.PSTDriveImport._test,'Drive import test API missing');
  assert.strictEqual(w.PSTDriveImport._test.chunkSize,8*1024*1024,'Unexpected chunk size');
  assert.strictEqual(w.PSTDriveImport._test.rangeEnd('bytes=0-8388607'),8388607,'Resume Range parser failed');
  assert.strictEqual(w.PSTDriveImport._test.rangeEnd(''),-1,'Empty Resume Range must return -1');
  dom.window.close();
  console.log('Large Google Drive upload smoke test passed.');
})();
