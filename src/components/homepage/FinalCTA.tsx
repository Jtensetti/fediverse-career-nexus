import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe } from "lucide-react";

const FinalCTA = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-primary to-secondary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-6">
            Ready to Own Your Professional Identity?
          </h2>
          <p className="text-lg text-primary-foreground/90 mb-10 leading-relaxed">
            Join a professional network that respects your privacy, gives you control, 
            and connects you to the entire Fediverse.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              asChild 
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 py-6 text-lg"
            >
              <Link to="/auth/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 font-semibold px-8 py-6 text-lg"
            >
              <Link to="/feed">
                <Globe className="mr-2 h-5 w-5" />
                Explore First
              </Link>
            </Button>
          </div>

          <p className="text-sm text-primary-foreground/70">
            No credit card required • Export your data anytime • Open source
          </p>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
