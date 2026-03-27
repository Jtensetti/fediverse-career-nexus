# Byt "Nolto" → "Samverkan" + ta bort elefantloggan

## Sammanfattning

Genomgripande namnbyte från "Nolto" till "Samverkan" i hela kodbasen — synlig text, juridiska dokument, federation-domän, i18n-filer och edge functions. Elefantloggan (maskot) tas bort från alla platser.

---

## 1. Ta bort elefantloggan (7 filer)

Alla `<img src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png">` ersätts med text "Samverkan" eller tas bort helt:

- **Navbar.tsx** (3 ställen) — byt img till textlogga
- **Footer.tsx** — byt img till textlogga
- **Auth.tsx** — ta bort img
- **AuthRecovery.tsx** — ta bort img
- **HeroWithScreenshot.tsx** — ta bort img
- **OnboardingFlow.tsx** — ta bort img
- **Hero.tsx** — ta bort bakgrundsbild-referensen

## 2. Frontend-text: "Nolto" → "Samverkan" (~30+ filer)

Alla hårdkodade "Nolto"-strängar i `.tsx`-filer ersätts:

- **TermsOfService.tsx** — alla juridiska omnämnanden
- **PrivacyPolicy.tsx** / **CookiesPage.tsx** — juridisk text
- **HelpCenter.tsx** — FAQ-svar
- **Documentation.tsx** — guidetext
- **Mission.tsx** — uppdragsbeskrivning
- **InstanceGuidelines.tsx** — SEOHead + rubrik
- **Profile.tsx** — delningstext, SEO
- **StarterPackView.tsx** — delningstext
- **FederatedFeed.tsx** — SEO
- **Notifications.tsx** — SEO
- **Instances.tsx** — SEO
- **Auth.tsx** — välkomsttext, handle-hint
- **CodeOfConductPage.tsx**
- **FederationVisual.tsx** — centerinstans-label
- **AppScreenshot.tsx** — URL-bar text
- **BuiltInOpen.tsx** — repo-namn, GitHub-länkar
- **FederationExplainer.tsx**, **WhyFederated.tsx**, etc.
- **VerificationRequest.tsx** — `nolto-verify=` → `samverkan-verify=`

## 3. Domän: "nolto.social" → "samverkan.se" (~21 filer)

### Frontend

- **src/lib/federation.ts** — `NOLTO_DOMAIN`, `getNoltoInstanceDomain()` → `getSamverkanInstanceDomain()`
- **src/components/FederationInfo.tsx** — importnamn
- **src/hooks/useOnboarding.ts** — localStorage-nyckel `nolto-onboarding-complete` → `samverkan-onboarding-complete`

### Edge Functions

- **supabase/functions/webfinger/index.ts** — `NOLTO_DOMAIN`, kommentarer
- **supabase/functions/federated-auth-init/index.ts** — `CANONICAL_REDIRECT_URI`, `validDomains`, `website`
- **supabase/functions/federated-auth-callback/index.ts** — `CANONICAL_REDIRECT_URI`
- **supabase/functions/lookup-remote-actor/index.ts** — User-Agent
- **supabase/functions/_shared/http-signature.ts** — User-Agent
- **supabase/functions/actor/index.ts** + **utils.ts**
- **supabase/functions/outbox/index.ts**
- **supabase/functions/federation/index.ts**
- Övriga edge functions som refererar till nolto.social

## 4. i18n-filer (2 filer)

### sv.json

Alla värden som innehåller "Nolto" → "Samverkan" (auth.welcomeTitle, footer.tagline, etc.)

### en.json

Samma nycklar — "Nolto" → "Samverkan"

## 5. Konfigurationsfiler

- **public/site.webmanifest** — namn och beskrivning
- **index.html** — title, meta-taggar, OG-taggar
- **README.md** — projektnamn och beskrivning
- **public/.well-known/webfinger/index.html** — ev. Nolto-referenser
- **public/robots.txt** — ev. Nolto-referenser
- **wrangler.toml** — om det finns Nolto-referenser
- **vercel.json** — om det finns Nolto-referenser

## 6. Domänstrategi (index.html)

Uppdatera redirect-skriptet som tvingar `www.nolto.social` → `www.samverkan.se`

---

## Teknisk detalj

- ~40-50 filer berörs totalt
- Inga databasändringar
- Edge functions som ändras deployar automatiskt
- Funktionsnamn i kod (t.ex. `getNoltoInstanceDomain`) bör döpas om för konsekvens
- Elefantloggan ersätts med enbart text/typografi — ingen ny bild behövs