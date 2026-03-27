import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Network, Users, Shield, Zap } from "lucide-react";

const FederationGuide = () => {
  const examples = [
    { text: "Du ansluter dig via din kommun och kan samverka med kollegor från andra kommuner, regioner eller myndigheter." },
    { text: "Om din organisation vill ha en egen Samverkan-instans med egna regler kan ni starta en — och fortfarande samverka med alla andra." },
    { text: "En kollega publicerar en tjänst på sin organisations Samverkan-instans. Den dyker upp i sökresultat för användare i hela nätverket." },
  ];

  const benefits = [
    { icon: Users, title: "Valfrihet", description: "Välj en instans som matchar er organisation — eller starta en egen." },
    { icon: Shield, title: "Kontroll", description: "Behåll er data där ni vill ha den, under regler ni bestämmer." },
    { icon: Zap, title: "Stabilitet", description: "Nätverket kan inte köpas, säljas eller stängas av ett enskilt företag." },
    { icon: Network, title: "Samverkan", description: "Kommunicera med andra organisationer, inte bara inom Samverkan." },
  ];

  const faqs = [
    { question: "Behöver jag flera konton för olika organisationer?", answer: "Nej, du behöver bara ett Samverkan-konto. Men du kan skapa separata konton på olika instanser om du vill." },
    { question: "Kan jag flytta min profil till en annan instans?", answer: "Ja. Samverkan låter dig exportera din profil och kontakter, och flytta till en ny instans när du vill." },
    { question: "Förlorar jag mina kontakter om jag byter?", answer: "Nej. Ditt professionella nätverk följer med dig tack vare samverkan och öppna standarder." },
    { question: "Vad händer om en instans stängs?", answer: "Du kan exportera din data och gå med i en annan instans när som helst." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">Hur samverkan fungerar</h1>
            <p className="text-xl text-secondary">Kraften i samverkan</p>
            <p className="text-lg text-primary-foreground/90 mt-4">
              Samverkan är inte en enskild webbplats — det är en del av något större. 
              Samverkan innebär valfrihet, verklig interoperabilitet och äkta kontroll över din professionella identitet.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Vad är samverkan?</h2>
            <div className="prose prose-lg text-muted-foreground space-y-4">
              <p>De flesta sociala nätverk och jobbportaler är centraliserade — allt sker på ett företags servrar, under en uppsättning regler. Om du inte gillar hur saker fungerar är ditt enda alternativ att lämna.</p>
              <p>Samverkan är annorlunda. Det är ett sätt för oberoende servrar (kallade "instanser") att kommunicera med varandra och dela information. Det är som e-post: du kan ha ett konto var som helst och ändå nå alla, överallt.</p>
              <p>Samverkan använder det öppna <strong>ActivityPub-protokollet</strong>, samma standard som driver Mastodon, Lemmy, PeerTube och många andra plattformar. Detta gör Samverkan till en del av ett växande nätverk av oberoende men sammankopplade organisationer.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Hur det fungerar på Samverkan</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-muted/50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-primary mb-3">Flera instanser</h3>
                <p className="text-muted-foreground">Vem som helst kan driva en Samverkan-server ("instans"). Varje instans kan ha sitt eget fokus — som teknikjobb, kreativa branscher eller lokala organisationer.</p>
              </div>
              <div className="bg-muted/50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-primary mb-3">Ett nätverk</h3>
                <p className="text-muted-foreground">Oavsett var du registrerar dig kan du ansluta med användare, jobb och organisationer över hela Samverkan-nätverket.</p>
              </div>
              <div className="bg-muted/50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-primary mb-3">Portabilitet</h3>
                <p className="text-muted-foreground">Du är aldrig inlåst. Du kan flytta din profil, kontakter och meriter till en annan instans när som helst.</p>
              </div>
              <div className="bg-muted/50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-primary mb-3">Lokalt och globalt</h3>
                <p className="text-muted-foreground">Vissa saker (som moderering eller utvalda jobb) hanteras av din valda instans. Men din räckvidd sträcker sig över hela det samverkande nätverket.</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Exempel</h2>
            <div className="space-y-4">
              {examples.map((example, index) => (
                <div key={index} className="border-l-4 border-secondary pl-6 py-2">
                  <p className="text-muted-foreground leading-relaxed">{example.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Varför samverkan är viktigt</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-card border rounded-lg">
                  <div className="bg-primary/10 p-3 rounded-lg"><benefit.icon className="h-6 w-6 text-primary" /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Vanliga frågor</h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-muted/50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-primary mb-3">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
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

export default FederationGuide;
