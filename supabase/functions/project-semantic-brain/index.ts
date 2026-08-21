import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(()=>new Response(JSON.stringify({ok:false,retired:true,replacement:'semantic-local-orchestrator',reason:'PPPP uses the free Mac mini local semantic AI path. Vertex/Gemini cloud inference is intentionally not used.'}),{status:410,headers:{'content-type':'application/json'}}));
