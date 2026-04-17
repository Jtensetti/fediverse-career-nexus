

# Anpassningar för svensk offentlig sektor

Jag har gått igenom plattformen. Den är redan långt på väg (svenska som default, "Organisationer" istället för "Företag", testimonials från kommuner, transparens-fokus). Nedan är **små, kirurgiska förändringar** som tydligt signalerar "myndighet/kommun/region" utan att riva upp arkitekturen.

## Vad jag hittade som inte riktigt passar

1. **Branschväljaren för organisationer** är ett fritextfält med hint "Teknik, sjukvård, etc." → privatsektor-doft. Inga förslag som matchar offentlig sektor.
2. **Företagsstorlek** är 1–10, 11–50, …, 10 000+ → tänkt för bolag. En kommun har ~500–10 000 anställda men identifierar sig som "kommun", inte "501–1000".
3. **Onboarding-intressen** (`INTEREST_CATEGORIES`): Design, Engineering, AI, Startups, Open Source… inget om upphandling, samhällsplanering, socialtjänst, e-förvaltning.
4. **Jobbformulär**: fält som `visa_sponsorship` (visumstöd) och valutaval USD/EUR/GBP är märkliga för en svensk kommun. SEK är default men de andra alternativen syns ändå.
5. **Jobbtyp**: "full-time / part-time / contract / internship" → saknar svenska offentliga anställningsformer (tillsvidare, vikariat, projektanställning, allmän visstid, konsultuppdrag, praktik/PRAO).
6. **Erfarenhetsnivåer**: "junior / mid / senior / executive" → offentlig sektor pratar oftare i termer av handläggare, specialist, enhetschef, avdelningschef, förvaltningschef.
7. **Frilansprofil-rubrik** ("Frilanskatalog") signalerar gig-ekonomi. För offentlig sektor är "Konsulter & uppdragstagare" mer rätt språk (men funktionen kan behållas).
8. **Verifieringsbadge** har bara generisk "verifierad" — ingen särskild markering för "verifierad myndighet/kommun/region", trots att det är just det förtroende offentlig sektor behöver.
9. **Starter packs-kategorier** är "community / industry / topic / region" — saknar "förvaltning" / "samhällsområde".

## Förslag (minimal-invasiva, ingen schemaändring krävs)

### 1. Strukturerad organisationstyp istället för fritextbransch
Byt fritext-`industry` mot en **dropdown med svenska offentliga organisationstyper**, men spara fortfarande som text i samma `industry`-kolumn (ingen DB-migration). Förslag på alternativ:

- Kommun
- Region
- Statlig myndighet
- Statligt bolag
- Kommunalt bolag
- Förbund / samverkansorgan
- Universitet & högskola
- Folkhögskola
- Civilsamhälle / ideell organisation
- Privat leverantör till offentlig sektor
- Annat

`CompanySearchFilter` får samma lista som filtervärden → riktigt användbar filtrering.

### 2. Antal anställda anpassat efter offentlig verksamhet
Ersätt `companySizes`-arrayen i `CompanyForm` med spann som är meningsfulla för myndigheter/kommuner: `1–10`, `11–50`, `51–200`, `201–1000`, `1001–5000`, `5001–20 000`, `20 000+`. Sparas som samma `company_size`-enum-strängar — vi använder befintliga värden (`1-10`, `11-50`, `51-200`, `201-500` mappas till `201–1000`, etc.). Jag väljer mappning som inte kräver enum-ändring.

> Kräver ingen DB-ändring: vi bara ändrar etiketterna och vilka enum-värden som visas.

### 3. Onboarding-intressen för offentlig sektor
Byt `INTEREST_CATEGORIES` till områden som speglar offentlig verksamhet. Behåll `id`-formatet så `keywords`-matchningen funkar:

- Samhällsplanering & infrastruktur
- Socialtjänst & omsorg
- Skola & utbildning
- Hälso- & sjukvård
- Digitalisering & e-förvaltning
- Upphandling & inköp
- Säkerhet & krisberedskap
- Hållbarhet & klimat
- HR & kompetensförsörjning
- Ekonomi & styrning

