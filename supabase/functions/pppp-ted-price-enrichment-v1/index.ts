import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control':'no-store' } }); }
function s(v: unknown, max = 2000) { return String(v == null ? '' : v).trim().slice(0,max); }
function isUuid(v: unknown) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s(v,80)); }
function num(v: unknown): number | null { const n=Number(String(v ?? '').replace(/\s/g,'').replace(',','.')); return Number.isFinite(n)&&n>=0?n:null; }
function attr(attrs:string,name:string){ const m=attrs.match(new RegExp('\\b'+name+'="([^"]+)"','i')); return m?m[1]:''; }
function tagValue(xml:string,tag:string){ const t=tag.replace(':','\\:'); const m=xml.match(new RegExp('<'+t+'\\b[^>]*>([^<]+)</'+t+'>','i')); return m?s(m[1],1000):''; }
function block(xml:string,tag:string){ const t=tag.replace(':','\\:'); const m=xml.match(new RegExp('<'+t+'\\b[^>]*>([\\s\\S]*?)</'+t+'>','i')); return m?m[1]:''; }
function amountIn(xml:string,tag:string){ const t=tag.replace(':','\\:'); const m=xml.match(new RegExp('<'+t+'\\b([^>]*)>([^<]+)</'+t+'>','i')); if(!m)return null; const value=num(m[2]); if(value==null)return null; return {value,currency:s(attr(m[1],'currencyID'),12).toUpperCase()||null}; }
function uniqueMatches(xml:string,re:RegExp){ const out:string[]=[]; for(const m of xml.matchAll(re)){const v=s(m[1],200);if(v&&!out.includes(v))out.push(v);} return out; }
function parseTenderCounts(xml:string,lotCount:number){ const counts:number[]=[]; const re=/<efac:ReceivedSubmissionsStatistics\b[^>]*>([\s\S]*?)<\/efac:ReceivedSubmissionsStatistics>/gi; for(const m of xml.matchAll(re)){ const b=m[1]; const code=tagValue(b,'efbc:StatisticsCode').toLowerCase(); if(code!=='tenders')continue; const n=num(tagValue(b,'efbc:StatisticsNumeric')); if(n!=null)counts.push(n); } return {by_lot:counts,feature_bid_count:lotCount<=1&&counts.length?Math.max(...counts):null}; }
function parseTedXml(xml:string){
  const procedureIdentifier=tagValue(xml,'cbc:ContractFolderID')||null;
  const noticeResult=block(xml,'efac:NoticeResult');
  const award=noticeResult?amountIn(noticeResult,'cbc:TotalAmount'):null;
  const procurementProject=block(xml,'cac:ProcurementProject');
  const requestedTotal=procurementProject?block(procurementProject,'cac:RequestedTenderTotal'):'';
  const estimated=requestedTotal?amountIn(requestedTotal,'cbc:EstimatedOverallContractAmount'):null;
  const lotIds=uniqueMatches(xml,/<cbc:ID\b[^>]*schemeName="Lot"[^>]*>([^<]+)<\/cbc:ID>/gi);
  const tenderCounts=parseTenderCounts(noticeResult||xml,lotIds.length);
  const contractIds=uniqueMatches(noticeResult||xml,/<cbc:ID\b[^>]*schemeName="contract"[^>]*>([^<]+)<\/cbc:ID>/gi);
  const tenderIds=uniqueMatches(noticeResult||xml,/<cbc:ID\b[^>]*schemeName="tender"[^>]*>([^<]+)<\/cbc:ID>/gi);
  return {procedure_identifier:procedureIdentifier,award,estimated,lot_count:lotIds.length||null,lot_ids:lotIds.slice(0,200),received_tenders_by_lot:tenderCounts.by_lot,bid_count:tenderCounts.feature_bid_count,contract_ids:contractIds.slice(0,200),tender_ids:tenderIds.slice(0,300)};
}
async function requireSignedInUser(req:Request){
  const auth=req.headers.get('Authorization')||'';
  const token=auth.replace(/^Bearer\s+/i,'').trim();
  if(!token) return null;
  const {data,error}=await db.auth.getUser(token);
  if(error||!data?.user) return null;
  return data.user;
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  try{
    if(!SUPABASE_URL||!SERVICE_KEY)return json({ok:false,error:'supabase_environment_missing'},500);
    const user=await requireSignedInUser(req);
    if(!user)return json({ok:false,error:'authenticated_user_required'},401);
    let body:any={}; try{body=await req.json();}catch{}
    const dryRun=body?.dry_run===true;
    const requested=Array.isArray(body?.tender_ids)?body.tender_ids.map((x:unknown)=>s(x,80)).filter(isUuid).slice(0,20):[];
    const limit=Math.max(1,Math.min(20,Number(body?.limit)||5));
    let tenderIds=requested;
    if(!tenderIds.length){
      const {data,error}=await db.from('pppp_tender_price_work_queue_v1').select('tender_watch_id').eq('source','TED').eq('next_action','ENRICH_TED').order('queue_priority',{ascending:false}).limit(limit);
      if(error)throw error;
      tenderIds=(data||[]).map((x:any)=>x.tender_watch_id).filter(Boolean);
    }
    if(!tenderIds.length)return json({ok:true,processed:0,message:'No TED enrichment candidates.'});
    const {data:tenders,error:tenderError}=await db.from('kek_tender_watch').select('id,publication_no,title,authority,payload').in('id',tenderIds);
    if(tenderError)throw tenderError;
    const results:any[]=[];
    for(const tender of tenders||[]){
      const pub=s(tender.publication_no,80);
      if(!pub){results.push({tender_id:tender.id,ok:false,error:'publication_no_missing'});continue;}
      const xmlUrl=`https://ted.europa.eu/en/notice/${encodeURIComponent(pub)}/xml`;
      const checkedAt=new Date().toISOString();
      try{
        const response=await fetch(xmlUrl,{headers:{'Accept':'application/xml,text/xml;q=0.9,*/*;q=0.1','User-Agent':'PriSteel-PPPP-TED-Price-Intelligence/1.0'}});
        const xml=await response.text();
        if(!response.ok||!xml||!/<[^>]+>/.test(xml))throw new Error(`ted_xml_http_${response.status}`);
        const parsed=parseTedXml(xml);
        const {data:priorRows,error:priorError}=await db.from('pppp_tender_price_features_v1').select('*').eq('tender_watch_id',tender.id).limit(1);
        if(priorError)throw priorError;
        const prior:any=priorRows?.[0]||{};
        const priorRaw=prior.raw_features&&typeof prior.raw_features==='object'?prior.raw_features:{};
        const priorEvidence=Array.isArray(prior.evidence)?prior.evidence:[];
        const evidence=priorEvidence.filter((x:any)=>x?.source!=='TED_XML').concat([{source:'TED_XML',publication_no:pub,url:xmlUrl,checked_at:checkedAt,notice_value:parsed.award,estimated_value:parsed.estimated,procedure_identifier:parsed.procedure_identifier}]).slice(-100);
        const rawFeatures={...priorRaw,ted_enrichment_checked_at:checkedAt,ted_xml_url:xmlUrl,ted_procedure_identifier:parsed.procedure_identifier,ted_lot_ids:parsed.lot_ids,ted_contract_ids:parsed.contract_ids,ted_tender_ids:parsed.tender_ids,ted_received_tenders_by_lot:parsed.received_tenders_by_lot,ted_award_value_found:!!parsed.award,ted_estimated_value_found:!!parsed.estimated,ted_enrichment_version:'ted-xml-v1'};
        const patch:any={tender_watch_id:tender.id,schema_version:'v1',extraction_state:prior.extraction_state||'pending',extraction_source:prior.extraction_source==='dossier_ai'||prior.extraction_source==='manual'?prior.extraction_source:'ted_enrichment',extracted_at:checkedAt,lot_count:parsed.lot_count??prior.lot_count??null,bid_count:parsed.bid_count??prior.bid_count??null,award_value:parsed.award?.value??prior.award_value??null,award_currency:parsed.award?.currency??prior.award_currency??null,estimated_contract_value:parsed.estimated?.value??prior.estimated_contract_value??null,evidence,raw_features:rawFeatures,updated_at:checkedAt};
        if(!dryRun){const {error:upsertError}=await db.from('pppp_tender_price_features_v1').upsert(patch,{onConflict:'tender_watch_id'});if(upsertError)throw upsertError;}
        results.push({tender_id:tender.id,publication_no:pub,ok:true,dry_run:dryRun,award_value:parsed.award?.value??null,award_currency:parsed.award?.currency??null,estimated_contract_value:parsed.estimated?.value??null,procedure_identifier:parsed.procedure_identifier,lot_count:parsed.lot_count,bid_count:parsed.bid_count,received_tenders_by_lot:parsed.received_tenders_by_lot,xml_url:xmlUrl});
      }catch(error){
        const message=s((error as any)?.message||error,500);
        if(!dryRun){const {data:priorRows}=await db.from('pppp_tender_price_features_v1').select('*').eq('tender_watch_id',tender.id).limit(1); const prior:any=priorRows?.[0]||{}; const priorRaw=prior.raw_features&&typeof prior.raw_features==='object'?prior.raw_features:{}; await db.from('pppp_tender_price_features_v1').upsert({tender_watch_id:tender.id,schema_version:'v1',extraction_state:prior.extraction_state||'pending',extraction_source:prior.extraction_source||'ted_enrichment',raw_features:{...priorRaw,ted_enrichment_checked_at:checkedAt,ted_xml_url:xmlUrl,ted_enrichment_error:message,ted_enrichment_version:'ted-xml-v1'},updated_at:checkedAt},{onConflict:'tender_watch_id'});}
        results.push({tender_id:tender.id,publication_no:pub,ok:false,error:message,xml_url:xmlUrl});
      }
    }
    return json({ok:true,processed:results.length,succeeded:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,dry_run:dryRun,results});
  }catch(error){console.error('pppp-ted-price-enrichment-v1',error);return json({ok:false,error:'ted_price_enrichment_failed',message:s((error as any)?.message||error,1000)},500);}
});

