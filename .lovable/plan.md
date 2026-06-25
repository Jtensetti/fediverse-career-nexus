
# Seed realistic demo content

Skapa ~50 realistiska seed-användare med tillhörande innehåll så att Nolto ser levande ut. Mestadels svenska, lite engelska. Inga inloggningsbara konton — bara profiles + actors för visning.

## Innehållsfördelning

- **50 profiler** med olika yrken: utvecklare, designer, UX-researcher, produktchef, frilansjournalist, fotograf, jurist, läkare, lärare, arkitekt, marknadsförare, dataanalytiker, snickare, kock, musiker, forskare, HR-chef, entreprenör, copywriter, terapeut, ekonom, ingenjör, översättare, m.fl. Geografisk spridning: Stockholm, Göteborg, Malmö, Uppsala, Umeå, Berlin, Köpenhamn, Amsterdam.
- **15 AI-genererade porträtt** för "hjälte"-profilerna (de mest aktiva). Resterande 35 får bokstavsinitial-avatar (befintligt UI-stöd, ingen DB-bild behövs).
- **~120 inlägg** spridda över ~35 av profilerna. Svensk yrkescopy: tankar om branschen, projektuppdateringar, frågor till nätverket, lästips, jobbreflektioner. ~15% på engelska. Realistiska tidsstämplar utspridda över senaste 3 månaderna.
- **~15 artiklar** av ~10 författare. Exempelämnen: "Vad jag lärt mig av att lämna konsultlivet", "Federerade nätverk för proffs — en introduktion", "Hur jag intervjuar designers", "Mitt år som frilansutvecklare", "Notes from a UX research sprint" (en).
- **~12 företag** (companies) med riktiga-klingande namn (uppdiktade men trovärdiga): t.ex. "Nordlys Studio", "Tegel & Trä Arkitekter", "Plats Tech", "Vinge & Vana Kommunikation", "Helix Forskning AB", "Studio Lumen". Med beskrivning, bransch, hemort, employee-count, logo-initial.
- **~20 företagsinlägg** från ~8 av företagen (rekryteringsnyheter, produktuppdateringar, kulturposter).
- **~10 jobbannonser** kopplade till ~6 av företagen. Riktiga roller: "Senior frontend-utvecklare", "UX-researcher (deltid)", "Projektledare bygg", "Content lead", "Junior dataanalytiker", "Freelance copywriter", varav 2 på engelska.
- **CV-data på ~70% av profilerna**: experiences (1–4 roller var) + education (1–2 poster) + skills (3–8 var). Riktiga svenska företagsnamn där det är logiskt (KTH, Lunds universitet, Spotify, Klarna, IKEA, SVT, Region Stockholm osv. som tidigare arbetsgivare — inte som nuvarande arbetsgivare på Nolto).
- **Job-seeking flag**: ~12 profiler markeras som "söker jobb" via befintligt fält (om sådant finns; annars skippas).
- **Connections/följare**: ~3–8 connections per aktiv profil, mest mellan profiler som "passar ihop" yrkesmässigt.
- **Reaktioner**: en handfull reactions på de populäraste inläggen och artiklarna så räknarna inte är 0.

## Hur det utförs

1. **Schemainspektion** — läs faktiska kolumner och constraints på: `profiles`, `actors`, `experiences`, `education`, `skills`, `articles`, `companies`, `company_employees`, `job_posts`, `reactions`, `user_connections`. (Tabellnamnen finns redan i kontexten.) Detta för att inte gissa fältnamn.
2. **Avatar-generering** — 15 AI-bilder via agent-side `generate_image` (fast tier), sparas i `public/seed-avatars/`. Prompts varieras (ålder, kön, etnicitet, ljussättning, casual/formal). Övriga profiler får `avatar_url = null` så befintlig initial-fallback i UI används.
3. **Seed-script** — en Python-fil i `scripts/seed/seed_demo_users.py` som:
   - Definierar all data inline (ingen extern mockdata-källa, ingen `faker`).
   - Genererar deterministiska UUID:n (md5-hash av seed-strängar) så scriptet kan köras flera gånger idempotent (UPSERT på handle).
   - Bygger SQL INSERTs och kör dem via en enda `supabase--insert`-batch per tabell.
   - Aktörer (actors) skapas med `local = false`-aktig profil där det behövs — eller `local = true` med fiktiv inbox-URL `https://nolto.social/inbox` så federation inte triggas. (Bekräftas mot actors-schemat innan körning.)
4. **Idempotens & säkerhet** — använder `ON CONFLICT DO NOTHING` på unika nycklar (handle, slug, email om sådan finns). Allt inom prefix `seed_` på interna fält där det är möjligt, plus en kommentar/flagga (om kolumn finns; annars en `seed_users.md`-doc) så det är lätt att rensa senare.
5. **Cleanup-script** — `scripts/seed/clear_demo_users.sql` som tar bort allt seedat via deras kända handle-prefix, för framtida bruk.

## Teknisk sektion

- **Ingen auth.users-skapelse** — inga lösenord, inga e-postutskick, ingen RLS-policy-konflikt. Profiler länkas till en `actor_id` (om profiles kräver det) och `user_id` sätts till ett genererat UUID som inte finns i auth.users. Innan körning verifieras att profiles inte har FK mot `auth.users` (om den har det väljer vi minst-invasiva väg: skapa rader direkt med `service_role` via psql/insert, FK till auth är nullable i de flesta Lovable-projekt — annars fallback att skapa minimala auth.users-rader, men det är *plan B* och bekräftas först).
- **Tidsstämplar** sprids 1h–90 dagar bakåt med en `random.seed(42)` för reproducerbarhet.
- **Slugs** för companies: kebab-case från namn, kollisionssäkrade.
- **Federation queue** rörs inte — inga `federation_queue_partitioned`-rader skapas, vi sätter ev. flagga som markerar inlägg som local-only.
- **Inga ändringar i app-kod** — bara data + ev. nya filer i `scripts/seed/` + 15 bilder i `public/seed-avatars/`.

## Vad som lämnas orört

- All applikationskod (komponenter, services, routes, i18n).
- RLS-policies och migrations.
- Auth-flöden och e-post.
- Federation-pipelinen.

## Resultat

Efter körning ska homepage-feeden, "Företag"-sidan, "Jobb"-sidan, "Artiklar"-sidan och slumpvis valda profiler kännas befolkade och autentiska för en besökare som landar på Nolto för första gången.
