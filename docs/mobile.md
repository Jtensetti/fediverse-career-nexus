# Nolto mobile

`apps/mobile` is the separate React Native / Expo application. Keep this stack for the notification-first release: the missing pieces were authentication, device registration and server delivery, not access to native push capabilities.

## What is implemented

- Native Flöde / Notiser / Konto navigation with clear active states and 44–48pt touch targets.
- Nolto’s petrol, teal and warm gold palette, bundled Inter/Montserrat fonts and existing mascot; light/dark themes follow the phone.
- Virtualised public timeline, author avatars, expandable content, content-warning consent, pull-to-refresh, pagination, retry/empty states and explicit website links.
- Email/password login, existing TOTP MFA challenge, server verification of active sessions, secure session storage in chunked Keychain/Keystore items. The browser preview keeps sessions in memory only.
- Private notification inbox, unread filtering, read-all, realtime refresh, cursor pagination and safe resolution of tapped push identifiers. Notification contents remain short and generic.
- Explicit push opt-in on the account screen, Android channel setup, token renewal, permission-revocation handling and server-confirmed unregistration before logout.
- Encrypted device registrations tied to Auth sessions, atomic notification enqueue, bounded worker claims/retries, receipts, invalid-token cleanup, and blocking/deletion/read-state rechecks.

Push delivery is operationally disabled by default. See [the activation guide](mobile-push-activation.md) for deployment, EAS/APNs/FCM credentials, worker scheduling and the two-phone acceptance checklist. No production database or push provider was changed by this implementation.

## Develop and verify

Use Node 24 and a separate development backend. Install this app independently of the React 18 website.

```sh
cd apps/mobile
npm ci
cp .env.example .env
# Fill in the public backend URL/key, site URL and EAS project UUID.
npm start
npm run check:types
npm run export -- --max-workers 2
```

`npm run android` and `npm run ios` generate local native projects. Android needs the Android SDK; local iOS builds require macOS/Xcode. The checked-in app identifiers are `social.nolto.app`; confirm availability before distribution. `eas.json` provides internal preview and production build profiles. Never commit generated native credentials or service-account JSON.

The web target is a local visual-review aid using React Native Web, not a replacement for native device testing. `expo export --platform web` produces a static browser preview. Push controls are unavailable there and sessions are not persisted. Preview screenshots use synthetic data; see [preview notes](mobile-preview/README.md).

Backend regressions:

```sh
node --experimental-strip-types --test scripts/mobile-notifications.test.mjs
npx deno test --config deno.json supabase/tests/mobile-push.test.ts
# Existing isolated Postgres harness, supplying the installed PGlite module:
node scripts/test-support/run-privacy.mjs /absolute/path/to/pglite/dist/index.js
```

## Release scope and remaining work

This is a notification-focused build, not full website feature parity or a store release. Posts, profile editing, articles, jobs and conversations open the canonical website in the system browser, with a separate web login when necessary. End-to-end encrypted message keys never pass through push payloads.

Native social/federated OAuth requires a separate PKCE/browser-link flow. Native post detail, replies, profiles, search, composition and encrypted messaging need their own screens and acceptance testing. Existing web-only browser storage/cryptography must not be copied into native messaging without a native key-management/recovery design.

Before store submission, test sign-in/out, revoked sessions, notifications with the app killed, lost connectivity, permissions, account deletion, font scaling and VoiceOver/TalkBack on real iOS and Android devices. A successful JS/Hermes export is not proof of a signed native app or provider delivery.

References: [Expo notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [delivery and receipts](https://docs.expo.dev/push-notifications/sending-notifications/), [development builds](https://docs.expo.dev/develop/development-builds/introduction/).
