// Browser tests run the real site against development mode: the API with an in-memory store,
// the in-process grader and a fake GitHub (POST /api/dev/commit puts a file in a learner's repository).
// Each test file starts its own server, so data never leaks between files.
//
// These tests are the safety net for the front-end migration (docs: front-end migration plan).
// They find things by id and data-act attributes, which the new screens keep.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOLUTIONS = path.resolve(process.env.SOLUTIONS_DIR || path.join(ROOT, "solutions"));
export const HAS_ANSWERS = fs.existsSync(path.join(SOLUTIONS, "js"));
// Flows that need a passing solution are skipped without the private answers (see CONTRIBUTING.md).
export const NEEDS_ANSWERS = HAS_ANSWERS ? false : "needs the reference answers (see CONTRIBUTING.md)";
export const answer = (id) => fs.readFileSync(path.join(SOLUTIONS, id.slice(0, 2), id + (id.startsWith("js-") ? ".js" : ".go")), "utf8");
export const MODULE_1 = ["js-vars", "js-cond", "js-loops", "js-func"];

const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

export async function startSite() {
  if (!fs.existsSync(path.join(ROOT, "web/dist/index.html"))) throw new Error("Build the site first: node web/build.mjs --live");
  const port = await freePort();
  const env = { ...process.env, PORT: String(port) };
  for (const k of ["GITHUB_TOKEN", "GITHUB_APP_ID", "GOOGLE_CLOUD_PROJECT", "FIRESTORE_EMULATOR_HOST", "APP_URL"]) delete env[k];
  const server = spawn(process.execPath, ["src/main.mjs", "dev"], { cwd: path.join(ROOT, "platform"), env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`server did not start:\n${log}`)), 15000);
    const on = (d) => { log += d; if (log.includes("Timirtbet API (dev)")) { clearTimeout(t); resolve(); } };
    server.stdout.on("data", on); server.stderr.on("data", on);
    server.on("exit", (c) => { clearTimeout(t); reject(new Error(`server exited (${c}):\n${log}`)); });
  });
  const browser = await chromium.launch();
  const base = `http://localhost:${port}`;
  const errors = [];

  // A learner's browser. Signs in with development login unless login is null (a guest).
  async function learner(login, { width = 1280, height = 900, lang } = {}) {
    const context = await browser.newContext({ viewport: { width, height } });
    if (lang) await context.addInitScript((l) => { try { localStorage.setItem("timirtbet.lang", l); } catch (e) {} }, lang);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`${login || "guest"}: ${e.message}`));
    // The app has loaded once the first screen replaced "Loading…".
    page.ready = async () => { await page.waitForFunction(() => { const a = document.getElementById("app"); return a && a.textContent.trim() && !a.textContent.includes("Loading…"); }); await page.waitForTimeout(150); };
    if (login) {
      await page.goto(`${base}/api/auth/dev?login=${encodeURIComponent(login)}`);
      await page.ready();
      const ok = page.locator('[data-act="notice-ok"]');
      if (await ok.count()) { await ok.click(); await page.waitForTimeout(150); }
    }
    // Calls the API as this learner (same cookies).
    page.api = (method, p, body) => page.evaluate(async ([m, u, b]) => {
      const r = await fetch(u, { method: m, headers: { "content-type": "application/json" }, body: b === undefined ? undefined : JSON.stringify(b) });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, [method, p, body]);
    page.commit = (exerciseId, code) => page.api("POST", "/api/dev/commit", { exerciseId, code });
    page.push = (exerciseId, code) => page.api("POST", "/api/dev/push", { exerciseId, code }); // commit + graded, no button
    page.open = async (p) => { await page.goto(base + p); await page.ready(); };
    page.text = async (sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, " ").trim();
    page.close = () => context.close();
    return page;
  }

  async function stop() {
    await browser.close();
    server.kill();
    if (errors.length) throw new Error(`errors in the page:\n${errors.join("\n")}`);
  }
  return { base, learner, stop, errors };
}
