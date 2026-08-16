#!/bin/bash
set -u

PATH="/opt/local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH

API_URL="${PPPP_OCR_API_URL:-https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/local-ocr-worker}"
WORKER_ID="${PPPP_OCR_WORKER_ID:-mac-mini-01}"
TOKEN_FILE="${PPPP_OCR_TOKEN_FILE:-$HOME/.pppp_ocr_token}"
BASE_DIR="${PPPP_OCR_BASE_DIR:-$HOME/pppp-ocr-worker}"
RUNTIME_DIR="$BASE_DIR/runtime"
LOG_FILE="$BASE_DIR/worker.log"
LOCK_DIR="$BASE_DIR/.lock"
LANGS="${PPPP_OCR_LANGS:-eng+deu+sqi+srp_latn+hrv+fra+nld}"
MAX_JOBS_PER_RUN="${PPPP_OCR_MAX_JOBS_PER_RUN:-5}"

mkdir -p "$BASE_DIR" "$RUNTIME_DIR"
touch "$LOG_FILE"
chmod 700 "$BASE_DIR" "$RUNTIME_DIR" 2>/dev/null || true
chmod 600 "$LOG_FILE" 2>/dev/null || true

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_FILE"
}

cleanup_lock() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  exit 0
fi
trap cleanup_lock EXIT INT TERM

required=(curl python3 shasum tesseract pdftoppm pdfinfo sips)
for cmd in "${required[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "ERROR missing dependency: $cmd"
    exit 1
  fi
done

if [ ! -f "$TOKEN_FILE" ]; then
  log "ERROR token file missing: $TOKEN_FILE"
  exit 1
fi
chmod 600 "$TOKEN_FILE" 2>/dev/null || true

api() {
  local payload="$1"
  curl -fsS -X POST "$API_URL" \
    -H 'Content-Type: application/json' \
    -H "x-pppp-worker-id: $WORKER_ID" \
    -H "x-pppp-worker-token: $(cat "$TOKEN_FILE")" \
    --data "$payload"
}

heartbeat() {
  local job_id="$1"
  api "{\"action\":\"heartbeat\",\"job_id\":$job_id}" >/dev/null 2>&1 || true
}

report_fail() {
  local job_id="$1"
  local message="$2"
  python3 - "$job_id" "$message" <<'PY' | while IFS= read -r payload; do
import json,sys
print(json.dumps({"action":"fail","job_id":int(sys.argv[1]),"error":sys.argv[2][:1800]}, ensure_ascii=False))
PY
    api "$payload" >/dev/null 2>&1 || true
  done
}

json_field() {
  local json_file="$1"
  local expr="$2"
  python3 - "$json_file" "$expr" <<'PY'
import json,sys
p=sys.argv[2].split('.')
with open(sys.argv[1], encoding='utf-8') as f: x=json.load(f)
for k in p:
    if not k: continue
    if x is None: break
    x=x.get(k) if isinstance(x,dict) else None
if x is None:
    print('')
elif isinstance(x,(dict,list)):
    print(json.dumps(x,ensure_ascii=False))
else:
    print(x)
PY
}

get_job() {
  local out="$1"
  if api '{"action":"current"}' > "$out" 2>/dev/null; then
    if [ -n "$(json_field "$out" 'job.job_id')" ]; then
      return 0
    fi
  fi
  api '{"action":"claim"}' > "$out"
}

mean_conf_and_text() {
  local image="$1"
  local prefix="$2"
  local tsv="$prefix.tsv"
  local txt="$prefix.txt"
  if ! tesseract "$image" stdout -l "$LANGS" tsv > "$tsv" 2>/dev/null; then
    : > "$txt"
    printf '0\n'
    return 0
  fi
  python3 - "$tsv" "$txt" <<'PY'
import csv,sys,collections,math
src,out=sys.argv[1],sys.argv[2]
lines=collections.OrderedDict(); conf=[]
with open(src,encoding='utf-8',errors='replace',newline='') as f:
    r=csv.DictReader(f,delimiter='\t')
    for row in r:
        text=(row.get('text') or '').strip()
        if not text: continue
        key=(row.get('page_num'),row.get('block_num'),row.get('par_num'),row.get('line_num'))
        lines.setdefault(key,[]).append(text)
        try:
            c=float(row.get('conf','-1'))
            if c>=0: conf.append(c)
        except: pass
text='\n'.join(' '.join(v) for v in lines.values()).strip()
with open(out,'w',encoding='utf-8') as g: g.write(text+'\n' if text else '')
avg=sum(conf)/len(conf) if conf else 0.0
# Penalize near-empty OCR so a few accidental high-confidence glyphs do not win.
if len(text)<20: avg*=0.25
elif len(text)<80: avg*=0.65
print(f'{avg:.4f}')
PY
}

