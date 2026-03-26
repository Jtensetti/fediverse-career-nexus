
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CodeOfConduct = () => {
  return (
    <div className="max-w-4xl mx-auto prose prose-lg dark:prose-invert">
      <p className="text-lg text-muted-foreground leading-relaxed mb-8">
        Nolto är en professionell plattform. För att hålla Nolto öppet, respektfullt och välkomnande för alla 
        förväntar vi oss att samtliga användare följer dessa riktlinjer — både på denna instans och vid 
        interaktion med användare på andra instanser.
      </p>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-primary mb-6">1. Respektera andra</h2>
        <div className="bg-muted/50 p-6 rounded-lg mb-8">
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-muted-foreground">
                Behandla alla med respekt, oavsett yrke, bakgrund, nationalitet, kön, etnicitet, 
                religion, funktionsförmåga, ålder eller identitet.
              </span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-muted-foreground">
                Meningsskiljaktigheter är naturliga. Personangrepp, trakasserier, hatretorik, hot eller 
                diskriminering tolereras inte.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-primary mb-6">2. Professionalism</h2>
        <div className="bg-primary/5 p-6 rounded-lg mb-8">
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-muted-foreground">Håll en professionell ton i dina inlägg, meddelanden och jobbannonser.</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-muted-foreground">Publicera inte vilseledande, bedrägligt eller förtalande innehåll.</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-muted-foreground">Respektera sekretess och dela inte privat information utan samtycke.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-primary mb-6">3. Inga trakasserier eller övergrepp</h2>
        <div className="space-y-4 mb-8">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-muted-foreground">Trakasserier, mobbning, förföljelse eller upprepad oönskad kontakt är strikt förbjudet.</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-muted-foreground">Använd inte Nolto för att hota, utpressa eller skada andra på något sätt.</span>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-primary mb-6">4. Inkluderande kommunikation</h2>
        <div className="bg-muted/50 p-6 rounded-lg mb-8">
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-muted-foreground">Använd ett inkluderande och tydligt språk.</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-muted-foreground">Undvik stötande, explicit eller sexuellt suggestivt innehåll.</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-muted-foreground">Respektera att Nolto är en offentlig, professionell miljö.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-primary mb-6">5. Integritet och laglighet</h2>
        <div className="space-y-4 mb-8">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-muted-foreground">
              Använd inte Nolto för olaglig verksamhet, inklusive bedrägeri, nätfiske eller spridning av 
              skadligt innehåll.
            </span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-muted-foreground">Dela bara innehåll som du har rätt att publicera.</span>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-primary mb-6">6. Moderering</h2>
        <div className="bg-primary/5 p-6 rounded-lg mb-8">
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-muted-foreground">Följ de modereringsriktlinjer som gäller för din instans.</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-muted-foreground">
                Rapporter om regelbrott tas på allvar. Upprepade eller allvarliga överträdelser kan leda till 
                varningar, avstängning eller permanent borttagning från nätverket.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-primary mb-6">7. Samverkansregler</h2>
        <div className="space-y-4 mb-8">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-muted-foreground">
              Kom ihåg att ditt beteende kan påverka din instans och dess samverkan med andra.
            </span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-muted-foreground">
              Var hänsynsfull vid interaktioner mellan instanser och följ reglerna i andra organisationers 
              miljöer.
            </span>
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground p-8 rounded-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Rapportera överträdelser</h2>
        <p className="text-lg mb-6 text-primary-foreground/90">
          Om du upplever eller bevittnar beteende som bryter mot dessa riktlinjer, använd 
          "Rapportera"-funktionen eller kontakta din instansadministratör.
        </p>
        <p className="text-lg font-medium text-secondary">
          Tillsammans kan vi bygga ett professionellt nätverk som är öppet, mångfaldigt och säkert för alla.
        </p>
      </section>
    </div>
  );
};

export default CodeOfConduct;
