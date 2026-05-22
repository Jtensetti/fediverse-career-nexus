
# Helhetsöversyn av Samverkan

Tre spår: **prestanda**, **UX-polering**, **federation utan Cloudflare Worker**. Plockade utifrån faktisk kod (App.tsx 362 rader med 60+ eager-importerade routes, Navbar 439 rader, Vite-config med manualChunks men ingen route-splitting, edge-funktioner som loggar synkront i request path m.m.).

---

## Spår A — Prestanda

### A1. Route-based code splitting (största vinsten)
`src/App.tsx` importerar **alla** ~60 sidor synkront. Initial bundle innehåller Tiptap-editor, recharts, react-day-picker, jszip osv. även för en oinloggad besökare på `/`.

**Åtgärd:**
- Konvertera alla route-importer till `React.lazy(() => import(...))` och wrap `<Routes>` i `<Suspense fallback={...}>`.
- Behåll `Index`, `Auth`, `NotFound` som eager (kritiska).
- Förväntad effekt: initial JS-bundle minskar uppskattningsvis 60–70 % (Tiptap ensamt är ~250 kB gzip).

### A2. Lazy-load tunga sub-komponenter
- `TipTapEditor` används bara i `ArticleEditor` och `EventForm` → redan kandidat för dynamic import inom resp. sida.
- `recharts` används bara i `AdminFederationHealth` → flytta från `vendor-charts` manual-chunk till lazy import.
- `html-to-image` används bara i delningskort → lazy.
- `jszip` används bara i export-flöden → lazy.

### A3. Homepage onödiga DB-anrop
Network-loggen visar att hemsidan kör **4 separata HEAD-counts** + `home_instance`-query + `site_alerts` + `federated_feed` + `job_posts` (vissa duplicerade). `LiveStats` polar var 60:e sekund även när användaren inte ser den.

**Åtgärd:**
- Konsolidera stats till en RPC `get_homepage_stats()` som returnerar allt i ett anrop.
- Pausa pollingen när `document.hidden` (IntersectionObserver eller Page Visibility API).
- Dedupa: `home_instance`-querien körs två gånger per minut — flytta till `staleTime: 5min` i react-query.

### A4. Bilder & fonts
- Lägg till `loading="lazy"` + explicit `width`/`height` på alla `<img>` (CLS-fix). Audit av `AppScreenshot`, `FederationVisual`, organisations-banners.
- Preload LCP-bilden på `/` (hero-screenshot) via `<link rel="preload" as="image">` i `index.html`.
- Bekräfta att fonts (Inter, Montserrat) lazy-laddas med `font-display: swap` (kollas i `index.css`).

### A5. Edge-funktioner: ta bort blockerande loggning
`webfinger/index.ts` (och flera andra) gör `await supabaseClient.from("federation_request_logs").insert(...)` **i request path**. Externa servrar betalar latensen.

**Åtgärd:** wrap i `EdgeRuntime.waitUntil(...)` (Deno Deploy stödjer det) eller fire-and-forget `void promise.catch(...)`.

### A6. React Query defaults
`refetchOnMount: true` är aggressivt för många mount-tunga sidor (Profile, Feed). Sätt per-query `staleTime` där datan är stabil (profile, organisations-metadata) och behåll default endast för feed/notifications.

---

## Spår B — UX-polering

### B1. Navbar (439 rader)
Filen är monolitisk: search, language switcher, theme toggle, notifications, user menu, mobile menu. Inga separata komponenter.

**Åtgärd:**
- Splittra i `NavbarDesktop`, `NavbarMobile`, `NavbarUserMenu`, `NavbarPublicLinks`.
- Audit av menyetiketter — flera dropdowns har ikon-only-knappar utan `aria-label` (kontrolleras).
- Mobil: bekräfta att MobileBottomNav + hamburger-meny inte överlappar i scope (idag finns båda — risk för dubbla nav-paradigmer).

### B2. CTA-tydlighet på hemsidan
Hero har "Kom igång gratis" + "Utforska plattformen". Andra knappen scrollar till `#live-feed` men ser ut som en primär CTA. Ändra variant till `outline`/`ghost` och förtydliga texten ("Se exempelflöde ↓").

### B3. Tomma tillstånd
- `federated_feed` returnerar `[]` för oinloggad hemsida → komponenten visar antagligen tom låda. Lägg till en "Inga publika inlägg ännu — bli först" placeholder.
- `JobsList` med ett enda test-jobb ("testtertwe") på produktion → flagga: rensa eller dölj sektion när jobben är < 2.

### B4. Loading-states
`Index` visar bara "Loading..." i 100% av viewport medan auth-check pågår. Skeleton av navbar + hero gör övergången mindre ryckig.

### B5. Felmeddelanden & toasts
- Audit av alla `toast.error(...)` — många är på engelska trots Swedish-first-policyn. Kör genom `t()`.
- ErrorBoundary visar engelsk text ("Something went wrong"). Lokalisera.

