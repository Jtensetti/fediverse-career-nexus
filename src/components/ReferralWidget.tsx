import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Users, Share2 } from "lucide-react";
import { toast } from "sonner";
import { getUserReferralCode, getReferralStats } from "@/services/referralService";
import { useAuth } from "@/contexts/AuthContext";

// Use published URL for professional-looking links
const PUBLISHED_URL = "https://fediverse-career.lovable.app";

export default function ReferralWidget() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, points: 0 });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadReferralData();
    }
  }, [user]);

  const loadReferralData = async () => {
    setLoading(true);
    const [code, referralStats] = await Promise.all([
      getUserReferralCode(),
      getReferralStats(),
    ]);
    setReferralCode(code);
    setStats(referralStats);
    setLoading(false);
  };

  // Use published URL for cleaner, more professional links
  const referralLink = referralCode
    ? `${PUBLISHED_URL}/join/${referralCode}`
    : "";

  const handleCopy = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (!navigator.share || !referralLink) return;

    try {
      await navigator.share({
        title: "Join me on Nolto",
        text: "Join the federated professional network that respects your freedom!",
        url: referralLink,
      });
    } catch {
      // User cancelled or share failed
    }
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Invite Colleagues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Stats - show actual conversions */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {stats.completed} {stats.completed === 1 ? 'colleague' : 'colleagues'} joined
                  </div>
                  {stats.total > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {stats.total} total referrals
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Referral Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Your invite link
              </label>
              <div className="flex gap-2">
                <Input
                  value={referralLink}
                  readOnly
                  className="text-sm bg-muted font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy invite link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {navigator.share && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShare}
                    aria-label="Share invite link"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Share this link to grow your professional network.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
