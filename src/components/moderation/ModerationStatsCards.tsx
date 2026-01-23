import { useQuery } from "@tanstack/react-query";
import { Flag, Ban, Activity, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getModerationStats } from "@/services/moderationService";

export function ModerationStatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["moderation-stats"],
    queryFn: getModerationStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: "Pending Reports",
      value: stats?.pendingReports || 0,
      icon: Flag,
      color: stats?.pendingReports && stats.pendingReports > 0 ? "text-yellow-500" : "text-muted-foreground",
      bgColor: stats?.pendingReports && stats.pendingReports > 0 ? "bg-yellow-500/10" : "bg-muted",
    },
    {
      label: "Active Bans",
      value: stats?.activeBans || 0,
      icon: Ban,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Actions Today",
      value: stats?.totalActionsToday || 0,
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Moderators",
      value: stats?.totalModerators || 0,
      icon: Shield,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold">{item.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
