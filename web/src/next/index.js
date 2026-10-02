// @ts-check
// The new front end (Preact + htm + signals), bundled by build.mjs into the same single page.
//
// During the migration, screens move here one at a time. The old router in app.js asks
// window.TBNext whether a screen has a new version: if so it is rendered here, otherwise the
// old string-built screen is used.
import { h, render } from "preact";
import { messages, setLang } from "./i18n.js";
import { api } from "./api.js";
import { state, refresh, bridge } from "./state.js";
import { ProfileScreen } from "./screens/profile.js";
import { UserScreen } from "./screens/user.js";

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
  render(view, el, route) {
    const Screen = screens.get(view);
    if (!Screen) return;
    if (!mounted) {
      el.textContent = ""; // the old screen's HTML is not Preact's: clear it once
      // New screens translate themselves with t(), and handle their own clicks:
      // keep the old translator and the old click handlers out.
      el.setAttribute("data-i18n-skip", "");
      el.setAttribute("data-next", "");
    }
    render(h(Screen, { route: route || { view } }), el);
    mounted = true;
  },
  // Called before the old router writes HTML into the same element.
  unmount(el) {
    if (!mounted) return;
    render(null, el);
    el.removeAttribute("data-i18n-skip");
    el.removeAttribute("data-next");
    mounted = false;
  },
};

// Screens that have moved. The offline demo (being retired) keeps the old ones.
if (window.TIMIRTBET_MODE === "live") {
  register("profile", ProfileScreen);
  register("user", UserScreen);
}
