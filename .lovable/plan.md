
# Full revert: Samverkan → Nolto

Jag går igenom hela kodbasen och byter tillbaka all branding, copy, slugs, domäner, federation-handles och dokumentation från Samverkan till Nolto.

## Omfattning

**1. Copy & UI-text**
- `src/i18n/locales/sv.json` och `en.json` — alla strängar med "Samverkan", "samverkan" (varumärke), "samverkan.se"
- Alla hårdkodade strängar i `.tsx`-komponenter (hero, footer, features, FAQ, legal-sidor, federation-guide, etc.)
- Public sector-formuleringar → bred fediverse-karriär-tonalitet (testimonials, "offentlig sektor", "myndigheter", "kommuner" → professionella/branschneutrala motsvarigheter)
- Maskoten (elefant) återinförs i copy och visuella referenser där den fanns

**2. Domän & federation**
- `samverkan.se` / `www.samverkan.se` → `nolto.com` (eller tidigare Nolto-domän — bekräfta nedan)
- `public/_redirects`, `vercel.json`, `public/robots.txt`, `public/site.webmanifest`
- `supabase/functions/_shared/federation-urls.ts` (FALLBACK_DOMAIN)
- `supabase/functions/host-meta/index.ts` och andra edge functions som hårdkodar domän
- OAuth `client_name` branding
- Canonical handle-utility (`@user@samverkan.se` → `@user@nolto.com`)
- Cloudflare worker-referenser i dokumentation

**3. Slugs & URL:er**
- `/organisationer` → `/companies`
- `/organisation/:slug` → `/company/:slug`
- Terminologi "Organisation" → "Company" i UI och kod-kommentarer där det är säkert (komponentnamn behålls om de redan heter Company*)

**4. Metadata & SEO**
- `<title>`, meta descriptions, OG-taggar, JSON-LD
- `site.webmanifest` (name, short_name, description, färger om de ändrats)
- Theme color `#0d3b3c` → tidigare Nolto-färg om den ändrats (bekräfta nedan)
- favicon/apple-touch-icon — behålls om de redan är Nolto, byts annars

**5. E-post**
- `noreply@samverkan.se` → `noreply@nolto.com` (eller tidigare adress)
- Edge function email-templates och avsändare

**6. Dokumentation**
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` (om branding nämns)
- `docs/federation-launch-checklist.md`, `docs/openapi.yaml`
- `.env.example`

**7. Memory**
- Uppdaterar `mem://index.md` Core: ersätter Samverkan-identitet med Nolto, tar bort public sector-pivot från Core, markerar pivot-memory som historisk
- Uppdaterar/arkiverar: `samverkan-identity`, `public-sector-pivot`, `public-sector-testimonials`, `canonical-domain`, `domain-architecture`, `oauth-redirect-uri-standard`, `email-delivery-config`, `oauth-branding`, `organisation-pages-architecture` (org→company-terminologi)

## Vad jag INTE rör
- Teknisk arkitektur (federation-delivery, RLS, MFA, account deletion, data portability, moderation, custom feeds — funktionalitet behålls)
- Supabase-projekt-id (`anknmcmqljejabxbeohv`) — backend-instansen är samma
- Auto-genererade filer (`src/integrations/supabase/client.ts`, `types.ts`, `.env`, `supabase/config.toml`)

## Frågor innan jag kör

1. **Domän** — Vilken Nolto-domän? `nolto.com`, `nolto.se`, eller annat? Detta avgör federation-handles, e-post, _redirects, OG-URL:er.
2. **Theme color** — Nuvarande primary är `#0d3b3c` (mörkgrön). Ska den tillbaka till tidigare Nolto-färg, och i så fall vilken hex?

Så fort jag har de två svaren kör jag hela bytet i ett svep (parallella file-writes).
