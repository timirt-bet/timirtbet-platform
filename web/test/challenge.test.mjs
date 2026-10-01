// A signed-in learner on a challenge: commit, press Run the tests, see each test tick or fail,
// the celebration on a first pass (once), module progress, and the module becoming ready.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startSite, ROOT, NEEDS_ANSWERS, answer } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());
const BANK = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, "challenges/exercises.json"), "utf8")).map((e) => [e.id, e]));
const WAIT = 5200; // the API allows one real grading run per learner every 5 seconds

// Presses Run the tests and waits until the summary settles.
async function run(p) {
  await p.locator(".run-btn").click();
  await p.waitForFunction(() => { const b = document.querySelector(".run-btn"); return b && !b.disabled; }, null, { timeout: 30000 });
  await p.waitForTimeout(300);
  return p.text("#tSum");
}

test("signed in, the challenge page shows how to submit and the Run button", async () => {
  const p = await site.learner("ch-steps");
  await p.open("/challenges/js/basic/vars");
  assert.equal(await p.locator("#pushPanel .gh-steps li").count(), 4);
  assert.match(await p.getAttribute('#pushPanel a[href*="/edit/main/"]', "href"), /\/edit\/main\/js\/js-vars\/solution\.js$/);
  assert.equal(await p.locator(".run-btn").count(), 1);
  assert.equal(await p.text("#tSum"), "", "no old results on first visit");
  assert.equal(await p.getAttribute('#prPanel .mod-list li.cur', "class"), "started cur", "opening a challenge marks it started");
  await p.close();
});

test("nothing committed, or only the starter code: a clear message and nothing graded", async () => {
  const p = await site.learner("ch-empty");
  await p.open("/challenges/js/basic/vars");
  assert.match(await run(p), /There is no js\/js-vars\/solution\.js on main/);
  await p.commit("js-vars", BANK["js-vars"].starter);
  assert.match(await run(p), /still has the starter code/);
  assert.equal(await p.locator("#testList .t-row.fail").count(), 0);
  await p.close();
});

test("a wrong answer: failing tests show their message, no celebration", async () => {
  const p = await site.learner("ch-wrong");
  await p.open("/challenges/js/basic/vars");
  await p.commit("js-vars", "function describe(v) { return 'nope'; }");
  assert.match(await run(p), /\b\d+ of \d+ passed$/);
  assert.ok(await p.locator("#testList .t-row.fail").count() > 0);
  assert.ok((await p.text("#testList .t-row.fail .t-msg")).length > 0, "the first failure says why");
  assert.equal(await p.locator("#hooray").count(), 0);
  await p.close();
});

test("first pass: every test ticks, the celebration shows once, and progress is saved", { skip: NEEDS_ANSWERS }, async () => {
  const p = await site.learner("ch-pass");
  await p.open("/challenges/js/basic/vars");
  await p.commit("js-vars", answer("js-vars"));
  assert.match(await run(p), /^(All \d+ passed ✓|Solved ✓)/);
  assert.equal(await p.locator("#testList .t-row.pass").count(), await p.locator("#testList .t-row").count());
  await p.waitForSelector("#hooray");
  assert.match(await p.text(".hooray-card"), /Challenge complete!/i);
  assert.match(await p.text(".hooray-pts"), /^\+10 points$/);
  assert.match(await p.text('[data-hooray="next"]'), /^Next: /);
  await p.mouse.click(10, 10); await p.waitForTimeout(400);
  assert.equal(await p.locator("#hooray").count(), 0, "a click anywhere closes it");
  assert.match(await p.text("#tSum"), /^Solved ✓/);
  assert.equal(await p.getAttribute('#prPanel .mod-list li.cur', "class"), "done cur");

  await p.reload(); await p.ready();
  assert.equal(await p.locator("#hooray").count(), 0, "not again after a reload");
  assert.match(await p.text("#tSum"), /^Solved ✓/);
  await p.waitForTimeout(WAIT);
  await run(p);
  assert.equal(await p.locator("#hooray").count(), 0, "not again after running the tests again");
  await p.close();
});

test("Next opens the following challenge; Escape also closes the celebration", { skip: NEEDS_ANSWERS }, async () => {
  const p = await site.learner("ch-next");
  await p.open("/challenges/js/basic/cond");
  await p.commit("js-cond", answer("js-cond"));
  await run(p);
  await p.waitForSelector("#hooray");
  await p.locator('[data-hooray="next"]').click(); await p.waitForTimeout(500);
  assert.equal(new URL(p.url()).pathname, "/challenges/js/basic/vars", "the first unsolved challenge in the module");
  await p.commit("js-vars", answer("js-vars"));
  await p.waitForTimeout(WAIT);
  await run(p);
  await p.waitForSelector("#hooray");
  await p.keyboard.press("Escape"); await p.waitForTimeout(400);
  assert.equal(await p.locator("#hooray").count(), 0);
  await p.close();
});

test("the last challenge of a module: the celebration says so, and the module can be submitted", { skip: NEEDS_ANSWERS }, async () => {
  const p = await site.learner("ch-module");
  for (const id of ["js-vars", "js-cond", "js-loops"]) await p.push(id, answer(id));
  await p.open("/challenges/js/basic/func");
  assert.equal(await p.locator("#prPanel .mod-list li.done").count(), 3);
  await p.commit("js-func", answer("js-func"));
  await run(p);
  await p.waitForSelector("#hooray");
  assert.match(await p.text(".hooray-card"), /finishes Module 1/);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  assert.equal(await p.locator("#prPanel .mod-list li.done").count(), 4);
  assert.equal(await p.locator('#prPanel [data-act="submit-module"]').count(), 1);
  await p.close();
});
