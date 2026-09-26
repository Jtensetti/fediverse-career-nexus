import { strict as assert } from "node:assert";
import { confirmationLink, emailLinkOrigin } from "../functions/_shared/federation-urls.ts";

function withEnv(site: string, extra: string | undefined, run: () => void) {
  const previous = { site: Deno.env.get("SITE_URL"), extra: Deno.env.get("EMAIL_LINK_ORIGINS") };
  try {
    Deno.env.set("SITE_URL", site);
    if (extra === undefined) Deno.env.delete("EMAIL_LINK_ORIGINS"); else Deno.env.set("EMAIL_LINK_ORIGINS", extra);
    run();
  } finally {
    if (previous.site === undefined) Deno.env.delete("SITE_URL"); else Deno.env.set("SITE_URL", previous.site);
    if (previous.extra === undefined) Deno.env.delete("EMAIL_LINK_ORIGINS"); else Deno.env.set("EMAIL_LINK_ORIGINS", previous.extra);
  }
}

Deno.test("SITE_URL alone trusts only itself: unlisted www/apex siblings fall back", () => withEnv("https://nolto.social", undefined, () => {
  assert.equal(emailLinkOrigin("https://nolto.social"), "https://nolto.social");
  assert.equal(emailLinkOrigin("https://www.nolto.social"), "https://nolto.social");
  assert.equal(emailLinkOrigin(null), "https://nolto.social");
}));

Deno.test("self-hosted SITE_URL: unlisted sibling is rejected, never replaced by nolto.social", () => withEnv("https://careers.example.org", undefined, () => {
  assert.equal(emailLinkOrigin(undefined), "https://careers.example.org");
  assert.equal(emailLinkOrigin("https://www.careers.example.org"), "https://careers.example.org");
  assert.equal(emailLinkOrigin("https://nolto.social"), "https://careers.example.org");
}));

Deno.test("an explicitly listed sibling works in both directions", () => {
  withEnv("https://nolto.social", "https://www.nolto.social", () => {
    assert.equal(emailLinkOrigin("https://www.nolto.social"), "https://www.nolto.social");
  });
  withEnv("https://www.nolto.social", "https://nolto.social", () => {
    assert.equal(emailLinkOrigin("https://nolto.social"), "https://nolto.social");
    assert.equal(emailLinkOrigin("https://www.nolto.social"), "https://www.nolto.social");
  });
});

Deno.test("malformed, credential, path, query and port variants never expand trust", () => withEnv("https://nolto.social",
  "https://www.nolto.social/, https://user:pw@a.example, https://b.example/path, https://c.example?x=1, https://*.example, .nolto.social, https://d.example:8443, http://e.example, garbage", () => {
  for (const origin of ["https://evil.example", "https://nolto.social.evil.example", "https://evilnolto.social", "http://nolto.social",
    "https://nolto.social:8443", "https://user:pw@nolto.social", "https://nolto.social/path", "https://nolto.social/", "null", "not a url", "",
    "https://www.nolto.social", "https://a.example", "https://b.example", "https://c.example", "https://x.example", "https://sub.nolto.social",
    "https://d.example", "https://d.example:9443", "http://e.example", "https://preview--x.lovable.app", "http://localhost:8080"]) {
    assert.equal(emailLinkOrigin(origin), "https://nolto.social", origin);
  }
  assert.equal(emailLinkOrigin("https://d.example:8443"), "https://d.example:8443");
}));

Deno.test("preview and localhost origins work only when listed exactly", () => withEnv("https://nolto.social",
  " https://id-preview--abc.lovable.app , http://localhost:8080", () => {
  assert.equal(emailLinkOrigin("https://id-preview--abc.lovable.app"), "https://id-preview--abc.lovable.app");
  assert.equal(emailLinkOrigin("http://localhost:8080"), "http://localhost:8080");
  assert.equal(emailLinkOrigin("http://localhost:3000"), "https://nolto.social");
  assert.equal(emailLinkOrigin("https://other-preview.lovable.app"), "https://nolto.social");
}));

Deno.test("signup/resend link targets /confirm-email and round-trips the token for the consumer", () => withEnv("https://nolto.social", "https://www.nolto.social", () => {
  const token = "a+b/c=d&e f";
  for (const [origin, expected] of [["https://www.nolto.social", "https://www.nolto.social"], ["https://evil.example", "https://nolto.social"]]) {
    const link = new URL(confirmationLink(origin, token));
    assert.equal(link.origin, expected);
    assert.equal(link.pathname, "/confirm-email");
    assert.equal(link.searchParams.get("token"), token); // what ConfirmEmail.tsx reads via useSearchParams
    assert.equal([...link.searchParams.keys()].length, 1);
  }
}));
