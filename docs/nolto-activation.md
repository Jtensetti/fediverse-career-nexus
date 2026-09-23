# Aktivera Noltos domän och federering

Kontrollerat 23 september 2026. Webbappen och federeringen ligger nu på `nolto.social`; `www.nolto.social` omdirigerar dit. WebFinger gör `@namn@nolto.social` upptäckbart; inloggning i en Mastodon-app kräver dessutom klient-API:t och OAuth-servern.

## Aktuell drift

- Cloudflare-workern `nolto-federation`, version `6604260d-58eb-4f31-b56f-a629d586ba83`, är driftsatt med sju Worker Routes enligt `deploy/wrangler.jsonc`. [PR 77](https://github.com/Jtensetti/fediverse-career-nexus/pull/77) är mergad som `bb5c0d474a588af531a67bdf8d1c0e67c4935f80`.
- Namnservrarna är `corey.ns.cloudflare.com` och `dawn.ns.cloudflare.com`. Roten använder en proxad CNAME till `fediverse-career-newest.lovable.app`; TLS-läget är **Full (strict)**. Hemsidan svarar 200.
- `check-gateway` klarar 8/8 kontroller och `check-federation` klarar publik upptäckt, actor och samlingar för `jonatan_tensetti@nolto.social`. Signerade utbyten med en oberoende Mastodon-server återstår att verifiera.
- `www` har proxad A-post `192.0.2.1` och Cloudflare-regeln **WWW to nolto.social** ger 308 till roten med bevarad sökväg och frågesträng. Detta är verifierat över både HTTP och HTTPS.
- Cloudflares DNSSEC-signering är aktiverad. DS med key tag `2371`, algoritm `13`, digesttyp `2` och digest `88CB3066E95EE5EFE31545CF9F419075C154A7051DFE1511EA3C8B18AD043071` är tillagd hos One.com. Matchande DS och validerade A-svar med AD-flagga verifierades via Google och Cloudflare den 23 september kl. 06:46 UTC.
- Mastodon-klientens API/OAuth är avstängda och svarar 503. Migration `20260922184945` och matchande funktioner är driftsatta; sju tabeller, två invoker-vyer, två ID-triggers och städnings-RPC är verifierade. Operatörspiloten nedan är förberedd i koden, ännu inte aktiverad. `ATPROTO_DID` är osatt och ingen PDS är driftsatt.
- Supabase-kopplingen saknar administrativ åtkomst till backendprojektet. Lovable-krediterna är påfyllda och den avstängda backenddriftsättningen har genomförts via Lovable; läsning och databasfrågor fungerar.

Budgeten för en egen PDS är noll. Ingen betald server har beställts eller planeras inom denna driftsättning.

## Två konfigurationer som måste hållas isär

| Inställning | Webbapp på www, Worker på roten | Webbapp och federation på samma domän |
| --- | --- | --- |
| Lovables primära webbdomän | `www.nolto.social` | `nolto.social` |
| Backend `SITE_URL` och Auth Site URL | `https://www.nolto.social` | `https://nolto.social` |
| Backend `FEDERATION_DOMAIN` | `nolto.social` | `nolto.social` |
| Frontend `VITE_FEDERATION_DOMAIN` | `nolto.social` (standardvärde) | `nolto.social` (standardvärde) |
| Worker-konfiguration | `deploy/wrangler.split.jsonc` | `deploy/wrangler.jsonc` |
| Cloudflare-koppling | Custom Domain på `nolto.social` | Worker Routes på en proxad `nolto.social` |
| Vanliga sidbesök på roten | 302 till samma sökväg på www | Fortsätter till befintlig webbserver |
| WebFinger, ActivityPub, klient-API och tokenutbyte | Proxy direkt till backend, utan omdirigering | Proxy direkt till backend, utan omdirigering |

Distribuera bara **en** av Worker-konfigurationerna. `fetch(request)` som vidarebefordran till en befintlig origin hör till Route-läget. En Custom Domain är själv origin och använder i stället en uttrycklig omdirigering för webbtrafik. POST-data för vanliga webbsidor omdirigeras inte till en annan origin.

## Alternativ: flytta webbappen till www (inte aktivt)

Följ bara detta om webbappen senare ska flyttas till www. Nuvarande drift använder samma-domän-läget. Någon proxy framför Lovables www-domän behövs inte i split-läget.

1. **Förbered DNS-kontot.** Cloudflare-kontot måste kontrollera zonen `nolto.social` för att kunna koppla workern till den. Om DNS fortfarande finns hos One.com behöver befintliga DNS-poster, inklusive e-postens poster, först föras över och kontrolleras. Använd namnservrarna som Cloudflare visar för just denna zon; registreringen av domänen kan ligga kvar hos One.com. Följ leverantörernas DNSSEC-instruktioner vid delegeringen.
2. **Gör www till webbappens primära domän i Lovable.** Ersätt då www-postens nuvarande redirectkoppling och stäng av Cloudflare-regeln **WWW to nolto.social**. I projektets **Settings → Domains**, behåll/koppla `www.nolto.social` med de DNS-poster Lovable faktiskt visar. Använd vanlig direktkoppling för www (DNS only om posten hanteras av Cloudflare) och välj **Set as primary** för www. Kontrollera att `https://www.nolto.social/` och `/auth` ger appen utan en omdirigering till roten. Motsatta omdirigeringar skapar en loop.
3. **Samordna inloggningens ursprung.** Sätt backendens `SITE_URL` och Auths Site URL till `https://www.nolto.social`. Uppdatera även `public/oauth-client-metadata.json` så att client-ID och callback använder www. Kontrollera registrerade callback-adresser för de inloggningsmetoder som används. Google/Apple-brokern `/~oauth/*`, Bluesky-callback `/auth/atproto/callback`, social callback `/auth/social/callback`, Mastodon-callback `/auth/callback` och godkännandesidan `/oauth/authorize` ska öppnas på www. Behåll `FEDERATION_DOMAIN=nolto.social`. Redan öppnade inloggningsförsök på den gamla originen måste startas om på www; sessionslagring flyttas inte mellan domäner.
4. **Driftsätt split-konfigurationen i Cloudflare.** Kontrollera eventuell befintlig root-CNAME eller gammal Worker Route innan en Custom Domain kopplas. Cloudflare kan inte lägga en Custom Domain ovanpå en befintlig CNAME. Följ dess domändialog och ersätt endast root-kopplingen som ska tas över. Låt www- och e-postposterna vara kvar. Konfigurationen innehåller endast publika adresser, ingen backendhemlighet:

   ```sh
   npm --prefix deploy ci
   npm --prefix deploy run check
   npm --prefix deploy run deploy:split
   ```

5. **Verifiera trafiken före aktivering av klient-API:t.** Kör från rätt Git-revision:

   ```sh
   node scripts/check-gateway.mjs jonatan_tensetti@nolto.social https://www.nolto.social
   node scripts/check-federation.mjs jonatan_tensetti@nolto.social
   ```

   Första kontrollen visar alla fel, inklusive en fungerande backend bakom en trasig offentlig proxy, redirectloopar och fel origin för profilknappen. Den andra verifierar även offentliga samlingar och nyckelägarskap. Kontrollerna skapar inga konton eller inlägg. Signerad kommunikation med en annan instans måste fortfarande provas separat.
6. **Kopiera rekryteringsknappen från www.** `/integrations` genererar script-adressen från webbappens aktuella origin. Äldre inklistringar som laddar scriptet från roten behöver uppdateras om webbappen flyttas till www. Popupens avsändarorigin måste fortfarande matcha exakt; lossa inte den kontrollen för att få en omdirigering att fungera.

Behåll den tidigare DNS-konfigurationen för en kontrollerad återgång. Om webbkontrollerna misslyckas, återställ den tidigare webbkopplingen och motsvarande `SITE_URL` tillsammans. Ändra inte publicerade actor-ID:n eller federationens domän som felsökningsåtgärd.

## Aktivt upplägg: allt på nolto.social

Lovables officiella dokumentation beskriver **Uses Cloudflare or similar proxy** under **Advanced** i domänanslutningen. Då används den CNAME-adress Lovable visar och en proxad Cloudflare-post, tillsammans med `deploy/wrangler.jsonc`.

Denna driftsättning använder den proxade CNAME-kopplingen som anges ovan. Behåll webbappens `SITE_URL=https://nolto.social` och federationens `FEDERATION_DOMAIN=nolto.social`.

## Bluesky och egna Nolto-konton

Det önskade upplägget är ett eget konto per användare med adress `@namn.nolto.social`, skapat vid registrering på Nolto och användbart i Blueskys app. Det kräver en riktig PDS med konton och repositories. Ingen sådan server eller automatisk kontoprovisionering är driftsatt. Arbetet har inte gått vidare med betald hosting eftersom budgeten är noll. Befintlig Bluesky-inloggning/kontokoppling är en separat möjlighet för redan existerande konton.

### Valfri verifiering av ett befintligt kontos rotdomän

Workern kan verifiera `nolto.social` som handle för ett **befintligt** Bluesky-konto. Sätt den publika variabeln `ATPROTO_DID` i den valda JSONC-konfigurationen till kontots verkliga DID först efter ägarens uttryckliga val och verifierad kontroll över kontot. Standardvärdet är tomt: `/.well-known/atproto-did` svarar då 404. Ange inga exempelidentifierare i produktion. Ett giltigt värde ger GET/HEAD 200 med enbart DID i `text/plain`; andra värdar och okända sökvägsvarianter får ingen identitet.

Ägaren slutför därefter **Change handle → I have my own domain** i Bluesky med `nolto.social`. Kontrollera både `https://nolto.social/.well-known/atproto-did` och att DID-dokumentets `alsoKnownAs` innehåller `at://nolto.social`. Kontrollera även att DNS inte har en motstridig `_atproto.nolto.social`-TXT-post. DID måste vara `did:plc:` med 24 gemena base32-tecken eller ett giltigt publikt `did:web:`-värdnamn utan port eller sökväg. Se [AT Protocols handle-specifikation](https://atproto.com/specs/handle) och [DID-specifikation](https://atproto.com/specs/did).

`ATPROTO_DID` är fortfarande osatt. Detta valfria alternativ skapar inget Bluesky-konto, ingen PDS och ingen synkronisering av inlägg; det uppfyller inte önskemålet om egna konton per användare. Mastodon-adresserna `@namn@nolto.social` använder separat WebFinger/ActivityPub. Hemsidan ligger kvar på roten med Route-konfigurationen.

Workerverktygen installeras separat med `npm --prefix deploy ci`; `npm --prefix deploy run check` gör dry-run för båda konfigurationerna utan driftsättning. Kör sedan `npm --prefix deploy run deploy` för samma domän eller `deploy:split` för www-alternativet. Välj bara en konfiguration. Invocation-loggar och tracing är avstängda, och frågesträngar maskeras för att undvika att OAuth-parametrar sparas i Worker-loggar.

## Backend och Mastodon-appar

Följ [mastodon-client-access.md](mastodon-client-access.md) för migration, funktioner och acceptanstester. Driftsätt först med `MASTODON_CLIENT_ENABLED` frånvarande eller `false` och `MASTODON_CLIENT_PILOT_USER_IDS` tom: upptäckt och kontooperationer ska då svara 503 utan databasåtkomst. Befintliga behörigheter kan fortfarande listas och återkallas med ordinarie autentisering. `privacy-maintenance` behöver den nya migrationen innan den version som anropar `purge_mastodon_metadata` driftsätts.

När migration och backend är verifierade, testa helst i en isolerad miljö. Om sådan saknas kan en samtyckande operatör provas via `MASTODON_CLIENT_PILOT_USER_IDS`: en kommaseparerad lista med högst 100 riktiga Auth-UUID:n medan fullflaggan förblir `false`. Pilotens läsningar och skrivningar kräver en tillåten användartoken; endast upptäckt, appregistrering och förhandsvisning av samtyckesbegäran är publika. Felaktig lista stänger åtkomst. Borttagning ur listan blockerar gamla koder och tokens vid följande anrop, men redan pågående åtgärder kan slutföras. Pilotinlägg och sociala åtgärder är verkliga. Se klientguiden för hela kontraktet. Testa riktiga klienter och kör:

```sh
node scripts/check-mastodon.mjs https://nolto.social
```

Kommandot ovan gäller den aktiva samma-domän-konfigurationen. Vid en framtida flytt till www läggs `https://www.nolto.social` till som andra argument. Slå inte på produktionsflaggan förrän inloggning, godkännande, återkallning och faktiska klientoperationer har verifierats. Ett 410-svar betyder den gamla stubben; det avsiktliga 503-svaret från den nya funktionen betyder att stödet fortfarande är avstängt.

## Det som kräver ägarens medverkan

1. Backendåtkomst för att driftsätta rätt funktioner och sätta klient-API:ts flagga när dess migration och tester är klara. Domänens Cloudflare-konfiguration är redan genomförd. Dela inga lösenord eller API-nycklar i chatten.
2. En riktig inloggning med önskad leverantör och senare ett test från en Mastodon-app. Verktygstester kan inte verifiera ett personligt Apple-/Google-/Bluesky-godkännande eller verklig appkompatibilitet.

Ett eget Nolto-konto som kan logga in direkt i Blueskys app kräver fortfarande AT Protocol PDS och kontoprovisionering. Domänkopplingen ensam skapar inte detta och är inte en fullständig brygga mellan protokollen.

Källor, kontrollerade 2026-09-23: [Lovables domän- och proxylägen](https://docs.lovable.dev/features/custom-domain#advanced-use-a-cdn-or-reverse-proxy), [Cloudflare Worker Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/), [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
