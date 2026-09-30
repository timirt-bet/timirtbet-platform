// The Timirtbet API (Cloud Run service `timirtbet-api`, behind Firebase Hosting's /api route):
// GitHub sign-in, review circles, web submissions, peer review, the GitHub webhook and the
// Pub/Sub and Cloud Scheduler task endpoints.
import crypto from "node:crypto";
import { verifySignature } from "./signature.mjs";
import { onboardStudent, offboardLearner } from "./onboarding.mjs";
import { solutionPath } from "./grader.mjs";
import { jobFromEvent, processJob, assignWaiting, reassignStale, retireSingles, submitModule, recordPush, ModuleError } from "./pipeline.mjs";
import { reviewerProfile, validateReview, level, reputation, MENTOR, LEVELS, REVIEW_DEADLINE_MS } from "./reviews.mjs";
const NUDGE_EVERY_MS = 12 * 3600 * 1000; // a submitter can nudge their reviewer once every 12 hours
import { createNotifier } from "./notify.mjs";
import { authorizeUrl, signSession, verifySession, parseCookies, cookie } from "./auth.mjs";
import { createCircle, joinCircle, leaveCircle, newInviteCode, CircleError } from "./circles.mjs";
import { pointsFor } from "./exercises.mjs";
import { jobFromPush } from "./queue.mjs";

const SESSION_DAYS = 30;
// Firebase Hosting forwards only one cookie to Cloud Run, and it must be called __session.
// It holds either a pending sign-in ({ st }) or a signed-in session ({ sid, v }).
const COOKIE = "__session";

const json = (res, status, body, headers = {}) => { res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...headers }); res.end(body === undefined ? "" : JSON.stringify(body)); };
const redirect = (res, location, cookies = []) => { res.writeHead(302, { location, "set-cookie": cookies }); res.end(); };
async function readBody(req, limit = 1024 * 1024) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error("too large"), { status: 413 }); chunks.push(c); }
  return Buffer.concat(chunks);
}

