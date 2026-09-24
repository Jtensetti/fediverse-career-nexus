import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLanguageSwitcher } from "../src/i18n/switcher.ts";

const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test("latest selection wins when an earlier load resolves later", async () => {
  const loads = {}; const applied = []; const persisted = [];
  const sw = createLanguageSwitcher({ load: l => (loads[l] = deferred()).promise, apply: async l => applied.push(l), persist: l => persisted.push(l) });
  const slow = sw("ja"); const fast = sw("de");
  loads.de.resolve(); assert.equal(await fast, "applied");
  loads.ja.resolve(); assert.equal(await slow, "superseded");
  assert.deepEqual(applied, ["de"]); assert.deepEqual(persisted, ["de"]);
});

test("failed load keeps the previous language and reports once", async () => {
  const applied = []; const errors = [];
  const sw = createLanguageSwitcher({ load: async () => { throw new Error("chunk"); }, apply: async l => applied.push(l), persist: () => assert.fail("must not persist"), onError: l => errors.push(l) });
  assert.equal(await sw("fr"), "failed");
  assert.deepEqual(applied, []); assert.deepEqual(errors, ["fr"]);
});

test("stale failure after a newer selection is silent", async () => {
  const loads = {}; const errors = [];
  const sw = createLanguageSwitcher({ load: l => (loads[l] = deferred()).promise, apply: async () => {}, onError: l => errors.push(l) });
  const a = sw("it"); const b = sw("nl");
  loads.it.reject(new Error("x")); loads.nl.resolve();
  assert.equal(await a, "superseded"); assert.equal(await b, "applied"); assert.deepEqual(errors, []);
});

test("app root is not remounted on language change", () => {
  const main = readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(main, /<App\s+key=/);
});

test("every locale has the language load failure message", () => {
  for (const l of ["sv", "en", "fr", "de", "nl", "es", "ja", "it"]) {
    const j = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${l}.json`, import.meta.url), "utf8"));
    assert.ok(j.language.loadFailed?.length > 10, l);
  }
});
