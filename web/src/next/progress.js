// @ts-check
// Where a learner stands: which challenges count as solved, each module's state, and what to
// do next. A challenge counts once a push passed the grader (state.saved).
import { old } from "./legacy.js";
import { state } from "./state.js";

/** @typedef {import("./legacy.js").Module} Module */
/**
 * @typedef {{ passed: number, total: number, sub: any, resave: string[], ready: boolean, guest?: boolean }} ModuleState
 */

export const exercise = (/** @type {string} */ id) => old.BANK.find((e) => e.id === id);
export const solved = (/** @type {string} */ id) => state.saved.value.has(id);

/** The newest submission of a module. @param {string} mid */
export const moduleSub = (mid) => state.subs.value.filter((s) => s.moduleId === mid).sort((a, b) => b.at.localeCompare(a.at))[0];

/** @param {Module} m @returns {ModuleState} */
export function moduleState(m) {
  const total = m.exercises.length;
  if (!state.me.value) return { passed: 0, total, sub: null, resave: [], ready: false, guest: true };
  const passed = m.exercises.filter(solved).length, sub = moduleSub(m.id), open = !!(sub && sub.status !== "rated");
  // Passes from before solutions were kept have no code to send: those need one more push.
  const resave = m.exercises.filter((id) => state.solved.value.has(id) && !solved(id));
  return { passed, total, sub, resave, ready: passed === total && !resave.length && !open };
}

/** A module is done once it was reviewed and rated. @param {Module} m */
const finished = (m) => { const s = moduleState(m); return s.passed === s.total && s.sub?.status === "rated"; };

/** The module to work on in a language: the first one not finished. @param {string} lang */
export const currentModule = (lang) => old.MODULES.filter((m) => m.lang === lang).find((m) => !finished(m));

/** The next challenge to solve: the first unsolved one, in module order. @param {string} [lang] */
export function nextChallenge(lang) {
  for (const m of old.MODULES) {
    if (lang && m.lang !== lang) continue;
    const id = m.exercises.find((x) => !solved(x));
    if (id) return { ex: exercise(id), module: m };
  }
  return null;
}

/** Points available in the whole bank. */
export const maxPoints = () => old.BANK.reduce((a, e) => a + old.ptsOf(e), 0);
