import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Retired 2026-08-15 during PPPP production audit.
// The previous unauthenticated function could mutate GitHub main using a
// server-side token. No current repository or cron caller exists, so the
// mutation surface is intentionally disabled rather than preserved.
Deno.serve(() => new Response(
  JSON.stringify({ ok: false, error: "github-deploy is retired; use the guarded GitHub PR workflow." }),
  { status: 410, headers: { "Content-Type": "application/json" } },
));
