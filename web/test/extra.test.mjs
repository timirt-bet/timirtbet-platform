// Extra (hidden) checks: a solution that only handles the visible examples is not solved,
// the learner sees an "Extra checks" row that says so without revealing the inputs,
// and a general solution passes them.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startSite } from "./harness.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "timirtbet-extra-"));
const hiddenFile = path.join(dir, "hidden.json");
fs.writeFileSync(hiddenFile, JSON.stringify({ "js-vars": [{ t: 'eq(describe(NaN), "number"); eq(describe(new Map()), "object");' }] }));
const site = await startSite({ env: { HIDDEN_TESTS_FILE: hiddenFile } });
test.after(() => { site.stop(); fs.rmSync(dir, { recursive: true, force: true }); });

async function run(p) {
  await p.locator(".run-btn").click();
  await p.waitForFunction(() => { const b = document.querySelector(".run-btn"); return b && !b.disabled; }, null, { timeout: 30000 });
  await p.waitForTimeout(300);
  return p.text("#tSum");
}

const MEMORISED = 'function describe(v) { if (v === 42 || v === 3.5) return "number"; if (v === "selam") return "string"; if (v === false) return "boolean";\n' +
  'if (v === undefined) return "undefined"; if (v === null) return "null"; if (Array.isArray(v)) return "array"; if (v && v.city) return "object"; }\n';
const GENERAL = 'function describe(v) { return v === null ? "null" : Array.isArray(v) ? "array" : typeof v; }\n';

test("visible tests pass but extra checks fail: not solved, and the inputs stay hidden", async () => {
  const p = await site.learner("extra-1");
  await p.open("/challenges/js/basic/vars");
  await p.commit("js-vars", MEMORISED);
  assert.match(await run(p), /All 6 tests passed, but some extra checks did not/);
  assert.equal(await p.locator("#testList .t-row.fail").count(), 1);
  const row = await p.text("#testList .t-row.extra");
  assert.match(row, /Extra checks 0\/1/);
  assert.doesNotMatch(row, /NaN|Map/);
  assert.equal(await p.locator("#hooray").count(), 0);

  await p.waitForTimeout(5200); // one grading run per learner every 5 seconds
  await p.commit("js-vars", GENERAL);
  assert.match(await run(p), /All 6 passed|Solved/);
  assert.match(await p.text("#testList .t-row.extra.pass"), /Extra checks 1\/1/);
  assert.equal(await p.locator("#hooray").count(), 1, "solved for the first time");
  await p.close();
});
