# Moderering och Bluesky-inloggning

## Textkontroll

`assess_public_text` ger `allow`, `warn` eller `review`. Kontrollen körs i Noltos databas och sparar inte förhandskontrollerade utkast. Den använder begränsade svenska och engelska regler för personangrepp, direkta hot och uppmaningar till gruppvåld. Kritik, oenighet och svordomar i sig stoppas inte. Tydliga citat kan ge en påminnelse men hålls inte automatiskt undan. Detta kan utnyttjas för att undvika kontrollen; befintliga anmälningsfunktioner och mänsklig moderering behövs. Bilder och andra språk bedöms inte.

Skrivdialogen låter författaren redigera, gå vidare efter en påminnelse eller skicka innehåll till granskning. Databastriggers upprepar bedömningen för inlägg, svar, äldre kommentarer och publicerade artiklar, även vid direkta API-anrop. Privata meddelanden och privata artikelutkast omfattas inte.

Innehåll som väntar eller har avslagits kan läsas av författaren. Moderatorer får text och beslutshistorik genom särskilda funktioner efter sessions- och rollkontroll. Det visas inte i vanliga flöden, publika filer, API-svar, notiser eller ActivityPub-utskick. Godkännande kräver en annan moderator än författaren, en motivering och samma innehållsversion som granskades. Författaren kan lämna sammanhang eller begära omprövning i `/my-reviews`. Sammanhang och överklagande är separata åtgärder, vardera en gång per version.

En ändring av publicerat innehåll bedöms på nytt. Om den hålls undan avbryts väntande utskick och ett tidigare publicerat federationsobjekt återkallas. Mottagande servrar styr sina egna kopior och kan hantera återpublicering efter en Delete olika. Detta behöver provas mot de servrar installationen federerar med.

Beslutsanteckningar lagrar ingen extra kopia av inlägget. De följer med i författarens dataexport och tas bort när innehållet raderas permanent. En raderingsbegäran går genom det befintliga 30-dagarsflödet. Den separata hanteringen av innehåll som anmäldes före radering gäller fortfarande.

Guiden på `/conversation-guide` är inspirerad av [CNVC](https://www.cnvc.org/learn). Den är Noltos egen text och innebär ingen anslutning eller certifiering.

## AT Protocol

Inloggningen använder [det officiella OAuth-klientbiblioteket](https://github.com/bluesky-social/atproto/tree/main/packages/oauth/oauth-client) och [AT Protocols OAuth-specifikation](https://atproto.com/specs/oauth). Behörigheten är enbart `atproto`; ingen läsning av följlistor eller publicering i Bluesky begärs. Det är inte en AT Protocol-server eller en brygga för inlägg.

- PAR, PKCE S256, DPoP och kontroll av DID/PDS/utfärdare sköts av biblioteket.
- En egen transport stoppar omdirigeringar och privata nätadresser och låser anslutningen till den kontrollerade DNS-adressen med bibehållen TLS-värd.
- Tillfälligt OAuth-tillstånd krypteras, binds till en slumpnyckel i samma webbläsares `sessionStorage`, gäller i tio minuter och konsumeras atomiskt. Ett bakgrundsjobb tar bort utgånget tillstånd var tionde minut.
- DID är kontonyckeln. Ändrade handles byter inte Nolto-konto. E-post används aldrig för att automatiskt slå samman konton.
- Koppling till ett befintligt konto kräver den ursprungliga, verifierade Nolto-sessionen i både start och återkomst. Den ersätter inte sessionen eller dess MFA.
- För nya konton används en slumpad intern Auth-adress utan levererbar brevlåda; inget verkligt e-postkrav hämtas från Bluesky. Återställning via e-post kräver att användaren först lägger till en egen fungerande adress. Förlust av både Bluesky och annan inloggning kräver operatörshjälp.
- Åtkomsttoken hålls bara i anropets minne. Klienten försöker återkalla den efter identifiering och kastar därefter sina token. Nolto sparar DID-kopplingen tills kontot raderas permanent.

## Driftsättning

1. Prova och applicera migreringarna `20260922141011`, `20260922142915` och `20260922150131` på rätt backend. Registrera dem i migreringshistoriken.
2. Driftsätt `atproto-auth`, `federation` och `export-user-data` från samma granskade revision, med deras delade moduler. Funktionen `atproto-auth` måste ha `verify_jwt=false`; den validerar OAuth och kräver själv session vid kontokoppling.
3. Behåll den befintliga `TOKEN_ENCRYPTION_KEY`. `SITE_URL` måste vara webbappens verkliga HTTPS-origin utan avslutande snedstreck. Byt inte nyckeln för att aktivera Bluesky.
4. Kontrollera att `${SITE_URL}/oauth-client-metadata.json` ger HTTP 200 och rätt JSON utan omdirigering. `client_id` ska vara just den URL:en. Metadatafilen ligger bland webbappens statiska filer och behöver ingen proxy till backend. Vid egen drift måste `public/oauth-client-metadata.json` använda installationens `SITE_URL` i stället för Noltos domän. Återkomsten `/auth/atproto/callback` måste laddas på samma origin där inloggningen startade.
5. Kontrollera stödet för `Deno.createHttpClient` med TCP-transport i den driftsatta miljön och att DNS/HTTPS-anrop fungerar mot en riktig AT Protocol-leverantör. Kontrollerna får inte kringgås för att få en lyckad inloggning.
6. Sätt `ATPROTO_AUTH_ENABLED=true` först när backend och domänrutterna är verifierade. Före detta visas ingen Bluesky-knapp på inloggningssidan. GET på funktionen visar endast beredskap och webbplatsens origin, inga hemligheter.
7. Prova avbruten inloggning, nytt konto, återkommande konto, befintlig kontokoppling, handle-byte, MFA och spärrat/raderat konto med samtyckande testkonton. Kontrollera att tillfälliga tillstånd gallras. Stäng funktionen med samma flagga om leverantörstesterna misslyckas.

Isolerade tester kör den riktiga OAuth-klienten mot en lokal testdubbel av leverantören, inklusive nonce-utmaning, fel webbläsare, återspelning och falsk utfärdare/identitet. De bevisar inte att värdmiljön eller en extern leverantör fungerar.
