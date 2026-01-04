import { memo } from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AchievementBadge, getTierFromPoints, type AchievementTier } from "./AchievementBadge";
import { Progress } from "@/components/ui/progress";
import type { Achievement } from "@/services/achievementService";

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt?: string;
  index?: number;
}

const tierGradients: Record<AchievementTier, string> = {
  bronze: "from-tier-bronze/10 to-transparent",
  silver: "from-tier-silver/10 to-transparent",
  gold: "from-tier-gold/10 to-transparent",
  platinum: "from-tier-platinum/10 to-transparent",
};

function AchievementCardComponent({
  achievement,
  unlocked,
  unlockedAt,
  index = 0,
}: AchievementCardProps) {
  const tier = getTierFromPoints(achievement.points);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn(
        "group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
        unlocked
          ? cn(
              "bg-gradient-to-r border-transparent",
              tierGradients[tier],
              "hover:shadow-lg hover:-translate-y-0.5"
            )
          : "bg-muted/30 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40"
      )}
    >
      {/* Badge */}
      <AchievementBadge
        achievement={achievement}
        unlocked={unlocked}
        size="md"
        showTooltip={false}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={cn(
            "font-semibold truncate",
            !unlocked && "text-muted-foreground"
          )}>
            {achievement.name}
          </h4>
          {unlocked && (
            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          )}
        </div>
        
        <p className={cn(
          "text-sm line-clamp-1",
          unlocked ? "text-muted-foreground" : "text-muted-foreground/60"
        )}>
          {achievement.description}
        </p>

        {/* Progress hint for locked achievements */}
        {!unlocked && (
          <div className="mt-2 flex items-center gap-2">
            <Lock className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground/60">
              Complete to unlock
            </span>
          </div>
        )}
      </div>

      {/* Points badge */}
      <div 
        className={cn(
          "shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold",
          unlocked
            ? cn(
                tier === "bronze" && "bg-tier-bronze/20 text-tier-bronze",
                tier === "silver" && "bg-tier-silver/20 text-tier-silver",
                tier === "gold" && "bg-tier-gold/20 text-tier-gold",
                tier === "platinum" && "bg-tier-platinum/20 text-tier-platinum"
              )
            : "bg-muted text-muted-foreground"
        )}
      >
        {achievement.points} pts
      </div>

      {/* Decorative shimmer for gold/platinum */}
      {unlocked && (tier === "gold" || tier === "platinum") && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 shimmer-gold opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </motion.div>
  );
}

export const AchievementCard = memo(AchievementCardComponent);
