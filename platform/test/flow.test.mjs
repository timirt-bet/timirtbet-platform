// End to end on the API: sign in -> circle -> push or web submission -> grader -> submission
// -> circle reviewer -> review -> rating -> reputation; plus Mentors, stale reviews, export and delete.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createApp } from "../src/server.mjs";
import { MemoryStore } from "../src/store/memory.mjs";
import { inProcessQueue } from "../src/queue.mjs";
import { localGrader } from "../src/grader-client.mjs";
import { loadBank, loadModules } from "../src/exercises.mjs";
import { sign } from "../src/signature.mjs";
import { signSession } from "../src/auth.mjs";
import { reassignStale, retireSingles, passersOfUnit } from "../src/pipeline.mjs";
import { statsFromStars } from "../src/reviews.mjs";
import { CHALLENGES, fixtureRepo, fakeGitHub, answer, NEEDS_ANSWERS } from "./helpers.mjs";

process.env.TIMIRTBET_GO_RACE = "0";
const bank = loadBank(CHALLENGES);
const modules = loadModules(CHALLENGES);
const APP = "https://timirtbet.example";
const config = { org: "timirtbet", studentsTeam: "learners", templateRepo: "student-template", webhookSecret: "wh", sessionSecret: "sess", githubClientId: "Iv1.test", appUrl: APP, secureCookies: false };
const oauth = { exchange: async (code) => { if (code !== "good") throw new Error("bad code"); return "gho_token"; }, user: async () => ({ id: 1001, login: "hana-t" }) };

