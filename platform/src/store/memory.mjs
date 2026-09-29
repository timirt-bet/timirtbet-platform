// In-memory store for development and tests. Same async interface as FirestoreStore.
// A learner record holds only: githubId, githubUsername, repo, circleId, sessionVersion, onboardedAt, noticeSeenAt.
import crypto from "node:crypto";
import { emptyStats, addRating, STAR_POINTS } from "../reviews.mjs";

const clone = (x) => (x == null ? x : structuredClone(x));
export const INBOX_SIZE = 30;
export const newId = (prefix) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;

export class MemoryStore {
  constructor() { this.t = { learners: new Map(), circles: new Map(), results: new Map(), passes: new Map(), submissions: new Map(), reviewers: new Map(), jobs: new Map(), inbox: new Map() }; }

  // learners
  async getLearner(id) { return clone(this.t.learners.get(id)) || null; }
  async upsertLearner(id, patch) { const cur = this.t.learners.get(id) || { id }; const next = { ...cur, ...patch, id }; this.t.learners.set(id, next); return clone(next); }
  async learnerByRepo(repo) { for (const l of this.t.learners.values()) if (l.repo === repo) return clone(l); return null; }
  async getLearners(ids) { const out = {}; for (const id of ids) { const l = this.t.learners.get(id); if (l) out[id] = clone(l); } return out; }

  // circles
  async createCircle(c) { const rec = { id: newId("cir"), createdAt: new Date().toISOString(), ...c }; this.t.circles.set(rec.id, rec); return clone(rec); }
  async getCircle(id) { return clone(this.t.circles.get(id)) || null; }
  async circleByCode(code) { for (const c of this.t.circles.values()) if (c.inviteCode === code) return clone(c); return null; }
  async updateCircle(id, patch) { const next = { ...this.t.circles.get(id), ...patch }; this.t.circles.set(id, next); return clone(next); }
  async deleteCircle(id) { this.t.circles.delete(id); }

  // results and passes
  // A pass keeps the latest passing code, which a module submission sends for review.
  async addResult({ code, ...r }) {
    const rec = { id: `${r.learnerId}_${r.exerciseId}_${r.ref || "web"}_${Date.now().toString(36)}`, at: new Date().toISOString(), ...r };
    this.t.results.set(rec.id, rec);
    if (r.passed) {
      const k = `${r.exerciseId}_${r.learnerId}`, cur = this.t.passes.get(k);
      const next = cur || { exerciseId: r.exerciseId, learnerId: r.learnerId, at: rec.at };
      this.t.passes.set(k, typeof code === "string" ? { ...next, code, codeAt: rec.at } : next);
    }
    return clone(rec);
  }
  async passOf(learnerId, exerciseId) { return clone(this.t.passes.get(`${exerciseId}_${learnerId}`)) || null; }
  async latestResult(learnerId, exerciseId) { return clone([...this.t.results.values()].filter((r) => r.learnerId === learnerId && r.exerciseId === exerciseId).sort((a, b) => b.at.localeCompare(a.at))[0]) || null; }
  async resultsOf(learnerId) { return clone([...this.t.results.values()].filter((r) => r.learnerId === learnerId)); }
  async hasPassed(learnerId, exerciseId) { return this.t.passes.has(`${exerciseId}_${learnerId}`); }
  async passersOf(exerciseId) { return [...this.t.passes.values()].filter((p) => p.exerciseId === exerciseId).map((p) => p.learnerId); }
  async solvedOf(learnerId) { return (await this.passesOf(learnerId)).map((p) => p.exerciseId); }
  async passesOf(learnerId) { return [...this.t.passes.values()].filter((p) => p.learnerId === learnerId).map((p) => ({ exerciseId: p.exerciseId, hasCode: typeof p.code === "string" })); }

