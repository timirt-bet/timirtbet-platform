// @ts-check
// What the app knows about the signed-in learner, as signals: screens that read them redraw
// when they change. refresh() reloads everything from the API.
//
// During the migration the old code (src/live.js) reads and writes the same values through
// its `L` object (see bridge below). Assign new values (`state.subs.value = [...]`); changing
// an object in place does not tell the screens.
import { signal, batch } from "@preact/signals";
import { api } from "./api.js";

export const state = {
  /** @type {import("@preact/signals").Signal<any>} the learner from /api/me, or null for a guest */
  me: signal(null),
  /** @type {import("@preact/signals").Signal<any>} */
  circle: signal(null),
  /** @type {import("@preact/signals").Signal<any[]>} the learner's module submissions */
  subs: signal([]),
  /** @type {import("@preact/signals").Signal<any[]>} reviews this learner has to write */
  queue: signal([]),
  /** @type {import("@preact/signals").Signal<any[]>} reviews this learner wrote */
  given: signal([]),
  /** @type {import("@preact/signals").Signal<any[]>} reviews rated ★1, for Mentors */
  flagged: signal([]),
  /** @type {import("@preact/signals").Signal<Set<string>>} challenges passed */
  solved: signal(new Set()),
  /** @type {import("@preact/signals").Signal<Set<string>>} challenges passed from GitHub (these count) */
  saved: signal(new Set()),
  /** @type {import("@preact/signals").Signal<{items: any[], unread: number}>} the bell */
  inbox: signal({ items: [], unread: 0 }),
  /** true once the first refresh() finished */
  loaded: signal(false),
};

/** Reloads the learner and everything about them. A guest (401) ends with me = null. */
export async function refresh() {
  try {
    const r = await api("GET", "/api/me");
    const [subs, queue, given] = await Promise.all([api("GET", "/api/submissions/mine"), api("GET", "/api/reviews/queue"), api("GET", "/api/reviews/given")]);
    const flagged = r.me.reviewer.levelIndex >= 3 ? (await api("GET", "/api/reviews/flagged")).flagged : [];
    batch(() => {
      state.me.value = r.me;
      state.circle.value = r.circle;
      state.solved.value = new Set(r.me.solvedIds || []);
      state.saved.value = new Set(r.me.savedIds || r.me.solvedIds || []);
      state.subs.value = subs.submissions;
      state.queue.value = queue.toReview;
      state.given.value = given.reviews;
      state.flagged.value = flagged;
    });
  } catch (e) {
    if (/** @type {any} */ (e).status !== 401) console.error(e);
    state.me.value = null;
  }
  state.loaded.value = true;
}

/**
 * Gives an old-style object (live.js's `L`) properties that read and write the signals above,
 * so old and new code always see the same data.
 * @template {object} T
 * @param {T} obj
 * @returns {T & { [K in keyof typeof state]: any }}
 */
export function bridge(obj) {
  for (const k of /** @type {(keyof typeof state)[]} */ (Object.keys(state))) {
    Object.defineProperty(obj, k, { get: () => state[k].value, set: (v) => { state[k].value = v; }, enumerable: true });
  }
  return /** @type {any} */ (obj);
}
