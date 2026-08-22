# PPPP Local Semantic AI

## Purpose

PPPP uses a free local model on the PRISTEEL Mac mini as a semantic interpretation layer. Existing deterministic project, procurement, document and commercial rules remain the authority.

No Vertex/Gemini cloud inference is used by this workflow.

## Runtime flow

1. Gmail/project/document automation ingests and links new information.
2. `semantic-local-orchestrator` builds a compact project context only when semantic work is relevant.
3. A job is stored in `semantic_ai_jobs`.
4. The Mac mini worker claims the job through `semantic-local-queue` using a hashed worker credential.
5. `llama-server` runs Qwen3 1.7B locally on `127.0.0.1:8080` and returns strict JSON-schema output.
6. The worker returns that JSON to Supabase.
7. The orchestrator revalidates it against current project state and deterministic evidence before applying anything.
8. The result may create an internal task or supplier RFQ draft. Nothing is sent automatically.

## Safety ownership

The local model may interpret meaning, identify requirements, summarize risks, suggest workflow intent and rank already-known supplier candidates.

The local model may not:

- choose or change project identity;
- invent suppliers, prices, quantities, standards, certificates or dates;
- change commercial prices or commitments;
- send email;
- mark an RFQ as sent;
- place an order;
- accept a contract;
- set Won/Lost;
- override explicit wait/execution state.

Critical production-stop classification requires matching evidence in the latest incoming email. Low-confidence semantic actions are suppressed.

Supplier routing is constrained to active PPPP partner master-data and deterministic capability/grade filters. AI preference is only a secondary ranking boost when confidence is sufficient.

## RFQ human gate

Semantic RFQs are stored only as `draft` or `draft_review`.

`draft_review` is used when BOM review is pending, AI confidence is low, or documentation linkage is missing. The Project-first Procurement UI requires explicit human approval before Gmail can be opened.

Opening Gmail is not evidence of sending. `sent` and `replied` continue to be reconciled from actual Gmail evidence.

## Mac mini runtime

Production target:

- macOS 12.7.6 Intel x86_64
- 8 GB RAM
- locally compiled llama.cpp with Accelerate/BLAS/Metal disabled for Monterey compatibility
- Qwen3-1.7B-Q4_K_M GGUF
- context 8192
- 2 CPU threads
- one inference slot

`local-ai/install_macos12_intel.sh` installs LaunchAgents for:

- `com.pristeel.pppp-llama`
- `com.pristeel.pppp-semantic-worker`
- `com.pristeel.pppp-awake`

The worker credential is passed at install time and is never committed to Git.

## Server components

- `supabase/functions/semantic-local-queue`
- `supabase/functions/semantic-local-orchestrator`
- `supabase/sql/semantic-local-ai.sql`
- `local-ai/pppp_semantic_worker.py`
- `local-ai/install_macos12_intel.sh`
- `pristeel-semantic-rfq-drafts-v1.js`

The legacy `project-semantic-brain` endpoint is intentionally retired with HTTP 410 so paid cloud inference cannot be used accidentally.
