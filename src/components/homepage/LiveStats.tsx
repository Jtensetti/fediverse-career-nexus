import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Briefcase, Server, TrendingUp, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const LiveStats = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    jobs: 0,
    instances: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const [profilesRes, postsRes, jobsRes, instancesRes] = await Promise.all([
      supabase.from("public_profiles").select("id", { count: "exact", head: true }),
      // Only count Note types (actual posts, not all AP objects)
      supabase.from("ap_objects").select("id", { count: "exact", head: true }).eq("type", "Note"),
      supabase.from("job_posts").select("id", { count: "exact", head: true }).eq("is_active", true),
      // Get unique home_instance from federated users - use public_profiles view
      supabase.from("public_profiles")
        .select("home_instance")
        .not("home_instance", "is", null),
    ]);

    // Calculate unique instances from federated users
    const uniqueInstances = new Set(
      instancesRes.data?.map(p => p.home_instance).filter(Boolean) || []
    );

    setStats({
      users: profilesRes.count || 0,
      posts: postsRes.count || 0,
      jobs: jobsRes.count || 0,
      instances: uniqueInstances.size + 1, // +1 for local instance
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();

    // Use interval instead of realtime to reduce WebSocket overhead
    // Stats don't need to be real-time - refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchStats]);

  // Smart stats: Only show items with positive values, or show "growing" message if all zeros
  const allStatItems = [
    { icon: Users, value: stats.users, labelKey: "professionals", showWhenZero: false },
    { icon: FileText, value: stats.posts, labelKey: "posts", showWhenZero: false },
    { icon: Briefcase, value: stats.jobs, labelKey: "openPositions", showWhenZero: false },
    { icon: Server, value: stats.instances, labelKey: "connectedInstances", showWhenZero: true },
  ];

  // Filter to only show stats with positive values (except instances which always shows)
  const visibleStats = allStatItems.filter(item => item.value > 0 || item.showWhenZero);
  
  // Check if any stat has reached triple digits (100+)
  const hasTripleDigits = stats.users >= 100 || stats.posts >= 100 || 
                          stats.jobs >= 100 || stats.instances >= 100;
  
  // Hide component entirely until we reach triple digits
  if (isLoading || !hasTripleDigits) {
    return null;
  }
  
  // If we have very few stats, show a "growing community" message instead
  const hasMinimalData = visibleStats.length <= 1 && stats.users === 0;

  if (hasMinimalData) {
    return (
      <div className="flex flex-wrap justify-center gap-4 md:gap-8">
        <div className="flex items-center gap-2 text-primary-foreground/90">
          <Sparkles className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
          <span className="text-sm md:text-base">{t("homepage.liveStats.joinGrowing")}</span>
        </div>
        <div className="flex items-center gap-2 text-primary-foreground/90">
          <TrendingUp className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
          <span className="text-sm md:text-base">{t("homepage.liveStats.earlyAdopter")}</span>
        </div>
        {stats.instances > 0 && (
          <div className="flex items-center gap-2 text-primary-foreground/90">
            <Server className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
            <span className="font-bold text-base md:text-lg">{stats.instances}</span>
            <span className="text-primary-foreground/70 text-xs md:text-sm">{t("homepage.liveStats.connectedInstances")}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-4 md:gap-10">
      {visibleStats.map(({ icon: Icon, value, labelKey }) => (
        <div key={labelKey} className="flex items-center gap-2 text-primary-foreground/90">
          <Icon className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
          <span className="font-bold text-base md:text-lg">{value.toLocaleString()}</span>
          <span className="text-primary-foreground/70 text-xs md:text-sm">{t(`homepage.liveStats.${labelKey}`)}</span>
        </div>
      ))}
    </div>
  );
};

export default LiveStats;
