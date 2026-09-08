import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_KEY=Deno.env.get('OPENAI_API_KEY')||'';
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json'
};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Cache-Control':'no-store'}});
const text=(v:any,max=1000)=>String(v??'').trim().slice(0,max);
const numberOrNull=(v:any)=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const categories=new Set(['rryma','uji','nafta','qira','telefon','mirembajtje','sherbime','transport','sigurime','tjera']);

function outputText(data:any){
  if(data?.output_text)return String(data.output_text);
  for(const out of data?.output||[])for(const c of out?.content||[])if(c?.type==='output_text'&&c?.text)return String(c.text);
  return '';
}
function bytesToBase64(bytes:Uint8Array){
  let out='';const step=0x8000;
  for(let i=0;i<bytes.length;i+=step)out+=String.fromCharCode(...bytes.subarray(i,Math.min(i+step,bytes.length)));
  return btoa(out);
}
async function requireUser(req:Request){
  const auth=req.headers.get('Authorization')||'';
  if(!auth.toLowerCase().startsWith('bearer '))throw new Error('unauthorized');
  const token=auth.replace(/^Bearer\s+/i,'').trim();
  const {data,error}=await db.auth.getUser(token);
  if(error||!data?.user)throw new Error('unauthorized');
  return data.user;
}
function mergeMeta(base:any,patch:any){
  const b=(base&&typeof base==='object'&&!Array.isArray(base))?base:{};
  return {...b,...patch};
}
function publicError(message:string){
  const m=String(message||'').slice(0,800);
  if(m==='unauthorized')return m;
  if(m.includes('Vision fallback is not configured'))return m;
  if(m.includes('Receipt image'))return m;
  if(m.includes('OpenAI 401')||m.includes('OpenAI 403'))return 'Vision provider authentication failed';
  if(m.includes('OpenAI 429'))return 'Vision provider is temporarily rate-limited. Try again shortly.';
  if(m.includes('OpenAI 5'))return 'Vision provider is temporarily unavailable. Try again.';
  if(m.includes('OpenAI 4'))return 'Vision provider rejected the receipt request. Try again or use a clearer photo.';
  return m||'Vision extraction failed';
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({ok:false,error:'POST required'},405);

  let receiptId='';
  let receipt:any=null;
  let attemptMeta:any={};

  try{
    await requireUser(req);
    if(!OPENAI_KEY)return json({ok:false,error:'Vision fallback is not configured'},503);

    const body=await req.json().catch(()=>({}));
    receiptId=text(body?.receipt_id,80);
    if(!/^[0-9a-f-]{36}$/i.test(receiptId))return json({ok:false,error:'receipt_id required'},400);

    const {data:r,error}=await db.from('pppp_expense_receipts_v1')
      .select('id,status,file_name,mime_type,storage_bucket,storage_path,expense_id,ocr_metadata')
      .eq('id',receiptId).maybeSingle();
    if(error)throw error;
    if(!r)return json({ok:false,error:'Receipt not found'},404);
    receipt=r;

    if(r.expense_id||['confirmed','ignored','duplicate'].includes(String(r.status))){
      return json({ok:false,error:'Receipt is not eligible for OCR fallback'},409);
    }

    const mime=String(r.mime_type||'').toLowerCase();
    if(!['image/jpeg','image/png','image/webp'].includes(mime)){
      return json({ok:false,error:'Vision fallback currently supports JPG, PNG and WebP receipts'},415);
    }

    const startedAt=new Date().toISOString();
    attemptMeta=mergeMeta(r.ocr_metadata,{
      vision_state:'processing',
      vision_started_at:startedAt,
      vision_finished_at:null,
      vision_provider:'openai-vision-fallback-v2'
    });

    await db.from('pppp_expense_receipts_v1').update({
      ocr_metadata:attemptMeta,
      last_error:null,
      updated_at:startedAt
    }).eq('id',receiptId).is('expense_id',null);

    const {data:file,error:fileError}=await db.storage.from(r.storage_bucket||'expense-receipts').download(r.storage_path);
    if(fileError||!file)throw fileError||new Error('Receipt image could not be downloaded');
    if(file.size>12*1024*1024)return json({ok:false,error:'Receipt image is too large for vision fallback'},413);

    const bytes=new Uint8Array(await file.arrayBuffer());
    const dataUrl=`data:${mime};base64,${bytesToBase64(bytes)}`;
    const model=Deno.env.get('OPENAI_RECEIPT_VISION_MODEL')||Deno.env.get('OPENAI_ASSISTANT_MODEL')||Deno.env.get('OPENAI_CONTEXT_MODEL')||'gpt-5.6-luna';

    const schema={
      type:'object',additionalProperties:false,
      properties:{
        raw_text:{type:'string'},
        supplier:{type:['string','null']},
        invoice_nr:{type:['string','null']},
        date:{type:['string','null']},
        category:{type:'string',enum:['rryma','uji','nafta','qira','telefon','mirembajtje','sherbime','transport','sigurime','tjera']},
        amount:{type:['number','null']},
        net_amount:{type:['number','null']},
        vat_rate:{type:['number','null']},
        vat_amount:{type:['number','null']},
        currency:{type:'string'},
        vehicle_plate:{type:['string','null']},
        quantity:{type:['number','null']},
        unit:{type:['string','null']},
        unit_price:{type:['number','null']},
        confidence:{type:'integer',minimum:0,maximum:100},
        review_fields:{type:'array',items:{type:'string'}}
      },
      required:['raw_text','supplier','invoice_nr','date','category','amount','net_amount','vat_rate','vat_amount','currency','vehicle_plate','quantity','unit','unit_price','confidence','review_fields']
    };

    const instructions=[
      'You extract accounting data from a photographed business expense receipt or invoice for PRISTEEL.',
      'Read the image visually even when ordinary OCR would fail. Never invent a value that is not supported by the image.',
      'Return the document date as YYYY-MM-DD. amount is the final gross/payable amount. net_amount is amount before VAT. vat_amount is VAT value and vat_rate is the printed VAT percentage when available.',
      'For fuel, category must be nafta and extract quantity in litres, unit L and unit_price when visible. Restaurant/hotel/professional service expenses map to sherbime; parking/toll/logistics map to transport.',
      'Allowed categories are rryma,uji,nafta,qira,telefon,mirembajtje,sherbime,transport,sigurime,tjera.',
      'For Kosovo/Albanian documents, labels may include Fatura, Data, Pa TVSH, TVSH, Për pagesë, Sasia, Çmimi. Supplier is the seller/issuer, not PRISTEEL if PRISTEEL appears as customer.',
      'raw_text should be a compact transcription of the useful visible text. review_fields must contain field names that are missing, ambiguous or low confidence.',
      'This is extraction only. Do not approve, pay, or register the expense.'
    ].join(' ');

    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{Authorization:'Bearer '+OPENAI_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({
        model,
        store:false,
        reasoning:{effort:'low'},
        instructions,
        input:[{
          role:'user',
          content:[
            {type:'input_text',text:'Extract this expense receipt into the required schema.'},
            {type:'input_image',image_url:dataUrl,detail:'high'}
          ]
        }],
        text:{format:{type:'json_schema',name:'expense_receipt_extract',strict:true,schema}}
      })
    });

    const raw=await response.text();
    if(!response.ok)throw new Error('OpenAI '+response.status+': '+raw.slice(0,500));

    let payload:any={};
    try{payload=JSON.parse(raw)}catch{}
    const extractedRaw=outputText(payload);
    if(!extractedRaw)throw new Error('Vision provider returned no structured result');

    let x:any={};
    try{x=JSON.parse(extractedRaw)}catch{throw new Error('Vision provider returned invalid JSON');}

    const category=categories.has(String(x.category||''))?String(x.category):'tjera';
    const date=/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||''))?String(x.date):null;
    const parsed={
      supplier:text(x.supplier,240)||null,
      invoice_nr:text(x.invoice_nr,120)||null,
      date,
      category,
      amount:numberOrNull(x.amount),
      net_amount:numberOrNull(x.net_amount),
      vat_rate:numberOrNull(x.vat_rate),
      vat_amount:numberOrNull(x.vat_amount),
      currency:(text(x.currency,10)||'EUR').toUpperCase(),
      vehicle_plate:text(x.vehicle_plate,40)||null,
      quantity:numberOrNull(x.quantity),
      unit:text(x.unit,20)||null,
      unit_price:numberOrNull(x.unit_price),
      confidence:Math.max(0,Math.min(100,Math.round(Number(x.confidence)||0))),
      review_fields:Array.isArray(x.review_fields)?x.review_fields.map((v:any)=>text(v,60)).filter(Boolean).slice(0,30):[]
    };

    if(!parsed.supplier&&!parsed.review_fields.includes('supplier'))parsed.review_fields.push('supplier');
    if(!parsed.date&&!parsed.review_fields.includes('date'))parsed.review_fields.push('date');
    if(!(parsed.amount&&parsed.amount>0)&&!parsed.review_fields.includes('amount'))parsed.review_fields.push('amount');

    const finishedAt=new Date().toISOString();
    const metadata=mergeMeta(attemptMeta,{
      provider:'openai-vision-fallback-v2',
      model:payload?.model||model,
      response_id:payload?.id||null,
      reason:String(r.status)==='no_text'?'local_ocr_no_text':'manual_or_processing_fallback',
      vision_state:'success',
      vision_finished_at:finishedAt
    });

    const {data:updated,error:updateError}=await db.from('pppp_expense_receipts_v1').update({
      status:'review',
      ocr_text:text(x.raw_text,120000),
      ocr_metadata:metadata,
      parsed_data:parsed,
      supplier:parsed.supplier,
      invoice_nr:parsed.invoice_nr,
      expense_date:parsed.date,
      category:parsed.category,
      amount:parsed.amount,
      net_amount:parsed.net_amount,
      vat_rate:parsed.vat_rate,
      vat_amount:parsed.vat_amount,
      currency:parsed.currency,
      vehicle_plate:parsed.vehicle_plate,
      quantity:parsed.quantity,
      unit:parsed.unit,
      unit_price:parsed.unit_price,
      confidence:parsed.confidence,
      review_fields:parsed.review_fields,
      last_error:null,
      updated_at:finishedAt
    }).eq('id',receiptId).is('expense_id',null)
      .select('id,status,supplier,invoice_nr,expense_date,category,amount,net_amount,vat_rate,vat_amount,currency,vehicle_plate,quantity,unit,unit_price,confidence,review_fields,expense_id,ocr_metadata')
      .single();

    if(updateError)throw updateError;

    return json({
      ok:true,
      receipt:updated,
      provider:metadata,
      human_confirmation_required:true,
      expense_created:false
    });
  }catch(e){
    const rawMessage=String(e instanceof Error?e.message:e).slice(0,1000);
    const safeMessage=publicError(rawMessage);

    if(receiptId&&receipt&&!receipt.expense_id){
      const failedAt=new Date().toISOString();
      const failedMeta=mergeMeta(attemptMeta||receipt.ocr_metadata,{
        vision_state:'failed',
        vision_finished_at:failedAt,
        vision_error:safeMessage
      });
      try{
        await db.from('pppp_expense_receipts_v1').update({
          ocr_metadata:failedMeta,
          last_error:'Leximi vizual dështoi: '+safeMessage,
          updated_at:failedAt
        }).eq('id',receiptId).is('expense_id',null);
      }catch(_ignored){}
    }

    const status=rawMessage==='unauthorized'?401:500;
    return json({ok:false,error:safeMessage},status);
  }
});