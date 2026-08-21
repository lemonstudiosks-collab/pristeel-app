#!/usr/bin/env python3
import json, os, re, sys, time, urllib.request, urllib.error

QUEUE=os.environ.get('PPPP_SEMANTIC_QUEUE_URL','https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/semantic-local-queue')
KEY=os.environ.get('PPPP_SEMANTIC_WORKER_KEY','').strip()
LLAMA=os.environ.get('PPPP_LLAMA_URL','http://127.0.0.1:8080/v1/chat/completions')
MODEL=os.environ.get('PPPP_LOCAL_MODEL','Qwen3-1.7B-Q4_K_M')
POLL=float(os.environ.get('PPPP_SEMANTIC_POLL_SECONDS','4'))

if not KEY:
    print('PPPP_SEMANTIC_WORKER_KEY missing', file=sys.stderr)
    sys.exit(2)

def request_json(url, payload, headers=None, timeout=180):
    data=json.dumps(payload, ensure_ascii=False).encode('utf-8')
    h={'Content-Type':'application/json'}
    if headers: h.update(headers)
    req=urllib.request.Request(url,data=data,headers=h,method='POST')
    with urllib.request.urlopen(req,timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))

def queue(payload):
    return request_json(QUEUE,payload,{'x-pppp-worker-key':KEY},60)

def source_text(p):
    bits=[]
    for s in p.get('sources') or []:
        bits.append(str(s.get('label') or ''))
        bits.append(str(s.get('text') or ''))
    return ' '.join(bits).lower()

def hard_guard(result,payload):
    txt=source_text(payload)
    stop_patterns=[
        r'\b(stop|hold|suspend|pause)\b.{0,100}\b(fabrication|production|manufactur|weld|assembly)\b',
        r'\b(fabrication|production|manufactur|weld|assembly)\b.{0,100}\b(stop|hold|suspend|pause)\b',
        r'ndal.{0,70}(prodh|fabrik)', r'zaustav.{0,70}(proizvod|izradu)', r'produktion.{0,70}(stop|halt)'
    ]
    if any(re.search(p,txt,re.I|re.S) for p in stop_patterns):
        result['action_required']=True
        result['priority']='critical'
        result['category']='production_change'
        if not str(result.get('summary') or '').strip():
            result['summary']='Kërkohet ndalim i prodhimit/fabrikimit deri në sqarim ose dokumentacion të ri.'
    return result

def validate(result,payload):
    if not isinstance(result,dict): raise ValueError('model result is not an object')
    required=['action_required','priority','category','summary','workflow_intent','confidence','required_capabilities','required_grades','requirements','risks','missing_information','recommended_supplier_names','rfq_scope_lines']
    missing=[k for k in required if k not in result]
    if missing: raise ValueError('missing fields: '+','.join(missing))
    if not isinstance(result['action_required'],bool): raise ValueError('action_required must be boolean')
    if result['priority'] not in ['critical','high','medium','low']: raise ValueError('invalid priority')
    if not isinstance(result['summary'],str): raise ValueError('summary must be string')
    result['confidence']=max(0,min(100,int(result.get('confidence') or 0)))
    for k in ['required_capabilities','required_grades','requirements','risks','missing_information','recommended_supplier_names','rfq_scope_lines']:
        if not isinstance(result.get(k),list): result[k]=[]
    allowed_names={str(x.get('name')) for x in payload.get('supplier_candidates') or []}
    result['recommended_supplier_names']=[x for x in result['recommended_supplier_names'] if str(x) in allowed_names]
    allowed_caps={'fabrication','galvanizing','coating','heavy_plate','sheet','profiles','tubes','hardware','machining'}
    result['required_capabilities']=[x for x in result['required_capabilities'] if x in allowed_caps]
    return hard_guard(result,payload)

def analyze(job):
    p=job.get('payload') or {}
    schema=p.get('response_schema') or {}
    user={
      'guard':p.get('guard'), 'bom':p.get('bom'), 'deterministic':p.get('deterministic'),
      'supplier_candidates':p.get('supplier_candidates'), 'meta':p.get('meta'), 'context':p.get('context'), 'sources':p.get('sources')
    }
    body={
      'model':'local','temperature':0,'max_tokens':900,
      'messages':[
        {'role':'system','content':str(p.get('system') or 'You are PRISTEEL PPPP semantic AI. /no_think Return JSON only.')},
        {'role':'user','content':'/no_think Analyze this PPPP context. Use only supplied facts. Return JSON matching the schema.\n'+json.dumps(user,ensure_ascii=False,separators=(',',':'))}
      ],
      'response_format':{'type':'json_schema','json_schema':{'name':'pppp_semantic_analysis','strict':True,'schema':schema}}
    }
    out=request_json(LLAMA,body,timeout=240)
    content=(((out.get('choices') or [{}])[0].get('message') or {}).get('content'))
    if isinstance(content,dict): result=content
    else: result=json.loads(str(content or '').strip())
    return validate(result,p)

def main():
    print('PPPP local semantic worker started')
    print('queue:',QUEUE)
    print('llama:',LLAMA)
    while True:
        try:
            q=queue({'action':'claim'})
            job=q.get('job') if isinstance(q,dict) else None
            if not job:
                time.sleep(POLL); continue
            jid=job.get('id'); pname=((job.get('payload') or {}).get('context') or {}).get('project',{}).get('name','')
            print(time.strftime('%Y-%m-%d %H:%M:%S'),'claimed',jid,pname,flush=True)
            last=None
            for attempt in range(1,4):
                try:
                    result=analyze(job)
                    queue({'action':'complete','job_id':jid,'model':MODEL,'result':result})
                    print(time.strftime('%Y-%m-%d %H:%M:%S'),'completed',jid,result.get('priority'),result.get('category'),flush=True)
                    last=None; break
                except Exception as e:
                    last=e
                    print(time.strftime('%Y-%m-%d %H:%M:%S'),'attempt',attempt,'failed:',repr(e),flush=True)
                    time.sleep(min(12,attempt*3))
            if last is not None:
                try: queue({'action':'complete','job_id':jid,'model':MODEL,'error':str(last)[:2500]})
                except Exception: pass
                print(time.strftime('%Y-%m-%d %H:%M:%S'),'job failed',jid,repr(last),flush=True)
        except KeyboardInterrupt:
            print('stopped'); return
        except Exception as e:
            print(time.strftime('%Y-%m-%d %H:%M:%S'),'worker error:',repr(e),flush=True)
            time.sleep(8)

if __name__=='__main__': main()
