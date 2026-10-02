// Every message has an Amharic version, and t() fills in placeholders. No browser needed.
import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/next/messages/en.js";
import am from "../src/next/messages/am.js";
import fs from "node:fs";
import { t, lang, setLang } from "../src/next/i18n.js";

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

test("every English message has an Amharic translation, and nothing extra", () => {
  const missing = Object.keys(en).filter((k) => !(typeof am[k] === "string" && am[k].trim()));
  assert.deepEqual(missing, [], `add these keys to src/next/messages/am.js`);
  const extra = Object.keys(am).filter((k) => !(k in en));
  assert.deepEqual(extra, [], `these keys in am.js are not in en.js`);
});

test("translations keep the same {placeholders}", () => {
  const wrong = Object.keys(en).filter((k) => am[k] && placeholders(en[k]) !== placeholders(am[k]));
  assert.deepEqual(wrong, []);
});

test("no key is written twice (the second would silently replace the first)", () => {
  for (const f of ["en.js", "am.js"]) {
    const keys = [...fs.readFileSync(new URL(`../src/next/messages/${f}`, import.meta.url), "utf8").matchAll(/^  (\w+):/gm)].map((m) => m[1]);
    const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
    assert.deepEqual(dup, [], f);
  }
});

test("keys are plain names", () => {
  for (const k of Object.keys(en)) assert.match(k, /^[a-z][a-z0-9_]*$/, k);
});

test("t() follows the language, fills placeholders, and falls back safely", () => {
  setLang("en");
  assert.equal(t("run_the_tests"), "▶ Run the tests");
  setLang("am");
  assert.equal(lang.value, "am");
  assert.equal(t("run_the_tests"), "▶ ሙከራዎቹን አሂድ");
  // A key with no Amharic falls back to English, an unknown key to itself.
  assert.equal(t(/** @type {any} */ ("no_such_key")), "no_such_key");
  setLang("en");
  en.__test = "{n} of {total} passed";
  assert.equal(t(/** @type {any} */ ("__test"), { n: 3, total: 5 }), "3 of 5 passed");
  assert.equal(t(/** @type {any} */ ("__test"), { n: 3 }), "3 of {total} passed", "an unknown placeholder is left visible");
  delete en.__test;
});
