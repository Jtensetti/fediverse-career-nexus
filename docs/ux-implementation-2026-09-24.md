# UX-implementering 24 september 2026

Utgångspunkt: main `da70086fd1c1c12a1ad1fe90cb81bd9b6af92394`. Ingen publicering, backendändring, produktionsdata eller ny betaltjänst ingår.

## Implementerat

- Globala statusmeddelanden är åter synliga; mobilnavigeringens säkra bottenyta använder strukturell markör i stället för svensk `aria-label`; forced-colors tillåts använda användarens färger.
- Gemensamma knappar, inputs, textareas, selects, tabs och dialoger har minhöjd, radbrytning, tydligt fokus och viewport-anpassad dialogyta. Repetitiv skal-/bounce-rörelse togs bort från mobilnavigationen.
- Framer Motion följer `prefers-reduced-motion`. Appens yttre felaktiga `main` blev en neutral behållare och helskärmslayout använder dynamisk viewport där den ändrades.
- Jobb, artiklar, evenemang och organisationer skriver centrala filter/flikar till URL och visar separat laddning, fel med nytt försök, resultat och relevant tomstatus. Berörda lästjänster kastar riktiga fel i stället för att returnera falskt tomma listor.
- Jobb-, evenemangs- och organisationsformulär rapporterar dirty-state. Omladdning och uttrycklig avbryt/tillbaka bekräftar kassering; lyckad/pågående sparning ger ingen nuisance-varning. Innehållet hålls endast i komponentminne.
- Jobbredigering och evenemangsredigering visar misslyckad mutation i stället för att tyst stanna. Inläggs- och kommentarredigering fick namngivna textfält och översatt reservfel.
- Meddelandelistan skiljer fel i kontakter/förfrågningar från tomma tillstånd. Äldre meddelanden kan läggas till utan att läspositionen hoppar. Meddelandefönstret använder dynamisk mobilhöjd.
- Granskade ikonknappar har namn och minst 44 px fristående mål. Språkresurserna har fortsatt exakt paritet för sv/en/fr/de/nl/es/ja/it.

## Verifiering

- `scripts/ux-standard.test.mjs` kontrollerar de globala defekterna, gemensamma mål/radbrytning, URL-baserad liststate, osparat-skydd och meddelandelistans fel-/scrollmönster.
- Översättningstest, TypeScript för app och byggkonfiguration samt diffkontroll passerar.
- Node-, Deno-, Edge- och produktionsbygge körs som slutlig gate efter implementeringen.
- Browserkontroll görs lokalt utan produktionsskrivningar på publika jobb-, artikel-, evenemangs- och organisationsvyer i desktop/mobil, mörkt läge och reducerad rörelse.

## Delvis verifierat eller kvar

- Detta är en bred, konkret passering men inte en fullständig omskrivning av hundratals vyer. Artikelns skapa/redigera-formulär och vissa profil-/inställningsdialoger har ännu inte samma generella dirty-navigation-guard.
- Sökningens huvudfråga och fyra prioriterade listor är djup­länkbara; samtliga avancerade sökfält, federerat flödesval och alla äldre lokala tabs är inte URL-synkroniserade.
- Full generell scrollåterställning mellan varje list- och detaljsida infördes inte; den kräver avgränsad routerstrategi så callback- och authflöden inte störs. Meddelandens prepend-scroll är åtgärdad separat.
- De delade primitives förbättrar hela produkten, men varje ikon, rubriknivå, etikett, 200 % textläge och tangentbordsordning är inte manuellt granskat.
- Autentiserade resor har inte skrivit testdata. Bildutkast/atomisk publicering, moderering, bekräftelser och E2EE ändrades inte.
- Översättningarna behöver fortfarande modersmålsgranskning, särskilt juridisk text. Svenska skärmbilder på startsidan är fortfarande bilder och översätts inte.
- Ingen WCAG 2.2 AA-certifiering, användarstudie, fältprestanda eller Core Web Vitals-mätning hävdas.
- Tre befintliga databasåtkomstfynd ligger utanför den uttryckliga frontendgränsen och ändrades inte: bred läsning av profilsektioners synlighet, bred läsning av blockerade domäner samt en alltför bred organisations-update-check.