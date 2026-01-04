import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Check, Users, Trophy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { getUserReferralCode, getReferralStats } from "@/services/referralService";
import { useAuth } from "@/contexts/AuthContext";

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

  const referralLink = referralCode
    ? `${window.location.origin}/auth/signup?ref=${referralCode}`
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
          <Gift className="h-5 w-5 text-accent" />
          Invite & Earn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="font-semibold text-foreground">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Invited</div>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <Check className="h-4 w-4 mx-auto mb-1 text-secondary" />
                <div className="font-semibold text-foreground">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">Joined</div>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <Trophy className="h-4 w-4 mx-auto mb-1 text-accent" />
                <div className="font-semibold text-foreground">{stats.points}</div>
                <div className="text-xs text-muted-foreground">Points</div>
              </div>
            </div>

            {/* Referral Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Your referral link
              </label>
              <div className="flex gap-2">
                <Input
                  value={referralLink}
                  readOnly
                  className="text-sm bg-muted"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy referral link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-secondary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {navigator.share && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShare}
                    aria-label="Share referral link"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Referral Code Badge */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your code:</span>
              <Badge variant="secondary" className="font-mono">
                {referralCode}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Earn 50 points for each friend who joins and completes their profile!
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
