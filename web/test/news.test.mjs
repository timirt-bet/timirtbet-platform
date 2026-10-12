// The news box: content/news.json is checked at build time, ranked by importance then date, and
// shown on the home page (top 3) and at /news (all recent, newest first).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { newsProblems, rankNews } from "../news.mjs";
import { startSite, ROOT } from "./harness.mjs";

const item = (id, date, importance, extra = {}) => ({ id, date, added: date, importance, topic: "exams",
  title: { en: `Title ${id}`, am: `ርዕስ ${id}` }, summary: { en: `Summary ${id}.`, am: `ማጠቃለያ ${id}።` },
  source: { name: "ENA", url: `https://www.ena.et/${id}` }, ...extra });

test("the checker accepts good items and names every problem", () => {
  assert.deepEqual(newsProblems([item("a-1", "2026-10-01", 3)]), []);
  const bad = newsProblems([item("a-1", "2026-10-01", 3), item("a-1", "10/02/2026", 9, { topic: "politics", source: { name: "", url: "http://x" }, title: { en: "x" } })]);
  for (const p of [/duplicate id/, /date must be/, /importance must be/, /topic must be/, /source.name/, /https link/, /title.am/]) assert.ok(bad.some((b) => p.test(b)), `${p} in ${bad.join(" | ")}`);
  assert.deepEqual(newsProblems(JSON.parse(fs.readFileSync(path.join(ROOT, "content/news.json"), "utf8"))), [], "the published file is valid");
});

test("ranking: recent items only, most important first, then newest", () => {
  const now = new Date("2026-10-12T00:00:00Z");
  const r = rankNews([item("old", "2026-07-01", 5), item("b", "2026-10-10", 3), item("c", "2026-10-01", 5), item("d", "2026-10-11", 3)], now);
  assert.deepEqual(r.map((n) => n.id), ["c", "d", "b"]);
});

test("the home page shows the top three, and /news shows them all with summaries", async () => {
  const f = path.join(ROOT, "web/dist/news.json"), before = fs.readFileSync(f, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(f, JSON.stringify([item("n1", today, 2), item("n2", today, 5), item("n3", today, 4), item("n4", today, 1)]));
  const site = await startSite();
  try {
    const p = await site.learner(null);
    await p.open("/");
    await p.waitForSelector("#newsBox .news-item");
    assert.deepEqual(await p.locator("#newsBox .news-item").evaluateAll((els) => els.map((e) => e.dataset.news)), ["n2", "n3", "n1"]);
    assert.equal(await p.getAttribute('#newsBox [data-news="n2"] a', "href"), "https://www.ena.et/n2");
    assert.match(await p.text('#newsBox [data-news="n2"]'), /Important/);
    await p.locator('#newsBox [data-act="news"]').click();
    await p.waitForSelector("#newsList");
    assert.equal(new URL(p.url()).pathname, "/news");
    assert.equal(await p.locator("#newsList .news-item").count(), 4);
    assert.match(await p.text('#newsList [data-news="n4"]'), /Summary n4/);
    await p.close();
  } finally { fs.writeFileSync(f, before); await site.stop(); }
});
