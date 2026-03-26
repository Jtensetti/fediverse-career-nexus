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
        description="Nolto är en säker, GDPR-kompatibel professionell plattform byggd för kommuner, regioner och myndigheter." 
      />
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Vårt uppdrag
            </h1>
            <h2 className="text-xl md:text-2xl font-medium text-accent">
              Professionellt nätverkande för offentlig sektor
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            Nolto är en säker, GDPR-kompatibel plattform för professionellt nätverkande — byggd specifikt för kommuner, regioner och myndigheter. Vi tror att offentlig sektor förtjänar moderna verktyg för intern kommunikation, rekrytering och kunskapsdelning — utan att kompromissa med datasäkerhet.
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Varför Nolto?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Dagens professionella nätverk är byggda för den privata sektorn och finansieras genom reklam och dataförsäljning. Det passar inte offentlig sektor, där GDPR-efterlevnad, transparens och digital suveränitet är grundläggande krav.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Nolto är annorlunda. Vi erbjuder en plattform som möter offentlig sektors unika behov:
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
                    <strong className="text-primary">Samverkan över gränser:</strong> Nätverka och dela kunskap med kollegor i andra kommuner, regioner och myndigheter.
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
              Nolto bygger på öppna standarder som möjliggör säker samverkan mellan organisationer. Det innebär att:
            </p>
            
            <div className="bg-primary/5 p-6 rounded-lg mb-8">
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <span className="text-muted-foreground">Kommuner, regioner och myndigheter kan dela jobbannonser, evenemang och kunskap med varandra.</span>
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
                <h3 className="font-semibold text-primary mb-3">Samverkan</h3>
                <p className="text-muted-foreground text-sm">Öppna standarder som möjliggör samarbete över organisationsgränser.</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Vad vi vill förändra</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Nolto är inte bara ett internt verktyg — det är ett steg mot digital suveränitet för offentlig sektor. Vi vill:
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                <span className="text-muted-foreground">Ge offentlig sektor moderna verktyg för intern kommunikation och rekrytering utan att kompromissa med datasäkerhet.</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                <span className="text-muted-foreground">Möjliggöra samverkan mellan kommuner, regioner och myndigheter på en gemensam, säker plattform.</span>
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
              Oavsett om ni söker nya medarbetare, vill dela kunskap eller bygga professionella nätverk inom offentlig sektor — Nolto är byggt för er.
            </p>
            <p className="text-lg font-medium text-accent mb-6">
              Tillsammans moderniserar vi professionellt nätverkande i offentlig sektor.
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
                <Link to="/feed">Utforska plattformen</Link>
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
