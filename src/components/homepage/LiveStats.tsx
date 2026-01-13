import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Briefcase, Server, TrendingUp, Sparkles } from "lucide-react";

const LiveStats = () => {
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
      supabase.from("ap_objects").select("id", { count: "exact", head: true }),
      supabase.from("job_posts").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("remote_instances").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    setStats({
      users: profilesRes.count || 0,
      posts: postsRes.count || 0,
      jobs: jobsRes.count || 0,
      instances: (instancesRes.count || 0) + 1,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();

    // Set up realtime subscriptions for live updates
    const channel = supabase
      .channel('live-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ap_objects' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_posts' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  // Smart stats: Only show items with positive values, or show "growing" message if all zeros
  const allStatItems = [
    { icon: Users, value: stats.users, label: "Professionals", showWhenZero: false },
    { icon: FileText, value: stats.posts, label: "Posts", showWhenZero: false },
    { icon: Briefcase, value: stats.jobs, label: "Open Positions", showWhenZero: false },
    { icon: Server, value: stats.instances, label: "Connected Instances", showWhenZero: true },
  ];

  // Filter to only show stats with positive values (except instances which always shows)
  const visibleStats = allStatItems.filter(item => item.value > 0 || item.showWhenZero);
  
  // If we have very few stats, show a "growing community" message instead
  const hasMinimalData = visibleStats.length <= 1 && stats.users === 0;

  if (hasMinimalData) {
    return (
      <div className="flex flex-wrap justify-center gap-4 md:gap-8">
        <div className="flex items-center gap-2 text-primary-foreground/90">
          <Sparkles className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
          <span className="text-sm md:text-base">Join our growing community</span>
        </div>
        <div className="flex items-center gap-2 text-primary-foreground/90">
          <TrendingUp className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
          <span className="text-sm md:text-base">Be an early adopter</span>
        </div>
        {stats.instances > 0 && (
          <div className="flex items-center gap-2 text-primary-foreground/90">
            <Server className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
            <span className="font-bold text-base md:text-lg">{stats.instances}</span>
            <span className="text-primary-foreground/70 text-xs md:text-sm">Connected Instances</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-4 md:gap-10">
      {visibleStats.map(({ icon: Icon, value, label }) => (
        <div key={label} className="flex items-center gap-2 text-primary-foreground/90">
          <Icon className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
          <span className="font-bold text-base md:text-lg">{value.toLocaleString()}</span>
          <span className="text-primary-foreground/70 text-xs md:text-sm">{label}</span>
        </div>
      ))}
    </div>
  );
};

export default LiveStats;
