import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildActorUrl,
  buildKeyId,
  buildInboxUrl,
  buildSharedInboxUrl,
  getFederationDomain,
  isLocalDomain,
  isLocalUrl,
  normalizeDomain,
} from "./federation-urls.ts";

Deno.test("normalizeDomain strips www and lowercases", () => {
  assertEquals(normalizeDomain("WWW.Samverkan.SE"), "samverkan.se");
  assertEquals(normalizeDomain("samverkan.se"), "samverkan.se");
});

Deno.test("isLocalDomain treats www-prefixed host as local", () => {
  const local = getFederationDomain();
  assert(isLocalDomain(local));
  assert(isLocalDomain(`www.${local}`));
  assert(!isLocalDomain("mastodon.social"));
  assert(!isLocalDomain(null));
});

Deno.test("isLocalUrl handles full URLs and bad input", () => {
  assert(isLocalUrl(`https://${getFederationDomain()}/functions/v1/actor/x`));
  assert(!isLocalUrl("https://mastodon.social/users/foo"));
  assert(!isLocalUrl("not a url"));
  assert(!isLocalUrl(null));
});

Deno.test("buildActorUrl/buildKeyId/buildInboxUrl share canonical base", () => {
  const a = buildActorUrl("alice");
  assert(a.startsWith(`https://${getFederationDomain()}/functions/v1/actor/`));
  assertEquals(buildKeyId("alice"), `${a}#main-key`);
  assert(buildInboxUrl("alice").endsWith("/inbox/alice"));
  assert(buildSharedInboxUrl().endsWith("/functions/v1/inbox"));
});
