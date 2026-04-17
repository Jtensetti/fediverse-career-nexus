

# Federation, WebFinger & ActivityPub: produktionsplan

Jag har granskat hela federationsstacken (webfinger, host-meta, nodeinfo, actor, inbox, outbox, followers, following, send-follow, send-move, federation-coordinator/worker, lookup-remote-actor, jwks, http-signature). Det finns mycket bra på plats — HTTP-signaturer, RSA-nycklar, sharedInbox-batchning, exponentiell backoff, partitionerad kö, alsoKnownAs/Move-stöd, Tombstone vid Delete. Men det finns **konkreta produktionsblockerare** och **specifikationsbrott** som måste åtgärdas innan publik produktion.

## A. Kritiska problem (måste fixas innan produktion)

### A1. Actor-URLer pekar på Supabase-hostnamn istället för samverkan.se
I `outbox/index.ts`, `send-follow/index.ts`, `send-move/index.ts` och `federation/index.ts` byggs `actor`, `id`, `keyId` och `activityId` med `Deno.env.get("SUPABASE_URL")`. Det ger URLer som `https://anknmcmqljejabxbeohv.supabase.co/functions/v1/actor/foo` — men `webfinger`/`actor`-svaren refererar `https://samverkan.se/...`. **Detta bryter HTTP-signaturverifiering** hos Mastodon/Pleroma eftersom `keyId` och `actor`-domain inte matchar och deras nyckel-cache slår fel.

**Fix:** Centralisera till en `getFederationBaseUrl()` (alltid `https://samverkan.se`) i `_shared/`, och använd den i ALLA federerande funktioner. SUPABASE_URL får aldrig läcka in i utgående aktivitets-JSON.

### A2. WebFinger förkastar förfrågningar med fel domän-jämförelse
`webfinger/index.ts` rad 116-159: `getRequestHost()` tvingar alltid `SAMVERKAN_DOMAIN`, men `acctMatch[2]` (det användaren anger) jämförs sedan mot `requestHost`. Om någon frågar efter `acct:user@www.samverkan.se` (som är canonical UI-domän) → mismatch → 400. Mastodon ignorerar `www.`-prefix.

**Fix:** Acceptera både `samverkan.se` OCH `www.samverkan.se` som giltiga domäner. Normalisera bort `www.` före jämförelse.

### A3. WebFinger saknar `rel="http://webfinger.net/rel/profile-page"` med korrekt URL
`profileUrl = ${baseUrl}/profile/${profile.username}` — men app-routen är troligen `/profile/:username` på `www.samverkan.se`, inte på Supabase-funktionsdomänen. Behöver verifieras + lägga till `rel="self"` med `application/ld+json; profile="..."` (krav för LD-JSON-kompatibla servrar).

### A4. `host-meta` i `public/.well-known/host-meta` pekar på **nolto.social** (gammalt varumärke)
Hårdkodad rad: `template="https://nolto.social/.well-known/webfinger?resource={uri}"`. Fediversen kommer aldrig hitta tillbaka till samverkan.se via host-meta.

**Fix:** Ta bort den statiska filen (edge-funktionen `host-meta` redan svarar korrekt via `_redirects`). Annars ändra till `samverkan.se`.

### A5. Inkonsekventa fallback-URLer i `federation/index.ts`
- Rad 102-107 (enrichActivity): `actor: ...attributedTo || ${supabaseUrl}/functions/v1/actor/${item.actor_id}` — men `item.actor_id` är ett **UUID**, inte ett username. Skapar trasiga aktör-URLer i utgående aktiviteter.
- Rad 314-317: jämför `recipientUri.startsWith(supabaseUrl)` för att avgöra "lokal" — men efter A1-fix kommer lokala URLer börja med `samverkan.se`, inte SUPABASE_URL.

**Fix:** Slå alltid upp `actor.preferred_username` från DB, jämför mot `samverkan.se`-prefix.

