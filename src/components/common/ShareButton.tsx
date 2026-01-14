import { useState } from "react";
import { Share2, Copy, Check, ExternalLink, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import QuoteCardGenerator from "@/components/QuoteCardGenerator";

interface ShareButtonProps {
  url?: string;
  title: string;
  description?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  content?: string;
}

export function ShareButton({
  url,
  title,
  description,
  variant = "outline",
  size = "sm",
  authorName,
  authorHandle,
  authorAvatar,
  content,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showQuoteCard, setShowQuoteCard] = useState(false);
  const shareUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

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

  const shareToBluesky = () => {
    window.open(
      `https://bsky.app/intent/compose?text=${encodedTitle}%20${encodedUrl}`,
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

  const canShowQuoteCard = content && authorName;

  return (
    <>
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
          
          {canShowQuoteCard && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowQuoteCard(true)}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Download as Image
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={shareToBluesky}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Share to Bluesky
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
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={shareNative}>
                <Share2 className="h-4 w-4 mr-2" />
                More options...
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quote Card Dialog */}
      {canShowQuoteCard && (
        <Dialog open={showQuoteCard} onOpenChange={setShowQuoteCard}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Share as Image</DialogTitle>
            </DialogHeader>
            <QuoteCardGenerator
              content={content}
              author={{
                name: authorName,
                handle: authorHandle,
                avatar_url: authorAvatar,
              }}
              postUrl={shareUrl}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default ShareButton;
