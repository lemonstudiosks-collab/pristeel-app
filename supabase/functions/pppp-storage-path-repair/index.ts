import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  return new Response(JSON.stringify({
    ok: false,
    error: "function_retired",
    function: "pppp-storage-path-repair",
    retired_at: "2026-09-22",
  }), { status: 410, headers });
});

