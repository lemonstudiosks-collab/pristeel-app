#!/usr/bin/env python3
import json, os, subprocess, tempfile, time, urllib.request, urllib.error

QUEUE=os.environ.get('PPPP_SEMANTIC_QUEUE_URL','https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/semantic-local-queue')
KEY=os.environ.get('PPPP_SEMANTIC_WORKER_KEY','').strip()
LLAMA=os.environ.get('PPPP_LLAMA_URL','http://127.0.0.1:8080/v1/chat/completions')
MODEL=os.environ.get('PPPP_LOCAL_MODEL','Qwen3-1.7B-Q4_K_M')
POLL=float(os.environ.get('PPPP_SEMANTIC_POLL_SECONDS','4'))
SUPPORTED_PAYLOAD_VERSION=3
CURL=os.environ.get('PPPP_CURL_BIN','/usr/bin/curl')
LLAMA_TIMEOUT_NORMAL=float(os.environ.get('PPPP_LLAMA_TIMEOUT_NORMAL','240'))
LLAMA_TIMEOUT_TINY=float(os.environ.get('PPPP_LLAMA_TIMEOUT_TINY','180'))
MAX_TOKENS_NORMAL=int(os.environ.get('PPPP_LLAMA_MAX_TOKENS_NORMAL','220'))
MAX_TOKENS_TINY=int(os.environ.get('PPPP_LLAMA_MAX_TOKENS_TINY','180'))

if not KEY:
    raise SystemExit('PPPP_SEMANTIC_WORKER_KEY missing')

def request_json(url,payload,headers=None,timeout=60):
    raw=json.dumps(payload,ensure_ascii=False).encode('utf-8')
    h={'Content-Type':'application/json'}
    if headers:h.update(headers)
    req=urllib.request.Request(url,data=raw,headers=h,method='POST')
    try:
        with urllib.request.urlopen(req,timeout=timeout) as r:
            return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body=''
        try:body=e.read().decode('utf-8','replace')[:1200]
        except Exception:pass
        raise RuntimeError('HTTP %s: %s'%(e.code,body or e.reason))

def llama_text(payload,timeout):
    raw=json.dumps(payload,ensure_ascii=False).encode('utf-8')
    with tempfile.NamedTemporaryFile(prefix='pppp-llama-',suffix='.json',delete=True) as f:
        f.write(raw);f.flush()
        cmd=[CURL,'--silent','--show-error','--fail-with-body','--connect-timeout','5','--max-time',str(int(timeout)),'-H','Content-Type: application/json','--data-binary','@'+f.name,LLAMA]
        try:
            p=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout+8,check=False)
        except subprocess.TimeoutExpired:
            raise TimeoutError('local llama hard timeout after %ss'%timeout)
        body=p.stdout.decode('utf-8','replace')
        err=p.stderr.decode('utf-8','replace').strip()
        if p.returncode!=0:
            raise RuntimeError('local llama curl %s: %s'%(p.returncode,(body or err)[:1400]))
        try:out=json.loads(body)
        except Exception as e:raise RuntimeError('invalid llama response JSON: %s'%e)
        content=(((out.get('choices') or [{}])[0].get('message') or {}).get('content'))
        if not isinstance(content,str) or not content.strip():
            raise ValueError('empty model content')
        return content.strip()

def queue(payload):
    return request_json(QUEUE,payload,{'x-pppp-worker-key':KEY},60)

def as_list(value,limit=2):
    if not value or value.strip() in ('-','none','None','[]'):
        return []
    out=[]
    for item in value.split(';'):
        item=' '.join(item.strip().split())
        if item and item not in out:out.append(item[:180])
        if len(out)>=limit:break
    return out

