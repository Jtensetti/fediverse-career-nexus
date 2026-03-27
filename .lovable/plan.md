

# Kalender på svenska + kvarvarande engelska strängar

## Problem
1. **Kalender (react-day-picker)** visar engelska veckodagar ("Su", "Mo"...) och börjar på söndag istället för måndag
2. **"Posting to your feed"** i PostComposer — nyckeln `posts.postingToFeed` saknas i sv.json
3. **"Fjärrarbete tillåtet"** borde vara **"Distansarbete tillåtet"** i sv.json
4. **FormErrorSummary.tsx** har hårdkodad engelska: "Please fix the following error(s)"
5. **ActionSheet** default cancelLabel = "Cancel"
6. **MonthYearPicker** default placeholder = "Pick a date"

## Åtgärder

### 1. Calendar.tsx — svenska locale + måndag först
Importera `sv` från `date-fns/locale` (react-day-picker stödjer `locale`-prop) och sätt `weekStartsOn: 1`. Ändra `Calendar`-komponenten att skicka `locale={sv}` till DayPicker.

### 2. sv.json — lägg till saknade nycklar
- `posts.postingToFeed`: `"Publicerar i ditt flöde"`
- Ändra `jobs.remoteAllowed`: `"Fjärrarbete tillåtet"` → `"Distansarbete tillåtet"`

### 3. FormErrorSummary.tsx
Byt `"Please fix the following error/errors:"` → `"Vänligen åtgärda följande fel:"`

### 4. ActionSheet — default cancelLabel
Byt `cancelLabel = "Cancel"` → `cancelLabel = "Avbryt"`

### 5. MonthYearPicker — default placeholder
Byt `placeholder = "Pick a date"` → `placeholder = "Välj datum"`

---

**Teknisk detalj**: react-day-picker v8 accepterar `locale`-prop direkt, som automatiskt översätter veckodagar och månadsnamn till svenska och sätter veckostart till måndag.

**6 filer, ~15 ändringar. Ingen databasändring.**

