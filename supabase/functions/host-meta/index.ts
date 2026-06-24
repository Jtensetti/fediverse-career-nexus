import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOLTO_DOMAIN = Deno.env.get("SITE_URL")?.replace("https://", "").replace("http://", "") ?? "nolto.social";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Handle both /.well-known/host-meta and direct /host-meta paths
    if (path.endsWith("/host-meta") || path.endsWith("/host-meta.json")) {
      const acceptHeader = req.headers.get("accept") || "";
      
      // Check if JSON format is requested
      if (acceptHeader.includes("application/json") || path.endsWith(".json")) {
        const jsonResponse = {
          links: [
            {
              rel: "lrdd",
              type: "application/jrd+json",
              template: `https://${NOLTO_DOMAIN}/.well-known/webfinger?resource={uri}`
            }
          ]
        };
        
        return new Response(JSON.stringify(jsonResponse), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=86400"
          }
        });
      }
      
      // Default to XRD (XML) format
      const xrdResponse = `<?xml version="1.0" encoding="UTF-8"?>
<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
  <Link rel="lrdd" type="application/jrd+json" template="https://${NOLTO_DOMAIN}/.well-known/webfinger?resource={uri}"/>
</XRD>`;

      return new Response(xrdResponse, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xrd+xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400"
        }
      });
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error processing host-meta request:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
