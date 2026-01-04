import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2, PenLine, Quote } from "lucide-react";
import { recommendationService, Recommendation, RelationshipType } from "@/services/recommendationService";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface RecommendationsSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

export function RecommendationsSection({ userId, isOwnProfile }: RecommendationsSectionProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [pendingRecommendations, setPendingRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [relationship, setRelationship] = useState<RelationshipType>("colleague");
  const { user } = useAuth();

  useEffect(() => {
    loadRecommendations();
  }, [userId, isOwnProfile]);

  const loadRecommendations = async () => {
    setIsLoading(true);
    const [received, pending] = await Promise.all([
      recommendationService.getReceivedRecommendations(userId),
      isOwnProfile ? recommendationService.getPendingRecommendations() : Promise.resolve([]),
    ]);
    setRecommendations(received);
    setPendingRecommendations(pending);
    setIsLoading(false);
  };

  const handleWriteRecommendation = async () => {
    if (!content.trim()) {
      toast.error("Please write a recommendation");
      return;
    }

    setIsSubmitting(true);
    const result = await recommendationService.writeRecommendation({
      recipientId: userId,
      relationship,
      content: content.trim(),
    });

    if (result.success) {
      toast.success("Recommendation sent for approval!");
      setIsWriteOpen(false);
      setContent("");
      setRelationship("colleague");
    } else {
      toast.error(result.error || "Failed to submit recommendation");
    }
    setIsSubmitting(false);
  };

  const handleApprove = async (id: string) => {
    const success = await recommendationService.updateStatus(id, 'approved');
    if (success) {
      toast.success("Recommendation approved!");
      loadRecommendations();
    } else {
      toast.error("Failed to approve recommendation");
    }
  };

  const handleReject = async (id: string) => {
    const success = await recommendationService.updateStatus(id, 'rejected');
    if (success) {
      toast.success("Recommendation hidden");
      setPendingRecommendations((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error("Failed to reject recommendation");
    }
  };

  const handleRequestRecommendation = async () => {
    // In a real implementation, this would open a dialog to select a connection
    toast.info("Request recommendation feature coming soon!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {!isOwnProfile && user && (
          <Dialog open={isWriteOpen} onOpenChange={setIsWriteOpen}>
            <DialogTrigger asChild>
              <Button>
                <PenLine className="h-4 w-4 mr-2" />
                Write a Recommendation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Write a Recommendation</DialogTitle>
                <DialogDescription>
                  Share your experience working with this person. Your recommendation will be sent for their approval.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="relationship">How do you know them?</Label>
                  <Select value={relationship} onValueChange={(v) => setRelationship(v as RelationshipType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="manager">I was their manager</SelectItem>
                      <SelectItem value="direct_report">They were my manager</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Your Recommendation</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share what it was like working with them, their strengths, and what makes them great at what they do..."
                    rows={6}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {content.length}/2000
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsWriteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleWriteRecommendation} disabled={isSubmitting || !content.trim()}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Submit Recommendation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        
        {isOwnProfile && (
          <Button variant="outline" onClick={handleRequestRecommendation}>
            Request a Recommendation
          </Button>
        )}
      </div>

      {/* Pending recommendations (only visible to profile owner) */}
      {isOwnProfile && pendingRecommendations.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            Pending Approval ({pendingRecommendations.length})
          </h4>
          {pendingRecommendations.map((rec) => (
            <div key={rec.id} className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={rec.recommender?.avatar_url || ''} />
                  <AvatarFallback>
                    {rec.recommender?.fullname?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {rec.recommender?.fullname || rec.recommender?.username}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {recommendationService.getRelationshipLabel(rec.relationship as RelationshipType)}
                    </Badge>
                  </div>
                  {rec.recommender?.headline && (
                    <p className="text-sm text-muted-foreground">{rec.recommender.headline}</p>
                  )}
                  <p className="mt-2 text-sm">{rec.content}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => handleApprove(rec.id)}>
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(rec.id)}>
                      <X className="h-4 w-4 mr-1" />
                      Hide
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approved recommendations */}
      {recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div key={rec.id} className="p-4 rounded-lg border bg-card">
              <div className="flex items-start gap-3">
                <Quote className="h-8 w-8 text-muted-foreground/30 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm leading-relaxed mb-4">{rec.content}</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={rec.recommender?.avatar_url || ''} />
                      <AvatarFallback>
                        {rec.recommender?.fullname?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {rec.recommender?.fullname || rec.recommender?.username}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {recommendationService.getRelationshipLabel(rec.relationship as RelationshipType)}
                        </Badge>
                      </div>
                      {rec.recommender?.headline && (
                        <p className="text-sm text-muted-foreground">{rec.recommender.headline}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Quote className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No recommendations yet</p>
          {!isOwnProfile && user && (
            <p className="text-sm mt-2">Be the first to write one!</p>
          )}
        </div>
      )}
    </div>
  );
}
