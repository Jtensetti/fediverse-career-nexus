
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Scale, Lock, Network, Eye, Settings, Users } from "lucide-react";

const InstanceGuidelines = () => {
  const guidelines = [
    {
      icon: Scale,
      title: "1. Rättslig efterlevnad",
      points: [
        "Du ansvarar för att din instans följer alla tillämpliga lagar och förordningar, inklusive GDPR och lokala dataskyddslagar.",
        "Du måste tillhandahålla tydlig information om vem som driver instansen och hur användare kan kontakta dig.",
        "Publicera en integritetspolicy och användarvillkor på din instans."
      ]
    },
    {
      icon: Shield,
      title: "2. Moderering och säkerhet", 
      points: [
        "Implementera modereringsprocesser för att förhindra missbruk, trakasserier, olagligt innehåll och spam.",
        "Utse moderatorer som kan hantera rapporter och upprätthålla regler snabbt och rättvist.",
        "Ta bort eller blockera användare och innehåll som bryter mot dina regler, Samverkans uppförandekod eller tillämpliga lagar.",
        "Svara på rapporter från användare och andra instansadministratörer inom rimlig tid."
      ]
    },
    {
      icon: Lock,
      title: "3. Dataskydd och integritet",
      points: [
        "Skydda användardata med lämpliga tekniska och organisatoriska åtgärder.",
        "Tillåt användare att exportera sina uppgifter och radera sina konton när som helst.", 
        "Begränsa lagring av loggar och personuppgifter till vad som är nödvändigt för säkerhet och drift."
      ]
    },
    {
      icon: Network,
      title: "4. Federationsansvar",
      points: [
        "Respektera blocklistor och modereringsbeslut från andra instanser.",
        "Undvik att federera med instanser kända för trakasserier, missbruk eller olaglig verksamhet.",
        "Håll kontakt- och teknisk information uppdaterad så att andra kan nå dig vid behov.",
        "Informera användare om du planerar större ändringar, driftstopp eller uppdateringar av federationspolicy."
      ]
    },
    {
      icon: Eye,
      title: "5. Transparens",
      points: [
        "Gör dina regler och modereringspraxis offentliga.",
        "Publicera eventuella blocklistor eller federationspolicyer om du begränsar federation med vissa instanser.",
        "Var öppen om ändringar i ditt modereringsteam, programvaruversion eller viktiga policyer."
      ]
    },
    {
      icon: Settings,
      title: "6. Tekniska krav", 
      points: [
        "Håll din Samverkan-programvara och beroenden uppdaterade med säkerhetspatchar.",
        "Underhåll regelbundna säkerhetskopior och katastrofåterställningsplaner.",
        "Övervaka din instans prestanda och tillgänglighet."
      ]
    },
    {
      icon: Users,
      title: "7. Gemenskapsstandarder",
      points: [
        "Främja en inkluderande, respektfull och professionell miljö.",
        "Tillämpa uppförandekoden konsekvent.",
        "Uppmuntra öppen dialog men agera snabbt vid hot mot användarsäkerhet eller rättslig efterlevnad."
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto prose prose-lg dark:prose-invert">
      <p className="text-lg text-muted-foreground leading-relaxed mb-8">
        Att driva en Samverkan-instans är ett ansvar. För att säkerställa nätverkets hälsa och skydda användare 
        måste alla instansoperatörer följa dessa riktlinjer.
      </p>

      <div className="space-y-12">
        {guidelines.map((guideline, index) => (
          <section key={index} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <guideline.icon className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold text-primary">{guideline.title}</h2>
            </div>
            <div className={`${index % 2 === 0 ? 'bg-muted/50' : 'bg-primary/5'} p-6 rounded-lg`}>
              <ul className="space-y-4">
                {guideline.points.map((point, pointIndex) => (
                  <li key={pointIndex} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>

      <section className="bg-primary text-primary-foreground p-8 rounded-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Åtagande att följa riktlinjerna</h2>
        <p className="text-lg mb-6 text-primary-foreground/90">
          Genom att driva en Samverkan-instans förbinder du dig att upprätthålla dessa riktlinjer. 
          Underlåtenhet att göra det kan leda till defederation eller borttagning från Samverkans offentliga instanslistor.
        </p>
        <p className="text-lg font-medium text-secondary mb-6">
          Om du har frågor eller behöver stöd, se{" "}
          <Link to="/documentation" className="underline hover:text-primary-foreground transition-colors">Dokumentationen</Link>, 
          gå med i communityforumet eller kontakta Samverkan-teamet.
        </p>
      </section>
    </div>
  );
};

export default InstanceGuidelines;
