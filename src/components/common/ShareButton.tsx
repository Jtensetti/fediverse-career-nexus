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
import QuoteCardGenerator from "@/components/posts/QuoteCardGenerator";

import { tx } from "@/i18n/tx";
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
      toast.success(tx("ui.shareButton.lankKopieradTillUrklipp"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(tx("ui.shareButton.kundeInteKopieraLank"));
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
          <Button variant={variant} size={size} aria-label={tx("ui.shareButton.dela")}>
            <Share2 className={size === "icon" ? "h-4 w-4" : "h-4 w-4 mr-2"} />
            {size !== "icon" && tx("ui.shareButton.dela")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={copyToClipboard}>
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {tx("ui.shareButton.kopieraLank")}
          </DropdownMenuItem>
          
          {canShowQuoteCard && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowQuoteCard(true)}>
                <ImageIcon className="h-4 w-4 mr-2" />
                {tx("ui.shareButton.laddaNerSomBild")}
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={shareToBluesky}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {tx("ui.shareButton.delaPaBluesky")}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={shareToMastodon}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {tx("ui.shareButton.delaPaMastodon")}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={shareToLinkedIn}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {tx("ui.shareButton.delaPaLinkedin")}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={shareToTwitter}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {tx("ui.shareButton.delaPaXTwitter")}
          </DropdownMenuItem>
          
          {typeof navigator.share === "function" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={shareNative}>
                <Share2 className="h-4 w-4 mr-2" />
                {tx("ui.shareButton.flerAlternativ")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canShowQuoteCard && (
        <Dialog open={showQuoteCard} onOpenChange={setShowQuoteCard}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{tx("ui.shareButton.delaSomBild")}</DialogTitle>
            </DialogHeader>
            <QuoteCardGenerator
              content={content}
              author={{
                name: authorName,
                handle: authorHandle,
                avatar_url: authorAvatar,
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default ShareButton;
