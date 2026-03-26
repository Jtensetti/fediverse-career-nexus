

# Fullständig svensk översättning — alla kvarvarande engelska strängar

## Sammanfattning
Det finns fortfarande **~600+ hårdkodade engelska strängar** spridda över **~45 filer** — sidor, komponenter och tjänster. Planen täcker allting uttömmande.

---

## Batch 1: Hela sidor med engelsktext som behöver skrivas om

| Fil | Beskrivning |
|-----|-------------|
| `src/pages/AuthRecovery.tsx` | ~30 strängar: "Reset Password", "Send Reset Code", "Verify Code", "New Password", alla labels, placeholders, toasts, statusmeddelanden |
| `src/pages/FederationGuide.tsx` | ~100 rader helt på engelska: rubriker, FAQ, benefits, examples — hela sidan |
| `src/pages/HelpCenter.tsx` | ~80 rader: alla FAQ-sektioner ("Getting Started", "Federation", "Privacy & Safety", "Troubleshooting"), SEOHead, rubrik |
| `src/pages/CodeOfConductPage.tsx` | SEOHead, rubrik "Code of Conduct", "Back to Home" |
| `src/components/CodeOfConduct.tsx` | ~150 rader: hela uppförandekoden på engelska — full omskrivning |
| `src/pages/NotFound.tsx` | "Page not found", "Return to Home", SEOHead |
| `src/pages/PostView.tsx` | "Loading Post", "Post Not Found", "Back to Feed" |
| `src/pages/ArticleManage.tsx` | SEOHead "Manage My Articles", placeholder "Search articles..." |
| `src/pages/JobManage.tsx` | toast "Please sign in to manage job posts" |
| `src/pages/ModerationDashboard.tsx` | SEOHead "Moderation Dashboard" |
| `src/pages/AdminFederationHealth.tsx` | ~10 toasts: "Failed to load health data", "Data refreshed", "Alert acknowledged" |
| `src/pages/AdminFederationMetrics.tsx` | SEOHead |
| `src/pages/AdminInstances.tsx` | SEOHead |
| `src/pages/FederatedFeed.tsx` | SEOHead description |
| `src/pages/Notifications.tsx` | SEOHead "Notifications" |
| `src/pages/Index.tsx` | SEOHead "The Federated Professional Network" |
| `src/pages/ProfileEdit.tsx` | Kvarvarande toasts: "You need to be signed in to add education/skill" |

## Batch 2: Komponenter med mycket engelska

