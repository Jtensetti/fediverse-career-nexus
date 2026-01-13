import { useState, useEffect } from "react";
import { ExternalLink, Globe, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
}

interface LinkPreviewProps {
  url: string;
  onRemove?: () => void;
  className?: string;
  compact?: boolean;
}

// Extract Open Graph metadata from URL using a simple fetch approach
async function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    
    // For now, we'll create a basic preview with the URL info
    // A full implementation would use an edge function to fetch OG metadata
    return {
      url,
      domain,
      title: domain,
      description: url,
    };
  } catch {
    return null;
  }
}

export function LinkPreview({ url, onRemove, className, compact = false }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      
      try {
        const data = await fetchLinkPreview(url);
        if (!cancelled) {
          setPreview(data);
        }
      } catch {
        if (!cancelled) {
          setError(true);
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

  if (loading) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg border bg-muted/50",
        className
      )}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading preview...</span>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg border bg-muted/50",
        className
      )}>
        <Globe className="h-4 w-4 text-muted-foreground" />
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline truncate flex-1"
        >
          {url}
        </a>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "group relative rounded-lg border bg-card overflow-hidden transition-all hover:shadow-md",
      className
    )}>
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
        className="flex flex-col sm:flex-row"
      >
        {preview.image && !compact && (
          <div className="sm:w-32 h-24 sm:h-auto shrink-0 bg-muted">
            <img 
              src={preview.image} 
              alt="" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Globe className="h-3 w-3" />
            <span className="truncate">{preview.domain}</span>
            <ExternalLink className="h-3 w-3 ml-auto shrink-0" />
          </div>
          
          {preview.title && (
            <h4 className="font-medium text-sm line-clamp-1 text-foreground">
              {preview.title}
            </h4>
          )}
          
          {preview.description && !compact && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {preview.description}
            </p>
          )}
        </div>
      </a>
    </div>
  );
}

// Utility to detect URLs in text
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;
  return text.match(urlRegex) || [];
}

export default LinkPreview;
