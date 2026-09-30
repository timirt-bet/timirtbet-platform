// One behaviour contract for every store: MemoryStore in the unit tests,
// FirestoreStore against the Firestore emulator (npm run test:firestore).
import assert from "node:assert/strict";

export function storeContract(test, makeStore) {
  test("learners: upsert merges, lookup by repo, batch get", async () => {
    const s = await makeStore();
    await s.upsertLearner("gh_1", { githubUsername: "hana-t", githubId: 1 });
    const l = await s.upsertLearner("gh_1", { repo: "timirtbet/hana-t-code" });
    assert.equal(l.githubUsername, "hana-t");
    assert.equal((await s.learnerByRepo("timirtbet/hana-t-code")).id, "gh_1");
    assert.equal(await s.learnerByRepo("nope/nope"), null);
    await s.upsertLearner("gh_2", { githubUsername: "dawit-b" });
    assert.deepEqual(Object.keys(await s.getLearners(["gh_1", "gh_2", "gh_9"])).sort(), ["gh_1", "gh_2"]);
  });

  test("people: find by login (any case), follow and unfollow", async () => {
    const s = await makeStore();
    await s.upsertLearner("gh_1", { githubUsername: "Hana-T" });
    await s.upsertLearner("gh_2", { githubUsername: "dawit-b" });
    assert.equal((await s.learnerByLogin("hana-t")).id, "gh_1");
    assert.equal(await s.learnerByLogin("nobody"), null);
    await s.setFollow("gh_2", "gh_1", true);
    await s.setFollow("gh_2", "gh_1", true);
    assert.deepEqual((await s.getLearner("gh_2")).following, ["gh_1"]);
    assert.deepEqual(await s.followersOf("gh_1"), ["gh_2"]);
    await s.setFollow("gh_2", "gh_1", false);
    assert.deepEqual(await s.followersOf("gh_1"), []);
    await s.setFollow("gh_2", "gh_1", true);
    await s.deleteLearnerData("gh_1");
    assert.deepEqual((await s.getLearner("gh_2")).following, []);
  });

  test("circles: create, find by code, update, delete", async () => {
    const s = await makeStore();
    const c = await s.createCircle({ name: "Addis", track: "js", ownerId: "gh_1", inviteCode: "ABCDEFGH", members: ["gh_1"] });
    assert.equal((await s.circleByCode("ABCDEFGH")).id, c.id);
    assert.deepEqual((await s.updateCircle(c.id, { members: ["gh_1", "gh_2"] })).members, ["gh_1", "gh_2"]);
    await s.deleteCircle(c.id);
    assert.equal(await s.getCircle(c.id), null);
  });

  test("results and passes: one pass per challenge, latest result wins", async () => {
    const s = await makeStore();
    await s.addResult({ learnerId: "gh_1", exerciseId: "js-loops", ref: "a", passed: false, passedCount: 1, total: 3 });
    await new Promise((r) => setTimeout(r, 5));
    await s.addResult({ learnerId: "gh_1", exerciseId: "js-loops", ref: "b", passed: true, passedCount: 3, total: 3 });
    await s.addResult({ learnerId: "gh_1", exerciseId: "js-loops", ref: "c", passed: true, passedCount: 3, total: 3 });
    await s.addResult({ learnerId: "gh_2", exerciseId: "js-loops", ref: "d", passed: true, passedCount: 3, total: 3 });
    assert.equal(await s.hasPassed("gh_1", "js-loops"), true);
    assert.equal(await s.hasPassed("gh_1", "go-sync"), false);
    assert.deepEqual((await s.passersOf("js-loops")).sort(), ["gh_1", "gh_2"]);
    assert.deepEqual(await s.solvedOf("gh_1"), ["js-loops"]);
    assert.ok(["b", "c"].includes((await s.latestResult("gh_1", "js-loops")).ref));
    assert.equal((await s.resultsOf("gh_1")).length, 3);
  });

  test("passes keep the latest passing code, never failing code", async () => {
    const s = await makeStore();
    await s.addResult({ learnerId: "gh_1", exerciseId: "js-loops", ref: "a", passed: true, code: "v1" });
    await s.addResult({ learnerId: "gh_1", exerciseId: "js-loops", ref: "b", passed: false, code: "broken" });
    await s.addResult({ learnerId: "gh_1", exerciseId: "js-loops", ref: "c", source: "git", passed: true, code: "v2" });
    assert.equal((await s.passOf("gh_1", "js-loops")).code, "v2");
    assert.equal((await s.passOf("gh_1", "js-loops")).codeSource, "git", "remembers where the passing code came from");
    assert.equal(await s.passOf("gh_1", "go-sync"), null);
    await s.addResult({ learnerId: "gh_1", exerciseId: "js-vars", ref: "old", passed: true });
    assert.deepEqual((await s.passesOf("gh_1")).sort((a, b) => a.exerciseId.localeCompare(b.exerciseId)), [{ exerciseId: "js-loops", hasCode: true, fromGit: true }, { exerciseId: "js-vars", hasCode: false, fromGit: false }]);
    assert.ok(!("code" in (await s.latestResult("gh_1", "js-loops"))), "results don't copy the code");
  });

  test("submissions, reviewer counters and the rating transaction", async () => {
    const s = await makeStore();
    const sub = await s.addSubmission({ studentId: "gh_1", exerciseId: "js-loops", code: "x", reviewerId: "gh_2" });
    assert.equal((await s.openSubmissionFor("gh_1", "js-loops")).id, sub.id);
    assert.equal((await s.byStatus("awaiting_review")).length, 1);
    await s.bumpOpenReviews("gh_2", 1);
    assert.equal((await s.reviewerStats("gh_2")).openReviews, 1);
    await assert.rejects(s.rate(sub.id, 5), (e) => e.status === 409, "cannot rate before a review exists");
    await s.updateSubmission(sub.id, { status: "reviewed", review: { text: "fine" } });
    await s.bumpOpenReviews("gh_2", -1);
    const { before, after } = await s.rate(sub.id, 1);
    assert.equal(before.ratings, 0);
    assert.deepEqual([after.ratings, after.starsSum, after.pointsSum, after.openReviews], [1, 1, -6, 0]);
    await assert.rejects(s.rate(sub.id, 5), (e) => e.status === 409, "rating twice is refused");
    assert.equal((await s.flagged()).length, 1, "a one-star review is flagged for a Mentor");
    assert.equal(await s.openSubmissionFor("gh_1", "js-loops"), null);
    assert.equal((await s.assignedTo("gh_2")).length, 1);
    assert.equal((await s.reviewerStatsMany(["gh_2", "gh_3"])).gh_3.ratings, 0);
  });

  test("jobs are claimed once", async () => {
    const s = await makeStore();
    assert.equal(await s.claimJob("timirtbet/hana-t-code@abc", { kind: "push" }), true);
    assert.equal(await s.claimJob("timirtbet/hana-t-code@abc", { kind: "push" }), false);
    await s.updateJob("timirtbet/hana-t-code@abc", { status: "done" });
    assert.equal((await s.getJob("timirtbet/hana-t-code@abc")).status, "done");
  });

  test("deleting a learner removes their data and unsigns their reviews", async () => {
    const s = await makeStore();
    await s.upsertLearner("gh_1", { githubUsername: "hana-t" });
    await s.addResult({ learnerId: "gh_1", exerciseId: "js-loops", ref: "a", passed: true });
    const own = await s.addSubmission({ studentId: "gh_1", exerciseId: "js-loops", code: "x" });
    const reviewed = await s.addSubmission({ studentId: "gh_2", exerciseId: "js-loops", code: "y", reviewerId: "gh_1", review: { text: "ok" } });
    await s.deleteLearnerData("gh_1");
    assert.equal(await s.getLearner("gh_1"), null);
    assert.equal(await s.hasPassed("gh_1", "js-loops"), false);
    assert.equal((await s.resultsOf("gh_1")).length, 0);
    assert.equal(await s.getSubmission(own.id), null);
    assert.equal((await s.getSubmission(reviewed.id)).reviewerId, "deleted");
  });
  test("inbox: newest first, capped, unread count, mark read, deleted with the learner", async () => {
    const s = await makeStore();
    for (let i = 0; i < 33; i++) await s.notify("gh_1", { kind: "review_assigned", unitId: `u${i}` });
    let box = await s.inboxOf("gh_1");
    assert.equal(box.items.length, 30);
    assert.equal(box.items[0].unitId, "u32");
    assert.equal(box.unread, 30);
    await s.markInboxRead("gh_1");
    box = await s.inboxOf("gh_1");
    assert.equal(box.unread, 0);
    assert.ok(box.items.every((x) => x.read));
    assert.deepEqual(await s.inboxOf("gh_9"), { items: [], unread: 0 });
    await s.upsertLearner("gh_1", { githubUsername: "a" });
    await s.deleteLearnerData("gh_1");
    assert.deepEqual(await s.inboxOf("gh_1"), { items: [], unread: 0 });
  });
}
