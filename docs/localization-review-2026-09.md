# Fullständig språk- och organisationsgranskning, september 2026

## Omfattning och metod

Samtliga nycklar i webbappens **åtta språkkataloger har nu genomlästs**: svenska, engelska, franska, tyska, nederländska, spanska, japanska och italienska. Även hjälptexter, juridiska dokument, administrativa vyer och äldre katalogdelar ingår. Svenska och engelska genomlästes i första omgången; de övriga sex har därefter genomlästs i sin helhet. Nya texter och ändringar från den andra omgången har kontrollerats i alla åtta språk.

Granskningen utgår från funktionen: vad användaren gör, vilket resultat som uppstår, vad som väntar och hur ett fel kan åtgärdas. Identiska värden grupperades med alla tillhörande nycklar synliga. Kontextberoende skillnader har därefter hanterats per nyckel. Oklara funktioner har följts till komponent och vid behov tjänst eller lagringsregel. Nyckelnamnet eller den engelska formuleringen är inte ensamt facit.

Den inledande katalogen innehöll 27 964 textvärden. Den färdiga versionen innehåller **28 684 textvärden**, inklusive meddelanden som tidigare låg direkt i koden. Totalt har **2 651 befintliga värden ändrats** jämfört med main efter PR #84. Därutöver har 176 värden per språk tillkommit och 47 ersatta värden per språk tagits bort.

| Språk | Språklig genomläsning | Textvärden nu | Ändrade befintliga | Tillagda | Borttagna |
| --- | --- | ---: | ---: | ---: | ---: |
| Svenska | Genomläst | 3 589 | 147 | 176 | 47 |
| Engelska | Genomläst | 3 585 | 67 | 176 | 47 |
| Franska | Genomläst | 3 585 | 211 | 176 | 47 |
| Tyska | Genomläst | 3 585 | 269 | 176 | 47 |
| Nederländska | Genomläst | 3 585 | 334 | 176 | 47 |
| Spanska | Genomläst | 3 585 | 692 | 176 | 47 |
| Japanska | Genomläst | 3 585 | 512 | 176 | 47 |
| Italienska | Genomläst | 3 585 | 419 | 176 | 47 |

Antalen gäller hela PR #85 jämfört med `ffde56880b08c9893501990fe4ee6c3698f5ef48`. Svenska har fyra extra textvärden i de auktoritativa juridiska dokumentens struktur. Borttagningarna gäller ersatta meningsfragment och gamla räknare. Naturligt språk har bedömts genom genomläsning och funktionsgranskning; tekniska tester är ett separat stöd och kan inte bevisa språklig kvalitet. Granskningen är utförd av Codex, inte av åtta externa modersmålsgranskare.

## Rättade språk- och funktionsproblem

| Område | Problem | Ändring |
| --- | --- | --- |
| Kontakter | Anslutningsord användes för att lägga till en person | Kontaktknappar beskriver en kontaktförfrågan; svenska använder ”Lägg till kontakt” |
| Anställningsverifiering | Flera språk beskrev en jobbansökan eller ett rättsligt anspråk | Beskriver att bekräfta en persons uppgift om anställning |
| Följande och delning | Följare förväxlades med konton man följer; delning beskrevs som marknadsföring | Terminologin följer respektive åtgärd och tillstånd |
| Moderering | Anmälningar beskrevs som rapportdokument; regelborttagning kunde uppfattas som kontoradering | Texter beskriver anmälningar, kontoregler och respektive konsekvens |
| Nederländsk uppförandekod | Saknad negation vände på förbudet mot bland annat trakasserier | Förbudets avsedda innebörd är återställd |
| Tyska | Bland annat engelska rester i uppförandekoden och otydliga regeltexter | Tyska formuleringar med konsekvent tilltal och tydligare åtgärder |
| Spanska | Blandat tilltal och onaturlig användning av versaler; åldersvillkoret uteslöt 16-åringar | Konsekvent vardagligt tilltal i gränssnittet, normal meningsstil och korrekt inkluderande åldersvillkor |
| Japanska | Bland annat heltidsarbete förväxlades med tillsvidareanställning och obligatoriska fält med slutförande | Sysselsättningsgrad, anställningsform och krav skiljs åt; inloggnings- och säkerhetstermer samordnas |
| Italienska | Ordagranna uttryck för startpaket och utbildning i CV | Följlistor och utbildning beskrivs i sitt faktiska sammanhang |
| Franska | Uppladdning och nedladdning kunde blandas ihop | Sändning, import och hämtning skiljs åt |
| Svenska | Bland annat ”kurerade”, ”hälsodata”, ”tysta ord” och ”lämna sammanhang” | Bland annat ”utvalda”, ”driftinformation”, ”ord att filtrera bort” och ”lämna en förklaring” |
| Villkor vid registrering | Meningar byggdes av fragment med fel ordföljd | En hel översättning med två riktiga länkar via `Trans` |
| Notiser, sökning, profil och session | Fragment runt namn och antal gav fel ordföljd eller böjning | Hela meningar med interpolering och pluralformer |
| Företagssidor och lediga jobb | Skapad sida beskrevs som skapad organisation; tom jobbflik påstod att arbetsgivaren saknar jobb | Texter beskriver sidans innehåll och publicerade annonser |
| Lön och formulär | Feltexter motsvarade inte de tillåtna gränserna | Meddelanden följer valideringens regler |
| LinkedIn-import | Svenska steg, råa fel och otydlig integritetstext | Översatta steg och resultat; skillnad mellan lokal ZIP-bearbetning och uppgifter som sparas på Nolto |
| Säkerhet och kryptering | Svenska fel kunde visas på andra språk; generiska fel kunde dölja en nyckelvarning | Översatta fel som behåller varningens innebörd genom felhanteringen |
| Appbehörigheter | Behörighetsbeskrivningar var hårdkodade på svenska | Samtliga 11 kända behörigheter beskrivs på alla åtta språk |
| Bildhantering, sparknappar och innehållsvarningar | Synliga etiketter och fel låg utanför språkfilerna | Översatta texter för de granskade kontrollerna och felvägarna |

