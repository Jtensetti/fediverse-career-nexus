import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { RecommendedUser } from "@/services/onboardingRecommendationService";

interface RecommendedUserCardProps {
  user: RecommendedUser;
  selected: boolean;
  onToggle: () => void;
}

export const RecommendedUserCard = ({ user, selected, onToggle }: RecommendedUserCardProps) => {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border-2 cursor-pointer transition-all",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={user.avatar_url || ""} alt={user.fullname || user.username} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {(user.fullname || user.username || "?").substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {user.fullname || user.username}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user.headline || `@${user.username}`}
          </p>
          {user.match_reason && (
            <Badge variant="secondary" className="text-[10px] mt-1 px-1.5 py-0">
              {user.match_reason}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendedUserCard;