export function createApp({ store, gh, bank, modules = {}, config, queue, grader, fetchRepo, oauth, verifyTask = async () => false, log = console.log }) {
  const secure = config.secureCookies !== false;
  const redirectUri = `${config.appUrl}/api/auth/github/callback`;
  const notify = createNotifier({ store, gh, config, bank, modules, log });
  const deps = { gh, store, bank, modules, grader, fetchRepo, config, notify, log };
  const checkedAt = new Map(); // learner -> last "Run the tests" (per instance; stops double clicks)
  queue.onJob((job) => processJob({ job, ...deps }));

  const session = async (req) => {
    const p = verifySession(config.sessionSecret, parseCookies(req.headers.cookie)[COOKIE]);
    if (!p || !p.sid) return null;
    const l = await store.getLearner(p.sid);
    return l && (l.sessionVersion || 0) === p.v ? l : null;
  };
  const sameOrigin = (req) => !req.headers.origin || req.headers.origin === new URL(config.appUrl).origin;
  async function publicLearners(ids) {
    const [learners, stats] = await Promise.all([store.getLearners(ids), store.reviewerStatsMany(ids)]);
    const out = {};
    for (const id of ids) {
      const l = learners[id]; if (!l) continue;
      const solved = await store.solvedOf(id);
      out[id] = { id, login: l.githubUsername, solved: solved.length, points: solved.reduce((a, ex) => a + (bank[ex] ? pointsFor(bank[ex]) : 0), 0), reviewer: reviewerProfile(stats[id]) };
    }
    return out;
  }

  const handler = async (req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      const p = url.pathname;
      const raw = req.method === "POST" || req.method === "DELETE" ? await readBody(req) : Buffer.alloc(0);
      const body = () => { try { return JSON.parse(raw.toString("utf8") || "{}"); } catch { throw Object.assign(new Error("bad json"), { status: 400 }); } };
      let m;

      if (req.method === "GET" && p === "/api/health") return json(res, 200, { ok: true });

      // ---- sign in with GitHub ----
      if (req.method === "GET" && p === "/api/auth/github") {
        const state = crypto.randomBytes(16).toString("hex");
        const pending = signSession(config.sessionSecret, { st: state, exp: Date.now() + 600_000 });
        return redirect(res, authorizeUrl({ clientId: config.githubClientId, redirectUri, state }), [cookie(COOKIE, pending, { maxAge: 600, secure })]);
      }
      if (req.method === "GET" && p === "/api/auth/github/callback") {
        const expected = verifySession(config.sessionSecret, parseCookies(req.headers.cookie)[COOKIE])?.st;
        if (!expected || url.searchParams.get("state") !== expected) return json(res, 400, { error: "Sign-in expired or was started elsewhere. Please try again." });
        const user = await oauth.user(await oauth.exchange(url.searchParams.get("code"), redirectUri)); // the token is not kept
        const id = `gh_${user.id}`;
        let learner = await store.getLearner(id);
        if (!learner?.repo) {
          try { learner = await onboardStudent({ gh, store, config, student: { id, githubUsername: user.login, githubId: user.id }, log }); }
          catch (e) { log(`onboarding ${user.login} failed, retrying next sign-in: ${e.message}`); learner = await store.upsertLearner(id, { githubUsername: user.login, githubId: user.id, onboardError: String(e.message || e).slice(0, 300) }); }
        } else if (learner.githubUsername !== user.login) learner = await store.upsertLearner(id, { githubUsername: user.login });
        const value = signSession(config.sessionSecret, { sid: id, v: learner.sessionVersion || 0, exp: Date.now() + SESSION_DAYS * 864e5 });
        return redirect(res, `${config.appUrl}/`, [cookie(COOKIE, value, { maxAge: SESSION_DAYS * 86400, secure })]);
      }

      // ---- development only: sign in as any username without GitHub ----
      if (config.devLogin && req.method === "GET" && p === "/api/auth/dev") {
        const login = url.searchParams.get("login") || "dev-learner";
        const gid = Math.abs([...login].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
        const id = `gh_${gid}`;
        let learner = await store.getLearner(id);
        if (!learner?.repo) learner = await onboardStudent({ gh, store, config, student: { id, githubUsername: login, githubId: gid }, log });
        const value = signSession(config.sessionSecret, { sid: id, v: learner.sessionVersion || 0, exp: Date.now() + SESSION_DAYS * 864e5 });
        return redirect(res, `${config.appUrl}/`, [cookie(COOKIE, value, { maxAge: SESSION_DAYS * 86400, secure })]);
      }

      // ---- GitHub webhook ----
      if (req.method === "POST" && p === "/api/hooks/github") {
        if (!verifySignature(config.webhookSecret, raw, req.headers["x-hub-signature-256"])) return json(res, 401, { error: "bad signature" });
        const event = req.headers["x-github-event"];
        if (event === "ping") return json(res, 200, { pong: true });
        const job = await jobFromEvent({ event, payload: body(), gh, bank });
        if (!job) return json(res, 200, { skipped: true });
        if (!(await store.claimJob(job.key, { kind: job.kind, repo: job.repo }))) return json(res, 200, { duplicate: true });
        await queue.publish(job);
        return json(res, 202, { queued: job.key });
      }

      // ---- tasks from Pub/Sub and Cloud Scheduler (Google-signed tokens only) ----
      if (req.method === "POST" && p.startsWith("/api/tasks/")) {
        if (!(await verifyTask(req.headers.authorization))) return json(res, 401, { error: "unauthorized" });
        if (p === "/api/tasks/grade") {
          const job = jobFromPush(body());
          if (!job) return json(res, 204); // malformed: acknowledge so it is not retried forever
          await processJob({ job, ...deps });
          return json(res, 204);
        }
        if (p === "/api/tasks/reassign") return json(res, 200, { moved: await reassignStale({ store, bank, modules, notify }) });
        return json(res, 404, { error: "not found" });
      }

      // ---- everything below needs a signed-in learner ----
      if (req.method !== "GET" && !sameOrigin(req)) return json(res, 403, { error: "cross-site request refused" });
      const me = await session(req);
      if (!me) return json(res, 401, { error: "Sign in with GitHub first" });

      if (req.method === "POST" && p === "/api/auth/logout") {
        await store.upsertLearner(me.id, { sessionVersion: (me.sessionVersion || 0) + 1 }); // ends every session
        return json(res, 200, { ok: true }, { "set-cookie": cookie(COOKIE, "", { maxAge: 0, secure }) });
      }
      if (req.method === "GET" && p === "/api/me") {
        const circle = me.circleId ? await store.getCircle(me.circleId) : null;
        const [people, passes] = await Promise.all([publicLearners([me.id, ...(circle?.members || [])]), store.passesOf(me.id)]);
        return json(res, 200, {
          me: { ...people[me.id], repo: me.repo || null, repoError: me.repo ? null : me.onboardError || null, noticeSeen: !!me.noticeSeenAt, solvedIds: passes.map((x) => x.exerciseId), savedIds: passes.filter((x) => x.fromGit).map((x) => x.exerciseId), submitVia: "github" },
          circle: circle && { id: circle.id, name: circle.name, track: circle.track, inviteCode: circle.inviteCode, ownerId: circle.ownerId, members: circle.members.map((id) => people[id]).filter(Boolean) },
        });
      }
      // Creates the learner's repository if sign-in could not (the org invitation, template or permissions failed).
      if (req.method === "POST" && p === "/api/me/repo") {
        if (me.repo) return json(res, 200, { repo: me.repo });
        try {
          const l = await onboardStudent({ gh, store, config, student: { id: me.id, githubUsername: me.githubUsername, githubId: me.githubId }, log });
          await store.upsertLearner(me.id, { onboardError: null });
          return json(res, 200, { repo: l.repo });
        } catch (e) {
          const msg = String(e.message || e).slice(0, 300);
          log(`onboarding ${me.githubUsername} failed again: ${msg}`);
          await store.upsertLearner(me.id, { onboardError: msg });
          return json(res, 502, { error: `GitHub said: ${msg}` });
        }
      }
      if (req.method === "POST" && p === "/api/me/notice") { await store.upsertLearner(me.id, { noticeSeenAt: new Date().toISOString() }); return json(res, 200, { ok: true }); }
      if (req.method === "GET" && p === "/api/me/export") {
        const [results, submissions, reviews, stats] = await Promise.all([store.resultsOf(me.id), store.submissionsOf(me.id), store.assignedTo(me.id), store.reviewerStats(me.id)]);
        return json(res, 200, { learner: me, results, submissions: submissions.map(({ reviewerId, ...s }) => s), reviewsWritten: reviews.map(({ studentId, ...s }) => s), reviewer: stats }, { "content-disposition": "attachment; filename=timirtbet-export.json" });
      }
      if (req.method === "DELETE" && p === "/api/me") {
        if (body().confirm !== me.githubUsername) return json(res, 422, { error: "Type your GitHub username to confirm" });
        await leaveCircle(store, me.id);
        await offboardLearner({ gh, config, learner: me }).catch((e) => log(`offboarding ${me.githubUsername}: ${e.message}`));
        await store.deleteLearnerData(me.id);
        return json(res, 200, { deleted: true }, { "set-cookie": cookie(COOKIE, "", { maxAge: 0, secure }) });
      }
      // ---- profiles and following ----
      if (req.method === "GET" && (m = p.match(/^\/api\/users\/([\w-]+)$/))) {
        const u = await store.learnerByLogin(m[1]);
        if (!u) return json(res, 404, { error: "No learner with that GitHub username." });
        const [pub, followers, subs, given, circle, solvedIds] = await Promise.all([publicLearners([u.id]), store.followersOf(u.id), store.submissionsOf(u.id),
          store.assignedTo(u.id), u.circleId ? store.getCircle(u.circleId) : null, store.solvedOf(u.id)]);
        const p1 = pub[u.id];
        return json(res, 200, { user: {
          login: u.githubUsername, solved: p1.solved, solvedIds, points: p1.points, reviewer: p1.reviewer,
          modulesReviewed: new Set(subs.filter((s) => s.moduleId && (s.status === "reviewed" || s.status === "rated")).map((s) => s.moduleId)).size,
          reviewsGiven: given.filter((s) => s.review).length, joined: u.onboardedAt || null, circle: circle ? circle.name : null,
          followers: followers.length, following: (u.following || []).length, isFollowing: followers.includes(me.id), isMe: u.id === me.id,
        } });
      }
      if (req.method === "GET" && (m = p.match(/^\/api\/users\/([\w-]+)\/(followers|following)$/))) {
        const u = await store.learnerByLogin(m[1]);
        if (!u) return json(res, 404, { error: "No learner with that GitHub username." });
        const ids = (m[2] === "followers" ? await store.followersOf(u.id) : u.following || []).slice(0, 200);
        const pub = await publicLearners(ids);
        return json(res, 200, { people: ids.map((id) => pub[id]).filter(Boolean).map((x) => ({ login: x.login, level: x.reviewer.level, levelIndex: x.reviewer.levelIndex, points: x.points })) });
      }
      if ((req.method === "POST" || req.method === "DELETE") && (m = p.match(/^\/api\/users\/([\w-]+)\/follow$/))) {
        const u = await store.learnerByLogin(m[1]);
        if (!u) return json(res, 404, { error: "No learner with that GitHub username." });
        if (u.id === me.id) return json(res, 422, { error: "You can't follow yourself." });
        const on = req.method === "POST", was = (me.following || []).includes(u.id);
        if (on && !was && (me.following || []).length >= 500) return json(res, 422, { error: "You follow the most people allowed (500)." });
        await store.setFollow(me.id, u.id, on);
        if (on && !was) await notify(u.id, { kind: "new_follower", from: me.githubUsername });
        return json(res, 200, { following: on });
      }
      if (req.method === "GET" && (m = p.match(/^\/api\/learners\/([\w-]+)$/))) {
        const one = (await publicLearners([m[1]]))[m[1]];
        return one ? json(res, 200, { learner: one }) : json(res, 404, { error: "no such learner" });
      }

      // ---- circles ----
      try {
        if (req.method === "POST" && p === "/api/circles") return json(res, 201, { circle: await createCircle(store, { ...body(), ownerId: me.id }) });
        if (req.method === "POST" && p === "/api/circles/join") return json(res, 200, { circle: await joinCircle(store, { code: body().code, learnerId: me.id }) });
        if (req.method === "POST" && p === "/api/circles/leave") { await leaveCircle(store, me.id); return json(res, 200, { ok: true }); }
        if (req.method === "POST" && (m = p.match(/^\/api\/circles\/([\w-]+)\/invite-code$/))) return json(res, 200, { circle: await newInviteCode(store, { circleId: m[1], learnerId: me.id }) });
      } catch (e) { if (e instanceof CircleError) return json(res, e.status, { error: e.message }); throw e; }

      // ---- web editor submissions ----
      // "Run the tests": grade the solution file as it is now on main in the learner's own repository.
      if (req.method === "POST" && (m = p.match(/^\/api\/check\/([\w-]+)$/))) {
        const ex = bank[m[1]];
        if (!ex) return json(res, 404, { error: "unknown challenge" });
        if (!me.repo) return json(res, 409, { error: "Your repository isn't set up yet." });
        const last = checkedAt.get(me.id) || 0;
        if (Date.now() - last < 5000) return json(res, 429, { error: "Wait a few seconds before running the tests again." });
        const [owner, repo] = me.repo.split("/"), file = solutionPath(ex);
        let got;
        try { got = await gh.getFileAt(owner, repo, file, "main"); }
        catch (e) { log(`check ${me.repo} failed: ${e.message}`); return json(res, 502, { error: "Couldn't read your repository on GitHub. Try again in a minute." }); }
        if (got.text == null) return json(res, 422, { error: `There is no ${file} on main in your repository.` });
        if (got.text.trim() === ex.starter.trim()) return json(res, 422, { error: `${file} still has the starter code. Commit your solution first.` });
        checkedAt.set(me.id, Date.now()); // only real grading runs count toward the wait
        const results = (await grader.grade([{ exerciseId: ex.id, code: got.text }])).map((r) => ({ ...r, code: got.text }));
        await recordPush({ store, bank, modules, learner: me, results, ref: got.sha, notify });
        const r = results[0];
        return json(res, 200, { passed: r.passed, passedCount: r.passedCount ?? 0, total: r.total ?? 0, commit: got.sha.slice(0, 7),
          tests: (r.tests || []).map((x) => ({ name: x.name, pass: x.pass, message: x.message || null })), error: r.error || null });
      }
      // Development only: put a file on main in the signed-in learner's (in-memory) repository, like a commit on GitHub.
      if (config.devLogin && req.method === "POST" && p === "/api/dev/commit" && gh.devCommit) {
        const { exerciseId, code } = body();
        if (!bank[exerciseId] || typeof code !== "string" || !me.repo) return json(res, 422, { error: "exerciseId and code" });
        gh.devCommit(me.repo, solutionPath(bank[exerciseId]), code);
        return json(res, 200, { ok: true });
      }
      // Development only: act as if the signed-in learner pushed this code to their repository.
      if (config.devLogin && req.method === "POST" && p === "/api/dev/push") {
        const { exerciseId, code } = body();
        if (!bank[exerciseId] || typeof code !== "string") return json(res, 422, { error: "exerciseId and code" });
        const results = (await grader.grade([{ exerciseId, code }])).map((r) => ({ ...r, code }));
        await recordPush({ store, bank, modules, learner: me, results, ref: "dev-push", notify });
        return json(res, 200, { passed: results.every((r) => r.passed) });
      }
      if (req.method === "GET" && (m = p.match(/^\/api\/results\/([\w-]+)$/))) return json(res, 200, { result: await store.latestResult(me.id, m[1]) });

      // ---- notifications (the bell) ----
      // Your latest passing code for one challenge, so the editor shows it on any device.
      if (req.method === "GET" && p.startsWith("/api/passes/")) {
        const exId = decodeURIComponent(p.slice("/api/passes/".length));
        const pass = await store.passOf(me.id, exId);
        return json(res, 200, { exerciseId: exId, code: pass?.code ?? null, at: pass?.codeAt ?? null });
      }
      if (req.method === "GET" && p === "/api/notifications") return json(res, 200, await store.inboxOf(me.id));
      if (req.method === "POST" && p === "/api/notifications/read") { await store.markInboxRead(me.id); return json(res, 200, { ok: true }); }

      // ---- a finished module goes to review as one submission ----
      if (req.method === "POST" && (m = p.match(/^\/api\/modules\/([\w-]+)\/submit$/))) {
        try { return json(res, 201, { submission: (({ reviewerId, previousReviewers, ...x }) => x)(await submitModule({ store, bank, modules, learnerId: me.id, moduleId: m[1], notify, log })) }); }
        catch (e) { if (e instanceof ModuleError) return json(res, e.status, { error: e.message }); throw e; }
      }

      // ---- peer review ----
      // The author sees who reviews their module and the 72-hour clock while it is open.
      if (req.method === "GET" && p === "/api/submissions/mine") {
        const subs = (await store.submissionsOf(me.id)).filter((s) => s.status !== "withdrawn");
        const ids = [...new Set(subs.map((s) => s.reviewerId).filter((id) => id && id !== "deleted"))];
        const people = await store.getLearners(ids), stats = await store.reviewerStatsMany(ids);
        return json(res, 200, { submissions: subs.map(({ reviewerId, previousReviewers, ...s }) => ({
          ...s,
          reviewer: people[reviewerId] ? (({ level, levelIndex }) => ({ login: people[reviewerId].githubUsername, level, levelIndex }))(reviewerProfile(stats[reviewerId])) : null,
          dueAt: s.status === "awaiting_review" && s.assignedAt ? new Date(Date.parse(s.assignedAt) + REVIEW_DEADLINE_MS).toISOString() : null,
          nudgeAfter: s.lastNudgedAt ? new Date(Date.parse(s.lastNudgedAt) + NUDGE_EVERY_MS).toISOString() : null,
        })) });
      }
      // Nudge: the author reminds their reviewer (bell and GitHub), at most once every 12 hours.
      if (req.method === "POST" && (m = p.match(/^\/api\/submissions\/([\w-]+)\/nudge$/))) {
        const sub = await store.getSubmission(m[1]);
        if (!sub || sub.studentId !== me.id) return json(res, 404, { error: "no such submission" });
        if (sub.status !== "awaiting_review" || !sub.reviewerId) return json(res, 409, { error: "Nobody is reviewing this yet." });
        const wait = sub.lastNudgedAt ? Date.parse(sub.lastNudgedAt) + NUDGE_EVERY_MS - Date.now() : 0;
        if (wait > 0) return json(res, 429, { error: `You can nudge again in ${Math.ceil(wait / 3600e3)} h.` });
        const at = new Date().toISOString();
        await store.updateSubmission(sub.id, { lastNudgedAt: at });
        await notify(sub.reviewerId, { kind: "review_nudge", unitId: sub.moduleId || sub.exerciseId, subId: sub.id, from: me.githubUsername,
          dueAt: sub.assignedAt ? new Date(Date.parse(sub.assignedAt) + REVIEW_DEADLINE_MS).toISOString() : null });
        return json(res, 200, { nudgedAt: at, nudgeAfter: new Date(Date.now() + NUDGE_EVERY_MS).toISOString() });
      }
      if (req.method === "GET" && p === "/api/reviews/queue") {
        // Only whole modules are reviewed; older single-challenge items are withdrawn by the hourly task.
        const mine = (await store.assignedTo(me.id)).filter((s) => s.status === "awaiting_review" && s.moduleId);
        return json(res, 200, { toReview: mine.map(({ studentId, previousReviewers, ...s }) => ({ ...s, dueAt: s.assignedAt ? new Date(Date.parse(s.assignedAt) + REVIEW_DEADLINE_MS).toISOString() : null })) });
      }
      if (req.method === "GET" && p === "/api/reviews/given") {
        const done = (await store.assignedTo(me.id)).filter((s) => s.review);
        return json(res, 200, { reviews: done.map((s) => ({ id: s.id, exerciseId: s.exerciseId, review: s.review, rating: s.rating || null })) });
      }
      if (req.method === "POST" && (m = p.match(/^\/api\/submissions\/([\w-]+)\/review$/))) {
        const sub = await store.getSubmission(m[1]);
        if (!sub) return json(res, 404, { error: "no such submission" });
        if (sub.reviewerId !== me.id) return json(res, 403, { error: "only the assigned reviewer can review this submission" });
        if (sub.status !== "awaiting_review") return json(res, 409, { error: "already reviewed" });
        const b = body(); const errors = validateReview(b);
        if (errors.length) return json(res, 422, { errors });
        const updated = await store.updateSubmission(sub.id, { status: "reviewed", review: { rubric: b.rubric, text: b.text.trim(), at: new Date().toISOString() } });
        await store.bumpOpenReviews(me.id, -1);
        await notify(sub.studentId, { kind: "review_received", unitId: sub.moduleId || sub.exerciseId, subId: sub.id, exerciseId: sub.items?.[0]?.exerciseId || sub.exerciseId });
        return json(res, 200, { submission: updated });
      }
      if (req.method === "POST" && (m = p.match(/^\/api\/submissions\/([\w-]+)\/rating$/))) {
        const sub = await store.getSubmission(m[1]);
        if (!sub) return json(res, 404, { error: "no such submission" });
        if (sub.studentId !== me.id) return json(res, 403, { error: "only the author can rate the review" });
        if (sub.status !== "reviewed") return json(res, 409, { error: sub.status === "rated" ? "already rated" : "there is no review to rate yet" });
        const stars = body().stars;
        if (![1, 2, 3, 4, 5].includes(stars)) return json(res, 422, { errors: ["stars must be a whole number from 1 to 5"] });
        const { before, after, points } = await store.rate(sub.id, stars);
        const unitId = sub.moduleId || sub.exerciseId, bp = reviewerProfile(before), ap = reviewerProfile(after);
        await notify(sub.reviewerId, { kind: "review_rated", unitId, subId: sub.id, stars, points });
        if (ap.levelIndex > bp.levelIndex) await notify(sub.reviewerId, { kind: "level_up", level: LEVELS[ap.levelIndex].name, levelIndex: ap.levelIndex });
        await assignWaiting({ store, bank, modules, notify });
        return json(res, 200, { before: reviewerProfile(before), after: reviewerProfile(after) });
      }

      // ---- Mentors: a second opinion on reviews rated one star ----
      const isMentor = async () => level(reputation(await store.reviewerStats(me.id))) >= MENTOR;
      if (req.method === "GET" && p === "/api/reviews/flagged") {
        if (!(await isMentor())) return json(res, 403, { error: "Mentors only" });
        const list = (await store.flagged()).filter((s) => s.studentId !== me.id && s.reviewerId !== me.id);
        return json(res, 200, { flagged: list.map(({ studentId, reviewerId, previousReviewers, ...s }) => s) });
      }
      if (req.method === "POST" && (m = p.match(/^\/api\/submissions\/([\w-]+)\/second-opinion$/))) {
        if (!(await isMentor())) return json(res, 403, { error: "Mentors only" });
        const sub = await store.getSubmission(m[1]);
        if (!sub?.flagged || sub.secondOpinion) return json(res, 409, { error: "nothing to give a second opinion on" });
        if (sub.studentId === me.id || sub.reviewerId === me.id) return json(res, 403, { error: "not on your own work or review" });
        const text = String(body().text || "").trim();
        if (text.length < 40) return json(res, 422, { errors: ["text must be at least 40 characters"] });
        const updated = await store.updateSubmission(sub.id, { secondOpinion: { text, at: new Date().toISOString() } });
        await notify(sub.studentId, { kind: "second_opinion", unitId: sub.moduleId || sub.exerciseId, subId: sub.id, exerciseId: sub.items?.[0]?.exerciseId || sub.exerciseId });
        return json(res, 200, { submission: updated });
      }
      return json(res, 404, { error: "not found" });
    } catch (e) {
      if (e.status && e.status < 500) return json(res, e.status, { error: e.message });
      log(`error: ${e.stack || e.message}`);
      return json(res, 500, { error: "internal error" });
    }
  };
  return { handler, idle: () => queue.idle() };
}
