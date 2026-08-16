function text(v){return String(v==null?'':v).trim();}

export function selectLinkedBodyCandidates(emailRows, linkRows, limit=20){
  const max=Math.min(40,Math.max(1,Math.floor(Number(limit)||20)));
  const confirmed=new Set();
  for(const row of Array.isArray(emailRows)?emailRows:[]){
    const id=text(row?.gmail_message_id);
    if(id&&row?.project_id)confirmed.add(id);
  }
  for(const row of Array.isArray(linkRows)?linkRows:[]){
    const id=text(row?.gmail_message_id);
    if(id&&row?.project_id)confirmed.add(id);
  }
  const seen=new Set();
  return (Array.isArray(emailRows)?emailRows:[])
    .filter((row)=>{
      const id=text(row?.gmail_message_id);
      if(!id||seen.has(id)||row?.body_hydrated_at||!confirmed.has(id))return false;
      seen.add(id);
      return true;
    })
    .sort((a,b)=>Date.parse(b?.sent_at||0)-Date.parse(a?.sent_at||0))
    .slice(0,max);
}

export function bodyHydrationPatch(body, hydratedAt=new Date().toISOString(), method='server-full-mime-v1'){
  const value=String(body==null?'':body).trim().slice(0,50000);
  if(!value)return null;
  return{
    snippet:value,
    body_hydrated_at:hydratedAt,
    body_hydration_method:method,
    updated_at:hydratedAt,
  };
}
