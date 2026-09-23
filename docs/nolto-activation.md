# Aktivera Noltos domän och federering

Kontrollerat 23 september 2026. Adressen `@namn@nolto.social` ska vara stabil även om webbappen ligger på `www.nolto.social`. WebFinger gör kontot upptäckbart; Mastodon-apparnas inloggning kräver dessutom klient-API:t och OAuth-servern.

## Det som blockerar nu

- Backendens WebFinger svarar med korrekt JRD JSON för `jonatan_tensetti@nolto.social`.
- Domänens WebFinger svarar 404. Den kanoniska actor-adressen ger webbappens HTML.
- `www.nolto.social` omdirigerar till rotdomänen. Lovable rapporterar rotdomänen som primär.
- DNS använder One.coms namnservrar och pekar direkt mot Lovables webbserver. En Cloudflare-proxy är inte aktiv i den observerade trafikvägen.
- Supabase-kopplingen saknar åtkomst till backendprojektet. Lovable-kopplingen kan läsa databasen och svarar åter på förfrågningar; det tidigare stoppet för krediter ska inte antas gälla utan en aktuell kontroll.

Detta beskriver dagens konfiguration. Det fastställer inte exakt varför ett tidigare försök misslyckades.

## Två konfigurationer som måste hållas isär

| Inställning | Webbapp på www, Worker på roten | Webbapp och federation på samma domän |
| --- | --- | --- |
| Lovables primära webbdomän | `www.nolto.social` | `nolto.social` |
| Backend `SITE_URL` och Auth Site URL | `https://www.nolto.social` | `https://nolto.social` |
| Backend `FEDERATION_DOMAIN` | `nolto.social` | `nolto.social` |
| Frontend `VITE_FEDERATION_DOMAIN` | `nolto.social` (standardvärde) | `nolto.social` (standardvärde) |
| Worker-konfiguration | `deploy/wrangler.split.toml` | `deploy/wrangler.toml` |
| Cloudflare-koppling | Custom Domain på `nolto.social` | Worker Routes på en proxad `nolto.social` |
| Vanliga sidbesök på roten | 302 till samma sökväg på www | Fortsätter till befintlig webbserver |
| WebFinger, ActivityPub, klient-API och tokenutbyte | Proxy direkt till backend, utan omdirigering | Proxy direkt till backend, utan omdirigering |

Distribuera bara **en** av Worker-konfigurationerna. `fetch(request)` som vidarebefordran till en befintlig origin hör till Route-läget. En Custom Domain är själv origin och använder i stället en uttrycklig omdirigering för webbtrafik. POST-data för vanliga webbsidor omdirigeras inte till en annan origin.

## Gör klart upplägget med www och separat rotdomän

Detta bygger vidare på upplägget där Lovable bara serverar webbappen på www. Någon proxy framför Lovables www-domän behövs inte.

1. **Förbered DNS-kontot.** Cloudflare-kontot måste kontrollera zonen `nolto.social` för att kunna koppla workern till den. Om DNS fortfarande finns hos One.com behöver befintliga DNS-poster, inklusive e-postens poster, först föras över och kontrolleras. Använd namnservrarna som Cloudflare visar för just denna zon; registreringen av domänen kan ligga kvar hos One.com. Följ leverantörernas DNSSEC-instruktioner vid delegeringen.
2. **Gör www till webbappens primära domän i Lovable.** I projektets **Settings → Domains**, behåll/koppla `www.nolto.social` med de DNS-poster Lovable faktiskt visar. Använd vanlig direktkoppling för www (DNS only om posten hanteras av Cloudflare) och välj **Set as primary** för www. Kontrollera att `https://www.nolto.social/` och `/auth` ger appen utan en omdirigering till roten. En root → www-redirect i workern och en www → root-redirect i Lovable skapar en loop.
3. **Samordna inloggningens ursprung.** Sätt backendens `SITE_URL` och Auths Site URL till `https://www.nolto.social`. Kontrollera registrerade callback-adresser för de inloggningsmetoder som används. Google/Apple-brokern `/~oauth/*`, Bluesky-callback `/auth/atproto/callback`, social callback `/auth/social/callback`, Mastodon-callback `/auth/callback` och godkännandesidan `/oauth/authorize` ska öppnas på www. Behåll `FEDERATION_DOMAIN=nolto.social`. Redan öppnade inloggningsförsök på den gamla originen måste startas om på www; sessionslagring flyttas inte mellan domäner.
4. **Driftsätt split-konfigurationen i Cloudflare.** Kontrollera eventuell befintlig root-CNAME eller gammal Worker Route innan en Custom Domain kopplas. Cloudflare kan inte lägga en Custom Domain ovanpå en befintlig CNAME. Följ dess domändialog och ersätt endast root-kopplingen som ska tas över. Låt www- och e-postposterna vara kvar. Konfigurationen innehåller endast publika adresser, ingen backendhemlighet:

   ```sh
   npx wrangler deploy --config deploy/wrangler.split.toml
   ```