| Fil | Strängar |
|-----|----------|
| `src/components/onboarding/OnboardingFlow.tsx` | **~60 strängar**: "Welcome to Nolto!", "Tell us about yourself", alla labels (Full Name, Professional Headline, Bio, Current Role, Company), alla placeholders, "What are you interested in?", "Discover People to Follow", "You're all set!", "Explore the Feed", "Find Connections", "Browse Jobs", knappar (Let's Go, Continue, Skip, Back, Done, Saving...) |
| `src/components/DeleteAccountSection.tsx` | ~15 strängar: "Delete Account", "This will permanently delete:", alla listpunkter, checkbox-text, "Type DELETE to confirm", dialog "Are you absolutely sure?", knappar |
| `src/components/DataExportSection.tsx` | 3 toast-meddelanden kvar på engelska |
| `src/components/IntroTemplateSelector.tsx` | Alla meddelandemallar: "Mutual Connection", "About a Post", "Event Connection", "Collaboration" |
| `src/components/VerificationRequest.tsx` | "Token copied!", "Generate Verification Token", dialog-beskrivningar |
| `src/components/BlockUserDialog.tsx` | placeholder "Why are you blocking this user?", toast |
| `src/components/ContentWarningInput.tsx` | "Add content warning", placeholder "e.g., politics, spoilers, food..." |
| `src/components/ArticleEditor.tsx` | placeholder "Write your article...", "Enter image URL:", toast "Editor not ready" |
| `src/components/editor/TipTapEditor.tsx` | placeholder "Write your article..." |
| `src/components/FederationInfo.tsx` | "Fediverse Handle", "Find your profile on another instance", "Open on instance", "Key Fingerprint" |
| `src/components/FederationAnalytics.tsx` | ~20 strängar: "Total Requests", "Success Rate", "Host Metrics", "Failures", "Loading metrics...", tabellrubriker |
| `src/components/RecommendationsSection.tsx` | ~8 toasts: "Please write a recommendation", "Recommendation sent!", "Recommendation approved!", etc. |
| `src/components/common/SaveButton.tsx` | "Please sign in to save items", "Failed to save item" |
| `src/components/common/ShareButton.tsx` | "Link copied to clipboard!", "Failed to copy link" |
| `src/components/common/ReportDialog.tsx` | placeholder "Provide any additional context..." |
| `src/components/SavedItemsList.tsx` | "Item removed from saved", "Failed to remove item" |
| `src/components/AlertManager.tsx` | ~8 toasts: "Alert created", "Alert updated", "Alert deleted", "Message is required", placeholder "Enter alert message..." |
| `src/components/PostEditDialog.tsx` | "Post updated" toast |
| `src/components/EmailNotificationPreferences.tsx` | "You must be logged in", "Failed to update preferences" |
| `src/components/ActorModeration.tsx` | Labels "Actor URL", "Reason", placeholders, "Select status" |
| `src/components/AccountMigrationSection.tsx` | Kvarvarande placeholders |
| `src/components/NewsletterSubscribe.tsx` | placeholder "your@email.com" |
| `src/components/onboarding/InterestSelector.tsx` | Intressekategorier (om hårdkodade) |
| `src/components/onboarding/ProfileCompleteness.tsx` | Eventuella engelska strängar |
| `src/components/onboarding/SuggestedActions.tsx` | Eventuella engelska strängar |

## Batch 3: Tjänster (services) med engelska toasts

| Fil | Antal strängar |
|-----|---------------|
| `src/services/moderationService.ts` | ~20: "You must be logged in", "Failed to update report", "Ban revoked successfully", "Moderator role added/removed", "Content deleted successfully", "Warning sent to user" |
| `src/services/reactionsService.ts` | ~15: "Please sign in to react", "Failed to process/add/remove/update reaction" |
| `src/services/postService.ts` | ~10: "You must be logged in to create a post", "Profile not found", "Failed to upload image", "Post created successfully!", "An unexpected error occurred" |
| `src/services/postReplyService.ts` | 1: "You don't have permission to reply as this company" |
| `src/services/pollService.ts` | ~5: "You must be logged in to vote", "Vote submitted!", "Failed to submit/vote" |
| `src/services/profileEditService.ts` | ~8: "Profile updated successfully", "Failed to update profile", "You must be logged in to upload an avatar" |
| `src/services/profileService.ts` | 1: "Failed to load profile data" |
| `src/services/newsletterService.ts` | ~6: "Error subscribing to newsletter", "Successfully subscribed", etc. |

## Batch 4: Aria-labels (lägre prioritet men bör göras)
Engelska aria-labels i `EditorToolbar.tsx`, `RichTextToolbar.tsx`, `FreelancerBadge.tsx`, `MobileBottomNav.tsx`, `MessageReactions.tsx`, `ShareProfileCard.tsx` — totalt ~25 strängar.

---

## Genomförande

### Steg 1: Lägg till ~300 nya nycklar i `sv.json` och `en.json`
Nya sektioner: `authRecovery`, `helpCenter`, `codeOfConduct`, `federationGuide`, `notFound`, `postView`, `onboarding`, `deleteAccount`, `introTemplates`, `verification`, `blockUser`, `contentWarning`, `recommendations`, `alertManager`, `actorModeration`, `newsletter`, `moderation` (toasts), `reactions` (toasts), `posts` (toasts), `poll`, `profileEditToasts`, `ariaLabels`

### Steg 2: Uppdatera alla sidor (Batch 1) med `useTranslation` och `t()` anrop

### Steg 3: Uppdatera alla komponenter (Batch 2) med `t()` anrop

### Steg 4: Uppdatera alla tjänster (Batch 3) med `i18n.t()` (importera `i18n` från `@/i18n`)

### Steg 5: Uppdatera aria-labels (Batch 4)

## Teknisk detalj
- Tjänstefiler använder `import i18n from "@/i18n"` + `i18n.t()`
- Komponenter använder `useTranslation()` + `t()`
- Totalt ~45 filer, ~300 nya locale-nycklar
- Ingen databasändring, inga backend-ändringar

