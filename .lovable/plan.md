

# MFA-återställning: Säkert admin-flöde

## 1. Översätt formuläret till svenska

`MFARecoveryDialog.tsx` använder redan `t()` med engelska fallback-strängar. Lägg till alla `mfa.recovery*`-nycklar i `sv.json` och `en.json` (1:1 paritet enligt projektets lokaliseringsregel).

Berörda strängar:
- `mfa.recoveryTitle` → "Begär kontoåterställning"
- `mfa.recoveryDesc` → "Har du tappat åtkomsten till din autentiseringsapp? Berätta hur vi når dig så hjälper en administratör dig att återställa åtkomsten."
- `mfa.recoveryEmail` → "Din e-post"
- `mfa.recoveryUsername` → "Användarnamn (valfritt)"
- `mfa.recoveryMessage` → "Ytterligare information (valfritt)"
- `mfa.recoveryMessagePlaceholder`, `mfa.recoverySend`, `mfa.recoverySending`, `mfa.recoverySent`, `mfa.recoverySubmittedDesc`, `mfa.recoveryError`, `mfa.contactSupport`, `mfa.lostAccess`, m.fl.

Inga komponentändringar behövs — bara översättningsfilerna.

## 2. Säkerhetsval: hur ska admin hjälpa användaren?

### Hotmodell
Den vanligaste attacken mot MFA-återställning är **social engineering** — en angripare mailar "support" och utger sig för att vara kontoägaren. Om admin bara klickar "återställ MFA" baserat på ett mail är hela MFA-skyddet borta. Det är detta vi måste skydda mot.

### Jämförelse av alternativ

| Metod | Säkerhet mot scammer | Bevisar | Risk |
|---|---|---|---|
| **A. Admin nollställer MFA direkt** | Låg | Inget — admin litar på mailet | Hög: ett lurat mail räcker |
| **B. Engångskod via e-post (6 siffror, 15 min)** | Medel | Kontroll över e-post | Låg: kräver också lösenord |
| **C. Signerad engångslänk via e-post + lösenord** | Hög | E-post + lösenord + tidsgräns + signatur | Mycket låg |

**Rekommendation: C (signerad engångslänk)** — branschstandard (GitHub, Google). Kombinerar tre faktorer: något du har (mailen), något du vet (lösenordet), och en kryptografiskt signerad token med kort livslängd.

### Säkerhetsegenskaper för flödet

1. **Admin godkänner ärendet i panelen** — admin nollställer aldrig MFA själv, utan utlöser ett *automatiserat* återställningsmail till **den e-post som är registrerad på kontot** (inte den fritextadress användaren skrev i formuläret — viktig skillnad mot scam).
2. **Mail innehåller engångslänk** signerad med en serverhemlighet, giltig i 30 minuter, en användning.
3. **Användaren måste först logga in med lösenord** på återställningssidan innan tokenen accepteras → bevisar lösenordskontroll.
4. **Vid framgång**: alla MFA-faktorer för användaren tas bort, händelsen loggas i `moderation_log`, och en notis skickas till alla admins ("MFA återställd för användare X kl Y").
5. **Kontot tvingas registrera ny MFA** vid nästa inloggning (befintligt beteende).

### Varför inte enbart admin-knapp?
Om admin manuellt kan ta bort MFA blir admin själv en attackvektor (komprometterad admin = alla konton oskyddade, inget spår). Den signerade länken garanterar att även en lurad eller komprometterad admin **inte kan kringgå** att riktig kontoägare bevisar e-post + lösenord.

## 3. Implementation

### Databas
- Ny tabell `mfa_recovery_tokens`: `id`, `user_id`, `token_hash` (sha256, aldrig klartext), `expires_at`, `used_at`, `created_by_admin_id`, `created_at`. RLS: ingen klientåtkomst — endast service role.
- Lägg till `resolved_by`, `resolved_at`, `resolution_notes` i `mfa_recovery_requests` (status finns redan).

### Edge functions (en ny + en ändrad)
- **`admin-issue-mfa-recovery`** (verify_jwt = true): admin anropar denna med ett `request_id`. Funktionen kontrollerar att anroparen är admin (`is_admin` RPC), hämtar `user_id` från `mfa_recovery_requests`, slår upp användarens **registrerade e-post** via `auth.admin.getUserById`, genererar en kryptografisk token (32 bytes, base64url), sparar SHA-256-hash i `mfa_recovery_tokens`, och mailar länk till den registrerade e-posten via Lovable Emails (mall: `mfa-recovery`). Returnerar bara `{success: true}` — token visas aldrig för admin.
- **`consume-mfa-recovery-token`** (verify_jwt = true, kräver inloggad användare): tar emot token från återställningssidan, slår upp via hash, kontrollerar `expires_at` + `used_at` + att `auth.uid()` matchar tokenens `user_id` (dvs. användaren har just loggat in med lösenord). Vid match: `auth.admin.mfa.deleteFactor` för alla användarens TOTP-faktorer, markerar token som använd, loggar i `moderation_log`.

### App-mall (transactional email)
- Ny mall `mfa-recovery.tsx` i `_shared/transactional-email-templates/`. Innehåll: "Hej, en administratör har initierat en MFA-återställning för ditt Samverkan-konto. Klicka på länken nedan inom 30 minuter och logga in med ditt lösenord för att slutföra." + tydlig "Var detta inte du? Kontakta oss"-sektion.

### Frontend
- **Ny adminkomponent `MfaRecoveryQueue.tsx`** under en ny tabb "MFA-ärenden" i moderationspanelen. Visar lista över `mfa_recovery_requests` med status `pending`. För varje rad: knapp "Skicka återställningslänk" (anropar `admin-issue-mfa-recovery`), knapp "Avvisa". När admin trycker visas en bekräftelsedialog som påminner om att länken går till **kontots registrerade e-post**, inte adressen i formuläret.
- **Ny publik sida `/aterstall-mfa?token=...`** (route i `App.tsx`): tvingar inloggning först (om ej inloggad → omdirigera till `/auth?redirect=...`). När inloggad anropas `consume-mfa-recovery-token`. Visar succé/fel-meddelande och knapp "Aktivera ny MFA".
- **MFA-ärenden-tabb läggs till** i `ModerationDashboard.tsx` — synlig för både admin och moderator (men endast admin kan utfärda återställning, server-side enforced).

## Vad ändras inte
- Befintligt `MFARecoveryDialog`-flöde (användaren skickar in begäran) är oförändrat förutom svensk text.
- Inga ändringar av MFA-inloggningsflödet, ingen befintlig route eller funktion påverkas.
- Adminroller, RLS, `is_admin`/`is_moderator` RPC oförändrade.

