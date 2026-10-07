// @ts-check
// The Timirtbet screens (Preact + htm + signals), bundled by build.mjs into the single page.
// The router in src/app.js decides which screen is on show and calls window.TBNext.render;
// src/live.js loads the learner into state.js.
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
import { Header, Dock, view, toastItem } from "./components/header.js";
import { ChallengeScreen } from "./screens/challenge.js";
import { SigninScreen } from "./components/start.js";
import { celebrate } from "./components/hooray.js";

/**
 * Every new screen, with the one-time welcome notice above it.
 * @param {{ Screen: import("preact").ComponentType<any>, route: Route }} props
 */
const Frame = ({ Screen, route }) => h(Fragment, null, h(Notice, null), h(Screen, { route }));

/** @type {Map<string, import("preact").ComponentType<any>>} */
const screens = new Map();
let drawn = false;

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
  render(view, el, route) {
    const Screen = screens.get(view) || HomeScreen;
    if (!drawn) { el.textContent = ""; drawn = true; } // clear "Loading…" (not Preact's) once
    // A fresh copy each time: @preact/signals skips components whose props did not change.
    render(h(Frame, { Screen, route: { ...(route || { view }) } }), el);
  },
  /** Called by app.js after every render: which screen is on show (for the header). @param {string} v */
  setView(v) { view.value = v; },
  /** Pops up a new notification for a few seconds. @param {any} n */
  toast(n) { toastItem.value = n; },
  /** The first-solve celebration (also used when a push passes in the background). @param {string} id */
  celebrate,
};

// Every screen, by the router's view name.
register("profile", ProfileScreen);
register("user", UserScreen);
register("circle", CircleScreen);
register("reviews", ReviewsScreen);
register("review", ReviewScreen);
register("challenges", HomeScreen);
register("track", TrackScreen);
register("exercise", ChallengeScreen);
register("signin", SigninScreen);

// The top bar (and, on phones, the tab bar) is drawn here from the start, on every screen.
const top = document.getElementById("top");
if (top) render(h(Header, null), top);
const dock = document.getElementById("dock");
if (dock) render(h(Dock, null), dock);
