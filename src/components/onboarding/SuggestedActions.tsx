import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  FileText, 
  Users, 
  Briefcase,
  Calendar,
  X,
  Sparkles
} from "lucide-react";

interface SuggestedAction {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  link: string;
  completed: boolean;
}

const SuggestedActions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [dismissedActions, setDismissedActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkActions = async () => {
      if (!user) return;

      try {
        // Check for first post
        const { data: posts } = await supabase
          .from("ap_objects")
          .select("id")
          .eq("attributed_to", user.id)
          .eq("type", "Note")
          .limit(1);

        // Check for first article
        const { data: articles } = await supabase
          .from("articles")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        // Check for connections
        const { data: connections } = await supabase
          .from("user_connections")
          .select("id")
          .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
          .eq("status", "accepted")
          .limit(1);

        // Check for job posts
        const { data: jobPosts } = await supabase
          .from("job_posts")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        // Check for events
        const { data: events } = await supabase
          .from("events")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        const suggestedActions: SuggestedAction[] = [
          {
            id: "first-post",
            titleKey: "suggestions.shareFirstPost",
            descriptionKey: "suggestions.introduceYourself",
            icon: MessageSquare,
            link: "/feed",
            completed: (posts?.length || 0) > 0,
          },
          {
            id: "write-article",
            titleKey: "suggestions.writeArticle",
            descriptionKey: "suggestions.shareExpertise",
            icon: FileText,
            link: "/articles/create",
            completed: (articles?.length || 0) > 0,
          },
          {
            id: "connect",
            titleKey: "suggestions.connectWithPeers",
            descriptionKey: "suggestions.buildNetwork",
            icon: Users,
            link: "/connections",
            completed: (connections?.length || 0) > 0,
          },
          {
            id: "post-job",
            titleKey: "suggestions.postJob",
            descriptionKey: "suggestions.reachProfessionals",
            icon: Briefcase,
            link: "/jobs",
            completed: (jobPosts?.length || 0) > 0,
          },
          {
            id: "create-event",
            titleKey: "suggestions.createEvent",
            descriptionKey: "suggestions.hostMeetups",
            icon: Calendar,
            link: "/events/create",
            completed: (events?.length || 0) > 0,
          },
        ];

        // Load dismissed actions from localStorage
        const storedDismissed = localStorage.getItem(`dismissed-actions-${user.id}`);
        if (storedDismissed) {
          setDismissedActions(JSON.parse(storedDismissed));
        }

        setActions(suggestedActions);
      } catch (error) {
        console.error("Error checking suggested actions:", error);
      } finally {
        setLoading(false);
      }
    };

    checkActions();
  }, [user]);

  const dismissAction = (actionId: string) => {
    const newDismissed = [...dismissedActions, actionId];
    setDismissedActions(newDismissed);
    if (user) {
      localStorage.setItem(`dismissed-actions-${user.id}`, JSON.stringify(newDismissed));
    }
  };

  if (loading) {
    return null;
  }

  // Filter out completed and dismissed actions
  const visibleActions = actions.filter(
    action => !action.completed && !dismissedActions.includes(action.id)
  );

  // Don't render if no actions to show
  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("suggestions.title")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleActions.slice(0, 3).map((action) => (
            <div
              key={action.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-medium text-foreground text-sm">{t(action.titleKey)}</p>
                <p className="text-xs text-muted-foreground truncate">{t(action.descriptionKey)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => dismissAction(action.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link to={action.link}>{t("suggestions.doIt")}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SuggestedActions;
