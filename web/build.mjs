// Builds the Timirtbet web app into one self-contained HTML file.
//   node web/build.mjs           -> web/dist/demo.html       (simulated learners, no server)
//   node web/build.mjs --live    -> web/dist/index.html      (talks to the API under /api; deployed to Firebase Hosting)
//   node web/build.mjs --artifact-> web/dist/artifact.html   (demo, page body only, for the claude.ai preview)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { build } from "esbuild";

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "..");
const src = (f) => fs.readFileSync(path.join(here, "src", f), "utf8");
const live = process.argv.includes("--live");
const artifact = process.argv.includes("--artifact");

const bank = fs.readFileSync(path.join(root, "challenges", "exercises.json"), "utf8");
const modules = fs.readFileSync(path.join(root, "challenges", "modules.json"), "utf8");
const harness = fs.readFileSync(path.join(root, "challenges", "js", "harness.js"), "utf8");
const css = ["base.css", "code.css", "app.css"].map(src).join("\n")
  .replace("--chalk:#EEF3E8; --chalk-2:#F5D77A;", "--chalk:#EEF3E8; --chalk-2:#F5D77A; --code-bg:#F7F9F7;")
  .replaceAll("--board:#122A21; --board-2:#18342A;", "--board:#122A21; --board-2:#18342A; --code-bg:#0F1714;");
if ((css.match(/--code-bg:/g) || []).length !== 3) throw new Error("theme tokens not found in base.css");
// The demo learner's code comes from the private answers (SOLUTIONS_DIR or ./solutions) when present.
// The live site never includes answers.
function demoAnswers() {
  const dir = path.resolve(process.env.SOLUTIONS_DIR || path.join(root, "solutions")), out = {};
  for (const id of ["js-vars", "js-cond", "js-loops", "go-vars", "go-cond"]) {
    const f = path.join(dir, id.slice(0, 2), id + (id.startsWith("js") ? ".js" : ".go"));
    if (fs.existsSync(f)) out[id] = fs.readFileSync(f, "utf8");
  }
  return out;
}
// The new front end (src/next, Preact + htm + signals), bundled into one script that runs before app.js.
// Install it once with: cd web && npm ci
const next = (await build({
  entryPoints: [path.join(here, "src", "next", "index.js")], bundle: true, minify: true, format: "iife",
  target: "es2020", write: false, legalComments: "none", logLevel: "warning",
})).outputFiles[0].text;
if (/<\/script/i.test(next)) throw new Error("the bundle contains </script>");
const js = next + "\n" + src("app.js")
  .replace("/*__BANK__*/[]", JSON.stringify(JSON.parse(bank)))
  .replace("/*__MODULES__*/[]", JSON.stringify(JSON.parse(modules)))
  .replace('/*__HARNESS__*/""', JSON.stringify(harness))
  .replace("/*__GOCHECK__*/", src("gocheck.js"))
  .replace("/*__TRACKIMG__*/{}", JSON.stringify({
    go: "data:image/webp;base64," + fs.readFileSync(path.join(here, "src", "img", "go.webp")).toString("base64"),
    js: "data:image/png;base64," + fs.readFileSync(path.join(here, "src", "img", "js.png")).toString("base64"),
  }))
  .replace("/*__DEMO_ANSWERS__*/{}", JSON.stringify(live ? {} : demoAnswers()))
  .replace("/*__I18N__*/", src("i18n.js"))
  .replace("/*__LIVE__*/", src("live.js"));
for (const marker of ["__BANK__", "__MODULES__", "__HARNESS__", "__GOCHECK__", "__TRACKIMG__", "__DEMO_ANSWERS__", "__I18N__", "__LIVE__"]) if (js.includes(marker)) throw new Error(`${marker} not replaced`);

// Code editor (CodeMirror 6, built from web/editor): only the demo has an editor, inlined so it stays one file.
// On the live site learners write and submit code in their own GitHub repository, so there is no editor.
const editorJs = src("vendor/codemirror.js");
let page = src("shell.html").replace("<script>\n/*__JS__*/", live ? "<script>\n/*__JS__*/" : () => `<script>${editorJs}</script>\n<script>\n/*__JS__*/`);
if (!live && !page.includes("TBEditor")) throw new Error("editor script not added");
page = page.replace("/*__CSS__*/", css).replace("/*__JS__*/", () => js);
if (live) page = page.replace("<script>", '<script>window.TIMIRTBET_MODE="live";</script>\n<script>');
// With a custom domain (APP_URL), visitors who arrive on the default Firebase address are sent
// there before anything loads, so sign-in cookies and the GitHub callback all use one address.
const appUrl = live && process.env.APP_URL ? new URL(process.env.APP_URL) : null;
if (appUrl && !/\.(web\.app|firebaseapp\.com)$/.test(appUrl.hostname)) {
  const go = `<script>(function(){var h=location.hostname;if(/\\.(web\\.app|firebaseapp\\.com)$/.test(h))location.replace(${JSON.stringify(appUrl.origin)}+location.pathname+location.search+location.hash);})();</script>\n`;
  page = go + page;
}
if (!artifact) {
  const i = page.indexOf("<header");
  page = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="description" content="Learn JavaScript and Go. Your review circle reviews every solution.">\n<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>\n${page.slice(0, i)}</head>\n<body>\n${page.slice(i)}</body>\n</html>\n`;
}
const out = path.join(here, "dist", live ? "index.html" : artifact ? "artifact.html" : "demo.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
if (live) for (const f of fs.readdirSync(path.dirname(out))) if (/^codemirror-.*\.js$/.test(f)) fs.rmSync(path.join(path.dirname(out), f));
// Learners on slow connections download this whole file: keep it under budget.
const gz = zlib.gzipSync(page, { level: 9 }).length, BUDGET = 100 * 1024;
console.log(`${path.relative(root, out)}  ${(page.length / 1024).toFixed(0)} KB, ${(gz / 1024).toFixed(1)} KB compressed`);
if (live && gz > BUDGET) { console.error(`Over the size budget: ${(gz / 1024).toFixed(1)} KB compressed (limit ${BUDGET / 1024} KB).`); process.exit(1); }
