# Samverkan

A federated professional network for the Swedish public sector — municipalities, regions, and government agencies. Built on ActivityPub, hosted in the EU, designed around privacy, accessibility, and a healthy collaborative culture.

Live at **[www.samverkan.se](https://www.samverkan.se)**.

---

## What it is

Samverkan combines:

- **CV-style profiles** with verifiable employment, education, and endorsements
- **Organisation pages** for public-sector employers with role-based admin (owner / admin / editor)
- **A federated feed** that interoperates with Mastodon and other ActivityPub servers
- **Long-form articles, events, and a structured job board** focused on transparency
- **Direct messaging** with end-to-end encryption support
- **Granular privacy controls** (per-section visibility, federation opt-in, MFA)

The platform is Swedish-first (`sv` default, English fallback) and hosted in Frankfurt (AWS `eu-central-1`) for GDPR data-residency.

---

## Tech stack

- **Frontend:** React 18 · Vite 5 · TypeScript · Tailwind · shadcn/ui · TanStack Query
- **Backend:** Supabase (Postgres + RLS + Edge Functions on Deno)
- **Federation:** ActivityPub · HTTP Signatures · WebFinger · NodeInfo
- **Auth:** Email/password · OAuth (Google, Apple) · TOTP MFA · federated login
- **Email:** Resend (sender: `noreply@samverkan.se`)

---

## Quick start

```bash
git clone <your-fork-url>
cd <repo>
npm install
cp .env.example .env   # fill in your own Supabase project values
npm run dev
```

The dev server runs on `http://localhost:8080`.

You will need your own Supabase project — see [`docs/`](docs/) for schema notes and [`supabase/migrations/`](supabase/migrations/) for the full DDL history.

### Running the test suite

```bash
npm run lint   # tsc + eslint
npm test       # jest
```

---

## Contributing

Contributions are welcome. Before opening a PR:

1. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) — coding conventions, branch flow, PR checklist.
2. Read [`SECURITY.md`](SECURITY.md) — responsible disclosure and accepted-risk register.
3. Read [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — expected behavior in the community.
4. For database changes, always include a migration in `supabase/migrations/`. Never edit `src/integrations/supabase/types.ts` by hand.

Issues and feature requests use the templates under [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/).

---

## Documentation

- [`docs/openapi.yaml`](docs/openapi.yaml) — REST + ActivityPub endpoint contract
- [`docs/`](docs/) — architecture notes
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- [`SECURITY.md`](SECURITY.md)

---

## License

[MIT](LICENSE).
