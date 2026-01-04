import { useState } from "react";
import { Share2, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ShareButtonProps {
  url?: string;
  title: string;
  description?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ShareButton({
  url,
  title,
  description,
  variant = "outline",
  size = "sm",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || "");

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareToLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareToMastodon = () => {
    window.open(
      `https://mastodon.social/share?text=${encodedTitle}%20${encodedUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyToClipboard}>
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          Copy link
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={shareToMastodon}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Share to Mastodon
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={shareToLinkedIn}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Share to LinkedIn
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={shareToTwitter}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Share to X/Twitter
        </DropdownMenuItem>
        
        {navigator.share && (
          <DropdownMenuItem onClick={shareNative}>
            <Share2 className="h-4 w-4 mr-2" />
            More options...
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ShareButton;
