import { Check, X } from "lucide-react";

const WhyFederated = () => {
  const comparisons = [
    { feature: "Who controls your feed", linkedin: "Algorithm decides", nolto: "You decide" },
    { feature: "Your data", linkedin: "Sold to advertisers", nolto: "Stays on your instance" },
    { feature: "Account portability", linkedin: "Locked in forever", nolto: "Export & migrate anytime" },
    { feature: "Network governance", linkedin: "One company controls all", nolto: "Community-governed" },
    { feature: "Interoperability", linkedin: "Walled garden", nolto: "Connects to 5000+ servers" },
    { feature: "Sponsored content", linkedin: "Everywhere", nolto: "None" },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
              Why a Federated Professional Network?
            </h2>
            <p className="text-muted-foreground text-lg">
              See how Nolto compares to traditional professional networks
            </p>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-xl shadow-lg overflow-hidden border">
            {/* Header */}
            <div className="grid grid-cols-3 bg-muted/50">
              <div className="p-4 font-semibold text-muted-foreground"></div>
              <div className="p-4 text-center font-semibold text-muted-foreground border-l">
                Traditional
              </div>
              <div className="p-4 text-center font-semibold text-primary border-l bg-primary/5">
                Nolto
              </div>
            </div>

            {/* Rows */}
            {comparisons.map((row, index) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 ${index !== comparisons.length - 1 ? "border-b" : ""}`}
              >
                <div className="p-4 font-medium text-foreground">
                  {row.feature}
                </div>
                <div className="p-4 text-center border-l flex items-center justify-center gap-2 text-muted-foreground">
                  <X className="h-4 w-4 text-destructive shrink-0" />
                  <span>{row.linkedin}</span>
                </div>
                <div className="p-4 text-center border-l bg-primary/5 flex items-center justify-center gap-2 text-primary">
                  <Check className="h-4 w-4 text-secondary shrink-0" />
                  <span>{row.nolto}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {comparisons.map((row) => (
              <div key={row.feature} className="bg-card rounded-lg shadow-md border overflow-hidden">
                <div className="p-3 bg-muted/50 font-medium text-foreground text-sm">
                  {row.feature}
                </div>
                <div className="grid grid-cols-2 divide-x">
                  <div className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Traditional</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <X className="h-4 w-4 text-destructive shrink-0" />
                      <span>{row.linkedin}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-primary/5">
                    <div className="text-xs text-primary mb-1 font-medium">Nolto</div>
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Check className="h-4 w-4 text-secondary shrink-0" />
                      <span>{row.nolto}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyFederated;
