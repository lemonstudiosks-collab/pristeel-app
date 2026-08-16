function text(v){return String(v==null?'':v).trim();}
function pairKey(row){
  const projectId=text(row?.project_id);
  const gmailMessageId=text(row?.gmail_message_id);
  return projectId&&gmailMessageId?`${projectId}|${gmailMessageId}`:'';
}

export function selectUnscannedAttachmentPairs(pairs, scanRows, limit=20){
  const max=Math.min(40,Math.max(1,Math.floor(Number(limit)||20)));
  const scanned=new Set((Array.isArray(scanRows)?scanRows:[]).map(pairKey).filter(Boolean));
  const seen=new Set();
  const out=[];
  for(const row of Array.isArray(pairs)?pairs:[]){
    const key=pairKey(row);
    if(!key||seen.has(key)||scanned.has(key))continue;
    seen.add(key);
    out.push({
      project_id:text(row.project_id),
      gmail_message_id:text(row.gmail_message_id),
      gmail_thread_id:text(row.gmail_thread_id)||null,
    });
    if(out.length>=max)break;
  }
  return out;
}

export function attachmentScanStateRow(pair, attachmentCount, scannedAt=new Date().toISOString(), method='server-metadata-v1'){
  const projectId=text(pair?.project_id);
  const gmailMessageId=text(pair?.gmail_message_id);
  if(!projectId||!gmailMessageId)return null;
  const count=Math.max(0,Math.floor(Number(attachmentCount)||0));
  return{
    project_id:projectId,
    gmail_message_id:gmailMessageId,
    gmail_thread_id:text(pair?.gmail_thread_id)||null,
    outcome:count>0?'registered':'no_downloadable',
    attachment_count:count,
    scan_method:text(method)||'server-metadata-v1',
    scanned_at:scannedAt,
  };
}