osd_rotation() {
  local image="$1"
  local out
  out="$(tesseract "$image" stdout --psm 0 -l osd 2>&1 || true)"
  printf '%s\n' "$out" | awk -F': ' '/^Rotate:/{print $2; exit}' | tr -dc '0-9'
}

ocr_image_best() {
  local image="$1"
  local prefix="$2"
  local rotation rot_image normal_score rotated_score

  normal_score="$(mean_conf_and_text "$image" "${prefix}-normal")"
  rotation="$(osd_rotation "$image")"
  [ -n "$rotation" ] || rotation=0

  if [ "$rotation" = "0" ]; then
    cp "${prefix}-normal.txt" "${prefix}-best.txt"
    python3 - "$prefix" "$rotation" "$normal_score" <<'PY'
import json,sys
print(json.dumps({"rotation_candidate":int(sys.argv[2]),"chosen_rotation":0,"normal_score":float(sys.argv[3]),"rotated_score":None}))
PY
    return 0
  fi

  rot_image="${prefix}-rotated.png"
  if ! sips -r "$rotation" "$image" --out "$rot_image" >/dev/null 2>&1; then
    cp "${prefix}-normal.txt" "${prefix}-best.txt"
    python3 - "$prefix" "$rotation" "$normal_score" <<'PY'
import json,sys
print(json.dumps({"rotation_candidate":int(sys.argv[2]),"chosen_rotation":0,"normal_score":float(sys.argv[3]),"rotated_score":None,"rotation_error":"sips_failed"}))
PY
    return 0
  fi

  rotated_score="$(mean_conf_and_text "$rot_image" "${prefix}-rotated")"
  if python3 - "$normal_score" "$rotated_score" <<'PY'
import sys
# Require a modest improvement before rotating, because OSD confidence can be low.
n=float(sys.argv[1]); r=float(sys.argv[2])
sys.exit(0 if r >= n + 2.0 else 1)
PY
  then
    cp "${prefix}-rotated.txt" "${prefix}-best.txt"
    chosen="$rotation"
  else
    cp "${prefix}-normal.txt" "${prefix}-best.txt"
    chosen=0
  fi

  python3 - "$rotation" "$chosen" "$normal_score" "$rotated_score" <<'PY'
import json,sys
print(json.dumps({"rotation_candidate":int(sys.argv[1]),"chosen_rotation":int(sys.argv[2]),"normal_score":float(sys.argv[3]),"rotated_score":float(sys.argv[4])}))
PY
}