### A6. Outbox använder ej Deno.openKv stabilt + saknar HTTP-signaturverifiering på POST
- Rad 12: `await Deno.openKv()` — fungerar inte på alla Supabase Edge runtime-versioner (resten av kodbasen har migrerat till `memoryCache`). Risk för cold-start-fel.
- Outbox POST verifierar bara JWT (lokal användare). Det är korrekt för C2S, men många klienter förväntar sig att kunna POST:a aktiviteter signerade — minst dokumentera att vi är JWT-only för outbox C2S.

**Fix:** Migrera outbox till samma in-memory-cache som webfinger/instance/nodeinfo.

### A7. Inbox-handler missar flera kritiska aktivitetstyper / spec-brott
Genomgång av `handleCreateActivity` m.fl.:
- **Inga inkommande replikering till `ap_objects`** för inkommande Likes/Announces — de hamnar bara i `inbox_items`. Boost/like-räkning på lokala inlägg uppdateras aldrig (TODO-kommentarer rad 1084 och 1120).
- **Update-aktivitet** (rad 1179) lagrar bara i `inbox_items` — uppdaterar inte motsvarande `ap_objects`-rad → redigerade inlägg från Mastodon visas aldrig som uppdaterade i federerade flödet.
- **`Flag`-aktivitet (moderationsrapport från fjärrserver)** stöds inte alls. Kritiskt för en seriös instans.
- **`Block`-aktivitet** stöds inte (Mastodon skickar dessa).
- **Follow-handler skapar `actor_followers` utan att kolla om sender är blockerad i `blocked_actors`** — vänta, det görs faktiskt via `isActorBlocked` rad 364, bra. Men `manuallyApprovesFollowers` respekteras inte — alltid auto-Accept.

**Fix:** 
- Lägg till hanterare för `Flag`, `Block`, korrekt `Update` (uppdatera ap_objects), och korrekt Like/Announce-räkning på lokala objekt.
- Lägg till stöd för `manuallyApprovesFollowers` (hämta från `actors.manually_approves_followers` om kolumn finns; annars false).

### A8. Signaturverifiering har bugg + säkerhetslucka
`inbox/index.ts` rad 84-88:
```
for (const part of signatureHeader.split(',')) {
  const [k, v] = part.trim().split('=');
  ...
}
```
Detta bryts om signaturen själv innehåller `=` (vanligt — base64-padding). `split('=', 2)`-bugg → felaktig signaturparsning för många servrar.

Dessutom finns **två separata signaturverifierings-implementationer** (`inbox/index.ts` lokalt + `_shared/http-signature.ts`). Inbox använder den lokala, vilken **inte verifierar att `keyId`-domänen matchar `actor`-domänen** → man kan teoretiskt signera en Note "från" `@alice@server-a` med en nyckel registrerad på `server-b`.

**Fix:**
- Använd `_shared/verifySignature` överallt (en sanning).
- Parsa Signature med korrekt regex eller `split('=')` på första `=`.
- Jämför `URL(keyId).hostname === URL(activity.actor).hostname` innan acceptans.
- Lägg till replay-skydd: cacha signature/digest-par i 10 min → avvisa dubbletter.

### A9. Migration (Move) är ofullständig
- `send-move/index.ts` rad 182: `Math.abs(actor.id.hashCode?.() || 0) % 16` — `String.prototype.hashCode` finns INTE i JS. Alla Move-aktiviteter hamnar i partition 0, eller kraschar. Måste använda `actor_id_to_partition_key` RPC istället (samma som inbox redan gör).
- Inkommande `Move` (rad 1228 i inbox) verifierar `alsoKnownAs` på nya kontot (bra), men **flyttar inte lokala följningar automatiskt** — TODO på rad 1290-1296 är bara en notifikation. För att uppfylla användarförväntan från Mastodon ska lokala användare som följer den gamla aktören automatiskt börja följa nya.
- Klient-UI (`AccountMigrationSection.tsx`) saknar **inkommande migration** ("Importera följare från ditt gamla konto") — Mastodon erbjuder detta via CSV-import. Behövs för full paritet.

