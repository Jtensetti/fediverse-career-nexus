import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, ChevronRight, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAllAchievements,
  getUserAchievements,
  getUserTotalPoints,
  type Achievement,
  type UserAchievement,
} from "@/services/achievementService";
import { cn } from "@/lib/utils";
import { 
  AchievementBadge, 
  AchievementProgressRing, 
  AchievementCard,
  getTierFromPoints
} from "@/components/achievements";

interface AchievementBadgesProps {
  userId?: string;
  compact?: boolean;
}

export default function AchievementBadges({ userId, compact = false }: AchievementBadgesProps) {
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  const loadAchievements = async () => {
    setLoading(true);
    const [all, user, points] = await Promise.all([
      getAllAchievements(),
      getUserAchievements(userId),
      getUserTotalPoints(userId),
    ]);
    setAllAchievements(all);
    setUserAchievements(user);
    setTotalPoints(points);
    setLoading(false);
  };

  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement_id));
  const tier = getTierFromPoints(totalPoints);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
              <Trophy className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Loading achievements...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "gap-2 group",
              tier === "gold" && "hover:bg-tier-gold/10",
              tier === "platinum" && "hover:bg-tier-platinum/10"
            )}
          >
            <div className={cn(
              "p-1 rounded-full",
              tier === "bronze" && "bg-tier-bronze/20",
              tier === "silver" && "bg-tier-silver/20",
              tier === "gold" && "bg-tier-gold/20",
              tier === "platinum" && "bg-tier-platinum/20"
            )}>
              <Trophy className={cn(
                "h-4 w-4",
                tier === "bronze" && "text-tier-bronze",
                tier === "silver" && "text-tier-silver",
                tier === "gold" && "text-tier-gold",
                tier === "platinum" && "text-tier-platinum"
              )} />
            </div>
            <span className="font-semibold">{userAchievements.length}</span>
            <span className="text-muted-foreground">achievements</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </DialogTrigger>
        <AchievementDialog
          allAchievements={allAchievements}
          userAchievements={userAchievements}
          unlockedIds={unlockedIds}
          totalPoints={totalPoints}
        />
      </Dialog>
    );
  }

  // Get top 3 unlocked achievements by points (rarest first)
  const topAchievements = userAchievements
    .map(ua => ({
      ...ua,
      achievement: ua.achievement as unknown as Achievement
    }))
    .filter(ua => ua.achievement)
    .sort((a, b) => (b.achievement?.points || 0) - (a.achievement?.points || 0))
    .slice(0, 3);

  return (
    <Card className="overflow-hidden">
      {/* Premium header with gradient */}
      <div className={cn(
        "relative px-6 pt-6 pb-4",
        tier === "bronze" && "bg-gradient-to-br from-tier-bronze/10 via-transparent to-transparent",
        tier === "silver" && "bg-gradient-to-br from-tier-silver/10 via-transparent to-transparent",
        tier === "gold" && "bg-gradient-to-br from-tier-gold/10 via-transparent to-transparent",
        tier === "platinum" && "bg-gradient-to-br from-tier-platinum/10 via-transparent to-transparent"
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className={cn(
                "h-5 w-5",
                tier === "bronze" && "text-tier-bronze",
                tier === "silver" && "text-tier-silver",
                tier === "gold" && "text-tier-gold",
                tier === "platinum" && "text-tier-platinum"
              )} />
              <h3 className="font-semibold text-lg">Achievements</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {userAchievements.length} of {allAchievements.length} unlocked
            </p>
          </div>
          
          {/* Progress ring */}
          <AchievementProgressRing 
            currentPoints={totalPoints} 
            nextTierPoints={50}
            size={80}
          />
        </div>
      </div>

      <CardContent className="pt-2 space-y-4">
        {/* Top achievements showcase */}
        {topAchievements.length > 0 && (
          <div className="flex items-center justify-center gap-3 py-2">
            {topAchievements.map((ua, index) => (
              <motion.div
                key={ua.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <AchievementBadge
                  achievement={ua.achievement}
                  unlocked={true}
                  size={index === 0 ? "lg" : "md"}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state for new users */}
        {topAchievements.length === 0 && (
          <div className="py-4 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Start your journey to unlock achievements!
            </p>
          </div>
        )}

        {/* View all button */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "w-full group",
                tier === "gold" && "border-tier-gold/30 hover:border-tier-gold/50",
                tier === "platinum" && "border-tier-platinum/30 hover:border-tier-platinum/50"
              )}
            >
              <span>View All Achievements</span>
              <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </DialogTrigger>
          <AchievementDialog
            allAchievements={allAchievements}
            userAchievements={userAchievements}
            unlockedIds={unlockedIds}
            totalPoints={totalPoints}
          />
        </Dialog>
      </CardContent>
    </Card>
  );
}

function AchievementDialog({
  allAchievements,
  userAchievements,
  unlockedIds,
  totalPoints,
}: {
  allAchievements: Achievement[];
  userAchievements: UserAchievement[];
  unlockedIds: Set<string>;
  totalPoints: number;
}) {
  const categories = [...new Set(allAchievements.map((a) => a.category))];
  const tier = getTierFromPoints(totalPoints);
  const unlockedCount = userAchievements.length;
  const totalCount = allAchievements.length;
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
      {/* Hero header */}
      <div className={cn(
        "relative px-6 py-8",
        tier === "bronze" && "bg-gradient-to-br from-tier-bronze/20 via-tier-bronze/5 to-transparent",
        tier === "silver" && "bg-gradient-to-br from-tier-silver/20 via-tier-silver/5 to-transparent",
        tier === "gold" && "bg-gradient-to-br from-tier-gold/20 via-tier-gold/5 to-transparent",
        tier === "platinum" && "bg-gradient-to-br from-tier-platinum/20 via-tier-platinum/5 to-transparent"
      )}>
        <div className="flex items-center gap-6">
          <AchievementProgressRing 
            currentPoints={totalPoints} 
            nextTierPoints={50}
            size={100}
          />
          
          <div className="flex-1">
            <DialogTitle className="text-2xl font-bold mb-2">
              Your Achievements
            </DialogTitle>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">
                {unlockedCount} / {totalCount} unlocked
              </span>
              <span className="text-muted-foreground">
                ({Math.round(progressPercent)}% complete)
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  tier === "bronze" && "bg-tier-bronze",
                  tier === "silver" && "bg-tier-silver",
                  tier === "gold" && "bg-tier-gold",
                  tier === "platinum" && "bg-tier-platinum"
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for categories */}
      <Tabs defaultValue="all" className="flex-1">
        <div className="px-6 border-b">
          <TabsList className="h-12 w-full justify-start gap-2 bg-transparent p-0">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-muted rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              All
            </TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="data-[state=active]:bg-muted rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <ScrollArea className="flex-1 max-h-[400px]">
          <TabsContent value="all" className="m-0 p-4">
            <div className="space-y-2">
              {/* Unlocked first, then locked */}
              {[...allAchievements]
                .sort((a, b) => {
                  const aUnlocked = unlockedIds.has(a.id);
                  const bUnlocked = unlockedIds.has(b.id);
                  if (aUnlocked && !bUnlocked) return -1;
                  if (!aUnlocked && bUnlocked) return 1;
                  return b.points - a.points;
                })
                .map((achievement, index) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    unlocked={unlockedIds.has(achievement.id)}
                    index={index}
                  />
                ))}
            </div>
          </TabsContent>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="m-0 p-4">
              <div className="space-y-2">
                {allAchievements
                  .filter((a) => a.category === category)
                  .sort((a, b) => {
                    const aUnlocked = unlockedIds.has(a.id);
                    const bUnlocked = unlockedIds.has(b.id);
                    if (aUnlocked && !bUnlocked) return -1;
                    if (!aUnlocked && bUnlocked) return 1;
                    return b.points - a.points;
                  })
                  .map((achievement, index) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      unlocked={unlockedIds.has(achievement.id)}
                      index={index}
                    />
                  ))}
              </div>
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </DialogContent>
  );
}