Termer för lösenfras, tvåfaktorsautentisering, reaktioner, kommentarer och följande har samordnats inom respektive språk. Policydokumentens avsedda regler bevaras; upptäckta betydelsefel i översättningar rättas mot källtexten. Det tidigare identitetsintyget i en etikett som enbart känner till en Fediverse-server har också tagits bort.

## Företag och organisationer

Formulär och sökfilter har en gemensam, översatt lista med **20 verksamhetstyper**:

- Näringsliv: företag, startup, aktiebolag, börsnoterat bolag, enskild firma, handelsbolag, kommanditbolag, kooperativ/ekonomisk förening och konsultbolag.
- Offentlig sektor: kommun, region, statlig myndighet, statligt bolag, kommunalt bolag samt förbund/samverkansorgan.
- Utbildning och civilsamhälle: universitet/högskola, folkhögskola, ideell organisation och stiftelse.
- Övrig organisation.

Valet beskriver verksamheten och är inte en kontroll av juridisk bolagsform. `src/lib/companyOptions.ts` är gemensam källa för formulär, filter, kort och sidhuvud. Nya alternativ sparas som stabila identifierare i den befintliga textkolumnen `companies.industry`. Äldre svenska värden och fritext bevaras vid redigering och språkbyte. Ingen databasmigrering behövs.

Storleksfiltret har rättats: 201–500 visas korrekt, 501–1 000 finns som eget val och de största intervallen följer formuläret och lagringen. Formulärets adressregler följer backendens krav på minst tre tecken, bokstav/siffra i ändarna och HTTPS för webbplatsen. Grundandeår tillåts ned till backendens gräns 1000, även i HTML-fältet.

## Felmeddelanden vid användning

`UserFacingError` håller en översättningsnyckel och löser texten när den visas. Ett kvarvarande fel kan därför följa ett språkbyte. Okända databas-, webbläsar- och kryptografifel får ett begripligt kontextmeddelande i de uppdaterade felhanterarna. Förklarande validering och varningar om ändrade meddelandenycklar bevaras.

Detta används bland annat i privata meddelanden, nyckelbackup, bildbearbetning, profilöverföring, publicering och borttagning. Nyckelkontrollernas säkerhetsvillkor och kryptografiska format är oförändrade. Kontaktförslagens gemensamma kontakter och platshänvisningar visas med lokalt översatta hela texter, utan att råa engelska servermeningar behöver visas.

## Verifiering

**38 relevanta tester godkända**, fördelade på åtta testfiler:

- Katalogkontroller: nyckeltäckning, bokstavliga referenser, interpolering, märkning, pluralformer och granskade undantag för delade ord/varumärken. Den definierade inventeringen hittar inga kvarvarande otillåtna hårdkodade JSX-textnoder; detta är inte en inventering av varje möjlig sträng i programmet.
- Riktiga React-komponenter med alla åtta språk: organisationsalternativ och sparvärden, äldre kategorier, språkbyte, filterintervall, adress-/årsvalidering, importresultat, anmälningsdialog och kontoraderingsbekräftelse.
- Språkbyte vid fel, validering av lösenfras och bilder, de faktiska felhanterarna för konversationshämtning, appbehörigheter och villkorens två länkar.
- Kryptering: avsändare/mottagare, fel lösenfras, meddelandebindning, förfalskning och skadad chiffertext.
- Bildutkast: samtidiga uppladdningar, bildbyte och komprimeringsfel. Profilöverföring: mottagaradress, medgivna fält och popupens avsändare.

Den fullständiga testsviten är också godkänd: **120 Node-tester och 58 Deno-tester**. Inloggningsflödets testdubbel har uppdaterats för att använda den riktiga `Trans`-komponenten, med kontroll av båda villkorslänkarna.

Typkontroll, källkontroll, `git diff --check` och produktionsbygge är godkända. Den befintliga byggvarningen om stora JavaScript-paket kvarstår. Testerna använder mockade tjänster och skriver inte till en verklig databas.

```sh
node --experimental-strip-types --test scripts/translations.test.mjs scripts/language-switch.test.mjs scripts/localization-controls.test.mjs scripts/company-address.test.mjs scripts/private-messages.test.mjs scripts/image-draft.test.mjs scripts/runtime-localization.test.mjs scripts/profile-import.test.mjs
npm test
npm run check:source
npm run check:types
npm run build
git diff --check
```

## Avgränsningar

- Ingen språkkatalog återstår att genomläsa. Denna granskning är inte extern modersmålscertifiering.
- Komponentkontroller i jsdom verifierar text och beteende. Pixelbaserad layout, skärmläsarupplevelse och samtliga sidtillstånd i en inloggad produktionsmiljö har inte kontrollerats visuellt.
- Den separata native-appen, användarskapat innehåll, externa tjänsters texter och alla backendgenererade meddelanden ingår inte i webbens kataloggranskning. Tekniska protokollidentifierare och kodexempel kan vara på engelska.
- Äldre katalogdelar har också lästs, men deras existens innebär inte att de används av de nuvarande sidorna. Endast kontrollerat ersatta fragment har rensats bort.
