// Installing the site as an app: the manifest, icons and service worker are served; the install card
// offers the browser's install prompt, comes back a while after it is closed (and on every visit), and
// "Get the app" opens it any time.
import test from "node:test";
import assert from "node:assert/strict";
import { startSite } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());

test("the manifest describes a standalone app with its icons", async () => {
  const m = await (await fetch(site.base + "/manifest.webmanifest")).json();
  assert.equal(m.display, "standalone");
  assert.equal(m.start_url, "/");
  for (const i of m.icons) {
    const r = await fetch(site.base + i.src);
    assert.equal(r.status, 200, i.src);
    assert.equal(r.headers.get("content-type"), "image/png");
  }
  assert.ok(m.icons.some((i) => i.purpose === "maskable"));
  const html = await (await fetch(site.base + "/")).text();
  assert.match(html, /rel="manifest" href="\/manifest.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon"/);
  const sw = await fetch(site.base + "/sw.js");
  assert.equal(sw.status, 200);
  assert.match(sw.headers.get("content-type"), /javascript/);
});

test("the install card asks the browser, and comes back a while after it is closed", async () => {
  const p = await site.learner(null, { width: 390, height: 800 });
  await p.open("/");
  assert.equal(await p.locator("#install").count(), 0, "no card until the browser offers");
  await p.evaluate(() => {
    const e = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(e, { prompt() { window.prompted = true; }, userChoice: Promise.resolve({ outcome: "dismissed" }) });
    dispatchEvent(e);
  });
  await p.waitForSelector("#install");
  await p.locator('#install [data-act="install"]').click();
  assert.equal(await p.evaluate(() => window.prompted), true);
  await p.evaluate(() => { window.prompted = false; });
  await p.evaluate(() => dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt() {}, userChoice: new Promise(() => {}) })));
  await p.evaluate(() => { window.TB_INSTALL_AGAIN_MS = 600; });
  await p.locator("#install .install-x").click();
  await p.evaluate(() => dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt() { window.prompted = true; }, userChoice: new Promise(() => {}) })));
  await p.waitForTimeout(150);
  assert.equal(await p.locator("#install").count(), 0, "hidden right after closing");
  await p.waitForSelector("#install", { timeout: 3000 });
  // "Get the app" on the home page opens it again, with the browser's prompt.
  await p.locator('#appStrip [data-act="get-app"]').click();
  assert.equal(await p.evaluate(() => window.prompted), true);
  await p.close();
  // Where the browser offers no prompt, the card says how to do it from the menu.
  const q = await site.learner(null, { width: 390, height: 800 });
  await q.open("/");
  await q.locator('#appStrip [data-act="get-app"]').click();
  await q.waitForSelector("#installSheet");
  assert.equal(await q.locator("#installSheet .sheet-steps li").count(), 3);
  assert.match(await q.text("#installSheet"), /Install app/);
  await q.close();
});
