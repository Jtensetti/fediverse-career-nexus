import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SEOHead } from "@/components/common/SEOHead";

const CookiesPage = () => {
  return (
    <>
      <SEOHead title="Cookies — Nolto" description="Information om hur Nolto använder cookies och liknande tekniker." />
      <div className="min-h-screen flex flex-col bg-background">
        <div className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">Cookies</h1>
              <h2 className="text-xl md:text-2xl font-medium text-accent">Hur Nolto använder cookies</h2>
            </div>
          </div>
        </div>
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto prose prose-lg dark:prose-invert">
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Nolto använder enbart strikt nödvändiga cookies. Vi använder inga reklam-, analys- eller spårningscookies. 
              Därför behövs inget cookie-samtycke.
            </p>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">Nödvändiga cookies (alltid aktiva)</h2>
              <div className="bg-muted/50 p-6 rounded-lg">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Autentiseringscookies:</strong> Upprätthåller din inloggningssession och håller ditt konto säkert. 
                      Dessa sätts när du loggar in och försvinner när du loggar ut.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Säkerhetscookies (Cloudflare __cf_bm):</strong> Skyddar mot botar och skadlig trafik. 
                      Dessa sätts av vår infrastrukturleverantör och upphör efter 30 minuters inaktivitet.
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">Cookies vi inte använder</h2>
              <div className="bg-primary/5 p-6 rounded-lg">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <span className="text-muted-foreground">Reklam- eller marknadsföringscookies</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <span className="text-muted-foreground">Analysspårning (Google Analytics etc.)</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <span className="text-muted-foreground">Spårningspixlar från sociala medier</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <span className="text-muted-foreground">Tredjepartscookies i övrigt</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">Lokal lagring</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Nolto kan använda <strong className="text-foreground">localStorage</strong> i din webbläsare för att spara inställningar 
                  som tema (ljust/mörkt läge) och språkval. Dessa lagras lokalt på din enhet och skickas aldrig till våra servrar.
                </p>
              </div>
            </section>

            <section className="bg-primary text-primary-foreground p-8 rounded-lg text-center">
              <h2 className="text-2xl font-bold mb-4">Frågor?</h2>
              <p className="text-lg mb-4 text-primary-foreground/90">
                Läs vår fullständiga{" "}
                <Link to="/privacy" className="underline hover:text-primary-foreground transition-colors">Integritetspolicy</Link>{" "}
                för mer information om hur vi hanterar dina uppgifter.
              </p>
            </section>
          </div>
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

export default CookiesPage;