def validate(result,payload):
    if not isinstance(result,dict):raise ValueError('model result is not an object')
    req=['action_required','priority','category','summary','workflow_intent','confidence','required_capabilities','required_grades','requirements','risks','missing_information','recommended_supplier_names','rfq_scope_lines']
    miss=[k for k in req if k not in result]
    if miss:raise ValueError('missing fields: '+','.join(miss))
    if not isinstance(result['action_required'],bool):raise ValueError('action_required must be boolean')
    if result['priority'] not in ['critical','high','medium','low']:raise ValueError('invalid priority')
    if result['category'] not in ['production_change','client_request','supplier_update','acknowledgement','technical_change','commercial_change','procurement_request','no_action','other']:raise ValueError('invalid category')
    if result['workflow_intent'] not in ['procurement_prepare','await_supplier','supplier_response','await_client','commercial_offer','execution','review_required','no_action']:raise ValueError('invalid workflow_intent')
    result['confidence']=max(0,min(100,int(result.get('confidence') or 0)))
    for k in ['required_capabilities','required_grades','requirements','risks','missing_information','recommended_supplier_names','rfq_scope_lines']:
        if not isinstance(result.get(k),list):result[k]=[]
    names={str(x.get('name')) for x in payload.get('supplier_candidates') or []}
    result['recommended_supplier_names']=[x for x in result['recommended_supplier_names'] if str(x) in names]
    caps={'fabrication','galvanizing','coating','heavy_plate','sheet','profiles','tubes','hardware','machining'}
    result['required_capabilities']=[x for x in result['required_capabilities'] if x in caps]
    return result

def parse_tagged(text,payload):
    vals={}
    for raw in text.replace('```','').splitlines():
        if '|' not in raw:continue
        k,v=raw.split('|',1)
        k=k.strip().upper();v=v.strip()
        if k in {'A','P','C','W','F','S','R','K','M','N','Q'} and k not in vals:
            vals[k]=v
    missing=[k for k in ('A','P','C','W','F','S') if not vals.get(k)]
    if missing:raise ValueError('tagged output missing: '+','.join(missing))
    deterministic=payload.get('deterministic') or {}
    try:confidence=int(float(vals['F']))
    except Exception:confidence=0
    result={
      'action_required':vals['A'].lower() in ('1','true','yes','y'),
      'priority':vals['P'].lower(),
      'category':vals['C'].lower(),
      'summary':' '.join(vals['S'].split())[:240],
      'workflow_intent':vals['W'].lower(),
      'confidence':confidence,
      'required_capabilities':[str(x) for x in (deterministic.get('required_capabilities') or [])],
      'required_grades':[str(x) for x in (deterministic.get('required_grades') or [])],
      'requirements':as_list(vals.get('R','')),
      'risks':as_list(vals.get('K','')),
      'missing_information':as_list(vals.get('M','')),
      'recommended_supplier_names':as_list(vals.get('N','')),
      'rfq_scope_lines':as_list(vals.get('Q','')),
    }
    return validate(result,payload)

def compact_payload(p,tiny=False):
    ctx=p.get('context') or {}
    source_limit=1 if tiny else 2
    source_chars=180 if tiny else 280
    candidate_limit=3 if tiny else 5
    src=[]
    for s in (p.get('sources') or [])[:source_limit]:
        src.append({'type':s.get('type'),'label':str(s.get('label') or '')[:100],'date':s.get('date'),'text':str(s.get('text') or '')[:source_chars]})
    candidates=[]
    for s in (p.get('supplier_candidates') or [])[:candidate_limit]:
        candidates.append({'name':s.get('name'),'business_type':s.get('business_type'),'categories':s.get('categories'),'grades':s.get('grades'),'score':s.get('deterministic_score')})
    bom=p.get('bom') or {}
    return {
      'guard':p.get('guard'),
      'bom':{'kg':bom.get('kg'),'rows':bom.get('rows'),'grades':(bom.get('grades') or [])[:4],'profiles':(bom.get('profiles') or [])[:6],'surfaces':(bom.get('surfaces') or [])[:3],'needs_review_rows':bom.get('needs_review_rows')},
      'deterministic':p.get('deterministic'),
      'supplier_candidates':candidates,
      'project':ctx.get('project'),
      'sources':src
    }

