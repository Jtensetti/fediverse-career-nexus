import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ShareProfileCardProps {
  username: string;
  displayName: string;
}

export function ShareProfileCard({ username, displayName }: ShareProfileCardProps) {
  const [copied, setCopied] = useState(false);
  // Uses window.location.origin - will be nolto.social when accessed via custom domain
  const profileUrl = `${window.location.origin}/profile/${username}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareToLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(`Check out ${displayName}'s profile on Nolto`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareToMastodon = () => {
    window.open(
      `https://mastodon.social/share?text=${encodeURIComponent(`Check out ${displayName}'s profile on Nolto ${profileUrl}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareToBluesky = () => {
    window.open(
      `https://bsky.app/intent/compose?text=${encodeURIComponent(`Check out ${displayName}'s profile on Nolto ${profileUrl}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Share Your Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={profileUrl}
            readOnly
            className="text-xs bg-muted font-mono"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={copyToClipboard}
            aria-label="Copy profile link"
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={shareToLinkedIn} className="text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            LinkedIn
          </Button>
          <Button variant="outline" size="sm" onClick={shareToTwitter} className="text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            X/Twitter
          </Button>
          <Button variant="outline" size="sm" onClick={shareToMastodon} className="text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            Mastodon
          </Button>
          <Button variant="outline" size="sm" onClick={shareToBluesky} className="text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            Bluesky
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ShareProfileCard;
