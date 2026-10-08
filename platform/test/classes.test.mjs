import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../src/store/memory.mjs";
import { createClass, joinClass, leaveClass, removeFromClass, deleteClass, newClassCode, ownClass, classReport, learnerDetail, classCSV, challengeOrder, MAX_CLASS_MEMBERS } from "../src/classes.mjs";

const bank = { "js-a": { lang: "js" }, "js-b": { lang: "js" }, "go-a": { lang: "go" } };
const modules = { "go-m1": { id: "go-m1", lang: "go", exercises: ["go-a"] }, "js-m1": { id: "js-m1", lang: "js", exercises: ["js-a", "js-b"] } };
async function fresh(n) { const s = new MemoryStore(); for (let i = 0; i < n; i++) await s.upsertLearner(`u${i}`, { githubUsername: `u${i}` }); return s; }

test("a teacher creates classes; learners join one class at a time with the code", async () => {
  const s = await fresh(3);
  const a = await createClass(s, { name: "Grade 10 A", teacherId: "u0" });
  const b = await createClass(s, { name: "Grade 10 B", teacherId: "u0" });
  assert.match(a.code, /^[A-HJ-NP-Z2-9]{8}$/);
  await joinClass(s, { code: a.code.toLowerCase(), learnerId: "u1" });
  await joinClass(s, { code: a.code, learnerId: "u1" }); // twice is fine
  assert.deepEqual((await s.getClass(a.id)).members, ["u1"]);
  await joinClass(s, { code: b.code, learnerId: "u1" });
  assert.deepEqual((await s.getClass(a.id)).members, [], "joining another class leaves the first");
  assert.equal((await s.getLearner("u1")).classId, b.id);
  await leaveClass(s, "u1");
  assert.deepEqual((await s.getClass(b.id)).members, []);
  assert.equal((await s.getLearner("u1")).classId, null);
});

test("validation, bad codes, full classes, and a teacher cannot join their own class", async () => {
  const s = await fresh(2);
  await assert.rejects(createClass(s, { name: "x", teacherId: "u0" }), /3 to 60/);
  const c = await createClass(s, { name: "Coding club", teacherId: "u0" });
  await assert.rejects(joinClass(s, { code: "NOPE2345", learnerId: "u1" }), (e) => e.status === 404);
  await assert.rejects(joinClass(s, { code: c.code, learnerId: "u0" }), (e) => e.status === 409);
  await s.updateClass(c.id, { members: Array.from({ length: MAX_CLASS_MEMBERS }, (_, i) => `x${i}`) });
  await assert.rejects(joinClass(s, { code: c.code, learnerId: "u1" }), (e) => e.status === 409);
});

test("only the teacher can see, change or delete a class", async () => {
  const s = await fresh(3);
  const c = await createClass(s, { name: "Grade 9", teacherId: "u0" });
  await joinClass(s, { code: c.code, learnerId: "u1" });
  await assert.rejects(ownClass(s, { classId: c.id, teacherId: "u1" }), (e) => e.status === 404);
  await assert.rejects(newClassCode(s, { classId: c.id, teacherId: "u2" }), (e) => e.status === 404);
  assert.notEqual((await newClassCode(s, { classId: c.id, teacherId: "u0" })).code, c.code);
  await removeFromClass(s, { classId: c.id, teacherId: "u0", learnerId: "u1" });
  assert.deepEqual((await s.getClass(c.id)).members, []);
  assert.equal((await s.getLearner("u1")).classId, null);
  await joinClass(s, { code: (await s.getClass(c.id)).code, learnerId: "u2" });
  await deleteClass(s, { classId: c.id, teacherId: "u0" });
  assert.equal(await s.getClass(c.id), null);
  assert.equal((await s.getLearner("u2")).classId, null);
});

test("the report: passed, tried, runs, last activity, modules; and CSV", async () => {
  const s = await fresh(3);
  const c = await createClass(s, { name: "Grade 10, \"A\"", teacherId: "u0" });
  for (const id of ["u2", "u1"]) await joinClass(s, { code: c.code, learnerId: id });
  await s.addResult({ learnerId: "u1", exerciseId: "js-a", ref: "c1", passed: false, passedCount: 1, total: 3, error: null });
  await s.addResult({ learnerId: "u1", exerciseId: "js-a", ref: "c2", passed: true, passedCount: 3, total: 3, code: "x" });
  await s.addResult({ learnerId: "u1", exerciseId: "go-a", ref: "c3", passed: false, passedCount: 0, total: 2, error: "Build failed:\nline 3" });
  await s.addSubmission({ studentId: "u1", moduleId: "js-m1", status: "rated" });
  assert.deepEqual(challengeOrder(bank, modules), ["js-a", "js-b", "go-a"]);
  const r = await classReport(s, { cls: await s.getClass(c.id), bank, modules });
  assert.deepEqual(r.learners.map((l) => l.login), ["u1", "u2"], "sorted by name");
  const u1 = r.learners[0];
  assert.deepEqual(u1.status, { "js-a": "passed", "go-a": "tried" });
  assert.equal(u1.passed, 1); assert.equal(u1.runs, 3); assert.equal(u1.tries["js-a"], 2);
  assert.equal(u1.modulesSubmitted, 1); assert.equal(u1.modulesReviewed, 1);
  assert.ok(u1.lastActive);
  assert.equal(r.learners[1].runs, 0);
  const d = await learnerDetail(s, { learnerId: "u1", bank, modules });
  const go = d.challenges.find((x) => x.exerciseId === "go-a");
  assert.equal(go.runs, 1); assert.equal(go.passed, false); assert.equal(go.lastError, "Build failed:");
  assert.equal(d.challenges.find((x) => x.exerciseId === "js-a").best, 3);
  assert.equal(d.modules[0].reviewed, true);
  const csv = classCSV(await s.getClass(c.id), r).split("\r\n");
  assert.equal(csv[0], "learner,passed,runs,modules_submitted,modules_reviewed,last_active,js-a,js-b,go-a");
  assert.match(csv[1], /^u1,1,3,1,1,[^,]+,passed,,tried$/);
  assert.equal(csv[2], "u2,0,0,0,0,,,,");
});

test("deleting a learner's data removes them from classes, and a teacher's classes go with them", async () => {
  const s = await fresh(3);
  const c = await createClass(s, { name: "Grade 11", teacherId: "u0" });
  await joinClass(s, { code: c.code, learnerId: "u1" });
  await s.deleteLearnerData("u1");
  assert.deepEqual((await s.getClass(c.id)).members, []);
  await s.deleteLearnerData("u0");
  assert.equal(await s.getClass(c.id), null);
});
