

# Pivot Platform Messaging for Public Sector + Swedish Default

## Summary
Rewrite all user-facing marketing/selling language to appeal to public sector organizations (municipalities, government agencies, regions). Remove references to Fediverse, federation, open source ideology, and "freedom" rhetoric. Replace with language about **secure internal communication**, **digital sovereignty**, **GDPR compliance**, **interoperability between agencies**, and **transparent governance**. Make Swedish the default language.

## What Changes

### 1. Set Swedish as Default Language
- **`src/i18n/index.ts`**: Change `lng: "en"` to `lng: "sv"`, import `svTranslation`, add `sv` resource bundle

### 2. Rewrite Swedish Homepage Translations (`src/i18n/locales/sv.json`)
All `homepage.*` keys rewritten with public sector framing:

- **Hero**: "Det professionella nätverket" / "för offentlig sektor" -- "Samla medarbetare, dela kunskap och rekrytera -- på en säker, GDPR-kompatibel plattform byggd för kommuner, regioner och myndigheter."
- **Trust badges**: Replace "ActivityPub" / "Öppen källkod" / "Självhostbar" with "GDPR-säkrad" / "Svensk data" / "Säker inloggning" / "Driftas i Sverige"
- **Features sections**: Reframe around "Tryggt flöde utan algoritmer", "Professionella profiler för offentlig sektor", "Transparent rekrytering inom offentlig sektor"
- **Federation visual**: Reframe as "Så fungerar samverkan" -- connecting municipalities/regions/agencies instead of Mastodon instances
- **FAQ**: Replace Fediverse questions with public sector relevant ones: "Är plattformen GDPR-kompatibel?", "Hur skiljer sig Nolto från LinkedIn?", "Kan vi drifta Nolto själva?", "Hur hanteras personuppgifter?", "Fungerar det med andra organisationer?", "Vad kostar det?"
- **Final CTA**: "Redo att modernisera er interna kommunikation?"
- **Featured In badges**: Replace with "GDPR-kompatibel", "Svensk hosting", "Krypterad kommunikation", "Öppen standard", "Tillgänglig (WCAG)", "Offentlig sektor"
- **Live feed/jobs sections**: Reframe for public sector context
- **Referral**: "Bjud in kollegor" stays, but remove "Fediverse" references
- **Auth welcome**: "Välkommen till Nolto -- Den säkra plattformen för professionellt nätverkande inom offentlig sektor"

### 3. Rewrite English Homepage Translations (`src/i18n/locales/en.json`)
Mirror the same public-sector pivot in English:
- Hero: "The Professional Network for the Public Sector"
- Trust badges: "GDPR Compliant" / "Swedish Hosting" / "Secure Login" / "Hosted in Sweden"
- Features: Government/municipality framing
- FAQ: Public sector relevant questions
- Remove all Fediverse/ActivityPub/federation ideology language

### 4. Update Hardcoded Component Text
- **`src/components/homepage/FeaturedIn.tsx`**: Replace Mastodon/Pleroma/Pixelfed platform list with public sector integrations or remove entirely
- **`src/components/homepage/FederationVisual.tsx`**: Replace instance names (fosstodon.org, mastodon.social) with municipality/agency names (e.g., "kommun.se", "region.se", "myndighet.se")
- **`src/components/Features.tsx`**: Update feature descriptions to public sector language
- **`src/components/CallToAction.tsx`**: Update CTA text
- **`src/components/Hero.tsx`**: Update default props
- **`src/components/homepage/WhyFederated.tsx`**: Change comparison from "Traditional vs Nolto" to reframe benefits for public sector (no Fediverse language)
- **`src/components/homepage/FederationExplainer.tsx`**: Reframe steps for public sector onboarding
- **`src/pages/Mission.tsx`**: Rewrite mission for public sector focus

### 5. Update Auth-Related Translations
- Remove "Fediverse login" references from both `en.json` and `sv.json` auth sections
- Update `auth.welcomeSubtitle` to public sector messaging
- Update `referral.shareText` to remove Fediverse mention

### 6. Update Footer Translations
- `footer.tagline`: "En säker professionell plattform för offentlig sektor" / "A secure professional platform for the public sector"
- `footer.howFederationWorks` -> "Hur samverkan fungerar" / "How Collaboration Works"

## Scope
- ~2 JSON locale files (major rewrites of homepage/auth/footer sections)
- ~8 component files (hardcoded strings and content)
- 1 i18n config file
- No database changes, no backend changes