process_job() {
  local job_json="$1"
  local job_id file_name mime_type expected_sha download_url job_dir source_file actual_sha pages page page_img meta_line

  job_id="$(json_field "$job_json" 'job.job_id')"
  file_name="$(json_field "$job_json" 'job.file_name')"
  mime_type="$(json_field "$job_json" 'job.mime_type')"
  expected_sha="$(json_field "$job_json" 'job.source_sha256')"
  download_url="$(json_field "$job_json" 'job.download_url')"

  if [ -z "$job_id" ] || [ -z "$download_url" ]; then
    return 2
  fi

  job_dir="$RUNTIME_DIR/job-$job_id"
  rm -rf "$job_dir"
  mkdir -p "$job_dir/pages"
  source_file="$job_dir/source.bin"
  log "job=$job_id START file=$file_name mime=$mime_type"

  if ! curl -fL --silent --show-error "$download_url" -o "$source_file"; then
    report_fail "$job_id" 'download_failed'
    log "job=$job_id ERROR download_failed"
    return 1
  fi

  actual_sha="$(shasum -a 256 "$source_file" | awk '{print $1}')"
  if [ -n "$expected_sha" ] && [ "$actual_sha" != "$expected_sha" ]; then
    report_fail "$job_id" "sha256_mismatch expected=$expected_sha actual=$actual_sha"
    log "job=$job_id ERROR sha256_mismatch"
    return 1
  fi

  heartbeat "$job_id"
  : > "$job_dir/full.txt"
  : > "$job_dir/page_meta.jsonl"

  case "${file_name##*.}" in
    pdf|PDF)
      if ! pages="$(pdfinfo "$source_file" 2>/dev/null | awk '/^Pages:/{print $2; exit}')" || [ -z "$pages" ]; then
        report_fail "$job_id" 'pdfinfo_failed'
        return 1
      fi
      if ! pdftoppm -png -r 300 "$source_file" "$job_dir/pages/page" >/dev/null 2>&1; then
        report_fail "$job_id" 'pdf_render_failed'
        return 1
      fi
      page=0
      for page_img in "$job_dir"/pages/page-*.png; do
        [ -f "$page_img" ] || continue
        page=$((page+1))
        heartbeat "$job_id"
        meta_line="$(ocr_image_best "$page_img" "$job_dir/pages/ocr-$page")"
        printf '%s\n' "$meta_line" >> "$job_dir/page_meta.jsonl"
        printf '\n===== PAGE %s =====\n' "$page" >> "$job_dir/full.txt"
        cat "$job_dir/pages/ocr-$page-best.txt" >> "$job_dir/full.txt"
      done
      ;;
    png|PNG|jpg|JPG|jpeg|JPEG|webp|WEBP|gif|GIF|tif|TIF|tiff|TIFF|bmp|BMP)
      cp "$source_file" "$job_dir/pages/page-1.${file_name##*.}"
      meta_line="$(ocr_image_best "$job_dir/pages/page-1.${file_name##*.}" "$job_dir/pages/ocr-1")"
      printf '%s\n' "$meta_line" > "$job_dir/page_meta.jsonl"
      cp "$job_dir/pages/ocr-1-best.txt" "$job_dir/full.txt"
      pages=1
      ;;
    *)
      report_fail "$job_id" "unsupported_local_ocr_type:$file_name"
      log "job=$job_id ERROR unsupported_type"
      return 1
      ;;
  esac

  if [ ! -s "$job_dir/full.txt" ]; then
    report_fail "$job_id" 'ocr_empty'
    log "job=$job_id ERROR ocr_empty"
    return 1
  fi

  heartbeat "$job_id"
  if ! python3 - "$job_id" "$actual_sha" "$pages" "$LANGS" "$job_dir/full.txt" "$job_dir/page_meta.jsonl" <<'PY' > "$job_dir/submit.json"
import json,sys,subprocess
job_id=int(sys.argv[1]); sha=sys.argv[2]; pages=int(sys.argv[3]); langs=sys.argv[4]
with open(sys.argv[5],encoding='utf-8',errors='replace') as f: text=f.read()
meta=[]
with open(sys.argv[6],encoding='utf-8',errors='replace') as f:
    for i,line in enumerate(f,1):
        line=line.strip()
        if not line: continue
        try:
            x=json.loads(line); x['page']=i; meta.append(x)
        except Exception: pass
try:
    ver=subprocess.check_output(['tesseract','--version'],text=True,stderr=subprocess.STDOUT).splitlines()[0]
except Exception:
    ver='tesseract'
payload={
  'action':'submit','job_id':job_id,'source_sha256':sha,'text':text,
  'metadata':{
    'provider':'local-tesseract','engine':ver,'languages':langs,'pages':pages,
    'orientation_strategy':'osd-plus-confidence-comparison-v1','page_results':meta
  }
}
print(json.dumps(payload,ensure_ascii=False))
PY
  then
    report_fail "$job_id" 'submit_payload_failed'
    return 1
  fi

  if ! api "$(cat "$job_dir/submit.json")" > "$job_dir/submit_response.json"; then
    log "job=$job_id ERROR submit_http_failed"
    return 1
  fi
  if [ "$(json_field "$job_dir/submit_response.json" 'ok')" != "True" ] && [ "$(json_field "$job_dir/submit_response.json" 'ok')" != "true" ]; then
    log "job=$job_id ERROR submit_rejected response=$(cat "$job_dir/submit_response.json")"
    return 1
  fi

  chars="$(wc -c < "$job_dir/full.txt" | tr -d ' ')"
  log "job=$job_id DONE pages=$pages chars=$chars sha=$actual_sha"
  rm -rf "$job_dir"
  return 0
}

main() {
  local i job_json job_id
  for ((i=1; i<=MAX_JOBS_PER_RUN; i++)); do
    job_json="$RUNTIME_DIR/job-response.json"
    if ! get_job "$job_json"; then
      log "ERROR API claim/current failed"
      exit 1
    fi
    job_id="$(json_field "$job_json" 'job.job_id')"
    if [ -z "$job_id" ]; then
      exit 0
    fi
    process_job "$job_json" || exit 1
  done
}

main "$@"
