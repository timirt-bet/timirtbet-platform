// The router (src/app.js): the header's sections open their screens, addresses and titles follow,
// and Back and Forward move between screens.
import test from "node:test";
import assert from "node:assert/strict";
import { startSite } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());

test("sections open from the header; Back and Forward work", async () => {
  const p = await site.learner("br-mulu");
  await p.open("/");
  for (const [v, path, title] of [["reviews", "/reviews", /^Reviews · /], ["circle", "/circle", /^Review circle · /], ["profile", "/profile", /^Profile · /], ["challenges", "/challenges", /^Challenges · /]]) {
    await p.locator(`nav.main [data-v="${v}"]`).click(); await p.waitForTimeout(150);
    assert.equal(new URL(p.url()).pathname, path);
    assert.match(await p.title(), title);
    assert.equal(await p.locator(`nav.main [data-v="${v}"][aria-current="page"]`).count(), 1);
  }
  await p.evaluate(() => window.TBOld.openEx("js-vars")); await p.waitForTimeout(200);
  assert.equal(new URL(p.url()).pathname, "/challenges/js/basic/vars");
  assert.ok(await p.locator("#testList .t-row").count() >= 3);
  await p.goBack(); await p.waitForTimeout(200);
  assert.equal(new URL(p.url()).pathname, "/challenges");
  assert.equal(await p.locator(".tracks .track").count(), 2);
  await p.goForward(); await p.waitForTimeout(200);
  assert.match(await p.text("h1"), /What type is it\?/);
  // The name in the header goes home: what is next, then how the site works.
  await p.locator('header .brand').click(); await p.waitForTimeout(150);
  assert.equal(new URL(p.url()).pathname, "/");
  assert.match(await p.title(), /^Timirtbet/);
  assert.equal(await p.locator(".upnext").count(), 1);
  assert.equal(await p.locator("#how .day li").count(), 6);
  await p.close();
});
