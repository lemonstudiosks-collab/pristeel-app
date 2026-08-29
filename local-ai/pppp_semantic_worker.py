#!/usr/bin/env python3
import json, os, subprocess, sys, tempfile, time, urllib.request, urllib.error

QUEUE=os.environ.get('PPPP_SEMANTIC_QUEUE_URL','https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/semantic-local-queue')
KEY=os.environ.get('PPPP_SEMANTIC_WORKER_KEY','').strip()
LLAMA=os.environ.get('PPPP_LLAMA_URL','http://127.0.0.1:8080/v1/chat/completions')
MODEL=os.environ.get('PPPP_LOCAL_MODEL','Qwen3-1.7B-Q4_K_M')
POLL=float(os.environ.get('PPPP_SEMANTIC_POLL_SECONDS','4'))
SUPPORTED_PAYLOAD_VERSION=3
CURL=os.environ.get('PPPP_CURL_BIN','/usr/bin/curl')
LLAMA_TIMEOUT_NORMAL=float(os.environ.get('PPPP_LLAMA_TIMEOUT_NORMAL','300'))
LLAMA_TIMEOUT_TINY=float(os.environ.get('PPPP_LLAMA_TIMEOUT_TINY','240'))
MAX_TOKENS_NORMAL=int(os.environ.get('PPPP_LLAMA_MAX_TOKENS_NORMAL','320'))
MAX_TOKENS_TINY=int(os.environ.get('PPPP_LLAMA_MAX_TOKENS_TINY','220'))

if not KEY:
    print('PPPP_SEMANTIC_WORKER_KEY missing',file=sys.stderr)
    sys.exit(2)

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

def llama_json(payload,timeout):
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
        try:return json.loads(body)
        except Exception as e:raise RuntimeError('invalid llama JSON: %s; body=%s'%(e,body[:800]))

def queue(payload):
    return request_json(QUEUE,payload,{'x-pppp-worker-key':KEY},60)

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
    return result

def compact_payload(p,tiny=False):
    ctx=p.get('context') or {}
    source_limit=3 if tiny else 5
    source_chars=320 if tiny else 520
    candidate_limit=5 if tiny else 7
    src=[]
    for s in (p.get('sources') or [])[:source_limit]:
        src.append({'id':s.get('id'),'type':s.get('type'),'label':str(s.get('label') or '')[:120],'date':s.get('date'),'text':str(s.get('text') or '')[:source_chars],'meta':s.get('meta')})
    candidates=[]
    for s in (p.get('supplier_candidates') or [])[:candidate_limit]:
        contacts=[]
        for c in (s.get('contacts') or [])[:1]:
            contacts.append({'full_name':c.get('full_name'),'email':c.get('email'),'language':c.get('language'),'is_primary':c.get('is_primary')})
        candidates.append({'name':s.get('name'),'business_type':s.get('business_type'),'categories':s.get('categories'),'grades':s.get('grades'),'class_approval':s.get('class_approval'),'deterministic_score':s.get('deterministic_score'),'contacts':contacts})
    return {
      'guard':p.get('guard'),'bom':p.get('bom'),'deterministic':p.get('deterministic'),'supplier_candidates':candidates,'meta':p.get('meta'),
      'context':{'project':ctx.get('project'),'current_rfqs':(ctx.get('current_rfqs') or [])[:(3 if tiny else 5)],'supplier_offers':(ctx.get('supplier_offers') or [])[:(2 if tiny else 3)]},
      'sources':src
    }

def analyze(job,tiny=False):
    p=job.get('payload') or {}
    if int(p.get('worker_payload_version') or 0)!=SUPPORTED_PAYLOAD_VERSION:
        raise ValueError('unsupported semantic payload version')
    schema=p.get('response_schema') or {}
    user=compact_payload(p,tiny=tiny)
    user_json=json.dumps(user,ensure_ascii=False,separators=(',',':'))
    print('  semantic input bytes:',len(user_json.encode('utf-8')),'mode:',('tiny' if tiny else 'normal'),flush=True)
    max_tokens=MAX_TOKENS_TINY if tiny else MAX_TOKENS_NORMAL
    timeout=LLAMA_TIMEOUT_TINY if tiny else LLAMA_TIMEOUT_NORMAL
    body={
      'model':'local','temperature':0,'max_tokens':max_tokens,
      'messages':[
        {'role':'system','content':str(p.get('system') or 'You are PRISTEEL PPPP semantic AI. /no_think Return JSON only.')},
        {'role':'user','content':'/no_think Analyze this PPPP context. Use only supplied facts. Return JSON matching the schema.\n'+user_json}
      ],
      'response_format':{'type':'json_schema','json_schema':{'name':'pppp_semantic_analysis','strict':True,'schema':schema}}
    }
    out=llama_json(body,timeout)
    content=(((out.get('choices') or [{}])[0].get('message') or {}).get('content'))
    result=content if isinstance(content,dict) else json.loads(str(content or '').strip())
    return validate(result,p)

def main():
    print('PPPP local semantic worker started',flush=True)
    print('queue:',QUEUE,flush=True)
    print('llama:',LLAMA,flush=True)
    print('inference limits: normal=%ss/%s tokens tiny=%ss/%s tokens'%(LLAMA_TIMEOUT_NORMAL,MAX_TOKENS_NORMAL,LLAMA_TIMEOUT_TINY,MAX_TOKENS_TINY),flush=True)
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
                    time.sleep(min(6,attempt*2))
            if last is not None:
                try:queue({'action':'complete','job_id':jid,'model':MODEL,'error':str(last)[:2500]})
                except Exception as qerr:print('queue failure report rejected:',repr(qerr),flush=True)
                print(time.strftime('%Y-%m-%d %H:%M:%S'),'job failed',jid,repr(last),flush=True)
        except KeyboardInterrupt:
            print('stopped');return
        except Exception as e:
            print(time.strftime('%Y-%m-%d %H:%M:%S'),'worker error:',repr(e),flush=True)
            time.sleep(8)

if __name__=='__main__':main()
