// @ts-check
// The few things the new screens still take from the old app.js (window.TBOld) during the
// migration. Each one moves into src/next as the screens that own it move; then this file goes.

/** @typedef {{ id: string, lang: string, title: string, exercises: string[] }} Module */

/** Opens a screen through the old router. @param {string} view @param {Record<string, unknown>} [extra] */
export const go = (view, extra) => window.TBOld.go(view, extra);
/** Copies the text of #id and shows "Copied" on the button. @param {Element} el @param {string} id */
export const copyBtn = (el, id) => window.TBOld.copyBtn(el, id);
/** The module's number within its language. @param {Module} m */
export const modNum = (m) => window.TBOld.modNum(m);
export const old = {
  /** @returns {any[]} every challenge */
  get BANK() { return window.TBOld.BANK; },
  /** @returns {Module[]} */
  get MODULES() { return window.TBOld.MODULES; },
  /** @returns {Record<string, string>} "js" -> "JavaScript" */
  get LANGN() { return window.TBOld.LANGN; },
  /** @returns {boolean} the site uses real addresses (History API) */
  get ROUTED() { return window.TBOld.ROUTED; },
};
