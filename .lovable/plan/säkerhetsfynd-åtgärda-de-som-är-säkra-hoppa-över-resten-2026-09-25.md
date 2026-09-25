# Säkerhetsfynd: åtgärda de som är säkra, hoppa över resten

Sju allvarliga fynd hittades. Fyra kan åtgärdas utan att något i appen ändras. Tre skulle påverka hur appen fungerar, så de åtgärdas inte (enligt din instruktion).

## Åtgärdas (ingen synlig förändring)

1. **Organisationer – ändringar sparas utan kontroll.** Regeln kontrollerar redan vem som får redigera, men inte vad den sparade raden blir. Samma kontroll (ägare/admin för organisationen) läggs även på det som sparas. Ägare och admins kan redigera precis som i dag.
2. **Blockerade servrar – alla kan läsa listan.** Listan läses bara på moderatorsidan (admins har redan egen behörighet) och av serverfunktionerna (som har full åtkomst). Den öppna läsregeln tas bort.
3. **Blockerade konton – alla kan läsa listan.** Samma som ovan.
4. **Adressuppslagscache (webfinger) – alla kan läsa.** Används bara av serverfunktionerna, aldrig av sidan i webbläsaren. Den öppna läsregeln tas bort.

## Åtgärdas inte (skulle ändra hur appen fungerar)

5. **Följförfrågningar till valfri server.** Att skicka en följförfrågan till den server användaren väljer är själva federationen. Att begränsa det skulle göra att man inte kan följa folk på Mastodon m.fl. Befintliga skydd (inloggning, blockeringslistor, kontroller av offentlig adress) finns kvar.
6. **Synlighetsinställningar för profilsektioner.** Andra inloggade läser dessa för att veta vad som ska visas på en profil. Döljs de faller sidan tillbaka till "visas för alla" – det skulle kunna visa fel.
7. **Evenemangsanmälningar.** Antal deltagare och deltagarlistor på evenemang bygger på att dessa kan läsas. Att stänga det skulle ge 0 deltagare för besökare.

Dessa tre markeras med en förklaring i säkerhetsöversikten (inte bortstädade utan motivering), så de kan tas upp separat senare.

## Tekniska detaljer

- En versionerad migration:
  - `companies` "Admin update": `WITH CHECK` = samma predikat som `USING` (`has_company_role(auth.uid(), id, owner/admin)`).
  - Drop `"Anyone can view blocked domains"`, `"Anyone can view blocked actors"`, `"Anyone can read webfinger cache"`. Admin-ALL-policyerna, RESTRICTIVE "Verified live session" och service-role-åtkomst lämnas orörda. Inga grants breddas.
- Kontroll: klientkod läser `blocked_*` endast i `federationService` (adminvy); `webfinger_cache` saknar klientanrop. Edge functions (send-follow, inbox, federation, moderation) använder service role.
- Efteråt: databasregressionerna, tsgo, Node/Deno-sviterna, test av moderatorsidan och organisationsredigering, ny säkerhetsskanning. Uppstår något fel på ett fynd backas just den ändringen.
- Ingen frontendändring, ingen publicering.
