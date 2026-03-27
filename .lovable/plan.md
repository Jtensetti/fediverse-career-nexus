

# Förbättra anpassade flöden (Custom Feeds)

## Problem
1. Både "Skapa anpassat flöde" och "Hantera flöden" i filter-dropdownen pekar till `/settings/feeds` — men den sidan hanterar bara generella flödesinställningar (standardflöde, dolda ord, reposts). Det finns ingen UI för att skapa/redigera custom feeds.
2. `FeedRules`-modellen har redan stöd för taggar, nyckelord och användare, men det saknas UI för att konfigurera dessa regler — och det saknas stöd för organisationer/företag.

## Plan

### 1. Utöka FeedRules-typen
Lägg till `include_companies?: string[]` i `FeedRules`-interfacet i `feedPreferencesService.ts` så att man kan filtrera på organisationer/företag.

### 2. Skapa en CreateCustomFeed-dialog (ny komponent)
**`src/components/social/CreateCustomFeedDialog.tsx`**

En dialog/sheet som öppnas direkt från filter-dropdownen (istället för att navigera iväg). Innehåller:
- **Namn** och valfri **beskrivning**
- **Intressen/taggar** — multi-select med fritext-input (chips), använder befintliga `INTEREST_CATEGORIES` som förslag
- **Organisationer** — sökbar autocomplete som söker i `companies`-tabellen
- **Specifika personer** — sökbar autocomplete som söker i `public_profiles`
- **Nyckelord** — fritext-chips (include/exclude)

Sparar via befintlig `createCustomFeed()` i feedPreferencesService.

### 3. Skapa en ManageCustomFeeds-dialog (ny komponent)
**`src/components/social/ManageCustomFeedsDialog.tsx`**

Listar användarens custom feeds med möjlighet att:
- Redigera (öppnar CreateCustomFeed i edit-läge)
- Ta bort (med bekräftelse)
- Ändra ordning (drag eller upp/ner-knappar)

### 4. Uppdatera FeedSelector
- "Skapa anpassat flöde" öppnar `CreateCustomFeedDialog` direkt (ingen navigation)
- "Hantera flöden" öppnar `ManageCustomFeedsDialog` direkt
- Uppdatera listan efter skapa/redigera/ta bort

### 5. Uppdatera FederatedFeed-komponenten
När ett custom feed är valt (feedType = custom feed id):
- Läs flödets `rules` från state
- Filtrera posts client-side baserat på reglerna: matcha taggar, nyckelord, specifika user_ids och company_ids

### 6. Inga databasändringar behövs
`custom_feeds`-tabellen finns redan med `rules` som JSONB. Vi utökar bara vad som läggs i `rules`.

---

## Teknisk detalj

**Filer som skapas:**
- `src/components/social/CreateCustomFeedDialog.tsx` — dialog med formulär för namn, taggar, personer, organisationer, nyckelord
- `src/components/social/ManageCustomFeedsDialog.tsx` — lista + redigera/ta bort

**Filer som ändras:**
- `src/services/misc/feedPreferencesService.ts` — lägg till `include_companies` i `FeedRules`
- `src/components/social/FeedSelector.tsx` — byt `<a href>` till dialog-triggers, lägg till state för dialogerna
- `src/components/federation/FederatedFeed.tsx` — client-side filtrering när custom feed är aktivt