  // submissions
  async addSubmission(s) { const rec = { id: newId("sub"), at: new Date().toISOString(), status: "awaiting_review", review: null, rating: null, ...s }; this.t.submissions.set(rec.id, rec); return clone(rec); }
  async getSubmission(id) { return clone(this.t.submissions.get(id)) || null; }
  async updateSubmission(id, patch) { const next = { ...this.t.submissions.get(id), ...patch }; this.t.submissions.set(id, next); return clone(next); }
  async submissionsOf(learnerId) { return clone([...this.t.submissions.values()].filter((s) => s.studentId === learnerId)); }
  async assignedTo(reviewerId) { return clone([...this.t.submissions.values()].filter((s) => s.reviewerId === reviewerId)); }
  async openSubmissionFor(learnerId, exerciseId) { return clone([...this.t.submissions.values()].find((s) => s.studentId === learnerId && s.exerciseId === exerciseId && s.status !== "rated")) || null; }
  async byStatus(status) { return clone([...this.t.submissions.values()].filter((s) => s.status === status)); }
  async flagged() { return clone([...this.t.submissions.values()].filter((s) => s.flagged && !s.secondOpinion)); }

  // reviewers
  async reviewerStats(id) { return { ...emptyStats(), ...(this.t.reviewers.get(id) || {}) }; }
  async reviewerStatsMany(ids) { const out = {}; for (const id of ids) out[id] = await this.reviewerStats(id); return out; }
  async bumpOpenReviews(id, delta) { const s = await this.reviewerStats(id); this.t.reviewers.set(id, { ...s, openReviews: Math.max(0, s.openReviews + delta) }); }

  // The author's rating: submission and reviewer counters change together.
  async rate(subId, stars, now = new Date().toISOString()) {
    const sub = this.t.submissions.get(subId);
    if (!sub || sub.status !== "reviewed") throw Object.assign(new Error("not ratable"), { status: 409 });
    const before = await this.reviewerStats(sub.reviewerId);
    const after = addRating(before, stars);
    this.t.reviewers.set(sub.reviewerId, after);
    this.t.submissions.set(subId, { ...sub, rating: stars, ratedAt: now, status: "rated", flagged: stars === 1 });
    return { before, after, points: STAR_POINTS[stars] };
  }

  // jobs (idempotency for webhooks and web submissions)
  async claimJob(key, data) { if (this.t.jobs.has(key)) return false; this.t.jobs.set(key, { key, status: "queued", at: new Date().toISOString(), ...data }); return true; }
  async getJob(key) { return clone(this.t.jobs.get(key)) || null; }
  async updateJob(key, patch) { this.t.jobs.set(key, { ...this.t.jobs.get(key), ...patch }); }

  // Notifications: one small inbox per learner, newest first, at most INBOX_SIZE items.
  async notify(learnerId, n) {
    const box = this.t.inbox.get(learnerId) || { items: [], unread: 0 };
    const item = { id: newId("ntf"), at: new Date().toISOString(), read: false, ...n };
    this.t.inbox.set(learnerId, { items: [item, ...box.items].slice(0, INBOX_SIZE), unread: Math.min(INBOX_SIZE, box.unread + 1) });
    return clone(item);
  }
  async inboxOf(learnerId) { return clone(this.t.inbox.get(learnerId)) || { items: [], unread: 0 }; }
  async markInboxRead(learnerId) { const box = this.t.inbox.get(learnerId); if (box) this.t.inbox.set(learnerId, { items: box.items.map((i) => ({ ...i, read: true })), unread: 0 }); }

  // Delete everything that identifies a learner. Reviews they wrote stay, unsigned.
  async deleteLearnerData(id) {
    this.t.learners.delete(id); this.t.reviewers.delete(id); this.t.inbox.delete(id);
    for (const [k, r] of this.t.results) if (r.learnerId === id) this.t.results.delete(k);
    for (const [k, p] of this.t.passes) if (p.learnerId === id) this.t.passes.delete(k);
    for (const [k, s] of this.t.submissions) {
      if (s.studentId === id) this.t.submissions.delete(k);
      else if (s.reviewerId === id) this.t.submissions.set(k, { ...s, reviewerId: "deleted" });
    }
    for (const [k, j] of this.t.jobs) if (j.learnerId === id) this.t.jobs.delete(k);
  }
}
