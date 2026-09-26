# Localization

Nolto's web application supports Swedish (`sv`), English (`en`), French (`fr`), German (`de`), Dutch (`nl`), Spanish (`es`), Japanese (`ja`) and Italian (`it`). The resources live in `src/i18n/locales/`. English is the technical key reference; existing English wording can also need correction.

## Translate the function

Read the component and, where necessary, its handler or service before choosing words. A key name alone is not a specification: legacy keys such as `anslutDinOrganisation` can refer to a federation server, not an organisation page. Keep keys stable when improving their wording.

For each affected function, review the action, confirmation, loading state, pending state, success message, failure message and empty state together. Check the corresponding older keys when more than one component implements the same function. Do not mechanically replace a word across unrelated contexts.

| Function | Swedish convention | Distinction to preserve in every language |
| --- | --- | --- |
| Request a professional connection | Lägg till kontakt; Kontaktförfrågan skickad | A request to a person, separate from connecting a server or app |
| Acknowledge a person's skill | Intyga kompetens; intyganden | A skill endorsement, separate from a written recommendation |
| Close an error or warning | Stäng | Dismiss a message, separate from rejecting a request |
| Decline a contact/message request | Avböj | Decline a request, separate from blocking the sender |
| RSVP to an event | Anmäl dig; Anmäld; Deltar inte | Registration and participation states, not technical connection |
| Suspend an account as moderator | Stäng av | Site moderation, separate from a personal block |
| Identify the first article author | Huvudförfattare | A person's role, not the isolated adjective “Primary” |
| Federation instance | Server | A service exchanging ActivityPub data, separate from an organisation |
| Profile headline | Roll eller kort presentation | Describe the person professionally, separate from an article heading |
| Cover/header image | Omslagsbild | Profile/page imagery, separate from a document heading |
| Cryptographic fingerprint | Nyckelns fingeravtryck | A verification value for an encryption key |
| URL slug | Webbadress, with help describing its last part | A shareable address, not implementation jargon |

Retain proper names, protocol names, code and URL syntax where appropriate. Familiar shared words are legitimate in some languages; identical English text is a review signal, not proof of an error. Use consistent formality within each language.

Copy must match actual behavior. A discovered server is not necessarily verified or currently active. An import that queues follow requests must not promise accepted relationships. Deletion confirmations must reflect the immediate hiding and later erasure implemented by the relevant service; events and jobs can have different deletion behavior from posts and articles.

## Complete messages and locale behavior

- Translate whole sentences with named interpolation values. Do not concatenate a name, translated fragment and punctuation; word order and grammar differ between languages.
- Use i18next interpolation (`{{name}}`, `{{date}}`, `{{max}}`) and pass matching values. Use plural resources and `count` for quantities.
- Format dates using the selected application locale (`intlLocale()` / `dateLocale()`), including dates embedded in messages.
- If a translated word controls an interaction, use the same value in its instructions and validation. Account deletion must still require acknowledgement and a second confirmation.
- Subscribe React components to language changes with `useTranslation()` where their output or validation depends on the selected language. A module-level translated string can become stale.
- Update all eight resources together. Avoid hardcoded fallback sentences that conceal missing translations.
- Preserve the meaning and authority of legal text. The Swedish `legalDocs` structure intentionally contains additional sections; structural parity does not authorize rewriting those documents.

## Validation and review limits

Run:

```sh
node --experimental-strip-types --test scripts/translations.test.mjs scripts/language-switch.test.mjs scripts/localization-controls.test.mjs
npm run check:types
npm run check:source
npm run build
```

The catalog checks inspect every string leaf for key coverage, matching interpolation/markup and unreviewed English copies, including short labels. The shared-vocabulary exceptions in `scripts/translations.test.mjs` require an actual language/context review; do not add a copy quota. Source checks cover literal translation calls and JSX text, but cannot discover every runtime-generated string.

The interaction tests exercise the real account-deletion and report dialogs with all eight resources and mocked services. They verify language changes, confirmation guards and safe interpolation without deleting accounts or submitting reports.

Automated coverage is not a fluency score. Contextual proofreading and visual review must check idiom, grammar, register, truncation, accessible names and all states of each flow. This review improves terminology across all eight catalogs and reviews the Swedish catalog more deeply; it is not a native-speaker certification of every sentence in the other seven languages. Backend-returned messages and the separate native mobile application are not fully covered by the web catalog tests.
