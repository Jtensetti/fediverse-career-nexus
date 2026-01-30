import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import InstanceGuidelines from "@/components/InstanceGuidelines";
import { SEOHead } from "@/components/common/SEOHead";

const InstanceGuidelinesPage = () => {
  return (
    <>
      <SEOHead 
        title="Instance Guidelines" 
        description="Guidelines for operating a Nolto instance responsibly and maintaining network health." 
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
                Instance Guidelines
              </h1>
              <h2 className="text-xl md:text-2xl font-medium text-accent">
                Responsible Operation & Network Health
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <InstanceGuidelines />
          </div>
        </main>

        {/* Navigation */}
        <div className="border-t border-border py-6">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Button asChild variant="outline">
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InstanceGuidelinesPage;
