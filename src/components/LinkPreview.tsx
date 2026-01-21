import { useState, useEffect, memo } from "react";
import { ExternalLink, Globe, X, Loader2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  domain?: string;
}

interface LinkPreviewProps {
  url: string;
  onRemove?: () => void;
  className?: string;
  compact?: boolean;
}

const previewCache = new Map<string, LinkPreviewData | null>();

async function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  if (previewCache.has(url)) {
    return previewCache.get(url) || null;
  }

  try {
    const { data, error } = await supabase.functions.invoke("fetch-link-preview", {
      body: { url },
    });

    if (error) {
      console.error("Link preview fetch error:", error);
      const domain = new URL(url).hostname.replace("www.", "");
      const fallback: LinkPreviewData = { url, domain };
      previewCache.set(url, fallback);
      return fallback;
    }

    if (data?.success && data?.data) {
      previewCache.set(url, data.data);
      return data.data;
    }

    const domain = new URL(url).hostname.replace("www.", "");
    const fallback: LinkPreviewData = { url, domain };
    previewCache.set(url, fallback);
    return fallback;
  } catch (error) {
    console.error("Link preview error:", error);
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      const fallback: LinkPreviewData = { url, domain };
      previewCache.set(url, fallback);
      return fallback;
    } catch {
      return null;
    }
  }
}

export const LinkPreview = memo(function LinkPreview({ url, onRemove, className, compact = false }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (previewCache.has(url)) {
        setPreview(previewCache.get(url) || null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setImageError(false);

      try {
        const data = await fetchLinkPreview(url);
        if (!cancelled) {
          setPreview(data);
        }
      } catch {
        if (!cancelled) {
          setPreview(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  if (loading) {
    return (
      <div
        className={cn("flex items-center gap-2 p-3 rounded-lg border bg-muted/50", className)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading preview...</span>
      </div>
    );
  }

  if (!preview) {
    return (
      <div
        className={cn("flex items-center gap-2 p-3 rounded-lg border bg-muted/50", className)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline truncate flex-1"
          onClick={handleClick}
        >
          {url}
        </a>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  const hasImage = preview.image && !imageError;
  const displayTitle = preview.title || preview.siteName || preview.domain;
  const displayDescription = preview.description;

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card overflow-hidden transition-all hover:shadow-md max-w-2xl",
        className,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {onRemove && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("flex h-full", hasImage && !compact ? "flex-col sm:flex-row" : "flex-row")}
        onClick={handleClick}
      >
        {/* Huvudbilden (icke-kompakt läge) */}
        {hasImage && !compact && (
          <div className="w-full sm:w-40 md:w-48 aspect-video sm:aspect-square md:aspect-auto shrink-0 bg-muted relative overflow-hidden border-b sm:border-b-0 sm:border-r">
            <img
              src={preview.image}
              alt={displayTitle || ""}
              className="absolute inset-0 w-full h-full object-cover object-top"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* Thumbnail för kompakt läge */}
        {hasImage && compact && (
          <div className="w-16 h-16 shrink-0 bg-muted relative overflow-hidden rounded-l-lg">
            <img
              src={preview.image}
              alt=""
              className="w-full h-full object-cover object-top"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* Fallback om bild saknas */}
        {!hasImage && !compact && (
          <div className="w-full sm:w-32 h-24 sm:h-auto shrink-0 bg-muted/50 flex items-center justify-center border-b sm:border-b-0 sm:border-r">
            <ImageOff className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}

        <div className="flex-1 p-4 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{preview.siteName || preview.domain}</span>
            <ExternalLink className="h-3 w-3 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {displayTitle && (
            <h4 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {displayTitle}
            </h4>
          )}

          {displayDescription && !compact && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">{displayDescription}</p>
          )}
        </div>
      </a>
    </div>
  );
});

export { extractUrls } from "@/lib/linkify";
export default LinkPreview;
