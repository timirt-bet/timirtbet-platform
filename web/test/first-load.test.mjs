// The first moments after opening the site: someone who was signed in here sees their own layout
// (with placeholders) while the server answers, never the guest page; and the sign-in page never
// sends a signed-in person to their profile.
import test from "node:test";
import assert from "node:assert/strict";
import { startSite } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());

test("while the first answer is slow, a returning learner sees placeholders, not the guest page", async () => {
  const p = await site.learner("fl-back");
  // Hold /api/me for a moment, as a slow connection would.
  let release; const held = new Promise((r) => { release = r; });
  await p.route("**/api/me", async (route) => { await held; await route.continue(); });
  await p.goto(site.base + "/");
  await p.waitForSelector(".upnext.skel");
  assert.equal(await p.locator(".hero").count(), 0, "no guest welcome");
  assert.equal(await p.locator('#who [data-v="signin"]').count(), 0, "no Sign in button");
  assert.match(await p.text("#who"), /@fl-back/);
  release();
  await p.waitForSelector(".upnext:not(.skel)");
  assert.equal(await p.locator(".upnext.skel").count(), 0);
  await p.unroute("**/api/me");
  await p.close();
});

test("a new visitor sees the guest page straight away", async () => {
  const p = await site.learner(null);
  await p.open("/");
  assert.equal(await p.locator(".upnext.skel").count(), 0);
  assert.equal(await p.locator(".hero").count(), 1);
  assert.match(await p.text("h1"), /Learn to code/);
  await p.close();
});

test("signed in, the sign-in page goes to the home page, not the profile", async () => {
  const p = await site.learner("fl-signin");
  await p.open("/signin");
  await p.waitForURL(site.base + "/");
  assert.equal(new URL(p.url()).pathname, "/");
  await p.close();
});
