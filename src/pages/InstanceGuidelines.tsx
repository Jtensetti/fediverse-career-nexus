import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import InstanceGuidelines from "@/components/InstanceGuidelines";
import { SEOHead } from "@/components/common/SEOHead";

const InstanceGuidelinesPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <SEOHead title="Instansriktlinjer — Samverkan" description="Riktlinjer för att driva en Samverkan-instans inom det federerade nätverket." />
      <div className="min-h-screen flex flex-col bg-background">
        <div className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">Instansriktlinjer</h1>
              <h2 className="text-xl md:text-2xl font-medium text-accent">Riktlinjer för instansoperatörer</h2>
            </div>
          </div>
        </div>
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto"><InstanceGuidelines /></div>
        </main>
        <div className="border-t border-border py-6">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Button asChild variant="outline"><Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Tillbaka till startsidan</Link></Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InstanceGuidelinesPage;
