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
    <div className="flex flex-wrap justify-center gap-6 md:gap-10">
      {statItems.map(({ icon: Icon, value, label }) => (
        <div key={label} className="flex items-center gap-2 text-white/90">
          <Icon className="h-5 w-5" />
          <span className="font-bold text-lg">{value.toLocaleString()}</span>
          <span className="text-white/70 text-sm">{label}</span>
        </div>
      ))}
    </div>
  );
};

export default LiveStats;
