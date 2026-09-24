# Nolto – verklig användarresa 2026-09-23

Utgångspunkt: produktion `https://nolto.social`, kodbas `deab10f51a308a9a69fe13cafffa43dc5f150ed5`. Testprofil: Nolto UX-test, föreslaget användarnamn `noltouxtest`. Registreringsuppgifter lämnas av ägaren direkt i webbläsaren.

Observationer skiljs från kodfynd. En åtgärd räknas som verifierad först efter relevant kontroll och, där det krävs, ett nytt test i den publicerade appen.

| ID | Källa / steg | Fynd | Konsekvens | Åtgärd / status |
| --- | --- | --- | --- | --- |
| UX-01 | Observerat: startsida → Gå med → registrering, 1032×684 | Registreringsformuläret ligger under en stor introduktion, Mastodon, Google/Apple och Bluesky. Första skärmen visar inget formulär för att skapa konto. | Primär uppgift och nästa steg är svåra att hitta. | Ska göra e-postregistrering till primär vy på `/auth/signup`, alternativa metoder sekundära. |
| UX-02 | Observerat: registrering | Mastodon-inloggning heter “Logga in med din organisation” och “organisationskonto”. | Ger fel bild av kontotypen och kräver protokollkunskap för att förstå. | Tydligt namn: Mastodon. |
| UX-03 | Observerat: registrering | “Username (optional)” och engelska hjälptexter i den svenska vyn. | Inkonsekvent språk och oklar betydelse. | Svenska etiketter och feltexter. |
| UX-04 | Kodfynd i `Auth.tsx` efter UX-03 | Användarnamn märks valfritt men valideras alltid som minst tre tecken. | En användare som följer formuläret kan ändå inte registrera sig. | Gör obligatoriskt enligt backendkontrakt, tydlig validering. |
| UX-05 | Observerat: registrering | Bindestreck i `nolto-ux-test` tas bort tyst och blir `noltouxtest`. | Användaren får ett annat namn utan förklaring. | Visa teckenregler och fel i anslutning till fältet. |
| UX-06 | Användarrapport, kodgranskning pågår | Radera i flödet navigerar till inlägget och kräver ett nytt försök. | Förlorad kontext, otrygg radering. | Avgränsad analys/fix pågår; verkligt återtest väntar på konto. |

Positivt hittills: startsidan ger tydliga val mellan att titta runt och gå med. Det offentliga flödet går att läsa utan konto. Formuläret visar en förhandsvisning av vald Nolto-adress.

Återstår i den faktiska resan: registrera/verifiera e-post, onboarding, profil, sökning/kontakt, inlägg + redigera/radera, artikel, event, jobb, organisation, tomma vyer/felhantering och mobil layout. Testinnehåll ska märkas tydligt och inventeras här för städning.

## Genomfört i produktion

- Användaren registrerade testkontot och loggade in. Första steget i onboarding visade `auth.username` som rånyckel. Profil och tredje steget fungerade. Federation avmarkerades för testkontot så testmaterialet inte skickas vidare till externa servrar.
- Profilrubrik, bio, plats Sverige och Noltos befintliga maskot som profilbild sparades. En tydligt märkt testerfarenhet och kompetensen Användbarhetstestning sparades och verifierades på profilen. Skills gav engelsk toast. ProfileEdit behöll sidtiteln Feed. Oetiketterade CV-kontroller och `visibility.whoCanSee` observerades.
- Sökning “Jonatan Tensetti” gav ingen träff; “Tensetti” hittade rätt profil med presentation Creator of Nolto. Enter startade inte sökningen. Kontaktförfrågan skickades till `@jonatan_tensetti`; knappen blev “Väntar”.
- Inlägg skapades och redigerades. Från `/feed` navigerade både Redigera och Ta bort inlägg till `/post/...`; redigeringsdialogen blinkade fram och avmonterades. Redigering på detaljsidan fungerade. Radering är ännu inte genomförd.
- Användaren kommenterade “Det funkar!” på testinlägget. Flödet visar kommentaren men saknar Svara-knapp för just kommentaren, bara Reagera och bokmärke. Direkt svar från flödet ska tillkomma och verifieras efter publicering.
- Artikel sparades som utkast, öppnades för redigering, publicerades och verifierades i läsvyn. Problemen: tekniskt “Slug” som primärt fält före innehållet, engelska toolbar-knappar och My Articles/New Article, namnlösa åtgärdsknappar, engelskt datum, inget Redigera på egen publicerad artikel, publiceringsknappen säger Spara/Uppdatera artikel oavsett publik. Redigerarsidan behåller föregående sidtitel. Innehållsskrivytan saknar textbox-roll/etikett.
- Det första flödet visar `feed.nolto`/`feed.fediverse`, generisk tomstatus utan relevanta CTA. “Dela ditt första inlägg” ligger kvar efter publicering och länkar till samma sida utan att öppna skrivytan. Profilkomplettering “Lägg till utbildning” öppnar Grundinfo.

## Testobjekt att återtesta och städa

- Testprofil `noltouxtest`, ID `c566724e-998a-4493-a6ff-10189b8bb4a4`.
- Kontakt: `jonatan_tensetti`, ID `8d1529af-7f12-41e3-a3a7-8208791b01a6`.
- Inlägg `9157833c-b004-4a0c-b289-6648bf1c7d8d`, innehåller användarens verkliga testkommentar `69489a40-4601-4ccc-b1f4-212f9292db84` (“Det funkar!”). Beakta den vid städning.
- Publicerad testartikel `7c0db9e1-d385-40a7-9aca-326e9deef684`, slug `ux-test-en-tydligare-anvndarresa-i-nolto`.

Registreringens mejlleverans och lösenordsinmatning utfördes av användaren och är inte självständigt verifierad av agenten. Ingen permanent radering har ännu gjorts i denna UX-resa.
