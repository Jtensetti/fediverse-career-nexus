

# Fullständig översättning av alla kvarvarande engelska strängar

## Sammanfattning
Efter genomgång av hela kodbasen finns det fortfarande ~500+ hårdkodade engelska strängar i ~35 filer. Dessa inkluderar toast-meddelanden i tjänster, formuläretiketter, valideringsfel, sidrubriker, SEO-titlar, aria-labels, och hela sidor (Documentation, ConfirmEmail, TermsOfService, PrivacyPolicy).

## Filer att uppdatera

### Batch 1: Formulär (JobForm, EventForm)
**`src/components/JobForm.tsx`** -- ~40 strängar: alla FormLabel, placeholders, select-alternativ, FormDescription, sektionsrubriker ("Compensation", "Transparency Details"), knappar ("Cancel", "Create Job Post"), valideringsmeddelanden i Zod-schemat
**`src/components/EventForm.tsx`** -- ~35 strängar: alla FormLabel, placeholders, visibility-alternativ ("Public", "Connections Only", "Private"), sektionsrubriker ("Event Details", "Date & Time", "Location", "Capacity", "Privacy & Visibility"), Zod-valideringsmeddelanden, knappar

### Batch 2: Tjänster med toast-meddelanden
**`src/services/connectionsService.ts`** -- ~20 toast-meddelanden ("Connection request sent", "Connection accepted", etc.)
**`src/services/jobMessagingService.ts`** -- 4 toast-meddelanden
**`src/services/profileService.ts`** -- 2 toast-meddelanden
**`src/services/companyService.ts`**, **`src/services/eventService.ts`**, **`src/services/articleService.ts`** -- alla toast-meddelanden

### Batch 3: Sidor med mycket hårdkodad text
**`src/pages/JobView.tsx`** -- ~30 strängar: "Job not found", "Browse Jobs", "Back to Jobs", "Job Description", "Required Skills", "Hiring Details", "Interview Process", "Response Time", "Team Size", "Growth Path", "Visa Sponsorship", "How to Apply", "Apply Now", "Save Job", "Compensation", "Loading job details...", "Posted", "Location not specified", "Salary not specified", "Up to", "Available", "Not available", plus JobTypeLabels-objektet
**`src/pages/Profile.tsx`** -- ~15 strängar: "Sign up to connect" (2x), "Activity" (rubrik), "Connections" (rubrik), "Connections are hidden", "No connections yet", "View All Connections", "Follow for Articles", "Failed to update header image", SEO-description fallback
**`src/pages/Messages.tsx`** -- 2 strängar: SEOHead title "Messages", "Unknown User"
**`src/pages/Connections.tsx`** -- Duplicerat TabsContent (rad 305-367) med helt hårdkodade strängar -- ska tas bort (det lokaliserade blocket finns redan rad 241-303)
**`src/pages/ArticleEdit.tsx`** -- ~15 strängar: "Edit Article", "Search users by name...", placeholders, knappar
**`src/pages/ArticleCreate.tsx`** -- ~10 strängar: placeholders, knappar
**`src/pages/Instances.tsx`** -- ~10 strängar: "Federated Instances", "Visit Instance"
**`src/pages/Documentation.tsx`** -- Hela sidan (~100 rader) med hårdkodad engelsk text. Bör skrivas om till svenska med t()-anrop
**`src/pages/ConfirmEmail.tsx`** -- ~10 strängar: "Confirmation Failed", "Link Expired", statusmeddelanden
**`src/pages/AuthCallback.tsx`** -- ~5 strängar: "Authentication Failed"

### Batch 4: Komponenter
**`src/components/Navbar.tsx`** -- 3 strängar: "Successfully logged out", "Error signing out", "Instance Management"
**`src/components/CoverImageUpload.tsx`** -- 4 toast-meddelanden
**`src/components/ProfileImageUpload.tsx`** -- toast-meddelanden
**`src/components/editor/LinkInsertSheet.tsx`** -- 2 placeholders
**`src/components/moderation/UserLookup.tsx`** -- 1 placeholder
**`src/components/AppScreenshot.tsx`** -- Engelska exempelnamn ("Sarah Chen", "Marcus Weber")
**`src/components/PostComposer.tsx`** -- placeholders och knappar
**`src/components/GlobalSearch.tsx`**, **`src/components/MobileSearch.tsx`** -- placeholders

### Batch 5: ProfileEdit resterande
**`src/pages/ProfileEdit.tsx`** -- ~10 strängar: "Institution is required", "Degree is required", "Start year is required", "Saved" (rad 1069), "Username is already taken", "You must be logged in to edit your profile", "Failed to load profile", "You need to be signed in to add experience/education/skill", Zod-valideringsmeddelanden i profileSchema, "Fediverse identity" i usernameDesc
**`src/pages/Auth.tsx`** -- 3 placeholders: "Firstname", "Surname", "your_username"; och `@username@nolto.social`

### Batch 6: Juridiska sidor
**`src/pages/TermsOfService.tsx`** -- Hela sidan med engelska juridiska texter
**`src/pages/PrivacyPolicy.tsx`** -- Hela sidan med engelska juridiska texter

## Genomförande

### Steg 1: Lägg till ~200 nya nycklar i sv.json och en.json
Nya sektioner:
- `jobView.*`, `eventFormLabels.*`, `jobFormLabels.*`
- `confirmEmail.*`, `documentation.*`, `authCallback.*`
- `instances.*`, `articleCreate.*`, `articleEditPage.*`
- `coverImage.*`, `profileImage.*`, `linkInsert.*`
- `toasts.*` (gemensamma toast-meddelanden för tjänster)

### Steg 2: Uppdatera tjänstefiler
Importera `i18n` (inte `useTranslation` -- tjänster är inte React-komponenter) eller flytta toast-anropen till komponenterna. Enklast: använd `i18next.t()` direkt i tjänsterna.

### Steg 3: Uppdatera alla sidor och komponenter med t()-anrop

### Steg 4: Ta bort duplicerat block i Connections.tsx (rad 305-367)

### Steg 5: Skriv om Documentation.tsx helt till lokaliserad version

### Steg 6: Uppdatera Zod-scheman med svenska valideringsmeddelanden (flytta in i komponenterna eller använd statiska svenska strängar)

## Teknisk detalj
- Tjänstefiler (services/*.ts) kan inte använda `useTranslation()` -- importera `i18n` från `@/i18n` och använd `i18n.t()`
- Zod-scheman som definieras utanför komponenter behöver antingen flyttas in eller använda statiska strängar
- `JobTypeLabels` i JobView.tsx och liknande objekt behöver lokaliseras
- Totalt ~35 filer, ~200 nya locale-nycklar

