# Native app

`apps/mobile` is a separate React Native app using Expo. It renders native views and a virtualised public timeline; there is no WebView, service worker or PWA wrapper. It shares the anonymous API client in `packages/public-feed` with the website, including bounded pagination, cancellation and public author projections.

The earlier repository history contains no retained iOS, Android, React Native or Capacitor project. This is a new foundation, not an app-store release.

## Develop

Use Node 24 and a separate development backend.

```sh
cd apps/mobile
npm ci
cp .env.example .env
# Set the three public environment values for your development deployment.
npm start
```

Use an Android development device/emulator or an iOS development device/simulator. Local iOS builds require macOS/Xcode; Android builds require the Android SDK. `npm run android` and `npm run ios` generate and build the native projects. Their generated directories are not committed. The Xcode build helper is constrained to `uuid@11.1.1` to avoid its vulnerable older transitive version; its UUID generation and both platform bundles are checked. Dependencies and lockfiles remain separate from the React 18 website; the mobile app uses the Expo SDK's React/React Native versions.

```sh
npm run check:types
npm run export -- --max-workers 2
```

The checked-in bundle IDs are `social.nolto.app`; confirm availability with the store accounts before distribution. No EAS project, signing credentials or analytics service is configured. The app requests no notification, camera, contact or location permission. Public feed content stays in memory. Posts open their canonical website page until native detail and reply screens are implemented. Content warnings remain collapsed; remote HTML is rendered as text.

## Before adding authenticated features

Implement native screens around the same backend policies, using verified sessions and the existing MFA requirements. Use system-browser OAuth with PKCE and verified universal/app links. Store refresh tokens in the platform keychain/keystore, not AsyncStorage. Web-only browser storage and cryptographic code must not be copied into native message handling without a separate key-management and recovery design.

Add native post detail, replies, profiles and settings before claiming feature parity. Test sign-in/out, lost connectivity, deletion, accessibility, font scaling and navigation on real iOS and Android devices. A JavaScript/Hermes export does not establish that a signed native app works on a device.

## Notifications

Native push still needs implementation and operational credentials. The intended flow is:

1. Ask for notification permission only after a signed-in user chooses to enable it. Enable Android's notification channel before requesting its token.
2. Register the device's APNs/FCM token through an authenticated endpoint. Store only the user, platform, token, consent and update timestamp. Enforce ownership/MFA, encrypt tokens server-side, and clear them on logout, revoked consent and account deletion. Reject expired tokens and never log them.
3. Queue push delivery from committed notification records. Recheck recipient activity, block rules and deletion at delivery time; use idempotency and bounded retries.
4. Send a generic alert and an opaque notification ID. Do not put message text, sender names, private post contents, encryption keys or session tokens in a lock-screen payload. Fetch permitted content after unlocking/signing in. Validate destinations against an internal route allowlist.
5. Configure Apple push credentials and Firebase messaging credentials in server secret storage. Verify receipts, badge clearing and token rotation on real devices before enabling delivery.

Expo's notification module can use APNs and FCM directly, so the Expo Push Service is optional. Adding a native app alone does not activate push. No device-token table, background sender or permission prompt is installed by this foundation.

References: [Expo setup](https://docs.expo.dev/get-started/create-a-project/), [development builds](https://docs.expo.dev/develop/development-builds/introduction/), [direct APNs/FCM delivery](https://docs.expo.dev/push-notifications/sending-notifications-custom/).
