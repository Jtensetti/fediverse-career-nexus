# Contributing

Set up a separate development backend using the instructions in [README.md](README.md). Keep changes focused and explain the user-visible behavior and validation in the pull request.

## Structure

- `src/pages/`: routes and page composition.
- `src/components/`: UI grouped by feature; shared primitives in `ui/`.
- `src/services/`: database and API access.
- `src/lib/`: shared logic, including the application-owned backend client.
- `src/integrations/supabase/types.ts`: schema-derived database types.
- `supabase/functions/`: deployed server handlers and shared server code.
- `supabase/migrations/`: ordered database changes.
- `scripts/test-support/`: schema fixtures and synthetic database assertions.
- `deploy/`: optional federation gateway.

## Conventions

Use existing feature modules before adding a new abstraction or dependency. Keep TypeScript strict; handle absent data instead of casting it away. Translate user-facing text through the existing Swedish/English language files. Use the shared renderer for untrusted post text and the shared notification component for status messages.

Authorization belongs in database policies and server handlers. UI visibility is not authorization. Never derive administration from an email address, username or user-editable metadata. See [SECURITY.md](SECURITY.md) before changing grants, policies, authentication, media or encryption.

Create new migrations with `supabase migration new <name>`. Preserve applied migrations; add a corrective migration rather than changing deployed history. Regenerate database types from the migrated development schema. A new RPC needs matching types and a test of both authorized and denied calls.

Keep `.env` untracked and document public variables in `.env.example`. Never put server secrets in a `VITE_*` variable. The source check rejects tracked environment files, unused modules/dependencies and common credential patterns; it is not a complete secret scanner.

## Validation

Run the checks listed in the README. Test behavior that matters: ownership, revocation, privacy, failure handling and data integrity. Synthetic test records belong in isolated fixtures, never in the production feed.

Run the database regressions without adding their runtime to the application:

```sh
npm install --prefix /tmp/nolto-pg --no-audit --no-fund @electric-sql/pglite@0.5.8
node scripts/test-support/run-identity.mjs /tmp/nolto-pg/node_modules/@electric-sql/pglite/dist/index.js
node scripts/test-support/run-account-boundaries.mjs /tmp/nolto-pg/node_modules/@electric-sql/pglite/dist/index.js
node scripts/test-support/run-privacy.mjs /tmp/nolto-pg/node_modules/@electric-sql/pglite/dist/index.js
```

These tests reproduce schema and policy behavior with Auth/Storage stand-ins. They do not replace browser, hosted-service or federation integration tests. Remove unused exports, components and documentation when replacing a feature, but retain deployed migration history and third-party licence notices.

Be respectful in reviews. Report security issues privately and do not post personal data, credentials or message contents in issues.
