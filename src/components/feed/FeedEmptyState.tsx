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
      title: "Utforska startpaket",
      description: "Upptäck kurerade listor med yrkesverksamma att följa",
      action: (
        <Button size="sm" variant="default" asChild>
          <Link to="/packs">Utforska paket</Link>
        </Button>
      ),
    },
    {
      icon: PenLine,
      title: "Dela ditt första inlägg",
      description: "Berätta för communityn om ditt arbete eller dina intressen",
      action: onCreatePost ? (
        <Button size="sm" variant="outline" onClick={onCreatePost}>
          Skapa inlägg
        </Button>
      ) : null,
    },
    {
      icon: Users,
      title: "Hitta personer att följa",
      description: "Anslut till yrkesverksamma inom ditt område",
      action: (
        <Button size="sm" variant="outline" asChild>
          <Link to="/connections">Bläddra bland kontakter</Link>
        </Button>
      ),
    },
    {
      icon: TrendingUp,
      title: "Fyll i din profil",
      description: "Hjälp andra att upptäcka dig",
      action: (
        <Button size="sm" variant="outline" asChild>
          <Link to="/profile/edit">Redigera profil</Link>
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
            Ditt flöde är redo för innehåll
          </h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Börja med att följa några personer! Utforska startpaket för att hitta 
            kurerade listor med yrkesverksamma, eller se vad andra publicerar.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link to="/packs">
                <Package className="mr-2 h-4 w-4" />
                Utforska startpaket
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/jobs">Bläddra bland jobb</Link>
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
