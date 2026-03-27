import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface ProfileViewsWidgetProps {
  userId?: string;
}

export default function ProfileViewsWidget({ userId }: ProfileViewsWidgetProps) {
  const { t } = useTranslation();
  const [viewsData, setViewsData] = useState<{
    totalViews: number;
    recentViews: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID if not provided
  useEffect(() => {
    const getCurrentUser = async () => {
      if (userId) {
        setCurrentUserId(userId);
        return;
      }
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch (error) {
        console.error('Error getting current user:', error);
        setCurrentUserId(null);
      }
    };
    
    getCurrentUser();
  }, [userId]);

  useEffect(() => {
    const fetchViewsData = async () => {
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      try {
        // Get total profile views
        const { count: totalViews } = await supabase
          .from('profile_views')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', currentUserId);

        // Get recent views (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: recentViews } = await supabase
          .from('profile_views')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', currentUserId)
          .gte('created_at', sevenDaysAgo.toISOString());

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
  }, [currentUserId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye size={20} className="text-primary" />
            {t("profileViews.title")}
          </CardTitle>
          <CardDescription>
            {t("profileViews.description")}
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
          <Eye size={20} className="text-primary" />
          {t("profileViews.title")}
        </CardTitle>
        <CardDescription>
          {t("profileViews.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{t("profileViews.totalViews")}</p>
          <p className="text-2xl font-bold">{viewsData?.totalViews || 0}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("profileViews.viewsThisWeek")}</p>
          <p className="text-2xl font-bold">{viewsData?.recentViews || 0}</p>
        </div>
      </CardContent>
    </Card>
  );
}