def analyze(job,tiny=False):
    p=job.get('payload') or {}
    if int(p.get('worker_payload_version') or 0)!=SUPPORTED_PAYLOAD_VERSION:
        raise ValueError('unsupported semantic payload version')
    user=compact_payload(p,tiny=tiny)
    user_json=json.dumps(user,ensure_ascii=False,separators=(',',':'))
    print('  semantic input bytes:',len(user_json.encode('utf-8')),'mode:',('tiny' if tiny else 'normal'),flush=True)
    timeout=LLAMA_TIMEOUT_TINY if tiny else LLAMA_TIMEOUT_NORMAL
    max_tokens=MAX_TOKENS_TINY if tiny else MAX_TOKENS_NORMAL
    format_spec=(
      'Return exactly 11 lines, no markdown and no extra text. Use this format:\n'
      'A|true or false\nP|critical/high/medium/low\n'
      'C|production_change/client_request/supplier_update/acknowledgement/technical_change/commercial_change/procurement_request/no_action/other\n'
      'W|procurement_prepare/await_supplier/supplier_response/await_client/commercial_offer/execution/review_required/no_action\n'
      'F|0-100\nS|summary max 18 words\nR|up to 2 requirements separated by ; or -\n'
      'K|up to 2 risks separated by ; or -\nM|up to 2 missing facts separated by ; or -\n'
      'N|up to 2 supplier names exactly as supplied, separated by ; or -\nQ|up to 2 RFQ scope lines separated by ; or -\n'
      'Use only supplied facts. Prefer - instead of guessing. /no_think\n'
    )
    body={
      'model':'local','temperature':0,'max_tokens':max_tokens,
      'messages':[
        {'role':'system','content':'You are PRISTEEL PPPP semantic classifier. /no_think Be terse and factual.'},
        {'role':'user','content':format_spec+user_json}
      ]
    }
    return parse_tagged(llama_text(body,timeout),p)

def main():
    print('PPPP local semantic worker started',flush=True)
    print('queue:',QUEUE,flush=True)
    print('llama:',LLAMA,flush=True)
    print('mode: compact-tagged-v1',flush=True)
    while True:
        try:
            q=queue({'action':'claim'})
            job=q.get('job') if isinstance(q,dict) else None
            if not job:
                time.sleep(POLL);continue
            jid=job.get('id');pname=((job.get('payload') or {}).get('context') or {}).get('project',{}).get('name','')
            print(time.strftime('%Y-%m-%d %H:%M:%S'),'claimed',jid,pname,flush=True)
            last=None
            for attempt in range(1,3):
                try:
                    result=analyze(job,tiny=(attempt>1))
                    ack=queue({'action':'complete','job_id':jid,'model':MODEL,'result':result})
                    if not ack.get('ok'):raise RuntimeError('queue completion rejected: '+str(ack))
                    print(time.strftime('%Y-%m-%d %H:%M:%S'),'completed',jid,result.get('confidence'),result.get('priority'),result.get('category'),flush=True)
                    last=None;break
                except Exception as e:
                    last=e
                    print(time.strftime('%Y-%m-%d %H:%M:%S'),'attempt',attempt,'failed:',repr(e),flush=True)
                    if 'unsupported semantic payload version' in str(e):break
                    time.sleep(min(4,attempt*2))
            if last is not None:
                try:queue({'action':'complete','job_id':jid,'model':MODEL,'error':str(last)[:2500]})
                except Exception as qerr:print('queue failure report rejected:',repr(qerr),flush=True)
                print(time.strftime('%Y-%m-%d %H:%M:%S'),'job failed',jid,repr(last),flush=True)
        except KeyboardInterrupt:
            return
        except Exception as e:
            print(time.strftime('%Y-%m-%d %H:%M:%S'),'worker error:',repr(e),flush=True)
            time.sleep(8)

if __name__=='__main__':main()
