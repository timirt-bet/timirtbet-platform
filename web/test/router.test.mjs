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
  for (const [v, path, title] of [["reviews", "/reviews", /^Reviews · /], ["circle", "/circle", /^Review circle · /], ["profile", "/profile", /^Profile · /], ["challenges", "/", /^Timirtbet/]]) {
    await p.locator(`nav.main [data-v="${v}"]`).click(); await p.waitForTimeout(150);
    assert.equal(new URL(p.url()).pathname, path);
    assert.match(await p.title(), title);
    assert.equal(await p.locator(`nav.main [data-v="${v}"][aria-current="page"]`).count(), 1);
  }
  await p.evaluate(() => window.TBOld.openEx("js-vars")); await p.waitForTimeout(200);
  assert.equal(new URL(p.url()).pathname, "/challenges/js/basic/vars");
  assert.ok(await p.locator("#testList .t-row").count() >= 3);
  await p.goBack(); await p.waitForTimeout(200);
  assert.equal(new URL(p.url()).pathname, "/");
  assert.equal(await p.locator(".upnext").count(), 1);
  await p.goForward(); await p.waitForTimeout(200);
  assert.match(await p.text("h1"), /What type is it\?/);
  await p.close();
});