5. **Verifiera trafiken före aktivering av klient-API:t.** Kör från rätt Git-revision:

   ```sh
   node scripts/check-gateway.mjs jonatan_tensetti@nolto.social https://www.nolto.social
   node scripts/check-federation.mjs jonatan_tensetti@nolto.social
   ```

   Första kontrollen visar alla fel, inklusive en fungerande backend bakom en trasig offentlig proxy, redirectloopar och fel origin för profilknappen. Den andra verifierar även offentliga samlingar och nyckelägarskap. Kontrollerna skapar inga konton eller inlägg. Signerad kommunikation med en annan instans måste fortfarande provas separat.
6. **Kopiera rekryteringsknappen från www.** `/integrations` genererar script-adressen från webbappens aktuella origin. Äldre inklistringar som laddar scriptet från roten behöver uppdateras om webbappen flyttas till www. Popupens avsändarorigin måste fortfarande matcha exakt; lossa inte den kontrollen för att få en omdirigering att fungera.

Behåll den tidigare DNS-konfigurationen för en kontrollerad återgång. Om webbkontrollerna misslyckas, återställ den tidigare webbkopplingen och motsvarande `SITE_URL` tillsammans. Ändra inte publicerade actor-ID:n eller federationens domän som felsökningsåtgärd.

## Alternativet med allt på nolto.social

Lovables officiella dokumentation beskriver **Uses Cloudflare or similar proxy** under **Advanced** i domänanslutningen. Då används den CNAME-adress Lovable visar och en proxad Cloudflare-post, tillsammans med `deploy/wrangler.toml`.

Det är inte samma sak som att slå på Cloudflare ovanpå Lovables vanliga A/TXT-koppling. Verktygen här bekräftar inte att läget kan ändras på en redan ansluten domän utan återanslutning. Kontrollera den möjligheten i domäninställningarna innan en fungerande koppling tas bort. Det här alternativet kräver inte att webbappen flyttas till www.

## Backend och Mastodon-appar

Följ [mastodon-client-access.md](mastodon-client-access.md) för migration, funktioner och acceptanstester. De nya klientfunktionerna får driftsättas med `MASTODON_CLIENT_ENABLED` frånvarande eller `false`: de ska då svara 503 utan databasåtkomst. `privacy-maintenance` behöver den nya migrationen innan den version som anropar `purge_mastodon_metadata` driftsätts.

När migration, backend och en isolerad testmiljö är klara, testa riktiga klienter och kör:

```sh
node scripts/check-mastodon.mjs https://nolto.social https://www.nolto.social
```

Kommandot ovan gäller split-läget. I samma-domän-läget utelämnas den andra adressen. Slå inte på produktionsflaggan förrän inloggning, godkännande, återkallning och faktiska klientoperationer har verifierats. Ett 410-svar betyder den gamla stubben; det avsiktliga 503-svaret från den nya funktionen betyder att stödet fortfarande är avstängt.

## Det som kräver ägarens medverkan

1. Åtkomst till domänens DNS/Cloudflare-konfiguration och Lovables **Settings → Domains**, så att vald koppling och primär webbdomän kan genomföras. Dela inga lösenord eller API-nycklar i chatten.
2. En riktig inloggning med önskad leverantör och senare ett test från en Mastodon-app. Verktygstester kan inte verifiera ett personligt Apple-/Google-/Bluesky-godkännande eller verklig appkompatibilitet.

Ett eget Nolto-konto som kan logga in direkt i Blueskys app kräver fortfarande AT Protocol PDS och kontoprovisionering. Domänkopplingen ensam skapar inte detta och är inte en fullständig brygga mellan protokollen.

Källor, kontrollerade 2026-09-23: [Lovables domän- och proxylägen](https://docs.lovable.dev/features/custom-domain#advanced-use-a-cdn-or-reverse-proxy), [Cloudflare Worker Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/), [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
