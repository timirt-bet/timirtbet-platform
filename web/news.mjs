// The "Schools in Ethiopia" news box: content/news.json, checked here and copied to the site as
// /news.json by build.mjs. Items are proposed by the news agent (content/NEWS_AGENT.md) in a pull
// request and published when a maintainer merges it. Only a headline, a short summary in our own
// words and a link to the source are kept: never copied articles.
export const TOPICS = ["exams", "curriculum", "digital-skills", "scholarships", "teachers", "school-calendar", "higher-education", "programs"];
export const MAX_ITEMS = 40, SHOW_DAYS = 60;

const day = /^\d{4}-\d{2}-\d{2}$/;
/** @param {unknown} v @param {number} max */
const text = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

/** Problems with the news file, as readable lines; [] when it is fine. @param {any} items @returns {string[]} */
export function newsProblems(items) {
  if (!Array.isArray(items)) return ["news.json must be a list"];
  /** @type {string[]} */
  const out = [];
  const ids = new Set();
  if (items.length > MAX_ITEMS) out.push(`at most ${MAX_ITEMS} items (remove the oldest)`);
  items.forEach((/** @type {any} */ n, /** @type {number} */ i) => {
    const at = `item ${i + 1}${n && n.id ? ` (${n.id})` : ""}`;
    if (!n || typeof n !== "object") return out.push(`${at}: not an object`);
    if (!/^[a-z0-9-]{3,80}$/.test(n.id || "")) out.push(`${at}: id must be 3-80 lowercase letters, digits and dashes`);
    else if (ids.has(n.id)) out.push(`${at}: duplicate id`); else ids.add(n.id);
    if (!day.test(n.date || "") || Number.isNaN(Date.parse(n.date))) out.push(`${at}: date must be YYYY-MM-DD (when the source published it)`);
    if (!day.test(n.added || "")) out.push(`${at}: added must be YYYY-MM-DD (when it was added here)`);
    for (const lang of ["en", "am"]) {
      if (!text(n.title?.[lang], 140)) out.push(`${at}: title.${lang} is required, at most 140 characters`);
      if (!text(n.summary?.[lang], 320)) out.push(`${at}: summary.${lang} is required, at most 320 characters`);
    }
    if (!text(n.source?.name, 60)) out.push(`${at}: source.name is required`);
    if (!/^https:\/\/[^\s]+$/.test(n.source?.url || "")) out.push(`${at}: source.url must be an https link`);
    if (!Number.isInteger(n.importance) || n.importance < 1 || n.importance > 5) out.push(`${at}: importance must be 1 to 5`);
    if (!TOPICS.includes(n.topic)) out.push(`${at}: topic must be one of ${TOPICS.join(", ")}`);
  });
  return out;
}

/** What the site shows: recent items, most important first, then newest.
 * @template {{ date: string, importance: number }} T @param {T[]} items @param {Date} [now] @returns {T[]} */
export function rankNews(items, now = new Date()) {
  const cutoff = new Date(now.getTime() - SHOW_DAYS * 864e5).toISOString().slice(0, 10);
  return items.filter((n) => n.date >= cutoff).sort((a, b) => b.importance - a.importance || b.date.localeCompare(a.date));
}
