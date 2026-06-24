import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SEOHead } from "@/components/common/SEOHead";
import { useTranslation } from "react-i18next";

const Mission = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Vårt uppdrag | Nolto" 
        description="Nolto är ett federerat alternativ till LinkedIn — öppet, GDPR-kompatibelt och utan annonser." 
      />
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Vårt uppdrag
            </h1>
            <h2 className="text-xl md:text-2xl font-medium text-accent">
              Det federerade alternativet till LinkedIn
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            Nolto är ett federerat alternativ till LinkedIn — en öppen, GDPR-kompatibel plattform för professionellt nätverkande. Vi tror att alla yrkesverksamma förtjänar moderna verktyg för kommunikation, rekrytering och kunskapsdelning — utan algoritmer, annonser eller dataförsäljning.
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Varför Nolto?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Dagens professionella nätverk finansieras genom reklam och dataförsäljning, och låser in dig i en enda plattform. Det betyder algoritmer som styr vad du ser, ingen kontroll över din data och inget val om du vill byta.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Nolto är annorlunda. Vi erbjuder en federerad plattform med några grundprinciper:
            </p>
            
            <div className="bg-muted p-6 rounded-lg mb-8">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <strong className="text-primary">GDPR-säkrad data:</strong> All data lagras krypterat i EU med fullständig GDPR-efterlevnad.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <strong className="text-primary">Nolto över gränser:</strong> Nätverka och dela kunskap med kollegor i hela det federerade nätverket — oavsett vilken instans de använder.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <strong className="text-primary">Full kontroll:</strong> Er organisation bestämmer vilken data som delas och med vem. Export och radering när som helst.
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Hur fungerar det?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nolto bygger på öppna standarder som möjliggör säker nolto mellan organisationer. Det innebär att:
            </p>
            
            <div className="bg-primary/5 p-6 rounded-lg mb-8">
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Organisationer kan dela jobbannonser, evenemang och kunskap över hela det federerade nätverket.</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Varje organisation kan välja att drifta sin egen instans eller använda vår hanterade tjänst.</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <span className="text-muted-foreground">All kommunikation är krypterad och uppfyller kraven på informationssäkerhet.</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Våra principer</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 border rounded-lg">
                <h3 className="font-semibold text-primary mb-3">Säkerhet</h3>
                <p className="text-muted-foreground text-sm">GDPR-kompatibel datahantering med kryptering och EU-lagring.</p>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <h3 className="font-semibold text-primary mb-3">Transparens</h3>
                <p className="text-muted-foreground text-sm">Öppen källkod som kan granskas av alla. Inga dolda agendor.</p>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <h3 className="font-semibold text-primary mb-3">Nolto</h3>
                <p className="text-muted-foreground text-sm">Öppna standarder som möjliggör samarbete över organisationsgränser.</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Vad vi vill förändra</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Nolto är inte bara ännu ett professionellt nätverk — det är ett steg mot digital suveränitet för alla yrkesverksamma. Vi vill:
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                <span className="text-muted-foreground">Ge yrkesverksamma moderna verktyg för kommunikation och rekrytering utan att kompromissa med datasäkerhet eller integritet.</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                <span className="text-muted-foreground">Möjliggöra samverkan mellan organisationer på en gemensam, öppen plattform.</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                <span className="text-muted-foreground">Visa att en GDPR-säkrad, transparent professionell plattform kan fungera utan reklam eller dataförsäljning.</span>
              </div>
            </div>
          </section>

          <section className="bg-primary text-primary-foreground p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Anslut er organisation</h2>
            <p className="text-lg mb-6 text-primary-foreground/90">
              Oavsett om ni söker nya medarbetare, vill dela kunskap eller bygga ett professionellt nätverk fritt från Big Tech — Nolto är byggt för er.
            </p>
            <p className="text-lg font-medium text-accent mb-6">
              Tillsammans bygger vi ett öppet, federerat alternativ till LinkedIn.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Link to="/auth/signup">
                  Kom igång
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/#live-feed">Utforska plattformen</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t py-6">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka till startsidan
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mission;
