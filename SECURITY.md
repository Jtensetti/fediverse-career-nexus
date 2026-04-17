# Security Policy

Thank you for helping keep Samverkan and its users safe.

## Supported versions

Only the `main` branch deployed at **www.samverkan.se** is actively maintained. Forks are the responsibility of their maintainers.

## Reporting a vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

Instead, email **security@samverkan.se** with:

- A description of the issue and its potential impact
- Steps to reproduce (proof-of-concept code, screenshots, HTTP requests)
- Your name/handle if you would like to be credited

We will:

- Acknowledge your report within **3 business days**
- Provide a remediation timeline within **10 business days** depending on severity
- Credit you in the release notes if the issue is confirmed (unless you prefer to remain anonymous)

We do not currently run a paid bug-bounty program but we deeply appreciate responsible disclosure.

## Scope

In scope:

- The Samverkan web application at `www.samverkan.se`
- The federation endpoints (`/.well-known/*`, `/actor/*`, `/inbox`, `/outbox`)
- The Supabase Edge Functions in `supabase/functions/`
- Authentication, authorization, and session handling
- Row Level Security policies in `supabase/migrations/`

Out of scope:

- Denial-of-service attacks against the public infrastructure
- Social engineering of staff or users
- Findings that require physical access to a user's device
- Vulnerabilities in third-party services we depend on (Supabase, Cloudflare, Resend) — please report those upstream

## Accepted risks

The following items have been reviewed and are tracked as accepted risks until larger architectural changes are scheduled. Please **do not re-report** these:

### 1. `actors.private_key` is readable by the actor's owning user

Each user's ActivityPub actor row currently exposes its private key to the row's `user_id` via RLS. Signing happens server-side in Edge Functions, but the column is technically readable from the client.

- **Mitigation:** key signing is performed via the `get_actor_private_key` security-definer function and never used directly from the browser.
- **Long-term plan:** move the private key into a separate vault table with no client-side access path. Tracked in the federation infrastructure backlog.

### 2. Realtime channel authorization

Supabase Realtime broadcasts respect table-level RLS but do not currently support per-channel authorization out of the box. A user with knowledge of channel names cannot read protected rows, but they can observe that activity exists.

- **Mitigation:** all sensitive payloads are stored in tables with strict RLS and never broadcast in plaintext.
- **Long-term plan:** migrate sensitive realtime flows to Edge-Function-signed broadcasts when Supabase ships authorized channels.

## Hardening guidelines for contributors

When opening a PR:

- **Never commit secrets.** Use Supabase secrets (Edge Functions) or `VITE_*` env vars (publishable values only).
- **Never bypass RLS.** Use `SECURITY DEFINER` functions when broader access is required, and always set `search_path = public`.
- **Never edit `src/integrations/supabase/types.ts`.** It is regenerated from the live schema.
- New tables must enable RLS and ship with policies in the same migration.
- Authenticated routes belong inside the `<ProtectedRoute>` wrapper in `src/App.tsx`.

Thank you for contributing securely.