### B6. Formulärflöden
- `ProfileEdit`, `CompanyEdit`, `EventForm`, `JobForm` — bekräfta att alla har: inline-fel, FormErrorSummary överst, disabled submit under pending, optimistic feedback. Snabb genomgång och åtgärd där det saknas.

### B7. Sökning
`GlobalSearch` + `MobileSearch` (Sheet) — bekräfta att `Escape` stänger, att resultatklick navigerar, att tom-state är hjälpsam. Lägg till sökhistorik (localStorage, max 5).

### B8. Onboarding
`OnboardingFlow` + `ProfileCompleteness` — kort audit av om stegen reflekterar "Organisation" istället för "Company" enligt minne. Och: visa en persistent badge i navbar tills profilen är ≥ 80 %.

---

## Spår C — Federation utan Cloudflare Worker

**Kort svar: nej, inte fullt ut, om du vill behålla handles `@user@samverkan.se` OCH ha UI:t på Lovable-hostingen.** Anledningen: Lovable hostar statiska builds utan edge-rewrites (`_redirects`/`vercel.json`/Workers ignoreras). Mastodon kräver att `https://samverkan.se/.well-known/webfinger?resource=acct:user@samverkan.se` svarar från `samverkan.se` självt — inte en CNAME till Supabase, eftersom TLS-certet och Host-headern måste matcha.

### Alternativ utvärderade

**Alternativ 1 — Behåll CF Worker (status quo, rekommenderat)**
Workern är ~50 rader. Den är gratis (Cloudflare Free), under 1 ms latens, redan deployad. Att eliminera den ger ingen verklig vinst.

**Alternativ 2 — Byt hosting till Vercel/Netlify**
Vercel `rewrites` i `vercel.json` (filen finns redan i repo!) kan göra exakt samma sak som Workern:
```json
{
  "rewrites": [
    { "source": "/.well-known/:path*", "destination": "https://anknmcmqljejabxbeohv.supabase.co/functions/v1/:path*" },
    { "source": "/actor/:path*", "destination": "https://anknmcmqljejabxbeohv.supabase.co/functions/v1/actor/:path*" }
  ]
}
```
Detta tar bort CF Worker men kräver migration från Lovable-publish till Vercel. **Inte trivialt** — du tappar Lovables Cloud-publish-flöde.

**Alternativ 3 — Subdomän-federation: `@user@fed.samverkan.se`**
Peka `fed.samverkan.se` direkt på Supabase Edge Functions (CNAME). Hela federation kör där, UI på `www.samverkan.se`. **Nackdel:** handles blir fula och du måste migrera alla befintliga federerade följare (`Move`-aktiviteter), invalidera Mastodon-cachar. Stor migration för marginell vinst.

**Alternativ 4 — Supabase Custom Domain** (Pro-plan-feature)
Pekar `samverkan.se` direkt på Supabase. Men då kan UI inte ligga på samma domän. Skulle kräva flytt av UI till `app.samverkan.se` och 301 från apex. **Större brand-tapp**.

**Alternativ 5 — Host-meta + WebFinger-redirect via `index.html`**
Mastodon honorerar **inte** HTML-meta-redirects för WebFinger. Funkar inte.

### Rekommendation
Behåll CF Worker. **Men:** dokumentera den ordentligt och versionskontrollera koden i repo (`infra/cloudflare-worker/` med wrangler.toml) så den inte är ett dolt black box. Lägg till en healthcheck i `/admin/federation-health` som pingar `https://samverkan.se/.well-known/webfinger?resource=acct:test@samverkan.se` och larmar om Workern går ner.

Om du **absolut** vill bort från CF: migrera till **Vercel** (Alternativ 2). Allt annat är sämre.

---

## Föreslagen ordning

1. **A1 + A2** (route splitting + lazy tunga komponenter) — största prestandavinsten, låg risk. 1 PR.
2. **A3 + A5** (DB-anrop på homepage + edge-loggning fire-and-forget) — märkbar latens-minskning. 1 PR.
3. **B1 + B2 + B5** (Navbar-split, hero-CTA-hierarki, lokalisera toasts/errors) — synlig UX-vinst. 1 PR.
4. **A4 + B3 + B4** (bilder/CLS + tomma tillstånd + skeletons) — polering. 1 PR.
5. **B6 + B7 + B8** (formulär-audit, sök-polering, onboarding-badge) — kvalitetsdetaljer. 1 PR.
6. **C — Federation-doc** (versionskontrollera Worker, lägg till healthcheck) — operations-hygien. 1 PR.

**Inte med i scope:** byte av hosting (C2), domänarkitektur-ändringar (C3/C4), bredare refaktor av services-lagret.

---

## Frågor innan jag börjar

1. Får jag köra spår A i föreslagen ordning utan ytterligare avstämning, eller vill du godkänna PR-vis?
2. Federation: nöjd med "behåll Worker, dokumentera den"? Eller vill du på allvar utreda Vercel-flytt?
3. Finns det specifika sidor/flöden du **vet** känns sega eller oklara som jag bör prioritera?
