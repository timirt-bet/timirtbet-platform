// @ts-check
// What the review screens need to know about reviewing: levels, points per star, the rubric,
// and how to describe what is being reviewed (a module, or an older single challenge).
// The numbers match platform/src/reviews.mjs, which is what actually counts.
import { old, modNum } from "./legacy.js";
import { t, tText } from "./i18n.js";

/** @typedef {import("./i18n.js").MessageKey} MessageKey */

/** Reputation needed for each level. */
export const LEVELS = [{ min: 0, n: "New" }, { min: 30, n: "Helpful" }, { min: 100, n: "Trusted" }, { min: 250, n: "Mentor" }];
/** Reputation points a reviewer gets for each star rating. @type {Record<number, number>} */
export const PTS = { 5: 10, 4: 6, 3: 2, 2: -3, 1: -6 };
/** The shortest review comment the server accepts. */
export const MIN_CHARS = 40;

/** @type {{ key: "c" | "r" | "s", api: string, label: MessageKey, hint: MessageKey }[]} */
export const RUBRIC = [
  { key: "c", api: "correctness", label: "correctness", hint: "hint_correctness" },
  { key: "r", api: "readability", label: "readability", hint: "hint_readability" },
  { key: "s", api: "style", label: "style", hint: "hint_style" },
];
/** @type {MessageKey[]} the three marks, 1 to 3 */
export const MARKS = ["needs_work", "good", "excellent"];

/** @typedef {{ rub: { c: number, r: number, s: number }, text: string }} Draft */
/** @param {Draft} d */
export const canSend = (d) => d.text.trim().length >= MIN_CHARS && !!(d.rub.c && d.rub.r && d.rub.s);

/** Where the learner keeps a challenge's solution in their repository. @param {any} ex */
export const solutionFile = (ex) => ex.lang === "js" ? `js/${ex.id}/solution.js` : `go/${ex.id.replace(/-/g, "_")}/solution.go`;

const exercise = (/** @type {string} */ id) => old.BANK.find((e) => e.id === id);
const module = (/** @type {string} */ id) => old.MODULES.find((m) => m.id === id);

/**
 * What a submission asks the reviewer to read: a title, its language, and each challenge's code.
 * @param {any} s a submission from the API
 * @returns {{ title: string, lang: string, sub: string, items: { ex: any, code: string, passed?: number, total?: number }[] }}
 */
export function unitOf(s) {
  const m = s.moduleId && module(s.moduleId);
  if (m) return {
    title: t("module_title", { n: modNum(m), title: tText(m.title) }),
    lang: m.lang,
    sub: t("n_challenges", { n: m.exercises.length }),
    items: (s.items || []).map((/** @type {any} */ i) => ({ ex: exercise(i.exerciseId), code: i.code, passed: i.passed, total: i.total })).filter((/** @type {any} */ i) => i.ex),
  };
  const e = exercise(s.exerciseId);
  if (!e) return { title: s.exerciseId || "", lang: "js", sub: "", items: [] };
  return { title: tText(e.title), lang: e.lang, sub: tText(e.topic), items: [{ ex: e, code: s.code, passed: s.tests?.passed, total: s.tests?.total }] };
}

/** A title for a module or challenge id. @param {string} id */
export function unitTitle(id) {
  const m = module(id);
  if (m) return t("module_title", { n: modNum(m), title: tText(m.title) });
  const e = exercise(id);
  return e ? tText(e.title) : id;
}

/** "just now", "5 min ago", "3 h ago", "2 d ago". @param {number} at @param {number} [now] */
export function ago(at, now = Date.now()) {
  const m = Math.round((now - at) / 6e4);
  if (m < 60) return m <= 1 ? t("ago_now") : t("ago_min", { n: m });
  const h = Math.round(m / 60);
  return h < 24 ? t("ago_h", { n: h }) : t("ago_d", { n: Math.round(h / 24) });
}

/** The reviewer's place on the ladder: next level and how far along they are. @param {any} p */
export function ladder(p) {
  const cur = LEVELS[p.levelIndex] || LEVELS[0], next = LEVELS[p.levelIndex + 1];
  const pct = next ? Math.max(0, Math.min(100, Math.round((p.reputation - cur.min) / (next.min - cur.min) * 100))) : 100;
  return { next, pct, toNext: next ? Math.max(0, next.min - p.reputation) : 0 };
}

/** ★★★★☆ @param {number} n */
export const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
