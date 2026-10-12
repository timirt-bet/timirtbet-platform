// @ts-check
// "Schools in Ethiopia": education news for learners and teachers. The items are in /news.json
// (content/news.json, proposed by the news agent and approved by a maintainer). The home page shows
// the three most important recent ones; /news shows them all, newest first.
import { html } from "htm/preact";
import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import { go } from "../legacy.js";
import { t, lang } from "../i18n.js";
import { rankNews } from "../../../news.mjs";

/** @typedef {{ id: string, date: string, title: Record<string, string>, summary: Record<string, string>, source: { name: string, url: string }, importance: number, topic: string }} NewsItem */

/** @type {import("@preact/signals").Signal<NewsItem[] | null>} */
const items = signal(null);
let asked = false;
/** Loads /news.json once per visit; a failure just leaves the box out. */
function load() {
  if (asked) return;
  asked = true;
  fetch("/news.json").then((r) => (r.ok ? r.json() : [])).then((d) => { items.value = Array.isArray(d) ? d : []; }, () => { items.value = []; });
}

/** "8 Oct 2026" in the reader's language. @param {string} d */
const when = (d) => new Date(d + "T12:00:00Z").toLocaleDateString(lang.value === "am" ? "am-ET" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
/** The item's words in the reader's language, English when a translation is missing. @param {Record<string, string>} v */
const pick = (v) => v[lang.value] || v.en;

/** @param {{ n: NewsItem, full?: boolean }} props */
const Item = ({ n, full }) => html`<li class="news-item" data-news=${n.id}>
  <a class="news-t" href=${n.source.url} target="_blank" rel="noopener">${pick(n.title)}</a>
  ${full && html`<p class="news-s">${pick(n.summary)}</p>`}
  <span class="news-m">${n.source.name} · ${when(n.date)}${n.importance >= 4 ? html` · <b class="news-key">${t("news_important")}</b>` : ""}</span></li>`;

/** The home page's news: the three most important recent items, side by side like a newspaper. */
export function NewsBox() {
  useEffect(load, []);
  const list = items.value ? rankNews(items.value).slice(0, 3) : [];
  if (!list.length) return null;
  return html`<section class="h-sec" id="newsBox"><div class="h-label"><span class="h-no">03</span>${t("news")}</div>
    <div class="h-body"><div class="h-head"><h2 class="h-h">${t("schools_in_ethiopia")}</h2>
      <button class="h-more" data-act="news" onClick=${() => go("news")}>${t("more_news")}</button></div>
    <ul class="news-cols">${list.map((n) => html`<${Item} key=${n.id} n=${n} full />`)}</ul></div></section>`;
}

/** /news: every recent item, newest first, with its summary. */
export function NewsScreen() {
  useEffect(load, []);
  const list = items.value ? rankNews(items.value).sort((a, b) => b.date.localeCompare(a.date)) : null;
  return html`<p class="eyebrow">${t("news")}</p>
    <h1 class="pg-h">${t("schools_in_ethiopia")}</h1>
    <p class="lede">${t("news_lede")}</p>
    ${list === null ? html`<p class="muted">${t("loading")}</p>`
      : list.length ? html`<ul class="news-list full" id="newsList">${list.map((n) => html`<${Item} key=${n.id} n=${n} full />`)}</ul>`
      : html`<p class="muted">${t("no_news_yet")}</p>`}`;
}
