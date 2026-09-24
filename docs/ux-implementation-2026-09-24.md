# Implementering av UI/UX-bibeln – 24 september 2026

Detta kompletterar den tidigare auditrapporten och beskriver den senare implementationen. Historiska uppgifter om testinnehåll i tidigare rapporter är inte ett aktuellt datainventarium. Ingen ny testanvändare eller nytt testinnehåll har skapats i produktion för denna implementation.

## Omfattning

Befintlig Nolto-identitet behålls: petrol, aqua, guld, mammut, illustrationer och typografi. Förändringarna gäller gemensamma kontroller, huvudnavigation, listor/sökfilter och centrala skrivflöden. Autentiseringsregler, databasschema, RLS och åtkomsträttigheter ändras inte.

De första gemensamma ändringarna ligger i main-kommittarna fram till `ce4541986db0da34b7d8f0f23f6e4833a9de4d00`. Den kompletterande PR:n rättar bland annat den första versionens typfel, otillräckliga kontrastvärden, ofullständiga filteretiketter och ett utkastskydd som bara täckte omladdning.

Genomfört:

- Gemensam skyddad intern navigation, bakåtknapp och omladdning för osparade artiklar, jobb, evenemang, organisationer, profilfält/CV-rader, meddelandetext och inlägg/kommentarredigering. Ett stängt inläggsutkast går att öppna igen under samma sidbesök.
- Jobb-, organisations- och sökfilter samt relevanta listflikar bevaras i URL. Inmatning nollställs inte av en likvärdig omrendering. Filter har synliga kopplade etiketter.
- Listor skiljer tomt resultat från hämtfel och varnar om uppdateringen misslyckades medan äldre data visas. Återförsök ligger kvar på sidan.
- Sparfel lämnar innehållet kvar och visar beständig återkoppling. Artikel- och inläggssändning har spärr även under förberedelse. Artikelns omslag sparas med övriga artikeluppgifter.
- Kontroller som sparas tillsammans med ett formulär använder kryssrutor. Gemensamma knapptexter kan växa och ikonknappar får minst 44 × 44 CSS-pixlar.
- Justerade ljushetsvärden ger bättre kontrast inom Noltos palett i båda temana. Gemensam minskad rörelse, fokusmarginaler, huvudlandmärken och hopplänk.
- Nya texter finns på svenska, engelska, tyska, franska, nederländska, spanska, italienska och japanska.

## Verifiering

Lokalt genomförd automatiserad verifiering:

- Source-kontroll och TypeScript-kontroller: godkända.
- Node-testsviten: 106 godkända tester, inklusive åtta nya beteende-/kontrastkontroller.
- Deno: 54 godkända tester.
- Edge-funktionernas kontroll och produktionsbygge: godkända.

De åtta nya kontrollerna omfattar orört formulär, avbruten bakåtnavigation med bibehållen text och fokus, godkänd kassering/bekräftad sparning, misslyckad sparning med flera monterade skrivytor, profilflikar, filterutkast och etiketter, återförsök med kvarvarande cache samt faktisk kontrast mellan definierade ljusa/mörka tokenpar. Befintliga flödestester kontrollerar även att inläggsutkast överlever stängning och återöppning.

Kontrollerna körs med isolerade komponenter och tjänstestubbar. De är inte ett bevis för alla produktionsintegrationer, skärmläsare eller verkliga mobiltelefoner. Bygget rapporterar fortfarande en initial JS-chunk över Vites standardgräns på 500 kB; gränsen har inte höjts för att dölja varningen. Ingen fältmätning av Core Web Vitals har genomförts här.

## Återstående arbete och avgränsningar

1. Genomför manuella tester med skärmläsare, tangentbord, 200 procent textförstoring, 320 CSS-pixlars omflöde och skärmtangentbord på riktiga enheter. Tokenkontrast är inte en full WCAG 2.2 AA-granskning.
2. Genomför observerade uppgifter med målgruppen. Bestäm mått och godkännandegränser före testet. De automatiska testerna säger inget om statistisk användbarhet i målgruppen.
3. Mät verkliga LCP, INP och CLS vid 75:e percentilen separat för mobil/dator. Följ upp huvudpaketets storlek och återställning av skrollposition när bilder eller data anländer sent.
4. Inventera äldre inställnings-, admin- och detaljvyer som inte fått full tillstånds- och formulärgranskning i denna leverans. Organisations- och evenemangslistorna har fortfarande sina befintliga hämtningsgränser (20 respektive 10); fullständig paginering behöver tillkomma när de växer.
5. Utkast lagras i minnet och kan inte återställas efter krasch eller uttrycklig kassering. Serverlagrade utkast, generell ångra-funktion och idempotens för samtliga skrivoperationer kräver separata beslut och backendarbete. Ett avbrutet anrop kan fortfarande ha nått servern; beständig text för obekräftat utfall uppmärksammar detta.
6. Produktägaren behöver utse fortsatt designförvaltning, språkgranskning, användartest och mätansvar. Ansvar kan inte ersättas av en kodkomponent.

Dessa punkter är fortsatt arbete, inte genomförda eller certifierade resultat.
