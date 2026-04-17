

# Hardening, Performance & Contributor Experience

Goal: zero behavior, UI or platform changes. Only repo-level improvements, security policies, perf tweaks, and contributor docs/automation.

## A. Security hardening (no behavior change)

### A1. Lock down public storage bucket listing
The Supabase linter flags 4 public buckets (`avatars`, `posts`, `article-covers`, `article-images`, `articles`, `company-assets`) where any client can `LIST` all files. Files served by direct URL still work; we just remove the broad `SELECT` on `storage.objects` and replace it with object-by-object access (public buckets remain publicly readable via CDN URL — listing is what gets blocked).

Migration: drop overly-broad `storage.objects SELECT USING (true)` policies and replace with policies that only allow authenticated users to list their own folder. Public read by URL is unaffected.

### A2. Tighten remaining `USING (true)` write policies
Audit the 5 flagged write policies (federated_sessions, remote_actors_cache, oauth_clients, etc.). Where the intent is "service role only", convert from `USING (true)` to `USING (auth.role() = 'service_role')` so the linter and any future audit reads correctly.

### A3. Document the two known accepted risks
- `actors.private_key` client-side access — already tracked, marked as deferred architectural refactor. Add a `SECURITY.md` entry describing scope and mitigation so external contributors don't re-flag it.
- Realtime channel authorization — platform limitation. Document in `SECURITY.md`.

### A4. Remove hardcoded fallbacks for Supabase URL/anon key from `vite.config.ts`
The `FALLBACKS` block hard-codes the project ref + anon key. These are public values, but baking them into the repo means forks accidentally point at our backend. Replace with a build-time error if env vars are missing. Same end-user behavior on lovable.app (env is always injected there).

## B. Performance (no UX change)

### B1. Add Vite build optimizations
- Enable `build.target: 'es2020'` and `build.cssMinify: true` (defaults are fine but pin them).
- Add `manualChunks` for the largest vendor groups (`react`, `radix-ui`, `tiptap`, `recharts`) so initial JS payload drops without any code change.

### B2. React Query default tuning
In the single `QueryClient` instance in `App.tsx`, set sensible defaults: `staleTime: 60_000`, `refetchOnWindowFocus: false`, `retry: 1`. Cuts redundant refetches across the app without changing any feature.

### B3. Database indexes for hot paths
Add indexes that don't exist yet but are obviously needed by current queries (verified via the function definitions seen — e.g. `ap_objects (type, attributed_to)`, `notifications (recipient_id, read, created_at desc)`, `federation_queue_partitioned (partition_key, status, priority)`). All non-blocking `CREATE INDEX IF NOT EXISTS`.

## C. Contributor experience

### C1. Rewrite README.md
Current README says "Nolto was an experimental … hosted instance shut down". This contradicts the live Samverkan platform. Replace with accurate Samverkan-focused README:
- What it is (Swedish public-sector federated network)
- Quick start (`npm i && npm run dev`)
- Tech stack
- Link to `CONTRIBUTING.md`, `SECURITY.md`, `docs/`

### C2. Add `SECURITY.md`
Standard responsible-disclosure file: how to report vulnerabilities, scope, accepted risks (A3 items), supported versions.

### C3. Add `CODE_OF_CONDUCT.md`
README links to it but the file doesn't exist. Add Contributor Covenant 2.1 (standard).

### C4. Add `.github/` automation
- `.github/workflows/ci.yml` — runs `npm ci`, `npm run lint` (tsc), `npm test` on PRs. Catches regressions for human contributors.
- `.github/workflows/codeql.yml` — GitHub's free static analysis for JS/TS. Surfaces security findings directly in PRs.
- `.github/PULL_REQUEST_TEMPLATE.md` — checklist (tests pass, no hardcoded secrets, RLS reviewed if touching DB).
- `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md` — standard templates.
- `.github/dependabot.yml` — weekly npm + github-actions update PRs.

### C5. Expand `CONTRIBUTING.md`
Already exists and is good. Add two short sections:
- **Security**: link to `SECURITY.md`, never commit secrets, never bypass RLS.
- **Database changes**: must include a migration; never edit `types.ts`.

### C6. Fix `index.html` metadata
- Update `og:image` and `twitter:image` from `fediverse-career.lovable.app` → `www.samverkan.se`.
- Update `twitter:site` from `@nolto_network` → remove or replace (Nolto is gone per memory).
- Add `<html lang="sv">` since Swedish is the default per memory.

## D. Execution order
1. Migration: storage listing policies + tighten `USING (true)` writes + add indexes
2. `vite.config.ts`: remove hardcoded fallbacks, add chunking
3. `App.tsx`: React Query defaults
4. `index.html`: metadata fixes
5. Docs: rewrite README, add SECURITY.md, CODE_OF_CONDUCT.md, expand CONTRIBUTING.md
6. `.github/`: CI, CodeQL, Dependabot, PR + issue templates
7. Mark resolved security findings as fixed
8. Verify `tsc --noEmit` passes

## What does NOT change
- Zero UI changes, zero route changes, zero feature changes
- No edge function logic changes
- No data migrations (only policy + index DDL)
- All public file URLs continue to work exactly as before

