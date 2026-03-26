

# Fix /profile och /profile/edit — saknade svenska översättningar

## Problem
1. **Duplicerat `profileEdit`-block i sv.json** — det finns två `profileEdit`-objekt (rad 490 och rad 2159). JSON tillåter inte duplicerade nycklar, så det andra blocket (som bara har `usernameDesc` och `profileSchema`) **överskriver det första** som har alla ~40 nycklar. Detta är orsaken till att `profileEdit.displayName` visas rått.

2. **Saknade nycklar** — många nycklar som koden refererar till finns inte alls i sv.json:
   - `profileEdit.experience.*`: `loading`, `jobTitle`, `jobTitlePlaceholder`, `companyPlaceholder`, `companyDomain`, `companyDomainPlaceholder`, `locationPlaceholder`, `pickDate`, `descriptionPlaceholder`, `noExperience`, `update`, `titleRequired`, `startDateRequired`
   - `profileEdit.education.*`: `loading`, `institutionPlaceholder`, `degreePlaceholder`, `fieldPlaceholder`, `update`, `noEducation`, `delete`
   - `profileEdit.skills.*`: `loading`, `noSkills`
   - `profileEdit.present`, `profileEdit.phonePlaceholder`, `profileEdit.locationPlaceholder`, `profileEdit.contactEmail`, `profileEdit.contactEmailDesc`, `profileEdit.username`, `profileEdit.usernamePlaceholder`
   - `profileEdit.freelance.title`
   - `profileEdit.tabs.freelance`

3. **Helt saknad `freelancer`-sektion i sv.json** — FreelancerSettings.tsx använder ~15 nycklar under `freelancer.*` men ingen av dessa finns i sv.json.

4. **Hårdkodade engelska strängar** i koden:
   - Profile.tsx: `"Sign up to connect"` (2 ställen), `"on Nolto"` i SEO/share
   - ProfileEdit.tsx: `"Experience #"`, `"Education #"`, `"Institution is required"`, `"Degree is required"`, `"Start year is required"`, `"institution"/"degree"/"start year"` i toast, `"e.g. Acme Inc, Freelance, Self-employed"`, `"Job title is required"`, `"Start date is required"`

## Plan

### Steg 1: Slå ihop de duplicerade `profileEdit`-blocken i sv.json
Flytta `usernameDesc` och `profileSchema` från det andra blocket (rad 2159) in i det första blocket (rad 490) och ta bort det andra blocket. Lägg till alla saknade nycklar.

### Steg 2: Lägg till alla saknade `profileEdit`-nycklar
Komplettera med: `username`, `usernamePlaceholder`, `contactEmail`, `contactEmailDesc`, `phonePlaceholder`, `locationPlaceholder`, `present`, `tabs.freelance`, `freelance.title`, plus alla `experience.*`, `education.*`, `skills.*` undernycklar som saknas.

### Steg 3: Lägg till `freelancer`-sektion i sv.json
~15 nycklar: `openForWork`, `visibleToClients`, `notVisible`, `skills`, `addSkill`, `rate`, `ratePlaceholder`, `availability`, `selectAvailability`, `fullTime`, `partTime`, `projectBased`, `notAvailable`, `settingsSaved`, `settingsError`, `dmSuggestion`, `openSettings`, `dmReminder`, `dmReminderDesc`, `checkDmSettings`, `noSkillsYet`.

### Steg 4: Ersätt hårdkodade engelska strängar i Profile.tsx
- `"Sign up to connect"` → `t("profile.signUpToConnect", "Registrera dig för att ansluta")`
- `"on Nolto"` i SEO-description → svenska

### Steg 5: Ersätt hårdkodade engelska strängar i ProfileEdit.tsx
- `"Experience #"` → `Erfarenhet #`
- `"Education #"` → `Utbildning #`
- `"Institution is required"` → `Institution krävs`
- `"Degree is required"` → `Examen krävs`
- `"Start year is required"` → `Startår krävs`
- Valideringsmeddelanden i `saveEducation` toast (`"institution"`, `"degree"`, `"start year"`) → svenska

## Teknisk detalj
- Huvudproblemet är det duplicerade JSON-blocket — att fixa detta löser majoriteten av de "trasiga" strängarna direkt
- Totalt ~60 nya nycklar i sv.json + ~10 hårdkodade strängar att byta i 2 filer
- Ingen databasändring

