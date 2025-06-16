
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface ProfileViewsWidgetProps {
  userId?: string;
}

export default function ProfileViewsWidget({ userId }: ProfileViewsWidgetProps) {
  const [viewsData, setViewsData] = useState<{
    totalViews: number;
    recentViews: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViewsData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Get total profile views
        const { count: totalViews } = await supabase
          .from('profile_views')
          .select('*', { count: 'exact', head: true })
          .eq('viewed_id', userId);

        // Get recent views (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: recentViews } = await supabase
          .from('profile_views')
          .select('*', { count: 'exact', head: true })
          .eq('viewed_id', userId)
          .gte('viewed_at', sevenDaysAgo.toISOString());

        setViewsData({
          totalViews: totalViews || 0,
          recentViews: recentViews || 0
        });
      } catch (error) {
        console.error('Error fetching profile views:', error);
        setViewsData({ totalViews: 0, recentViews: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchViewsData();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye size={20} className="text-bondy-primary" />
            Profile Views
          </CardTitle>
          <CardDescription>
            Track who's viewing your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-16" />
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
          Track who's viewing your profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Views</p>
          <p className="text-2xl font-bold">{viewsData?.totalViews || 0}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Views This Week</p>
          <p className="text-2xl font-bold">{viewsData?.recentViews || 0}</p>
        </div>
      </CardContent>
    </Card>
  );
}
