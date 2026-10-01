// The account page: what is stored, download, sign out, and the guarded delete.
import test from "node:test";
import assert from "node:assert/strict";
import { startSite } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());

test("your data lists what is kept and what is never asked, with a download", async () => {
  const p = await site.learner("ac-hana");
  await p.open("/profile");
  assert.match(await p.title(), /^Profile · Timirtbet/);
  assert.equal(await p.locator(".data-card .dc-list li").count(), 4);
  assert.equal(await p.locator(".data-card .dc-never li").count(), 7);
  assert.equal(await p.getAttribute('.data-card a[href="/api/me/export"]', "download"), "timirtbet-export.json");
  const exp = await p.api("GET", "/api/me/export");
  assert.equal(exp.status, 200);
  assert.equal(exp.body.learner.githubUsername, "ac-hana");
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

test("delete is folded away and only works once the username is typed", async () => {
  const p = await site.learner("ac-jemal");
  await p.open("/profile");
  assert.equal(await p.locator("details.danger").getAttribute("open"), null, "closed at first");
  await p.locator("details.danger summary").click();
  assert.match(await p.text(".danger-body"), /delete your repository/);
  assert.equal(await p.locator("#delBtn").isDisabled(), true);
  await p.fill("#delConfirm", "ac-jema");
  assert.equal(await p.locator("#delBtn").isDisabled(), true, "almost the username is not enough");
  await p.fill("#delConfirm", "ac-jemal");
  assert.equal(await p.locator("#delBtn").isDisabled(), false);
  await p.locator("#delBtn").click(); await p.waitForTimeout(800);
  assert.equal((await p.api("GET", "/api/me")).status, 401, "the account is gone and the session with it");
  assert.equal(new URL(p.url()).pathname, "/");
  await p.close();
});
