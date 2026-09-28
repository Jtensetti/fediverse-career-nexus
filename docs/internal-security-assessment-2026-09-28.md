# Internal security assessment — 28 September 2026

This was an internal, AI-assisted assessment of Nolto's isolated test environment and source code, authorized by its operator. It was not an Aikido scan, an independent penetration test or a certification. Four findings were confirmed within the scope below. A passing check does not establish that the application has no other vulnerabilities.

## Scope and method

Attack requests were limited to the temporary Nolto test frontend and its dedicated backend. Synthetic accounts and fixtures were used. Production was inspected through source and read-only database metadata; production was not an attack target. Database mutation tests used transactions followed by rollback. No denial-of-service testing, live remote-peer cache prewarming, third-party exploitation, recovery-token issuance or real-user account changes were performed.

The test application was synchronized from production before assessment. Database definitions alone were not sufficient evidence of parity: the permission differences described in IA-01 were discovered and corrected separately. A later production language update (PR #85, base `a962155`) was preserved in the remediation source. Test-specific configuration and verification files remain isolated.

Methods included bounded HTTP requests, invalid/missing-token checks, real test-database role and JWT-claim contexts, source review, local behavioral regressions and dependency advisory checks. The platform blocked automatic sign-in as the synthetic accounts. Consequently, authenticated browser/HTTP acceptance testing of the hosted clone was not completed. SQL role/claim tests exercise database policies but do not prove the complete hosted authentication path.

## Findings and remediation status

| ID | Finding | Assessed severity and reach | Status |
| --- | --- | --- | --- |
| IA-01 | Broader function and column permissions in the test clone | High, isolated test environment | Fixed and independently verified in test; corresponding sensitive production permissions were already restricted |
| IA-02 | Self-assigned article authorship passed an ownership check | High, authorization boundary; common policy also present in production | Fixed and deployed to test and production; live test role regressions passed and production policy metadata verified |
| IA-03 | Cache refresh bypassed existing remote-fetch validation | Medium, administrator-triggered refresh | Fixed and deployed to test and production; mocked handler regressions passed; no live remote cache prewarm performed |
| IA-04 | Client-supplied MFA recovery context treated as login evidence | Medium, misleading recovery-review evidence | Fixed and deployed to test and production; handler regressions passed and anonymous test submission still worked |

### IA-01 — test-clone permissions

The cloned database had effectively broader execution permissions for 121 common functions, as well as differences in table and column grants. A rolled-back synthetic canary demonstrated unauthorized retrieval through a key-access function; no real private key was retrieved. A synthetic email lookup also succeeded anonymously. Production metadata showed the corresponding sensitive functions and private-key column were restricted.

The test clone's common-object grants were restored to the production baseline after schema, owner and function-definition checks. An independent read-only comparison then found **zero ACL differences across 160 common functions, 122 relations and 965 columns**. Function definition hashes still matched. Test-only objects, storage metadata and default privileges were unchanged. Sensitive key/lookup HTTP checks were denied afterward. This verifies parity with the existing production baseline, not a claim that every production grant is the minimum possible.

### IA-02 — article authorship

A verified but unrelated synthetic reader could add itself as a primary author with editing flags on another user's synthetic draft. The ownership helper subsequently returned true. Direct draft reads remained blocked; draft-content disclosure or a complete account takeover was not demonstrated. Read-only inspection confirmed the same permissive write policy and relevant grants in production.

The migration separates insert, update and delete policies: actual article owners manage collaborators, primary attribution is protected, and secondary collaborators may leave. Existing visibility and session policies remain. The regression fails without the fix and passes with it, including legitimate owner operations and denied self-assignment.

### IA-03 — remote cache refresh

The administrative cache-refresh path used an ordinary fetch and unbounded JSON parsing instead of the application's existing actor-fetch helper. Mocked tests reproduced missing redirect, private-DNS, timeout-signal, body-size and actor-identity checks. No internal endpoint was accessed and no live remote cache refresh was triggered.

Refresh now uses the existing helper and treats failed cache writes as failures. The helper's DNS validation is not pinned to the connection's resolved address; this assessment does not establish protection against every DNS-rebinding or SSRF variant.

### IA-04 — MFA recovery evidence

One anonymous request to the isolated test backend confirmed that a requester could supply the field formerly described as password-validated login context. Application email delivery was disabled for that test. The finding concerned trust in that field and its priority when identifying an account; recovery links still went to the registered account address. No recovery token was issued or consumed, and no MFA bypass or account takeover was demonstrated.

The field is now explicitly labeled unverified in the review interface and notification. The issuance handler ignores it when identifying an account, including on older requests. Anonymous support submission remains available. Retaining the field as unverified context is intentional. A second synthetic request after deployment returned success; both assessment requests were deleted afterward and their absence verified. No token was issued or consumed.

## Verification results

- **63/63 bounded HTTP checks passed after permission remediation.** These include positive controls, sensitive-table denial/empty responses, missing/invalid-token rejection, private-key/RPC denial, public-media path checks and denied anonymous storage writes. They are checks, not 63 distinct exploitable attacks.
- Live SQL role/claim tests confirmed owner access and blocked unrelated-user access to synthetic private posts, replies/reactions, draft article data, hidden skills and endorsements. Own updates succeeded; foreign updates did not. Self-assigned admin roles and forged user-editable admin metadata did not grant administration. All fixtures were rolled back and absence checked.
- A rate-limit probe was blocked on the eleventh request and remained blocked after changing the supplied forwarding header. No forwarding-header bypass was reproduced.
- New cache/MFA handler tests changed from **3 passing / 7 failing before the fix to 10/10 passing afterward**. The complete Deno suite passed **86/86**. Network calls in these regressions were mocked.
- Local rendering, article-media and encryption checks passed **10/10**; translation checks passed **6/6**. Privacy regressions, TypeScript checks and a production frontend build passed. The build retains its existing bundle-size advisory.
- `npm audit` reported **0 advisories across 471 dependencies** at the time checked. This is a registry-advisory result, not proof of dependency safety.

All five CI jobs passed for the final reviewed remediation code at `a971667`: [application, container, structural fresh-install and mobile checks](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36425487834), and [real Supabase fresh-install acceptance](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36425487887). The latter exercised real local Auth, password login, owner-profile access and signup email confirmation in a disposable stack. The [test report/translation checks](https://github.com/Jtensetti/nolto-security-test-20260927/actions/runs/36425529850) also passed. These local CI flows do not remove the hosted-clone authentication limitation above.

Earlier trust-center figures (99/99, 8/8 and TC-01–TC-05) belong to the separate 27–28 September review and must not be interpreted as totals for this assessment.

## Deployment verification — 28 September 2026

- [Test PR #2](https://github.com/Jtensetti/nolto-security-test-20260927/pull/2) was merged before backend deployment. The deployed article policies passed all 11 positive/negative control groups and the complete live SQL role matrix. All synthetic article fixtures were rolled back, with absence checked. The 63 HTTP checks passed again after deployment.
- [Production PR #93](https://github.com/Jtensetti/fediverse-career-nexus/pull/93) was merged as `7c3a513` after green CI and successful test deployment. The production deployment service confirmed deployment of `cache-manager`, `request-mfa-recovery` and `admin-issue-mfa-recovery` from that source. It does not expose function version numbers in its response. Production exploit requests were not used to validate those functions; the source-level handler tests and deployment confirmation are the evidence.
- The hosted migration service recorded the policy change under versions `20260928125712` in test and `20260928130503` in production. Its generated copies retain idempotent policy guards. The canonical migration and hosted copies are retained in source; replaying the final chain passed the local privacy regression.
- An independent read-only comparison confirmed the full production article policy expressions match the verified test policies. The old permissive write policy is absent; existing read/session policies, grants and the ownership helper are unchanged. Production was not used for synthetic attack fixtures.

The trust-center update labels this as an internal assessment, separates the earlier review, and links this dated evidence and its limits.

## Limits

This assessment did not cover every route, role, integration, business-logic sequence or authenticated browser flow. The production Cloudflare perimeter was not attacked. Load resistance, third-party federation behavior, full MFA recovery end-to-end behavior and social engineering were outside the executed tests. Existing automated platform warnings were not comprehensively triaged; the four findings above are the confirmed findings within this assessment, not a total of every possible or automatically flagged issue. Aikido was prepared but not run; its paid assessment was not purchased.

Reproducible local regressions are included in `supabase/tests/cache-recovery-security.test.ts` and `scripts/test-support/article-author-assertions.sql`. Raw operational evidence is retained privately by the operator rather than publishing account/session identifiers or internal database snapshots.
