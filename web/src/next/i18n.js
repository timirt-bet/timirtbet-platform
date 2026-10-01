// @ts-check
// Translations for the new screens: t("key", {n: 3}) returns the text in the current language.
// Text lives in messages/en.js and messages/am.js (one key, one sentence). `lang` is a signal,
// so screens that call t() redraw when the learner switches language.
import { signal } from "@preact/signals";
import en from "./messages/en.js";
import am from "./messages/am.js";

/** @typedef {keyof typeof en} MessageKey */
export const messages = { en, am };

const stored = () => { try { return localStorage.getItem("timirtbet.lang") === "am" ? "am" : "en"; } catch (e) { return "en"; } };
export const lang = signal(stored());

/** Called by the language button (the old translator in src/i18n.js calls it too). @param {string} l */
export function setLang(l) { lang.value = l === "am" ? "am" : "en"; }

/**
 * The text for a key in the current language, with {placeholders} filled in.
 * Falls back to English, then to the key itself, so a missing translation never breaks a screen.
 * @param {MessageKey} key
 * @param {Record<string, string | number>} [params]
 */
export function t(key, params) {
  const text = (lang.value === "am" && /** @type {Record<string, string>} */ (am)[key]) || en[key] || key;
  return params ? text.replace(/\{(\w+)\}/g, (m, p) => (p in params ? String(params[p]) : m)) : text;
}
