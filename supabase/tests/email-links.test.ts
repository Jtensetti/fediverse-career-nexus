import { strict as assert } from "node:assert";
import { emailLinkOrigin } from "../functions/_shared/federation-urls.ts";

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

Deno.test("signup on www receives a www link while SITE_URL is the apex (issue #49)", () => withEnv("https://nolto.social", undefined, () => {
  assert.equal(emailLinkOrigin("https://www.nolto.social"), "https://www.nolto.social");
  assert.equal(emailLinkOrigin("https://nolto.social"), "https://nolto.social");
  assert.equal(emailLinkOrigin(null), "https://nolto.social");
}));

Deno.test("split mode: SITE_URL on www still accepts an apex signup", () => withEnv("https://www.nolto.social", undefined, () => {
  assert.equal(emailLinkOrigin("https://nolto.social"), "https://nolto.social");
  assert.equal(emailLinkOrigin("https://www.nolto.social"), "https://www.nolto.social");
}));

Deno.test("self-hosted domains are respected, never replaced by nolto.social", () => withEnv("https://careers.example.org", undefined, () => {
  assert.equal(emailLinkOrigin(undefined), "https://careers.example.org");
  assert.equal(emailLinkOrigin("https://www.careers.example.org"), "https://www.careers.example.org");
  assert.equal(emailLinkOrigin("https://nolto.social"), "https://careers.example.org");
}));

Deno.test("untrusted or malformed origins fall back to SITE_URL", () => withEnv("https://nolto.social", undefined, () => {
  for (const origin of ["https://evil.example", "https://nolto.social.evil.example", "https://evilnolto.social", "http://nolto.social",
    "https://nolto.social:8443", "https://user:pw@nolto.social", "https://nolto.social/path", "null", "not a url", "",
    "https://preview--x.lovable.app", "http://localhost:8080"]) {
    assert.equal(emailLinkOrigin(origin), "https://nolto.social", origin);
  }
}));

Deno.test("preview and localhost origins work only when explicitly listed", () => withEnv("https://nolto.social",
  " https://id-preview--abc.lovable.app , http://localhost:8080, http://attacker.example, https://x.example/path, garbage", () => {
  assert.equal(emailLinkOrigin("https://id-preview--abc.lovable.app"), "https://id-preview--abc.lovable.app");
  assert.equal(emailLinkOrigin("http://localhost:8080"), "http://localhost:8080");
  assert.equal(emailLinkOrigin("http://attacker.example"), "https://nolto.social");
  assert.equal(emailLinkOrigin("https://x.example"), "https://nolto.social");
  assert.equal(emailLinkOrigin("https://other-preview.lovable.app"), "https://nolto.social");
}));
