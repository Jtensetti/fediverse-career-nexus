# Noltos UX-standard

Ägare: Jonatan Tensetti. Standarden är ett underhållsdokument för Noltos produktgränssnitt, inte en separat designsida eller en tillgänglighetscertifiering.

## Uppgiftsmönster och tokens

- Behåll exakt Noltos teal-/petrolbaserade identitet med blek aqua, varm guldgul accent, mammutkonst, befintlig typografisk karaktär och nuvarande semantiska färgtokens som enda grundsanning. Inför ingen lila/plommonfärgad omprofilering. Använd `background`, `foreground`, `primary`, `muted`, `destructive`, `warning` och `success` i stället för sidunika färger.
- Sidor har en tydlig rubrik, ett primärt nästa steg och stabil navigation. Länkar används för destinationer; knappar används för handlingar.
- Fristående kontroller har minst 44 × 44 CSS-pixlar. Text kan radbrytas och kritiska handlingar får inte klippas vid 320 px eller i långa översättningar.
- Formulär har synliga kopplade etiketter, närliggande hjälp/fel och konkret knapptext. Omedelbara inställningar använder switch; val som sparas senare använder checkbox eller formulärkontroll.
- Listor skiljer på första laddning, omladdning, fel med nytt försök, verkligt tomt resultat och filtrerat tomt resultat med rensning. Redan visat innehåll får ligga kvar vid bakgrundsfel där datalagret stödjer det.
- Filter, sortering och flikar som definierar en listvy hör hemma i URL:en. Det gör bakåtknapp, uppdatering och delade länkar förutsägbara.
- Utkast ligger i React-minnet om inget uttryckligt säkert utkastskontrakt finns. Meddelandetext, inloggningsuppgifter, privata profiluppgifter och godtyckligt formulärinnehåll sparas inte i webbläsarlagring.
- Ett ändrat formulär varnar vid omladdning och vid uttryckliga avbryt-/tillbakahandlingar. Orörda eller sparade formulär ska inte varna. Uppladdnings- och publiceringsfel ska bevara arbetet.
- Dialoger, menyer, flikar och sheets bygger på projektets Radix-primitiver för tangentbord, fokusfälla och fokusåterställning.

## De 19 principerna

| # | Princip | Status |
|---|---|---|
| 1 | Utgå från användarens uppgift | Implementerad som riktlinje; mänsklig testning behövs |
| 2 | Bekanta och förutsägbara mönster | Implementerad i gemensamma kontroller och huvudlistor |
| 3 | Tydlig visuell hierarki | Delvis verifierad på centrala publika vyer |
| 4 | Stabil navigation och tillbaka | Implementerad för jobb, artiklar, evenemang och organisationer via URL |
| 5 | Synliga beständiga formuläretiketter | Befintligt RHF-mönster; delvis granskat |
| 6 | Ärliga laddnings-, tom-, fel- och behörighetsutfall | Implementerad i prioriterade listor; äldre vyer återstår |
| 7 | Konkreta handlingsnamn | Delvis implementerad; äldre generell copy återstår |
| 8 | Valfri, återbesökbar introduktion | Befintligt produktmönster; ej ändrat här |
| 9 | Rätt kontroll för rätt beteende | Implementerad som standard; full inventering återstår |
| 10 | Gemensamma design-tokens | Implementerad i delade kontroller och nya tillstånd |
| 11 | Minst 44 px fristående mål | Implementerad i delade knappar, select, tabs och granskade ikonknappar |
| 12 | 320 px reflow och lång text | Delade kontroller åtgärdade; utvalda publika vyer automatiskt kontrollerade |
| 13 | Reducerad rörelse | CSS och Framer Motion följer användarens inställning |
| 14 | Tangentbord och synligt fokus | Gemensamma kontroller/Radix; full skärmläsargranskning återstår |
| 15 | Skydda osparat arbete | Implementerat för jobb, evenemang och organisationer; artiklar/profil är delvis |
| 16 | Förhindra dubbel mutation och bevara felinput | Implementerat i granskade skapa/redigera-flöden; full tjänsteaudit återstår |
| 17 | Bevara data vid bakgrundsfel | React Query hjälper där data finns; tjänster/listor har fått ärliga initialfel |
| 18 | Prestanda utan onödig ommontering | Lazy routes/språk bevarade; ingen tung dependency tillagd |
| 19 | Verifiera utan överdrivna kvalitetslöften | Automatiska kontroller dokumenteras separat; ingen WCAG-certifiering hävdas |

## Underhåll

Nya mönster ska först läggas i gemensamma primitives eller tillståndskomponenter och sedan användas i riktiga resor. Nya texter ska finnas semantiskt i alla åtta språk. Varje större resa behöver beteendetest och en mobil-/desktopkontroll; automatisering ersätter inte test med faktiska användare eller modersmålsgranskning.