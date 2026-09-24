# Noltos UI/UX-standard

Version 1.0, införd 24 september 2026. Utgår från projektägarens UI/UX-bibel. Detta är Noltos interna arbetsstandard, inte en certifiering eller en återgivning av Apples eller Googles regelverk.

## Identitet och ansvar

Behåll Noltos varma, konkreta språk, mammuten, illustrationerna, Inter/Montserrat och kombinationen petrol, aqua och guld. Referensbildens blå dashboard är inte en ny grafisk identitet.

Produktägaren Jonatan Tensetti beslutar om prioriteringar och avvikelser. Den som ändrar en komponent ansvarar för dess beteende, tillstånd, översättningar och verifiering i samma ändring. En separat namngiven designförvaltare och ansvariga för återkommande användarstudier och fältmätning behöver utses av produktägaren; de rollerna har inte bemannats genom denna kodändring.

## Gemensamma byggdelar

- Färgroller finns i `src/index.css`, med egna värden för ljust och mörkt läge. Använd bakgrund/yta, förgrund, primär, sekundär, accent, destruktiv, framgång, varning och information efter funktion. Petrol/aqua/guld behåller sin kulörfamilj; vissa ljushetsvärden har justerats för kontrast.
- Standardtext är 1rem med 1,5 radavstånd. Använd befintliga typografi- och avståndssteg, undvik att krympa text för att få plats. Vanlig sekundär text är 0,875rem.
- Gemensamma knappar, textfält, valkontroller och flikar använder minst 44 CSS-pixlars höjd; ikonknappar har minst 44 × 44. Långa knapptexter får radbrytas. Detta är vår webbstandard. Inline-länkar och äldre specialkontroller behöver bedömas i sitt sammanhang.
- `Button`, Radix-baserade dialoger och övriga `ui`-komponenter är förstahandsval. Navigation använder länkar. Val som sparas med ett formulär använder kryssrutor, direktverkande inställningar kan använda av/på-kontroller.
- Global rörelse följer användarens `prefers-reduced-motion`, även via Framer Motion. Fokus ska vara synligt och ha utrymme vid fasta navigationsytor. Behåll webbläsarens stöd för högkontrastläge.
- Nya användartexter ska finnas på samtliga åtta språk. Knappar beskriver handling och utfall, särskilt skillnaden mellan spara utkast, publicera och skicka.

## Arbetsflöden och tillstånd

Beskriv uppgiften före implementation: användaren försöker göra något, uppgiften är klar vid ett observerbart resultat, och en konkret risk ska förebyggas.

Listor ska skilja hämtning, tomt innehåll, tomt urval, fel och misslyckad uppdatering med kvarvarande äldre data. `QueryFeedback` används för beständig återkoppling och ny hämtning. Ett nätverksfel får inte bli en falskt tom lista. Visa filter med beständiga etiketter. Sökning ska fungera med Enter. Filter och valda flikar ska kunna återställas från URL när det är relevant.

Skrivflöden ska behålla innehåll efter fel. Pågående sändning ska ge omedelbar återkoppling och motverka dubbla inskick. Visa inte framgång förrän den befintliga tjänsten har bekräftat resultatet. Osäkert utfall beskrivs som obekräftat; användaren ska kontrollera resultatet innan en ny sändning. Artikeltitel, innehåll och omslagsbild sparas i samma artikelanrop.

`UnsavedChangesProvider` har en gemensam navigationsspärr för alla monterade skrivytor. `useUnsavedChanges` registrerar ändringsstatus och skyddar även omladdning/stängning via webbläsarens standardvarning. Bekräftad sparning använder `afterSave` för nästa navigation. En misslyckad sparning får inte slå av skyddet. Profilens flikbyte behåller monterade formulär och kräver därför ingen onödig varning. Inläggsskrivaren behåller sitt utkast när dialogen stängs och öppnas igen.

Utkast ligger i sidans arbetsminne. Den här ändringen sparar inte text i localStorage, sessionStorage eller en ny serverlagring. Varningen skyddar normalt lämnande; den återställer inte arbete efter en webbläsarkrasch, en framtvingad stängning eller en uttryckligt godkänd kassering. Lagring över sessioner kräver ett separat beslut om integritet, livslängd och återställning.

