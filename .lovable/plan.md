
# Multi-Factor Authentication (MFA) with TOTP Implementation Plan

## Overview
This plan implements Time-based One-Time Password (TOTP) multi-factor authentication for Nolto users. MFA will be available for **local users** (email/password accounts) and will enhance account security by requiring a second factor during login.

**Note on Federated Users**: Federated users authenticate via their home Mastodon/Fediverse instance. MFA for these users is handled by their home instance (e.g., Mastodon's built-in 2FA). Nolto cannot enforce MFA on federated logins since the authentication happens externally.

---

## User Experience

### Enabling MFA (Settings)
1. User navigates to **Profile Edit > Privacy** tab
2. Under a new "Security" section, user clicks "Enable Two-Factor Authentication"
3. A QR code is displayed that they scan with an authenticator app (Google Authenticator, Authy, 1Password, etc.)
4. User enters the 6-digit code from their app to verify setup
5. Success message shown, MFA is now active

### Logging In with MFA
1. User enters email and password as normal
2. If MFA is enabled, a second screen appears asking for the 6-digit TOTP code
3. User enters code from their authenticator app
4. Login completes on successful verification

### Disabling MFA
1. In settings, user clicks "Disable Two-Factor Authentication"
2. User must enter a valid TOTP code to confirm they still have access
3. MFA is disabled after verification

---

## Technical Implementation

### 1. New Component: MFASettings.tsx
A settings section component for the Privacy tab that handles:
- Displaying current MFA status (enabled/disabled)
- Enrollment flow with QR code display
- Verification of enrollment
- Unenrollment with code verification

```text
┌─────────────────────────────────────────────────────────┐
│  🔐 Two-Factor Authentication                           │
├─────────────────────────────────────────────────────────┤
│  Status: Not enabled                                    │
│                                                         │
│  Add an extra layer of security to your account by      │
│  requiring a verification code when you sign in.        │
│                                                         │
│  [Enable Two-Factor Authentication]                     │
└─────────────────────────────────────────────────────────┘
```

### 2. New Component: MFAEnrollDialog.tsx
A dialog/modal for the enrollment process:
- Calls `supabase.auth.mfa.enroll({ factorType: 'totp' })`
- Displays the QR code SVG returned by the API
- Shows the TOTP secret for manual entry
- Provides an OTP input (using existing InputOTP component)
- Verifies using `supabase.auth.mfa.challenge()` and `supabase.auth.mfa.verify()`

### 3. New Component: MFAVerifyDialog.tsx
A dialog shown during login when MFA is required:
- Displayed after successful password authentication
- Shows OTP input for the 6-digit code
- Calls `challenge()` and `verify()` to complete authentication
- Handles the AAL (Authenticator Assurance Level) upgrade from aal1 to aal2

### 4. Updated Auth Flow in Auth.tsx
Modify the `handleSignIn` function to:
1. After successful password auth, check if user has MFA factors
2. If MFA is enabled, show the MFA verification dialog instead of redirecting
3. Only redirect to home after MFA verification is complete

```text
Password Auth → Check AAL → MFA Required? → Show Verify Dialog → Complete Login
                    ↓
               No MFA → Redirect Home
```

### 5. New Service: mfaService.ts
Utility functions for MFA operations:
- `getMFAFactors()` - List user's enrolled factors
- `isMFAEnabled()` - Check if user has verified TOTP factor
- `enrollTOTP()` - Start enrollment process
- `verifyEnrollment()` - Complete enrollment with code
- `challengeAndVerify()` - Verify during login
- `unenrollFactor()` - Remove MFA

### 6. ProfileEdit.tsx Updates
Add the MFASettings component to the Privacy tab, placed appropriately in the security-related section.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/MFASettings.tsx` | Main settings UI for MFA management |
| `src/components/MFAEnrollDialog.tsx` | Enrollment flow with QR code |
| `src/components/MFAVerifyDialog.tsx` | Login verification dialog |
| `src/services/mfaService.ts` | MFA utility functions |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Add MFA verification step after password login |
| `src/pages/ProfileEdit.tsx` | Add MFASettings to Privacy tab |
| `src/i18n/locales/en.json` | Add MFA-related translation strings |

---

## Security Considerations

1. **Recovery Codes**: Consider adding recovery codes in a future iteration for account recovery if the authenticator is lost. For now, users who lose their authenticator must contact support.

2. **Session AAL**: After MFA verification, the session is upgraded to AAL2 (Authenticator Assurance Level 2), providing stronger authentication guarantees.

3. **Federated Users Excluded**: Federated users are identified by `auth_type: 'federated'` in their profile. The MFA settings will be hidden for these users with an explanation that their home instance handles security.

4. **Rate Limiting**: Supabase Auth has built-in rate limiting for MFA verification attempts to prevent brute-force attacks.

---

## Implementation Order

1. Create `mfaService.ts` with core MFA functions
2. Create `MFAEnrollDialog.tsx` for the enrollment flow
3. Create `MFAVerifyDialog.tsx` for login verification
4. Create `MFASettings.tsx` combining enrollment/disable controls
5. Update `ProfileEdit.tsx` to include MFA settings
6. Update `Auth.tsx` to handle MFA during login
7. Add translation strings
8. Test end-to-end flow

---

## No Database Changes Required

Supabase Auth manages MFA factors internally in the `auth.mfa_factors` table. No custom database migrations are needed for this feature.