Varje med svenska sökord (t.ex. `["upphandling", "inköp", "loi", "lou"]`).

### 4. Jobbannonser: anpassa fältuppsättning
- **Ta bort** `visa_sponsorship` (eller dölj — sällan relevant inom svensk offentlig sektor som inte själv migrerar utländsk arbetskraft via egen sponsring).
- **Lås valuta** till SEK i UI (fältet finns kvar i DB för bakåtkompatibilitet, men dropdown visar bara SEK).
- **Anställningstyper**: ersätt med svenska offentliga: *tillsvidare, vikariat, allmän visstid, projektanställning, konsultuppdrag, praktik/PRAO, säsongsanställning*.
- **Erfarenhetsnivåer**: ersätt med *handläggare, specialist, gruppledare/teamledare, enhetschef, avdelningschef, förvaltnings-/myndighetschef*.
- **Nytt valfritt fält "Diarienummer / Referens"** (lagras i befintliga `description` eller via prefix i titeln — **ingen schemaändring**, bara ett UI-fält som auto-prependerar "Dnr: XXX-YYY · " i titel eller läggs först i description).

### 5. Verifieringsbadge för offentlig aktör
Lägg till en visuell variant av `VerificationBadge` med text "Verifierad myndighet" / "Verifierad kommun" / "Verifierad region" baserat på `companies.industry` när `verified_at` är satt. Ingen ny kolumn behövs — vi härleder texten från typen.

### 6. Språk- & terminologi-justeringar i `sv.json`/`en.json`
Småjusteringar med stor effekt — håller 1:1-paritet:

- "Frilansare" → "Konsulter & uppdragstagare" (rubriker; URL `/freelancers` kvar för bakåtkompatibilitet)
- "Skills" på profil → "Kompetenser & sakområden"
- "Branding" / "Tagline" på org-form → "Verksamhetsidé"
- "Jobb" → behåll, men subtitel: "Lediga tjänster inom svensk offentlig sektor"
- "Posts" / "Inlägg" — komplettera tooltips för formell ton ("Dela ett yrkesinlägg")

### 7. Starter pack-kategorier
Lägg till två kategorier i `categoryColors`-mappen + locale: **"förvaltning"** (för t.ex. "Sveriges socialchefer") och **"samhällsområde"** (för t.ex. "Skolutveckling Sverige"). Befintliga packs påverkas inte.

### 8. Profilrubrik-mall för offentlig sektor (litet plus)
I `ProfileEdit` lägg till en knapp "Använd förvaltningsmall" som föreslår format "*[Roll] · [Förvaltning] · [Kommun/Myndighet]*", t.ex. "Enhetschef · Socialförvaltningen · Lunds kommun". Bara en ifyllningshjälp — ingen ny logik.

## Vad jag medvetet INTE rör
- Ingen ändring av databasschema, RLS, edge functions eller federation.
- Ingen ändring av routing (`/organisationer`, `/jobs`, `/freelancers` består).
- Ingen ändring av Fediverse-protokollet (jobb skickas fortfarande som ActivityPub `Article`).
- Ingen ändring av MFA/auth/säkerhet.
- Ingen ändring av befintliga starter packs, postar, eller företagsdata.

## Filer som påverkas (uppskattning)

- `src/services/misc/onboardingRecommendationService.ts` — INTEREST_CATEGORIES
- `src/components/company/CompanyForm.tsx` — industry dropdown, sizes
- `src/components/company/CompanySearchFilter.tsx` — industry-filter blir dropdown
- `src/components/jobs/JobForm.tsx` — anställningstyper, valuta-lock, ta bort visa
- `src/services/misc/jobPostsService.ts` — typdefinitioner för nya enum-strängar (bara TS, sparas som text)
- `src/components/social/VerificationBadge.tsx` — variant för myndighet/kommun/region
- `src/components/social/StarterPackCard.tsx` — två nya färger för kategorier
- `src/i18n/locales/sv.json` + `en.json` — terminologi och nya nycklar (1:1-paritet)
- `src/components/profile/ProfileEdit*` — valfri mallknapp

Allt är bakåtkompatibelt — gamla data fortsätter fungera, nya formulär ger den offentliga känslan.

