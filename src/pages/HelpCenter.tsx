import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SEOHead } from "@/components/common/SEOHead";

const HelpCenter = () => {
  const faqSections = [
    {
      title: "Komma igång",
      items: [
        { question: "Hur går jag med i Nolto?", answer: "Välj en Nolto-instans (t.ex. nolto.social) och skapa ditt konto. Fyll i din profil för att börja ansluta och utforska möjligheter." },
        { question: "Behöver jag betala för att använda Nolto?", answer: "Nej. Nolto är gratis att använda. Vissa organisationer kan erbjuda premiumfunktioner eller ta emot donationer, men kärnplattformen är alltid öppen." },
        { question: "Kan jag använda Nolto på mobilen?", answer: "Ja! Nolto fungerar i alla moderna webbläsare på både dator och mobil." },
      ]
    },
    {
      title: "Samverkan",
      items: [
        { question: "Vad är samverkan?", answer: "Samverkan innebär att Nolto inte bara är en enskild webbplats. Det är ett nätverk av oberoende servrar (\"instanser\") som kommunicerar med varandra." },
        { question: "Kan jag ansluta med användare från andra Nolto-instanser?", answer: "Ja. Du kan följa, skicka meddelanden och söka jobb över alla anslutna Nolto-instanser, oavsett var ditt konto skapades." },
        { question: "Vad händer om jag vill flytta mitt konto?", answer: "Du kan exportera din profildata och flytta till en annan Nolto-instans när du vill. Dina kontakter och historik följer med." },
      ]
    },
    {
      title: "Integritet och säkerhet",
      items: [
        { question: "Vem kan se min profil?", answer: "Du styr din integritet. Ställ in varje del av din profil som offentlig, privat eller synlig bara för dina kontakter." },
        { question: "Hur skyddas min data?", answer: "Nolto är byggt med integritet i åtanke och följer strikta dataskyddsprinciper. Din data stannar på den instans du väljer och du har alltid kontroll." },
        { question: "Hur rapporterar jag missbruk eller olämpligt innehåll?", answer: "Varje Nolto-instans har ett eget modereringsteam. Använd \"Rapportera\"-funktionen på profiler, inlägg eller meddelanden för att flagga problem." },
      ]
    },
    {
      title: "Felsökning",
      items: [
        { question: "Jag har glömt mitt lösenord. Vad gör jag?", answer: "Klicka på \"Glömt lösenord?\" på inloggningssidan och följ instruktionerna för att återställa ditt lösenord via e-post." },
        { question: "Jag hittar inte svar på mitt problem — vad gör jag nu?", answer: "Kontakta din instansadministratör, besök vårt communityforum eller öppna ett ärende på Codeberg Issues." },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Hjälpcenter" description="Hitta svar på vanliga frågor och få ut det mesta av ditt professionella nätverk på Nolto." />
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">Hjälpcenter</h1>
            <p className="text-xl text-accent">Välkommen till Noltos hjälpcenter! Hitta svar på vanliga frågor och få ut det mesta av ditt professionella nätverk.</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-8">Vanliga frågor</h2>
            {faqSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-8">
                <h3 className="text-xl font-semibold text-primary mb-4">{section.title}</h3>
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, itemIndex) => (
                    <AccordionItem key={itemIndex} value={`${sectionIndex}-${itemIndex}`}>
                      <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Snabbstartsguide</h2>
            <div className="bg-muted p-6 rounded-lg">
              <ol className="space-y-4">
                {[
                  { step: "1", title: "Välj en instans:", desc: "Bläddra bland publika Nolto-servrar och välj en som passar er." },
                  { step: "2", title: "Registrera dig:", desc: "Skapa ditt konto och verifiera din e-post." },
                  { step: "3", title: "Fyll i din profil:", desc: "Lägg till kompetenser, erfarenhet och ställ in dina integritetsinställningar." },
                  { step: "4", title: "Börja ansluta:", desc: "Sök efter jobb, följ organisationer och anslut med kollegor." },
                  { step: "5", title: "Utforska nätverket:", desc: "Upptäck möjligheter från hela nätverket!" },
                ].map(({ step, title, desc }) => (
                  <li key={step} className="flex items-start">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0 mt-1">{step}</div>
                    <div><strong className="text-primary">{title}</strong> {desc}</div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="bg-primary text-primary-foreground p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Behöver du mer hjälp?</h2>
            <p className="text-lg mb-6 text-primary-foreground/90">
              Om du behöver mer hjälp, kolla{" "}
              <Link to="/documentation" className="text-accent hover:underline">Dokumentationen</Link>{" "}
              eller kontakta din instansadministratör.
            </p>
            <p className="text-lg mb-6 text-primary-foreground/90">
              För tekniska problem eller funktionsförslag kan du också öppna ett ärende på{" "}
              <a href="https://codeberg.org/Tensetti/Nolto/issues" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center">
                Codeberg Issues <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </p>
            <p className="text-xl font-semibold text-accent">Vi finns här för att hjälpa — välkommen till Nolto!</p>
          </section>
        </div>
      </div>

      <div className="border-t py-6">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Button asChild variant="outline">
              <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Tillbaka till startsidan</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
