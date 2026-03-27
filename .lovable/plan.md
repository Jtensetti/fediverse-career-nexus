

# Byt "Företag" → "Organisation" överallt, inklusive URL:er

## Sammanfattning
Byta terminologi från "företag/company" till "organisation" i hela appen: URL:er, synlig text, i18n-nycklar och navigering. Databasens tabellnamn (companies, company_roles etc.) behålls oförändrade — det är bara den yttre ytan som ändras.

## Steg 1: Ändra URL-rutter i App.tsx
- `/companies` → `/organisationer`
- `/companies/create` → `/organisationer/skapa`
- `/company/:slug` → `/organisation/:slug`
- `/company/:slug/edit` → `/organisation/:slug/redigera`
- `/company/:slug/admin` → `/organisation/:slug/admin`
- Lägg till redirects från gamla URL:er för eventuella bokmärken

## Steg 2: Uppdatera alla interna länkar (~10 filer)
Alla `Link to=` och `navigate()` som pekar på `/companies` eller `/company/` måste uppdateras:

| Fil | Ändringar |
|-----|-----------|
| `Navbar.tsx` | href: `/companies` → `/organisationer` |
| `CompanyCard.tsx` | `/company/${slug}` → `/organisation/${slug}` |
| `CompanyHeader.tsx` | admin/edit-länkar |
| `CompanyPostCard.tsx` | företagslänkar |
| `CompanyCreate.tsx` | navigate + tillbaka-länk |
| `CompanyEdit.tsx` | navigate + tillbaka-länk |
| `CompanyAdmin.tsx` | navigate + tillbaka-länk |
| `CompanyProfile.tsx` | "browse all"-länk |
| `Companies.tsx` | create-länk |
| `CommentPreview.tsx` | profilkoppling |
| `FederatedPostCard.tsx` | företagslänkar |

## Steg 3: Uppdatera sv.json — byt alla "företag"-strängar till "organisation"
~40 strängar att ändra, t.ex.:
- `nav.companies`: "Företag" → "Organisationer"
- `companies.title`: "Företag" → "Organisationer"
- `companies.subtitle`: "Upptäck och följ företag" → "Upptäck och följ organisationer"
- `companyForm.companyName`: "Företagsnamn" → "Organisationsnamn"
- `companyHeader.companySize`: "företagsstorlek" → "organisationsstorlek"
- `companyForm.companyDetails`: "Företagsdetaljer" → "Organisationsdetaljer"
- Alla liknande i `companyPost`, `companyImage`, `companyFollow`, `companyAdmin`, `jobForm` etc.

## Steg 4: Uppdatera en.json med engelska motsvarigheter
Samma nycklar, men "Company" → "Organisation" på engelska.

## Steg 5: Hårdkodade strängar
- `CompanyCard.tsx`: "följare" (redan svensk men kontexten "företag" kan finnas)
- `FederatedPostCard.tsx`: `postCard.companyPage` → behöver uppdateras i sv.json
- `nav.companyPage` i sv.json: "Företagssida" → "Organisationssida"

---

## Teknisk detalj
- **Databas ändras INTE** — tabeller heter fortfarande `companies`, `company_roles` etc.
- **Filnamn ändras INTE** — `CompanyCard.tsx`, `companyService.ts` etc. behåller sina namn
- Bara URL-rutter (App.tsx) och synlig text (i18n + hårdkodade strängar) ändras
- ~12 komponentfiler + 2 i18n-filer
- Redirects från gamla URL:er för bakåtkompatibilitet

