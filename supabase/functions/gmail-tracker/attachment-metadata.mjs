function headerValue(headers, name) {
  const wanted=String(name||'').toLowerCase();
  const item=(Array.isArray(headers)?headers:[]).find((x)=>String(x?.name||'').toLowerCase()===wanted);
  return String(item?.value||'');
}

export function collectAttachmentMetadata(part, out = []) {
  if (!part) return out;
  const filename = String(part.filename ?? '').trim();
  const attachmentId = String(part.body?.attachmentId ?? '').trim();
  const disposition = headerValue(part.headers, 'Content-Disposition');
  const isInline = /(?:^|;)\s*inline\b/i.test(disposition);
  if (filename && attachmentId && !isInline) {
    out.push({
      attachment_id: attachmentId,
      attachment_name: filename,
    });
  }
  for (const child of part.parts ?? []) collectAttachmentMetadata(child, out);
  return out;
}

export function attachmentRegistryRows(message, projectId, linkMethod = 'server-metadata-v1') {
  const gmailMessageId = String(message?.id ?? '').trim();
  const gmailThreadId = String(message?.threadId ?? '').trim();
  const pid = String(projectId ?? '').trim();
  if (!gmailMessageId || !pid) return [];
  const seen = new Set();
  return collectAttachmentMetadata(message?.payload, [])
    .filter((x) => {
      const key = `${x.attachment_id}|${x.attachment_name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((x) => ({
      gmail_message_id: gmailMessageId,
      gmail_thread_id: gmailThreadId || null,
      attachment_id: x.attachment_id,
      attachment_name: x.attachment_name,
      project_id: pid,
      drive_file_id: null,
      link_method: linkMethod,
    }));
}
