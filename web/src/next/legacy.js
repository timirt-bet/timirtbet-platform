// @ts-check
// What the screens take from the router (src/app.js, window.TBOld): navigation, the challenge
// bank and modules, points and difficulty, and this browser's saved choices.

/** @typedef {{ id: string, lang: string, title: string, exercises: string[] }} Module */

/** Opens a screen through the router. @param {string} view @param {Record<string, unknown>} [extra] */
export const go = (view, extra) => window.TBOld.go(view, extra);
/** Copies the text of #id and shows "Copied" on the button. @param {Element} el @param {string} id */
export const copyBtn = (el, id) => window.TBOld.copyBtn(el, id);
/** The module's number within its language. @param {Module} m */
export const modNum = (m) => window.TBOld.modNum(m);
/** Opens a challenge page. @param {string} id */
export const openEx = (id) => window.TBOld.openEx(id);
/** This browser's saved choices (track, filters, open modules); call save() after changing them. */
export const prefs = () => window.TBOld.S;
export const savePrefs = () => window.TBOld.save();
export const old = {
  /** @returns {any[]} every challenge */
  get BANK() { return window.TBOld.BANK; },
  /** @returns {Module[]} */
  get MODULES() { return window.TBOld.MODULES; },
  /** @returns {Record<string, string>} "js" -> "JavaScript" */
  get LANGN() { return window.TBOld.LANGN; },
  /** @returns {Record<string, { tag: string, blurb: string, code: string }>} */
  get TRACKS() { return window.TBOld.TRACKS; },
  /** @returns {Record<string, string>} track logos (data: URLs) */
  get TRACK_IMG() { return window.TBOld.TRACK_IMG; },
  /** @param {any} ex */
  ptsOf: (ex) => window.TBOld.ptsOf(ex),
  /** "Easy", "Medium" or "Hard". @param {any} ex */
  diffOf: (ex) => window.TBOld.diffOf(ex),
  /** @returns {boolean} the site uses real addresses (History API) */
  get ROUTED() { return window.TBOld.ROUTED; },
};
