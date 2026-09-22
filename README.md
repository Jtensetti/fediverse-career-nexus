# Nolto

Nolto is a Swedish-first professional network with profiles, organisation pages, posts, articles, events and jobs. Public accounts use `username@nolto.social` through WebFinger and ActivityPub. This is a federated identity, not an email address.

Mastodon account linking, follows and public content are supported in the implementation. Complete account mirroring and general Mastodon client compatibility are not. See the [federation acceptance checks](docs/federation-launch-checklist.md) and [remaining launch requirements](docs/production-readiness.md).

## Development

Use Node 24.15 or later within Node 24, or Node 22.22.2 or later within Node 22.

```sh
npm ci
cp .env.example .env
# Set the two public backend values in .env.
npm run dev
```

The development server listens on `http://localhost:8080`. The backend uses PostgreSQL, Supabase Auth, Storage and Deno Edge Functions. Use a separate development backend; do not run test fixtures or seed scripts against production. Historical migrations have not been verified as a clean installation sequence.

The application uses React, TypeScript, Vite, Tailwind, TanStack Query and Radix components. Dependencies are pinned in `package.json`, `package-lock.json` and `deno.lock`. Browser configuration is public; service credentials belong only in server secret storage.

## Checks

```sh
npm run check:source
npm run check:types
npm test
npm run check:edge
npm run build
npm audit --audit-level=high
```

`check:types` runs strict TypeScript checks; `lint` is an alias. Tests use Node's test runner and Deno. CI also rehearses migrations in isolated PostgreSQL; instructions are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

- [Contributing](CONTRIBUTING.md)
- [Security reporting and boundaries](SECURITY.md)
- [Security and maintenance review](docs/security-review.md)
- [Deployment and launch requirements](docs/production-readiness.md)
- [Privacy, encrypted messaging and deletion](docs/privacy-and-deletion.md)

## Licence

Nolto's code is [MIT licensed](LICENSE). Bundled fonts retain their [own licences](public/licenses/README.md). Package licences remain with their respective authors.
