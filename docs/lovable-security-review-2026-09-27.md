# Lovable security review — 27 September 2026

The deep scan reported ten groups (including seventeen tables in its RLS group). Findings were compared with the deployed PostgreSQL policies **and column/table grants**, and with the actual callers. This is a scoped review, not a claim that the application has no vulnerabilities.

## Changes

- Avatar INSERT now requires the first path segment to equal the verified user's ID, matching the existing uploader and update/delete policies. Uploads into another account's folder are rejected.
- Restrictive SELECT policies make reply text, post/reply reactions, article reactions, author membership and skill endorsements respect the visibility of the parent post, article or skill. An author can still see their own article membership. Existing public reads and owner writes remain subject to their original rules.
- Obsolete broad INSERT policies for MFA recovery requests and remote actor cache writes were removed. Their browser write grants were already revoked; their authenticated server workflows remain in use.
- External lookup/preview/follow/move endpoints now have atomic, shared per-caller and global request limits. Public image proxy, federation inbox, Mastodon login and AT Protocol login use the same service-only counter. A failing limiter stops processing. Requests are counted before outbound I/O; identities and IPs are hashed rather than written in plaintext to this counter. This replaces the race-prone count-then-insert limiter on public login and inbox routes. Follow/move/login request bodies are bounded; remaining inbox actor reads use bounded JSON decoding.
- The editor uses StarterKit's included Link extension with exactly the previous options and CSS. The redundant direct `@tiptap/extension-link` dependency and explicit vendor-chunk entry were removed. It remains a transitive StarterKit dependency, so this is a dependency/configuration simplification, not a claim of removing its code or saving a measured bundle size.

## Intentionally public data and protocol calls

Public actor metadata has SELECT grants only on approved columns; `private_key` is inaccessible to anon/authenticated. A `USING (true)` policy does not override those column grants. Public follower lists, event attendance, company/author followers, published starter packs, remote instance metadata, reserved slugs and remote actor documents support the product's public discovery/federation features. Profile-section visibility settings guide the UI; the underlying skill/education/experience reads enforce the actual privacy boundary. Making all these rows owner-only would break their public features.

ActivityPub follow/inbox/move, Mastodon login and AT Protocol discovery must contact user-chosen public HTTPS servers. Hard-coding an instance allowlist would break the decentralized protocols. Authentication, exact actor/signature ownership, public-address validation, no redirects, bounded responses and the new shared request limits are the relevant controls; these findings are not automatically dismissed merely because federation is intentional.

## Remaining transport limitation

The general ActivityPub/preview/image helper validates DNS before a native hostname fetch; a DNS rebinding time-of-check/time-of-use gap remains. AT Protocol already uses IP-pinned TLS for arbitrary hosts (with a narrow Bluesky-operated-host exception). Extending that transport to all federation/media traffic needs hosted-runtime compatibility checks, including binary bodies and peer HTTPS behavior, before rollout. The URL-related findings should remain visible until that work is verified. Rate limiting reduces abuse; it is not a complete SSRF fix.

## Validation and isolated testing

- Node/Deno regression suites; source reachability and dependency audit; frontend and Edge type checks; production build.
- Disposable PostgreSQL replay includes real-role tests for own versus foreign avatar paths, public versus private replies/reactions, draft article metadata and hidden skill endorsements. The same cases passed in a fresh, separate Lovable database with synthetic fixtures inside a rolled-back transaction.
- Temporary test copy: Lovable project `55dbcd97-d373-419b-9195-671fd81df1df`, backend `gnlfhiawauewlmymipoq`. Original backend `anknmcmqljejabxbeohv` must never be in the Aikido target list. The remix omitted auth-user triggers; these were restored only on the copy. It initially retained production's frontend backend fallback; the pentest must wait until the built app demonstrably uses only the isolated backend.
- Do not mark Aikido completed or the remaining URL findings resolved based on static checks alone.
