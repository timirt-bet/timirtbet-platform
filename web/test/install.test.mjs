// Installing the site as an app: the manifest and icons are served, and the install card offers the
// browser's install prompt, then stays closed once dismissed.
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
});

test("the install card asks the browser, and stays closed once dismissed", async () => {
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
  await p.evaluate(() => dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt() {}, userChoice: new Promise(() => {}) })));
  await p.locator("#install .install-x").click();
  await p.reload(); await p.ready();
  await p.evaluate(() => dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt() {}, userChoice: new Promise(() => {}) })));
  await p.waitForTimeout(200);
  assert.equal(await p.locator("#install").count(), 0);
  await p.close();
});
