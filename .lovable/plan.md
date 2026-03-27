

# Slutgiltig granskning — kvarvarande engelska strängar

## Sammanfattning
Två huvudproblem kvarstår:

1. **`formatDistanceToNow` utan `locale: sv`** i **13 filer** — producerar engelska tidsangivelser som "5 minutes ago" istället för "5 minuter sedan"
2. **Hårdkodade engelska strängar** i **~5 filer** som inte använder `t()` eller har direkta engelska strängar

Dessutom: alla `t()`-anrop har redan engelska fallbacks, så en "byt till engelska"-knapp fungerar redan via `LanguageSwitcher` — men `en.json` saknar troligen nycklar som lagts till i `sv.json` under översättningsarbetet.

---

## Steg 1: Lägg till `locale: sv` i alla `formatDistanceToNow`-anrop (13 filer)

Dessa filer saknar `locale: sv` och visar engelska datum:

| Fil |
|-----|
| `src/components/CommentPreview.tsx` |
| `src/components/ArticleCard.tsx` |
| `src/components/MessageRequestCard.tsx` |
| `src/components/ModerationLog.tsx` |
| `src/components/NotificationBell.tsx` |
| `src/components/FederatedPostCard.tsx` |
| `src/components/OutgoingFollowsList.tsx` |
| `src/components/JobCard.tsx` |
| `src/components/company/CompanyPostCard.tsx` |
| `src/pages/Notifications.tsx` |
| `src/pages/SavedItems.tsx` |
| `src/pages/Messages.tsx` |
| `src/pages/MessageConversation.tsx` |

Ändring: importera `{ sv } from "date-fns/locale"` och lägg till `locale: sv` i alla `formatDistanceToNow`-anrop.

## Steg 2: Översätt hårdkodade engelska strängar (5 filer)

| Fil | Strängar |
|-----|----------|
| **NewsletterSubscribe.tsx** | "Subscribe to our newsletter", "Please sign in to subscribe...", "Newsletter", "You're subscribed to receive...", "Subscribe to receive...", "You're subscribed with:", "Processing...", "Unsubscribe", "Subscribe", placeholder `your@email.com` → `din@epost.se` |
| **OutgoingFollowsList.tsx** | "Outgoing Follow Requests", "Pending", "Accepted", "Rejected", "Loading...", "No follow requests sent yet.", "Sent", "View" |
| **JobCard.tsx** | "Posted" → "Publicerad", "recently" → "nyligen", "Remote" |
| **ServerKeyInitializer.tsx** | Toast-titlar `"Error"` → `"Fel"`, `"Success"` → `"Klart"` |
| **PostView.tsx** | `'Failed to load post'` → `'Kunde inte ladda inlägget'` |

## Steg 3: Synka en.json med nya sv.json-nycklar

Gå igenom nycklar som bara finns i `sv.json` och lägg till engelska motsvarigheter i `en.json`, så att "Byt till engelska"-funktionen fungerar korrekt med LanguageSwitcher.

---

## Teknisk detalj
- ~13 filer för datum-locale-fix (mekanisk ändring: lägg till import + `locale: sv`)
- ~5 filer med hårdkodade strängar
- Synkning av `en.json` med saknade nycklar
- Ingen databasändring
- LanguageSwitcher-komponenten finns redan — inget nytt behövs för "byt till engelska"

