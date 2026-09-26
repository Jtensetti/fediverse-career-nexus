# Språk- och organisationsgranskning, september 2026

## Omfattning och status

Granskningen utgår från vad användaren kan göra i webbappen: handling, vänteläge, resultat, fel, tomt läge och bekräftelse. Nyckelnamnet eller den engelska formuleringen är inte ensamt facit.

Alla **27 964 textvärden** i de åtta språkfilerna omfattas av katalogkontrollerna. Svenska och engelska har också genomlästs som hela kataloger, grupperade efter identiska textvärden. Oklara funktioner har följts till komponent och vid behov tjänst/lagringsregel. Franska, tyska, nederländska, spanska, japanska och italienska har fått riktad språk- och funktionsgranskning samt översättning av samtliga nya meddelanden. **De sex katalogerna har inte genomlästs mening för mening i sin helhet.** En fullständig språklig slutgranskning av alla åtta språk är därför fortfarande öppen; teknisk nyckeltäckning ska inte beskrivas som bevis på naturligt språk.

| Språk | Textvärden | Ändrade befintliga värden | Tillagda | Borttagna |
| --- | ---: | ---: | ---: | ---: |
| Svenska | 3 499 | 138 | 64 | 25 |
| Engelska | 3 495 | 57 | 64 | 25 |
| Franska | 3 495 | 62 | 64 | 25 |
| Tyska | 3 495 | 56 | 64 | 25 |
| Nederländska | 3 495 | 109 | 64 | 25 |
| Spanska | 3 495 | 161 | 64 | 25 |
| Japanska | 3 495 | 73 | 64 | 25 |
| Italienska | 3 495 | 53 | 64 | 25 |

Antalen avser ändringarna efter PR #84. Svenska har fyra extra textvärden i de auktoritativa juridiska dokumentens struktur. Borttagningarna gäller ersatta textfragment och den gamla, opluraliserade personräknaren.

## Företag och organisationer

Formulär och sökfilter har en gemensam, översatt lista med 20 verksamhetstyper:

- Näringsliv: företag, startup, aktiebolag, börsnoterat bolag, enskild firma, handelsbolag, kommanditbolag, kooperativ/ekonomisk förening och konsultbolag.
- Offentlig sektor: kommun, region, statlig myndighet, statligt bolag, kommunalt bolag samt förbund/samverkansorgan.
- Utbildning och civilsamhälle: universitet/högskola, folkhögskola, ideell organisation och stiftelse.
- Övrig organisation.

Detta är ett beskrivande val av verksamhetstyp, inte en kontroll av juridisk bolagsform. Användaren väljer det alternativ som bäst beskriver verksamheten.

`src/lib/companyOptions.ts` är gemensam källa för formulär, filter, kort och sidhuvud. Nya alternativ sparas som stabila identifierare i den befintliga textkolumnen `companies.industry`. Äldre svenska värden behålls. Äldre fritext visas och sparas oförändrad även när gränssnittets språk ändras. Lagringsfunktionen tillåter redan textvärden; ingen databasmigrering behövs.

Storleksfiltret har rättats: 201–500 visas som 201–500, 501–1 000 finns som eget val och de största intervallen visas med samma gränser som formuläret och databasen. Formulärets adressregler följer backendens krav på minst tre tecken, bokstav/siffra i ändarna och HTTPS för webbplatsen. År före 1800 tillåts nu ned till backendens gräns 1000, med motsvarande gräns i HTML-fältet.

## Rättade språk- och funktionsproblem

