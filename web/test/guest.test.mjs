// A visitor without an account: tracks, addresses, titles, Back, the challenge page, getting started.
import test from "node:test";
import assert from "node:assert/strict";
import { startSite } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());

test("home shows both tracks and a way to get started", async () => {
  const p = await site.learner(null);
  await p.open("/");
  assert.match(await p.title(), /^Timirtbet/);
  assert.equal(await p.locator(".track-js").count(), 1);
  assert.equal(await p.locator(".track-go").count(), 1);
  assert.ok(await p.locator('a[href="/api/auth/github"]').count(), "a Sign in with GitHub link");
  await p.close();
});

test("every screen has its own address and title, and Back works", async () => {
  const p = await site.learner(null);
  await p.open("/");
  await p.locator(".track-js").click(); await p.waitForTimeout(200);
  assert.equal(new URL(p.url()).pathname, "/challenges/js");
  assert.match(await p.title(), /^JavaScript challenges/);
  await p.locator('[data-act="open"][data-id="js-vars"]').first().click(); await p.waitForTimeout(200);
  assert.equal(new URL(p.url()).pathname, "/challenges/js/basic/vars");
  assert.match(await p.title(), /JavaScript basic · Timirtbet$/);
  await p.goBack(); await p.waitForTimeout(200);
  assert.equal(new URL(p.url()).pathname, "/challenges/js");
  await p.goBack(); await p.waitForTimeout(200);
  assert.equal(new URL(p.url()).pathname, "/");
  await p.close();
});

test("addresses open directly, and unknown ones are tidied", async () => {
  const p = await site.learner(null);
  await p.open("/challenges/go/advanced");
  assert.match(await p.title(), /^Go advanced challenges/);
  await p.open("/challenges/js/basic/loops");
  assert.ok((await p.text("h1")).length > 0);
  assert.equal(new URL(p.url()).pathname, "/challenges/js/basic/loops");
  await p.open("/challenges/js/nope");
  assert.equal(new URL(p.url()).pathname, "/challenges/js");
  await p.open("/no/such/page");
  assert.equal(new URL(p.url()).pathname, "/");
  await p.close();
});

test("a guest can read a challenge and its tests, and sees how to start", async () => {
  const p = await site.learner(null);
  await p.open("/challenges/js/basic/vars");
  assert.ok(await p.locator("#testList .t-row").count() >= 3, "the tests are listed");
  assert.equal(await p.locator(".run-btn").count(), 0, "no Run button without an account");
  assert.match(await p.text(".task-start"), /GitHub account/);
  assert.equal(await p.locator("#pushPanel").count(), 0);
  assert.ok(await p.locator("#prPanel .mod-list li").count() >= 3, "the module overview");
  await p.close();
});

test("getting started explains the GitHub account", async () => {
  const p = await site.learner(null);
  await p.open("/signin");
  assert.match(await p.title(), /^Get started/);
  assert.equal(await p.locator(".start-steps li").count(), 3);
  assert.match(await p.text(".start-steps"), /Create a free GitHub account/);
  await p.close();
});

test("screens that need an account ask guests to sign in", async () => {
  const p = await site.learner(null);
  for (const path of ["/reviews", "/circle", "/u/someone"]) {
    await p.open(path);
    assert.match(await p.text("#app"), /Sign in with GitHub/, path);
  }
  await p.close();
});
