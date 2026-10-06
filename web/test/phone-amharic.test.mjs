// Phone width (390 px) and Amharic: no sideways scrolling, and the main words are translated.
import test from "node:test";
import assert from "node:assert/strict";
import { startSite, NEEDS_ANSWERS, answer } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());
const fitsWidth = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

test("guest screens fit a phone", async () => {
  const p = await site.learner(null, { width: 390, height: 800 });
  for (const path of ["/", "/challenges/js", "/challenges/go/basic/vars", "/signin"]) {
    await p.open(path);
    assert.ok(await fitsWidth(p), `${path} scrolls sideways`);
  }
  await p.close();
});

test("signed-in screens fit a phone, in Amharic", async () => {
  const p = await site.learner("am-kidist", { width: 390, height: 800, lang: "am" });
  await p.open("/challenges/js/basic/vars");
  assert.equal(await p.text(".run-btn"), "▶ ሙከራዎቹን አሂድ");
  assert.match(await p.text("#pushPanel"), /እንዴት እንደሚያስገቡ/);
  assert.ok(await fitsWidth(p), "challenge page");
  await p.open("/profile");
  assert.match(await p.text(".acct-card"), /ውጣ/);
  assert.ok(await fitsWidth(p), "account page");
  for (const path of ["/reviews", "/circle", "/u/am-kidist"]) { await p.open(path); assert.ok(await fitsWidth(p), path); }
  await p.close();
});

test("the celebration in Amharic", { skip: NEEDS_ANSWERS }, async () => {
  const p = await site.learner("am-lemlem", { width: 390, height: 800, lang: "am" });
  await p.open("/challenges/js/basic/vars");
  await p.commit("js-vars", answer("js-vars"));
  await p.locator(".run-btn").click();
  await p.waitForSelector("#hooray", { timeout: 30000 });
  assert.match(await p.text(".hooray-card"), /ተግዳሮቱ ተጠናቋል!/);
  assert.match(await p.text(".hooray-pts"), /\+10 ነጥቦች/);
  await p.close();
});
