// The migration bridge: a screen registered with the new front end replaces the old one,
// and moving between new and old screens keeps both working.
import test from "node:test";
import assert from "node:assert/strict";
import { startSite } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());

test("a registered screen is drawn by the new code; old screens still work around it", async () => {
  const p = await site.learner("br-mulu");
  await p.open("/profile");
  await p.evaluate(() => window.TBNext.register("circle", () => "New circle screen"));
  await p.locator('nav.main [data-v="circle"]').click(); await p.waitForTimeout(200);
  assert.equal(await p.text("#app"), "New circle screen");
  await p.locator('nav.main [data-v="challenges"]').click(); await p.waitForTimeout(200);
  assert.ok(await p.locator(".tracks").count() >= 1, "back on an old screen");
  assert.equal(await p.locator("#app[data-next]").count(), 0, "the old screen owns #app again");
  await p.goBack(); await p.waitForTimeout(200);
  assert.equal(await p.text("#app"), "New circle screen", "Back returns to the new screen");
  await p.close();
});
