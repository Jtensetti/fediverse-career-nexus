import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, PenLine, Users, TrendingUp, Package } from "lucide-react";

interface FeedEmptyStateProps {
  onCreatePost?: () => void;
}

export default function FeedEmptyState({ onCreatePost }: FeedEmptyStateProps) {
  const suggestions = [
    {
      icon: Package,
      title: "Browse Starter Packs",
      description: "Discover curated lists of professionals to follow",
      action: (
        <Button size="sm" variant="default" asChild>
          <Link to="/packs">Explore Packs</Link>
        </Button>
      ),
    },
    {
      icon: PenLine,
      title: "Share your first post",
      description: "Tell the community about your work or interests",
      action: onCreatePost ? (
        <Button size="sm" variant="outline" onClick={onCreatePost}>
          Create Post
        </Button>
      ) : null,
    },
    {
      icon: Users,
      title: "Find people to follow",
      description: "Connect with professionals in your field",
      action: (
        <Button size="sm" variant="outline" asChild>
          <Link to="/connections">Browse Connections</Link>
        </Button>
      ),
    },
    {
      icon: TrendingUp,
      title: "Complete your profile",
      description: "Help others discover you",
      action: (
        <Button size="sm" variant="outline" asChild>
          <Link to="/profile/edit">Edit Profile</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero empty state */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-dashed">
        <CardContent className="flex flex-col items-center text-center py-12">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Your feed is ready for content
          </h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Start by following some people! Browse Starter Packs to discover 
            curated lists of professionals, or explore what others are posting.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link to="/packs">
                <Package className="mr-2 h-4 w-4" />
                Browse Starter Packs
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/jobs">Browse Jobs</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggested actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {suggestions.map(({ icon: Icon, title, description, action }) => (
          <Card key={title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2 shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground">
                    {title}
                  </h4>
                  <p className="text-xs text-muted-foreground">{description}</p>
                  {action && <div className="pt-1">{action}</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
