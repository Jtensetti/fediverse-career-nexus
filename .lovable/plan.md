
# Neutralisera offentlig sektor-copy → federerat LinkedIn-alternativ

Jag byter ut all branding-copy som positionerar Nolto mot svensk offentlig sektor till en neutral, bred tonalitet: **"federerat alternativ till LinkedIn"** — för alla yrkesverksamma, oavsett bransch.

## Positionering (ny ton)

- **Tagline-riktning:** "Det federerade alternativet till LinkedIn" / "Ditt professionella nätverk — fritt från Big Tech"
- **Värdeord:** öppet, federerat, portabelt, ägandeskap över din data, ingen algoritmisk feed, inga annonser, kontroll över identitet
- **Målgrupp i copy:** yrkesverksamma, frilansare, utvecklare, kreativa, konsulter — inte bara/specifikt offentlig sektor

## Filer som ändras

**Hög prioritet — synlig hero/marketing-copy:**
- `src/i18n/locales/sv.json` + `en.json` — alla strängar som nämner offentlig sektor, myndighet, kommun, region, "svensk-hostad" som målgruppsmarkör
- `src/components/legal/Features.tsx` — feature-rubriker/beskrivningar ("byggda för offentlig sektor" → "byggda för proffs")
- `src/pages/federation/FederationGuide.tsx` — exempel och förklaringar
- `src/pages/info/Mission.tsx` — uppdragsbeskrivning
- `src/pages/info/HelpCenter.tsx` — FAQ-svar
- `src/components/homepage/AppScreenshot.tsx` — eventuell URL/mock-text

**Medel — sekundära sidor:**
- `src/components/legal/InstanceGuidelines.tsx`, `CodeOfConduct.tsx`
- `src/pages/legal/TermsOfService.tsx`, `PrivacyPolicy.tsx`
- `src/pages/Index.tsx`
- `src/components/onboarding/OnboardingFlow.tsx`
- `src/pages/social/StarterPacks.tsx`, `src/services/social/starterPackService.ts`
- `src/services/misc/onboardingRecommendationService.ts`
- `src/components/social/StarterPackCard.tsx`, `VerificationBadge.tsx`

**Låg/avgränsad:**
- `src/components/company/CompanyForm.tsx` — `'Förbund / samverkansorgan'`-dropdown: lämnas (legitim svensk organisationstyp)
- `src/components/jobs/JobForm.tsx` — kollar om "kommun/myndighet" är hårdkodade alternativ; gör generiska
- `src/components/ui/carousel.tsx`, `src/components/layout/AriaLiveRegion.tsx` — sannolikt "region" som ARIA-roll, inte copy: lämnas

## Vad jag INTE rör

- Funktionalitet, routing, datamodell, RLS-policies
- Svenska ord som "region" / "kommun" i tekniska/ARIA-sammanhang
- Maskoten, färger, layout
- Federation-arkitektur, e-post, domän (nolto.social står kvar)

## Memory

Tar bort/markerar som historiska:
- `public-sector-pivot`, `public-sector-testimonials`
Lägger till core-rule: "Nolto är ett federerat LinkedIn-alternativ — bred yrkespositionering, inte sektorspecifik."

## Frågor

1. **Tagline** — vilken vill du ha på hero?
   - "Det federerade alternativet till LinkedIn"
   - "Ditt professionella nätverk — utan Big Tech"
   - Annat förslag?
2. **Ska jag nämna LinkedIn explicit** i copy (jämförande positionering), eller bara antyda ("öppet alternativ", "federerat professionellt nätverk")?
