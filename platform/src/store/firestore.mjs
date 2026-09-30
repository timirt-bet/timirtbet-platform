// Firestore store for production (Cloud Run). Same async interface as MemoryStore.
// Collections: learners, circles, results, passes, submissions, reviewers, jobs, inbox.
import crypto from "node:crypto";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { emptyStats, addRating, STAR_POINTS } from "../reviews.mjs";
import { newId, INBOX_SIZE } from "./memory.mjs";

const data = (snap) => (snap.exists ? { id: snap.id, ...snap.data() } : null);
const all = (q) => q.get().then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));
const jobId = (key) => crypto.createHash("sha256").update(key).digest("hex").slice(0, 40);

export class FirestoreStore {
  constructor(options = {}) {
    this.db = options.db || new Firestore({ ignoreUndefinedProperties: true, ...options });
    const c = (n) => this.db.collection(n);
    this.c = { learners: c("learners"), circles: c("circles"), results: c("results"), passes: c("passes"), submissions: c("submissions"), reviewers: c("reviewers"), jobs: c("jobs"), inbox: c("inbox") };
  }

  async getLearner(id) { return data(await this.c.learners.doc(id).get()); }
  async upsertLearner(id, patch) { const ref = this.c.learners.doc(id); await ref.set({ ...patch, ...(patch.githubUsername ? { loginLower: patch.githubUsername.toLowerCase() } : {}), id }, { merge: true }); return data(await ref.get()); }
  async learnerByRepo(repo) { return (await all(this.c.learners.where("repo", "==", repo).limit(1)))[0] || null; }
  // GitHub usernames are stored as typed; loginLower makes the lookup case-insensitive.
  async learnerByLogin(login) {
    const k = String(login).toLowerCase();
    return (await all(this.c.learners.where("loginLower", "==", k).limit(1)))[0]
      || (await all(this.c.learners.where("githubUsername", "==", login).limit(1)))[0] || null;
  }
  async setFollow(fromId, toId, on) { await this.c.learners.doc(fromId).set({ following: on ? FieldValue.arrayUnion(toId) : FieldValue.arrayRemove(toId) }, { merge: true }); }
  async followersOf(id) { return (await all(this.c.learners.where("following", "array-contains", id))).map((l) => l.id); }
  async getLearners(ids) {
    if (!ids.length) return {};
    const snaps = await this.db.getAll(...ids.map((id) => this.c.learners.doc(id)));
    return Object.fromEntries(snaps.filter((s) => s.exists).map((s) => [s.id, data(s)]));
  }

  async createCircle(c) { const rec = { id: newId("cir"), createdAt: new Date().toISOString(), ...c }; await this.c.circles.doc(rec.id).set(rec); return rec; }
  async getCircle(id) { return data(await this.c.circles.doc(id).get()); }
  async circleByCode(code) { return (await all(this.c.circles.where("inviteCode", "==", code).limit(1)))[0] || null; }
  async updateCircle(id, patch) { await this.c.circles.doc(id).set(patch, { merge: true }); return this.getCircle(id); }
  async deleteCircle(id) { await this.c.circles.doc(id).delete(); }

  // A pass keeps the latest passing code, which a module submission sends for review.
  async addResult({ code, ...r }) {
    const rec = { at: new Date().toISOString(), ...r };
    const ref = await this.c.results.add(rec);
    if (r.passed) {
      const pass = this.c.passes.doc(`${r.exerciseId}_${r.learnerId}`);
      await pass.create({ exerciseId: r.exerciseId, learnerId: r.learnerId, at: rec.at }).catch((e) => { if (e.code !== 6) throw e; }); // 6 = ALREADY_EXISTS
      if (typeof code === "string") await pass.set({ code, codeAt: rec.at, codeSource: r.source || null }, { merge: true });
    }
    return { id: ref.id, ...rec };
  }
  async passOf(learnerId, exerciseId) { const d = await this.c.passes.doc(`${exerciseId}_${learnerId}`).get(); return d.exists ? d.data() : null; }
  async latestResult(learnerId, exerciseId) {
    const rs = await all(this.c.results.where("learnerId", "==", learnerId).where("exerciseId", "==", exerciseId));
    return rs.sort((a, b) => b.at.localeCompare(a.at))[0] || null;
  }
  async resultsOf(learnerId) { return all(this.c.results.where("learnerId", "==", learnerId)); }
  async hasPassed(learnerId, exerciseId) { return (await this.c.passes.doc(`${exerciseId}_${learnerId}`).get()).exists; }
  async passersOf(exerciseId) { return (await all(this.c.passes.where("exerciseId", "==", exerciseId).limit(500))).map((p) => p.learnerId); }
  async solvedOf(learnerId) { return (await this.passesOf(learnerId)).map((p) => p.exerciseId); }
  // One read per pass (the same as solvedOf); says which passes still have their code for a module review.
  async passesOf(learnerId) { return (await all(this.c.passes.where("learnerId", "==", learnerId))).map((p) => ({ exerciseId: p.exerciseId, hasCode: typeof p.code === "string", fromGit: typeof p.code === "string" && p.codeSource === "git" })); }

