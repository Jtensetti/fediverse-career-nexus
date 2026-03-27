import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Database, Users, Lock } from "lucide-react";

const PrivacyPolicy = () => {
  const keyPoints = [
    {
      icon: Database,
      title: "Datakontroll",
      description: "Dina uppgifter hanteras och skyddas av Samverkan i enlighet med tillämplig lagstiftning.",
    },
    {
      icon: Users,
      title: "Samverkan",
      description: "Viss data kan delas med anslutna organisationer inom nätverket vid samarbete.",
    },
    {
      icon: Shield,
      title: "Dina rättigheter",
      description: "Fullständiga rättigheter enligt GDPR inklusive åtkomst, rättelse, radering och dataportabilitet.",
    },
    {
      icon: Lock,
      title: "Säkerhet",
      description: "Starka tekniska och organisatoriska åtgärder skyddar dina personuppgifter.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">Integritetspolicy</h1>
            <p className="text-xl text-accent">Hur Samverkan hanterar dina personuppgifter</p>
            <p className="text-lg text-primary-foreground/90 mt-4">
              <strong>Ikraftträdandedatum:</strong> 16 juni 2025
            </p>
            <p className="text-lg text-primary-foreground/90 mt-2">
              Denna integritetspolicy förklarar hur Samverkan hanterar dina personuppgifter. Vi är engagerade i att 
              skydda din integritet och säkerställa transparens kring vad som händer med dina uppgifter.
            </p>
          </div>
        </div>
      </div>

      {/* Key Points */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {keyPoints.map((point, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <point.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">{point.title}</h3>
                  <p className="text-muted-foreground">{point.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Content Sections */}
          <div className="prose prose-lg max-w-none">
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">1. Vem kontrollerar dina uppgifter</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Samverkan är en plattform utvecklad med{" "}
                  <strong className="text-foreground">Lovable, ett utvecklingsverktyg registrerat i Sverige (EU)</strong>.
                  När du registrerar dig lagras och hanteras dina uppgifter av Samverkan-plattformen.
                </p>
                <p>
                  Samverkan agerar som personuppgiftsansvarig enligt GDPR och ansvarar för att hantera dina uppgifter 
                  i enlighet med tillämplig lagstiftning.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p>
                    <strong className="text-foreground">Kontaktinformation:</strong>
                    <br />
                    Du hittar kontaktuppgifter för dataskyddsansvarig på vår kontaktsida.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">2. Vilka uppgifter som samlas in</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Beroende på hur du använder Samverkan kan följande uppgifter samlas in och behandlas:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong className="text-foreground">Kontoinformation:</strong> Namn, e-postadress, valt användarnamn, profiluppgifter, lösenord (lagras som en säker hash).
                  </li>
                  <li>
                    <strong className="text-foreground">Professionella uppgifter:</strong> Arbetshistorik, kompetenser, utbildning, uppladdat CV eller portfolio.
                  </li>
                  <li>
                    <strong className="text-foreground">Innehåll:</strong> Inlägg, meddelanden, kommentarer, jobbansökningar och annat användargenererat innehåll.
                  </li>
                  <li>
                    <strong className="text-foreground">Tekniska uppgifter:</strong> IP-adress, enhetsinformation, åtkomstloggar (för säkerhet, missbruksförebyggande och felsökning).
                  </li>
                </ul>
                <p>
                  Samverkan kräver inte känsliga personuppgifter (t.ex. personnummer, hälsodata) om du inte frivilligt 
                  tillhandahåller dem i din profil eller dina inlägg.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">3. Rättslig grund för behandling</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>Dina uppgifter behandlas för följande ändamål och rättsliga grunder:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong className="text-foreground">För att tillhandahålla tjänsten:</strong> Nödvändigt för fullgörandet av vårt avtal med dig (GDPR Art. 6(1)(b)).
                  </li>
                  <li>
                    <strong className="text-foreground">För att uppfylla rättsliga skyldigheter:</strong> Exempelvis säkerhets- och modereringsskyldigheter (GDPR Art. 6(1)(c)).
                  </li>
                  <li>
                    <strong className="text-foreground">Med ditt samtycke:</strong> Där det krävs (t.ex. för valfri kommunikation) (GDPR Art. 6(1)(a)).
                  </li>
                  <li>
                    <strong className="text-foreground">Berättigat intresse:</strong> Såsom säkerhet, missbruksförebyggande eller förbättring av tjänsten, förutsatt att dessa inte åsidosätter dina rättigheter (GDPR Art. 6(1)(f)).
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">4. Hur uppgifter delas</h2>
              <div className="space-y-4 text-muted-foreground">
                <h3 className="text-xl font-semibold text-primary">Inom plattformen</h3>
                <p>
                  Dina uppgifter är tillgängliga för administratörer vid behov för support och moderering.
                </p>

                <h3 className="text-xl font-semibold text-primary">Med anslutna organisationer</h3>
                <p>
                  När du samarbetar med användare i andra anslutna organisationer kan relevant information 
                  (såsom din profil och offentliga inlägg) delas med dessa.
                </p>
                <div className="bg-accent/20 border-l-4 border-accent p-4">
                  <p>
                    <strong className="text-foreground">Observera:</strong> Delad data kan ligga utanför vår ensamma 
                    kontroll när den överförs till en annan organisation. Varje mottagare ansvarar för sin egen dataskyddspraxis.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">5. Dina rättigheter</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>Enligt GDPR har du rätt att:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Få tillgång till dina personuppgifter.</li>
                  <li>Rätta felaktiga eller ofullständiga uppgifter.</li>
                  <li>Radera ditt konto och tillhörande uppgifter ("rätten att bli glömd").</li>
                  <li>Begränsa eller invända mot viss behandling av uppgifter.</li>
                  <li>Exportera dina uppgifter i ett maskinläsbart format (dataportabilitet).</li>
                </ul>
                <p>
                  För att utöva dessa rättigheter, kontakta vår administratör via kontaktinformationen nedan.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">6. Datasäkerhet</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Samverkan använder lämpliga tekniska och organisatoriska åtgärder för att skydda dina uppgifter 
                  mot obehörig åtkomst, ändring eller förlust.
                </p>
                <p>
                  Inget system är dock 100 % säkert. Vi uppmuntrar dig att använda starka lösenord och vara 
                  försiktig med vad du väljer att dela offentligt.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">7. Datalagring</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Dina uppgifter sparas så länge ditt konto är aktivt, och under en rimlig period därefter för 
                  att uppfylla rättsliga skyldigheter eller lösa tvister.
                </p>
                <p>
                  Du kan radera ditt konto när som helst; dina uppgifter raderas eller anonymiseras, 
                  förutom där lagring krävs enligt lag.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">8. Cookies och externa resurser</h2>
              <div className="space-y-6 text-muted-foreground">
                <div>
                  <h3 className="text-xl font-semibold text-primary mb-3">8.1 Nödvändiga cookies (alltid aktiva)</h3>
                  <p className="mb-3">
                    Dessa cookies är strikt nödvändiga för att plattformen ska fungera och kan inte inaktiveras:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong className="text-foreground">Autentiseringscookies:</strong> Upprätthåller din inloggningssession och håller ditt konto säkert.
                    </li>
                    <li>
                      <strong className="text-foreground">Säkerhetscookies (Cloudflare __cf_bm):</strong> Skyddar mot botar och skadlig trafik. Dessa sätts av vår infrastrukturleverantör och upphör efter 30 minuters inaktivitet.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-primary mb-3">8.2 Typsnitt</h3>
                  <p className="mb-3">
                    Samverkan använder typsnitten Inter och Montserrat, som är egenvärdade på våra egna servrar. 
                    Inga förfrågningar görs till externa typsnittsleverantörer (som Google Fonts), vilket säkerställer 
                    att din IP-adress inte delas med tredje part för typsnittssyften.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-primary mb-3">8.3 Vad vi inte använder</h3>
                  <p>Samverkan använder inte:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>Reklam- eller marknadsföringscookies</li>
                    <li>Analysspårning (Google Analytics etc.)</li>
                    <li>Spårningspixlar från sociala medier</li>
                    <li>Cross-site-spårning eller fingeravtrycksteknik</li>
                    <li>Tredjepartsdatamäklare eller annonsnätverk</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">9. Infrastruktur och datalagring</h2>
              <div className="space-y-6 text-muted-foreground">
                <div>
                  <h3 className="text-xl font-semibold text-primary mb-3">9.1 Plattformsleverantör</h3>
                  <p>
                    Samverkan är utvecklat med <strong className="text-foreground">Lovable</strong>, ett företag registrerat i{" "}
                    <strong className="text-foreground">Sverige (EU)</strong>.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-primary mb-3">9.2 Datacenterplats</h3>
                  <p className="mb-3">Dina uppgifter lagras och behandlas inom Europeiska unionen:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong className="text-foreground">Databas och autentisering:</strong> Frankfurt, Tyskland (AWS eu-central-1)
                    </li>
                    <li>
                      <strong className="text-foreground">Edge-funktioner:</strong> EU-prioriterad routing via Deno Deploy
                    </li>
                    <li>
                      <strong className="text-foreground">Innehållsleverans:</strong> Cloudflares globala nätverk med EU-noder
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-primary mb-3">9.3 Underbiträden</h3>
                  <p className="mb-3">Följande tjänsteleverantörer behandlar data på uppdrag av Samverkan:</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-card border border-border rounded-lg">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Tjänst</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Leverantör</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Plats</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Skyddsåtgärder</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="px-4 py-3 text-sm">Databas och autentisering</td>
                          <td className="px-4 py-3 text-sm">Supabase (via AWS)</td>
                          <td className="px-4 py-3 text-sm">Frankfurt, Tyskland</td>
                          <td className="px-4 py-3 text-sm">EU-US DPF + SCCs</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-4 py-3 text-sm">Edge-funktioner</td>
                          <td className="px-4 py-3 text-sm">Deno Deploy</td>
                          <td className="px-4 py-3 text-sm">Globalt / EU</td>
                          <td className="px-4 py-3 text-sm">EU-US DPF</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm">CDN och säkerhet</td>
                          <td className="px-4 py-3 text-sm">Cloudflare</td>
                          <td className="px-4 py-3 text-sm">Globalt</td>
                          <td className="px-4 py-3 text-sm">EU-US DPF + SCCs</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-sm">
                    Alla underbiträden är certifierade under{" "}
                    <strong className="text-foreground">EU-US Data Privacy Framework</strong> och/eller har tecknat{" "}
                    <strong className="text-foreground">Standard Contractual Clauses (SCCs)</strong> för GDPR-efterlevnad.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">10. Internationella dataöverföringar</h2>
              <div className="space-y-4 text-muted-foreground">
                <div className="bg-secondary/20 border-l-4 border-secondary p-4 mb-4">
                  <p className="font-semibold text-foreground">
                    Primär datalagring: Europeiska unionen (Frankfurt, Tyskland)
                  </p>
                </div>
                <p>
                  När data behandlas av USA-baserade infrastrukturleverantörer skyddas överföringar av:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-foreground">EU-US Data Privacy Framework</strong>-certifiering</li>
                  <li><strong className="text-foreground">Standard Contractual Clauses (SCCs)</strong></li>
                  <li>Kompletterande tekniska åtgärder (kryptering under överföring och i vila)</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">11. Ändringar av denna policy</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Vi kan uppdatera denna integritetspolicy från tid till annan. Ändringar publiceras på denna sida 
                  med ett uppdaterat revisionsdatum.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">12. Kontakt</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Vid frågor eller för att utöva dina rättigheter, kontakta dataskyddsansvarig:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p><strong className="text-foreground">E-post:</strong> jtensetti@protonmail.com</p>
                  <p><strong className="text-foreground">Samverkan-konto:</strong> JTensetti (@user_f33be7a8)</p>
                </div>
                <div className="bg-muted p-4 rounded-lg mt-4">
                  <p>
                    Denna policy gäller för Samverkan-plattformen och syftar till att efterleva GDPR och andra 
                    relevanta integritetslagar.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t border-border py-6">
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

export default PrivacyPolicy;
