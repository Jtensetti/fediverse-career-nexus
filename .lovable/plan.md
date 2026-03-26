

# Översätt alla kvarvarande engelska strängar till svenska

## Sammanfattning
Det finns hundratals hårdkodade engelska strängar spridda över ~40+ filer (sidor, komponenter, formulär, toast-meddelanden, validering). Alla behöver antingen ersättas med `t()` anrop mot befintliga nycklar i `sv.json`, eller nya nycklar behöver läggas till i båda locale-filerna.

## Omfattning — Kategorier av kvarvarande engelsk text

### 1. Toast-meddelanden (~140 instanser i 15 filer)
Filer som `EventCreate.tsx`, `FeedSettings.tsx`, `StarterPackCreate.tsx`, `EventView.tsx`, `FederatedPostCard.tsx`, `CommentPreview.tsx`, `FollowAuthorButton.tsx`, `DMPrivacySettings.tsx`, `ArticleReactions.tsx`, `SavedItems.tsx`, m.fl. har alla `toast.success('...')` och `toast.error('...')` med engelsk text.

### 2. Formuläretiketter, placeholders & validering (~200+ instanser)
- **`JobForm.tsx`**: "Job Title *", "Company Name *", "Location *", "Employment Type", "Remote Policy", "Full-time", "Part-time", "Contract", placeholders ("e.g. Senior Frontend Developer"), select-alternativ
- **`EventForm.tsx`**: Valideringsmeddelanden ("Title must be at least 3 characters"), synlighetsalternativ ("Public", "Connections Only", "Private")
- **`ArticleEdit.tsx`**: "Search users by name...", "Saving...", "Update Article", placeholders
- **`StarterPackCreate.tsx`**: "Pack Name *", "URL Slug *", "Description", "Category", "Cancel", "Creating..."
- **`CompanyForm.tsx`**, **`CompanyEmployeeForm.tsx`**: Formulärfält
- **`PostReplyDialog.tsx`**: "Write your reply..."
- **`CommentEditDialog.tsx`**: "Edit your comment..."
- **`JobInquiryButton.tsx`**: "Write your message..."
- **`RemoteInstancesTable.tsx`**: "Provide a reason for..."
- **`AccountMigrationSection.tsx`**: Mastodon-relaterade placeholders

### 3. Sidrubriker & beskrivningar (~30+ instanser)
- **`EventCreate.tsx`**: "Create Event", beskrivningstext
- **`Search.tsx`**: "Search", "Find people, jobs, articles, and events"
- **`SavedItems.tsx`**: "No saved items yet", "Save jobs, articles..."
- **`StarterPacks.tsx`**: "Starter Packs", "Featured Packs", "No packs found"
- **`StarterPackView.tsx`**: "Pack not found"
- **`StarterPackCreate.tsx`**: "Create a Starter Pack", "Sign in required", "Back to Packs"
- **`ArticleView.tsx`**: "Article not found"
- **`CompanyCreate.tsx`**: Fallback-text
- **`InstanceGuidelinesPage.tsx`**: "Instance Guidelines", "Back to Home"
- **`ProfileEdit.tsx`**: Valideringsfel ("Institution is required", "Degree is required", "Start year is required")

### 4. Komponentspecifik text
- **`AppScreenshot.tsx`**: Namn som "Sarah Chen", "Marcus Weber" — byt till svenska namn
- **`FederatedPostCard.tsx`**: aria-labels ("Post options", "Boost post", "Remove boost", "Read more")
- **`EditorToolbar.tsx`**: aria-labels ("Text style", "Insert link", "Block quote", "Code block", "Hide keyboard")
- **`ContentGate.tsx`**: Engelsk text
- **`ModerationHeader.tsx`**: Redan lokaliserad men kontrollera fallbacks

### 5. SEOHead-titlar
- Flera sidor har engelska titlar i `<SEOHead>`: "Search | Nolto", "Create Starter Pack", etc.

## Genomförande

### Steg 1: Utöka `sv.json` och `en.json`
Lägg till ~150 nya översättningsnycklar i båda filerna, organiserade under befintliga sektioner plus nya:
- `savedItems.*` — Sparade objekt
- `starterPacks.*` — Startpaket
- `search.*` — Sök
- `jobForm.*` — Jobbformulär
- `eventForm.*` — Evenemangsformulär
- `articleEdit.*` — Artikelredigering
- `toasts.*` — Gemensamma toast-meddelanden
- `validation.*` — Valideringsmeddelanden
- `ariaLabels.*` — Tillgänglighetsetiketter

### Steg 2: Uppdatera sidorna (~15 filer)
Ersätt alla hårdkodade strängar med `t()` anrop:
- `EventCreate.tsx`, `Search.tsx`, `SavedItems.tsx`, `StarterPacks.tsx`, `StarterPackCreate.tsx`, `StarterPackView.tsx`, `ArticleView.tsx`, `ArticleEdit.tsx`, `CompanyCreate.tsx`, `InstanceGuidelines.tsx (page)`, `FeedSettings.tsx`, `ProfileEdit.tsx` (valideringsfel), `EventView.tsx`, `JobCreate.tsx`

### Steg 3: Uppdatera komponenterna (~15 filer)
- `JobForm.tsx`, `EventForm.tsx`, `FederatedPostCard.tsx`, `CommentPreview.tsx`, `PostReplyDialog.tsx`, `CommentEditDialog.tsx`, `JobInquiryButton.tsx`, `EditorToolbar.tsx`, `AppScreenshot.tsx`, `FollowAuthorButton.tsx`, `DMPrivacySettings.tsx`, `ArticleReactions.tsx`, `ContentGate.tsx`, `RemoteInstancesTable.tsx`, `AccountMigrationSection.tsx`

### Steg 4: Uppdatera Zod-valideringsscheman
`EventForm.tsx` och eventuellt `JobForm.tsx` har Zod-scheman med engelska felmeddelanden — dessa behöver ändras till svenska strängar.

## Teknisk detalj
- Alla filer som inte redan importerar `useTranslation` behöver importera den
- Zod-valideringsmeddelanden kan inte enkelt använda `t()` (de initieras utanför komponenter), så flytta schemat inuti komponenten eller använd statiska svenska strängar
- Totalt ~30 filer att redigera, ~150 nya locale-nycklar

