import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Briefcase, Server } from "lucide-react";

const LiveStats = () => {
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    jobs: 0,
    instances: 1,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [profilesRes, postsRes, jobsRes, instancesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("ap_objects").select("id", { count: "exact", head: true }),
        supabase.from("job_posts").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("remote_instances").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);

      setStats({
        users: profilesRes.count || 0,
        posts: postsRes.count || 0,
        jobs: jobsRes.count || 0,
        instances: (instancesRes.count || 0) + 1, // +1 for this instance
      });
    };

    fetchStats();
  }, []);

  const statItems = [
    { icon: Users, value: stats.users, label: "Professionals" },
    { icon: FileText, value: stats.posts, label: "Posts" },
    { icon: Briefcase, value: stats.jobs, label: "Open Positions" },
    { icon: Server, value: stats.instances, label: "Connected Instances" },
  ];

  return (
    <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-4 md:gap-10">
      {statItems.map(({ icon: Icon, value, label }) => (
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
