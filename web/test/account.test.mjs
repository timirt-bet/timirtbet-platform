// The account page: stats, your repository, finding people, and sign out.
import test from "node:test";
import assert from "node:assert/strict";
import { startSite } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());

test("the account page has stats, repository, people and sign out, and nothing else", async () => {
  const p = await site.learner("ac-hana");
  await p.open("/profile");
  assert.match(await p.title(), /^Profile · Timirtbet/);
  assert.equal(await p.locator(".stats .stat").count(), 4);
  assert.equal(await p.locator('[data-form="find"]').count(), 1);
  assert.equal(await p.locator('[data-act="signout"]').count(), 1);
  assert.equal(await p.locator(".data-card, details.danger, #delBtn").count(), 0, "no data panel and no delete");
  await p.close();
});

test("sign out asks first, then signs out", async () => {
  const p = await site.learner("ac-iman");
  await p.open("/profile");
  await p.locator('[data-act="signout"]').click(); await p.waitForTimeout(200);
  assert.equal(await p.locator('[data-act="live-signout"]').count(), 1, "a confirmation step");
  await p.locator('[data-act="confirm-no"]').click(); await p.waitForTimeout(200);
  assert.equal(await p.locator('[data-act="live-signout"]').count(), 0, "Cancel keeps you signed in");
  await p.locator('[data-act="signout"]').click(); await p.waitForTimeout(200);
  await p.locator('[data-act="live-signout"]').click(); await p.waitForTimeout(600);
  assert.equal((await p.api("GET", "/api/me")).status, 401);
  assert.equal(await p.locator('#who [data-v="signin"]').count(), 1);
  await p.close();
});

test("signing out from the header menu asks first", async () => {
  const p = await site.learner("ac-kebede");
  await p.open("/");
  await p.locator("#who .who").click();
  await p.locator('[data-act="menu-signout"]').click();
  assert.match(await p.text(".confirm-menu"), /Sign out of Timirtbet\?.*every device/s);
  await p.locator('.confirm-menu [data-act="confirm-no"]').click();
  assert.equal(await p.locator(".confirm-menu").count(), 0);
  assert.equal((await p.api("GET", "/api/me")).status, 200, "Cancel keeps you signed in");
  await p.locator("#who .who").click();
  await p.locator('[data-act="menu-signout"]').click();
  await p.locator('.confirm-menu [data-act="live-signout"]').click(); await p.waitForTimeout(600);
  assert.equal((await p.api("GET", "/api/me")).status, 401);
  assert.equal(await p.locator('#who [data-v="signin"]').count(), 1);
  await p.close();
});
