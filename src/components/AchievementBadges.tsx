import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Lock, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getAllAchievements,
  getUserAchievements,
  getUserTotalPoints,
  type Achievement,
  type UserAchievement,
} from "@/services/achievementService";
import { cn } from "@/lib/utils";

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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Trophy className="h-4 w-4 text-accent" />
            <span className="font-semibold">{userAchievements.length}</span>
            <span className="text-muted-foreground">achievements</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <AchievementDialog
          allAchievements={allAchievements}
          unlockedIds={unlockedIds}
          totalPoints={totalPoints}
        />
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-accent" />
            Achievements
          </CardTitle>
          <Badge variant="secondary">
            {totalPoints} pts
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recent unlocked badges */}
        <div className="flex flex-wrap gap-2">
          {userAchievements.slice(0, 6).map((ua) => {
            const achievement = ua.achievement as unknown as Achievement;
            return (
              <div
                key={ua.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 border border-accent/20"
                title={achievement?.name}
              >
                <span className="text-lg">{achievement?.icon}</span>
                <span className="text-xs font-medium text-foreground">
                  {achievement?.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* View all button */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              View All Achievements ({userAchievements.length}/{allAchievements.length})
            </Button>
          </DialogTrigger>
          <AchievementDialog
            allAchievements={allAchievements}
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
  unlockedIds,
  totalPoints,
}: {
  allAchievements: Achievement[];
  unlockedIds: Set<string>;
  totalPoints: number;
}) {
  // Group achievements by category
  const categories = [...new Set(allAchievements.map((a) => a.category))];

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          Achievements
          <Badge variant="secondary" className="ml-auto">
            {totalPoints} total points
          </Badge>
        </DialogTitle>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-6 pr-4">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="grid gap-2">
                {allAchievements
                  .filter((a) => a.category === category)
                  .map((achievement) => {
                    const unlocked = unlockedIds.has(achievement.id);
                    return (
                      <div
                        key={achievement.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          unlocked
                            ? "bg-accent/5 border-accent/30"
                            : "bg-muted/50 border-border opacity-60"
                        )}
                      >
                        <div
                          className={cn(
                            "text-2xl p-2 rounded-lg",
                            unlocked ? "bg-accent/20" : "bg-muted"
                          )}
                        >
                          {unlocked ? achievement.icon : <Lock className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">
                            {achievement.name}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {achievement.description}
                          </div>
                        </div>
                        <Badge variant={unlocked ? "default" : "outline"}>
                          {achievement.points} pts
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </DialogContent>
  );
}
