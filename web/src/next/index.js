// @ts-check
// The new front end (Preact + htm + signals), bundled by build.mjs into the same single page.
//
// During the migration, screens move here one at a time. The old router in app.js asks
// window.TBNext whether a screen has a new version: if so it is rendered here, otherwise the
// old string-built screen is used. With no screens registered the site is exactly as before.
import { h, render } from "preact";
import { messages, setLang } from "./i18n.js";
import { api } from "./api.js";
import { state, refresh, bridge } from "./state.js";

/** @type {Map<string, import("preact").ComponentType<any>>} */
const screens = new Map();
let mounted = false;

/**
 * Registers the new version of a screen under its view name ("profile", "user", ...).
 * @param {string} view
 * @param {import("preact").ComponentType<any>} Screen
 */
export function register(view, Screen) { screens.set(view, Screen); }

window.TBNext = {
  register,
  messages,
  setLang,
  api,
  state,
  refresh,
  bridge,
  has: (view) => screens.has(view),
  render(view, el) {
    const Screen = screens.get(view);
    if (!Screen) return;
    if (!mounted) el.textContent = ""; // the old screen's HTML is not Preact's: clear it once
    render(h(Screen, {}), el);
    mounted = true;
  },
  // Called before the old router writes HTML into the same element.
  unmount(el) { if (mounted) { render(null, el); mounted = false; } },
};