## Tillämpning av bibelns 19 delar

| Del | Tillämpning i denna leverans | Fortsatt uppföljning |
| --- | --- | --- |
| 1. Första rimliga gissningen | Synliga etiketter, handlingsnamn, återkoppling, tydligt lämnande | Observera användare som inte känner produkten |
| 2. Användarens uppgift | Jobb och organisationer har läsaranpassade tomlägen och tydlig filterrensning | Granska återstående administrativa arbetsflöden |
| 3. Välbekanta mönster | Befintliga länkar, formulär, Radix-dialoger, gemensamma kontroller | Inventera specialkontroller vid nästa ändring |
| 4. Prioritering | Huvuduppgift, filter och återkoppling grupperas; mobilnavigation får stabila ytor | Långa verkliga innehållsmängder |
| 5. Begriplig text | Beständig feltext, skillnad mellan utkast/publicering/sändning, åtta språk | Språkgranskning med målgrupperna |
| 6. Kontrollernas funktion | Staged formulärval blir kryssrutor; beständiga namn och etiketter | Äldre specialkontroller |
| 7. Sammanhang | URL-filter/flikar, routerhistorik, skrollåterställning, utkastvarning | Skrollåterställning vid kall cache och sena bilder |
| 8. Alla tillstånd | Listfel, retry, gammal cache, tomma urval, laddning, pågående/obekräftad sparning | Återstående detalj- och adminvyer |
| 9. Formulär | Etiketter, meningsfull artikelvalidering, bevarade värden, låsning vid sparning | Full inventering av format/autofyllnad |
| 10. Förebygga/reparera | Utkastskydd, sparfel behåller formulär, skydd mot dubbla artikel- och inläggssändningar | Ingen ny generell serverbaserad ångra-funktion ingår |
| 11. Avbrott | En central lämnandedialog med fokusåtergång; stängd inläggsskrivare behåller utkast | Manuell skärmläsargranskning av alla dialoger |
| 12. Visuellt system | Gemensamma tokenvärden och kontrollmått, ljus/mörk kontrast, Noltos identitet | Alla färgkombinationer i faktiskt innehåll |
| 13. Mobil | Växande knappar/flikar, bottennavigation, tillgänglig språkväxling, synlig artikeletikett | Riktiga telefoner, skärmtangentbord, 320px och textförstoring |
| 14. Tillgänglighet | Semantiska kontroller, huvudlandmärken, hoppa-till-innehåll, fokus, status, tokenkontrast | Full manuell WCAG 2.2 AA-granskning återstår |
| 15. Rörelse | Respekterar minskad rörelse, även meddelandeskroll | Bedöm varje kvarvarande dekorativ animation |
| 16. Snabbhet/stabilitet | Omedelbar väntestatus, spärrad upprepad sändning, kvarvarande cache | Fältmätning av LCP/INP/CLS per enhetstyp |
| 17. Ärlighet | Publik synlighet och sparhandlingar hålls isär; okänt utfall kallas obekräftat | Inga nya AI- eller behörighetsflöden införs |
| 18. Begriplighet testas | Komponenttester med verklig router och representativa fel, navigation och formulär | Tester med målgruppen är ännu inte genomförda |
| 19. Release/ansvar | Dokumenterat system, avvikelser, verifiering och CI i versionshanteringen | Produktägaren utser fortsatt förvaltning och mätansvar |

## Release och avvikelser

Kör projektets befintliga source-, typ-, test-, edge- och byggkontroller. Kontrollera den faktiska användaruppgiften med tangentbord, hjälpteknik, smal skärm, textförstoring och relevanta fel. Automatiska tester ersätter inte användartest eller WCAG-granskning.

En avvikelse ska ange regel, skäl, användarpåverkan, underlag, ansvarig och nästa granskning. Kända begränsningar finns i `ux-implementation-2026-09-24.md`. Ett blockerande fel i ett centralt flöde ska stoppa publicering oavsett hur andra kontroller går.
