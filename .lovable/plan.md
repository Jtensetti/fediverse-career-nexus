

# Slutgiltig översättning — alla kvarvarande engelska strängar

## Sammanfattning
Efter genomgång av hela kodbasen finns det fortfarande **~200+ hårdkodade engelska strängar** i **~20 filer** — mestadels i tjänster (services), admin-sidor och vissa komponenter som missades i tidigare omgångar.

---

## Filer att uppdatera

### Tjänster (services) — engelska toasts

| Fil | Strängar att översätta |
|-----|----------------------|
| `src/services/messageService.ts` | ~15 st: "You must be logged in to view conversations/messages/send", "Failed to load conversations/messages", "You can only message users you are connected with", "You cannot message yourself", "Cannot send message to this user", "Failed to send message", "Message saved but delivery to remote server failed", "Failed to deliver message", "Message sent to federated user" |
| `src/services/messageRequestService.ts` | ~8 st: "You must be logged in", "You cannot send a request to yourself", "This user is not accepting messages", "You can message this person directly", "You already have a pending request", "Your previous request was declined" |
| `src/services/connectionsService.ts` | ~5 st: "Failed to load connections/suggestions", "You must be logged in to connect", "You can't connect with yourself" |
| `src/services/jobPostsService.ts` | ~8 st: "You must be logged in to create a job post", "Failed to create/update/delete job post", "Job post updated/deleted successfully" |
| `src/services/starterPackService.ts` | ~12 st: "You must be logged in to follow/create a pack", "Failed to follow/unfollow/create pack", "Starter pack created!", "Unfollowed pack", "User is already in this pack", "Failed to add/remove member", "A pack with this URL already exists" |
| `src/services/postBoostService.ts` | ~6 st: "You must be logged in to boost posts", "Actor not found", "Boost removed", "Post boosted", "Failed to process boost" |
| `src/services/postReplyService.ts` | 3 kvar: "Actor not found", "Reply posted successfully!", "An unexpected error occurred" |
| `src/services/profileEditService.ts` | 3 kvar: "You must be logged in to update your profile" (rad 196), "Profile and actor created successfully", "Profile updated but actor creation failed" |
| `src/services/postService.ts` | 2 kvar: "Failed to update username", "Failed to create user actor" |
| `src/services/profileService.ts` | 1 kvar: "Failed to load profile data" |

### Sidor (pages) — engelska toasts och strängar

| Fil | Strängar |
|-----|----------|
| `src/pages/ProfileEdit.tsx` | 2 st: "You need to be signed in to add education/skill" |
| `src/pages/JobManage.tsx` | 1 st: "Please sign in to manage job posts" |
| `src/pages/AdminFederationHealth.tsx` | ~6 st: "Failed to load health data", "Data refreshed", "Cleanup failed", "Cache pre-warm failed", "Alert acknowledged", "Failed to acknowledge alert" |
| `src/pages/AdminFederationMetrics.tsx` | ~4 st (toast-objekt): "Error checking admin status", "Access denied", "Admin access granted", "Error" |
| `src/pages/Moderation.tsx` | 3 st: "Failed to verify admin/moderator/user permissions" |
| `src/pages/MessageConversation.tsx` | 2 st (toast-objekt): "Connection issue", "Failed to send message" |
| `src/pages/ArticleManage.tsx` | 1 st: placeholder "Search articles..." |

### Komponenter — engelska strängar

| Fil | Strängar |
|-----|----------|
| `src/components/DomainModeration.tsx` | ~20 st: alla toasts ("Domain Added/Updated/Removed", "Update/Deletion Failed"), labels ("Add Domain Moderation", "Domain Host", "Status", "Reason"), placeholders, status badges ("Blocked", "Probation", "Normal"), dialog-texter |
| `src/components/ServerKeyInitializer.tsx` | ~6 st: "Server Key Management", "Checking server key status...", "Server has a valid RSA key pair", "No server key found", "Server key created successfully" |
| `src/components/MonthYearPicker.tsx` | 1 st: "Select Year" |
| `src/components/ModerationActionDialog.tsx` | 1 st: placeholder "Search by username or ID" |
| `src/components/homepage/Testimonials.tsx` | Hela filen: engelska citat, namn, titlar, rubrik — byt till svenska offentlig sektor-citat |
| `src/components/homepage/EnhancedTestimonials.tsx` | Alla citat, roller, handles — byt till svenska offentlig sektor-exempel |
| `src/components/company/CompanyForm.tsx` | ~6 st: placeholders "Acme Corporation", "acme-corp", "Building the future of...", "Tell people about your company...", "Technology, Healthcare, etc.", "San Francisco, CA" |
| `src/components/editor/EditorToolbar.tsx` | ~12 aria-labels: "Bold", "Italic", "Strikethrough", "Text style", "Insert link", "Block quote", "Code block", "Insert", "Lists", "Undo", "Hide keyboard" |
| `src/pages/AdminFederationHealth.tsx` | "X minutes" — behöver formateras på svenska |

---

## Genomförande

### Steg 1: Översätt alla tjänster (~60 strängar)
Byt alla engelska toast-strängar i 10 tjänstefiler till svenska (direkt hårdkodade strängar, inte i18n-nycklar — följer samma mönster som redan finns i de nyligen översatta tjänsterna).

### Steg 2: Översätt alla sidor (~15 strängar)
Byt engelska toasts/placeholders i 6 sidfiler.

### Steg 3: Översätt alla komponenter (~45 strängar)
Uppdatera DomainModeration, ServerKeyInitializer, MonthYearPicker, ModerationActionDialog, CompanyForm, EditorToolbar aria-labels.

### Steg 4: Skriv om Testimonials till svenska offentlig sektor
Byt engelska tech-citat till svenska kommuner/regioner/myndigheter i både Testimonials.tsx och EnhancedTestimonials.tsx.

## Teknisk detalj
- Totalt ~20 filer, ~200 strängar
- Ingen databasändring
- Följer samma mönster som redan etablerats: direkt svenska strängar i tjänster, `t()` i komponenter där `useTranslation` redan finns

