// Kept as a tombstone so deploying this commit also disables existing deployments.
Deno.serve(() => new Response(JSON.stringify({ error: "This maintenance endpoint has been retired" }), {
  status: 410, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
}));
