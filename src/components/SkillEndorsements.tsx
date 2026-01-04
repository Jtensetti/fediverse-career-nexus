import { useState, useEffect } from "react";
import { ThumbsUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { endorsementService, SkillWithEndorsements } from "@/services/endorsementService";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SkillEndorsementsProps {
  userId: string;
  isOwnProfile: boolean;
}

export function SkillEndorsements({ userId, isOwnProfile }: SkillEndorsementsProps) {
  const [skills, setSkills] = useState<SkillWithEndorsements[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [endorsingSkillId, setEndorsingSkillId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadSkills();
  }, [userId]);

  const loadSkills = async () => {
    setIsLoading(true);
    const data = await endorsementService.getSkillsWithEndorsements(userId);
    setSkills(data);
    setIsLoading(false);
  };

  const handleToggleEndorsement = async (skill: SkillWithEndorsements) => {
    if (!user) {
      toast.error("Please sign in to endorse skills");
      return;
    }

    if (isOwnProfile) {
      toast.error("You can't endorse your own skills");
      return;
    }

    setEndorsingSkillId(skill.id);

    const success = await endorsementService.toggleEndorsement(
      skill.id,
      userId,
      skill.user_has_endorsed
    );

    if (success) {
      setSkills((prev) =>
        prev.map((s) =>
          s.id === skill.id
            ? {
                ...s,
                endorsements: s.user_has_endorsed ? s.endorsements - 1 : s.endorsements + 1,
                user_has_endorsed: !s.user_has_endorsed,
              }
            : s
        )
      );
      toast.success(skill.user_has_endorsed ? "Endorsement removed" : "Skill endorsed!");
    } else {
      toast.error("Failed to update endorsement");
    }

    setEndorsingSkillId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
        <ThumbsUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">{isOwnProfile ? "No skills added yet" : "No skills listed yet"}</p>
        <p className="text-sm mt-1">
          {isOwnProfile 
            ? "Add skills to let your connections endorse your expertise" 
            : "Skills will appear here once they're added"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {skills.map((skill) => (
        <div
          key={skill.id}
          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-medium">
              {skill.name}
            </Badge>
            {skill.endorsements > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-2">
                        {skill.endorsement_list.slice(0, 3).map((endorsement) => (
                          <Avatar key={endorsement.id} className="h-6 w-6 border-2 border-background">
                            <AvatarImage src={endorsement.endorser?.avatar_url || ''} />
                            <AvatarFallback className="text-[10px]">
                              {endorsement.endorser?.fullname?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground ml-1">
                        {skill.endorsements} endorsement{skill.endorsements !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      {skill.endorsement_list.slice(0, 5).map((e) => (
                        <div key={e.id}>
                          {e.endorser?.fullname || e.endorser?.username || 'Unknown'}
                        </div>
                      ))}
                      {skill.endorsements > 5 && (
                        <div className="text-muted-foreground">
                          +{skill.endorsements - 5} more
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {!isOwnProfile && user && (
            <Button
              variant={skill.user_has_endorsed ? "default" : "outline"}
              size="sm"
              disabled={endorsingSkillId === skill.id}
              onClick={() => handleToggleEndorsement(skill)}
              className={cn(
                "gap-1",
                skill.user_has_endorsed && "bg-primary"
              )}
            >
              {endorsingSkillId === skill.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className={cn("h-4 w-4", skill.user_has_endorsed && "fill-current")} />
              )}
              {skill.user_has_endorsed ? "Endorsed" : "Endorse"}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
