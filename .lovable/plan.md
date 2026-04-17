

# Vad som missades eller gjordes halvhjärtat

Efter genomgång av faktisk kod mot ursprungsplanen finns sex konkreta luckor. Resten är levererat.

## 1. `_shared/http-signature.ts` har kvar den gamla buggade parsern (A8 — halvfärdig)
Inbox har egen, korrekt parser (`indexOf('=')`-fix + replay-cache + keyId/actor-domänkoll). Men `_shared/http-signature.ts:181-184` har fortfarande `const [k, v] = part.trim().split('=')` — exakt buggen vi skulle eliminera. Den används av andra federationsfunktioner via `verifySignature`. Konsolidera: flytta inbox-parsern till `_shared`, ta bort dubbletten, exportera `verifyRequestSignature(req, body, opts)` som inbox kallar.

## 2. `ensureActorHasKeys` i `_shared/http-signature.ts` använder fortfarande race-condition-mönstret (A10 — halvfärdig)
`_shared/http-signature.ts:238-301` läser → genererar → `update`. Det är exakt mönstret SQL-funktionen `ensure_actor_keys` skulle ersätta. `signedFetch` kallar denna → all utgående federation utanför outbox/send-follow är fortfarande race-utsatt. Refaktorera till att alltid gå via RPC `ensure_actor_keys`.

## 3. `keyId` i `_shared/http-signature.ts` byggs med `SUPABASE_URL` (A1 — läcker fortfarande)
Rad 267 + 292: `keyId = ${supabaseUrl}/functions/v1/actor/${username}#main-key`. Varje request signerad via `signedFetch` (federation-coordinator/worker, lookup-remote-actor m.fl.) skickar ut **fel keyId** → remote-servrar cachar `supabase.co`-nyckel, signaturverifiering bryts efter A1-fixet. Måste använda `buildKeyId(username)` från `federation-urls.ts`.

## 4. `webfinger` saknar fortfarande LD-JSON-länken (A3 — halvfärdig)
Rad 200 säger "canonical base", men jag ser inte att svaret innehåller `rel="self"` med `type="application/ld+json; profile=..."` som krävs av strikt LD-JSON-kompatibla servrar (krav i ActivityPub-spec). Behöver verifieras och vid behov adderas.

## 5. Outbox POST signerar inte och federerar inte aktiviteten (A6/B5 — halvfärdig)
`handlePostOutbox` (outbox/index.ts:262-391) lagrar object i `ap_objects` men **köar inget** i `federation_queue_partitioned` och **signerar/skickar ingenting** till följares inboxar. Trigger `queue_post_for_federation` finns på DB-sidan, så Notes-fall fungerar — men andra typer (Like, Announce, Follow, Update) som POSTas till outbox försvinner i tysthet. Lägg till queue-insert som fallback för icke-Note-typer, eller dokumentera att outbox C2S endast stöder Create+Note.

## 6. Fas 4 — automatiserade tester saknas helt (steg 21 — ej levererad)
Sökning efter `_test.ts`/`.test.ts` i `supabase/functions/`: **noll filer**. Steg 21 i planen ("Skriv Deno-tester för `_shared/http-signature.ts` och `_shared/federation-urls.ts`") aldrig implementerad. Lägg till minst:
- `_shared/federation-urls_test.ts` — `buildActorUrl`, `isLocalUrl`, `normalizeDomain` (www-hantering, http→https, trailing slash).
- `_shared/http-signature_test.ts` — sign→verify-roundtrip, base64-padding-parser, replay-detection-flow (mockad).

## 7. `public/_redirects` används men plattformen ignorerar den (helt missat)
Lovable-hosting **läser inte `_redirects`** (Netlify-konvention). Hela `public/_redirects` med `/.well-known/webfinger → supabase.co/functions/v1/webfinger` är därmed **död kod**. Federation fungerar idag bara för att Cloudflare-Workern proxar (enligt mem://infrastructure/federation/proxy-routing). Två val:
- (a) Bekräfta att Cloudflare-Workern täcker alla nya rutter (`/api/v1/*`, `/api/v2/*`, `/.well-known/oauth-authorization-server`) — annars går Mastodon-app-stödet i Fas 3 inte att nå utifrån.
- (b) Ta bort `public/_redirects` och dokumentera att Worker är enda routinglagret. Lägg till config för de nya paths i Worker.

Detta är **kritiskt** för Fas 3 — utan det kan ingen Tusky/Elk faktiskt logga in.

## 8. Risk-mitigeringar från ursprungsplanen ej genomförda
Ursprungsplanens "Risker"-sektion listar två migreringssteg som inte gjorts:
- **301-redirect** från gamla `supabase.co/functions/v1/actor/*` → nya `samverkan.se/...` (för befintliga remote-cachar). Lägg till i Cloudflare-Workern.
- **Engångs-`Update Person`-aktivitet** för varje lokal aktör efter URL-bytet, så Mastodon-instanser invaliderar nyckel-cache. Skapa en admin-knapp eller engångs-script.
- **DB-migration**: `UPDATE actor_followers SET follower_actor_url = ...` om någon rad pekar på vår egen `supabase.co`-domän. Snabb selektivkoll först.

## Förslag till ordning
**Måste före launch:** punkt 1, 2, 3, 7 (säkerhet + att routing alls fungerar).
**Bör före launch:** punkt 4, 5, 8 (spec-paritet + smooth migration).
**Kan göras strax efter launch:** punkt 6 (tester — viktigt men inte blockerande).

Vill du att jag kör hela listan, eller börjar med must-have (1, 2, 3, 7)?

