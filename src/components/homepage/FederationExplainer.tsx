import { User, Server, Globe } from "lucide-react";

const FederationExplainer = () => {
  const steps = [
    {
      icon: User,
      title: "Create Your Profile",
      description: "Sign up and build your professional identity",
    },
    {
      icon: Server,
      title: "Choose Your Instance",
      description: "Pick a community that shares your values",
    },
    {
      icon: Globe,
      title: "Connect Everywhere",
      description: "Follow anyone across the entire Fediverse",
    },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
              How Federation Works
            </h2>
            <p className="text-muted-foreground text-lg">
              Join a network without borders — like email, but for professional networking
            </p>
          </div>

          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent -translate-y-1/2 z-0" />

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              {steps.map(({ icon: Icon, title, description }, index) => (
                <div key={title} className="text-center">
                  <div className="relative inline-flex items-center justify-center mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                      <Icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm shadow">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm">{description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Instance illustration */}
          <div className="mt-12 p-6 bg-card rounded-xl border shadow-sm">
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Works with:</span>
              <span className="px-3 py-1 bg-muted rounded-full">Mastodon</span>
              <span className="px-3 py-1 bg-muted rounded-full">Pleroma</span>
              <span className="px-3 py-1 bg-muted rounded-full">Pixelfed</span>
              <span className="px-3 py-1 bg-muted rounded-full">PeerTube</span>
              <span className="px-3 py-1 bg-muted rounded-full">+ 5000 more</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FederationExplainer;
