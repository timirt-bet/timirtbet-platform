// @ts-check
// The new front end (Preact + htm + signals), bundled by build.mjs into the same single page.
//
// During the migration, screens move here one at a time. The old router in app.js asks
// window.TBNext whether a screen has a new version: if so it is rendered here, otherwise the
// old string-built screen is used.
import { h, render, Fragment } from "preact";
import { messages, setLang } from "./i18n.js";
import { api } from "./api.js";
import { state, refresh, bridge } from "./state.js";
import { ProfileScreen } from "./screens/profile.js";
import { UserScreen } from "./screens/user.js";
import { CircleScreen } from "./screens/circle.js";
import { ReviewsScreen, ReviewScreen } from "./screens/reviews.js";
import { HomeScreen, TrackScreen } from "./screens/home.js";
import { Notice } from "./components/notice.js";

/**
 * Every new screen, with the one-time welcome notice above it.
 * @param {{ Screen: import("preact").ComponentType<any>, route: Route }} props
 */
const Frame = ({ Screen, route }) => h(Fragment, null, h(Notice, null), h(Screen, { route }));

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
    render(h(Frame, { Screen, route: route || { view } }), el);
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

// Screens that have moved. (The offline demo is being retired: it now shows these too, as a guest.)
register("profile", ProfileScreen);
register("user", UserScreen);
register("circle", CircleScreen);
register("reviews", ReviewsScreen);
register("review", ReviewScreen);
register("challenges", HomeScreen);
register("track", TrackScreen);
