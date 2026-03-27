
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale, Shield, Users, FileText } from "lucide-react";

const TermsOfService = () => {
  const keyPoints = [
    {
      icon: Scale,
      title: "Juridiskt avtal",
      description: "Dessa villkor utgör ett bindande avtal mellan dig och Samverkan."
    },
    {
      icon: Users,
      title: "Samverkan",
      description: "Innehåll kan delas med anslutna organisationer inom nätverket."
    },
    {
      icon: Shield,
      title: "Användarsäkerhet",
      description: "Vi upprätthåller riktlinjer och förbehåller oss rätten att moderera innehåll."
    },
    {
      icon: FileText,
      title: "Dina rättigheter",
      description: "Du behåller äganderätten till ditt innehåll och beviljar nödvändiga licenser för drift."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Användarvillkor
            </h1>
            <p className="text-xl text-accent">
              Juridiska villkor för användning av Samverkan
            </p>
            <p className="text-lg text-primary-foreground/90 mt-4">
              <strong>Ikraftträdandedatum:</strong> 16 juni 2025
            </p>
            <p className="text-lg text-primary-foreground/90 mt-2">
              Dessa användarvillkor utgör ett juridiskt bindande avtal mellan dig och Samverkan, 
              som reglerar din användning av Samverkan-plattformen och tillhörande tjänster.
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
              <h2 className="text-2xl font-bold text-primary mb-6">1. Definitioner</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-foreground">Samverkan:</strong> Plattformen för professionellt nätverkande, jobbpublicering och intern kommunikation inom offentlig sektor, inklusive all kod, funktionalitet och tjänster.</li>
                  <li><strong className="text-foreground">Användare:</strong> Varje person eller organisation som har åtkomst till, registrerar sig för eller använder tjänsten.</li>
                  <li><strong className="text-foreground">Innehåll:</strong> All information, data, text, bilder, filer, länkar eller annat material som publiceras, överförs eller på annat sätt görs tillgängligt via tjänsten.</li>
                  <li><strong className="text-foreground">Samverkan:</strong> Processen där information utbyts mellan anslutna organisationer och instanser inom Samverkan-nätverket.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">2. Behörighet</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Du måste vara minst 16 år gammal, eller uppfylla minimiåldern för digitalt samtycke i ditt land, 
                  för att använda denna tjänst. Genom att använda tjänsten garanterar du att du uppfyller detta 
                  ålderskrav och att all information du lämnar är sanningsenlig och korrekt.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">3. Kontoregistrering och säkerhet</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Du kan behöva skapa ett konto för att få åtkomst till vissa funktioner. Du ansvarar för att hålla dina kontouppgifter konfidentiella.</li>
                  <li>Du förbinder dig att tillhandahålla korrekt, aktuell och fullständig information och att uppdatera den vid behov.</li>
                  <li>Du är ensam ansvarig för all aktivitet som sker under ditt konto.</li>
                  <li>Om du misstänker obehörig åtkomst eller säkerhetsbrott ska du omedelbart meddela administratören.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">4. Användaruppförande</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>Genom att använda tjänsten samtycker du till att:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Använda tjänsten endast för lagliga ändamål och i enlighet med dessa villkor och tillämplig lagstiftning.</li>
                  <li>Inte utge dig för att vara en annan person eller organisation, eller felaktigt uppge din tillhörighet.</li>
                  <li>Inte ladda upp, publicera, överföra eller på annat sätt tillgängliggöra innehåll som:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Är olagligt, hotfullt, kränkande, trakasserande, förtalande, obscent, hatiskt eller på annat sätt stötande.</li>
                      <li>Gör intrång i immateriella rättigheter, integritet eller andra rättigheter.</li>
                      <li>Innehåller virus, skadlig kod eller andra skadliga komponenter.</li>
                    </ul>
                  </li>
                  <li>Inte försöka få obehörig åtkomst till någon del av tjänsten eller störa nätverkets normala drift.</li>
                  <li>Inte använda tjänsten för oönskad reklam, spam eller kommersiella syften utom när det uttryckligen är tillåtet (t.ex. jobbpubliceringar).</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">5. Innehållsägandeskap och licens</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Du behåller äganderätten till allt innehåll du skickar in, publicerar eller visar i tjänsten.</li>
                  <li>Genom att skicka in innehåll ger du oss en världsomspännande, icke-exklusiv, royaltyfri licens att använda, visa, reproducera, anpassa och distribuera ditt innehåll så som krävs för tjänstens drift.</li>
                  <li>Du ansvarar för att du har nödvändiga rättigheter att bevilja denna licens för allt innehåll du delar.</li>
                  <li>Innehåll som du raderar kan finnas kvar i cache eller lagras av anslutna instanser utanför vår direkta kontroll.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">6. Moderering och efterlevnad</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Vi förbehåller oss rätten att ta bort innehåll, stänga av eller avsluta konton efter eget gottfinnande vid överträdelser av dessa villkor eller tillämplig lag.</li>
                  <li>Innehåll eller konton kan tas bort, blockeras eller begränsas enligt lag, eller för att skydda tjänsten, användare eller tredje part.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">7. Datadelning och samverkan</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Genom att använda tjänsten förstår du att visst innehåll (inklusive din profil och inlägg) kan delas med andra anslutna organisationer inom nätverket.</li>
                  <li>Vi ansvarar inte för åtgärder, säkerhetspraxis eller datahantering hos tredje part.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">8. Integritet</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Din integritet är viktig för oss. Se vår <Link to="/privacy" className="text-secondary hover:text-primary transition-colors underline">integritetspolicy</Link> för information om hur dina personuppgifter samlas in, behandlas och delas.</li>
                  <li>Genom att använda tjänsten samtycker du till insamling, användning och delning av din information enligt integritetspolicyn.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">9. Uppsägning</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Du kan avsluta ditt konto när som helst genom att följa instruktionerna i tjänsten.</li>
                  <li>Vi förbehåller oss rätten att stänga av eller avsluta din åtkomst till tjänsten, med eller utan förvarning, vid överträdelse av dessa villkor eller tillämplig lag, eller av säkerhetsskäl.</li>
                  <li>Vid uppsägning hanteras dina uppgifter i enlighet med vår integritetspolicy.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">10. Friskrivningsklausuler</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Tjänsten tillhandahålls "i befintligt skick" och "som tillgänglig" utan garantier av något slag, uttryckliga eller underförstådda.</li>
                  <li>Vi garanterar inte att tjänsten kommer att vara oavbruten, felfri eller säker.</li>
                  <li>Vi ansvarar inte för åtgärder, innehåll eller tillgänglighet hos tredje parts tjänster.</li>
                  <li>Vi garanterar inte riktigheten, fullständigheten eller tillförlitligheten av innehåll eller information i tjänsten.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">11. Ansvarsbegränsning</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>I den utsträckning tillämplig lag tillåter:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Vi, våra närstående och våra administratörer ska inte hållas ansvariga för indirekta, oförutsedda, speciella eller följdskador som uppstår ur eller i samband med din användning av tjänsten.</li>
                  <li>Vårt totala ansvar för anspråk relaterade till dessa villkor eller tjänsten ska inte överstiga det högre av (a) det belopp du betalat (om något) för att använda tjänsten under de 12 månaderna före anspråket, eller (b) 100 EUR.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">12. Ändringar av villkoren</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Vi kan uppdatera dessa villkor från tid till annan. Ändringar publiceras på denna sida med ett nytt 
                  ikraftträdandedatum. Din fortsatta användning av tjänsten efter att ändringar har publicerats innebär 
                  att du godkänner de reviderade villkoren.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">13. Tillämplig lag och jurisdiktion</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Dessa villkor ska regleras av och tolkas i enlighet med svensk lagstiftning. 
                  Eventuella tvister som uppstår ur dessa villkor eller tjänsten ska avgöras av 
                  behörig domstol i Sverige.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">14. Ogiltighetsklausul</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Om någon bestämmelse i dessa villkor befinns vara olaglig, ogiltig eller ogenomförbar, 
                  ska den bestämmelsen anses avskiljbar från dessa villkor och ska inte påverka giltigheten 
                  och verkställbarheten av övriga bestämmelser.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">15. Kontakt</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Vid frågor eller meddelanden angående dessa villkor, vänligen kontakta:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p><strong>E-post:</strong> jtensetti@protonmail.com</p>
                  <p><strong>Samverkan-konto:</strong> JTensetti (@user_f33be7a8)</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg mt-4">
                  <p>
                    <strong>Genom att använda denna tjänst godkänner du dessa användarvillkor.</strong><br />
                    Tack för att du är en del av Samverkan-nätverket.
                  </p>
                </div>
              </div>
            </section>
          </div>
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

export default TermsOfService;
