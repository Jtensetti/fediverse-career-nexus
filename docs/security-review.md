# Security and maintenance review

22 September 2026. Scope: current application source, server handlers, database policies/RPCs, dependency graph, entrypoint scripts and reachable Git history. This is a code and schema review with regression tests, not an independent penetration test or a production certification.

## Findings addressed

| Priority | Finding | Change and evidence |
| --- | --- | --- |
| High | Post rendering could introduce executable Markdown links after sanitization. Regex substitutions also rewrote existing HTML attributes. | One DOM-based renderer transforms text nodes and sanitizes the final output. Real DOM tests cover executable URLs, attributes, preserved links and escaped markup. Quote previews render text rather than truncated HTML. |
| High | Event recipients could create or retarget their own invitations to private events. | Separate owner policies and status-only recipient updates. SQL tests reject self-invitation, changed event/user and private-event enumeration. |
| High | Definer RPCs exposed other users' poll choices and deleted participant profiles. | Individual ballots use caller RLS; participant lookup uses the public profile projection. Anonymous access is revoked. Role and deletion tests exercise the actual SQL. |
| Medium | Poll writes were non-atomic and lacked server validation; displayed voter counts were fabricated. | A transaction validates visibility, expiry, option bounds, uniqueness and single-choice rules before replacing a ballot. Aggregate results count distinct voters and honor deletion. |
| Medium | Maintenance and relationship helpers had excessive client reach. | Maintenance writes are service-only; invitation/block lookups require the relevant verified user. Public/helper grants are tested. |
| Medium | Reply/mention notifications were written through a client API that denies inserts; replies omitted the audience needed for visibility, and the privacy rule rejected legitimate organisation posts. | Validated reply RPC, explicit public audiences, a publisher-aware privacy boundary and transactional public-post notifications. Tests cover private targets, wrong thread, company impersonation, forged notifications, duplicate mentions and blocked users. Notifications contain no copy of the text. |
| Medium | The entrypoint loaded an unpinned third-party editor script; an editor bridge handled application sessions. | Removed both. The application owns its backend client and stores sessions through the standard SDK. CI rejects external entrypoint scripts and unreachable source additions. |
| Medium | Source contained public environment configuration, historical personal moderator allowlists and inaccurate security guidance. | The environment file is untracked; CI uses placeholders. Current privileges come from database roles, tested against forged metadata/self-promotion. Documentation no longer describes key exposure as acceptable or promises unverified response times. |
| Low | Dead components, duplicate toast/rendering systems, unused dependencies and misleading UI state increased maintenance cost. | Removed 102 unused source files plus the obsolete client/bridge files; kept one toast system and one link renderer. Job saving uses persistent saved items. Strict TypeScript and unused-code checks now fail the build. |

The history review confirmed personal usernames in an old moderator allowlist, including commit `9e845be7a8a9638e2e6a8a9fd1f5bd888f453d98`. The current tree does not use personal email addresses or usernames as privilege rules. Contact details in legal/support pages have a different purpose and remain accurate. Git history has not been rewritten.

A pattern scan examined 3,937 reachable historical text blobs below 2 MB, excluding package lockfiles. It found public/anonymous JWT configuration but no matching privileged JWT, private key material or tested secret-token patterns. This does not prove that no secret has ever been committed. CI checks the current tracked tree for the same classes without printing candidate values.

## Code and dependencies

The runtime manifest now has 53 direct dependencies: 15 unused packages removed and one previously transitive UI dependency declared explicitly. The resolved npm graph decreased from 561 to 439 packages, including the new development-only DOM test runtime. The final advisory scan reports zero known vulnerabilities; this is not a review of every dependency's implementation.

The frontend now enables strict null checks, implicit-any rejection, unused local/parameter checks and switch fallthrough checks. The source check follows imports from application/configuration entrypoints and rejects unreachable modules and unused runtime packages. Existing explicit `any` annotations remain, especially around federation payloads and older service mappings; strict mode does not validate network JSON at runtime.

Removed the unused API specification because it described routes that did not match deployment. The federation checklist now tests the implemented protocol paths without promising general Mastodon client support. Bundled fonts retain their upstream licence notices. Provider names remain in the privacy notice where needed to explain actual processing.

## Validation

- Strict application/build-configuration TypeScript and production build.
- 11 Node tests, including DOM rendering and actual encrypted-message round trips; 23 Deno tests covering identity, signatures, fetch boundaries, authentication, encryption and privacy.
- All maintained Edge Function entrypoints type-checked.
- Three isolated PostgreSQL suites covering identity, account boundaries, privacy/retention, invitation/voting permissions and transactional notifications. Fixtures contain synthetic records only.
- Source/dependency checks and npm advisory scan.

## Remaining work

The [launch requirements](production-readiness.md) remain open: authenticated browser journeys, public-domain routing, Mastodon round trips, provider backup restoration/expiry, abuse controls and realistic load tests. The large initial JavaScript bundle needs mobile performance measurements.

Continue replacing broad federation JSON casts with validated domain types and consolidating duplicated profile/feed mappings. Do that around concrete behavior tests; do not weaken type checks or add speculative abstractions to make the code appear cleaner.

Inbox key recovery/rotation, forward secrecy, locked-account approval and full federated interaction parity are not delivered by this cleanup. Earlier actor-key exposure also requires an operational review of the retained signing identity. None of those limits is hidden by removing old documentation or editor branding.
# Platform-generated authentication files

Lovable Cloud recreates `src/integrations/supabase/client.ts` and
`previewAuthStorage.ts` during function deployment. Deleting them repeatedly
does not disable that generator. They remain platform-owned and unused; Nolto
uses `src/lib/supabase.ts` with its existing session and MFA handling.

The source check tolerates only these two exact generated paths when unreachable
from the application. It fails if either is imported into the runtime graph or
loses its generated-file marker. Credential scanning still includes them, and
other unreachable source files still fail. Do not wire the preview session
broker into production or delete these files as a deployment workaround.