async function setup({ prFiles, verifyTask } = {}) {
  const gh = fakeGitHub({ prFiles });
  const store = new MemoryStore();
  // Four learners who already finished module js-m1 and solved go-sync and js-arrays.
  for (const [id, u] of [["gh_2", "dawit-b"], ["gh_3", "liya-g"], ["gh_4", "abel-k"], ["gh_5", "sara-w"]]) {
    await store.upsertLearner(id, { githubUsername: u, githubId: +id.slice(3), repo: `timirtbet/${u}-code` });
    for (const ex of [...modules["js-m1"].exercises, "go-sync", "js-arrays"]) await store.addResult({ learnerId: id, exerciseId: ex, ref: "seed", passed: true, code: `// ${ex}` });
  }
  const repoDir = fixtureRepo(NEEDS_ANSWERS ? [] : ["js-loops", "go-sync"]);
  // js-func has a wrong attempt (not the starter), so it is graded and fails.
  fs.writeFileSync(path.join(repoDir, "js/js-func/solution.js"), "function greet(name) { return name; }\n");
  const fetchRepo = async () => { const d = fs.mkdtempSync(repoDir + "-copy-"); fs.cpSync(repoDir, d, { recursive: true }); return d; };
  const queue = inProcessQueue();
  const app = createApp({ store, gh, bank, modules, config, queue, grader: localGrader({ bank, challengesDir: CHALLENGES }), fetchRepo, oauth, verifyTask, log: () => {} });
  const server = http.createServer(app.handler); await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const as = async (sid) => ({ cookie: `__session=${signSession("sess", { sid, v: (await store.getLearner(sid)).sessionVersion || 0, exp: Date.now() + 60000 })}` });
  const send = (method, p, body, headers = {}) => fetch(base + p, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json", origin: APP, ...headers } });
  const post = (p, body, headers) => send("POST", p, body, headers);
  const get = (p, headers = {}) => fetch(base + p, { headers, redirect: "manual" });
  const hook = (event, payload) => { const raw = JSON.stringify(payload); return fetch(base + "/api/hooks/github", { method: "POST", body: raw, headers: { "x-hub-signature-256": sign("wh", Buffer.from(raw)), "x-github-event": event } }); };
  const signIn = async () => {
    const start = await get("/api/auth/github");
    const state = new URL(start.headers.get("location")).searchParams.get("state");
    const pending = start.headers.getSetCookie().find((c) => c.startsWith("__session=")).split(";")[0];
    const cb = await get(`/api/auth/github/callback?code=good&state=${state}`, { cookie: pending });
    return { start, cb, pending, hana: { cookie: cb.headers.getSetCookie().find((c) => c.startsWith("__session=")).split(";")[0] } };
  };
  const circle = async (hana) => {
    const { circle } = await (await post("/api/circles", { name: "Addis coders", track: "both" }, hana)).json();
    for (const sid of ["gh_2", "gh_3"]) await post("/api/circles/join", { code: circle.inviteCode }, await as(sid));
    return circle;
  };
  return { gh, store, app, base, as, post, send, get, hook, signIn, circle, close: () => { server.close(); fs.rmSync(repoDir, { recursive: true, force: true }); } };
}

test("sign in, circle, push, circle review, rating", { skip: NEEDS_ANSWERS }, async () => {
  const t = await setup();
  try {
    const { start, cb, pending, hana } = await t.signIn();
    assert.equal((await t.get("/api/me", { cookie: pending })).status, 401, "a pending sign-in is not a session");
    assert.equal(start.status, 302);
    assert.match(start.headers.get("location"), /^https:\/\/github\.com\/login\/oauth\/authorize\?client_id=Iv1\.test/);
    assert.equal(cb.headers.get("location"), `${APP}/`);
    assert.deepEqual(t.gh.calls.map((c) => c.name), ["addToTeam", "createFromTemplate", "addCollaborator"]);
    assert.deepEqual(Object.keys(await t.store.getLearner("gh_1001")).sort(), ["githubId", "githubUsername", "id", "onboardedAt", "repo"]);
    assert.equal((await t.get("/api/auth/github/callback?code=good&state=forged", { cookie: pending })).status, 400);
    assert.equal((await t.get("/api/auth/github/callback?code=good&state=forged")).status, 400);
    const me = await (await t.get("/api/me", hana)).json();
    assert.equal(me.me.login, "hana-t");
    assert.equal(me.me.noticeSeen, false);
    assert.equal((await t.post("/api/me/notice", {}, hana)).status, 200);
    assert.equal((await t.get("/api/me")).status, 401);

    const circle = await t.circle(hana);
    assert.equal((await t.post("/api/circles/join", { code: "WRONG234" }, await t.as("gh_4"))).status, 404);
    assert.equal((await t.post("/api/circles", { name: "Evil" }, { ...hana, origin: "https://evil.example" })).status, 403);
    const mine = await (await t.get("/api/me", hana)).json();
    assert.deepEqual(mine.circle.members.map((x) => x.login), ["hana-t", "dawit-b", "liya-g"]);
    assert.equal(mine.circle.members[1].points, 4 * 10 + 25 + 10);
    assert.equal(mine.circle.inviteCode, circle.inviteCode);

    const push = { ref: "refs/heads/main", after: "abc123", repository: { full_name: "timirtbet/hana-t-code" },
      commits: [{ added: [], modified: ["js/js-loops/solution.js", "js/js-func/solution.js"] }, { added: ["go/go_sync/solution.go"], modified: [] }] };
    assert.equal((await t.hook("push", push)).status, 202);
    assert.deepEqual(await (await t.hook("push", push)).json(), { duplicate: true }, "a repeated webhook is graded once");
    await t.app.idle();
    const statuses = t.gh.calls.filter((c) => c.name === "setStatus").map((c) => c.args[3]);
    assert.deepEqual(statuses.map((s) => s.state), ["pending", "failure"]);
    assert.equal(statuses[1].description, "2/3 challenge(s) passed");

    assert.equal((await t.store.submissionsOf("gh_1001")).length, 0, "a single pass is not reviewed on its own");
    assert.match((await t.store.passOf("gh_1001", "js-loops")).code, /\S/, "the pass keeps its code");
    assert.equal(await t.store.passOf("gh_1001", "js-func"), null, "failing code is not kept");
    const pushNotes = (await t.store.inboxOf("gh_1001")).items.map((n) => `${n.kind}:${n.exerciseId}`);
    assert.ok(pushNotes.includes("push_passed:js-loops") && pushNotes.includes("push_failed:js-func"), "the learner hears how the push went");
    const meNow = (await (await t.get("/api/me", hana)).json()).me;
    assert.equal(meNow.submitVia, "github");
    assert.ok(meNow.savedIds.includes("js-loops") && !meNow.savedIds.includes("js-func"));
    const saved = await (await t.get("/api/passes/js-loops", hana)).json();
    assert.match(saved.code, /\S/, "your passing code comes back for the editor");
    assert.equal((await (await t.get("/api/passes/js-func", hana)).json()).code, null);
    assert.equal((await t.get("/api/passes/js-loops")).status, 401, "only for the signed-in learner");

    // The module goes to review only when every challenge in it has passed.
    assert.equal((await t.post("/api/modules/nope/submit", {}, hana)).status, 404);
    let res = await t.post("/api/modules/js-m1/submit", {}, hana);
    assert.equal(res.status, 409);
    assert.match((await res.json()).error, /^Pass /);
    for (const ex of ["js-vars", "js-cond", "js-func"]) await t.store.addResult({ learnerId: "gh_1001", exerciseId: ex, ref: "web", source: "web", passed: true, passedCount: 3, total: 3, code: `// ${ex} from the editor` });
    res = await t.post("/api/modules/js-m1/submit", {}, hana);
    assert.equal(res.status, 409, "passes from the web editor don't count");
    assert.match((await res.json()).error, /^Push "What type is it\?" from your GitHub repository/);
    assert.ok(!(await (await t.get("/api/me", hana)).json()).me.savedIds.includes("js-vars"));
    for (const ex of ["js-vars", "js-cond", "js-func"]) await t.store.addResult({ learnerId: "gh_1001", exerciseId: ex, ref: "sha", source: "git", passed: true, passedCount: 3, total: 3, code: `// ${ex} by hana` });
    res = await t.post("/api/modules/js-m1/submit", {}, hana);
    assert.equal(res.status, 201);
    const { submission } = await res.json();
    assert.equal(submission.moduleId, "js-m1");
    assert.deepEqual(submission.items.map((i) => i.exerciseId), ["js-vars", "js-cond", "js-loops", "js-func"]);
    assert.equal(submission.items[0].code, "// js-vars by hana");
    assert.ok(!("reviewerId" in submission), "the author doesn't see who reviews it");
    assert.equal((await t.post("/api/modules/js-m1/submit", {}, hana)).status, 409, "one open review per module");

    // Only someone who finished the whole module can review it; circle members first.
    await t.store.upsertLearner("gh_6", { githubUsername: "tsion-a", githubId: 6 });
    for (const ex of ["js-vars", "js-cond", "js-loops"]) await t.store.addResult({ learnerId: "gh_6", exerciseId: ex, ref: "seed", passed: true, code: "x" });
    const eligible = await passersOfUnit(t.store, "js-m1", modules);
    assert.ok(!eligible.includes("gh_6") && eligible.includes("gh_2"));
    const sub = await t.store.getSubmission(submission.id);
    assert.ok(["gh_2", "gh_3"].includes(sub.reviewerId), `reviewer ${sub.reviewerId} should be from the circle`);

    // The reviewer is told, in the app and with an @mention on GitHub.
    const inbox = await (await t.get("/api/notifications", await t.as(sub.reviewerId))).json();
    assert.equal(inbox.unread, 1);
    assert.deepEqual([inbox.items[0].kind, inbox.items[0].unitId, inbox.items[0].subId], ["review_assigned", "js-m1", sub.id]);
    const reviewerLogin = (await t.store.getLearner(sub.reviewerId)).githubUsername;
    const issue = t.gh.calls.find((c) => c.name === "createIssue" && c.args[1] === `${reviewerLogin}-code`);
    assert.ok(issue, "a notifications issue is opened in the reviewer's own repository");
    assert.equal((await t.store.getLearner(sub.reviewerId)).notifyIssue, 1);
    const mention = t.gh.calls.filter((c) => c.name === "commentOnPR" && c.args[1] === `${reviewerLogin}-code`).at(-1);
    assert.match(mention.args[3], new RegExp(`^@${reviewerLogin} You have a new review to write: \\*\\*Module 1 · Basics 1`));
    assert.equal((await t.post("/api/notifications/read", {}, await t.as(sub.reviewerId))).status, 200);
    assert.equal((await (await t.get("/api/notifications", await t.as(sub.reviewerId))).json()).unread, 0);
    const other = sub.reviewerId === "gh_2" ? "gh_3" : "gh_2";
    const review = { rubric: { correctness: 3, readability: 3, style: 2 }, text: "Correct. Line 3 could use += and a clearer name than t for the running total." };
    assert.equal((await t.post(`/api/submissions/${sub.id}/review`, review, await t.as(other))).status, 403);
    assert.equal((await t.post(`/api/submissions/${sub.id}/review`, { ...review, text: "ok" }, await t.as(sub.reviewerId))).status, 422);
    const q = await (await t.get("/api/reviews/queue", await t.as(sub.reviewerId))).json();
    assert.ok(q.toReview.some((x) => x.id === sub.id && !("studentId" in x)), "the reviewer doesn't see who wrote it");
    const openBefore = (await t.store.reviewerStats(sub.reviewerId)).openReviews;
    assert.equal((await t.post(`/api/submissions/${sub.id}/review`, review, await t.as(sub.reviewerId))).status, 200);
    const authorBox = await (await t.get("/api/notifications", hana)).json();
    assert.equal(authorBox.items[0].kind, "review_received");
    assert.equal(authorBox.items[0].exerciseId, "js-vars", "the notification opens the module's first challenge");
    assert.equal((await t.store.reviewerStats(sub.reviewerId)).openReviews, openBefore - 1);
    assert.ok((await (await t.get("/api/submissions/mine", hana)).json()).submissions.every((x) => !("reviewerId" in x)), "the author doesn't see who reviewed it");

    assert.equal((await t.post(`/api/submissions/${sub.id}/rating`, { stars: 5 }, await t.as(sub.reviewerId))).status, 403);
    assert.equal((await t.post(`/api/submissions/${sub.id}/rating`, { stars: 7 }, hana)).status, 422);
    const rated = await (await t.post(`/api/submissions/${sub.id}/rating`, { stars: 5 }, hana)).json();
    assert.deepEqual([rated.before.reputation, rated.after.reputation], [0, 10]);
    assert.deepEqual([rated.before.score, rated.after.score], [3.5, 3.75]);
    const rb = await (await t.get("/api/notifications", await t.as(sub.reviewerId))).json();
    assert.deepEqual([rb.items[0].kind, rb.items[0].stars, rb.items[0].points], ["review_rated", 5, 10]);
    assert.equal((await t.post(`/api/submissions/${sub.id}/rating`, { stars: 1 }, hana)).status, 409);
    const given = await (await t.get("/api/reviews/given", await t.as(sub.reviewerId))).json();
    assert.equal(given.reviews.find((r) => r.id === sub.id).rating, 5);

    assert.equal((await t.post("/api/auth/logout", {}, hana)).status, 200);
    assert.equal((await t.get("/api/me", hana)).status, 401, "signing out ends every session");
  } finally { t.close(); }
});

test("a learner whose repository wasn't created can retry, and sees why it failed", async () => {
  const t = await setup();
  try {
    const { hana } = await t.signIn();
    await t.store.upsertLearner("gh_1001", { repo: null });
    const ok = t.gh.createFromTemplate, err = Object.assign(new Error("Resource not accessible by integration"), { status: 403 });
    t.gh.createFromTemplate = async () => { throw err; };
    let res = await t.post("/api/me/repo", {}, hana);
    assert.equal(res.status, 502);
    assert.match((await res.json()).error, /Resource not accessible/);
    assert.match((await (await t.get("/api/me", hana)).json()).me.repoError, /Resource not accessible/);
    t.gh.createFromTemplate = ok;
    res = await t.post("/api/me/repo", {}, hana);
    assert.equal(res.status, 200);
    const me = (await (await t.get("/api/me", hana)).json()).me;
    assert.ok(me.repo && me.repoError === null);
  } finally { t.close(); }
});

test("Run the tests: grades the solution on main in the learner's repository", async () => {
  const t = await setup();
  try {
    const { hana } = await t.signIn();
    const check = async () => { const r = await t.post("/api/check/js-vars", {}, hana); return { status: r.status, body: await r.json() }; };
    let r = await check();
    assert.equal(r.status, 422); assert.match(r.body.error, /no js\/js-vars\/solution\.js on main/);
    t.gh.files["js/js-vars/solution.js"] = bank["js-vars"].starter;
    r = await check(); assert.equal(r.status, 422); assert.match(r.body.error, /starter code/);
    t.gh.files["js/js-vars/solution.js"] = "function describe(v) { return typeof v; }";
    r = await check();
    assert.equal(r.status, 200); assert.equal(r.body.passed, false); assert.ok(r.body.passedCount > 0 && r.body.passedCount < r.body.total);
    assert.equal(r.body.commit, "c0ffee1");
    assert.equal((await t.post("/api/check/js-vars", {}, hana)).status, 429, "not twice within a few seconds");
    const latest = (await (await t.get("/api/results/js-vars", hana)).json()).result;
    assert.equal(latest.passed, false); assert.equal(latest.source, "git");
    if (!NEEDS_ANSWERS) {
      await new Promise((x) => setTimeout(x, 5100));
      t.gh.files["js/js-vars/solution.js"] = answer("js-vars");
      r = await check(); assert.equal(r.body.passed, true);
      assert.ok((await (await t.get("/api/me", hana)).json()).me.savedIds.includes("js-vars"), "a pass from the repository counts");
    }
  } finally { t.close(); }
});

test("untouched starter code (like a new repository's first commit) is not graded", async () => {
  const t = await setup();
  try {
    await t.signIn();
    const push = { ref: "refs/heads/main", after: "first1", repository: { full_name: "timirtbet/hana-t-code" }, commits: [{ added: ["js/js-cond/solution.js", "js/js-vars/solution.js"], modified: [] }] };
    assert.equal((await t.hook("push", push)).status, 202);
    await t.app.idle();
    const st = t.gh.calls.filter((c) => c.name === "setStatus").map((c) => c.args[3]);
    assert.deepEqual(st.map((x) => [x.state, x.description]).at(-1), ["success", "No solutions to check yet"]);
    assert.equal(await t.store.latestResult("gh_1001", "js-cond"), null, "no failing result is recorded");
    assert.equal((await t.store.inboxOf("gh_1001")).items.filter((n) => n.kind.startsWith("push_")).length, 0, "no notifications");
  } finally { t.close(); }
});

test("solutions are submitted from GitHub only", async () => {
  const t = await setup();
  try {
    const { hana } = await t.signIn();
    const res = await t.post("/api/submissions", { exerciseId: "js-arrays", code: "function average(){ return 0 }" }, hana);
    assert.equal(res.status, 404, "there is no web submission endpoint");
  } finally { t.close(); }
});

test("a one-star review goes to a Mentor for a second opinion", async () => {
  const t = await setup();
  try {
    const { hana } = await t.signIn();
    await t.store.addResult({ learnerId: "gh_1001", exerciseId: "js-loops", ref: "x", passed: true });
    const sub = await t.store.addSubmission({ studentId: "gh_1001", exerciseId: "js-loops", code: "x", reviewerId: "gh_2", status: "reviewed", review: { text: "bad" } });
    await t.post(`/api/submissions/${sub.id}/rating`, { stars: 1 }, hana);
    assert.equal((await t.get("/api/reviews/flagged", await t.as("gh_3"))).status, 403, "only Mentors");
    t.store.t.reviewers.set("gh_5", statsFromStars(Array(26).fill(5))); // 260 points: Mentor
    const flagged = await (await t.get("/api/reviews/flagged", await t.as("gh_5"))).json();
    assert.deepEqual(flagged.flagged.map((s) => s.id), [sub.id]);
    assert.ok(!("studentId" in flagged.flagged[0]) && !("reviewerId" in flagged.flagged[0]));
    assert.equal((await t.post(`/api/submissions/${sub.id}/second-opinion`, { text: "short" }, await t.as("gh_5"))).status, 422);
    assert.equal((await t.post(`/api/submissions/${sub.id}/second-opinion`, { text: "The code is right; the review missed that the loop handles n = 0 correctly." }, await t.as("gh_5"))).status, 200);
    const mine = (await (await t.get("/api/submissions/mine", hana)).json()).submissions[0];
    assert.match(mine.secondOpinion.text, /handles n = 0/);
  } finally { t.close(); }
});

test("reviews not written within 72 hours move to someone else", async () => {
  const t = await setup();
  try {
    await t.signIn();
    const h = (n) => new Date(Date.now() - n * 3600e3).toISOString();
    const sub = await t.store.addSubmission({ studentId: "gh_1001", moduleId: "js-m1", exerciseId: "js-m1", code: "x", reviewerId: "gh_2", assignedAt: h(73) });
    const soon = await t.store.addSubmission({ studentId: "gh_1001", moduleId: "js-m2", exerciseId: "js-m2", code: "x", reviewerId: "gh_3", assignedAt: h(49) });
    await t.store.bumpOpenReviews("gh_2", 1); await t.store.bumpOpenReviews("gh_3", 1);
    const notify = async (id, n) => t.store.notify(id, n);
    assert.equal(await reassignStale({ store: t.store, bank, modules, notify }), 1);
    assert.equal((await t.store.inboxOf("gh_3")).items.filter((x) => x.kind === "review_due").length, 1, "a reminder after 48 hours");
    await reassignStale({ store: t.store, bank, modules, notify });
    assert.equal((await t.store.inboxOf("gh_3")).items.filter((x) => x.kind === "review_due").length, 1, "only one reminder");
    assert.equal((await t.store.getSubmission(soon.id)).reviewerId, "gh_3");
    assert.equal((await t.store.inboxOf("gh_2")).items.find((x) => x.subId === sub.id).kind, "review_moved");
    const after = await t.store.getSubmission(sub.id);
    assert.notEqual(after.reviewerId, "gh_2");
    assert.deepEqual(after.previousReviewers, ["gh_2"]);
    assert.equal((await t.store.reviewerStats("gh_2")).openReviews, 0);
  } finally { t.close(); }
});

test("reviewers get whole modules: older single-challenge reviews are withdrawn", async () => {
  const t = await setup();
  try {
    const { hana } = await t.signIn();
    const single = await t.store.addSubmission({ studentId: "gh_1001", exerciseId: "js-loops", code: "x", reviewerId: "gh_2", assignedAt: new Date().toISOString() });
    const waiting = await t.store.addSubmission({ studentId: "gh_1001", exerciseId: "js-func", code: "x", reviewerId: null, status: "waiting_for_reviewer" });
    const done = await t.store.addSubmission({ studentId: "gh_1001", exerciseId: "js-vars", code: "x", reviewerId: "gh_3", status: "reviewed", review: { text: "kept" } });
    const mod = await t.store.addSubmission({ studentId: "gh_1001", moduleId: "js-m1", exerciseId: "js-m1", items: [], reviewerId: "gh_2", assignedAt: new Date().toISOString() });
    await t.store.bumpOpenReviews("gh_2", 2);
    const queue = async () => (await (await t.get("/api/reviews/queue", await t.as("gh_2"))).json()).toReview.map((s) => s.id);
    assert.deepEqual(await queue(), [mod.id], "the queue shows modules only");
    assert.equal(await retireSingles({ store: t.store }), 2);
    assert.equal((await t.store.getSubmission(single.id)).status, "withdrawn");
    assert.equal((await t.store.getSubmission(waiting.id)).status, "withdrawn");
    assert.equal((await t.store.getSubmission(done.id)).status, "reviewed", "reviewed history stays");
    assert.equal((await t.store.getSubmission(mod.id)).status, "awaiting_review");
    assert.equal((await t.store.reviewerStats("gh_2")).openReviews, 1, "the reviewer's slot is freed");
    const mine = (await (await t.get("/api/submissions/mine", hana)).json()).submissions.map((s) => s.id);
    assert.ok(!mine.includes(single.id) && mine.includes(mod.id), "the author no longer sees withdrawn items");
  } finally { t.close(); }
});

test("task endpoints accept only Google-signed callers", { skip: NEEDS_ANSWERS }, async () => {
  const t = await setup({ verifyTask: async (h) => h === "Bearer good" });
  try {
    const { hana } = await t.signIn();
    const job = { kind: "push", key: "push_x", repo: "timirtbet/hana-t-code", sha: "abc999", exerciseIds: ["js-loops"], pr: null };
    await t.store.claimJob("push_x", { kind: "push", repo: job.repo });
    const body = { message: { data: Buffer.from(JSON.stringify(job)).toString("base64"), messageId: "1" }, subscription: "s" };
    assert.equal((await t.post("/api/tasks/grade", body, { authorization: "Bearer bad" })).status, 401);
    assert.equal((await t.post("/api/tasks/grade", body, { authorization: "Bearer good" })).status, 204);
    assert.equal((await t.store.getJob("push_x")).status, "done");
    assert.equal((await t.store.passOf("gh_1001", "js-loops")).codeSource, "git");
    assert.equal((await t.post("/api/tasks/reassign", {}, { authorization: "Bearer good" })).status, 200);
    void hana;
  } finally { t.close(); }
});

test("export and delete your account", async () => {
  const t = await setup();
  try {
    const { hana } = await t.signIn();
    await t.circle(hana);
    await t.store.addResult({ learnerId: "gh_1001", exerciseId: "js-loops", ref: "x", passed: true });
    const exp = await t.get("/api/me/export", hana);
    assert.match(exp.headers.get("content-disposition"), /timirtbet-export\.json/);
    const data = await exp.json();
    assert.equal(data.learner.githubUsername, "hana-t");
    assert.equal(data.results.length, 1);
    assert.equal((await t.send("DELETE", "/api/me", { confirm: "wrong" }, hana)).status, 422);
    assert.equal((await t.send("DELETE", "/api/me", { confirm: "hana-t" }, hana)).status, 200);
    assert.ok(t.gh.calls.some((c) => c.name === "deleteRepo" && c.args[1] === "hana-t-code"));
    assert.ok(t.gh.calls.some((c) => c.name === "removeFromOrg" && c.args[1] === "hana-t"));
    assert.equal(await t.store.getLearner("gh_1001"), null);
    assert.equal((await t.get("/api/me", hana)).status, 401);
  } finally { t.close(); }
});

test("pull requests get a comment; other branches, unknown repos and bad signatures are skipped", async () => {
  const t = await setup({ prFiles: [{ filename: "js/js-func/solution.js", status: "modified" }] });
  try {
    await t.signIn();
    const pr = { action: "opened", repository: { full_name: "timirtbet/hana-t-code" }, pull_request: { number: 7, head: { sha: "fff111" } } };
    assert.equal((await t.hook("pull_request", pr)).status, 202);
    await t.app.idle();
    const c = t.gh.calls.find((x) => x.name === "commentOnPR");
    assert.equal(c.args[2], 7);
    assert.match(c.args[3], /What to fix/);
    const bad = await fetch(t.base + "/api/hooks/github", { method: "POST", body: "{}", headers: { "x-hub-signature-256": "sha256=nope", "x-github-event": "push" } });
    assert.equal(bad.status, 401);
    const base = { after: "a1", repository: { full_name: "timirtbet/hana-t-code" } };
    assert.deepEqual(await (await t.hook("push", { ...base, ref: "refs/heads/main", commits: [{ added: [], modified: ["README.md"] }] })).json(), { skipped: true });
    assert.deepEqual(await (await t.hook("push", { ...base, ref: "refs/heads/experiment", commits: [{ added: [], modified: ["js/js-loops/solution.js"] }] })).json(), { skipped: true });
    const before = t.gh.calls.filter((x) => x.name === "setStatus").length;
    assert.equal((await t.hook("push", { ...base, after: "a2", repository: { full_name: "someone/else" }, ref: "refs/heads/main", commits: [{ added: [], modified: ["js/js-loops/solution.js"] }] })).status, 202);
    await t.app.idle();
    assert.equal(t.gh.calls.filter((x) => x.name === "setStatus").length, before);
  } finally { t.close(); }
});