**Fix:**
- Använd RPC för partition.
- Implementera auto-re-follow av nya aktören för alla lokala följare när Move tas emot.
- Lägg till CSV-import-flöde "Migrera till Samverkan".

### A10. Nyckelhantering har race condition
Tre olika ställen genererar RSA-nycklar (`outbox`, `send-follow`, `_shared/ensureActorHasKeys`). Om två requests landar samtidigt på en nyckellös aktör → båda genererar, sista vinner, första nyckelns signaturer blir ogiltiga.

**Fix:** Centralisera nyckelgenerering till **en** SQL-funktion `ensure_actor_keys(actor_uuid)` med `FOR UPDATE`-lås, anropas via RPC från alla edge functions. Detaljer i implementationen: använd advisory lock + INSERT...ON CONFLICT.

## B. Spec-/kompatibilitetsbrister mot Mastodon/Pleroma

### B1. Saknade endpoints
- **`/api/v1/instance`** (Mastodon-kompatibel) finns som `instance`-funktion men exponeras inte via en standardväg. Lägg till rewrite `/api/v1/instance → instance` så Mastodon-klienter kan upptäcka oss.
- **`/.well-known/oauth-authorization-server`** saknas. Krävs för att Mastodon-appar ska kunna autentisera mot oss.
- **`/api/v1/apps`** (OAuth-klientregistrering) saknas. Utan detta kan Tusky/Ivory/Elk inte logga in.
- **`/api/v2/search`** saknas. Utan detta kan ingen söka efter `@user@samverkan.se` från andra Mastodon-klienter.

### B2. NodeInfo saknar standardfält
`nodeinfo/index.ts` rad 94-114 saknar:
- `services: { inbound: [], outbound: [] }` (krav i spec 2.0)
- `usage.localComments`
- `metadata.maintainer`, `metadata.langs`
- `software.repository` (peka på source om öppen källkod)

### B3. Instance-endpoint är på engelska, säger fel saker
`instance/index.ts` rad 76-79: titel/beskrivning på engelska + `email: "admin@samverkan.se"` (finns den mailen? Måste verifieras eller bytas till `kontakt@`). Lägg till `rules`-array, `languages: ["sv", "en"]`, `contact_account` med admin-handle.

### B4. `endpoints.sharedInbox` returneras men `/inbox` (utan username) finns inte som rutt
`actor/utils.ts` rad 401: `sharedInbox: ${baseUrl}/functions/v1/inbox` — men inbox-funktionen kräver `pathParts.length === 1` (en username i pathen). Mastodon kommer POSTa till sharedInbox och få 404. **Stort problem** — minskar leveranseffektivitet drastiskt och kraschar batchad leverans.

**Fix:** Lägg till sharedInbox-fallback i inbox-handler: om ingen username, processa aktiviteten utan en specifik mottagar-aktör (fan-out till alla lokala recipients i `to`/`cc`).

### B5. Outbox returnerar inte aktiviteter — bara objekt
Rad 296: `formattedActivities = activities.map(activity => activity.content)` — men `ap_objects.content` är **objektet** (Note), inte den omslutande Create-aktiviteten. Mastodon förväntar sig `{type: "Create", object: {...Note}}`-strukturer i orderedItems.

### B6. Followers/Following kollektioner är ofullständiga
- `following/index.ts` baseras på `federation_queue_partitioned` (köhistorik) istället för en riktig `outgoing_follows`-tabell som finns. → Felaktig data.
- Båda saknar `summary`-fält (Mastodon-kompatibilitet).
- `id` använder `${baseUrl}/${username}/followers` — men actor säger `${baseUrl}/functions/v1/followers/${username}`. ID-mismatch → Mastodon kan vägra läsa kollektionen.

## C. Förslag till plan (prioriterad)