  async addSubmission(s) { const rec = { id: newId("sub"), at: new Date().toISOString(), status: "awaiting_review", review: null, rating: null, ...s }; await this.c.submissions.doc(rec.id).set(rec); return rec; }
  async getSubmission(id) { return data(await this.c.submissions.doc(id).get()); }
  async updateSubmission(id, patch) { await this.c.submissions.doc(id).set(patch, { merge: true }); return this.getSubmission(id); }
  async submissionsOf(learnerId) { return all(this.c.submissions.where("studentId", "==", learnerId)); }
  async assignedTo(reviewerId) { return all(this.c.submissions.where("reviewerId", "==", reviewerId)); }
  async openSubmissionFor(learnerId, exerciseId) {
    return (await all(this.c.submissions.where("studentId", "==", learnerId).where("exerciseId", "==", exerciseId))).find((s) => s.status !== "rated") || null;
  }
  async byStatus(status) { return all(this.c.submissions.where("status", "==", status)); }
  async flagged() { return (await all(this.c.submissions.where("flagged", "==", true))).filter((s) => !s.secondOpinion); }

  async reviewerStats(id) { const d = await this.c.reviewers.doc(id).get(); return { ...emptyStats(), ...(d.exists ? d.data() : {}) }; }
  async reviewerStatsMany(ids) {
    if (!ids.length) return {};
    const snaps = await this.db.getAll(...ids.map((id) => this.c.reviewers.doc(id)));
    return Object.fromEntries(snaps.map((s) => [s.id, { ...emptyStats(), ...(s.exists ? s.data() : {}) }]));
  }
  async bumpOpenReviews(id, delta) { await this.c.reviewers.doc(id).set({ openReviews: FieldValue.increment(delta) }, { merge: true }); }

  async rate(subId, stars, now = new Date().toISOString()) {
    return this.db.runTransaction(async (tx) => {
      const subRef = this.c.submissions.doc(subId);
      const sub = data(await tx.get(subRef));
      if (!sub || sub.status !== "reviewed") throw Object.assign(new Error("not ratable"), { status: 409 });
      const revRef = this.c.reviewers.doc(sub.reviewerId);
      const rs = await tx.get(revRef);
      const before = { ...emptyStats(), ...(rs.exists ? rs.data() : {}) };
      const after = addRating(before, stars);
      tx.set(revRef, after, { merge: true });
      tx.update(subRef, { rating: stars, ratedAt: now, status: "rated", flagged: stars === 1 });
      return { before, after, points: STAR_POINTS[stars] };
    });
  }

  async claimJob(key, extra) {
    try { await this.c.jobs.doc(jobId(key)).create({ key, status: "queued", at: new Date().toISOString(), ...extra }); return true; }
    catch (e) { if (e.code === 6) return false; throw e; }
  }
  async getJob(key) { return data(await this.c.jobs.doc(jobId(key)).get()); }
  async updateJob(key, patch) { await this.c.jobs.doc(jobId(key)).set(patch, { merge: true }); }

  // Notifications: one document per learner holding the latest INBOX_SIZE items, so reading it costs one read.
  async notify(learnerId, n) {
    const ref = this.c.inbox.doc(learnerId);
    const item = { id: newId("ntf"), at: new Date().toISOString(), read: false, ...n };
    await this.db.runTransaction(async (tx) => {
      const box = (await tx.get(ref)).data() || { items: [], unread: 0 };
      tx.set(ref, { items: [item, ...(box.items || [])].slice(0, INBOX_SIZE), unread: Math.min(INBOX_SIZE, (box.unread || 0) + 1) });
    });
    return item;
  }
  async inboxOf(learnerId) { const d = (await this.c.inbox.doc(learnerId).get()).data(); return d ? { items: d.items || [], unread: d.unread || 0 } : { items: [], unread: 0 }; }
  async markInboxRead(learnerId) {
    const ref = this.c.inbox.doc(learnerId);
    await this.db.runTransaction(async (tx) => {
      const box = (await tx.get(ref)).data(); if (!box) return;
      tx.set(ref, { items: (box.items || []).map((i) => ({ ...i, read: true })), unread: 0 });
    });
  }

  async deleteLearnerData(id) {
    const batchDelete = async (q) => { for (const d of (await q.get()).docs) await d.ref.delete(); };
    await batchDelete(this.c.results.where("learnerId", "==", id));
    await batchDelete(this.c.passes.where("learnerId", "==", id));
    await batchDelete(this.c.submissions.where("studentId", "==", id));
    await batchDelete(this.c.jobs.where("learnerId", "==", id));
    for (const d of (await this.c.submissions.where("reviewerId", "==", id).get()).docs) await d.ref.update({ reviewerId: "deleted" });
    await this.c.reviewers.doc(id).delete();
    await this.c.inbox.doc(id).delete();
    for (const d of (await this.c.learners.where("following", "array-contains", id).get()).docs) await d.ref.update({ following: FieldValue.arrayRemove(id) });
    await this.c.learners.doc(id).delete();
  }
}
