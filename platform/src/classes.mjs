// School classes: a teacher creates a class and shares its code; learners who join let the
// teacher see their progress. Anyone signed in can teach. A learner is in at most one class,
// separate from their review circle.
import { inviteCode } from "./circles.mjs";

export const MAX_CLASS_MEMBERS = 80;
export const MAX_CLASSES_PER_TEACHER = 20;

export class ClassError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function createClass(store, { name, teacherId }) {
  name = String(name || "").trim();
  if (name.length < 3 || name.length > 60) throw new ClassError(422, "A class name needs 3 to 60 characters");
  if ((await store.classesOf(teacherId)).length >= MAX_CLASSES_PER_TEACHER) throw new ClassError(409, `You can teach up to ${MAX_CLASSES_PER_TEACHER} classes`);
  return store.createClass({ name, teacherId, code: inviteCode(), members: [] });
}

/** The class, if this learner teaches it; otherwise a 404 (so class ids reveal nothing). */
export async function ownClass(store, { classId, teacherId }) {
  const c = await store.getClass(classId);
  if (!c || c.teacherId !== teacherId) throw new ClassError(404, "No such class");
  return c;
}

export async function joinClass(store, { code, learnerId }) {
  const c = await store.classByCode(String(code || "").trim().toUpperCase());
  if (!c) throw new ClassError(404, "No class has that code");
  if (c.teacherId === learnerId) throw new ClassError(409, "You teach this class");
  if (c.members.includes(learnerId)) return c;
  if (c.members.length >= MAX_CLASS_MEMBERS) throw new ClassError(409, `This class is full (${MAX_CLASS_MEMBERS} learners)`);
  await leaveClass(store, learnerId);
  const fresh = await store.getClass(c.id);
  const updated = await store.updateClass(c.id, { members: [...fresh.members, learnerId] });
  await store.upsertLearner(learnerId, { classId: c.id });
  return updated;
}

export async function leaveClass(store, learnerId) {
  const me = await store.getLearner(learnerId);
  if (!me || !me.classId) return;
  const c = await store.getClass(me.classId);
  await store.upsertLearner(learnerId, { classId: null });
  if (c) await store.updateClass(c.id, { members: c.members.filter((m) => m !== learnerId) });
}

export async function removeFromClass(store, { classId, teacherId, learnerId }) {
  const c = await ownClass(store, { classId, teacherId });
  if (!c.members.includes(learnerId)) return c;
  const l = await store.getLearner(learnerId);
  if (l && l.classId === c.id) await store.upsertLearner(learnerId, { classId: null });
  return store.updateClass(c.id, { members: c.members.filter((m) => m !== learnerId) });
}

export async function deleteClass(store, { classId, teacherId }) {
  const c = await ownClass(store, { classId, teacherId });
  for (const id of c.members) {
    const l = await store.getLearner(id);
    if (l && l.classId === c.id) await store.upsertLearner(id, { classId: null });
  }
  await store.deleteClass(c.id);
}

export async function newClassCode(store, { classId, teacherId }) {
  await ownClass(store, { classId, teacherId });
  return store.updateClass(classId, { code: inviteCode() });
}

/** Challenges in teaching order: module by module, JS first. */
export function challengeOrder(bank, modules) {
  const out = [];
  const mods = Object.values(modules).sort((a, b) => (a.lang === b.lang ? 0 : a.lang === "js" ? -1 : 1));
  for (const m of mods) for (const id of m.exercises) if (bank[id] && !out.includes(id)) out.push(id);
  for (const id of Object.keys(bank)) if (!out.includes(id)) out.push(id);
  return out;
}

/**
 * Per learner and challenge: "passed", "tried" (ran the tests, not passed yet) or absent.
 * Also each learner's number of runs, last activity, and modules submitted and reviewed.
 */
export async function classReport(store, { cls, bank, modules }) {
  const learners = await store.getLearners(cls.members);
  const rows = [];
  for (const id of cls.members) {
    const l = learners[id]; if (!l) continue;
    const [results, passes, subs] = await Promise.all([store.resultsOf(id), store.passesOf(id), store.submissionsOf(id)]);
    const status = {};
    for (const r of results) if (bank[r.exerciseId]) status[r.exerciseId] = "tried";
    for (const p of passes) if (bank[p.exerciseId]) status[p.exerciseId] = "passed";
    const tries = {};
    for (const r of results) tries[r.exerciseId] = (tries[r.exerciseId] || 0) + 1;
    const last = results.reduce((a, r) => (r.at > a ? r.at : a), "");
    const modSubs = subs.filter((s) => s.moduleId);
    rows.push({
      id, login: l.githubUsername, status, tries, runs: results.length, lastActive: last || null,
      passed: Object.values(status).filter((s) => s === "passed").length,
      modulesSubmitted: new Set(modSubs.map((s) => s.moduleId)).size,
      modulesReviewed: new Set(modSubs.filter((s) => s.status === "reviewed" || s.status === "rated").map((s) => s.moduleId)).size,
    });
  }
  rows.sort((a, b) => a.login.localeCompare(b.login));
  return { challenges: challengeOrder(bank, modules), learners: rows };
}

/** One learner's work, for their teacher: every run, the modules they submitted and their reviews. */
export async function learnerDetail(store, { learnerId, bank, modules }) {
  const l = await store.getLearner(learnerId);
  const [results, passes, subs] = await Promise.all([store.resultsOf(learnerId), store.passesOf(learnerId), store.submissionsOf(learnerId)]);
  const passed = new Set(passes.map((p) => p.exerciseId));
  const byEx = {};
  for (const r of results) {
    if (!bank[r.exerciseId]) continue;
    const e = byEx[r.exerciseId] || (byEx[r.exerciseId] = { exerciseId: r.exerciseId, runs: 0, firstAt: r.at, lastAt: r.at, best: 0, total: r.total || 0, lastError: null });
    e.runs++;
    if (r.at < e.firstAt) e.firstAt = r.at;
    if (r.at >= e.lastAt) { e.lastAt = r.at; e.lastError = r.passed ? null : r.error ? String(r.error).split("\n")[0].slice(0, 200) : null; }
    e.best = Math.max(e.best, r.passedCount || 0); e.total = Math.max(e.total, r.total || 0);
  }
  const challenges = challengeOrder(bank, modules).map((id) => ({ ...(byEx[id] || { exerciseId: id, runs: 0 }), passed: passed.has(id) }));
  const mods = subs.filter((s) => s.moduleId && modules[s.moduleId]).map((s) => ({ moduleId: s.moduleId, at: s.at, status: s.status,
    reviewed: s.status === "reviewed" || s.status === "rated", verdict: s.review?.verdict || null }));
  return { login: l?.githubUsername || null, challenges, modules: mods };
}

const csvCell = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** The class grid as CSV: one row per learner, one column per challenge (passed / tried / blank). */
export function classCSV(cls, report) {
  const head = ["learner", "passed", "runs", "modules_submitted", "modules_reviewed", "last_active", ...report.challenges];
  const lines = [head.join(",")];
  for (const r of report.learners) {
    lines.push([r.login, r.passed, r.runs, r.modulesSubmitted, r.modulesReviewed, r.lastActive || "", ...report.challenges.map((id) => r.status[id] || "")].map(csvCell).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}