### Fas 1 — produktionsblockerande (måste före publik launch)
1. Skapa `_shared/federation-urls.ts` med `getFederationBaseUrl()`, `buildActorUrl(username)`, `buildActivityId()`, `buildObjectId()`. Refaktorera `outbox`, `send-follow`, `send-move`, `federation/index.ts`, `inbox/index.ts` att enbart använda dessa. (A1, A5)
2. Ta bort `public/.well-known/host-meta` (statisk fil med nolto.social). (A4)
3. Fixa WebFinger www-normalisering. (A2)
4. Implementera sharedInbox-rutt i inbox-funktionen (utan username). (B4)
5. Fixa signature-parser-bugg + använd `_shared/verifySignature` överallt + lägg till keyId/actor domain-match + replay-cache. (A8)
6. Konsolidera nyckelgenerering till SQL-funktion med advisory lock. (A10)
7. Fixa `send-move` partition-bug. (A9 första punkten)
8. Migrera `outbox` från `Deno.openKv` till in-memory cache. (A6)
9. Fixa `outbox` GET → returnera korrekta Create-wrapper. (B5)
10. Fixa followers/following collection IDs + `following` att läsa från `outgoing_follows` istället för köhistorik. (B6)

### Fas 2 — kompatibilitet & bra upplevelse
11. Lägg till sharedInbox-rutt fan-out till lokala mottagare i `to`/`cc`. (B4)
12. Implementera `Flag`, `Block`, korrekt `Update` (synkar `ap_objects`), Like/Announce-räkning. (A7)
13. Stöd för `manuallyApprovesFollowers` i Follow-handler. (A7)
14. Auto-re-follow vid inkommande Move. (A9 andra punkten)
15. Komplettera NodeInfo med `services`, `metadata.maintainer`, `metadata.langs`. (B2)
16. Översätt `instance`-endpoint till sv/en, lägg till `rules` och `contact_account`. (B3)

### Fas 3 — Mastodon-klientkompatibilitet (gör Samverkan användbar från Tusky/Elk/Ivory)
17. Skapa `oauth-authorization-server`-endpoint + rewrite. (B1)
18. Skapa minimal `mastodon-api`-edge function som svarar på `/api/v1/instance`, `/api/v1/apps`, `/api/v2/search` (åtminstone hash- och account-search). (B1)
19. CSV-import för "Migrera TILL Samverkan" (importera följande-listan från Mastodon-export). (A9 tredje punkten)

### Fas 4 — observabilitet & tester
20. Lägg till "Federation Health" check-knapp på `/admin/federation/health` som kör en self-test: WebFinger lookup mot oss själva, fetch egen actor, verifiera signatur, posta till egen sharedInbox. Synligt rött/grönt.
21. Skriv Deno-tester för `_shared/http-signature.ts` och `_shared/federation-urls.ts`.

## Vad detta INTE rör
- Befintlig auth/MFA — orört.
- Befintlig schema/RLS — endast en ny SQL-funktion (`ensure_actor_keys`) och eventuellt `manually_approves_followers`-kolumn på `actors` om den saknas.
- Federationskön och delivery-arkitektur (sharded queue, backoff) — fortsätter som idag, bara enriched-payload-fixar.
- UI för slutanvändare oförändrat förutom (1) ny "Federation Health"-vy och (2) CSV-import för migration.

## Risker
- **A1 (URL-fixet) är breaking för befintliga remote-cachar** hos Mastodon-instanser som följer oss. Vi måste samtidigt sätta upp HTTP 301-redirect från `supabase.co/functions/v1/actor/*` till `samverkan.se/functions/v1/actor/*` så remote följare kan upptäcka oss på nya URLen. För att vara helt rigorös: skicka ut ett `Update Person`-aktivitet för varje lokal aktör efter migrationen så cachar invalideras.
- Eventuellt finns det redan följande/följare på den gamla URL-formen — kör en migration som uppdaterar `actor_followers.follower_actor_url` om de pekar på vår supabase.co-domän (osannolikt men värt att kolla).

