// Two learners: one submits a finished module, the other reviews it within the 72-hour clock,
// the author nudges, the reviewer writes the review, and the author rates it.
import test from "node:test";
import assert from "node:assert/strict";
import { startSite, NEEDS_ANSWERS, MODULE_1, answer } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());

test("submit, see the reviewer and clock, nudge, review, rate", { skip: NEEDS_ANSWERS }, async () => {
  const reviewer = await site.learner("rv-selam");
  const author = await site.learner("rv-yonas");
  for (const id of MODULE_1) { await reviewer.push(id, answer(id)); await author.push(id, answer(id)); }

  // The author submits the module from the challenge page.
  await author.open("/challenges/js/basic/func");
  await author.locator('#prPanel [data-act="submit-module"]').click();
  await author.waitForSelector("#prPanel .in-review");
  assert.match(await author.text("#prPanel .in-review"), /Reviewed by @rv-selam/);
  assert.match(await author.text("#prPanel [data-due]"), /^2d 23h left|^3d 0h left/);
  assert.equal(await author.getAttribute("#prPanel [data-due]", "class"), "due ok");

  // Nudge: once, then the button waits 12 hours.
  await author.locator('#prPanel [data-act="nudge"]').click();
  await author.waitForFunction(() => /Nudged · again/.test(document.querySelector("#prPanel .in-review").textContent));
  assert.match(await author.text("#prPanel .in-review"), /Nudged · again in 12 h/);
  assert.match(await author.text("#prPanel .in-review"), /Sent\. @rv-selam got a notification/);

  // The track page shows the same reviewer and clock.
  await author.open("/challenges/js");
  assert.match(await author.text("details.mod .mod-foot"), /In review by @rv-selam \d+d \d+h left/);

  // The reviewer: the queue with the clock, and the nudge in the bell.
  await reviewer.open("/reviews");
  assert.equal(await reviewer.locator(".q-row").count(), 1);
  assert.match(await reviewer.text(".q-row [data-due]"), /left$/);
  assert.match(await reviewer.text('nav.main [data-v="reviews"]'), /Reviews 1/);
  await reviewer.locator("#bellBtn").click(); await reviewer.waitForTimeout(300);
  assert.match(await reviewer.text("#bellPop"), /@rv-yonas is waiting for your review of/);
  await reviewer.locator('#bellPop [data-act="notif"]').first().click(); await reviewer.waitForTimeout(400);
  assert.match(new URL(reviewer.url()).pathname, /^\/reviews\/.+/, "the nudge opens the review");
  assert.match(await reviewer.text(".rv-due"), /Due .*left The author can see this clock too\./);

  // Write the review: the Send button waits for the rubric and 40 characters.
  assert.equal(await reviewer.locator("#rvSend").isDisabled(), true);
  for (const b of await reviewer.locator('[data-act="rub"][data-v="2"]').all()) await b.click();
  await reviewer.fill("#rvText", "Clear names in describe and greet. In the loop, sum with reduce to make it shorter.");
  await reviewer.waitForTimeout(100);
  assert.equal(await reviewer.locator("#rvSend").isDisabled(), false);
  await reviewer.locator("#rvSend").click(); await reviewer.waitForTimeout(600);
  assert.equal(new URL(reviewer.url()).pathname, "/reviews");
  assert.equal(await reviewer.locator(".q-row").count(), 0);

  // The author sees the review and rates it.
  await author.open("/challenges/js/basic/func");
  assert.match(await author.text("#prPanel .review"), /sum with reduce/);
  await author.locator('#prPanel [data-act="rate"][data-s="4"]').click();
  await author.waitForFunction(() => /You rated it/.test(document.getElementById("prPanel").textContent));
  assert.match(await author.text("#prPanel"), /Their reputation/);

  // The reviewer hears about the rating.
  await reviewer.open("/reviews");
  assert.match(await reviewer.text(".panel .act"), /★★★★☆/);
  await reviewer.close(); await author.close();
});
