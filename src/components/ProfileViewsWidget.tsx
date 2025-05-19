
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Users } from "lucide-react";
import { ProfileViewStats, getProfileViewStats } from "@/services/profileViewService";
import { formatDistanceToNow } from "date-fns";

export const ProfileViewsWidget = () => {
  const [stats, setStats] = useState<ProfileViewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await getProfileViewStats();
        setStats(data);
      } catch (error) {
        console.error("Error fetching profile view stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye size={20} className="text-bondy-primary" />
            <Skeleton className="h-5 w-32" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-40" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye size={20} className="text-bondy-primary" />
            Profile Views
          </CardTitle>
          <CardDescription>
            No data available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Eye size={48} className="mx-auto mb-4 opacity-30" />
            <p>No profile view data is available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye size={20} className="text-bondy-primary" />
          Profile Views
        </CardTitle>
        <CardDescription>
          People who have viewed your profile
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-100 p-3 rounded-lg">
            <div className="text-2xl font-semibold">{stats.totalViews}</div>
            <div className="text-sm text-gray-600">Total views</div>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg">
            <div className="text-2xl font-semibold">{stats.uniqueViewers}</div>
            <div className="text-sm text-gray-600">Unique visitors</div>
          </div>
        </div>
        
        {stats.recentViews.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium mb-2">Recent visitors</h4>
            <div className="space-y-2">
              {stats.recentViews.map(view => (
                <div key={view.id} className="flex justify-between text-sm">
                  <div className="flex items-center">
                    <Users size={16} className="mr-2 text-gray-500" />
                    <span>{view.viewer_id ? 'User' : 'Anonymous visitor'}</span>
                  </div>
                  <span className="text-gray-500">
                    {formatDistanceToNow(new Date(view.viewed_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            <p>No recent profile views</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
