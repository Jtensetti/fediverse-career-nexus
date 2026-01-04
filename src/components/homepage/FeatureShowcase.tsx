import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Briefcase, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Users,
  Globe,
  Shield,
  Repeat
} from "lucide-react";

const FeatureShowcase = () => {
  const features = [
    {
      icon: User,
      title: "Professional Profiles",
      description: "Skills, experience, and endorsements — that federate across the network",
      fedAdvantage: "Portable identity",
    },
    {
      icon: Briefcase,
      title: "Job Board",
      description: "Find opportunities from companies that share your values",
      fedAdvantage: "Cross-instance listings",
    },
    {
      icon: Calendar,
      title: "Events",
      description: "Professional meetups with built-in video conferencing",
      fedAdvantage: "Federated RSVPs",
    },
    {
      icon: FileText,
      title: "Articles",
      description: "Share insights and build thought leadership",
      fedAdvantage: "Reach any instance",
    },
    {
      icon: MessageSquare,
      title: "Direct Messages",
      description: "Private conversations with your connections",
      fedAdvantage: "Cross-instance messaging",
    },
    {
      icon: Users,
      title: "Connections",
      description: "Build meaningful professional relationships",
      fedAdvantage: "Follow anyone, anywhere",
    },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
              Everything You Need to Grow Professionally
            </h2>
            <p className="text-muted-foreground text-lg">
              All the tools of a modern professional network, with the freedom of federation
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description, fedAdvantage }) => (
              <Card 
                key={title} 
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-secondary font-medium bg-secondary/10 px-2 py-1 rounded-full">
                      <Globe className="h-3 w-3" />
                      {fedAdvantage}
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-3">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional highlights */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <Shield className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">Privacy by Design</h4>
                <p className="text-sm text-muted-foreground">No tracking, no ads, no data sales</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <Repeat className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">Full Portability</h4>
                <p className="text-sm text-muted-foreground">Export your data anytime</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <Globe className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground">Open Protocol</h4>
                <p className="text-sm text-muted-foreground">Built on ActivityPub standard</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
