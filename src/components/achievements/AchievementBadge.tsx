import { memo } from "react";
import { Lock, Trophy, Star, Zap, Award, Target, Crown, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Achievement } from "@/services/achievementService";

// Map achievement names to appropriate icons
const achievementIcons: Record<string, React.ElementType> = {
  "Profile Complete": Star,
  "First Post": Zap,
  "Thought Leader": Crown,
  "First Connection": Target,
  "Networker": Award,
  "Article Author": Trophy,
  "Event Organizer": Flame,
  "Job Poster": Award,
  "Helpful Hand": Star,
  "Referral Champion": Crown,
};

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

function getTierFromPoints(points: number): AchievementTier {
  if (points >= 50) return "platinum";
  if (points >= 25) return "gold";
  if (points >= 15) return "silver";
  return "bronze";
}

const tierStyles: Record<AchievementTier, string> = {
  bronze: "tier-bronze text-white",
  silver: "tier-silver text-foreground",
  gold: "tier-gold text-foreground",
  platinum: "tier-platinum text-white",
};

const tierBorderStyles: Record<AchievementTier, string> = {
  bronze: "border-tier-bronze/50",
  silver: "border-tier-silver/50",
  gold: "border-tier-gold/50",
  platinum: "border-tier-platinum/50",
};

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  animate?: boolean;
  className?: string;
}

function AchievementBadgeComponent({
  achievement,
  unlocked,
  size = "md",
  showTooltip = true,
  animate = false,
  className,
}: AchievementBadgeProps) {
  const tier = getTierFromPoints(achievement.points);
  const IconComponent = achievementIcons[achievement.name] || Trophy;
  
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20",
  };
  
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-9 w-9",
  };

  const badge = (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center transition-all duration-300",
        sizeClasses[size],
        unlocked
          ? cn(
              tierStyles[tier],
              animate && "unlock-reveal",
              "badge-lift"
            )
          : "bg-muted/80 text-muted-foreground border-2 border-dashed border-muted-foreground/30",
        className
      )}
    >
      {unlocked ? (
        <>
          <IconComponent className={cn(iconSizes[size], "relative z-10")} />
          {/* Animated glow ring for unlocked badges */}
          <div 
            className={cn(
              "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
              tier === "gold" && "achievement-glow",
              tier === "platinum" && "achievement-glow"
            )} 
          />
        </>
      ) : (
        <Lock className={cn(iconSizes[size], "opacity-50")} />
      )}
      
      {/* Tier indicator dot */}
      {unlocked && size !== "sm" && (
        <div 
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center text-[8px] font-bold",
            tierStyles[tier]
          )}
        >
          {achievement.points}
        </div>
      )}
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="group cursor-pointer">{badge}</div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className={cn(
            "max-w-xs p-3",
            unlocked && tierBorderStyles[tier],
            unlocked && "border-2"
          )}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{achievement.name}</span>
              {unlocked && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-medium",
                  tier === "bronze" && "bg-tier-bronze/20 text-tier-bronze",
                  tier === "silver" && "bg-tier-silver/20 text-tier-silver",
                  tier === "gold" && "bg-tier-gold/20 text-tier-gold",
                  tier === "platinum" && "bg-tier-platinum/20 text-tier-platinum"
                )}>
                  {achievement.points} pts
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {unlocked ? achievement.description : "Complete the challenge to unlock"}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const AchievementBadge = memo(AchievementBadgeComponent);
export { getTierFromPoints };
