

# Slutgiltig översättning — alla kvarvarande engelska strängar

## Sammanfattning
Det finns fortfarande **~250+ hårdkodade engelska strängar** i **~25 filer**. Dessa är mestadels i moderationskomponenter, dialograutor, delningskomponenter och LinkedIn-import.

---

## Filer att uppdatera

### Grupp 1: Användarsynliga komponenter (högsta prioritet)

| Fil | Engelska strängar |
|-----|------------------|
| **QuoteRepostDialog.tsx** | "Repost to your profile", "Add your thoughts (optional)...", "Cancel", "Reposting...", "Repost" |
| **SessionExpiryWarning.tsx** | "Session Expiring Soon", "Your session will expire in...", "Dismiss", "Extending...", "Extend Session", toasts |
| **ProfileHoverCard.tsx** | "Profile not found", "Unknown User", "Verified", "{title} at {company}", "{n} connections", "View Profile" |
| **ShareProfileCard.tsx** | "Share Your Profile", "Profile link copied!", "Failed to copy link", "Check out {name}'s profile on Nolto" |
| **ArticlePreviewCard.tsx** | "Unknown Author", datumformat `'MMM d, yyyy'` → sv-SE |
| **PostView.tsx** | "Post not found", "Failed to load post" |
| **PostReplyThread.tsx** | "Failed to delete comment" (fallback) |
| **PollDisplay.tsx** | "Unknown option" |

### Grupp 2: Moderationskomponenter (admin)

| Fil | Engelska strängar |
|-----|------------------|
| **UserBanDialog.tsx** | ~20 strängar: "Ban a user from...", "Search for user", "Search by username or name...", "Already banned", "Selected User", "Change", "Ban Duration", "1 day/3 days/1 week/..." alla SelectItems, "Reason for ban", "Describe why...", "This reason will be logged...", "Cancel", "Banning...", "Ban User" |
| **BannedUsersList.tsx** | ~15 strängar: "Unknown user", "Permanent", "Revoked", "Expired", "{n} left", "Banned {ago}", "Expires/Expired {date}", "Revoke Ban", "Revoke this ban?", "This will immediately restore...", "Cancel", "User Bans", "Active", "History", "No active bans", "No ban history" |
| **FlaggedContentList.tsx** | ~15 strängar: "Flagged Content", "Pending/Reviewed/Resolved/Dismissed/All Reports", "No {status} reports found", "Reported by @{user}", "Content Preview", "Dismiss", "Mark Reviewed", "Delete Content", "Delete this {type}?", "This will permanently delete...", "Cancel", "Delete", "Ban User" |
| **ModeratorManagement.tsx** | ~10 strängar: "Moderation Team", "Add Moderator", "Add New Moderator", "Search for a user to grant...", "Search by username or name...", "Searching...", "Add", "No users found...", "Cancel", "No moderators found", "Remove moderator?", "This will revoke...", "Remove" |
| **ModerationStatsCards.tsx** | "Pending Reports", "Active Bans", "Actions Today", "Moderators" |

### Grupp 3: Admin/tekniska komponenter

| Fil | Engelska strängar |
|-----|------------------|
| **AdminFixSecurityInvoker.tsx** | "Security Invoker Fix", "This utility will update...", "Fix View Security Settings", "Updating views...", "Updated views:", "Note: After running...", toasts |
| **RemoteInstancesTable.tsx** | "Domain status updated", "Failed to update domain status", "An error occurred..." |
| **BatchedFederationStats.tsx** | "Failed to process batches" |

### Grupp 4: LinkedIn Import (hela flödet)

| Fil | Engelska strängar |
|-----|------------------|
| **PreviewStep.tsx** | ~30 strängar: "No data was found in your export...", "Show/Hide details", "CSV files found", "Profile/Positions/Education/Skills/Shares columns:", "Tip: Make sure...", tab-labels "Profile/Work/Education/Skills/Posts", "Import profile info", "Found", alla debug-texter |
| **LinkedInImportButton.tsx** | Eventuella knappar/texter |
| **LinkedInImportModal.tsx** | Steg-texter |
| **InstructionsStep.tsx** | Instruktionstexter |
| **UploadStep.tsx** | Uppladdningstexter |
| **ConfirmStep.tsx** | Bekräftelsetexter |

---

## Plan

### Steg 1: Översätt användarsynliga komponenter (Grupp 1)
Byt alla hårdkodade engelska strängar till svenska i 8 filer. Byt datumformat till `sv-SE` där det behövs.

### Steg 2: Översätt moderationskomponenter (Grupp 2)
Byt alla hårdkodade engelska strängar till svenska i 5 filer (~60 strängar).

### Steg 3: Översätt admin/tekniska komponenter (Grupp 3)
Byt alla strängar till svenska i 3 filer.

### Steg 4: Översätt LinkedIn Import-flödet (Grupp 4)
Byt alla strängar till svenska i 5-6 filer.

## Teknisk detalj
- Direkt svenska strängar (inte i18n-nycklar) i komponenter som redan saknar `useTranslation`, för konsistens
- Där `useTranslation` redan används, lägg till nycklar i sv.json
- Totalt ~25 filer, ~250 strängar
- Ingen databasändring