| Område | Problem | Ändring |
| --- | --- | --- |
| Företagssida | Framgångstexten sade att en organisation skapats | Beskriver att organisationssidan skapats |
| Företagssida | Tom jobbflik påstod att arbetsgivaren saknar lediga jobb | Säger att inga jobbannonser publicerats här |
| Organisationstyper | Svenska alternativ även i andra språk | Översatta gruppnamn, alternativ och sparade värden i visningen |
| Lön | Feltexten krävde att lägsta lön är strikt lägre | Tillåter lika belopp, precis som valideringen |
| Temaväljare | Tillgänglighetsnamnet sade att knappen växlar mörkt läge | Beskriver att användaren väljer färgtema |
| Fediverse-etikett | Servernamnet användes som intyg på personens identitet | Visar vilket konto/server det gäller, utan identitetsintyg |
| Notiser, sökning, profil, session och moderering | Meningar byggdes av översatta fragment runt namn/antal | Hela meddelanden med namngivna interpoleringsvärden |
| Moderering | Hårdkodade svenska resultat och interna statusvärden | Översatta statusmeddelanden; sparad regel beskrivs inte alltid som blockering |
| Inloggning och återställning | Några fel visades alltid på svenska | Översättningar för alla åtta språk |
| LinkedIn-import | Svenska statusord och böjningar i samtliga språk | Kompletta översatta totalsummor och statusetiketter |
| LinkedIn-import | Integritetstexten gjorde inte skillnad på ZIP-filen och importerade uppgifter | Förklarar lokal filbearbetning och att valda uppgifter sparas på Nolto |
| Reaktioner | Olika namn för samma reaktion på artiklar och inlägg | Gemensam terminologi inom varje språk |
| Nederländska | Blandat tilltal och ordagranna uttryck om kontakter/anställning | Samordnat användartilltal och tydligare funktionsbeskrivningar |
| Spanska | Blandat tilltal i centrala kontoflöden; följarlista förväxlades med konton man följer | Rättade kontoflöden och instruktion för import av följda konton |
| Japanska | Blandade termer för återställning, rekommendationer och applänkning | Naturligare, mer enhetliga funktionsord |
| Svenska | Bland annat ”kurerade”, ”hälsodata”, ”tysta ord” och ”lämna sammanhang” | Bland annat ”utvalda”, ”driftinformation”, ”ord att filtrera bort” och ”lämna en förklaring” |

Äldre oanvända svenska specialetiketter för verifierade offentliga organisationer har tagits bort ur `VerificationBadge`. Komponentens befintliga, översatta verifieringsstatus används fortsatt för anställningsuppgifter. Den nederländska integritetstextens felöversättning av ”page exit” har korrigerats till att lämna sidan; policyns innebörd har inte ändrats.

## Kvarvarande fynd och avgränsningar

1. **Full genomläsning av sex språk.** Fortsätt med franska, tyska, nederländska, spanska, japanska och italienska, funktion för funktion. Bland annat spanskans tilltal behöver kontrolleras även utanför de rättade flödena. Granskningen här är inte en extern modersmålsgranskning.
2. **Meddelanden utanför språkfilerna.** Det finns fortfarande svenska `Error`-texter i exempelvis `src/lib/privateMessages.ts`, `src/services/messaging/inboxKeysService.ts`, bildbearbetning och profilimport. Några förs vidare till gränssnittet, andra ersätts av ett lokalt meddelande. De behöver granskas tillsammans med respektive felhanterare så att exempelvis varningar om ändrade krypteringsnycklar behåller sin exakta betydelse. Att alla katalognycklar är översatta räcker inte för att förklara detta färdigt.
3. **Äldre oanvända katalogdelar.** Exempelvis delar av `openSource`, `featureShowcase`, `legal` och gamla notisfragment finns kvar. De är granskade som katalogtext men ska inte förväxlas med nuvarande sidors `ui`- och `legalDocs`-texter. Bred bortstädning kräver kontroll av dynamiska nycklar och eventuella andra konsumenter.
4. **Visuell granskning.** De ändrade kontrollerna har körts som riktiga React-komponenter i jsdom. Detta verifierar beteende och text, inte pixelbaserad layout, skärmläsarupplevelse eller varje sidtillstånd i en inloggad produktionsmiljö. Långa åtgärdsknappar får radbrytas.
5. **Separat mobilapp och backend.** Den separata native-appen och alla meddelanden som genereras av backend ingår inte i webbens katalogkontroller.

## Verifiering

- Katalogkontroller: nycklar, bokstavliga referenser, interpolering, pluralformer, engelska kopior och hårdkodad JSX.
- Riktiga komponenter med alla åtta språk och mockade tjänster: organisationsval/sparvärden, språkbyte med äldre värden, filterintervall, adress-/årsvalidering, importresultat, anmälningsdialog och kontoraderingsbekräftelse.
- Typkontroll, källkontroll och produktionsbygge.

Tester skriver inte till en verklig databas, skickar inga anmälningar och raderar inga konton.
