// Home (Up next, tracks) and a track's page (modules, the next challenge, filters).
import test from "node:test";
import assert from "node:assert/strict";
import { startSite, NEEDS_ANSWERS, MODULE_1, answer } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());

test("a new learner sees the welcome notice once, then Up next points at the first challenge", async () => {
  const p = await site.learner("hm-abel");
  await p.open("/");
  assert.equal(await p.locator("#notice").count(), 0, "the harness already said OK");
  assert.match(await p.text(".upnext"), /Selam, @hm-abel/i);
  assert.match(await p.text(".un-h"), /^Up next: What type is it\?$/);
  assert.equal(await p.locator(".un-todo").count(), 0, "nothing waiting yet");
  await p.locator(".un-go").click(); await p.waitForTimeout(300);
  assert.equal(new URL(p.url()).pathname, "/challenges/js/basic/vars");
  await p.close();
});

test("the track page marks the next challenge and filters", async () => {
  const p = await site.learner("hm-bethel");
  await p.open("/challenges/js");
  assert.equal(await p.locator(".ch-row.next").count(), 1);
  assert.equal(await p.getAttribute(".ch-row.next", "data-id"), "js-vars");
  assert.match(await p.text(".ch-row.next"), /Next/i);
  assert.equal(await p.locator("details.mod[open]").count(), 1, "only the current module is open");
  await p.locator('[data-act="filter"][data-k="statusF"][data-v="solved"]').click();
  assert.match(await p.text("#app"), /No challenges match these filters/);
  await p.locator('[data-act="filter"][data-k="statusF"][data-v="all"]').click();
  await p.locator('[data-act="level"][data-v="advanced"]').click(); await p.waitForTimeout(200);
  assert.equal(new URL(p.url()).pathname, "/challenges/js/advanced");
  assert.ok(await p.locator("details.mod").count() >= 1);
  await p.close();
});

test("a finished module shows up as ready to submit, and submitting it from home works", { skip: NEEDS_ANSWERS }, async () => {
  const p = await site.learner("hm-chaltu");
  for (const id of MODULE_1) await p.push(id, answer(id));
  await p.open("/");
  assert.match(await p.text(".un-h"), /^Up next: /);
  assert.doesNotMatch(await p.text(".un-h"), /Greet in three languages/, "the next unsolved one, not a solved one");
  assert.match(await p.text(".un-todo"), /Module 1 · Basics 1.*Ready to submit/is);
  await p.locator('.un-todo [data-act="submit-module"]').click();
  await p.waitForFunction(() => !document.querySelector('.un-todo [data-act="submit-module"]'));
  await p.open("/challenges/js");
  assert.match(await p.text("details.mod"), /In review/);
  await p.close();
});
