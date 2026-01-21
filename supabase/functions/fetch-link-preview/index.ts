const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  domain?: string;
}

// Simple in-memory cache (resets on cold start)
const cache = new Map<string, { data: LinkPreviewData; expires: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function extractMetaContent(html: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHTMLEntities(match[1].trim());
    }
  }
  return undefined;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

function resolveUrl(base: string, relative: string | undefined): string | undefined {
  if (!relative) return undefined;
  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }
  if (relative.startsWith("//")) {
    return `https:${relative}`;
  }
  try {
    return new URL(relative, base).href;
  } catch {
    return undefined;
  }
}

async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinkPreviewBot/1.0; +https://nolto.social)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ success: false, error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domain = parsedUrl.hostname.replace(/^www\./, "");

    // Check cache
    const cached = cache.get(url);
    if (cached && cached.expires > Date.now()) {
      console.log("Cache hit for:", url);
      return new Response(JSON.stringify({ success: true, data: cached.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching preview for:", url);

    // Fetch the page
    let html: string;
    try {
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        // Not HTML, return basic info
        const data: LinkPreviewData = { url, domain };
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      html = await response.text();
    } catch (error) {
      console.error("Fetch error:", error);
      // Return basic info on fetch failure
      const data: LinkPreviewData = { url, domain };
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract OpenGraph and meta tags using regex (simpler than DOM parsing for edge functions)
    const title = extractMetaContent(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);

    const description = extractMetaContent(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
      /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:description["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
    ]);

    const imageRaw = extractMetaContent(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ]);

    const siteName = extractMetaContent(html, [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
    ]);

    const image = resolveUrl(url, imageRaw);

    const data: LinkPreviewData = {
      url,
      domain,
      title: title || undefined,
      description: description || undefined,
      image,
      siteName: siteName || undefined,
    };

    // Cache the result
    cache.set(url, { data, expires: Date.now() + CACHE_TTL });

    console.log("Preview extracted:", { url, title: data.title, hasImage: !!data.image });

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching link preview:", error);
    return new Response(JSON.stringify({ success: false, error: "Failed to fetch link preview" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
