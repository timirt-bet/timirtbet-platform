// Profiles, following, finding a learner, and review circles.
import test from "node:test";
import assert from "node:assert/strict";
import { startSite } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());

test("follow from a profile; the other learner hears about it; unfollow", async () => {
  const a = await site.learner("pp-abebe");
  const b = await site.learner("pp-bethel");
  await a.open("/u/pp-bethel");
  assert.match(await a.title(), /^@pp-bethel · Timirtbet/);
  assert.match(await a.text(".user-head"), /0 followers 0 following/);
  assert.equal(await a.text('[data-act="follow"]'), "Follow");
  await a.locator('[data-act="follow"]').click();
  await a.waitForFunction(() => document.querySelector('[data-act="follow"]').textContent.includes("Following"));
  assert.match(await a.text(".user-head"), /1 follower 0 following/);

  await a.locator('[data-act="utab"][data-t="followers"]').click();
  await a.waitForSelector(".people li");
  assert.match(await a.text(".people"), /@pp-abebe/);

  await b.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await b.waitForTimeout(800);
  await b.locator("#bellBtn").click(); await b.waitForTimeout(300);
  assert.match(await b.text("#bellPop"), /@pp-abebe started following you/);
  await b.locator('#bellPop [data-act="notif"]').first().click(); await b.waitForTimeout(500);
  assert.equal(new URL(b.url()).pathname, "/u/pp-abebe");
  assert.match(await b.text(".user-head"), /0 followers 1 following/);

  await a.open("/u/pp-bethel");
  await a.locator('[data-act="follow"]').click();
  await a.waitForFunction(() => document.querySelector('[data-act="follow"]').textContent.trim() === "Follow");
  assert.match(await a.text(".user-head"), /0 followers/);
  await a.close(); await b.close();
});

test("your own profile links to your public page; find a learner by username", async () => {
  const a = await site.learner("pp-chala");
  await site.learner("pp-dawit").then((p) => p.close());
  await a.open("/profile");
  await a.locator('[data-act="user"][data-login="pp-chala"]').click(); await a.waitForTimeout(400);
  assert.equal(new URL(a.url()).pathname, "/u/pp-chala");
  assert.equal(await a.text('.user-head [data-act="view"][data-v="profile"]'), "Your account", "no Follow button on yourself");
  await a.open("/profile");
  await a.fill("#findLogin", "@PP-Dawit");
  await a.locator('[data-form="find"] button').click(); await a.waitForTimeout(600);
  assert.equal(new URL(a.url()).pathname, "/u/pp-dawit", "the address uses the learner's own spelling");
  await a.open("/u/nobody-here");
  assert.match(await a.text(".lede"), /No learner with that GitHub username/);
  await a.close();
});

test("a review circle: create, join with the code, open a member's profile", async () => {
  const owner = await site.learner("pp-eden");
  const friend = await site.learner("pp-fikru");
  await owner.open("/circle");
  await owner.fill("#cName", "Adama coders");
  await owner.locator('[data-form="create"] button[type="submit"]').click();
  await owner.waitForSelector("#inviteCode");
  const code = (await owner.text("#inviteCode")).trim();
  await friend.open("/circle");
  await friend.fill("#joinCode", code);
  await friend.locator('[data-form="join"] button[type="submit"]').click();
  await friend.waitForSelector("table");
  assert.match(await friend.text("h1"), /Adama coders/);
  assert.equal(await friend.locator("tbody tr").count(), 2);
  await friend.locator('tbody [data-act="user"][data-login="pp-eden"]').click(); await friend.waitForTimeout(400);
  assert.equal(new URL(friend.url()).pathname, "/u/pp-eden");
  assert.match(await friend.text(".user-head"), /Circle: Adama coders/i);
  await owner.close(); await friend.close();
});
