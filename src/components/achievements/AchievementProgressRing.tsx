import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getTierFromPoints, type AchievementTier } from "./AchievementBadge";

interface AchievementProgressRingProps {
  currentPoints: number;
  nextTierPoints: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

const tierThresholds = [
  { tier: "bronze" as AchievementTier, min: 0, max: 14 },
  { tier: "silver" as AchievementTier, min: 15, max: 24 },
  { tier: "gold" as AchievementTier, min: 25, max: 49 },
  { tier: "platinum" as AchievementTier, min: 50, max: Infinity },
];

const tierColors: Record<AchievementTier, string> = {
  bronze: "stroke-tier-bronze",
  silver: "stroke-tier-silver",
  gold: "stroke-tier-gold",
  platinum: "stroke-tier-platinum",
};

const tierBgColors: Record<AchievementTier, string> = {
  bronze: "stroke-tier-bronze/20",
  silver: "stroke-tier-silver/20",
  gold: "stroke-tier-gold/20",
  platinum: "stroke-tier-platinum/20",
};

function getNextTierInfo(points: number) {
  const currentTierIndex = tierThresholds.findIndex(
    (t) => points >= t.min && points <= t.max
  );
  const currentTier = tierThresholds[currentTierIndex];
  const nextTier = tierThresholds[currentTierIndex + 1];

  if (!nextTier) {
    // Already at platinum
    return {
      currentTier: currentTier.tier,
      nextTier: null,
      progress: 100,
      pointsToNext: 0,
    };
  }

  const pointsInCurrentTier = points - currentTier.min;
  const tierRange = nextTier.min - currentTier.min;
  const progress = Math.min((pointsInCurrentTier / tierRange) * 100, 100);

  return {
    currentTier: currentTier.tier,
    nextTier: nextTier.tier,
    progress,
    pointsToNext: nextTier.min - points,
  };
}

function AchievementProgressRingComponent({
  currentPoints,
  size = 120,
  strokeWidth = 8,
  className,
  showLabel = true,
}: AchievementProgressRingProps) {
  const tierInfo = useMemo(() => getNextTierInfo(currentPoints), [currentPoints]);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (tierInfo.progress / 100) * circumference;

  const currentTier = getTierFromPoints(currentPoints);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={tierBgColors[currentTier]}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            tierColors[currentTier],
            "transition-all duration-1000 ease-out progress-ring-animated"
          )}
          style={{ "--progress-offset": circumference } as React.CSSProperties}
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{currentPoints}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {currentTier}
          </span>
          {tierInfo.pointsToNext > 0 && (
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {tierInfo.pointsToNext} to {tierInfo.nextTier}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const AchievementProgressRing = memo(AchievementProgressRingComponent);
