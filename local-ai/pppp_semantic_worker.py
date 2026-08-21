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

def request_json(url,payload,headers=None,timeout=180):
    raw=json.dumps(payload,ensure_ascii=False).encode('utf-8')
    h={'Content-Type':'application/json'}
    if headers:h.update(headers)
    req=urllib.request.Request(url,data=raw,headers=h,method='POST')
    try:
        with urllib.request.urlopen(req,timeout=timeout) as r:
            return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body=''
        try: body=e.read().decode('utf-8','replace')[:1200]
        except Exception: pass
        raise RuntimeError('HTTP %s: %s' % (e.code,body or e.reason))

def queue(payload):
    return request_json(QUEUE,payload,{'x-pppp-worker-key':KEY},60)

def source_text(p):
    bits=[]
    for s in p.get('sources') or []:
        bits.extend([str(s.get('label') or ''),str(s.get('text') or '')])
    return ' '.join(bits).lower()

def hard_guard(result,payload):
    txt=source_text(payload)
    stop=[
      r'\b(stop|hold|suspend|pause)\b.{0,100}\b(fabrication|production|manufactur|weld|assembly)\b',
      r'\b(fabrication|production|manufactur|weld|assembly)\b.{0,100}\b(stop|hold|suspend|pause)\b',
      r'ndal.{0,70}(prodh|fabrik)',r'zaustav.{0,70}(proizvod|izradu)',r'produktion.{0,70}(stop|halt)'
    ]
    if any(re.search(x,txt,re.I|re.S) for x in stop):
        result['action_required']=True
        result['priority']='critical'
        result['category']='production_change'
        if not str(result.get('summary') or '').strip():
            result['summary']='Kërkohet ndalim i prodhimit/fabrikimit deri në sqarim ose dokumentacion të ri.'
    return result

def validate(result,payload):
    if not isinstance(result,dict):raise ValueError('model result is not an object')
    req=['action_required','priority','category','summary','workflow_intent','confidence','required_capabilities','required_grades','requirements','risks','missing_information','recommended_supplier_names','rfq_scope_lines']
    miss=[k for k in req if k not in result]
    if miss:raise ValueError('missing fields: '+','.join(miss))
    if not isinstance(result['action_required'],bool):raise ValueError('action_required must be boolean')
    if result['priority'] not in ['critical','high','medium','low']:raise ValueError('invalid priority')
    if not isinstance(result['summary'],str):raise ValueError('summary must be string')
    result['confidence']=max(0,min(100,int(result.get('confidence') or 0)))
    for k in ['required_capabilities','required_grades','requirements','risks','missing_information','recommended_supplier_names','rfq_scope_lines']:
        if not isinstance(result.get(k),list):result[k]=[]
    names={str(x.get('name')) for x in payload.get('supplier_candidates') or []}
    result['recommended_supplier_names']=[x for x in result['recommended_supplier_names'] if str(x) in names]
    caps={'fabrication','galvanizing','coating','heavy_plate','sheet','profiles','tubes','hardware','machining'}
    result['required_capabilities']=[x for x in result['required_capabilities'] if x in caps]
    return hard_guard(result,payload)

def compact_payload(p,tiny=False):
    ctx=p.get('context') or {}
    source_limit=4 if tiny else 6
    source_chars=420 if tiny else 650
    candidate_limit=6 if tiny else 8
    src=[]
    for s in (p.get('sources') or [])[:source_limit]:
        src.append({'id':s.get('id'),'type':s.get('type'),'label':str(s.get('label') or '')[:140],'date':s.get('date'),'text':str(s.get('text') or '')[:source_chars],'meta':s.get('meta')})
    candidates=[]
    for s in (p.get('supplier_candidates') or [])[:candidate_limit]:
        contacts=[]
        for c in (s.get('contacts') or [])[:1]:
            contacts.append({'full_name':c.get('full_name'),'email':c.get('email'),'language':c.get('language'),'is_primary':c.get('is_primary')})
        candidates.append({'name':s.get('name'),'business_type':s.get('business_type'),'categories':s.get('categories'),'grades':s.get('grades'),'class_approval':s.get('class_approval'),'deterministic_score':s.get('deterministic_score'),'contacts':contacts})
    project=dict(ctx.get('project') or {})
    if tiny and 'notes' in project: project['notes']=str(project.get('notes') or '')[:700]
    return {
      'guard':p.get('guard'),'bom':p.get('bom'),'deterministic':p.get('deterministic'),'supplier_candidates':candidates,'meta':p.get('meta'),
      'context':{'project':project,'current_rfqs':(ctx.get('current_rfqs') or [])[:(4 if tiny else 6)],'supplier_offers':(ctx.get('supplier_offers') or [])[:(3 if tiny else 4)]},
      'sources':src
    }

def analyze(job,tiny=False):
    p=job.get('payload') or {}
    schema=p.get('response_schema') or {}
    user=compact_payload(p,tiny=tiny)
    user_json=json.dumps(user,ensure_ascii=False,separators=(',',':'))
    print('  semantic input bytes:',len(user_json.encode('utf-8')),'mode:',('tiny' if tiny else 'normal'),flush=True)
    body={
      'model':'local','temperature':0,'max_tokens':650,
      'messages':[
        {'role':'system','content':str(p.get('system') or 'You are PRISTEEL PPPP semantic AI. /no_think Return JSON only.')},
        {'role':'user','content':'/no_think Analyze this PPPP context. Use only supplied facts. Return JSON matching the schema.\n'+user_json}
      ],
      'response_format':{'type':'json_schema','json_schema':{'name':'pppp_semantic_analysis','strict':True,'schema':schema}}
    }
    out=request_json(LLAMA,body,timeout=240)
    content=(((out.get('choices') or [{}])[0].get('message') or {}).get('content'))
    result=content if isinstance(content,dict) else json.loads(str(content or '').strip())
    return validate(result,p)

def main():
    print('PPPP local semantic worker started',flush=True)
    print('queue:',QUEUE,flush=True)
    print('llama:',LLAMA,flush=True)
    while True:
        try:
            q=queue({'action':'claim'})
            job=q.get('job') if isinstance(q,dict) else None
            if not job:
                time.sleep(POLL);continue
            jid=job.get('id');pname=((job.get('payload') or {}).get('context') or {}).get('project',{}).get('name','')
            print(time.strftime('%Y-%m-%d %H:%M:%S'),'claimed',jid,pname,flush=True)
            last=None
            for attempt in range(1,4):
                try:
                    result=analyze(job,tiny=(attempt>1))
                    queue({'action':'complete','job_id':jid,'model':MODEL,'result':result})
                    print(time.strftime('%Y-%m-%d %H:%M:%S'),'completed',jid,result.get('priority'),result.get('category'),flush=True)
                    last=None;break
                except Exception as e:
                    last=e
                    print(time.strftime('%Y-%m-%d %H:%M:%S'),'attempt',attempt,'failed:',repr(e),flush=True)
                    time.sleep(min(8,attempt*2))
            if last is not None:
                try:queue({'action':'complete','job_id':jid,'model':MODEL,'error':str(last)[:2500]})
                except Exception:pass
                print(time.strftime('%Y-%m-%d %H:%M:%S'),'job failed',jid,repr(last),flush=True)
        except KeyboardInterrupt:
            print('stopped');return
        except Exception as e:
            print(time.strftime('%Y-%m-%d %H:%M:%S'),'worker error:',repr(e),flush=True)
            time.sleep(8)

if __name__=='__main__':main()
