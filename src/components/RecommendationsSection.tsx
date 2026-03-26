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
import { sv } from "date-fns/locale";
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
      toast.error("Skriv en rekommendation");
      return;
    }

    setIsSubmitting(true);
    const result = await recommendationService.writeRecommendation({
      recipientId: userId,
      relationship,
      content: content.trim(),
    });

    if (result.success) {
      toast.success("Rekommendation skickad för godkännande!");
      setIsWriteOpen(false);
      setContent("");
      setRelationship("colleague");
    } else {
      toast.error(result.error || "Kunde inte skicka rekommendation");
    }
    setIsSubmitting(false);
  };

  const handleApprove = async (id: string) => {
    const success = await recommendationService.updateStatus(id, 'approved');
    if (success) {
      toast.success("Rekommendation godkänd!");
      loadRecommendations();
    } else {
      toast.error("Kunde inte godkänna rekommendation");
    }
  };

  const handleReject = async (id: string) => {
    const success = await recommendationService.updateStatus(id, 'rejected');
    if (success) {
      toast.success("Rekommendation dold");
      setPendingRecommendations((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error("Kunde inte dölja rekommendation");
    }
  };

  const handleRequestRecommendation = async () => {
    toast.info("Funktionen att begära rekommendationer kommer snart!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const relationshipLabels: Record<string, string> = {
    colleague: "Kollega",
    manager: "Jag var deras chef",
    direct_report: "De var min chef",
    client: "Kund",
    mentor: "Mentor",
    other: "Annat",
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {!isOwnProfile && user && (
          <Dialog open={isWriteOpen} onOpenChange={setIsWriteOpen}>
            <DialogTrigger asChild>
              <Button>
                <PenLine className="h-4 w-4 mr-2" />
                Skriv en rekommendation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Skriv en rekommendation</DialogTitle>
                <DialogDescription>
                  Dela din erfarenhet av att arbeta med den här personen. Din rekommendation skickas för godkännande.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="relationship">Hur känner du dem?</Label>
                  <Select value={relationship} onValueChange={(v) => setRelationship(v as RelationshipType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colleague">Kollega</SelectItem>
                      <SelectItem value="manager">Jag var deras chef</SelectItem>
                      <SelectItem value="direct_report">De var min chef</SelectItem>
                      <SelectItem value="client">Kund</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="other">Annat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Din rekommendation</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Berätta hur det var att arbeta med dem, deras styrkor och vad som gör dem bra på det de gör..."
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
                  Avbryt
                </Button>
                <Button onClick={handleWriteRecommendation} disabled={isSubmitting || !content.trim()}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Skicka rekommendation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        
        {isOwnProfile && (
          <Button variant="outline" onClick={handleRequestRecommendation}>
            Begär en rekommendation
          </Button>
        )}
      </div>

      {isOwnProfile && pendingRecommendations.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            Väntar på godkännande ({pendingRecommendations.length})
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
                      {relationshipLabels[rec.relationship] || recommendationService.getRelationshipLabel(rec.relationship as RelationshipType)}
                    </Badge>
                  </div>
                  {rec.recommender?.headline && (
                    <p className="text-sm text-muted-foreground">{rec.recommender.headline}</p>
                  )}
                  <p className="mt-2 text-sm">{rec.content}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => handleApprove(rec.id)}>
                      <Check className="h-4 w-4 mr-1" />
                      Godkänn
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(rec.id)}>
                      <X className="h-4 w-4 mr-1" />
                      Dölj
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                          {relationshipLabels[rec.relationship] || recommendationService.getRelationshipLabel(rec.relationship as RelationshipType)}
                        </Badge>
                      </div>
                      {rec.recommender?.headline && (
                        <p className="text-sm text-muted-foreground">{rec.recommender.headline}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true, locale: sv })}
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
          <p>Inga rekommendationer ännu</p>
          {!isOwnProfile && user && (
            <p className="text-sm mt-2">Bli den första att skriva en!</p>
          )}
        </div>
      )}
    </div>
  );
}
