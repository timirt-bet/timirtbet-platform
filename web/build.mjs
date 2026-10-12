// Builds the Timirtbet web app into one self-contained HTML file, web/dist/index.html, which talks to
// the API under /api and is deployed to Firebase Hosting. (--live is accepted and is the only mode.)
//   node web/build.mjs --live
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { build, transform } from "esbuild";

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "..");
const src = (f) => fs.readFileSync(path.join(here, "src", f), "utf8");

const bank = fs.readFileSync(path.join(root, "challenges", "exercises.json"), "utf8");
const modules = fs.readFileSync(path.join(root, "challenges", "modules.json"), "utf8");
const css = ["base.css", "code.css", "app.css"].map(src).join("\n")
  .replace("--chalk:#EEF3E8; --chalk-2:#F5D77A;", "--chalk:#EEF3E8; --chalk-2:#F5D77A; --code-bg:#F7F9F7;")
  .replaceAll("--board:#122A21; --board-2:#18342A;", "--board:#122A21; --board-2:#18342A; --code-bg:#0F1714;");
if ((css.match(/--code-bg:/g) || []).length !== 3) throw new Error("theme tokens not found in base.css");
// Minified: learners on slow connections download every byte.
const cssMin = (await transform(css, { loader: "css", minify: true, logLevel: "warning" })).code.trim();
// The new front end (src/next, Preact + htm + signals), bundled into one script that runs before app.js.
// Install it once with: cd web && npm ci
const next = (await build({
  entryPoints: [path.join(here, "src", "next", "index.js")], bundle: true, minify: true, format: "iife",
  target: "es2020", charset: "utf8", write: false, legalComments: "none", logLevel: "warning",
})).outputFiles[0].text;
if (/<\/script/i.test(next)) throw new Error("the bundle contains </script>");
const legacy = src("app.js")
  .replace("/*__BANK__*/[]", JSON.stringify(JSON.parse(bank)))
  .replace("/*__MODULES__*/[]", JSON.stringify(JSON.parse(modules)))
  .replace("/*__TRACKIMG__*/{}", JSON.stringify({
    go: "data:image/webp;base64," + fs.readFileSync(path.join(here, "src", "img", "go.webp")).toString("base64"),
    js: "data:image/svg+xml," + encodeURIComponent(fs.readFileSync(path.join(here, "src", "img", "js.svg"), "utf8").trim()),
  }))
  .replace("/*__LIVE__*/", src("live.js"));
for (const marker of ["__BANK__", "__MODULES__", "__TRACKIMG__", "__LIVE__"]) if (legacy.includes(marker)) throw new Error(`${marker} not replaced`);
// The router (app.js + live.js) is minified too: learners on slow connections download every byte.
const js = next + "\n" + (await transform(legacy, { loader: "js", minify: true, target: "es2020", legalComments: "none", logLevel: "warning" })).code;
if (/<\/script/i.test(js)) throw new Error("the page script contains </script>");

let page = src("shell.html");
page = page.replace("/*__CSS__*/", () => cssMin).replace("/*__JS__*/", () => js);
page = page.replace("<script>", '<script>window.TIMIRTBET_MODE="live";</script>\n<script>');
// With a custom domain (APP_URL), visitors who arrive on the default Firebase address are sent
// there before anything loads, so sign-in cookies and the GitHub callback all use one address.
const appUrl = process.env.APP_URL ? new URL(process.env.APP_URL) : null;
if (appUrl && !/\.(web\.app|firebaseapp\.com)$/.test(appUrl.hostname)) {
  const go = `<script>(function(){var h=location.hostname;if(/\\.(web\\.app|firebaseapp\\.com)$/.test(h))location.replace(${JSON.stringify(appUrl.origin)}+location.pathname+location.search+location.hash);})();</script>\n`;
  page = go + page;
}
{
  const i = page.indexOf("<header");
  page = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="description" content="Learn JavaScript and Go. Your review circle reviews every solution.">\n<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>\n${page.slice(0, i)}</head>\n<body>\n${page.slice(i)}</body>\n</html>\n`;
}
const out = path.join(here, "dist", "index.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
// The news box: checked, then served as its own small file (it changes without touching the page).
{
  const { newsProblems } = await import("./news.mjs");
  const news = JSON.parse(fs.readFileSync(path.join(root, "content", "news.json"), "utf8"));
  const bad = newsProblems(news);
  if (bad.length) throw new Error("content/news.json:\n  " + bad.join("\n  "));
  fs.writeFileSync(path.join(path.dirname(out), "news.json"), JSON.stringify(news));
}
// Installing the site as an app (Add to Home Screen): the manifest and its icons.
for (const f of fs.readdirSync(path.join(here, "src", "pwa"))) fs.copyFileSync(path.join(here, "src", "pwa", f), path.join(path.dirname(out), f));
for (const f of fs.readdirSync(path.dirname(out))) if (/^codemirror-.*\.js$|^(demo|artifact)\.html$/.test(f)) fs.rmSync(path.join(path.dirname(out), f));
// Learners on slow connections download this whole file: keep it under budget.
const gz = zlib.gzipSync(page, { level: 9 }).length, BUDGET = 100 * 1024;
console.log(`${path.relative(root, out)}  ${(page.length / 1024).toFixed(0)} KB, ${(gz / 1024).toFixed(1)} KB compressed`);
if (gz > BUDGET) { console.error(`Over the size budget: ${(gz / 1024).toFixed(1)} KB compressed (limit ${BUDGET / 1024} KB).`); process.exit(1); }
